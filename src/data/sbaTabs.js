// Per-subject labelling for the exam-support tab that ships as "CSEC SBA".
//
// Modern languages are the exception: French and Spanish have NO School-Based
// Assessment portfolio. Their Paper 03 IS the oral examination, and
// content/<subject>/sba.json already teaches exactly that (the French intro
// literally opens "French has NO School-Based Assessment (SBA)...").
// The tab renders the same guide, but calling it an "SBA" tab would be wrong
// for these two subjects, so the visible label is subject-aware.

/** Subjects whose exam-support tab is the oral exam, not an SBA portfolio. */
export const ORAL_EXAM_SUBJECTS = ["french", "spanish"];

export const SBA_TAB_LABEL = "CSEC SBA";
export const ORAL_EXAM_TAB_LABEL = "Oral Exam / Paper 03";

function norm(subjectId) {
  return typeof subjectId === "string" ? subjectId.trim().toLowerCase() : "";
}

export function isOralExamSubject(subjectId) {
  return ORAL_EXAM_SUBJECTS.includes(norm(subjectId));
}

/** Tab label for the exam-support tab: "CSEC SBA" or "Oral Exam / Paper 03". */
export function sbaTabLabel(subjectId) {
  return isOralExamSubject(subjectId) ? ORAL_EXAM_TAB_LABEL : SBA_TAB_LABEL;
}

/** Long form used in headings/banners: "SBA Guide" or "Oral Exam Guide". */
export function sbaGuideLabel(subjectId) {
  return isOralExamSubject(subjectId) ? "Oral Exam Guide" : "SBA Guide";
}

/** Short form used inside sentences: "SBA" or "Oral Exam". */
export function sbaTabNoun(subjectId) {
  return isOralExamSubject(subjectId) ? "Oral Exam" : "SBA";
}
