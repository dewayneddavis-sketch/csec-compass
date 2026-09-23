// POST /api/contact — what the Contact tab posts to.
//
// Sends two emails through Knock (the team's email service), and stores
// nothing: there is no database write here by design (owner spec 2026-09-23).
//
//   1. NOTIFICATION to SUPPORT_EMAIL, the public support address. Reply-To is
//      the submitter, so the owner hitting Reply in their inbox answers the
//      customer directly.
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
// ---------------------------------------------------------------------------
// FULLY SELF-CONTAINED ON PURPOSE (deploy fix 2026-09-23).
//
// Vercel builds each file in api/ as its own Serverless Function and bundles
// only what that file needs. This route used to import its shared wording and
// validation from ../src/data/*.js — a directory outside api/ that only the
// React app uses — and the deployment failed. Every function that has ever
// deployed from this repo imports npm packages and its own directory only, so
// this file now does the same: the npm-free parts it shares with the browser
// are MIRRORED below (the block marked "MIRROR") instead of imported.
//
// A mirror is only safe if something proves it has not drifted, so
// tools/check-contact.mjs imports this file and asserts every mirrored value
// equals the real one in src/data/legal.js and src/data/contact.js, and that
// the mirrored validator returns byte-identical results to the shared one.
// Change the copy in ONE place and that harness goes red here.
//
// (The names below are exported for that harness. Vercel routes this file by
// its default export.)
// No imports at all: this file needs nothing from npm or from elsewhere in the
// repo, so the function bundle is exactly this one file.

// === MIRROR OF src/data/legal.js ===========================================
// The public support address: what the contact form delivers to and what
// product pages show. Never the owner's personal address.
export const SUPPORT_EMAIL = "support@csec-compass.com";

// === MIRROR OF src/data/contact.js =========================================
// Length caps. The client uses them as maxLength AND as its own pre-submit
// check; the server uses them as the real rule (a client check is a courtesy,
// never the guard).
//
// The name cap is the same number as the subject cap, and for the same reason:
// the owner's notification email renders the submitter's name in a table cell,
// so a name is required (a blank cell tells the owner nothing) and bounded (an
// essay in a table cell is unreadable).
export const CONTACT_NAME_MAX = 120;
export const CONTACT_SUBJECT_MAX = 120;
export const CONTACT_MESSAGE_MAX = 3000;

// Server-side rate limit: 5 submissions per IP per hour (owner spec).
export const CONTACT_RATE_LIMIT = 5;
export const CONTACT_RATE_WINDOW_MINUTES = 60;

// The hidden field a bot fills in and a person never sees. Named here because
// the page must render exactly the field the API looks for — a rename on one
// side would silently turn the trap off.
export const CONTACT_HONEYPOT_FIELD = "website";

// The automatic reply. The owner's review fixed this wording, so it is written
// once in src/ and mirrored here verbatim.
export const CONTACT_ACK_SUBJECT = "We received your message — CSEC Compass";
export const CONTACT_ACK_BODY =
  "We have received your message. Please allow 24–48 hours for a response.";
// Honesty line: the reply address is not monitored, and the message says so
// rather than leaving someone replying into a void.
export const CONTACT_ACK_NOTE =
  "This is an automated confirmation. Replies to this message are not monitored — to add anything, use the contact form again or write to " +
  SUPPORT_EMAIL +
  ".";

// The same validation on both sides of the wire. Deliberately simple and
// deliberately shared: 254 characters, one @, no spaces, a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function contactEmailIsValid(value) {
  const email = String(value == null ? "" : value).trim();
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

// "New contact message: <their subject>" — built in one place so the API and
// any future surface cannot disagree about the notification's subject line.
export function contactNotificationSubject(subject) {
  return `New contact message: ${String(subject == null ? "" : subject).trim()}`;
}

