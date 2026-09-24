import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  GUIDE_INTRO,
  GUIDE_SUGGESTED_QUESTIONS,
  guideReply,
} from "../data/guideFacts";
import "./GuideBot.css";

// The Compass Guide — a floating help panel on every page.
//
// PLACEMENT (decided in the PR description): a floating widget in the app shell
// rather than a page of its own. Every question it answers — what a subject
// costs, whether there is a free preview, how long access lasts — is asked AT
// the paywall, on the Pricing page and on the landing page, and a route would
// only be found by people who already went looking. The launcher sits in the
// bottom-right corner, out of the way, and the panel is keyboard-closable.
//
// WHAT IT IS NOT: there is no model, no API key, no network call and no
// per-message cost. guideReply() is a pure function over src/data/guideFacts.js,
// so an answer is either a curated fact or the honest "I am only a guide" reply
// with a link to the Contact form. Nothing here can invent a price.
const SENDER_YOU = "you";

function paragraphs(text) {
  return String(text || "")
    .split("\n")
    .filter((line, i, all) => line.trim() || i === 0 || i === all.length - 1)
    .map((line) => line.trim());
}

export default function GuideBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ id: 1, from: "guide", text: GUIDE_INTRO, matched: true }]);
  const nextId = useRef(2);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  // Escape closes the panel — a widget that traps focus would be worse than no
  // widget, especially on a phone.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the newest message in view (the log scrolls, the page must not).
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function ask(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return;
    // The reply is decided by the curated facts module; the UI only renders it.
    const reply = guideReply(text);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, from: SENDER_YOU, text },
      {
        id: nextId.current++,
        from: "guide",
        text: reply.text,
        matched: reply.matched,
        topicId: reply.topicId,
      },
    ]);
    setInput("");
  }

  return (
    <div className="gb-root">
      {open && (
        <section
          className="gb-panel"
          role="dialog"
          aria-label="Compass Guide — questions about CSEC Compass"
        >
          <header className="gb-header">
            <span className="gb-header-icon" aria-hidden="true">🧭</span>
            <div className="gb-header-text">
              <strong>Compass Guide</strong>
              <span className="gb-header-sub">Prices, subjects, access — answered from this site</span>
            </div>
            <button
              type="button"
              className="gb-close"
              onClick={() => setOpen(false)}
              aria-label="Close the guide"
            >
              ×
            </button>
          </header>

          <div className="gb-log" ref={logRef} aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={"gb-msg " + (message.from === SENDER_YOU ? "gb-msg-you" : "gb-msg-guide")}
              >
                {paragraphs(message.text).map((line, i) => (
                  <p key={i} className="gb-msg-line">{line}</p>
                ))}
                {message.from === "guide" && message.matched === false && (
                  <p className="gb-msg-actions">
                    <Link to="/contact" className="gb-link" onClick={() => setOpen(false)}>
                      Open the Contact form
                    </Link>
                    <Link to="/pricing" className="gb-link" onClick={() => setOpen(false)}>
                      See the Pricing page
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="gb-chips" aria-label="Suggested questions">
            {GUIDE_SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion.topicId}
                type="button"
                className="gb-chip"
                onClick={() => ask(suggestion.text)}
              >
                {suggestion.text}
              </button>
            ))}
          </div>

          <form
            className="gb-form"
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
          >
            <label className="gb-label" htmlFor="guidebot-input">
              Ask the guide
            </label>
            <input
              id="guidebot-input"
              ref={inputRef}
              className="gb-input"
              type="text"
              value={input}
              maxLength={300}
              autoComplete="off"
              placeholder="e.g. how much is one subject?"
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" className="gb-send" disabled={!input.trim()}>
              Send
            </button>
          </form>
          <p className="gb-foot">
            A guide, not a person: it answers from what is written on this site, and hands you to
            the Contact form when it does not know.
          </p>
        </section>
      )}

      <button
        type="button"
        className={"gb-launcher" + (open ? " gb-launcher-open" : "")}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close the Compass Guide" : "Open the Compass Guide — ask a question"}
      >
        <span className="gb-launcher-icon" aria-hidden="true">{open ? "×" : "💬"}</span>
        <span className="gb-launcher-text">{open ? "Close" : "Ask the guide"}</span>
      </button>
    </div>
  );
}
