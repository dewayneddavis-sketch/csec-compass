import { SHOW_ON_CORRECT_ANSWERS, SOLUTION_HEADING } from "../data/howToSolve";
import "./HowToSolveIt.css";

// The labelled step-by-step card: the owner's "teacher-absent learning loop".
//
// Mathematics explanations are multi-line worked solutions (steps separated by
// \n — content task 54665dde). They must be rendered with white-space: pre-line
// or the steps collapse into one paragraph, which is why every review screen
// passes its own class here and each of those CSS files pins pre-line.
//
// `show` is decided by the caller through shouldShowSolution() so the
// wrong-answers-only rule lives in one place (src/data/howToSolve.js).
export default function HowToSolveIt({ explanation, show = true, textClass = "", heading = SOLUTION_HEADING }) {
  if (!explanation || !show) return null;
  return (
    <div className="hsw-card" data-show-on-correct={SHOW_ON_CORRECT_ANSWERS ? "true" : "false"}>
      <p className="hsw-heading">💡 {heading}</p>
      <p className={`hsw-text ${textClass}`.trim()}>{explanation}</p>
    </div>
  );
}