// Validates a raw form/JSON payload. Returns { ok, errors, value } where value
// is the trimmed, ready-to-send payload.
export function validateContactSubmission(input) {
  const src = input && typeof input === "object" ? input : {};
  const name = String(src.name == null ? "" : src.name).trim();
  const email = String(src.email == null ? "" : src.email).trim();
  const subject = String(src.subject == null ? "" : src.subject).trim();
  const message = String(src.message == null ? "" : src.message).trim();
  const errors = {};

  // A name is required, not optional: the owner's notification email renders it
  // in a table cell next to the address, so an empty one is a blank row in the
  // mailbox and no way to tell who wrote in.
  if (!name) {
    errors.name = "Enter your name so we know who to reply to.";
  } else if (name.length > CONTACT_NAME_MAX) {
    errors.name = `Keep your name to ${CONTACT_NAME_MAX} characters or fewer.`;
  }
  if (!contactEmailIsValid(email)) {
    errors.email = "Enter a valid email address so we can reply to you.";
  }
  if (!subject) {
    errors.subject = "Add a subject so we know what this is about.";
  } else if (subject.length > CONTACT_SUBJECT_MAX) {
    errors.subject = `Keep the subject to ${CONTACT_SUBJECT_MAX} characters or fewer.`;
  }
  if (!message) {
    errors.message = "Tell us what you need help with.";
  } else if (message.length > CONTACT_MESSAGE_MAX) {
    errors.message = `Keep your message to ${CONTACT_MESSAGE_MAX} characters or fewer.`;
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, value: { name, email, subject, message } };
}
// === END MIRROR ============================================================

const KNOCK_API_BASE = "https://api.knock.app/v1";
// --- The Knock trigger contract (verified against Knock's own OpenAPI, 2026-09-23) -
// POST /v1/workflows/{key}/trigger accepts exactly recipients, data, actor,
// tenant, cancellation_key and settings. There is no per-trigger `to_address`
// override and no `variables` field, which decides two things in this file:
//   * WHERE THE MAIL LANDS is the recipient's own `email` property — Knock's
//     docs: "by default, Knock will send your emails to the email property
//     stored on the recipient". The owner's notification step sets no
//     to_address, so the recipient below IS the delivery mechanism, and it must
//     be the support address.
//   * `vars.*` in a template comes from the account's Variables page, which a
//     trigger CANNOT set. app_name is therefore also passed as data.app_name,
//     so a template can read it either way without a dashboard edit.
// The recipient id is a stable, human-readable handle (Knock keys a user by
// id); the address itself travels in `email`.
export const NOTIFICATION_RECIPIENT_ID = "csec-compass-support";
export const APP_NAME = "CSEC Compass";
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

  // The form collects a name/email/subject/message. value.name is already
  // trimmed and length-checked by the shared validator, so it is exactly what
  // the submitter typed; the slice is belt-and-braces, never an invention (an
  // empty name was refused above with a field error).
  const submitterName = value.name.slice(0, CONTACT_NAME_MAX);
  const submittedAt = new Date().toISOString();

  // 1. The notification the owner reads. Everything the owner needs to reply is
  // in here: who wrote, what about, the message, the time.
  const notification = await triggerWorkflow(NOTIFICATION_WORKFLOW, {
    // The owner's notification step has no to_address, so this recipient's email
    // is what makes the mail arrive at support@csec-compass.com.
    recipients: [{ id: NOTIFICATION_RECIPIENT_ID, email: SUPPORT_EMAIL }],
    // name/email/subject/message are the keys the owner's notification template
    // renders (subject = the submitter's own subject line; reply_to_address in
    // the workflow reads {{ data.email }}). The remaining keys are extras the
    // same template may use; none of them route mail.
    data: {
      name: submitterName,
      email: value.email,
      subject: value.subject,
      message: value.message,
      reply_to: value.email,
      submitter_email: value.email,
      submission_subject: value.subject,
      notification_subject: contactNotificationSubject(value.subject),
      support_email: SUPPORT_EMAIL,
      submitted_at: submittedAt,
      app_name: APP_NAME,
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
    // The acknowledgement goes to the submitter: the template's from_name
    // ("No Reply") is set in the owner's workflow and is deliberately NOT
    // overridden here.
    recipients: [{ id: value.email, email: value.email }],
    data: {
      subject: value.subject,
      name: submitterName,
      email: value.email,
      app_name: APP_NAME,
      submission_subject: value.subject,
      ack_subject: CONTACT_ACK_SUBJECT,
      ack_body: CONTACT_ACK_BODY,
      ack_note: CONTACT_ACK_NOTE,
      support_email: SUPPORT_EMAIL,
      submitted_at: submittedAt,
    },
  });
  if (!autoreply.ok) {
    console.error("contact: automatic reply could not be sent:", autoreply.status, autoreply.detail);
  }

  return res.status(200).json({ ok: true, acknowledged: autoreply.ok, submittedAt });
}
