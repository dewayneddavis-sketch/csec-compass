#!/usr/bin/env node
// Harness: every English B lesson renders ITS OWN Play-tab lab, and the module/bank/mirror structure
// stays sound as the coverage build adds lessons.
//
// This replaces tools/check-english-b-gap-labs.mjs, which PINNED the shape of the tree (NEW_LESSONS = 6,
// OLDER_LESSONS = 18, modules.length === 7) and therefore reds on at least three checks the moment the
// first new lesson lands. Every assertion below is DERIVED from the tree, so it survives the build; the
// assertion that must never be lost is the first one:
//
//   English B routes EVERY lesson through lessonSets["english-b"][lessonId] (its own ExperimentSandbox
//   branch, before the generic fallback). A lesson with no set does not fall to an honest "lab
//   unavailable" panel — it silently renders subjectSets["english-b"] = "Literature Essentials"
//   (DragDropLabel.jsx), a literature deck that looks entirely plausible on a literature lesson.
//   check-lab-set-ownership.mjs scores that as the subject's own deck and stays green. THIS harness is
//   the only guard, so "one set per lesson, no stray sets" is asserted both ways.
//
// What it pins
//   1. one lab set per lesson in modules.json, and no set keyed to a lesson that does not exist;
//   2. every set is well formed and unambiguous: kind ∈ match/sort/order, 4-7 unique match pairs,
//      4-8 sort items with every category used, >= 4 ordered items numbered 1..n;
//   3. every lesson declares an experiment OBJECT whose type is one of the 8 English B lab types;
//   4. metadata.estimatedModules tracks the real module count (the IT Slice C trap);
//   5. the module list is eb-mod-1..N in order, each module holding at least one lesson;
//   6. the 24 shipped lesson ids keep their original relative order and their set `kind` — id and kind
//      are identity, exactly like a lesson id (a new lesson is APPENDED, never interleaved);
//   7. routing: the english-b branch resolves by lessonId BEFORE the generic lessonSets[subjectId]
//      fallback, and passes lessonId through to DragDropLabel;
//   8. the banks: practice exactly 100, knowledge check exactly 25, every question tagged with a real
//      lesson id, every shipped lesson still drilled, the comparative-essay retag intact, and the 12
//      retired ids still unused;
//   9. content/english-b/* and public/content/english-b/* are byte-identical, file for file.
//
// Usage
//   node tools/check-english-b-labs.mjs                       # the real check
//   node tools/check-english-b-labs.mjs --red-control <name>  # one red control
//   node tools/check-english-b-labs.mjs --red-controls-all    # every red control
//
// A red control mutates the loaded state in memory and MUST make the check fail. In red-control mode the
// exit code is 0 when the mutation was caught and 1 when it slipped through. Nothing is written to disk,
// so the tree is byte-identical after a red-control run.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const SUBJECT = "english-b";
const DIR = `content/${SUBJECT}`;
const MIRROR_DIR = `public/content/${SUBJECT}`;

// The 8 lab types English B uses (ExperimentSandbox.jsx quoted literals / contentLoader experimentTypes).
export const EB_TYPES = ["matching-game", "highlight-tool", "drag-drop", "vocab-flashcards",
  "plot-arranger", "outliner", "sentence-fixer", "interactive-quiz"];

