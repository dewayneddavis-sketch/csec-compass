// The Contact tab's ONE source of truth (owner spec 2026-09-23).
//
// Everything the form and api/contact.js must agree about lives here, so the
// browser and the server cannot drift: the length caps, the honeypot field
// name, the rate limit, the shared validation, and the exact wording of the
// automatic reply. The page imports these; api/contact.js imports these. A
// second copy of "message must be 3000 characters or fewer" in either file is
// how a form starts accepting what the server rejects (or the reverse).
//
// The delivery address itself is NOT written out here: it is SUPPORT_EMAIL in
// src/data/legal.js, the single place any address is spelled out. Every
// sentence below that names it is built from that constant, so changing the
// address in one file changes it everywhere (and the harness asserts no other
// file invents its own copy).
import { SUPPORT_EMAIL } from "./legal.js";

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
// once: the email that goes out and the sentence the page shows on success are
// the same sentence, which is why a submitter sees on screen exactly what
// arrives in their inbox.
export const CONTACT_ACK_SUBJECT = "We received your message — CSEC Compass";
export const CONTACT_ACK_BODY =
  "We have received your message. Please allow 24–48 hours for a response.";
// Honesty line: the reply address is not monitored, and the message says so
// rather than leaving someone replying into a void.
export const CONTACT_ACK_NOTE =
  "This is an automated confirmation. Replies to this message are not monitored — to add anything, use the contact form again or write to " +
  SUPPORT_EMAIL +
  ".";

// What the page tells people before they send, and after anything goes wrong.
export const CONTACT_RESPONSE_WINDOW = "24–48 hours";
export const CONTACT_DIRECT_NOTE =
  "You can also email us directly at " + SUPPORT_EMAIL + " — it reaches the same inbox.";
export const CONTACT_UNAVAILABLE_NOTE =
  "The contact form is not available right now, so your message was not sent. Please email us directly at " +
  SUPPORT_EMAIL +
  " instead.";

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
// is the trimmed, ready-to-send payload. Used by api/contact.js for real and by
// the page to show the same messages before it ever calls the API.
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
