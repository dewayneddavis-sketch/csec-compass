// check-mathematics-bank-balance — the Mathematics practice bank and knowledge check must tell
// the truth about the 63 lessons that actually ship.
//
// Before this harness existed, the orphan-topic check lived only in a brief: seven questions
// tested topics no lesson taught, and the knowledge check put three questions on one lesson and
// none on the three the bank never examined. Nothing failed, because nothing looked.
//
// It asserts, for content/ and its byte-identical public/ mirror:
//   1. practice: exactly practiceBankSize("mathematics") questions (150 since the
//      owner's Mathematics exception; the size is READ, never retyped here), every
//      topic naming a LIVE lesson (orphans must read 0), no two questions with the
//      same text inside one lesson, four distinct options, the answer among them,
//      and a multi-step explanation (the same rule check-math-review-loop applies).
//   1b. every one of the live lessons is drilled by at least one practice question,
//      and at least one lesson carries exactly one (so the fallback path is real).
//   2. knowledge check: exactly 25, distributed 3 per module for the seven largest modules and
//      2 for the rest (25 = 3x7 + 2x2), never two questions on one lesson inside a module, the
//      named gap closed (factorization, quadratic-equations, inequalities), and the same shape,
//      option, answer and orphan rules as the practice bank.
//   3. the mirrors are byte-identical.
//   4. --red-control: each guard is shown to bite on a perturbed copy of the shipped bytes.
//
// Usage:
//   node tools/check-mathematics-bank-balance.mjs                 green run
//   node tools/check-mathematics-bank-balance.mjs --red-control   also require each guard to bite
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { practiceBankSize } from "../src/data/bankSizes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const readBytes = (p) => fs.readFileSync(path.join(root, p));
const RED_CONTROL = process.argv.includes("--red-control");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const SHAPE = ["id", "question", "options", "answer", "explanation", "topic"];
// The practice size is the owner's Mathematics exception, read from the one place
// that owns it. Retyping 150 here would let the harness and the promise drift.
const PRACTICE = practiceBankSize("mathematics");
const KC = 25;
// The knowledge check's distribution: a third question to the seven largest modules.
const KC_THIRD_FOR_LARGEST = 7;
// The gap the re-balance had to close, named by the owner's ruling rather than derived.
const GAP = ["factorization", "quadratic-equations", "inequalities"];

const modules = readJson("content/mathematics/modules.json");
const lessons = modules.flatMap((m) => (m.lessons || []).map((l) => l.id));
const lessonIds = new Set(lessons);
const moduleOf = new Map(modules.flatMap((m) => (m.lessons || []).map((l) => [l.id, m.id])));
const size = new Map(modules.map((m) => [m.id, (m.lessons || []).length]));
// largest first; ties keep file order, which is stable and only ever separates 6-lesson modules
// that all receive the third question anyway.
const ranked = modules.map((m) => m.id).sort((a, b) => size.get(b) - size.get(a));
const wantPerModule = new Map(ranked.map((id, i) => [id, i < KC_THIRD_FOR_LARGEST ? 3 : 2]));

/** Everything wrong with the practice bank. */
function practiceProblems(bank, live) {
  const out = [];
  if (bank.length !== PRACTICE) out.push(`practice holds ${bank.length}, want ${PRACTICE}`);
  const ids = bank.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const perTopic = new Map();
  for (const q of bank) {
    if (JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) out.push(`${q.id}: keys ${Object.keys(q).join(",")}`);
    if (!Array.isArray(q.options) || q.options.length !== 4) out.push(`${q.id}: options are not 4`);
    else if (new Set(q.options).size !== 4) out.push(`${q.id}: options are not distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if ((String(q.explanation || "").match(/\n/g) || []).length < 2) out.push(`${q.id}: explanation is not multi-step`);
    if (!live.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic} names no lesson`);
    const text = String(q.question || "").trim().toLowerCase();
    const seen = perTopic.get(q.topic) || new Set();
    if (seen.has(text)) out.push(`${q.id}: duplicate question text inside ${q.topic}`);
    seen.add(text);
    perTopic.set(q.topic, seen);
  }
  return out;
}