// The 24 ids that shipped before the coverage build, in tree order, and the `kind` each set ships with.
// Both are IDENTITY: a slice may append lessons and sets, never rename, re-key, reorder or re-kind these.
export const FROZEN_ORDER = [
  "eb-l1-1", "eb-l1-2", "eb-l1-3",
  "eb-l2-1", "eb-l2-2", "eb-l2-3",
  "eb-l3-1", "eb-l3-2", "eb-l3-3",
  "eb-l4-1", "eb-l4-2", "eb-l4-3",
  "eb-l5-1", "eb-l5-2", "eb-l5-3",
  "eb-l6-1", "eb-l6-2", "eb-l6-3",
  "eb-l7-1", "eb-l7-2", "eb-l7-3", "eb-l7-4", "eb-l7-5", "eb-l7-6",
];
export const FROZEN_KINDS = {
  "eb-l1-1": "match", "eb-l1-2": "sort", "eb-l1-3": "match",
  "eb-l2-1": "match", "eb-l2-2": "match", "eb-l2-3": "match",
  "eb-l3-1": "sort", "eb-l3-2": "match", "eb-l3-3": "match",
  "eb-l4-1": "order", "eb-l4-2": "match", "eb-l4-3": "match",
  "eb-l5-1": "order", "eb-l5-2": "sort", "eb-l5-3": "sort",
  "eb-l6-1": "order", "eb-l6-2": "match", "eb-l6-3": "match",
  "eb-l7-1": "order", "eb-l7-2": "match", "eb-l7-3": "match",
  "eb-l7-4": "sort", "eb-l7-5": "match", "eb-l7-6": "sort",
};

// Retired bank ids. Never reused, whatever the re-balance does.
export const RETIRED_IDS = ["p6", "p11", "p17", "p24", "p42", "p48",
  "kc1", "kc4", "kc6", "kc9", "kc16", "kc18"];

// ---------------------------------------------------------------------------------------------
// state: everything the checks read, loaded once and mutated by the red controls
function loadState() {
  const files = fs.readdirSync(path.join(root, DIR)).sort();
  const mirrors = {};
  for (const f of files) {
    let mirror = null;
    try { mirror = read(`${MIRROR_DIR}/${f}`); } catch (e) { mirror = null; }
    mirrors[f] = { content: read(`${DIR}/${f}`), mirror };
  }
  return {
    modules: JSON.parse(read(`${DIR}/modules.json`)),
    meta: JSON.parse(read(`${DIR}/metadata.json`)),
    practice: JSON.parse(read(`${DIR}/practice.json`)),
    kc: JSON.parse(read(`${DIR}/knowledge-check.json`)),
    sets: JSON.parse(JSON.stringify(lessonSets[SUBJECT] || {})),
    sandbox: read("src/components/ExperimentSandbox.jsx"),
    files,
    mirrors,
  };
}

