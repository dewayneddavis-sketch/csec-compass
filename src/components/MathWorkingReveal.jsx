import "./MathWorkingReveal.css";

// Lab answer reveal: the correct answer plus the step-by-step maths.
// Used by the Mathematics labs when a student answers wrong (DragDropLabel for
// the match/sort activities, BalanceScale for the equation-balancing lab), so
// the mistake teaches instead of just scoring.
export default function MathWorkingReveal({ title, answer, steps, tone = "wrong" }) {
  const list = (steps || []).filter(Boolean);
  if (!answer && list.length === 0) return null;
  return (
    <div className={`mwr mwr-${tone}`} role="status" aria-live="polite">
      <div className="mwr-head">
        <span className="mwr-icon" aria-hidden="true">{tone === "wrong" ? "❌" : "📘"}</span>
        {title || "Here's the working"}
      </div>
      {answer && (
        <p className="mwr-answer">
          Correct answer: <strong>{answer}</strong>
        </p>
      )}
      {list.length > 0 && (
        <ol className="mwr-steps">
          {list.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