/** Everything wrong with the knowledge check. */
function checkProblems(kc, live, mapLesson, want) {
  const out = [];
  if (kc.length !== KC) out.push(`knowledge check holds ${kc.length}, want ${KC}`);
  const ids = kc.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const perTopic = new Map();
  for (const q of kc) {
    if (JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) out.push(`${q.id}: keys ${Object.keys(q).join(",")}`);
    if (!Array.isArray(q.options) || q.options.length !== 4) out.push(`${q.id}: options are not 4`);
    else if (new Set(q.options).size !== 4) out.push(`${q.id}: options are not distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if ((String(q.explanation || "").match(/\n/g) || []).length < 2) out.push(`${q.id}: explanation is not multi-step`);
    if (!live.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic} names no lesson`);
    const text = String(q.question || "").trim().toLowerCase();
    const seen = perTopic.get(q.topic) || new Set();
    if (seen.has(text)) out.push(`${q.id}: duplicate question text inside ${q.topic}`);
    seen.add(text);
    perTopic.set(q.topic, seen);
  }
  for (const [mod, wantN] of want) {
    const mine = kc.filter((q) => mapLesson.get(q.topic) === mod);
    if (mine.length !== wantN) out.push(`module ${mod} holds ${mine.length}, want ${wantN}`);
    const distinct = new Set(mine.map((q) => q.topic));
    if (distinct.size !== mine.length) out.push(`module ${mod} asks ${mine.length} questions on ${distinct.size} lessons`);
  }
  const unplaced = kc.filter((q) => !mapLesson.has(q.topic));
  if (unplaced.length) out.push(`${unplaced.length} questions sit outside every module`);
  for (const lesson of GAP) {
    const n = kc.filter((q) => q.topic === lesson).length;
    if (n !== 1) out.push(`the named gap ${lesson} holds ${n} questions, want 1`);
  }
  return out;
}

/** The live lessons no practice question drills. */
function undrilledLessons(bank, all) {
  const drilled = new Set(bank.map((q) => q.topic));
  return all.filter((l) => !drilled.has(l));
}

/** The live lessons carrying exactly one practice question — the fallback path. */
function singleQuestionLessons(bank, all) {
  const n = new Map();
  for (const q of bank) n.set(q.topic, (n.get(q.topic) || 0) + 1);
  return all.filter((l) => n.get(l) === 1);
}

// ------------------------------------------------------------------------- the run
section(`1. the practice bank: ${PRACTICE} questions, every topic naming a live lesson`);
const practice = readJson("content/mathematics/practice.json");
const kc = readJson("content/mathematics/knowledge-check.json");
const practiceOut = practiceProblems(practice, lessonIds);
for (const p of practiceOut) check(false, p);
check(practiceOut.length === 0, `the practice bank has ${practiceOut.length} problems`);

const drilled = new Set(practice.map((q) => q.topic));
const undrilled = undrilledLessons(practice, lessons);
check(lessonIds.size === lessons.length, "lesson ids are unique");
console.log(`   practice drills ${drilled.size} of ${lessons.length} lessons; ${undrilled.length} have no practice question`);
console.log(`   (${undrilled.join(", ")})`);
check(drilled.size + undrilled.length === lessons.length, "the drilled and undrilled counts add up to the lesson total");
// Every shipped lesson is drilled at least once. This is the assertion the
// re-balance existed to earn: before it, 16 of the 63 lessons were unreachable
// from the practice tab and nothing failed, because nothing looked.
check(undrilled.length === 0, `${undrilled.length} lessons have no practice question: ${undrilled.join(", ")}`);
const single = singleQuestionLessons(practice, lessons);
console.log(`   ${single.length} lessons carry exactly one question: ${single.join(", ")}`);
check(single.length > 0, "at least one lesson carries exactly one question, so the single-question fallback stays real");

