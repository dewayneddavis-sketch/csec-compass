// The teacher-absent learning loop, decision half.
//
// Owner direction (2026-09-20): a wrong answer must teach, not just mark. The
// screens render a labelled "How to solve it" card from the question's own
// explanation (multi-line, \n-separated — see the Mathematics worked solutions),
// and that card is shown on WRONG answers. Correct answers stay clean.
//
// Kept as a plain module rather than a component so the rule is one greppable
// line the owner can flip, and so tools/check-math-review-loop.mjs can assert it
// without a browser.

// ONE-LINE TOGGLE: set true to also show the worked solution under a question
// the student got RIGHT.
export const SHOW_ON_CORRECT_ANSWERS = false;

// Owner's wording for the card heading.
export const SOLUTION_HEADING = "How to solve it";

// The whole review rule in one place — every screen asks this, so no screen can
// drift from the others.
export function shouldShowSolution(isCorrect) {
  return !isCorrect || SHOW_ON_CORRECT_ANSWERS;
}
