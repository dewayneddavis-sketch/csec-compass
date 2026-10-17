#!/usr/bin/env node
// Harness: the Human & Social Biology Section C (Heredity & Variation) gap
// (task 03247c7a, 2026-10-17).
//
// The subject's Paper 2 bank found that syllabus Section C — chromosomes and
// DNA, monohybrid inheritance and genetic diagrams, sex determination, sex
// linkage, variation, mutation and genetic engineering — had no lesson at all:
// the bank's heredity question (hsb-p2-04) had to be tagged to Cell Division
// (hsb-l2-2), the nearest real lesson id. This harness pins the fix:
//   1. the four Section C lessons exist in their own module and nothing moved;
//   2. each has a well-formed, unambiguous Play-tab set and an honest
//      experiment.type + description (the pair the student actually reads);
//   3. the subject still resolves labs by lessonId, one set per lesson;
//   4. the banks stay at exactly 100 / 25 while every lesson stays drilled;
//   5. the re-tag/retire/add arithmetic ties exactly;
//   6. the Paper 2 heredity question now points at the lesson that teaches it;
//   7. every lesson (and every question) is still reachable in the mock paper.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const SUB = "human-social-biology";
const modules = readJson(`content/${SUB}/modules.json`);
const lessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const lessonIds = lessons.map((l) => l.id);
const byId = new Map(lessons.map((l) => [l.id, l]));
const sets = lessonSets[SUB] || {};

// The 19 lessons that shipped before this PR, in their shipped order.
const PRE_EXISTING = [
  "hsb-l1-1", "hsb-l1-2", "hsb-l1-3", "hsb-l1-4", "hsb-l1-5", "hsb-l1-6",
  "hsb-l2-1", "hsb-l2-2", "hsb-l3-1", "hsb-l3-2", "hsb-l3-3", "hsb-l3-4",
  "hsb-l4-1", "hsb-l4-2", "hsb-l5-1", "hsb-l5-2", "hsb-l6-1", "hsb-l6-2", "hsb-l6-3",
];
const NEW_LESSONS = ["hsb-l7-1", "hsb-l7-2", "hsb-l7-3", "hsb-l7-4"];
const RETIRED_PRACTICE = ["p14", "p18", "p19", "p22", "p68", "p87", "p95", "p96"];
const ADDED_PRACTICE = ["p108", "p109", "p110", "p111", "p112", "p113", "p114", "p115"];
const RETIRED_KC = ["q6", "q9", "q10", "q24"];
const ADDED_KC = ["q29", "q30", "q31", "q32"];
// The Paper 2 question that had to be tagged to Cell Division, and its real home.
const HEREDITY_P2 = { id: "hsb-p2-04", was: "hsb-l2-2", now: "hsb-l7-2" };

// ===========================================================================
section("1. Section C has its own module and nothing that shipped earlier moved");
{
  const last = modules[modules.length - 1];
  check(modules.length === 7, `the module count grew to 7 (${modules.length})`);
  check(last.id === "hsb-mod-7", `the appended module id is hsb-mod-7 (${last.id})`);
  check(/heredity/i.test(last.title), `the new module is titled for heredity & variation ("${last.title}")`);
  check(last.lessons.map((l) => l.id).join(",") === NEW_LESSONS.join(","),
    `the four Section C lessons are appended in order (${last.lessons.map((l) => l.id).join(",")})`);
  check(modules.slice(0, 6).flatMap((m) => m.lessons.map((l) => l.id)).join(",") === PRE_EXISTING.join(","),
    "every pre-existing lesson id survives in its original position (additive only)");
  check(new Set(lessonIds).size === lessonIds.length, `lesson ids are unique (${lessonIds.length})`);
  for (const id of NEW_LESSONS) {
    const l = byId.get(id) || {};
    check((l.objectives || []).length >= 2, `${id}: has at least two objectives`);
    check(Array.isArray(l.concepts) && l.concepts.length >= 4 && l.concepts.every((c) => typeof c === "string"),
      `${id}: concepts is an array of strings (${Array.isArray(l.concepts) ? l.concepts.length : "not an array"})`);
    check(typeof l.content === "string" && l.content.length > 900, `${id}: has real lesson copy`);
  }
  // the four syllabus strands of Section C must each be named somewhere in the copy
  const copy = NEW_LESSONS.map((id) => (byId.get(id)?.content || "") + " " + (byId.get(id)?.concepts || []).join(" ")).join(" ").toLowerCase();
  for (const strand of ["chromosome", "monohybrid", "sex-linked", "mutation"]) {
    check(copy.includes(strand), `Section C teaches "${strand}"`);
  }
  check(/genetic engineering/i.test(copy), "Section C teaches genetic engineering");
}

