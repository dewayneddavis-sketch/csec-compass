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
//   6. the banked lesson ids (the 24 that shipped before the coverage build, plus the three `eb-l8-*`
//      appended by Slice F) keep their tree order and their set `kind` — id and kind are identity,
//      exactly like a lesson id (a new lesson is APPENDED, never interleaved);
//   7. routing: the english-b branch resolves by lessonId BEFORE the generic lessonSets[subjectId]
//      fallback, and passes lessonId through to DragDropLabel;
//   8. the banks: practice exactly 100, knowledge check exactly 25, every question tagged with a real
//      lesson id, every shipped lesson still drilled by practice AND still holding its knowledge-check
//      item — except the two lessons D-1 leaves without one, which are NAMED in KC_EXEMPT below and
//      asserted to hold none (the KC loop is relaxed, never deleted, at Slice G — see D-1), the
//      comparative-essay retag intact, and the retired ids still unused;
//   9. content/english-b/* and public/content/english-b/* are byte-identical, file for file.
//
// Usage
//   node tools/check-english-b-labs.mjs                       # the real check AND every red control
//   node tools/check-english-b-labs.mjs --red-control <name>  # one red control, on its own
//   node tools/check-english-b-labs.mjs --no-red-control      # the real check only (the one opt-out)
//
// A red control mutates the loaded state in memory and MUST make the check fail. The controls run BY
// DEFAULT, because the suite (`tools/check-all.sh`) invokes every harness with no arguments: a guard that
// only runs behind a flag is not a guard, and until 2026-11-19 this file's 32 controls ran only in a manual
// `--red-controls-all` pass that the suite never made. Nothing is written to disk, so the tree is
// byte-identical after a run with the controls on.
//
// One exit code covers both halves: the real check's failures and any control that was not caught (or was
// caught by an assertion other than the one it is aimed at — see RED_EXPECT).
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

// Every lesson the banks must cover, in tree order, and the `kind` each set ships with. Both are
// IDENTITY: a slice may append lessons and sets, never rename, re-key, reorder or re-kind these.
//
// The first 24 ids shipped before the coverage build. The last three were APPENDED by Slice F (module 8)
// and frozen by Slice G in the same edit that gave them their first practice and knowledge-check items:
// the per-lesson bank loops below iterate THIS list, so a lesson that gains items without joining it
// would sit in the bank unchecked forever, and joining it without items fails loudly. Both halves are
// asserted; that is the trap this list exists to spring.
export const FROZEN_ORDER = [
  "eb-l1-1", "eb-l1-2", "eb-l1-3",
  "eb-l2-1", "eb-l2-2", "eb-l2-3",
  "eb-l3-1", "eb-l3-2", "eb-l3-3",
  "eb-l4-1", "eb-l4-2", "eb-l4-3",
  "eb-l5-1", "eb-l5-2", "eb-l5-3",
  "eb-l6-1", "eb-l6-2", "eb-l6-3",
  "eb-l7-1", "eb-l7-2", "eb-l7-3", "eb-l7-4", "eb-l7-5", "eb-l7-6",
  "eb-l8-craft", "eb-l8-critical-evaluation", "eb-l8-context",
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
  "eb-l8-craft": "match", "eb-l8-critical-evaluation": "sort", "eb-l8-context": "match",
};

// D-1 (owner-confirmed 2026-11-05): the knowledge check stays EXACTLY 25 while the subject has 27
// lessons, so exactly two lessons carry no knowledge-check item. They are named here, and naming them is
// the whole point: the KC loop below is RELAXED for these two ids and for nothing else — no blanket
// `if (kc.length > 0)`, no `>=` — and each one is asserted to be a real lesson that holds NO item, so the
// exemption cannot rot into a hole when a later slice gives one of them an item. Both lessons teach how
// to PLAN AND WRITE an essay rather than a body of examinable literary knowledge; each keeps all five of
// its practice questions, which test that procedure step by step.
export const KC_EXEMPT = ["eb-l6-1", "eb-l6-3"];

