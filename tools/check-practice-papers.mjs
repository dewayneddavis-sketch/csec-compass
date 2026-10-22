#!/usr/bin/env node
// Harness: the Extra Practice tab is now five Practice Paper tabs.
//
// Owner directive 2026-10-21: the single "Extra Practice" tab is replaced by
// "Practice Paper 1" … "Practice Paper 5" holding the subject's SAME practice
// bank, unchanged and in order, 20 questions per tab (1–20, 21–40, …). No bank
// file is edited by that, so "100-question practice bank" stays true.
//
// This harness drives the real src/data/practicePapers.js the app renders with:
//   * the five tab entries (ids, full labels, short labels, order, colours),
//   * the split of EVERY subject's real practice bank → 20/20/20/20/20, in
//     order, with nothing dropped and nothing duplicated,
//   * the legacy link mapping (`?tab=practice` → Practice Paper 1),
//   * source guards so SubjectPage and ExtraPractice cannot drift back to a
//     single hardcoded "Extra Practice" tab or to a different denominator,
//   * a RED CONTROL: the count/completeness assertions are run against doctored
//     banks (99 and 105 questions) and must FAIL there, so a green run means the
//     assertion bit rather than that it was never exercised.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  PRACTICE_PAPER_COUNT,
  QUESTIONS_PER_PAPER,
  LEGACY_PRACTICE_TAB,
  practicePaperTabs,
  practicePaperFullLabel,
  practicePaperShortLabel,
  practicePaperTabId,
  practicePaperNumber,
  isPracticeTabId,
  splitPracticePapers,
  practicePaperSizes,
  resolvePracticeTab,
  resolveTabParam,
} from "../src/data/practicePapers.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const eq = (got, want, msg) => ok(got === want, `${msg} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const md5File = (p) => createHash("md5").update(fs.readFileSync(p)).digest("hex");