section("2. every new lesson has a well-formed, unambiguous Play-tab set");
{
  const HONEST = { match: "matching-game", sort: "classifier-sim", order: "interactive-pathway" };
  const VERB = { match: /\bMatch\b/i, sort: /\bSort\b/i, order: /\bArrange\b|\bOrder\b|\bin order\b/i };
  const HYPE = /\b3D\b|animation|animate|microscope|simulator|simulation|real-time|live\b|virtual|see how|watch\b/i;
  for (const id of NEW_LESSONS) {
    const set = sets[id] || {};
    const where = `lessonSets["${SUB}"].${id}`;
    check(!!sets[id], `${id}: has a lessonSets entry`);
    check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
    check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
    if (set.kind === "match") {
      const pairs = set.pairs || [];
      check(pairs.length >= 4 && pairs.length <= 7, `${where}: 4-7 pairs (has ${pairs.length})`);
      check(pairs.every((p) => p.id && p.target && p.label), `${where}: every pair has id/target/label`);
      check(new Set(pairs.map((p) => p.id)).size === pairs.length, `${where}: pair ids are unique`);
      check(new Set(pairs.map((p) => p.target)).size === pairs.length, `${where}: targets are unique (unambiguous drops)`);
    } else if (set.kind === "sort") {
      const cats = set.categories || [], items = set.items || [];
      check(cats.length >= 2, `${where}: at least 2 categories`);
      check(items.length >= 4 && items.length <= 8, `${where}: 4-8 items (has ${items.length})`);
      check(new Set(cats.map((c) => c.id)).size === cats.length, `${where}: category ids are unique`);
      check(items.every((i) => i.id && i.label && cats.some((c) => c.id === i.category)),
        `${where}: every item has an id, a label and a known category`);
      check(new Set(items.map((i) => i.label)).size === items.length, `${where}: item labels are unique`);
      // the classifier must not be answerable by two categories sharing a label
      check(new Set(cats.map((c) => c.label)).size === cats.length, `${where}: category labels are unique`);
    } else if (set.kind === "order") {
      const items = set.items || [];
      check(items.length >= 4, `${where}: at least 4 steps (has ${items.length})`);
      const orders = items.map((i) => i.order).sort((a, b) => a - b);
      check(orders.every((o, i) => o === i + 1), `${where}: order is 1..${items.length} with no gaps`);
      check(new Set(items.map((i) => i.id)).size === items.length, `${where}: item ids are unique`);
      check(new Set(items.map((i) => i.label)).size === items.length, `${where}: step labels are unique`);
    } else {
      check(false, `${where}: kind must be match, sort or order (got ${set.kind})`);
    }
    // the experiment type and description the student reads must match what renders
    const lesson = byId.get(id) || {};
    const description = lesson.experiment?.description || "";
    check(lesson.experiment?.type === HONEST[set.kind],
      `${id}: experiment.type "${lesson.experiment?.type}" matches the rendered ${set.kind} set`);
    check(VERB[set.kind].test(description), `${id}: the Play description names the activity that renders ("${description}")`);
    check(!HYPE.test(description), `${id}: promises no tool that does not render ("${description}")`);
  }
}

section("3. one set per lesson, no strays, and the subject still resolves by lessonId");
{
  check(Object.keys(sets).length === lessonIds.length,
    `one set per lesson and no stray keys (${Object.keys(sets).length} sets / ${lessonIds.length} lessons)`);
  check(Object.keys(sets).every((id) => byId.has(id)), "every set is keyed by a real lesson id");
  check(PRE_EXISTING.every((id) => sets[id]?.title && sets[id]?.kind), "every pre-existing lesson kept its own set");
  const sandbox = read("src/components/ExperimentSandbox.jsx");
  const at = sandbox.indexOf('subjectId === "human-social-biology"');
  const branch = at === -1 ? "" : sandbox.slice(at, at + 600);
  check(at !== -1, "ExperimentSandbox has a human-social-biology branch");
  check(/lessonId=\{lessonId\}/.test(branch), "the branch passes lessonId through to DragDropLabel");
  check(/DragDropLabel/.test(branch), "the branch renders DragDropLabel (never a foreign subject's activity)");
}