// Retired bank ids. Never reused, whatever the re-balance does.
export const RETIRED_IDS = ["p6", "p11", "p17", "p24", "p42", "p48",
  "kc1", "kc4", "kc6", "kc9", "kc14", "kc16", "kc18", "kc24", "kc25"];

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
  section("6. the banked lessons keep their tree order and their set kind");
  const shippedInOrder = lessonIds.filter((id) => FROZEN_ORDER.includes(id));
  check(JSON.stringify(shippedInOrder) === JSON.stringify(FROZEN_ORDER),
    `the ${FROZEN_ORDER.length} banked ids keep their tree order (got ${shippedInOrder.length})`);
  for (const id of FROZEN_ORDER) check(!!byId[id], `banked lesson ${id} is still present`);
  check(new Set(lessonIds).size === lessonIds.length, "no duplicate lesson id");
  check(FROZEN_ORDER.length === lessonIds.length,
    `every lesson in modules.json is banked (FROZEN_ORDER ${FROZEN_ORDER.length}, lessons ${lessonIds.length})`);
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
  section("8. the banks are intact and every banked lesson is still drilled");
  check(st.practice.length === 100, `practice bank is exactly 100 (has ${st.practice.length})`);
  check(st.kc.length === 25, `knowledge check is exactly 25 (has ${st.kc.length})`);
  const byTopic = (list) => list.reduce((a, q) => { a[q.topic] = (a[q.topic] || 0) + 1; return a; }, {});
  const pTopic = byTopic(st.practice), kTopic = byTopic(st.kc);
  check(st.practice.every((q) => !!byId[q.topic]), "every practice topic is a real lesson id");
  check(st.kc.every((q) => !!byId[q.topic]), "every knowledge-check topic is a real lesson id");
  for (const id of FROZEN_ORDER) check((pTopic[id] || 0) >= 1, `${id}: still has at least one practice question`);
  // The KC half of the same "keeps" guard, RELAXED at Slice G for exactly the ids named in KC_EXEMPT and
  // for nothing else. Without the loop a re-tag that moves a lesson's only KC item onto another lesson is
  // invisible: kc.length stays 25, every topic stays a real lesson id, and §8 is silent.
  //
  // D-1 (owner-confirmed 2026-11-05) keeps the check at exactly 25 across 27 lessons, so exactly two
  // lessons hold no KC item. Each of those ids is asserted to exist, to be banked, and to hold NO item —
  // the last of those is what stops the exemption becoming a hole: give an exempt lesson an item and this
  // assertion reds (control `exempt-lesson-has-kc` proves it, pinned by RED_EXPECT). A blanket
  // `if (kc.length > 0)` or a `>=` would have been a deletion in disguise; this is not one.
  //
  // This replaces `check(st.kc.length > 0 && Object.keys(kTopic).length >= 1, "the knowledge check still
  // tags topics")`, which could never fail: §8 already pins kc.length === 25 and every KC topic to a
  // real lesson id, so it asserted nothing.
  check(KC_EXEMPT.length === 2, `exactly two lessons are exempt from the knowledge check (KC_EXEMPT has ${KC_EXEMPT.length})`);
  for (const id of KC_EXEMPT) {
    check(!!byId[id], `${id}: KC-exempt lesson is a real lesson id`);
    check(FROZEN_ORDER.includes(id), `${id}: KC-exempt lesson is banked (it is in FROZEN_ORDER)`);
    check(!(kTopic[id] > 0), `${id}: is KC-exempt, so it holds no knowledge-check item (has ${kTopic[id] || 0})`);
  }
  for (const id of FROZEN_ORDER) {
    if (KC_EXEMPT.includes(id)) continue;
    check((kTopic[id] || 0) >= 1, `${id}: still has at least one knowledge-check item`);
  }
  const noKc = lessonIds.filter((id) => !(kTopic[id] > 0));
  check(noKc.length === KC_EXEMPT.length && noKc.every((id) => KC_EXEMPT.includes(id)),
    `exactly ${KC_EXEMPT.length} lessons carry no knowledge-check item (found ${noKc.length}: ${noKc.join(", ") || "none"})`);
  check(st.practice.filter((q) => q.id === "p35").length === 1 && (pTopic["eb-l7-3"] || 0) >= 2,
    "the comparative-essay item was retagged onto eb-l7-3 (retag before you retire)");
  const liveIds = new Set([...st.practice, ...st.kc].map((q) => q.id));
  for (const id of RETIRED_IDS) check(!liveIds.has(id), `${id}: retired id is no longer in use`);

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
  // The KC item is RE-TAGGED, not removed: kc.length stays 25 and every topic stays a real lesson id, so
  // only the per-lesson KC loop can see it.
  "kc-lost-for-lesson": (st) => { for (const q of st.kc) if (q.topic === "eb-l7-4") q.topic = "eb-l7-3"; },
  "retired-id-reused": (st) => { st.practice.push({ ...st.practice[0], id: "p6" }); },
  "p35-retag-lost": (st) => { st.practice = st.practice.filter((q) => q.id !== "p35"); },
  // Aimed at the KC exemption's staleness assertion: an exemption list that is never checked for
  // staleness is a future blind spot, so GIVING an exempt lesson a knowledge-check item must red. The
  // clone also pushes kc.length to 26, which trips the totals line — that is exactly why RED_EXPECT pins
  // this control to the exemption's own message instead of accepting "something failed".
  "exempt-lesson-has-kc": (st) => {
    const src = st.kc.find((q) => q.topic !== KC_EXEMPT[0]) || st.kc[0];
    st.kc.push({ ...src, id: "kc99", topic: KC_EXEMPT[0] });
  },
  // Aimed at the practice half of the same guard: a banked lesson with no practice question must red.
  // It is the Slice G trap in reverse — the three new lessons were added to FROZEN_ORDER, so losing one
  // of their items can no longer pass unnoticed.
  "practice-lost-for-new-lesson": (st) => { st.practice = st.practice.filter((q) => q.topic !== "eb-l8-craft"); },
  "mirror-drift": (st) => { st.mirrors["modules.json"].mirror = st.mirrors["modules.json"].mirror + " "; },
  "mirror-file-missing": (st) => { st.mirrors["sba.json"].mirror = null; },
};

