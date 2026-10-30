#!/usr/bin/env node
// Harness: every Chemistry lesson added by the coverage build carries its own
// topic-matched Play-tab lab set, and the nine pre-existing lessons keep their
// type-keyed labs.  Guards all three halves:
//   1. every coverage-build lesson has exactly one well-formed set in
//      lessonSets.chemistry,
//   2. every string that set displays is taught by that lesson's own copy
//      (title/content/objectives/concepts) — a lab may not invent vocabulary,
//   3. the ExperimentSandbox chemistry branch resolves lessonId BEFORE its
//      experiment-type library (CHEM_DRAG_TYPES), so the older lessons keep
//      their type-based labs and the new lessons reach their own sets.
//
// The per-lesson sets are NOT a hardcoded list: Sections A (chem-), B (org-)
// and C (inorg-) each add one lab per new topic, so a hardcoded array would go
// stale on every merge.  What this pins instead is the PARTITION of chemistry
// lessons: every lesson is either per-lesson-keyed (carries its own set) or
// type-keyed (one of the nine frozen lessons) — exactly one of the two.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);
const modules = JSON.parse(read("content/chemistry/modules.json"));
const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
// The nine frozen lessons (ids are identity — never renamed/re-keyed/split).
const OLDER_LESSONS = [
  "states-of-matter", "atomic-structure", "periodic-table-trends",
  "ionic-covalent-bonding", "molar-mass-calculations", "ph-scale-indicators",
  "neutralization", "defining-redox", "hydrocarbons-alkanes",
];
const byId = Object.fromEntries(allLessons.map((l) => [l.id, l]));
const fold = (s) => String(s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();
const corpusOf = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \n "));
section("1. every coverage-build lesson has its own lab set");
const sets = lessonSets.chemistry || {};
const setKeys = Object.keys(sets);
const allIds = allLessons.map((l) => l.id);
const lessonIds = new Set(allIds);
const coverageLessonCount = allLessons.length - OLDER_LESSONS.length;
check(setKeys.length === coverageLessonCount,
  `every non-frozen chemistry lesson has its own per-lesson set (${setKeys.length} sets for ${coverageLessonCount} coverage lessons)`);
for (const id of setKeys) check(lessonIds.has(id), `${id}: is a real lesson id in modules.json`);
check(setKeys.every((id) => !OLDER_LESSONS.includes(id)),
  "no type-keyed frozen lesson has a per-lesson set (it would shadow its type library)");
check(JSON.stringify(allIds.slice().sort()) === JSON.stringify(setKeys.concat(OLDER_LESSONS).sort()),
  `every chemistry lesson is covered exactly once (${setKeys.length} per-lesson + ${OLDER_LESSONS.length} type-keyed = ${allLessons.length})`);
section("2. every set is well formed and headed by its own lesson title");
for (const [id, set] of Object.entries(sets)) {
  const where = `lessonSets.chemistry.${id}`;
  check(byId[id] && set.title === byId[id].title, `${where}: title is the lesson's own title`);
  check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
  if (set.kind === "match") {
    const pairs = set.pairs || [];
    check(pairs.length >= 4, `${where}: at least 4 pairs (has ${pairs.length})`);
    check(pairs.every((p) => p.id && p.target && p.label), `${where}: every pair has id/target/label`);
    const ids = pairs.map((p) => p.id), targets = pairs.map((p) => p.target);
    check(new Set(ids).size === ids.length, `${where}: pair ids are unique`);
    check(new Set(targets).size === targets.length, `${where}: targets are unique (unambiguous drops)`);
  } else if (set.kind === "sort") {
    const cats = set.categories || [], items = set.items || [];
    check(cats.length >= 2, `${where}: at least 2 categories`);
    check(items.length >= 4, `${where}: at least 4 items (has ${items.length})`);
    check(cats.every((c) => c.id && c.label), `${where}: every category has id/label`);
    const ids = items.map((i) => i.id);
    check(new Set(ids).size === ids.length, `${where}: item ids are unique`);
    check(cats.every((c) => items.some((i) => i.category === c.id)),
      `${where}: every category has at least one item`);
    check(items.every((i) => i.label && cats.some((c) => c.id === i.category)),
      `${where}: every item has a label and a known category`);
    check(new Set(cats.map((c) => c.id)).size === cats.length, `${where}: category ids are unique`);
  } else {
    check(false, `${where}: kind must be match or sort (got ${set.kind})`);
  }
}
section("3. every displayed string is taught by that lesson");
for (const [id, set] of Object.entries(sets)) {
  const corpus = corpusOf(byId[id]);
  const shown = [];
  if (set.kind === "match") for (const p of set.pairs || []) shown.push(p.label, p.target);
  else {
    for (const c of set.categories || []) shown.push(c.label);
    for (const i of set.items || []) shown.push(i.label);
  }
  for (const s of shown) {
    check(corpus.includes(fold(s)), `lessonSets.chemistry.${id}: "${s}" appears in the lesson's own copy`);
  }
  check(!!byId[id].experiment && !!byId[id].experiment.type,
    `${id}: the lesson declares an experiment type`);
  check(!/^Subject|^Lab$/i.test(String(set.title).trim()), `${id}: title names the lesson topic`);
}
section("4. the nine frozen lessons keep resolving by experiment type");
for (const id of OLDER_LESSONS) {
  check(!sets[id], `${id}: untouched (no per-lesson set, so its type library still applies)`);
}
section("5. routing: lessonId resolves before the experiment-type library");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const chemBranch = sandbox.slice(sandbox.indexOf('if (subjectId === "chemistry")'),
                                  sandbox.indexOf('if (subjectId === "biology")'));
const perLesson = chemBranch.indexOf('lessonSets["chemistry"] && lessonSets["chemistry"][lessonId]');
const byType = chemBranch.indexOf("CHEM_DRAG_TYPES.has(t)");
check(perLesson !== -1, "the chemistry branch consults lessonSets.chemistry");
check(byType !== -1, "the chemistry branch still has its experiment-type library");
check(perLesson !== -1 && byType !== -1 && perLesson < byType,
  "the per-lesson set is checked BEFORE the experiment-type library");
check(/if \(lessonId && lessonSets\["chemistry"\]/.test(chemBranch),
  "the per-lesson branch is guarded by lessonId (subject-page labs keep their own deck)");
check(/lessonId=\{lessonId\}/.test(chemBranch.slice(perLesson, perLesson + 240)),
  "the per-lesson branch passes lessonId through to DragDropLabel");
console.log(`\ncheck-chemistry-gap-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