// ---------------------------------------------------------------------------
// 1. The five tabs, as literals. A rename in practicePapers.js must fail here
//    rather than quietly change the live tab labels.
// ---------------------------------------------------------------------------
console.log("=== the five Practice Paper tabs ===");
eq(PRACTICE_PAPER_COUNT, 5, "there are five practice papers");
eq(QUESTIONS_PER_PAPER, 20, "each paper holds 20 questions");
const tabs = practicePaperTabs();
eq(tabs.length, 5, "practicePaperTabs() returns five entries");
const EXPECTED_LABELS = ["Practice Paper 1", "Practice Paper 2", "Practice Paper 3", "Practice Paper 4", "Practice Paper 5"];
const EXPECTED_SHORT = ["PP1", "PP2", "PP3", "PP4", "PP5"];
const EXPECTED_IDS = ["practice-1", "practice-2", "practice-3", "practice-4", "practice-5"];
tabs.forEach((tab, i) => {
  eq(tab.label, EXPECTED_LABELS[i], `tab ${i + 1} full label`);
  eq(tab.shortLabel, EXPECTED_SHORT[i], `tab ${i + 1} short label (390 px phone)`);
  eq(tab.id, EXPECTED_IDS[i], `tab ${i + 1} tab id`);
  eq(tab.paper, i + 1, `tab ${i + 1} paper number`);
  ok(/^#[0-9a-f]{6}$/.test(tab.color) && /^#[0-9a-f]{6}$/.test(tab.tint), `tab ${i + 1} carries a colour and a tint`);
});
eq(practicePaperFullLabel(3), "Practice Paper 3", "full label comes from the module");
eq(practicePaperShortLabel(3), "PP3", "short label comes from the module");
eq(practicePaperTabId(3), "practice-3", "tab id comes from the module");
ok(new Set(tabs.map((t) => t.id)).size === 5, "the five tab ids are unique");
ok(tabs.every((t) => t.label !== t.shortLabel), "every practice tab has a distinct short label");
// The old tab id must not survive as a tab of its own: `practice` is only a
// legacy LINK value now, and it resolves to paper 1.
ok(!tabs.some((t) => t.id === LEGACY_PRACTICE_TAB), 'no tab carries the old id "practice"');
ok(tabs.every((t) => !Object.prototype.hasOwnProperty.call(t, "legacy")), "no practice tab entry is itself the legacy tab");

// --- contrast: white on the active tab, colour on the tinted tab (4.5:1) ---
function luminance(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
for (const tab of tabs) {
  ok(contrast("#ffffff", tab.color) >= 4.5, `${tab.label}: white on ${tab.color} is ${contrast("#ffffff", tab.color).toFixed(2)}:1`);
  ok(contrast(tab.color, tab.tint) >= 4.5, `${tab.label}: ${tab.color} on ${tab.tint} is ${contrast(tab.color, tab.tint).toFixed(2)}:1`);
}
// Control for the contrast helper itself: a deliberately low-contrast pair must
// come back below the threshold, or the assertion above proves nothing.
ok(contrast("#ffffff", "#f5f3ff") < 4.5, "contrast control: white on the pale tint is below 4.5:1 (the helper bites)");

// ---------------------------------------------------------------------------
// 2. The split of every real bank: 20/20/20/20/20, in order, nothing lost.
//    `splitFailures` is the assertion; the red control at the end runs it
//    against doctored banks.
// ---------------------------------------------------------------------------
function splitFailures(bank) {
  const problems = [];
  const papers = splitPracticePapers(bank);
  if (papers.length !== PRACTICE_PAPER_COUNT) problems.push(`papers=${papers.length}, want ${PRACTICE_PAPER_COUNT}`);
  const sizes = papers.map((p) => p.questions.length);
  if (sizes.join("/") !== "20/20/20/20/20") problems.push(`sizes=${sizes.join("/")}, want 20/20/20/20/20`);
  let at = 0;
  papers.forEach((paper, i) => {
    if (paper.start !== at) problems.push(`paper ${i + 1} starts at ${paper.start}, want ${at}`);
    if (paper.end - paper.start !== paper.questions.length) problems.push(`paper ${i + 1} range ${paper.start}-${paper.end} disagrees with its ${paper.questions.length} questions`);
    for (let j = 0; j < paper.questions.length; j += 1) {
      const want = bank[at + j];
      if (paper.questions[j] !== want) problems.push(`paper ${i + 1} question ${j + 1} is not bank question ${at + j + 1} (or not the same object)`);
    }
    at += paper.questions.length;
  });
  if (at !== bank.length) problems.push(`${bank.length - at} of the bank's questions never reached a paper`);
  const ids = papers.flatMap((p) => p.questions.map((q) => q.id)).join(",");
  const bankIds = bank.map((q) => q.id).join(",");
  if (ids !== bankIds) problems.push("the papers' question ids are not the bank's ids in bank order");
  return problems;
}

console.log("\n=== the split of every shipped practice bank ===");
const catalog = readJson("content/subjects.json");
const subjects = (Array.isArray(catalog) ? catalog : catalog.subjects || []).map((s) => s.id).filter(Boolean);
const banked = subjects.filter((id) => fs.existsSync(path.join(root, "content", id, "practice.json")));
eq(banked.length, subjects.length, "every subject in the catalog ships a practice bank");
ok(banked.length >= 25, `at least 25 practice banks are checked (got ${banked.length})`);
let banksTotal = 0;
for (const id of banked) {
  const bank = readJson(`content/${id}/practice.json`);
  const list = Array.isArray(bank) ? bank : bank.exercises || [];
  banksTotal += list.length;
  const before = JSON.stringify(list);
  const problems = splitFailures(list);
  ok(problems.length === 0, `${id}: 20/20/20/20/20 in bank order (${problems.join("; ") || "ok"})`);
  eq(JSON.stringify(splitPracticePapers(list).flatMap((p) => p.questions)), before, `${id}: the five papers together are the bank, byte-for-byte`);
  eq(JSON.stringify(list), before, `${id}: splitting did not touch the bank`);
  eq(practicePaperSizes(list).join("/"), "20/20/20/20/20", `${id}: practicePaperSizes reports 20/20/20/20/20`);
  // The bank itself is untouched by this PR: content/ and public/content/ mirrors
  // stay byte-identical, as the site serves the public/ copy.
  const a = path.join(root, `content/${id}/practice.json`);
  const b = path.join(root, `public/content/${id}/practice.json`);
  if (fs.existsSync(b)) {
    ok(md5File(a) === md5File(b), `${id}: practice.json mirror is byte-identical`);
  }
}
console.log(`    ${banked.length} banks, ${banksTotal} questions, every paper 20`);
eq(banksTotal, banked.length * 100, "every bank is 100 questions (so the 100-question promise still holds)");

// ---------------------------------------------------------------------------
// 3. The legacy link: ?tab=practice lands on Practice Paper 1, not nowhere.
// ---------------------------------------------------------------------------
console.log("\n=== links to the practice view ===");
eq(resolvePracticeTab("practice"), "practice-1", "the OLD tab id opens Practice Paper 1");
eq(resolvePracticeTab(" practice "), "practice-1", "the old id resolves trimmed and lower-cased");
eq(resolvePracticeTab("Practice"), "practice-1", "the old id resolves case-insensitively");
eq(resolvePracticeTab("practice-3"), "practice-3", "a new deep link opens its own paper");
eq(resolvePracticeTab("pp2"), "practice-2", "the short label PP2 opens Practice Paper 2");
eq(resolvePracticeTab("PP 5"), "practice-5", "a spaced short label opens Practice Paper 5");
eq(resolvePracticeTab("practice-9"), null, "an out-of-range paper is not invented");
eq(resolvePracticeTab("practice-0"), null, "paper 0 is not invented");
eq(resolvePracticeTab("lessons"), null, "a non-practice tab is not a practice tab");
eq(resolvePracticeTab(null), null, "no tab param is no practice tab");
eq(resolveTabParam("practice", ["lessons", "experiment", "quiz", "mock", "paper2", "progress", "sba"]), "practice-1", "resolveTabParam maps the old practice link");
eq(resolveTabParam("pp4", ["lessons"]), "practice-4", "resolveTabParam maps a short practice link");
eq(resolveTabParam("progress", ["lessons", "progress"]), "progress", "resolveTabParam passes through a real tab id");
eq(resolveTabParam("nonsense", ["lessons"]), null, "an unknown tab falls back to the caller's default");
eq(resolveTabParam("paper2", ["lessons"]), null, "a tab id the page does not have is not accepted");
eq(practicePaperNumber("practice-5"), 5, "practicePaperNumber reads the paper number");
eq(practicePaperNumber("practice-6"), null, "practicePaperNumber rejects paper 6");
eq(practicePaperNumber("pp1"), null, "practicePaperNumber only reads real tab ids");
ok(isPracticeTabId("practice-2") && !isPracticeTabId("practice") && !isPracticeTabId("mock"), "isPracticeTabId separates the five tabs from every other tab");

// ---------------------------------------------------------------------------
// 4. Source guards: the page and the component must use the module.
// ---------------------------------------------------------------------------
console.log("\n=== wiring ===");
const page = read("src/pages/SubjectPage.jsx");
const comp = read("src/components/ExtraPractice.jsx");
const css = read("src/pages/SubjectPage.css");
ok(/import \{[^}]*practicePaperTabs[^}]*\} from "\.\.\/data\/practicePapers(\.js)?";/s.test(page), "SubjectPage imports the practice-paper module");
ok(page.includes("...practicePaperTabs(),"), "the five practice tabs are spread into TABS from the module (not five hardcoded strings)");
ok(!page.includes('label: "Extra Practice"'), "the old single Extra Practice tab label is gone");
ok(!/id: "practice"/.test(page), 'no tab carries the old id "practice"');
ok(page.includes("isPracticeTabId(activeTab)"), "the practice panel is chosen by the practice-tab predicate");
ok(page.includes("paper={practicePaperNumber(activeTab)}"), "the open tab's paper number is passed to the panel");
ok(page.includes("resolveTabParam(searchParams.get(\"tab\")"), "the page opens the tab a ?tab= link names");
ok(/s-tab-label-full/.test(page) && /s-tab-label-short/.test(page), "the tab renders both the full and the short label from one source");
ok(/aria-label=\{tab\.shortLabel \? tab\.label : undefined\}/.test(page), "the full name stays the accessible name on a narrow screen");
ok(/\.s-tab-label-short \{\s*display: none;/s.test(css) && /\.s-tab-label-full \{\s*display: inline;/s.test(css), "CSS shows the full 'Practice Paper n' wording by default, at every width");
// Owner directive 2026-10-21 + the measured wrap point: the full wording sits on
// ONE line at 390 px (same 41 px tab height, same 314 px strip as the short
// label) and only wraps from 344 px down, so the fallback may fire below 359 px.
ok(/@media \(max-width: 359px\) \{\s*\.s-tab-label-full \{\s*display: none;\s*\}\s*\.s-tab-label-short \{\s*display: inline;\s*\}\s*\}/s.test(css), "the short label replaces the full wording only below 359 px, where the full wording wraps");
ok(!/@media \(max-width: 560px\)/.test(css), "the old 560 px breakpoint is gone, so the owner's wording shows on a 390 px phone");
ok(/import Paper2Section/.test(page) && /activeTab === "paper2" && \(paid \?/.test(page), "the Paper 2 tab and its paid gate are untouched");
ok(/label: SBA_TAB_LABEL/.test(page) && page.includes("sbaTabLabel(subjectId)"), "the SBA tab label is still derived per subject");
ok(comp.includes("splitPracticePapers(exercises)"), "ExtraPractice slices the bank it loaded (banks are not edited)");
ok(comp.includes("export default function ExtraPractice({ subjectId, paper = 1 })"), "ExtraPractice takes the paper it is showing");
ok(comp.includes("const questions = currentPaper.questions;") && comp.includes("const offset = currentPaper.start;"), "the panel reads the paper's slice and its bank offset");
ok(comp.includes("const total = questions.length;") && !comp.includes("const total = exercises.length;"), "the score denominator is the paper, not the whole bank");
ok(comp.includes("working[offset + current]"), "Show-Your-Work drafts are keyed by bank position, so the five papers cannot collide");
ok(!comp.includes("clearWorkingDrafts"), "a retry no longer wipes every paper's drafts");
ok(comp.includes("Practice Paper {currentPaper.paper}"), "the in-tab heading names the paper");
ok(/key=\{activeTab\}/.test(page), "each practice tab mounts its own panel");

// ---------------------------------------------------------------------------
// 5. RED CONTROL: doctored banks must FAIL the assertions above.
// ---------------------------------------------------------------------------
console.log("\n=== red control: the count assertion bites ===");
const controlBank = readJson(`content/${banked[0]}/practice.json`);
const controlList = Array.isArray(controlBank) ? controlBank : controlBank.exercises || [];
const short = controlList.slice(0, 99);
const fourPapers = controlList.slice(0, 80);
const long = controlList.concat(controlList.slice(0, 5));
const shortProblems = splitFailures(short);
const fourProblems = splitFailures(fourPapers);
const longProblems = splitFailures(long);
console.log(`     99-question bank -> ${shortProblems.length} problem(s): ${shortProblems[0] || "-"}`);
console.log(`     80-question bank -> ${fourProblems.length} problem(s): ${fourProblems[0] || "-"}`);
console.log(`    105-question bank -> ${longProblems.length} problem(s): ${longProblems[0] || "-"}`);
ok(shortProblems.length > 0, "a 99-question bank FAILS the 20/20/20/20/20 assertion");
ok(shortProblems.some((p) => /sizes=20\/20\/20\/20\/19/.test(p)), "the short-bank failure names the wrong sizes");
ok(fourProblems.some((p) => /papers=4/.test(p)), "an 80-question bank FAILS the five-paper assertion");
ok(longProblems.length > 0, "a 105-question bank FAILS the nothing-dropped assertion");
ok(longProblems.some((p) => /never reached a paper/.test(p)), "the long-bank failure names the dropped questions");
ok(splitFailures(controlList).length === 0, "the same caller is green on the real bank (so the red run is not a broken caller)");
// The splitter must never invent a sixth paper for a 120-question bank.
eq(splitPracticePapers(controlList.concat(controlList.slice(0, 20))).length, 5, "a 120-question bank still yields five papers");

console.log(`\ncheck-practice-papers: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