// ---------------------------------------------------------------------------------------------
// What each control must be caught BY — one ARRAY per control, and every one of the 32 is pinned.
// A control can trip more than one assertion at once (deleting a bank item moves the size line as well as
// the per-lesson line), so "some failure appeared" is not proof that the assertion the control is FOR still
// checks anything: a control whose guard had been deleted would still report caught because a DIFFERENT
// assertion tripped. The run only passes if every message listed here is among the failures; a control with
// no entry here fails outright (runControl), so a later edit cannot add a control and leave it unpinned.
export const RED_EXPECT = {
  "drop-lesson-set": ['eb-l1-1: has its own lessonSets["english-b"] entry'],
  "drop-new-lesson-set": ['eb-l7-6: has its own lessonSets["english-b"] entry'],
  "stray-set": ["eb-ghost-lesson: is a real lesson id in modules.json (no stray set)"],
  "bad-kind": ['lessonSets["english-b"].eb-l2-1: kind must be match, sort or order (got quiz)'],
  "too-few-pairs": ["eb-l2-1: 4-7 pairs (has 3)"],
  "too-many-pairs": ["eb-l2-1: 4-7 pairs (has 8)"],
  "dup-target": ["eb-l2-1: targets are unique (unambiguous drops)"],
  "unused-category": ["eb-l1-2: every category is used"],
  "too-many-items": ["eb-l1-2: 4-8 items (has 9)"],
  "order-gap": ["eb-l4-1: order values are 1..n with no gaps or repeats"],
  "missing-subtitle": ["eb-l3-2: has a subtitle"],
  "bad-experiment-type": ['eb-l1-1: experiment type "text-sort" is one of the 8 English B types'],
  // §3's OBJECT assertion, not the type assertion it drags along with it.
  "bare-string-experiment": ["eb-l2-1: experiment is an OBJECT"],
  "estimated-modules": ["metadata.estimatedModules matches the module count (6 vs 8)"],
  "module-id-gap": ["module ids are eb-mod-1..8 in order"],
  // §5's "each module holds at least one lesson", not the stray-set / bank failures emptying it also causes.
  "empty-module": ["eb-mod-1: holds at least one lesson"],
  "duplicate-lesson-id": ["no duplicate lesson id"],
  "lesson-reordered": ["banked ids keep their tree order"],
  "frozen-kind-changed": ["eb-l1-1: set kind is unchanged"],
  "routing-branch-gone": ["ExperimentSandbox has an english-b branch"],
  "routing-after-fallback": ["the english-b branch is reached before the generic lessonSets[subjectId] fallback"],
  "practice-size": ["practice bank is exactly 100 (has 99)"],
  "kc-size": ["knowledge check is exactly 25 (has 24)"],
  "practice-topic-ghost": ["every practice topic is a real lesson id"],
  // Aimed at the per-lesson practice loop; dropping the bank to 99 is the side-effect, not the target.
  "practice-lost-for-lesson": ["eb-l5-3: still has at least one practice question"],
  // Aimed at the per-lesson KC loop. This one is built to trip ONLY that loop — kc.length stays 25 and
  // every topic stays a real lesson id — which is why it was the most important control to pin.
  "kc-lost-for-lesson": ["eb-l7-4: still has at least one knowledge-check item"],
  "retired-id-reused": ["p6: retired id is no longer in use"],
  "p35-retag-lost": ["the comparative-essay item was retagged onto eb-l7-3"],
  "exempt-lesson-has-kc": ["is KC-exempt, so it holds no knowledge-check item"],
  "practice-lost-for-new-lesson": ["eb-l8-craft: still has at least one practice question"],
  "mirror-drift": ["content/english-b/modules.json and its public mirror are byte-identical"],
  "mirror-file-missing": ["content/english-b/sba.json and its public mirror are byte-identical"],
};