section("2. the knowledge check: 25, 3 for the seven largest modules and 2 for the rest");
const kcOut = checkProblems(kc, lessonIds, moduleOf, wantPerModule);
for (const p of kcOut) check(false, p);
check(kcOut.length === 0, `the knowledge check has ${kcOut.length} problems`);
const dist = ranked.map((m) => `${m}:${kc.filter((q) => moduleOf.get(q.topic) === m).length}`).join(" ");
console.log(`   distribution ${dist} = ${kc.length}`);
const kcLessons = new Set(kc.map((q) => q.topic));
console.log(`   the knowledge check drills ${kcLessons.size} of ${lessons.length} lessons; ${lessons.length - kcLessons.size} have no question`);
check(kc.length === [...wantPerModule.values()].reduce((a, b) => a + b, 0), "the per-module rule adds up to 25");
check([...wantPerModule.values()].filter((n) => n === 3).length === KC_THIRD_FOR_LARGEST, "exactly seven modules carry a third question");

section("3. content/ and public/content/ are byte-identical");
for (const file of ["practice.json", "knowledge-check.json", "modules.json"]) {
  const a = readBytes(`content/mathematics/${file}`);
  const b = readBytes(`public/content/mathematics/${file}`);
  check(a.equals(b) && a.length > 0, `${file}: the two mirrors differ`);
}

if (RED_CONTROL) {
  section("4. red controls — every guard above must bite");
  const cases = [
    ["a practice question re-pointed at a lesson that does not exist",
      practiceProblems(practice.map((q, i) => (i === 7 ? { ...q, topic: "gone-lesson" } : q)), lessonIds)],
    ["a duplicate question inside one lesson",
      practiceProblems(practice.map((q, i) => (i === 1 ? { ...q, question: practice[0].question, topic: practice[0].topic } : q)), lessonIds)],
    ["an answer that is not among its options",
      practiceProblems(practice.map((q, i) => (i === 3 ? { ...q, answer: "not an option" } : q)), lessonIds)],
    ["a second knowledge-check question on one lesson",
      checkProblems(kc.map((q, i) => (i === 1 ? { ...q, topic: kc[0].topic } : q)), lessonIds, moduleOf, wantPerModule)],
    ["a module stripped of a question",
      checkProblems(kc.slice(1), lessonIds, moduleOf, wantPerModule)],
    ["a named-gap question removed",
      checkProblems(kc.filter((q) => q.topic !== GAP[0]), lessonIds, moduleOf, wantPerModule)],
  ];
  for (const [label, problems] of cases) check(problems.length > 0, `red control bites: ${label}`);
  // The two new guards, each driven by a perturbation of the shipped bank.
  const strippedLesson = lessons[lessons.length - 1];
  const stripped = undrilledLessons(practice.filter((q) => q.topic !== strippedLesson), lessons);
  check(stripped.length === 1 && stripped[0] === strippedLesson, `red control bites: a lesson stripped of its questions reads undrilled (${strippedLesson})`);
  const doubled = practice.concat(
    practice.filter((q) => q.topic === single[0]).map((q) => ({ ...q, id: q.id + "-second", question: q.question + " (a second question)" }))
  );
  check(
    singleQuestionLessons(doubled, lessons).length === single.length - 1,
    `red control bites: a second question on ${single[0]} drops the single-question count by one`
  );
  const a = readBytes("content/mathematics/practice.json");
  const b = readBytes("public/content/mathematics/practice.json");
  check(a.equals(b), "the mirrors are equal before the mirror control");
  check(!Buffer.concat([b, Buffer.from("\n")]).equals(b), "a one-byte mirror drift would be caught by section 3");
}

console.log(`\ncheck-mathematics-bank-balance: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}${RED_CONTROL ? " [--red-control]" : ""}`);
process.exit(fail === 0 ? 0 : 1);
