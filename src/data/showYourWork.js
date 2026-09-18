// Show-Your-Work — prove-your-answer working box.
//
// Competitive differentiator confirmed by the premier school (2026-09-17):
// on every multiple-choice question the student must TYPE their working in a
// large text box, so the answer proves they solved it rather than guessed or
// copied. The box appears on the three ASSESSMENT surfaces only — Knowledge
// Check, Extra Practice and Timed Mock Exam. It is deliberately NOT on the
// lesson or lab tabs: during study the solving is the student's own business.
//
// Config-driven: add a subject id to `subjects` to switch the feature on for
// that subject. Mathematics ships first (the premier school's subject); the
// wiring in Quiz / ExtraPractice / MockExam is subject-agnostic, so extending
// it is a one-line change here.
//
// Storage: working drafts are kept in localStorage per (subject, quizType) so a
// student never loses what they typed on a reload, and the finished attempt
// carries the working (see src/data/analytics.js recordQuizResult).

export const SHOW_YOUR_WORK = {
  // Subject ids the working box is switched on for. Config-driven on purpose.
  subjects: ["mathematics"],
  // Where the box appears. 'mock' is the timed exam, 'practice' Extra Practice.
  quizzes: ["knowledge-check", "practice", "mock"],
  // Minimum characters of real working (after trimming) before the student may
  // move on. Deliberately small: this asks for a genuine attempt at showing
  // steps, not an essay, and the pass mark is still decided by the answers.
  minChars: 3,
  prompt:
    "Write the steps you used to get your answer — the method, not just the number. " +
    "Your working is saved with this attempt.",
  placeholder:
    "e.g.  3x + 5 = 20\n3x = 20 − 5 = 15\nx = 15 ÷ 3 = 5",
};

const LS_PREFIX = "csec-working-";

// True when the working box should appear for this subject + quiz surface.
export function showYourWorkEnabled(subjectId, quizType) {
  if (!subjectId) return false;
  if (!SHOW_YOUR_WORK.subjects.includes(subjectId)) return false;
  if (quizType && !SHOW_YOUR_WORK.quizzes.includes(quizType)) return false;
  return true;
}

// Has the student typed enough working to count as showing it?
export function isWorkingComplete(text) {
  return typeof text === "string" && text.trim().length >= SHOW_YOUR_WORK.minChars;
}

// How much working is still missing from a whole attempt?
// `total` questions, `working` = { index: text }.
export function countMissingWorking(total, working) {
  let missing = 0;
  for (let i = 0; i < total; i += 1) {
    if (!isWorkingComplete((working || {})[i])) missing += 1;
  }
  return missing;
}

function lsKey(subjectId, quizType) {
  return `${LS_PREFIX}${subjectId}-${quizType}`;
}

// In-progress working for one quiz surface, keyed by question index.
export function loadWorkingDrafts(subjectId, quizType) {
  if (!showYourWorkEnabled(subjectId, quizType)) return {};
  try {
    const raw = localStorage.getItem(lsKey(subjectId, quizType));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveWorkingDrafts(subjectId, quizType, working) {
  if (!showYourWorkEnabled(subjectId, quizType)) return;
  try {
    const entries = Object.entries(working || {}).filter(([, v]) => String(v || "").trim() !== "");
    if (entries.length === 0) {
      localStorage.removeItem(lsKey(subjectId, quizType));
      return;
    }
    localStorage.setItem(lsKey(subjectId, quizType), JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Quota / private mode — the box still works for this sitting.
  }
}

export function clearWorkingDrafts(subjectId, quizType) {
  try {
    localStorage.removeItem(lsKey(subjectId, quizType));
  } catch {
    // Nothing to clear.
  }
}
