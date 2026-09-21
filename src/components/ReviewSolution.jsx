import { shouldShowSolution } from "../data/howToSolve";
import HowToSolveIt from "./HowToSolveIt";

// One wrong answer in a review list: its worked solution, plus the offer to try
// another question on that topic.
//
// This is the single block all three review screens render, so the rule the
// owner asked for — the card and the practice offer appear on WRONG answers
// only, and never on a right one — is enforced by construction rather than
// repeated (and re-broken) in three places.
export default function ReviewSolution({
  explanation,
  isCorrect,
  textClass,
  buttonClass,
  canPractice = false,
  onPractice,
  practiceLabel = "Practice a similar question",
}) {
  return (
    <>
      <HowToSolveIt explanation={explanation} show={shouldShowSolution(isCorrect)} textClass={textClass} />
      {!isCorrect && canPractice && (
        <button type="button" className={`${buttonClass} hsw-practice-btn`.trim()} onClick={onPractice}>
          🔁 {practiceLabel}
        </button>
      )}
    </>
  );
}
