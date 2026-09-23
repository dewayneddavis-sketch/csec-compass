import { useState } from "react";
import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../data/legal.js";
import {
  CONTACT_ACK_BODY,
  CONTACT_DIRECT_NOTE,
  CONTACT_HONEYPOT_FIELD,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  CONTACT_RESPONSE_WINDOW,
  CONTACT_SUBJECT_MAX,
  CONTACT_UNAVAILABLE_NOTE,
  validateContactSubmission,
} from "../data/contact.js";
import "./ContactPage.css";

// The Contact tab (owner spec 2026-09-23). A form that emails support — no
// database, nothing stored on this side.
//
// Two rules this page must never break:
//   1. The delivery address is fixed and read-only. It comes from the shared
//      constant, and nothing the visitor types can change where the message goes.
//   2. It never shows the success sentence unless the API said it sent. If the
//      email service is not configured (503) or the send fails (502/429), the
//      visitor is told the truth and given the direct address instead.
// The form's fields, in the order a visitor fills them in. Your name comes
// first (under the fixed, read-only "To" row) because the notification the
// owner reads renders it beside the address — it is what tells the owner who
// wrote in, so the form asks for it before it asks for anything else.
const EMPTY = { name: "", email: "", subject: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [notice, setNotice] = useState("");

  const update = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "sending") return;

    // The same validation the server runs (shared module), so a typo is caught
    // before the round trip — and the server still checks it, because a client
    // check is a courtesy, never the guard.
    const { ok, errors: found } = validateContactSubmission(form);
    if (!ok) {
      setErrors(found);
      setStatus("idle");
      setNotice("");
      return;
    }

    setErrors({});
    setStatus("sending");
    setNotice("");
    // Read the honeypot from the DOM, not from React state: it is uncontrolled
    // on purpose, so a bot that types into the hidden field sends a real value
    // the API can see. A controlled field with a no-op handler would swallow
    // that value and quietly disable the trap.
    const trap = new FormData(event.currentTarget).get(CONTACT_HONEYPOT_FIELD) || "";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, [CONTACT_HONEYPOT_FIELD]: String(trap) }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.ok && data.ok) {
        setStatus("sent");
        setNotice("");
        setForm(EMPTY);
        return;
      }
      if (data.fields) setErrors(data.fields);
      // Anything that is not a confirmed send is reported as a failure, with
      // whatever the server said (or the honest fallback when it said nothing).
      setStatus("error");
      setNotice([data.error, data.detail].filter(Boolean).join(" ") || CONTACT_UNAVAILABLE_NOTE);
    } catch {
      setStatus("error");
      setNotice(CONTACT_UNAVAILABLE_NOTE);
    }
  }

  const sending = status === "sending";

  return (
    <div className="contact-page">
      <header className="contact-header">
        <h1>Contact us</h1>
        <p className="contact-lead">
          A question about a subject, a purchase, or a school licence? Send us a message and we will
          reply within {CONTACT_RESPONSE_WINDOW}.
        </p>
        <p className="contact-direct">{CONTACT_DIRECT_NOTE}</p>
      </header>

      {status === "sent" ? (
        <section className="contact-card contact-sent" role="status" aria-live="polite">
          <h2>Message sent</h2>
          {/* The same sentence that lands in their inbox — one wording, two places. */}
          <p>{CONTACT_ACK_BODY}</p>
          <p className="contact-sent-note">
            A copy of this confirmation has been emailed to you. If it does not arrive, check your
            spam folder, or write to {SUPPORT_EMAIL}.
          </p>
          <button
            type="button"
            className="contact-secondary"
            onClick={() => {
              setStatus("idle");
              setNotice("");
            }}
          >
            Send another message
          </button>
        </section>
      ) : (
        <form className="contact-card contact-form" onSubmit={handleSubmit} noValidate>
          <div className="contact-field">
            <label htmlFor="contact-to">To</label>
            {/* Fixed, read-only delivery target: the visitor does not type it and
                cannot change it. */}
            <input
              id="contact-to"
              className="contact-input contact-to"
              type="email"
              value={SUPPORT_EMAIL}
              readOnly
              aria-readonly="true"
              tabIndex={-1}
            />
            <p className="contact-hint">Messages go straight to our support inbox.</p>
          </div>

          <div className="contact-field">
            <label htmlFor="contact-name">Your name</label>
            <input
              id="contact-name"
              className="contact-input"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Jane Smith"
              maxLength={CONTACT_NAME_MAX}
              value={form.name}
              onChange={update("name")}
              aria-invalid={errors.name ? "true" : undefined}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
            />
            <p className="contact-hint">So we know who we are replying to.</p>
            {errors.name ? (
              <p className="contact-error" id="contact-name-error" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="contact-field">
            <label htmlFor="contact-email">Your email</label>
            <input
              id="contact-email"
              className="contact-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
              aria-invalid={errors.email ? "true" : undefined}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
            />
            <p className="contact-hint">So we can reply to you.</p>
            {errors.email ? (
              <p className="contact-error" id="contact-email-error" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="contact-field">
            <label htmlFor="contact-subject">Subject</label>
            <input
              id="contact-subject"
              className="contact-input"
              type="text"
              name="subject"
              maxLength={CONTACT_SUBJECT_MAX}
              value={form.subject}
              onChange={update("subject")}
              aria-invalid={errors.subject ? "true" : undefined}
              aria-describedby={errors.subject ? "contact-subject-error" : undefined}
            />
            <p className="contact-hint">
              {form.subject.length}/{CONTACT_SUBJECT_MAX} characters
            </p>
            {errors.subject ? (
              <p className="contact-error" id="contact-subject-error" role="alert">
                {errors.subject}
              </p>
            ) : null}
          </div>

          <div className="contact-field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              className="contact-input contact-textarea"
              name="message"
              rows={8}
              maxLength={CONTACT_MESSAGE_MAX}
              value={form.message}
              onChange={update("message")}
              aria-invalid={errors.message ? "true" : undefined}
              aria-describedby={errors.message ? "contact-message-error" : "contact-message-count"}
            />
            <p className="contact-hint" id="contact-message-count">
              {form.message.length}/{CONTACT_MESSAGE_MAX} characters
            </p>
            {errors.message ? (
              <p className="contact-error" id="contact-message-error" role="alert">
                {errors.message}
              </p>
            ) : null}
          </div>

          {/* Honeypot: a real person cannot see or tab to this. A bot fills it
              in and the API drops the submission without sending anything.
              Uncontrolled (defaultValue) so the value a bot types is actually
              submitted. */}
          <div className="contact-honeypot" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              name={CONTACT_HONEYPOT_FIELD}
              defaultValue=""
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {status === "error" && notice ? (
            <p className="contact-notice contact-notice-error" role="alert">
              {notice}
            </p>
          ) : null}

          <button type="submit" className="contact-submit" disabled={sending}>
            {sending ? "Sending…" : "Send message"}
          </button>
          <p className="contact-privacy-note">
            What you send here is used to reply to you. See our <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      )}
    </div>
  );
}
