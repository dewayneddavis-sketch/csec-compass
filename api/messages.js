// Vercel Serverless API — private messages between a LINKED teacher and student.
//
// PR 1 of the teacher↔student chat (owner decision 2026-09-24: "bot first, then
// chat" — the Compass Guide shipped first, PR #86). This PR is the data layer +
// API; the /teacher Messages panel and the student Messages tab follow.
//
// ONE function serves the whole conversation surface:
//
//   GET  /api/messages?with=<email>[&limit=50][&before=<cursor>][&after=<cursor>]
//        → the pair's conversation, newest first. `before` pages back, `after`
//          polls for what is new (pair it with the returned serverTime), so a
//          polling UI needs no websocket. `nextBefore` is an OPAQUE cursor
//          (it carries the last row's timestamp AND id) — paging with it
//          returns every message exactly once even when two share a timestamp.
//   GET  /api/messages?contacts=1   (any value but 0/false)
//        → the people the CALLER may talk to, from teacher_students.
//   POST /api/messages { to, body, clientId? }
//        → send one message; clientId makes a retried send idempotent.
//
// THE SECURITY MODEL (the whole point of this file)
//   * Identity is ALWAYS the verified auth token. sender_id and sender_email
//     come from the token and nothing else — a body carrying `from`, `senderId`
//     or `senderEmail` is ignored, so nobody can post as someone else.
//   * A message may only travel along a link that ALREADY EXISTS in
//     teacher_students (teacher_email ↔ student_email — the same linkage the
//     teacher dashboard reads). Everyone else gets 403 and ZERO message data:
//     strangers, someone else's student, and two people at the SAME school who
//     are not linked. The table is not even queried for them.
//   * A failed link read is a 500, never "you have no links" — the chat fails
//     closed, it never guesses.
//   * private_messages is deny-all under RLS (supabase/messages.sql) and only
//     this route (service role) touches it.
//   * Another student's, teacher's or school's conversation is unreachable: a
//     reply is addressed to a linked email, never to a thread the caller picked.
//
// DEFAULTS/CAPS: 50 messages per page (max 100), 500 rows read per thread, 500
// contacts, 2000 characters per message. Rows are mapped to a small stable DTO
// so the UI never depends on column names.
const MAX_BODY_CHARS = 2000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const THREAD_READ_CAP = 500; // one page can never cost more than this
const CONTACTS_CAP = 500; // a teacher may link at most this many students
const MAX_CLIENT_ID = 120;

function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

// Deliberately forgiving (it only has to reject junk before the link check does
// the real work) but never permissive enough to build a thread_key from nothing.
function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
}

// Vercel hands a file route's params over in req.query, but this repo was once
// bitten by a delivery detail (api/auth.js, PR #85), so every param is also read
// from the raw URL. Query wins when both are present.
function readParams(req) {
  const params = {};
  const raw = String(req.url || "");
  const qs = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  for (const [key, value] of new URLSearchParams(qs)) params[key] = value;
  const query = req.query || {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params[key] = Array.isArray(value) ? value[0] : value;
  }
  return params;
}

function threadKeyFor(a, b) {
  return [a, b].sort().join("|");
}

function toDto(row) {
  return {
    id: row.id,
    threadKey: row.thread_key,
    fromEmail: row.sender_email,
    fromRole: row.sender_role,
    toEmail: row.recipient_email,
    toRole: row.recipient_role,
    body: row.body,
    clientId: row.client_id || null,
    createdAt: row.created_at,
  };
}

// A cursor is either an ISO timestamp (what a polling client sends as `after=<serverTime>`)
// or the opaque "<timestamp>|<id>" this route hands back as nextBefore. The id
// half is what makes paging exact when two messages share a timestamp.
function parseCursor(value) {
  if (typeof value !== "string" || !value) return null;
  const separator = value.lastIndexOf("|");
  const stamp = separator === -1 ? value : value.slice(0, separator);
  const id = separator === -1 ? null : value.slice(separator + 1);
  const ms = Date.parse(stamp);
  if (Number.isNaN(ms)) return undefined; // undefined === present but invalid
  return { stamp, ms, id: id || null };
}