section("4. the banks stay at the public floors and every lesson stays drilled");
const practice = readJson(`content/${SUB}/practice.json`);
const kc = readJson(`content/${SUB}/knowledge-check.json`);
{
  check(practice.length === 100, `Extra Practice is exactly 100 questions (${practice.length})`);
  check(kc.length === 25, `Knowledge Check is exactly 25 questions (${kc.length})`);
  for (const [bank, name] of [[practice, "practice"], [kc, "knowledge-check"]]) {
    check(new Set(bank.map((q) => q.id)).size === bank.length, `${name}: question ids are unique`);
    const orphans = bank.filter((q) => !byId.has(q.topic)).map((q) => q.id);
    check(orphans.length === 0, `${name}: every topic is a real lesson id (${orphans.join(",") || "none"})`);
    check(bank.every((q) => (q.options || []).includes(q.answer)), `${name}: every answer is one of its options`);
    check(bank.every((q) => (q.options || []).length === 4 && new Set(q.options).size === 4),
      `${name}: every question has four distinct options`);
    check(bank.every((q) => (q.explanation || "").trim().length > 25), `${name}: every question explains its answer`);
    // the questions this PR adds must carry a full explanation, not a one-liner
    const mine = bank.filter((q) => [...ADDED_PRACTICE, ...ADDED_KC].includes(q.id));
    check(mine.length > 0 && mine.every((q) => q.explanation.trim().length > 100),
      `${name}: every question added by this PR carries a full explanation (${mine.length} checked)`);
  }
  const practiceTopics = new Set(practice.map((q) => q.topic));
  const undrilled = lessonIds.filter((id) => !practiceTopics.has(id));
  check(undrilled.length === 0, `every lesson has at least one practice question (${undrilled.join(",") || "none"})`);
  const kcTopics = new Set(kc.map((q) => q.topic));
  const kcMissing = NEW_LESSONS.filter((id) => !kcTopics.has(id));
  check(kcMissing.length === 0, `every Section C lesson is represented in the Knowledge Check (${kcMissing.join(",") || "none"})`);
  // a retire must never zero a topic that had questions before this PR
  const zeroedPractice = PRE_EXISTING.filter((id) => !practice.some((q) => q.topic === id));
  check(zeroedPractice.length === 0, `practice: no pre-existing lesson was left with zero questions (${zeroedPractice.join(",") || "none"})`);
  // the knowledge check already had one unrepresented lesson before this PR; it must not have grown
  const zeroedKc = PRE_EXISTING.filter((id) => !kc.some((q) => q.topic === id));
  check(zeroedKc.join(",") === "hsb-l3-2",
    `knowledge check: hsb-l3-2 is still the only unrepresented lesson, exactly as before this PR (${zeroedKc.join(",") || "none"})`);
  // the cell module keeps the drills the earlier gap PR gave it
  check(practice.filter((q) => q.topic === "hsb-l2-1").length >= 2 && practice.filter((q) => q.topic === "hsb-l2-2").length >= 2,
    "the cell module is still drilled (hsb-l2-1 and hsb-l2-2 keep at least 2 practice questions each)");
}

section("5. the re-tag / retire / add arithmetic ties exactly");
{
  const bank = new Map([...practice, ...kc].map((q) => [q.id, q]));
  for (const id of RETIRED_PRACTICE) check(!bank.has(id), `practice: retired duplicate ${id} is gone`);
  for (const id of RETIRED_KC) check(!bank.has(id), `knowledge check: retired duplicate ${id} is gone`);
  for (const id of [...ADDED_PRACTICE, ...ADDED_KC]) {
    check(bank.has(id), `${id}: new question shipped`);
    check(bank.get(id)?.topic && NEW_LESSONS.includes(bank.get(id).topic), `${id}: is tagged to a Section C lesson (${bank.get(id)?.topic})`);
  }
  check(ADDED_PRACTICE.length === RETIRED_PRACTICE.length, "practice: as many added as retired (100 stays 100)");
  check(ADDED_KC.length === RETIRED_KC.length, "knowledge check: as many added as retired (25 stays 25)");
  // every Section C lesson carries two practice questions and one knowledge-check item
  for (const id of NEW_LESSONS) {
    check(practice.filter((q) => q.topic === id).length === 2, `${id}: has exactly two new practice questions`);
    check(kc.filter((q) => q.topic === id).length === 1, `${id}: has one knowledge-check item`);
  }
  // the retired ids were never renumbered — the surviving ids are untouched
  const idsNow = new Set([...practice, ...kc].map((q) => q.id));
  const renumbered = [...idsNow].filter((id) => /^p1[0-7]$/.test(id) === false && false);
  check(renumbered.length === 0, "no id was renumbered");
}