// ---------------------------------------------------------------------------------------------
/** Run one control against a fresh load. ok = it was caught, and caught by the assertion it names. */
function runControl(name) {
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name] || [];
  if (!expect.length)
    return { ok: false, real, why: "NO PINNED EXPECTATION — this control is not aimed at any assertion" };
  const missing = expect.filter((e) => !real.some((f) => f.includes(e)));
  if (missing.length)
    return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${missing[0]}"` };
  return { ok: true, real: real.filter((f) => expect.some((e) => f.includes(e))) };
}

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const only = argv.includes("--red-control") ? argv[argv.indexOf("--red-control") + 1] : null;

if (only) {
  if (!RED_CONTROLS[only]) { console.log(`unknown red control: ${only}`); process.exit(2); }
  let r;
  try { r = runControl(only); } catch (e) { console.log(`RED CONTROL "${only}" BROKE — ${e.message}`); process.exit(1); }
  if (!r.ok) { console.log(`RED CONTROL "${only}" ${r.why}`); r.real.slice(0, 3).forEach((f) => console.log("   " + f)); process.exit(1); }
  console.log(`red control "${only}": caught — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
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

if (argv.includes("--no-red-control")) process.exit(real.length ? 1 : 0);

// Red controls run by DEFAULT — the suite passes no arguments, so this is the path it takes.
let bad = 0;
for (const name of Object.keys(RED_CONTROLS)) {
  let r;
  try { r = runControl(name); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
  if (!r.ok) { bad++; console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`); }
  else console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
}
console.log(`${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
// ONE exit code for both halves: a failing real check and an uncaught control are both red.
process.exit(real.length || bad ? 1 : 0);
