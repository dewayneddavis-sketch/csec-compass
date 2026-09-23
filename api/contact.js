// POST /api/contact — what the Contact tab posts to.
//
// Sends two emails through Knock (the team's email service), and stores
// nothing: there is no database write here by design (owner spec 2026-09-23).
//
//   1. NOTIFICATION to SUPPORT_EMAIL (src/data/legal.js — the one place any
//      address is written down). Reply-To is the submitter, so the owner
//      hitting Reply in their inbox answers the customer directly.
//   2. AUTOMATIC REPLY to the submitter, from a no-reply-style sender, saying
//      the message arrived and that the address is not monitored.
//
// Knock has no "send one email" endpoint: sending means triggering a workflow
// whose email step holds the template (verified against Knock's own OpenAPI
// spec, docs.knock.app/openapi.json — POST /v1/workflows/{key}/trigger, Bearer
// auth, required `recipients`). So this route triggers two workflows and hands
// them the copy as data; the templates live in Knock's dashboard. If the
// workflows do not exist yet, Knock answers 404 and this route says so
// honestly (502) instead of reporting a success nobody received.
//
// Self-contained like the other functions here (no api/_lib imports, which
// crash on Vercel with FUNCTION_INVOCATION_FAILED). The shared constants come
// from src/, which is plain ESM and traced into the function bundle.
import { SUPPORT_EMAIL } from "../src/data/legal.js";
import {
  CONTACT_ACK_BODY,
  CONTACT_ACK_NOTE,
  CONTACT_ACK_SUBJECT,
  CONTACT_HONEYPOT_FIELD,
  CONTACT_RATE_LIMIT,
  CONTACT_RATE_WINDOW_MINUTES,
  contactNotificationSubject,
  validateContactSubmission,
} from "../src/data/contact.js";

const KNOCK_API_BASE = "https://api.knock.app/v1";
// The two workflows the owner creates in Knock's dashboard. Overridable by env
// so a renamed workflow needs no deploy.
const NOTIFICATION_WORKFLOW = process.env.KNOCK_CONTACT_WORKFLOW || "contact-notification";
const AUTOREPLY_WORKFLOW = process.env.KNOCK_CONTACT_AUTOREPLY_WORKFLOW || "contact-received";

// A max body size so a huge POST cannot be used to burn memory. The real caps
// are enforced by validateContactSubmission; this is the outer door.
const MAX_BODY_BYTES = 20 * 1024;
const KNOCK_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------------------
// Rate limit: CONTACT_RATE_LIMIT submissions per IP per hour (owner spec).
//
// In-memory on purpose — no database, per owner design. It is honest about
// what it is: each serverless instance keeps its own window, so under a burst
// that fans out to several instances a determined sender could get a few extra
// attempts. It reliably stops the accidental flood and the naive script, which
// is what it is for; it is not sold as a guarantee. Restarting the function
// clears it, which is fine (nothing is stored).
const hits = new Map();
function rateLimit(ip, now = Date.now()) {
  const windowMs = CONTACT_RATE_WINDOW_MINUTES * 60 * 1000;
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= CONTACT_RATE_LIMIT) {
    hits.set(ip, recent);
    return { limited: true, retryAfterMs: windowMs - (now - recent[0]) };
  }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 2000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < windowMs)) hits.delete(key);
    }
  }
  return { limited: false };
}

function clientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

// One Knock workflow trigger. Returns { ok, status, detail } — never throws, so
// the caller decides what an individual failure means.
async function triggerWorkflow(key, payload) {
  const apiKey = process.env.KNOCK_API_KEY;
  try {
    const res = await fetch(`${KNOCK_API_BASE}/workflows/${encodeURIComponent(key)}/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(KNOCK_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, detail: text.slice(0, 300) };
    }
    return { ok: true, status: res.status, detail: "" };
  } catch (err) {
    return { ok: false, status: 0, detail: err?.message || "network error" };
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to send a contact message." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: "We couldn't read that submission. Please try again." });
  }

  // Honeypot: a field only a bot fills in. A person submits an answer-shape
  // they would call a success and nothing is sent, which is the point — no
  // mail, no reply-to, no cost.
  if (String(body?.[CONTACT_HONEYPOT_FIELD] || "").trim() !== "") {
    console.warn("contact: honeypot filled, dropping submission without sending");
    return res.status(200).json({ ok: true });
  }

  const ip = clientIp(req);
  const limit = rateLimit(ip);
  if (limit.limited) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60000));
    return res.status(429).json({
      error: `Too many messages from this connection. Please try again in ${minutes} minute${
        minutes === 1 ? "" : "s"
      }, or email ${SUPPORT_EMAIL} directly.`,
    });
  }

  const { ok, errors, value } = validateContactSubmission(body);
  if (!ok) {
    return res.status(400).json({
      error: "Please check the highlighted fields and try again.",
      fields: errors,
    });
  }

  // No keys, no sending — and no pretending. A 200 here would tell someone
  // their message was on its way when nothing left the building.
  if (!process.env.KNOCK_API_KEY) {
    console.error(
      "contact: KNOCK_API_KEY is not set, so no email could be sent. The form must not claim success."
    );
    return res.status(503).json({
      error: "The contact form is not available right now.",
      detail: `Email ${SUPPORT_EMAIL} directly and we will still get your message.`,
    });
  }

  const submittedAt = new Date().toISOString();

  // 1. The notification the owner reads. Everything the owner needs to reply is
  // in here: who wrote, what about, the message, the time.
  const notification = await triggerWorkflow(NOTIFICATION_WORKFLOW, {
    recipients: [{ id: SUPPORT_EMAIL, email: SUPPORT_EMAIL }],
    data: {
      reply_to: value.email,
      submitter_email: value.email,
      submission_subject: value.subject,
      message: value.message,
      submitted_at: submittedAt,
      notification_subject: contactNotificationSubject(value.subject),
      support_email: SUPPORT_EMAIL,
    },
  });

  if (!notification.ok) {
    console.error("contact: notification email could not be sent:", notification.status, notification.detail);
    return res.status(502).json({
      error: "We couldn't send your message just now.",
      detail: `Please try again, or email ${SUPPORT_EMAIL} directly.`,
    });
  }

  // 2. The submitter's automatic reply. Best-effort: their message HAS reached
  // us, so a failure here is logged and reported in the response but does not
  // turn a delivered message into an error the sender has to resend.
  const autoreply = await triggerWorkflow(AUTOREPLY_WORKFLOW, {
    recipients: [{ id: value.email, email: value.email }],
    data: {
      ack_subject: CONTACT_ACK_SUBJECT,
      ack_body: CONTACT_ACK_BODY,
      ack_note: CONTACT_ACK_NOTE,
      submission_subject: value.subject,
      submitted_at: submittedAt,
      support_email: SUPPORT_EMAIL,
    },
  });
  if (!autoreply.ok) {
    console.error("contact: automatic reply could not be sent:", autoreply.status, autoreply.detail);
  }

  return res.status(200).json({ ok: true, acknowledged: autoreply.ok, submittedAt });
}
