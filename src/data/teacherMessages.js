// Client-side logic for the teacher↔student chat (chat PR 2 of 3).
//
// api/messages.js (PR #90) is the whole server contract:
//   GET  /api/messages?contacts=1        → the people the CALLER is linked to
//   GET  /api/messages?with=<email>      → one thread, newest first, cursored
//   POST /api/messages {to, body, clientId}
//
// This module holds every decision the Messages panel makes that is worth
// proving without a browser: building those URLs, reading the two response
// shapes, merging pages without showing a message twice, the cursor a poll
// asks "what is new since…" with, the key a retried send must reuse so a
// timeout cannot post twice, and the honest sentence for each failure status.
// src/components/TeacherMessages.jsx only renders what these return.
//
// tools/check-teacher-messages.mjs drives the REAL api/messages.js handler with
// the offline Supabase stub and pushes its actual responses through these
// functions, so this file cannot drift away from the server, and the panel
// cannot invent a contact, a thread or a message the server did not send.

export const MESSAGES_ENDPOINT = "/api/messages";

// The server's own caps (api/messages.js): 50 per page by default, 100 max,
// 2000 characters per message. Kept here so the panel's textarea and request
// agree with the route instead of guessing.
export const CHAT_PAGE_LIMIT = 50;
export const CHAT_MAX_PAGE = 100;
export const MAX_MESSAGE_CHARS = 2000;

// Only these two roles exist (the table CHECKs them). A contact whose role is
// anything else is not shown: a malformed row must never be rendered as fact.
const ROLES = ["teacher", "student"];

export function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function roleLabel(role) {
  if (role === "teacher") return "Teacher";
  if (role === "student") return "Student";
  return "";
}

// --- requests ---------------------------------------------------------------

export function authHeaders(token) {
  return { Authorization: "Bearer " + token };
}

export function contactsUrl() {
  return `${MESSAGES_ENDPOINT}?contacts=1`;
}

// `before` pages back through history; `after` asks for what is new (the poll).
// The route refuses both at once, so this builder sends at most one.
export function threadUrl(email, options = {}) {
  const params = new URLSearchParams({ with: normalizeEmail(email) });
  const raw = Number(options.limit);
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), CHAT_MAX_PAGE) : CHAT_PAGE_LIMIT;
  params.set("limit", String(limit));
  if (options.before) params.set("before", String(options.before));
  else if (options.after) params.set("after", String(options.after));
  return `${MESSAGES_ENDPOINT}?${params.toString()}`;
}

// The POST body carries ONLY the recipient, the text and the idempotency key.
// The sender is the verified token — api/messages.js ignores any `from`,
// `senderId` or `senderEmail` in a body, and this panel never sends one.
export function sendInit(token, { to, body, clientId }) {
  const payload = { to: normalizeEmail(to), body: String(body == null ? "" : body).trim() };
  if (clientId) payload.clientId = String(clientId);
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  };
}

// One key per SEND ATTEMPT, reused on a retry of that same attempt: if the
// first POST landed but its response was lost, the replay returns the stored
// message instead of posting a second copy (the partial unique index in
// supabase/messages.sql is what makes that exact).
export function newClientId() {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Fallback for an older engine: still unique per call, still a string.
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// --- responses --------------------------------------------------------------

export function readContacts(payload) {
  const list = Array.isArray(payload && payload.contacts) ? payload.contacts : [];
  const seen = new Set();
  const contacts = [];
  for (const raw of list) {
    const email = normalizeEmail(raw && raw.email);
    if (!email || seen.has(email)) continue;
    if (!ROLES.includes(raw && raw.role)) continue;
    seen.add(email);
    contacts.push({ email, role: raw.role });
  }
  return {
    contacts,
    canChat: contacts.length > 0,
    truncated: payload && payload.truncated === true,
  };
}

// One message DTO as the panel needs it, or null when the row cannot be read.
// A malformed row is dropped rather than rendered half-empty.
export function readMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id == null ? "" : String(raw.id);
  const fromEmail = normalizeEmail(raw.fromEmail);
  const toEmail = normalizeEmail(raw.toEmail);
  if (!id || !fromEmail || !toEmail) return null;
  if (typeof raw.body !== "string") return null;
  return {
    id,
    fromEmail,
    fromRole: ROLES.includes(raw.fromRole) ? raw.fromRole : "",
    toEmail,
    toRole: ROLES.includes(raw.toRole) ? raw.toRole : "",
    body: raw.body,
    createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : "",
  };
}

// Oldest first, which is how a conversation reads. Ties break on id — the same
// tiebreak api/messages.js pages with, so a merged page keeps server order.
export function sortOldestFirst(messages) {
  return [...messages].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
}

export function readThread(payload) {
  const rows = Array.isArray(payload && payload.messages) ? payload.messages : [];
  const messages = [];
  for (const raw of rows) {
    const message = readMessage(raw);
    if (message) messages.push(message);
  }
  return {
    messages: sortOldestFirst(messages),
    hasMore: payload && payload.hasMore === true,
    nextBefore: payload && typeof payload.nextBefore === "string" && payload.nextBefore ? payload.nextBefore : null,
    threadKey: payload && typeof payload.threadKey === "string" ? payload.threadKey : null,
    serverTime: payload && typeof payload.serverTime === "string" ? payload.serverTime : null,
  };
}

// A page is merged, never replaced: a poll that returns nothing new must not
// blank the conversation, and a message already shown must not appear twice.
export function mergeMessages(current, incoming) {
  const byId = new Map();
  for (const message of [...(current || []), ...(incoming || [])]) {
    if (message && message.id) byId.set(String(message.id), message);
  }
  return sortOldestFirst([...byId.values()]);
}

// What a poll sends as `after`: the newest message's own cursor. The route's
// opaque form ("<timestamp>|<id>") is exact even when two messages share a
// timestamp — sending only the timestamp would drop the second one.
export function pollCursor(messages) {
  const list = sortOldestFirst(messages || []);
  const last = list[list.length - 1];
  if (!last || !last.createdAt) return null;
  return `${last.createdAt}|${last.id}`;
}

// --- failure copy -----------------------------------------------------------
// Every failure says what it is. Nothing here ever reads as "no messages": an
// unreachable or refusing server must not be shown as an empty conversation.
export function chatError(status, serverMessage) {
  const fallback = typeof serverMessage === "string" && serverMessage.trim() ? serverMessage.trim() : "";
  if (status === 0) return "Could not reach the server. Check your connection and try again.";
  if (status === 401) return "Your session has expired. Sign in again to see your messages.";
  if (status === 403) {
    return fallback || "Messaging is not available for this account.";
  }
  if (status === 404) return "Messaging is not available on this deployment yet.";
  if (status === 400) return fallback || "That message could not be sent.";
  if (status >= 500) {
    return fallback || "Messaging is not available yet — please try again later.";
  }
  return fallback || "Something went wrong. Please try again.";
}

export function senderLabel(message, me) {
  if (!message) return "";
  return message.fromEmail === normalizeEmail(me) ? "You" : message.fromEmail;
}

export function formatMessageTime(value) {
  if (typeof value !== "string" || !value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The Send button's own rule, in one place: something to say, inside the
// server's limit, and not already in flight.
export function canSend(draft, sending) {
  if (sending) return false;
  if (typeof draft !== "string") return false;
  const trimmed = draft.trim();
  return trimmed.length > 0 && draft.length <= MAX_MESSAGE_CHARS;
}
