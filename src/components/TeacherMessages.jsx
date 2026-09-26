import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_MESSAGE_CHARS,
  MESSAGES_ENDPOINT,
  authHeaders,
  canSend,
  chatError,
  contactsUrl,
  formatMessageTime,
  mergeMessages,
  newClientId,
  pollCursor,
  readContacts,
  readMessage,
  readThread,
  roleLabel,
  sendInit,
  senderLabel,
  threadUrl,
} from "../data/teacherMessages.js";
import "./TeacherMessages.css";

// The teacher's Messages panel (chat PR 2 of 3; PR 1 was the data layer + API).
//
// A teacher writes to the students LINKED to them, in the same private thread
// the student will see in their own Messages tab (PR 3). Everything about who
// may talk to whom is decided by the server (api/messages.js): this panel asks
// GET /api/messages?contacts=1 for its list and can only ever open a thread the
// server agrees to return. It has no roster of its own, keeps no email it was
// not given, and cannot name a recipient the server did not send — so a 403
// shows as an honest "not available" and never as an empty conversation.
//
// A teacher's identity is never sent: the request carries only the auth token,
// the recipient, the text and an idempotency key. api/messages.js takes the
// sender from the verified token alone.
//
// `token` and `me` come from the page (the page already resolved the session);
// the panel renders nothing at all without a token.
const POLL_MS = 20000;

