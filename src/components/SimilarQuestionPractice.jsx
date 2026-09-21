import { useState } from "react";
import { pickSimilarQuestion, questionKey } from "../data/similarQuestion";
import HowToSolveIt from "./HowToSolveIt";
import "./SimilarQuestionPractice.css";

// The free "try again" loop behind the review's "Practice a similar question".
//
// This is NOT part of the exam:
//   * no timer — nothing here reads or advances timeLeft,
//   * no score — the parent's pass/fail and correctCount are computed from the
//     parent's own `answers`, and this card keeps its own state,
//   * no analytics — it never calls recordQuizResult, never touches the
//     quiz_results/lab_activity payload of the attempt the student just sat and
//     never writes a working draft.
// The student checks one question, sees that question's own worked solution, and
// can try another variant or close the card. The review screen behind it is
// untouched.

// Feedback for one practiced question. Presentational, so the states the student
// actually reads can be verified without a browser.
export function PracticeFeedback({ question, selected, onAnother, onDone, canAnother = true }) {
  if (!question) return null;
  const isCorrect = selected === question.answer;
  return (
    <div className="sqp-feedback">
      <p className={`sqp-verdict ${isCorrect ? "sqp-verdict-correct" : "sqp-verdict-wrong"}`}>
        {isCorrect ? "✅ Correct!" : "❌ Not quite"}
      </p>
      <p className="sqp-answer">
        The answer is <strong>{question.answer}</strong>
        {!isCorrect && selected !== undefined && selected !== null && <> — you chose <strong>{selected}</strong></>}
      </p>
      {/* Always shown here: the student asked to practise this topic, so the
          worked solution IS the feedback. */}
      <HowToSolveIt explanation={question.explanation} textClass="sqp-explain" />
      <div className="sqp-actions">
        {canAnother && (
          <button type="button" className="sqp-btn sqp-btn-primary" onClick={onAnother}>
            Practice another
          </button>
        )}
        <button type="button" className="sqp-btn sqp-btn-ghost" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function SimilarQuestionPractice({ bank, missed, onClose }) {
  const [question, setQuestion] = useState(() => pickSimilarQuestion(bank, missed));
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [seen, setSeen] = useState(() => [questionKey(missed)]);

  const next = () => {
    const picked = pickSimilarQuestion(bank, missed, { excludeKeys: seen });
    if (!picked) return;
    setSeen((prev) => [...prev, questionKey(picked)]);
    setQuestion(picked);
    setSelected(null);
    setChecked(false);
  };

  return (
    <div className="sqp-card" role="region" aria-label="Practice a similar question">
      <div className="sqp-head">
        <p className="sqp-title">Practice a similar question</p>
        <p className="sqp-note">
          Not graded — this one is just for practice. Your score above does not change.
        </p>
      </div>

      {question && (
        <>
          {question.topic && <p className="sqp-topic">Topic: {question.topic.replace(/-/g, " ")}</p>}
          <p className="sqp-question">{question.question}</p>

          {!checked ? (
            <>
              <div className="sqp-options">
                {question.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`sqp-option ${selected === opt ? "sqp-option-selected" : ""}`}
                    onClick={() => setSelected(opt)}
                  >
                    <span className="sqp-opt-letter">{String.fromCharCode(65 + i)}</span>
                    <span className="sqp-opt-text">{opt}</span>
                  </button>
                ))}
              </div>
              <div className="sqp-actions">
                <button
                  type="button"
                  className="sqp-btn sqp-btn-primary"
                  onClick={() => setChecked(true)}
                  disabled={selected === null}
                >
                  Check answer
                </button>
                <button type="button" className="sqp-btn sqp-btn-ghost" onClick={onClose}>
                  Done
                </button>
              </div>
            </>
          ) : (
            <PracticeFeedback
              question={question}
              selected={selected}
              onAnother={next}
              onDone={onClose}
              canAnother={bank.some((q) => !seen.includes(questionKey(q)) && questionKey(q) !== questionKey(missed))}
            />
          )}
        </>
      )}
    </div>
  );
}