// Descending order (newest first), ties broken on id so a page boundary can
// never drop or repeat a message. The filter helpers below use the SAME
// comparison, which is what makes an opaque cursor exact.
function compareDesc(a, b) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  const left = String(a.id);
  const right = String(b.id);
  return left === right ? 0 : left < right ? 1 : -1;
}

function isOlderThan(row, cursor) {
  if (row.created_at !== cursor.stamp) return row.created_at < cursor.stamp;
  return cursor.id ? String(row.id) < cursor.id : false;
}

function isNewerThan(row, cursor) {
  if (row.created_at !== cursor.stamp) return row.created_at > cursor.stamp;
  return cursor.id ? String(row.id) > cursor.id : false;
}

async function getSupabase(res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({ error: "Supabase not configured" });
    return null;
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Resolves the caller and their linked contacts. Returns null when it has
// already answered (401/403/500) — callers must not continue with null.
async function resolveCaller(req, res) {
  const authHeader = req.headers && req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Missing authorization header" });
    return null;
  }
  const supabase = await getSupabase(res);
  if (!supabase) return null;
  const token = String(authHeader).replace("Bearer ", "");
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth || !auth.user) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
  const me = normalizeEmail(auth.user.email);
  if (!me) {
    res.status(403).json({ error: "Your account has no email address to message from" });
    return null;
  }
  // Both directions of the link are read: a teacher is linked as teacher_email,
  // a student as student_email. An error here is fatal (fail closed).
  const [asTeacher, asStudent] = await Promise.all([
    supabase.from("teacher_students").select("teacher_email, student_email").eq("teacher_email", me).limit(CONTACTS_CAP),
    supabase.from("teacher_students").select("teacher_email, student_email").eq("student_email", me).limit(CONTACTS_CAP),
  ]);
  if (asTeacher.error || asStudent.error) {
    res.status(500).json({ error: "Could not load your linked people" });
    return null;
  }
  const byEmail = new Map();
  for (const row of asTeacher.data || []) {
    const email = normalizeEmail(row.student_email);
    if (email && !byEmail.has(email)) byEmail.set(email, { email, role: "student", myRole: "teacher" });
  }
  for (const row of asStudent.data || []) {
    const email = normalizeEmail(row.teacher_email);
    if (email && !byEmail.has(email)) byEmail.set(email, { email, role: "teacher", myRole: "student" });
  }
  const contacts = [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
  return { supabase, me, userId: auth.user.id, contacts, truncated: contacts.length >= CONTACTS_CAP };
}

function linkedPair(caller, email) {
  if (!email || email === caller.me) return null;
  return caller.contacts.find((contact) => contact.email === email) || null;
}

async function handleList(req, res) {
  const params = readParams(req);
  const caller = await resolveCaller(req, res);
  if (!caller) return undefined;

  const wantsContacts = params.contacts !== undefined && params.contacts !== "0" && params.contacts !== "false";
  if (wantsContacts) {
    // A caller with no links gets an empty list — never anyone else's contacts,
    // never an error they cannot act on.
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({
      contacts: caller.contacts.map(({ email, role }) => ({ email, role })),
      canChat: caller.contacts.length > 0,
      truncated: caller.truncated,
      serverTime: new Date().toISOString(),
    });
  }

  const other = normalizeEmail(params.with);
  if (!looksLikeEmail(other)) {
    return res.status(400).json({ error: "A valid 'with' email address is required" });
  }
  const link = linkedPair(caller, other);
  if (!link) {
    // Same answer whether the email is a stranger or an unlinked member of the
    // caller's own school: no message data, no hint about who exists.
    return res.status(403).json({ error: "You are not linked to that person" });
  }

  const before = parseCursor(params.before);
  const after = parseCursor(params.after);
  if (before === undefined || after === undefined) {
    return res.status(400).json({ error: "Cursor must be an ISO timestamp" });
  }
  if (before && after) {
    return res.status(400).json({ error: "Use either 'before' or 'after', not both" });
  }
  const rawLimit = Number(params.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : DEFAULT_LIMIT;

  const threadKey = threadKeyFor(caller.me, other);
  const { data, error } = await caller.supabase
    .from("private_messages")
    .select("*")
    .eq("thread_key", threadKey)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(THREAD_READ_CAP);
  if (error) {
    res.status(500).json({ error: "Could not load the conversation" });
    return undefined;
  }

  // The database already ordered the capped slice; this repeats it so the page
  // is correct no matter how a future call site reads the rows.
  const rows = (data || [])
    .filter((row) => row && typeof row.created_at === "string")
    .sort(compareDesc);

  const filtered = rows.filter((row) => {
    if (before && !isOlderThan(row, before)) return false;
    if (after && !isNewerThan(row, after)) return false;
    return true;
  });
  const capped = rows.length >= THREAD_READ_CAP;
  const page = filtered.slice(0, limit);
  const last = page[page.length - 1];

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    messages: page.map(toDto),
    hasMore: filtered.length > page.length || capped,
    nextBefore: last ? `${last.created_at}|${last.id}` : null,
    threadKey,
    serverTime: new Date().toISOString(),
  });
}

