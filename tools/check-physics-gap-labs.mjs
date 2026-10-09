#!/usr/bin/env node
// Harness: the 8 Physics syllabus-gap lessons each get their OWN Play-tab lab.
//
// The engineer gate failed PR #143 partly because the new lessons' `experiment`
// promised lab types the platform does not have ("text-sort" /
// "worked-walkthrough") and lessonSets.js had no entry for any of the 8 ids, so
// the Play tab could not render them. This guards all three halves:
//   1. every new lesson has exactly one well-formed set in lessonSets.physics,
//   2. every string that set displays is taught by that lesson's own copy
//      (title/content/objectives/concepts) - a lab may not invent vocabulary,
//   3. the ExperimentSandbox physics branch resolves lessonId BEFORE its
//      experiment-type library, so the older lessons keep their type-based labs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const modules = JSON.parse(read("content/physics/modules.json"));
const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const GAP_LESSONS = [
  "forces-and-newtons-laws", "work-energy-and-power", "fluid-pressure-and-upthrust",
  "specific-and-latent-heat", "reflection-and-total-internal-reflection",
  "sound-and-the-em-spectrum", "magnetism-and-electromagnetism", "electrical-power-and-safety",
];
const OLDER_LESSONS = [
  "scalars-vectors", "motion-graphs", "temperature-heat", "gas-laws",
  "wave-properties", "light-refraction", "electric-circuits", "radioactivity",
];
const byId = Object.fromEntries(allLessons.map((l) => [l.id, l]));
// Folding: case, curly quotes/dashes, whitespace. Deliberately generous so a
// legitimately worded label is not failed on punctuation alone.
const fold = (s) => String(s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();
const corpusOf = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \n "));

section("1. every new lesson has its own lab set");
const sets = lessonSets.physics || {};
for (const id of GAP_LESSONS) check(!!sets[id], `${id}: has a lessonSets.physics entry`);
check(Object.keys(sets).length === GAP_LESSONS.length,
  `no stray physics sets (${Object.keys(sets).length} keys for ${GAP_LESSONS.length} new lessons)`);
const lessonIds = new Set(allLessons.map((l) => l.id));
for (const id of GAP_LESSONS) check(lessonIds.has(id), `${id}: is a real lesson id in modules.json`);
check(allLessons.length === GAP_LESSONS.length + OLDER_LESSONS.length,
  `physics has ${GAP_LESSONS.length + OLDER_LESSONS.length} lessons (${allLessons.length})`);

section("2. every set is well formed and headed by its own lesson title");
for (const [id, set] of Object.entries(sets)) {
  const where = `lessonSets.physics.${id}`;
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
    check(corpus.includes(fold(s)), `lessonSets.physics.${id}: "${s}" appears in the lesson's own copy`);
  }
  check(!!byId[id].experiment && !!byId[id].experiment.type,
    `${id}: the lesson declares an experiment type`);
  check(!/^Subject|^Lab$/i.test(String(set.title).trim()), `${id}: title names the lesson topic`);
}

section("4. the older physics lessons keep resolving by experiment type");
for (const id of OLDER_LESSONS) {
  check(!sets[id], `${id}: untouched (no per-lesson set, so its type library still applies)`);
}

section("5. routing: lessonId resolves before the experiment-type library");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const physBranch = sandbox.slice(sandbox.indexOf('if (subjectId === "physics")'),
                                  sandbox.indexOf('if (subjectId === "mathematics")'));
const perLesson = physBranch.indexOf('lessonSets["physics"] && lessonSets["physics"][lessonId]');
const byType = physBranch.indexOf("PHYS_DRAG_TYPES.has(t)");
check(perLesson !== -1, "the physics branch consults lessonSets.physics");
check(byType !== -1, "the physics branch still has its experiment-type library");
check(perLesson !== -1 && byType !== -1 && perLesson < byType,
  "the per-lesson set is checked BEFORE the experiment-type library");
check(/if \(lessonId && lessonSets\["physics"\]/.test(physBranch),
  "the per-lesson branch is guarded by lessonId (subject-page labs keep their own deck)");
check(/lessonId=\{lessonId\}/.test(physBranch.slice(perLesson, perLesson + 240)),
  "the per-lesson branch passes lessonId through to DragDropLabel");
check(physBranch.includes('return <CircuitBuilder />'),
  "electric-circuits keeps its CircuitBuilder tool");

console.log(`\ncheck-physics-gap-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
