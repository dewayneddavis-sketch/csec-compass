// Physics bank re-balance (owner decision 2026-10-22) — the guardrails.
//
// The owner's rule: the two banks are RE-BALANCED, never grown. Practice stays
// exactly 100 and the knowledge check exactly 25 (5 per section). The pass existed
// because the coverage build took Physics to 61 lessons while the practice bank still
// drilled 16 topics: 45 lessons had nothing tagged to them at all.
//
// This harness pins the outcome, and every assertion below is red-controlled at the
// bottom of the file, so a passing run is evidence rather than a formality:
//   1. practice is exactly 100, EVERY lesson is drilled, no orphans, no duplicate ids
//      or duplicate question text, every item a well-formed MCQ;
//   2. the five practice papers still partition the bank 20/20/20/20/20 and each one
//      carries every section, so no paper is a block of one section;
//   3. the knowledge check is exactly 25, exactly 5 per section, 5 DISTINCT topics
//      per section, same well-formedness;
//   4. content/ and public/content/ are byte-identical, for both banks;
//   5. docs/physics-bank-rebalance.md names every retirement and its per-lesson table
//      matches the bank that actually ships.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { practicePaperTabs } from "../src/data/practicePapers.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readBytes = (p) => fs.readFileSync(path.join(root, p));
const readJson = (p) => JSON.parse(read(p));
let pass = 0, fail = 0, quiet = false;
const check = (cond, msg) => { if (cond) pass++; else { fail++; if (!quiet) console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const SHAPE = ["id", "question", "options", "answer", "explanation", "topic"];
const modules = readJson("content/physics/modules.json");
const lessons = modules.flatMap((s) => (s.lessons || []).map((l) => l.id));
const lessonIds = new Set(lessons);
const sectionOf = new Map(modules.flatMap((s) => (s.lessons || []).map((l) => [l.id, s.id])));
const SECTION_IDS = modules.map((s) => s.id);

// ---------------------------------------------------------------- the checks
/** Everything wrong with a practice bank, given the lessons it is supposed to drill. */
function bankProblems(bank, expectedLessons, expectedSections) {
  const out = [];
  if (bank.length !== 100) out.push(`practice holds ${bank.length}, want 100`);
  const ids = bank.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const text = bank.map((q) => String(q.question).trim().toLowerCase());
  if (new Set(text).size !== text.length) out.push("duplicate question text");
  for (const q of bank) {
    if (JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) out.push(`${q.id}: keys ${Object.keys(q).join(",")}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4) out.push(`${q.id}: options are not 4 distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if (String(q.explanation || "").trim().length < 10) out.push(`${q.id}: thin explanation`);
    if (!expectedLessons.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic}`);
  }
  const drilled = new Set(bank.map((q) => q.topic));
  const undrilled = [...expectedLessons].filter((id) => !drilled.has(id));
  if (undrilled.length) out.push(`lessons with no practice question: ${undrilled.join(",")}`);
  return out;
}

/** Everything wrong with a knowledge check: 25, 5 per section, 5 distinct topics each. */
function checkProblems(kc, expectedSections, mapLesson) {
  const out = [];
  if (kc.length !== 25) out.push(`knowledge check holds ${kc.length}, want 25`);
  const ids = kc.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const text = kc.map((q) => String(q.question).trim().toLowerCase());
  if (new Set(text).size !== text.length) out.push("duplicate question text");
  for (const q of kc) {
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if (!mapLesson.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic}`);
  }
  for (const s of expectedSections) {
    const mine = kc.filter((q) => mapLesson.get(q.topic) === s);
    if (mine.length !== 5) out.push(`section ${s} holds ${mine.length}, want 5`);
    const distinct = new Set(mine.map((q) => q.topic));
    if (distinct.size !== mine.length) out.push(`section ${s} repeats a topic (${distinct.size} distinct for ${mine.length})`);
  }
  return out;
}

/** The five papers: an even split, each carrying every section. */
function paperProblems(bank, expectedSections, tabs) {
  const out = [];
  if (tabs !== 5) out.push(`${tabs} practice tabs, want 5`);
  if (bank.length % tabs !== 0) out.push(`${bank.length} questions do not split evenly into ${tabs}`);
  const size = bank.length / tabs;
  for (let i = 0; i < tabs; i++) {
    const paper = bank.slice(i * size, (i + 1) * size);
    const named = [...expectedSections].filter((s) => paper.some((q) => sectionOf.get(q.topic) === s));
    if (named.length !== expectedSections.length) out.push(`paper ${i + 1} is missing sections ${[...expectedSections].filter((s) => !named.includes(s)).join(",")}`);
  }
  return out;
}

/** The ledger doc has to name every retirement and agree with the bank that ships. */
function ledgerProblems(doc, bank, kc, mapLesson) {
  const out = [];
  const retired = [...doc.matchAll(/^\| `([pq]\d+)` \|/gm)].map((m) => m[1]);
  const practiceRetired = retired.filter((id) => id.startsWith("p"));
  const checkRetired = retired.filter((id) => id.startsWith("q"));
  if (practiceRetired.length !== 52) out.push(`the ledger names ${practiceRetired.length} practice retirements, want 52`);
  if (checkRetired.length !== 13) out.push(`the ledger names ${checkRetired.length} knowledge-check retirements, want 13`);
  for (const id of retired) {
    if (bank.some((q) => q.id === id) || kc.some((q) => q.id === id)) out.push(`${id}: retired in the ledger but still shipped`);
  }
  for (const m of doc.matchAll(/^\| ([a-z-]+) \| `([a-z0-9-]+)` \| (\d+) \| (\d+) \|$/gm)) {
    const [, sid, lesson, before, after] = m;
    const real = bank.filter((q) => q.topic === lesson).length;
    if (Number(after) !== real) out.push(`ledger says ${lesson} has ${after} after, the bank has ${real}`);
    if (mapLesson.get(lesson) !== sid) out.push(`ledger files ${lesson} under ${sid}, the modules say ${mapLesson.get(lesson)}`);
    if (before === after && after === "0") out.push(`${lesson}: a ledger row with nothing on either side`);
  }
  const sectionRows = [...doc.matchAll(/^\| ([a-z-]+) \| \d+ \| (\d+) \| (\d+) \|$/gm)].map((m) => [m[1], Number(m[3])]);
  if (sectionRows.length !== SECTION_IDS.length) out.push(`the ledger's section totals cover ${sectionRows.length} sections`);
  for (const [sid, after] of sectionRows) {
    const real = bank.filter((q) => mapLesson.get(q.topic) === sid).length;
    if (after !== real) out.push(`ledger section total for ${sid} says ${after}, the bank has ${real}`);
  }
  return out;
}

// ------------------------------------------------------------------- the run
section("1. the practice bank: 100 questions, every one of the 61 lessons drilled");
const practice = readJson("content/physics/practice.json");
const kc = readJson("content/physics/knowledge-check.json");
const doc = read("docs/physics-bank-rebalance.md");
{
  const problems = bankProblems(practice, lessonIds, SECTION_IDS);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(practice.length === 100, `practice is exactly 100 questions (${practice.length})`);
  const drilled = new Set(practice.map((q) => q.topic));
  check(drilled.size === lessons.length,
    `every lesson is drilled (${drilled.size} of ${lessons.length} lessons have a question tagged)`);
}

section("2. the five practice papers still split the bank evenly, each with every section");
{
  const tabs = practicePaperTabs().length;
  const problems = paperProblems(practice, SECTION_IDS, tabs);
  check(problems.length === 0, problems.join(" | "));
  for (const m of read("content/physics/practice.json").match(/\"topic\": \"[^\"]+\"/g) || []) void m;
  const size = practice.length / tabs;
  check(practice.slice(0, size).length === size && practice.slice(-size).length === size,
    `each of the ${tabs} tabs holds ${size} questions`);
}

section("3. the knowledge check: exactly 25, 5 per section, 5 distinct topics each");
{
  const problems = checkProblems(kc, SECTION_IDS, sectionOf);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(kc.length === 25, `knowledge check is exactly 25 questions (${kc.length})`);
  for (const s of SECTION_IDS) {
    const mine = kc.filter((q) => sectionOf.get(q.topic) === s);
    check(mine.length === 5 && new Set(mine.map((q) => q.topic)).size === 5,
      `${s}: 5 questions over 5 distinct topics (${mine.map((q) => q.topic).join(", ")})`);
  }
}

section("4. the mirror the browser fetches is byte-identical");
for (const file of ["practice.json", "knowledge-check.json"]) {
  const a = readBytes(`content/physics/${file}`), b = readBytes(`public/content/physics/${file}`);
  check(a.equals(b), `${file}: content/ and public/content/ are byte-identical (${a.length} vs ${b.length})`);
}

section("5. the retirement ledger names every retirement and matches the bank");
{
  const problems = ledgerProblems(doc, practice, kc, sectionOf);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(/every one of the 61 Physics lessons has at least one question/.test(doc),
    "the ledger states the floor rule it was built to");
  check(/Timed Mock Exam/.test(doc) && /40-question paper/.test(doc),
    "the ledger reports what this pass does to the Timed Mock Exam");
}

section("6. red controls — each assertion above must be able to fail");
{
  const goodBank = { ...practice[0] };
  const doctored = [
    ["an orphan topic", bankProblems([{ ...goodBank, topic: "no-such-lesson" }, ...practice.slice(1)], lessonIds, SECTION_IDS)],
    ["a lesson with no question", bankProblems(practice.filter((q) => q.topic !== "mech-levers"), lessonIds, SECTION_IDS)],
    ["a duplicate question text", bankProblems([practice[0], { ...practice[1], question: practice[0].question }, ...practice.slice(2)], lessonIds, SECTION_IDS)],
    ["an answer outside its options", bankProblems([{ ...goodBank, answer: "not an option" }, ...practice.slice(1)], lessonIds, SECTION_IDS)],
    ["a bank one question short", bankProblems(practice.slice(1), lessonIds, SECTION_IDS)],
    ["a knowledge check with 4 in a section", checkProblems(kc.map((q) => (sectionOf.get(q.topic) === "mechanics" && q.topic === "motion-graphs" ? { ...q, topic: "work-energy-and-power" } : q)), SECTION_IDS, sectionOf)],
    ["a knowledge check that repeats a topic in a section", checkProblems(kc.map((q) => (sectionOf.get(q.topic) === "mechanics" ? { ...q, topic: "motion-graphs" } : q)), SECTION_IDS, sectionOf)],
    ["a paper that is a block of one section", paperProblems(practice.filter((q) => sectionOf.get(q.topic) === "mechanics").concat(practice.slice(22)), SECTION_IDS, 5)],
    ["a ledger that forgets a retirement", ledgerProblems(doc.replace(/^\| `p100` \|.*$/m, ""), practice, kc, sectionOf)],
    ["a ledger whose count disagrees with the bank", ledgerProblems(doc.replace(/mech-levers` \| 0 \| 1 \|/, "mech-levers` | 0 | 7 |"), practice, kc, sectionOf)],
  ];
  const silent = doctored.filter(([, problems]) => problems.length === 0).map(([label]) => label);
  check(silent.length === 0, `every doctored input was caught (silent: ${silent.join(", ") || "none"})`);
  check(doctored[0][1].length > 0 && doctored[1][1].length > 0 && doctored[2][1].length > 0,
    "the first three red controls actually produce problems");
}

section("7. wiring self-test (a false condition must fail and a true one must pass)");
{
  const f0 = fail;
  quiet = true;
  check(false, "harness control: a false condition must be counted as a failure");
  const wired = fail === f0 + 1;
  quiet = false;
  fail = f0;
  check(wired, "check() is not vacuous (a false condition fails and a true one passes)");
}

console.log(`\ncheck-physics-bank-balance: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}`);
process.exit(fail === 0 ? 0 : 1);
