// The five Practice Paper tabs.
//
// Owner directive 2026-10-21: the single "Extra Practice" tab is replaced by
// five tabs — "Practice Paper 1" … "Practice Paper 5" — holding the subject's
// SAME practice bank, unchanged and in order, 20 questions per tab (1–20,
// 21–40, …). No bank file is touched by this: practice.json still ships its 100
// questions with their ids, options, answers and explanations exactly as they
// were, and the paper's start card names the range of the bank it covers, so
// "100-question practice bank" stays true.
//
// This module is the single source for the split, the labels, the tab ids and
// the legacy-link mapping, so SubjectPage, ExtraPractice and the harness cannot
// drift apart on any of the five. On a narrow phone the visible label shortens
// to PP1…PP5 (CSS picks which of the two spans shows); the full "Practice
// Paper n" stays the in-tab heading and the accessible name.
//
// Pure and import-free on purpose: tools/check-practice-papers.mjs drives it
// straight from Node.
export const PRACTICE_PAPER_COUNT = 5;
export const QUESTIONS_PER_PAPER = 20;
// The tab id the single Extra Practice tab used to carry. A link written against
// the old view — /subject/<id>?tab=practice — still opens Practice Paper 1, so
// nothing that pointed at it lands nowhere.
export const LEGACY_PRACTICE_TAB = "practice";
const TAB_PREFIX = "practice-";
// One dark accessible shade per paper, in the same purple family so the five
// read as a group while staying tellable apart (owner feedback from the school
// visit: "it is hard to distinguish between tabs"). Every one is at or above
// 4.5:1 for white on it and for it on its own pale tint — asserted by
// tools/check-practice-papers.mjs.
const PAPER_COLOURS = [
  { color: "#6d28d9", tint: "#f5f3ff" }, // purple
  { color: "#4338ca", tint: "#eef2ff" }, // indigo
  { color: "#7e22ce", tint: "#faf5ff" }, // violet
  { color: "#a21caf", tint: "#fdf4ff" }, // fuchsia
  { color: "#5b21b6", tint: "#f5f3ff" }, // deep purple
];

export function practicePaperFullLabel(paper) {
  return `Practice Paper ${paper}`;
}
export function practicePaperShortLabel(paper) {
  return `PP${paper}`;
}
export function practicePaperTabId(paper) {
  return `${TAB_PREFIX}${paper}`;
}

// The five tab entries, in order — the only place the labels and ids exist.
export function practicePaperTabs() {
  return Array.from({ length: PRACTICE_PAPER_COUNT }, (_, i) => {
    const paper = i + 1;
    const { color, tint } = PAPER_COLOURS[i % PAPER_COLOURS.length];
    return {
      id: practicePaperTabId(paper),
      paper,
      label: practicePaperFullLabel(paper),
      // Present only on the practice tabs: the renderer shows this one on a
      // narrow screen (the full label is still the accessible name).
      shortLabel: practicePaperShortLabel(paper),
      color,
      tint,
    };
  });
}

// The paper number a tab id carries, or null when it is not a practice tab.
export function practicePaperNumber(tabId) {
  const m = typeof tabId === "string" ? /^practice-(\d+)$/.exec(tabId.trim()) : null;
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= PRACTICE_PAPER_COUNT ? n : null;
}

export function isPracticeTabId(tabId) {
  return practicePaperNumber(tabId) !== null;
}

// The papers, sliced out of the bank the page actually loaded. A paper is 20
// questions in bank order; the numbers the UI prints come from here, so no
// header can claim a range its slice does not have.
export function splitPracticePapers(questions) {
  const bank = Array.isArray(questions) ? questions : [];
  const tabs = practicePaperTabs();
  const papers = [];
  for (let i = 0; i < tabs.length; i += 1) {
    const start = i * QUESTIONS_PER_PAPER;
    if (start >= bank.length) break;
    const items = bank.slice(start, start + QUESTIONS_PER_PAPER);
    papers.push({ ...tabs[i], start, end: start + items.length, questions: items });
  }
  return papers;
}

// How many questions each paper actually holds — the number the harness asserts
// against 20/20/20/20/20.
export function practicePaperSizes(questions) {
  return splitPracticePapers(questions).map((paper) => paper.questions.length);
}

// Which practice tab a `?tab=` value asks for: the new ids (practice-3), the
// short labels (pp3, pp 3) and the OLD single-tab id (practice → Practice
// Paper 1). Anything else is not a practice tab.
export function resolvePracticeTab(tabParam) {
  if (typeof tabParam !== "string") return null;
  const value = tabParam.trim().toLowerCase().replace(/\s+/g, "");
  if (value === LEGACY_PRACTICE_TAB) return practicePaperTabId(1);
  const direct = practicePaperNumber(value);
  if (direct !== null) return practicePaperTabId(direct);
  const short = /^pp(\d)$/.exec(value);
  if (short) {
    const n = Number(short[1]);
    if (n >= 1 && n <= PRACTICE_PAPER_COUNT) return practicePaperTabId(n);
  }
  return null;
}

// The tab to open for a `?tab=` value: one of the five practice papers, one of
// the page's own tab ids, or null — the caller then opens Lessons. This is what
// makes an old link to the practice view land on Practice Paper 1.
export function resolveTabParam(tabParam, otherTabIds = []) {
  const practice = resolvePracticeTab(tabParam);
  if (practice) return practice;
  const value = typeof tabParam === "string" ? tabParam.trim() : "";
  return otherTabIds.includes(value) ? value : null;
}
