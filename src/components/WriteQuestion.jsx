import { useState } from "react";

// One typed-answer ("write") question: the answer box, and — on request — the
// model answer plus mark scheme for self-assessment.
//
// This is the shared renderer for the `write` question type described in
// content/WRITE-QUESTION-FORMAT.md. It is used by Paper2Section for both item
// shapes (Social Studies' structured `(a)(b)(c)` parts and English B's flat
// single-essay items) and for the item-level shape too.
//
// NOTHING here auto-marks the student's writing. Free writing cannot be judged
// fairly by a script, so the only "score" is the number of mark-scheme points
// the student ticks for themselves, and the UI says so in plain words.

function Paragraphs({ text, className }) {
  const parts = String(text || "").split(/\n{2,}/).filter((p) => p.trim() !== "");
  return (
    <>
      {parts.map((p, i) => (
        <p key={i} className={className}>{p.trim()}</p>
      ))}
    </>
  );
}

function wordCount(text) {
  const t = String(text || "").trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

export default function WriteQuestion({
  id,
  label,
  prompt,
  marks,
  suggestedMinutes,
  commandWords,
  modelAnswer,
  markScheme,
  answer,
  onAnswer,
  ticks = [],
  onToggleTick,
  rows = 8,
  modelExtras = null,
}) {
  const [revealed, setRevealed] = useState(false);
  const scheme = Array.isArray(markScheme) ? markScheme : [];
  const ticked = ticks.filter(Boolean).length;
  const words = wordCount(answer);
  const who = label ? `part ${label}` : "question";

  return (
    <section className="p2-q">
      <div className="p2-q-head">
        {label && <span className="p2-q-label">{label}</span>}
        {typeof marks === "number" && (
          <span className="p2-chip p2-chip-marks">{marks} {marks === 1 ? "mark" : "marks"}</span>
        )}
        {suggestedMinutes && <span className="p2-chip p2-chip-time">⏱ {suggestedMinutes} min</span>}
        {(commandWords || []).map((w) => (
          <span key={w} className="p2-chip p2-chip-cw" title="Command word — it tells you how to answer">{w}</span>
        ))}
      </div>

      <p className="p2-q-prompt">{prompt}</p>

      <label className="p2-answer-label" htmlFor={`p2-answer-${id}`}>Your answer</label>
      <textarea
        id={`p2-answer-${id}`}
        className="p2-textarea"
        rows={rows}
        value={answer || ""}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Plan your points, then write your answer in full sentences. Type it here — it is saved on this device as you go."
      />
      <div className="p2-answer-meta">
        <span className="p2-wordcount">{words} {words === 1 ? "word" : "words"}</span>
        <span className="p2-saved">{words > 0 ? "✓ Draft saved on this device" : "Nothing typed yet"}</span>
      </div>

      {!revealed ? (
        <button className="p2-btn p2-btn-reveal" onClick={() => setRevealed(true)}>
          👀 Show model answer &amp; mark scheme
        </button>
      ) : (
        <div className="p2-model">
          <p className="p2-selfassess">
            <strong>Self-assessment — not a marked grade.</strong> Read the model answer, then tick every
            mark-scheme point you actually made in your own answer.
          </p>

          <h5 className="p2-model-h">Model answer</h5>
          <div className="p2-model-text">
            <Paragraphs text={modelAnswer} />
          </div>

          {scheme.length > 0 && (
            <>
              <h5 className="p2-model-h">Mark scheme — tick the points you made</h5>
              <ul className="p2-scheme">
                {scheme.map((line, i) => (
                  <li key={i} className={ticks[i] ? "p2-ticked" : ""}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!ticks[i]}
                        onChange={() => onToggleTick(i)}
                      />
                      <span>{line}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="p2-estimate">
                You ticked <strong>{ticked}</strong> of <strong>{scheme.length}</strong> mark-scheme points.
                This {who} is worth <strong>{marks} {marks === 1 ? "mark" : "marks"}</strong>. Your ticked
                count is an estimate for your own revision only — the real mark is the examiner's.
              </p>
            </>
          )}

          {modelExtras}
        </div>
      )}
    </section>
  );
}