// ---------------------------------------------------------------------------------------------
export function runChecks(st) {
  let pass = 0;
  const failures = [];
  const check = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const section = (t) => failures.push(`\u0000== ${t}`);

  const lessons = st.modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
  const lessonIds = lessons.map((l) => l.id);
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
  const sets = st.sets;
  const setKeys = Object.keys(sets);

  // ---------------------------------------------------------------- 1. one set per lesson, no strays
  section("1. every lesson has its own Play-tab set, and no set is stray");
  for (const id of lessonIds) check(!!sets[id], `${id}: has its own lessonSets["english-b"] entry`);
  for (const k of setKeys) check(!!byId[k], `${k}: is a real lesson id in modules.json (no stray set)`);
  check(setKeys.length === lessonIds.length,
    `sets and lessons are 1:1 (${setKeys.length} sets for ${lessonIds.length} lessons)`);

  // ---------------------------------------------------------------- 2. every set is well formed
  section("2. every set is well formed and unambiguous");
  for (const [id, set] of Object.entries(sets)) {
    const where = `lessonSets["english-b"].${id}`;
    check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
    check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
    if (set.kind === "match") {
      const pairs = set.pairs || [];
      check(pairs.length >= 4 && pairs.length <= 7, `${where}: 4-7 pairs (has ${pairs.length})`);
      check(pairs.every((p) => p.id && p.target && p.label), `${where}: every pair has id/target/label`);
      const ids = pairs.map((p) => p.id), targets = pairs.map((p) => p.target), labels = pairs.map((p) => p.label);
      check(new Set(ids).size === ids.length, `${where}: pair ids are unique`);
      check(new Set(targets).size === targets.length, `${where}: targets are unique (unambiguous drops)`);
      check(new Set(labels).size === labels.length, `${where}: labels are unique (no duplicate card)`);
    } else if (set.kind === "sort") {
      const cats = set.categories || [], items = set.items || [];
      check(cats.length >= 2, `${where}: at least 2 categories`);
      check(items.length >= 4 && items.length <= 8, `${where}: 4-8 items (has ${items.length})`);
      check(items.every((i) => i.id && i.label && cats.some((c) => c.id === i.category)),
        `${where}: every item has id/label and a known category`);
      check(new Set(cats.map((c) => c.id)).size === cats.length, `${where}: category ids are unique`);
      check(cats.every((c) => items.some((i) => i.category === c.id)), `${where}: every category is used`);
    } else if (set.kind === "order") {
      const items = set.items || [];
      check(items.length >= 4, `${where}: at least 4 items (has ${items.length})`);
      check(items.every((i) => i.id && i.label && Number(i.order) >= 1), `${where}: every item id/label/order`);
      const orders = items.map((i) => Number(i.order)).sort((a, b) => a - b);
      check(orders.every((o, i) => o === i + 1), `${where}: order values are 1..n with no gaps or repeats`);
      check(new Set(items.map((i) => i.id)).size === items.length, `${where}: item ids are unique`);
    } else {
      check(false, `${where}: kind must be match, sort or order (got ${set.kind})`);
    }
  }

  // ---------------------------------------------------------------- 3. experiment types
  section("3. every lesson declares a lab type English B already routes");
  for (const l of lessons) {
    const exp = l.experiment;
    check(!!exp && typeof exp === "object" && !Array.isArray(exp),
      `${l.id}: experiment is an OBJECT (check-play-copy reds on a bare string)`);
    check(EB_TYPES.includes((exp || {}).type), `${l.id}: experiment type "${(exp || {}).type}" is one of the 8 English B types`);
  }

  // ---------------------------------------------------------------- 4. estimatedModules
  section("4. metadata.estimatedModules tracks the real module count");
  check(st.meta.estimatedModules === st.modules.length,
    `metadata.estimatedModules matches the module count (${st.meta.estimatedModules} vs ${st.modules.length})`);

  // ---------------------------------------------------------------- 5. module list shape
  section("5. the module list is eb-mod-1..N in order, each module taught");
  const modIds = st.modules.map((m) => m.id);
  check(JSON.stringify(modIds) === JSON.stringify(modIds.map((_, i) => `eb-mod-${i + 1}`)),
    `module ids are eb-mod-1..${st.modules.length} in order (got ${modIds.join(", ")})`);
  for (const m of st.modules) check((m.lessons || []).length >= 1, `${m.id}: holds at least one lesson`);

  // ---------------------------------------------------------------- 6. frozen ids and kinds
  section("6. the 24 shipped lessons keep their order and their set kind");
  const shippedInOrder = lessonIds.filter((id) => FROZEN_ORDER.includes(id));
  check(JSON.stringify(shippedInOrder) === JSON.stringify(FROZEN_ORDER),
    `the 24 shipped ids keep their original relative order (got ${shippedInOrder.length})`);
  for (const id of FROZEN_ORDER) check(!!byId[id], `shipped lesson ${id} is still present`);
  check(new Set(lessonIds).size === lessonIds.length, "no duplicate lesson id");
  for (const id of FROZEN_ORDER) {
    const set = sets[id];
    check(!!set && set.kind === FROZEN_KINDS[id],
      `${id}: set kind is unchanged (${set && set.kind}, expected ${FROZEN_KINDS[id]})`);
  }

  // ---------------------------------------------------------------- 7. routing
  section("7. routing: the english-b branch resolves by lessonId, before the fallback");
  const bStart = st.sandbox.indexOf('if (subjectId === "english-b")');
  check(bStart !== -1, "ExperimentSandbox has an english-b branch");
  const bBranch = bStart === -1 ? "" : st.sandbox.slice(bStart, bStart + 400);
  check(/lessonId=\{lessonId\}/.test(bBranch), "the english-b branch passes lessonId through to DragDropLabel");
  check(bBranch.includes('subjectId="english-b"'), "the english-b branch renders the english-b deck");
  const fallback = st.sandbox.indexOf("if (lessonId && lessonSets[subjectId])");
  check(bStart !== -1 && fallback !== -1 && bStart < fallback,
    "the english-b branch is reached before the generic lessonSets[subjectId] fallback");

  // ---------------------------------------------------------------- 8. banks
  section("8. the banks are intact and every shipped lesson is still drilled");
  check(st.practice.length === 100, `practice bank is exactly 100 (has ${st.practice.length})`);
  check(st.kc.length === 25, `knowledge check is exactly 25 (has ${st.kc.length})`);
  const byTopic = (list) => list.reduce((a, q) => { a[q.topic] = (a[q.topic] || 0) + 1; return a; }, {});
  const pTopic = byTopic(st.practice), kTopic = byTopic(st.kc);
  check(st.practice.every((q) => !!byId[q.topic]), "every practice topic is a real lesson id");
  check(st.kc.every((q) => !!byId[q.topic]), "every knowledge-check topic is a real lesson id");
  for (const id of FROZEN_ORDER) check((pTopic[id] || 0) >= 1, `${id}: still has at least one practice question`);
  check(st.practice.filter((q) => q.id === "p35").length === 1 && (pTopic["eb-l7-3"] || 0) >= 2,
    "the comparative-essay item was retagged onto eb-l7-3 (retag before you retire)");
  const liveIds = new Set([...st.practice, ...st.kc].map((q) => q.id));
  for (const id of RETIRED_IDS) check(!liveIds.has(id), `${id}: retired id is no longer in use`);
  check(st.kc.length > 0 && Object.keys(kTopic).length >= 1, "the knowledge check still tags topics");

  // ---------------------------------------------------------------- 9. mirrors
  section("9. the content mirrors stay byte-identical");
  let mirrorFiles = [];
  try { mirrorFiles = fs.readdirSync(path.join(root, MIRROR_DIR)).sort(); } catch (e) { mirrorFiles = []; }
  check(JSON.stringify(mirrorFiles) === JSON.stringify(st.files),
    `content/ and public/content/ hold the same files (${st.files.length} vs ${mirrorFiles.length})`);
  for (const f of st.files) {
    check(st.mirrors[f] && st.mirrors[f].mirror === st.mirrors[f].content,
      `${DIR}/${f} and its public mirror are byte-identical`);
  }

  return { pass, failures };
}