async function handleSend(req, res) {
  const caller = await resolveCaller(req, res);
  if (!caller) return undefined;

  const payload = req.body || {};
  const other = normalizeEmail(payload.to);
  if (!looksLikeEmail(other)) {
    return res.status(400).json({ error: "A valid recipient email is required" });
  }
  if (typeof payload.body !== "string" || !payload.body.trim()) {
    return res.status(400).json({ error: "Message body required" });
  }
  const body = payload.body.trim();
  if (body.length > MAX_BODY_CHARS) {
    return res.status(400).json({ error: `Message is longer than ${MAX_BODY_CHARS} characters` });
  }
  const rawClientId = payload.clientId;
  if (rawClientId !== undefined && rawClientId !== null && typeof rawClientId !== "string") {
    return res.status(400).json({ error: "clientId must be a string" });
  }
  const clientId = typeof rawClientId === "string" ? rawClientId.trim().slice(0, MAX_CLIENT_ID) : null;

  const link = linkedPair(caller, other);
  if (!link) {
    return res.status(403).json({ error: "You are not linked to that person" });
  }

  // A retried send (the same clientId from the same sender) returns the message
  // that was already stored instead of posting a second one.
  if (clientId) {
    const { data: existing, error: lookupError } = await caller.supabase
      .from("private_messages")
      .select("*")
      .eq("sender_id", caller.userId)
      .eq("client_id", clientId)
      .maybeSingle();
    if (lookupError) {
      res.status(500).json({ error: "Could not send the message" });
      return undefined;
    }
    if (existing) {
      return res.status(200).json({ ok: true, duplicate: true, message: toDto(existing) });
    }
  }

  const row = {
    thread_key: threadKeyFor(caller.me, other),
    sender_id: caller.userId, // from the token, never from the body
    sender_email: caller.me,
    sender_role: link.myRole,
    recipient_email: other,
    recipient_role: link.role,
    body,
    client_id: clientId,
  };
  const { data, error } = await caller.supabase.from("private_messages").insert(row).select().single();
  if (error) {
    // 23505 = the partial unique index fired: another attempt with this
    // clientId won the race, so answer with that row rather than a failure.
    if (clientId && (error.code === "23505" || /duplicate key/i.test(error.message || ""))) {
      const { data: existing } = await caller.supabase
        .from("private_messages")
        .select("*")
        .eq("sender_id", caller.userId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        return res.status(200).json({ ok: true, duplicate: true, message: toDto(existing) });
      }
    }
    res.status(500).json({ error: "Could not send the message" });
    return undefined;
  }
  return res.status(201).json({ ok: true, duplicate: false, message: toDto(data || row) });
}

export default async function handler(req, res) {
  if (req.method === "GET") return handleList(req, res);
  if (req.method === "POST") return handleSend(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}
