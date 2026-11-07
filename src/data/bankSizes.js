// The per-subject practice-bank size — a product PROMISE, so it lives here next
// to the other promises (pricingSubjects.js), not in content/<subject>/metadata.json,
// which is descriptive and mirrored byte-for-byte to public/content.
//
// Slice 0 ships this with an EMPTY override map: every subject is still 100 and
// every paper is still 20, so nothing a student sees changes. The Mathematics
// re-balance is a ONE-LINE change here — { mathematics: 150 } — and every pin,
// every label and the parents-page copy follow it with no harness edit.
//
// The number of papers stays in practicePapers.js (it is the UI structure — five
// tabs); this module imports it rather than declaring a second "5".
import { PRACTICE_PAPER_COUNT } from "./practicePapers.js";

export const PRACTICE_BANK_DEFAULT = 100;
export const KNOWLEDGE_CHECK_DEFAULT = 25;

// Only subjects that differ from the default appear here. A key naming no real
// subject silently does nothing, which is the failure this map's stray-key
// assertion exists to catch (tools/check-subject-catalog.mjs).
// after the Mathematics re-balance: { mathematics: 150 }
export const PRACTICE_BANK_OVERRIDES = {};

export function practiceBankSize(subjectId) {
  return Object.prototype.hasOwnProperty.call(PRACTICE_BANK_OVERRIDES, subjectId)
    ? PRACTICE_BANK_OVERRIDES[subjectId]
    : PRACTICE_BANK_DEFAULT;
}

// No subject overrides its knowledge check: the owner ruled 25 for Mathematics
// (exception for the bank only), for English B (no exception) and for Biology.
// A KC override map with no entries would be a silent-default trap, so there is
// none — the function is here so callers never retype the 25.
export function knowledgeCheckSize() {
  return KNOWLEDGE_CHECK_DEFAULT;
}

export function questionsPerPaper(bankSize) {
  return Math.floor(Number(bankSize) / PRACTICE_PAPER_COUNT);
}

// [{ questions, perPaper, subjects }] smallest bank first — the shape the
// guide's generated sentence is built from.
export function practiceSizeGroups(subjectIds) {
  const by = new Map();
  for (const id of subjectIds || []) {
    const n = practiceBankSize(id);
    if (!by.has(n)) by.set(n, []);
    by.get(n).push(id);
  }
  return [...by.entries()]
    .map(([questions, subjects]) => ({ questions, perPaper: questionsPerPaper(questions), subjects }))
    .sort((a, b) => a.questions - b.questions);
}
