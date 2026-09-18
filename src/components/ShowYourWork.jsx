import { SHOW_YOUR_WORK, showYourWorkEnabled, isWorkingComplete } from "../data/showYourWork";
import "./ShowYourWork.css";

// The prove-your-answer working box. Rendered on the assessment tabs
// (Knowledge Check / Extra Practice / Mock Exam) only, and only for the
// subjects switched on in src/data/showYourWork.js — otherwise it renders
// nothing at all, so other subjects are untouched.
export default function ShowYourWork({
  subjectId,
  quizType,
  questionNumber,
  value,
  onChange,
  disabled = false,
}) {
  if (!showYourWorkEnabled(subjectId, quizType)) return null;

  const text = value || "";
  const complete = isWorkingComplete(text);
  const inputId = `syw-${quizType}-q${questionNumber}`;

  return (
    <div className={`syw ${complete ? "syw-complete" : "syw-incomplete"}`}>
      <label className="syw-label" htmlFor={inputId}>
        <span className="syw-label-icon" aria-hidden="true">✍️</span> Show your work
        <span className="syw-required"> required</span>
      </label>
      <p className="syw-prompt">{SHOW_YOUR_WORK.prompt}</p>
      <textarea
        id={inputId}
        className="syw-input"
        rows={6}
        value={text}
        placeholder={SHOW_YOUR_WORK.placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck="false"
        aria-describedby={`${inputId}-status`}
      />
      <div className="syw-meta" id={`${inputId}-status`}>
        <span className="syw-count">{text.trim().length} characters</span>
        {complete ? (
          <span className="syw-ok">✓ Working recorded — it will be saved with this attempt</span>
        ) : (
          <span className="syw-warn">
            Write your steps to continue ({SHOW_YOUR_WORK.minChars} characters minimum)
          </span>
        )}
      </div>
    </div>
  );
}