function MessageList({ messages, me }) {
  return (
    <ol className="tmsg-list">
      {messages.map((message) => {
        // "You" is decided in one place (src/data/teacherMessages.js) so the
        // student tab can never disagree about whose message this is.
        const mine = senderLabel(message, me) === "You";
        return (
          <li key={message.id} className={"tmsg-item " + (mine ? "tmsg-item-mine" : "tmsg-item-theirs")}>
            <p className="tmsg-item-head">
              <span className="tmsg-item-from">{senderLabel(message, me)}</span>
              {message.createdAt && (
                <time className="tmsg-item-time" dateTime={message.createdAt}>
                  {formatMessageTime(message.createdAt)}
                </time>
              )}
            </p>
            <p className="tmsg-item-body">{message.body}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function TeacherMessages({ token, me }) {
  const [contacts, setContacts] = useState(null); // null = still loading
  const [contactsError, setContactsError] = useState(null);
  const [selected, setSelected] = useState(null); // the linked person's email
  const [thread, setThread] = useState(null); // { messages, hasMore, nextBefore }
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  // One idempotency key per send ATTEMPT, kept until that attempt resolves, so a
  // retry after a timeout cannot post the same message twice.
  const pendingId = useRef(null);
  // The poll reads the newest message through a ref: the interval must not be
  // rebuilt every time a message arrives.
  const latest = useRef(null);
  useEffect(() => {
    latest.current = thread;
  }, [thread]);

  useEffect(() => {
    if (!token) {
      setContacts(null);
      return undefined;
    }
    let cancelled = false;
    setContacts(null);
    setContactsError(null);
    setNotice(null);
    setSelected(null);
    setThread(null);
    setThreadError(null);
    fetch(contactsUrl(), { headers: authHeaders(token) })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setContacts([]);
          setContactsError(chatError(res.status, body && body.error));
          return;
        }
        setContacts(readContacts(body).contacts);
      })
      .catch(() => {
        if (cancelled) return;
        setContacts([]);
        setContactsError(chatError(0));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // `before` loads one page further back; without it this is the opening load.
  const loadThread = useCallback(
    async (email, options = {}) => {
      if (!token || !email) return;
      setThreadLoading(true);
      setThreadError(null);
      try {
        const res = await fetch(threadUrl(email, options), { headers: authHeaders(token) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          // A thread the server refuses is never shown from cache: the panel
          // keeps no conversation the caller may no longer read.
          setThread(null);
          setThreadError(chatError(res.status, body && body.error));
          return;
        }
        const page = readThread(body);
        setThread((previous) => ({
          ...page,
          messages: options.before ? mergeMessages(previous && previous.messages, page.messages) : page.messages,
        }));
      } catch {
        setThread(null);
        setThreadError(chatError(0));
      } finally {
        setThreadLoading(false);
      }
    },
    [token]
  );

  const poll = useCallback(async () => {
    const current = latest.current;
    const cursor = pollCursor(current && current.messages);
    if (!token || !selected || !cursor) return;
    try {
      const res = await fetch(threadUrl(selected, { after: cursor }), { headers: authHeaders(token) });
      if (!res.ok) return; // a failed poll is silent: it changes nothing on screen
      const body = await res.json().catch(() => ({}));
      const page = readThread(body);
      if (page.messages.length === 0) return;
      setThread((previous) =>
        previous ? { ...previous, messages: mergeMessages(previous.messages, page.messages) } : previous
      );
    } catch {
      // Offline for a moment: the conversation on screen stays as it was.
    }
  }, [token, selected]);

  useEffect(() => {
    if (!token || !selected) return undefined;
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [token, selected, poll]);

  function open(email) {
    setSelected(email);
    setDraft("");
    setNotice(null);
    setThread(null);
    pendingId.current = null;
    loadThread(email);
  }

  async function send(event) {
    event.preventDefault();
    if (!token || !selected || !canSend(draft, sending)) return;
    const clientId = pendingId.current || newClientId();
    pendingId.current = clientId;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch(MESSAGES_ENDPOINT, sendInit(token, { to: selected, body: draft, clientId }));
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The key stays: a retry of THIS attempt returns the stored message
        // instead of posting a second one.
        setNotice(chatError(res.status, body && body.error));
        return;
      }
      const stored = readMessage(body && body.message);
      if (!stored) {
        setNotice("The message was sent, but the confirmation could not be read. Reload to see it.");
        pendingId.current = null;
        setDraft("");
        return;
      }
      setThread((previous) => ({
        ...(previous || { hasMore: false, nextBefore: null, threadKey: null, serverTime: null }),
        messages: mergeMessages(previous && previous.messages, [stored]),
      }));
      setDraft("");
      pendingId.current = null;
      setNotice(body && body.duplicate ? "That message was already sent — showing the stored copy." : "Message sent.");
    } catch {
      setNotice(chatError(0));
    } finally {
      setSending(false);
    }
  }

  const loadingContacts = contacts === null && !contactsError;
  const people = contacts || [];

  return (
    <section className="tmsg" aria-labelledby="tmsg-title">
      <h2 className="tmsg-title" id="tmsg-title">Messages</h2>
      <p className="tmsg-lead">
        Private messages with the students linked to you. Students see these in their own Messages
        tab, and nobody else can read them — a student you have not linked cannot be messaged.
      </p>

      {!token && <p className="tmsg-muted">Sign in to see your messages.</p>}

      {token && loadingContacts && (
        <p className="tmsg-muted" role="status">Loading your linked students…</p>
      )}

      {token && contactsError && !loadingContacts && (
        <div className="tmsg-notice tmsg-notice-warn" role="alert">
          <p>{contactsError}</p>
          {people.length === 0 && (
            <p className="tmsg-muted">
              Messaging uses the same links as your dashboard. Link a student first — the Links card
              above does that — then come back here.
            </p>
          )}
        </div>
      )}

      {token && !loadingContacts && !contactsError && people.length === 0 && (
        <p className="tmsg-muted">
          No students are linked to you yet, so there is nobody to message. Link the students you
          teach with the card above and their names appear here.
        </p>
      )}

      {token && !loadingContacts && people.length > 0 && (
        <div className="tmsg-body">
          <nav className="tmsg-contacts" aria-label="Students you can message">
            <h3 className="tmsg-sub">Students you can message ({people.length})</h3>
            <ul className="tmsg-contacts-list">
              {people.map((person) => (
                <li key={person.email}>
                  <button
                    type="button"
                    className={"tmsg-contact " + (person.email === selected ? "is-open" : "")}
                    aria-current={person.email === selected ? "true" : undefined}
                    onClick={() => open(person.email)}
                  >
                    <span className="tmsg-contact-email">{person.email}</span>
                    <span className="tmsg-contact-role">{roleLabel(person.role)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="tmsg-thread">
            {!selected && <p className="tmsg-muted">Choose a student to open your conversation.</p>}

            {selected && (
              <>
                <h3 className="tmsg-sub tmsg-thread-title">{selected}</h3>

                {threadError && (
                  <div className="tmsg-notice tmsg-notice-warn" role="alert">
                    <p>{threadError}</p>
                  </div>
                )}

                {threadLoading && !thread && <p className="tmsg-muted" role="status">Loading the conversation…</p>}

                {thread && thread.messages.length === 0 && !threadLoading && !threadError && (
                  <p className="tmsg-muted">No messages yet — write the first one below.</p>
                )}

                {thread && thread.hasMore && (
                  <button
                    type="button"
                    className="tmsg-btn tmsg-btn-ghost"
                    disabled={threadLoading}
                    onClick={() => loadThread(selected, { before: thread.nextBefore })}
                  >
                    {threadLoading ? "Loading…" : "Load earlier messages"}
                  </button>
                )}

                {thread && thread.messages.length > 0 && <MessageList messages={thread.messages} me={me} />}

                <form className="tmsg-form" onSubmit={send}>
                  <label className="tmsg-label" htmlFor="tmsg-draft">
                    Message to {selected}
                  </label>
                  <textarea
                    id="tmsg-draft"
                    className="tmsg-input"
                    rows={3}
                    maxLength={MAX_MESSAGE_CHARS}
                    value={draft}
                    aria-describedby="tmsg-count"
                    disabled={sending || !!threadError}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <p className="tmsg-count" id="tmsg-count">
                    {draft.length} / {MAX_MESSAGE_CHARS} characters
                  </p>
                  <button type="submit" className="tmsg-btn" disabled={!canSend(draft, sending) || !!threadError}>
                    {sending ? "Sending…" : "Send"}
                  </button>
                </form>

                <p className="tmsg-notice-line" role="status" aria-live="polite">{notice || ""}</p>
              </>
            )}
          </div>
        </div>
      )}

      <p className="tmsg-footnote">
        Messages are between you and that student only. Unlinking a student stops them appearing
        here, and neither side can message the other after that.
      </p>
    </section>
  );
}