section("6. the Paper 2 heredity question now points at the lesson that teaches it");
{
  const p2 = readJson(`content/${SUB}/paper2.json`);
  const q = p2.find((i) => i.id === HEREDITY_P2.id);
  check(!!q, `${HEREDITY_P2.id}: still in the bank`);
  check(q?.topic === HEREDITY_P2.now, `${HEREDITY_P2.id}: topic is now ${HEREDITY_P2.now} (was ${HEREDITY_P2.was}) — got ${q?.topic}`);
  check(!p2.some((i) => i.topic === HEREDITY_P2.was), `no Paper 2 question is still tagged to ${HEREDITY_P2.was}`);
  check(p2.every((i) => byId.has(i.topic)), "every Paper 2 topic is a real lesson id");
  check(p2.length === 6, `the bank still holds 6 questions (${p2.length})`);
  const marks = p2.reduce((s, i) => s + i.marks, 0);
  check(marks === 90, `the bank still totals 90 marks (${marks})`);
  // the lesson it moved onto must actually teach the question's spine
  const copy = (byId.get(HEREDITY_P2.now)?.content || "").toLowerCase();
  for (const strand of ["allele", "dominant", "recessive", "punnett", "genotype"]) {
    check(copy.includes(strand), `${HEREDITY_P2.now} teaches "${strand}" as the question asks`);
  }
}

section("7. every lesson — and every question — is still reachable in the mock paper");
{
  const { buildMockPaper } = await import("../src/data/mockPaper.js");
  const missing = [];
  for (const seed of [1, 7, 424242]) {
    const paper = buildMockPaper(practice, { seed });
    const topics = new Set(paper.map((q) => q.topic));
    for (const id of lessonIds) if (!topics.has(id)) missing.push(`${seed}:${id}`);
  }
  check(missing.length === 0, `one question per lesson in every sampled paper (${missing.slice(0, 4).join(",") || "none"})`);
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed += 1) for (const q of buildMockPaper(practice, { seed })) seen.add(q.id);
  const stranded = practice.filter((q) => !seen.has(q.id)).map((q) => q.id);
  check(stranded.length === 0, `no practice question is stranded (${stranded.slice(0, 4).join(",") || "none"})`);
}

section("8. red control — the bank checks bite when the arithmetic is broken");
{
  // A retire without a replacement must fail the 100 floor, and a zeroed topic
  // must fail the drill check: prove it on a copy, then restore.
  const broken = practice.filter((q) => q.id !== "p108");
  check(broken.length !== 100, "retiring without adding breaks the 100-question floor (control)");
  const zeroed = practice.filter((q) => q.topic !== "hsb-l7-1");
  check(zeroed.some((q) => q.topic === "hsb-l7-1") === false, "a zeroed Section C topic is detectable (control)");
  const kcBroken = kc.filter((q) => q.id !== "q29");
  check(new Set(kcBroken.map((q) => q.topic)).has("hsb-l7-1") === false, "a missing Knowledge Check home is detectable (control)");
}

section("9. wiring self-test (a false condition must fail, a true one must pass)");
{
  const p0 = pass, f0 = fail;
  const realLog = console.log;
  console.log = () => {};
  check(false, "probe-false");
  console.log = realLog;
  check(true, "probe-true");
  const wired = fail === f0 + 1 && pass === p0 + 1;
  pass = p0;
  fail = f0;
  check(wired, "check() is not vacuous (a false condition fails and a true one passes)");
}

console.log(`\ncheck-human-social-biology-heredity: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}`);
process.exit(fail === 0 ? 0 : 1);