// ---------------------------------------------------------------------------------------------
// red controls: each mutates the loaded state and MUST produce at least one failure
const firstLesson = (st) => st.modules[0].lessons[0];
export const RED_CONTROLS = {
  "drop-lesson-set": (st) => { delete st.sets["eb-l1-1"]; },
  "drop-new-lesson-set": (st) => { delete st.sets["eb-l7-6"]; },
  "stray-set": (st) => { st.sets["eb-ghost-lesson"] = JSON.parse(JSON.stringify(st.sets["eb-l1-1"])); },
  "bad-kind": (st) => { st.sets["eb-l2-1"].kind = "quiz"; },
  "too-few-pairs": (st) => { st.sets["eb-l2-1"].pairs = st.sets["eb-l2-1"].pairs.slice(0, 3); },
  "too-many-pairs": (st) => { const s = st.sets["eb-l2-1"]; s.pairs = [...s.pairs, { id: "x8", target: "t8", label: "l8" }, { id: "x9", target: "t9", label: "l9" }]; },
  "dup-target": (st) => { const s = st.sets["eb-l2-1"]; s.pairs[1].target = s.pairs[0].target; },
  "unused-category": (st) => { const s = st.sets["eb-l1-2"]; s.categories.push({ id: "spare", label: "Spare" }); },
  "too-many-items": (st) => { const s = st.sets["eb-l1-2"]; s.items = [...s.items, ...s.items.slice(0, 3).map((i, k) => ({ ...i, id: "extra" + k }))]; },
  "order-gap": (st) => { st.sets["eb-l4-1"].items[2].order = 9; },
  "missing-subtitle": (st) => { st.sets["eb-l3-2"].subtitle = ""; },
  "bad-experiment-type": (st) => { firstLesson(st).experiment.type = "text-sort"; },
  "bare-string-experiment": (st) => { st.modules[1].lessons[0].experiment = "matching-game"; },
  "estimated-modules": (st) => { st.meta.estimatedModules = 6; },
  "module-id-gap": (st) => { st.modules[1].id = "eb-mod-9"; },
  "empty-module": (st) => { st.modules[0].lessons = []; },
  "duplicate-lesson-id": (st) => { st.modules[0].lessons[1].id = st.modules[0].lessons[0].id; },
  "lesson-reordered": (st) => { const l = st.modules[0].lessons; l.unshift(l.pop()); },
  "frozen-kind-changed": (st) => { st.sets["eb-l1-1"].kind = "sort"; },
  "routing-branch-gone": (st) => { st.sandbox = st.sandbox.replace('if (subjectId === "english-b")', 'if (subjectId === "english-zz")'); },
  "routing-after-fallback": (st) => {
    // Put a generic lessonSets[subjectId] fallback AHEAD of the english-b branch, so the branch is no
    // longer reached first — every other routing assertion stays true.
    st.sandbox = "if (lessonId && lessonSets[subjectId]) { return null; }\n" + st.sandbox;
  },
  "practice-size": (st) => { st.practice.pop(); },
  "kc-size": (st) => { st.kc.pop(); },
  "practice-topic-ghost": (st) => { st.practice[0].topic = "eb-l9-9"; },
  "practice-lost-for-lesson": (st) => { st.practice = st.practice.filter((q) => q.topic !== "eb-l5-3"); },
  "retired-id-reused": (st) => { st.practice.push({ ...st.practice[0], id: "p6" }); },
  "p35-retag-lost": (st) => { st.practice = st.practice.filter((q) => q.id !== "p35"); },
  "mirror-drift": (st) => { st.mirrors["modules.json"].mirror = st.mirrors["modules.json"].mirror + " "; },
  "mirror-file-missing": (st) => { st.mirrors["sba.json"].mirror = null; },
};

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.includes("--red-control")) {
  const name = argv[argv.indexOf("--red-control") + 1];
  if (!RED_CONTROLS[name]) { console.log(`unknown red control: ${name}`); process.exit(2); }
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) { console.log(`RED CONTROL "${name}" WAS NOT CAUGHT — the check is blind to it`); process.exit(1); }
  console.log(`red control "${name}": caught with ${real.length} failure(s) — as expected`);
  real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}
if (argv.includes("--red-controls-all")) {
  let bad = 0;
  for (const name of Object.keys(RED_CONTROLS)) {
    const st = loadState();
    try { RED_CONTROLS[name](st); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
    const { failures } = runChecks(st);
    const real = failures.filter((f) => !f.startsWith("\u0000"));
    if (!real.length) { bad++; console.log(`NOT CAUGHT: ${name}`); }
    else console.log(`caught (${real.length}): ${name} — ${real[0]}`);
  }
  console.log(`\n${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
  process.exit(bad ? 1 : 0);
}

const st = loadState();
const { pass, failures } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const real = failures.filter((f) => !f.startsWith("\u0000"));
const lessons = st.modules.flatMap((m) => m.lessons || []);
console.log(`\ncheck-english-b-labs: ${pass} checks passed, ${real.length} failed`);
console.log(`derived: ${lessons.length} lessons, ${Object.keys(st.sets).length} lab sets, ${st.modules.length} modules ` +
  `(estimatedModules ${st.meta.estimatedModules}), practice ${st.practice.length}, knowledge check ${st.kc.length}, ` +
  `${st.files.length} mirrored files`);
process.exit(real.length ? 1 : 0);
