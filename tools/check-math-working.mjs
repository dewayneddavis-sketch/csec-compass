#!/usr/bin/env node
// Harness: the Mathematics wrong-answer reveal must actually FIRE, and it must
// fire the right lesson's working.
//
// WHY THIS EXISTS
// ---------------
// `getLabWorking()` used to key its working by ACTIVITY TYPE only. `mathLabWorkings`
// carries the nine MATH_DRAG_TYPES; the 32 Mathematics lessons that own a set in
// `lessonSets.mathematics` are `matching-game` (17), `classifier-sim` (7) and
// `interactive-quiz` (8) with item ids (p1…p6) reused across lessons. So the type
// lookup returned null, the reveal was null, and a wrong drop showed "❌ Not quite"
// with no correct answer and no working — in 32 lessons / 181 items. Eight of them
// sit on `interactive-quiz`, a type that IS keyed, and failed only because their
// item ids do not line up with r1…r5 — which is why the resolver must never fall
// through to the type table for a lesson that owns its own set.
//
// HOW IT PROVES IT
// ----------------
//   * BEHAVIOUR is driven by IMPORTING the shipped functions
//     (`getLabWorking`, `labReveal`, `REVEAL_SUBJECTS`, `mathLessonWorkings`) and
//     the shipped `lessonSets` + `content/mathematics/modules.json`. This file
//     contains NO second copy of the resolver: a mirrored resolver would make a
//     green run meaningless, because it would only prove the mirror.
//   * CODE SHAPE is proved by text-slicing `src/components/DragDropLabel.jsx`
//     (and its neighbours) and mutating the slice in memory — never by trusting
//     that the call site says what the PR description says.
//   * Every assertion has a RED CONTROL that makes it fail. Red controls that
//     need different DATA build a throwaway copy of the real resolver in a temp
//     directory (real `mathWorking.js`, real `lessonSets.js`, doctored
//     `mathLessonWorkings.js` or a doctored resolver line) and import THAT — so a
//     control exercises the shipped code path, not a simulation of it.
//
// WHAT IT DOES NOT PROVE
// ----------------------
// Structure and the answer — never that the mathematics is correct. Correctness
// of every authored step is a review obligation carried by each backfill PR,
// together with an independently re-derived arithmetic table.
//
// A18 — THE PER-LESSON REVEAL WALK (added 2026-11-18)
// ---------------------------------------------------
// The other assertions prove the reveal for the lessons that OWN a per-lesson
// set, and prove the type table answers for the nine drag types. Nothing said
// "this lesson's Play tab renders these items, and every one of them reveals a
// method" in one place — so a report that `fractions-decimals-percentages` shows
// a correct answer with no method (2026-11-18) took a hand audit to settle. A18
// walks every lesson that renders DragDropLabel (its own set first, then the
// type block, in the component's own order), resolves each rendered item through
// the shipped `labReveal`, and fails by lesson and item when the reveal is the
// answer with `steps: []`. The six lessons that render another tool are derived
// and printed with the harness that owns each (see revealWalkOf).
//
// Usage:
//   node tools/check-math-working.mjs                  # the real tree
//   node tools/check-math-working.mjs --selftest       # synthetic fixture only
//   node tools/check-math-working.mjs --red-control    # + every red control
//   node tools/check-math-working.mjs --red-controls-all   # alias of --red-control
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";
import { measurementTasks } from "../src/data/measurementTasks.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const SELFTEST = process.argv.includes("--selftest");
// The red controls run by DEFAULT: the suite invokes every harness with no
// arguments, so an opt-in flag meant the shipped suite never proved that any
// of these assertions can bite. Pass --no-red-control to skip them;
// --red-control / --red-controls-all stay accepted as no-op aliases.
const RED_CONTROL = !process.argv.includes("--no-red-control");

let pass = 0;
let fail = 0;
const ok = (cond, msg) => { if (cond) pass += 1; else { fail += 1; console.log(`FAIL: ${msg}`); } };
const section = (t) => console.log(`\n== ${t}`);

// ---------------------------------------------------------------------------
// PENDING — the backfill ledger (lead ruling 2026-11-08, ruling 4).
//
// Every one of the 32 lessons that owns a per-lesson Mathematics lab set is
// either AUTHORED in src/data/mathLessonWorkings.js or listed here. A2 asserts
// `PENDING ∪ authored === every live per-lesson set` exactly, so:
//   * a new per-lesson set cannot escape the backfill silently (it would be in
//     neither list), and
//   * a key cannot silently vanish from this list while still un-authored.
// The backfill empties lessons out of this list slice by slice, in the same PR
// that authors them (A3 forbids a lesson being both).
//
// This is its own literal on purpose: deriving it from lessonSets.js would make
// it change silently the moment a Slice-3 set lands, which is the exact failure
// it exists to catch.
// ---------------------------------------------------------------------------
// Grouped by the lesson's OWN module in content/mathematics/modules.json —
// measured, not assumed (the six backfill slices of the lead's ruling, 181 items).
//
// EMPTY AS OF BACKFILL SLICE F (2026-11-10) — the LAST slice. All six slices are
// authored, so this list is empty on purpose: the step-by-step method now shows
// in every one of the 36 Mathematics lessons that own a per-lesson lab set.
//   slice A consumer-arithmetic 6 sets / 35 items (profit-loss-and-discounts ·
//     simple-and-compound-interest · hire-purchase-and-instalments ·
//     taxes-and-utility-bills · exchange-rates-and-currency · insurance-and-budgeting)
//   slice B sets 6 / 31 (set-notation · subsets-and-cardinality · venn-diagrams ·
//     union-intersection-complement · shading-venn-regions · set-word-problems)
//   slice C number-theory-computation 8 / 46 (types-of-numbers · indices-and-surds ·
//     standard-form · mat-num-number-bases-and-place-value ·
//     mat-num-significant-figures-and-decimal-places ·
//     mat-num-properties-of-operations · mat-num-number-sequences ·
//     mat-num-ratio-and-proportion)
//   slice D measurement 4 / 26 (si-units-and-conversion ·
//     mat-meas-surface-area-of-solids · mat-meas-measurement-error ·
//     mat-meas-scale-and-scale-drawings)
//   slice E algebra + relations-functions-graphs 4 / 20 (factorization ·
//     algebraic-fractions · transposition-and-substitution ·
//     linear-and-quadratic-graphs)
//   slice F geometry-trigonometry + statistics-probability 4 / 23
//     (angles-and-polygons · circle-theorems · transformations ·
//     frequency-tables-and-cumulative-frequency)
// An empty list is NOT "nothing left to check": with PENDING empty, A2 now reads
// "every live per-lesson set must be authored", and R3b proves that dropping one
// authored set still reds. The list stays a literal on purpose — deriving it from
// lessonSets.js would let it change silently the moment a new set lands, which is
// the exact failure it exists to catch.
const PENDING = [];

// The md5 of the `mathematics:` block of `subjectTypeSets` in DragDropLabel.jsx.
// The nine type-level blocks are frozen (lead ruling 2026-11-08): this PR changes
// where the reveal's DATA comes from, never what the type table contains. A16
// pins the bytes so a future edit cannot quietly re-key them, and A16 also
// cross-checks every type block against `mathLabWorkings` item by item.
const PINNED_MATH_BLOCK_MD5 = "ae26b85cafd0f8b9b9a56e0320e61f41";

// ---------------------------------------------------------------------------
// Data helpers (extraction only — never a copy of the reveal resolver)
// ---------------------------------------------------------------------------
const ITEM_ANSWER_NUMERIC = /^-?\d+(\.\d+)?$/;

// Does `step` state `answer`? Strict containment (the rule
// tools/check-show-your-work.mjs uses), TIGHTENED to token boundaries when the
// answer is purely numeric (lead ruling 2026-11-08, ruling 3) — otherwise "4"
// would "state" the answer inside "14".
function statesAnswer(step, answer, { tokenBoundary = true } = {}) {
  const text = String(step || "");
  const want = String(answer);
  if (!tokenBoundary || !ITEM_ANSWER_NUMERIC.test(want)) return text.includes(want);
  const escaped = want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9.])${escaped}(?![0-9])(?!\\.[0-9])`).test(text);
}

// The items of one lab set, with the answer that set itself holds for each.
function itemsOf(set) {
  if (!set) return [];
  if (set.kind === "match") return (set.pairs || []).map((p) => ({ id: p.id, answer: p.target }));
  if (set.kind === "sort") {
    return (set.items || []).map((i) => ({
      id: i.id,
      answer: ((set.categories || []).find((c) => c.id === i.category) || {}).label || null,
    }));
  }
  return [];
}

// The `mathematics:` block of subjectTypeSets, sliced exactly the way
// tools/check-show-your-work.mjs slices it (that harness is the independent
// witness for the type table; A15 pins its three anchors).
function mathBlockOf(src) {
  const stsStart = src.indexOf("const subjectTypeSets = {");
  if (stsStart === -1) return "";
  const start = src.indexOf("  mathematics: {", stsStart);
  const end = src.indexOf("  physics: {", stsStart);
  if (start === -1 || end === -1 || end <= start) return "";
  return src.slice(start, end);
}

// { type: [{ id, answer }] } for the nine type-level blocks.
function typeBlocksOf(src) {
  const block = mathBlockOf(src);
  const out = {};
  let current = null;
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    const typeMatch = line.match(/^"([a-z-]+)":\s*\{$/);
    if (typeMatch) { current = typeMatch[1]; out[current] = out[current] || []; continue; }
    if (!current) continue;
    const pair = line.match(/^\{ id: "([^"]+)", target: "([^"]*)"/);
    if (pair) { out[current].push({ id: pair[1], answer: pair[2] }); continue; }
    const item = line.match(/^\{ id: "([^"]+)", label: "(.*)", category: "([^"]+)" \},?$/);
    if (item) out[current].push({ id: item[1], answer: { categoryId: item[3] } });
  }
  const catLabels = {};
  for (const m of block.matchAll(/\{ id: "([a-z-]+)", label: "([^"]+)" \}/g)) catLabels[m[1]] = catLabels[m[1]] || m[2];
  for (const type of Object.keys(out)) {
    for (const item of out[type]) {
      if (item.answer && typeof item.answer === "object") item.answer = catLabels[item.answer.categoryId] || null;
    }
  }
  return out;
}

// The five experiment-type groups the Mathematics Play tab routes on, read out
// of src/components/ExperimentSandbox.jsx rather than retyped (the same slicing
// tools/check-mathematics-labs.mjs does, so the two harnesses cannot disagree
// about which type reaches which tool).
function mathTypeGroupsOf(src) {
  const typesOf = (name) => {
    const at = String(src).indexOf(`const ${name} = new Set([`);
    if (at === -1) return [];
    const end = String(src).indexOf("]);", at);
    if (end === -1) return [];
    return [...String(src).slice(at, end).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  };
  return {
    drag: new Set(typesOf("MATH_DRAG_TYPES")),
    graphing: new Set([
      ...typesOf("MATH_LINEAR_TYPES"),
      ...typesOf("MATH_PARABOLA_TYPES"),
      ...typesOf("MATH_NUMBERLINE_TYPES"),
    ]),
    balance: new Set(typesOf("MATH_BALANCE_TYPES")),
    area: new Set(typesOf("MATH_AREA_TYPES")),
    volume: new Set(typesOf("MATH_VOLUME_TYPES")),
  };
}

// ---------------------------------------------------------------------------
// THE REVEAL WALK — every Mathematics lesson whose Play tab renders
// DragDropLabel, and every item it renders, resolved through the shipped
// resolver. Added 2026-11-18 with assertion A18.
//
// WHY IT EXISTS. The coverage line counts the lessons that own a per-lesson set
// and says the rest "resolve through the type table" — a sentence nothing
// asserted. The chain was there but implicit and spread over three assertions in
// two harnesses (check-mathematics-labs A10 says the type is recognised,
// check-math-working A7 says the type block's items resolve, A16 says the block
// and the table hold the same ids). No one of them names the lesson whose Play
// tab shows a correct answer with `steps: []`, so a report of exactly that
// (2026-11-18, `fractions-decimals-percentages`) took a hand audit to settle.
// This walk answers it in one assertion, per lesson and per item.
//
// It mirrors DragDropLabel's OWN resolution order (src/components/DragDropLabel.jsx:
// `lessonSets[subjectId][lessonId]` first, then `subjectTypeSets[subjectId][experimentType]`),
// so the items it walks are the items the student sees — derived from the set or
// from the type block, never hand-typed.
//
// WHAT IT DOES NOT COVER: the six lessons that render another tool — the three
// graphing lessons (src/data/graphingTasks.js, asserted by
// tools/check-graph-reveal.mjs G2), the balance lesson (solveBalanceMethod,
// asserted by tools/check-show-your-work.mjs §5) and the two measurement tools
// (src/data/measurementTasks.js, asserted by tools/check-measurement-reveal.mjs
// M1–M6 — this citation used to name check-mathematics-labs A13/A14, which
// assert the tools' copy and sums and say nothing about a reveal). They are
// DERIVED here and named in the printed line, so a lesson that quietly stopped
// rendering a tool cannot drop out of the walk unnoticed. A19 asserts that the
// measurement task table is keyed to exactly those lessons.
// ---------------------------------------------------------------------------
function revealWalkOf(env) {
  const groups = mathTypeGroupsOf(env.sandboxSource);
  const blocks = typeBlocksOf(env.ddSource);
  const otherTool = new Set([...groups.graphing, ...groups.balance, ...groups.area, ...groups.volume]);
  const problems = [];
  const walkedLessons = [];
  const notWalked = [];
  let walkedItems = 0;
  let ownCount = 0;
  for (const lessonId of env.lessonIds || []) {
    const type = (env.lessonTypes || new Map()).get(lessonId);
    const own = hasOwn(env.sets, lessonId);
    if (!own && !groups.drag.has(type)) { notWalked.push(lessonId); continue; }
    const items = own ? itemsOf(env.sets[lessonId]) : (blocks[type] || []);
    if (items.length === 0) {
      problems.push(`A18: ${lessonId}: the Play tab renders ${own ? "its own set" : `the "${type}" type block`} and that holds no items, so no item can reveal a method`);
      continue;
    }
    walkedLessons.push(lessonId);
    if (own) ownCount += 1;
    for (const item of items) {
      walkedItems += 1;
      const r = env.working.labReveal({
        subjectId: "mathematics", experimentType: type, itemId: item.id, lessonId, answer: item.answer,
      });
      if (!r) {
        problems.push(`A18: ${lessonId}/${item.id}: labReveal returned null — a wrong drop would show no answer at all`);
        continue;
      }
      if (r.answer !== item.answer) {
        problems.push(`A18: ${lessonId}/${item.id}: the reveal states the answer ${JSON.stringify(r.answer)} — the set the Play tab renders holds ${JSON.stringify(item.answer)}`);
      }
      if (!Array.isArray(r.steps) || r.steps.length === 0) {
        problems.push(`A18: ${lessonId}/${item.id}: the Play tab reveals the correct answer ${JSON.stringify(item.answer)} with NO method (steps are []) — ${own ? "a lesson that owns a set must be authored in mathLessonWorkings" : `a type-keyed lesson needs a mathLabWorkings entry for "${type}"`}`);
      }
    }
  }
  // The walk must not be silently empty, and every lesson it skips must be one
  // that renders another tool — never one that fell through to the Mathematics
  // flashcard deck (that lesson reveals nothing at all).
  if (walkedLessons.length === 0) problems.push("A18: the walk covered no lesson — the assertion would be vacuous");
  const skipped = notWalked.filter((id) => !otherTool.has((env.lessonTypes || new Map()).get(id)));
  if (skipped.length > 0) {
    problems.push(`A18: ${skipped.length} lesson(s) are neither walked nor rendered by another tool: [${skipped.join(", ")}] — their Play tab falls to the flashcard deck, so no method can reveal`);
  }
  return { problems, walkedLessons, notWalked, walkedItems, ownCount, otherTool };
}

// Insert one pair into a type block of DragDropLabel's source, so a red control
// can prove the walk sees an item the resolver has never been taught.
function addTypeBlockPair(src, type, pairLine) {
  const at = String(src).indexOf(`    "${type}": {`);
  if (at === -1) throw new Error(`red controls: the "${type}" block is not in DragDropLabel.jsx`);
  const pairsAt = String(src).indexOf("pairs: [", at);
  if (pairsAt === -1) throw new Error(`red controls: the "${type}" block has no pairs array`);
  const insertAt = pairsAt + "pairs: [".length;
  return `${String(src).slice(0, insertAt)}\n        ${pairLine}${String(src).slice(insertAt)}`;
}

// lessonId → experiment.type, from the shipped modules.json.
function lessonTypesOf() {
  const modules = JSON.parse(read("content/mathematics/modules.json"));
  const map = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      if (node.id && node.experiment && node.experiment.type) map.set(node.id, node.experiment.type);
      Object.values(node).forEach(walk);
    }
  };
  walk(modules);
  return map;
}

// ---------------------------------------------------------------------------
// THE COVERAGE FIGURE — DERIVED, never hand-counted (added 2026-11-10, slice F).
//
// The differentiator's coverage number has been quoted 4 too high in reports:
// "36 of 51" while the shipped file held 28 authored sets, because the four
// mat-stat-* lessons were counted twice — once as authored and once as "the 4
// new Statistics". So the number is computed here from the data and PRINTED by
// this harness, which means a report cannot quote a figure the harness did not
// compute:
//   * authoredSets  — keys of `mathLessonWorkings` (what actually reveals working)
//   * setsOwning    — keys of `lessonSets.mathematics` (lessons that own a set)
//   * lessons       — lesson ids in content/mathematics/modules.json, module ids
//                     excluded, cross-checked against lessonTypesOf() — a
//                     different walk (`experiment.type`) than modules[].lessons[],
//                     so a module id leaking into the list shows up as a
//                     disagreement instead of inflating the denominator
// A17 asserts the arithmetic that makes the printed sentence true.
// ---------------------------------------------------------------------------
function mathematicsLessonIds() {
  const modules = JSON.parse(read("content/mathematics/modules.json"));
  const ids = [];
  for (const mod of modules) for (const lesson of mod.lessons || []) if (lesson && lesson.id) ids.push(lesson.id);
  return ids;
}

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

function coverageOf(env) {
  const authoredSets = Object.keys(env.workings || {});
  const setsOwning = Object.keys(env.sets || {});
  const lessons = env.lessonIds || [];
  const pending = env.pending || [];
  const authoredOwning = setsOwning.filter((id) => hasOwn(env.workings, id));
  const pendingOwning = setsOwning.filter((id) => pending.includes(id));
  const noSet = lessons.filter((id) => !setsOwning.includes(id));
  return { authoredSets, setsOwning, lessons, authoredOwning, pendingOwning, noSet };
}

// The exact sentence the harness prints, built from the derived numbers only.
function coverageLine(cov) {
  return `coverage: ${cov.authoredOwning.length} of ${cov.setsOwning.length} set-owning lessons carry authored working ` +
    `(${cov.authoredOwning.length} of ${cov.lessons.length} lessons; ` +
    `${cov.noSet.length} lessons own no per-lesson set and resolve through the type table)`;
}

// ---------------------------------------------------------------------------
// Environments. `realEnv()` imports the SHIPPED files. `treeEnv()` copies the
// real resolver and the real lessonSets into a temp directory with a doctored
// data file (or a doctored resolver line) so a red control can drive the real
// code path with different data.
// ---------------------------------------------------------------------------
const tmpDirs = [];
function treeEnv({ workingSrc, workingsSrc } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cmw-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, "src", "components"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src", "data"), { recursive: true });
  // Re-export the REAL lessonSets rather than copying it: the copy would be a
  // second module instance of a 5,000-line table per doctored tree, and this box
  // has ~2 GB to run the whole 55-harness suite in. Same object, same data.
  fs.writeFileSync(
    path.join(dir, "src", "components", "lessonSets.js"),
    `export { lessonSets } from ${JSON.stringify(pathToFileURL(path.join(root, "src", "components", "lessonSets.js")).href)};\n`
  );
  fs.writeFileSync(path.join(dir, "src", "data", "mathLessonWorkings.js"), workingsSrc ?? read("src/data/mathLessonWorkings.js"));
  fs.writeFileSync(path.join(dir, "src", "data", "mathWorking.js"), workingSrc ?? read("src/data/mathWorking.js"));
  return (async () => {
    const working = await import(pathToFileURL(path.join(dir, "src", "data", "mathWorking.js")).href);
    const workings = (await import(pathToFileURL(path.join(dir, "src", "data", "mathLessonWorkings.js")).href)).mathLessonWorkings;
    return { ...baseEnv(), working, workings, workingSrc: workingSrc ?? read("src/data/mathWorking.js") };
  })();
}

// The item count A8 walks, DERIVED from the live sets (changed 2026-11-08, in
// the Slice 3 PR, from the literal 181).
//
// Why derived and not bumped: a literal has to be re-typed by every slice that
// adds a set, so it degenerates into a number the author of the PR copies out of
// the failure message — a pin that is updated rather than a rule that bites.
//
// GENUINELY INDEPENDENT OF itemsOf() (fixed 2026-11-08, backfill slice A). The
// first version of this function walked the same `kind` → `pairs`/`items` shape
// that itemsOf() walks, so it was NOT independent of it and its comment was
// false: a set with an unenumerable shape (kind "matching" instead of "match",
// or a sort-shaped set carrying `pairs`) contributed 0 to BOTH counts, the walk
// and the expectation agreed at a smaller number, and A8 stayed green. That is
// exactly the defect class this file exists to catch, so it is now counted from
// the RAW arrays whatever `kind` says, and each live set is floored at one item
// so a set that contributes nothing cannot hide inside the other sets' total.
// Red controls R22 (unenumerable shape) and R23 (a set with no items at all)
// prove both halves bite.
function liveItemCount(sets) {
  let n = 0;
  for (const set of Object.values(sets || {})) {
    if (!set) continue;
    const pairs = Array.isArray(set.pairs) ? set.pairs.length : 0;
    const items = Array.isArray(set.items) ? set.items.length : 0;
    n += Math.max(1, pairs + items);
  }
  return n;
}

function baseEnv() {
  return {
    sets: lessonSets.mathematics,
    lessonTypes: lessonTypesOf(),
    lessonIds: mathematicsLessonIds(),
    ddSource: read("src/components/DragDropLabel.jsx"),
    sandboxSource: read("src/components/ExperimentSandbox.jsx"),
    sywSource: read("tools/check-show-your-work.mjs"),
    playCopySource: read("tools/check-play-copy.mjs"),
    pending: PENDING.slice(),
    expectedItems: liveItemCount(lessonSets.mathematics),
    workingSrc: read("src/data/mathWorking.js"),
    // A19's table: the tasks the two measurement tools reveal from.
    measurementTasks,
  };
}

async function realEnv() {
  const working = await import(pathToFileURL(path.join(root, "src", "data", "mathWorking.js")).href);
  const workings = (await import(pathToFileURL(path.join(root, "src", "data", "mathLessonWorkings.js")).href)).mathLessonWorkings;
  return { ...baseEnv(), working, workings };
}

// ---------------------------------------------------------------------------
// THE EXAMPLE LESSON for the four red controls that need a lesson which is
// STILL UNAUTHORED (R3, R5, R11, R12).
//
// These four used to name a real lesson by hand, and every backfill slice
// authored that lesson, so each slice had to move the pointer: slice A moved it
// off `profit-loss-and-discounts`, slice B off `set-notation` / `venn-diagrams`,
// slice C off `types-of-numbers`. Moving a pointer is not a fix — the control
// passes on the slice that moves it and rots on the next one, and it rots
// SILENTLY: red controls only run under `--red-control`, so the everyday
// 55-harness run (`node "$f"`, no flag) stays green while they decay.
//
// So the example is DERIVED AT RUNTIME from `PENDING[0]` instead, and needs no
// edit per slice. Two guards keep that from decaying into a different silence:
//
//   1. `unauthoredExample()` THROWS if the lesson it derived is already
//      authored. A control pointed at an authored lesson does not fail — it
//      passes without proving anything, which is the exact defect class this
//      file exists to catch, so it must be loud rather than quiet.
//   2. When `PENDING` is EMPTY — the state after the last backfill slice — there
//      is no real unauthored lesson left to point at, so it falls back to a
//      SYNTHETIC fixture lesson id that no slice can ever author, injected into
//      the env's `sets` + `pending`. The fallback is exercised by an assertion
//      on every run, so it is proven now rather than discovered broken later.
//
// Each control's RULE is untouched; only where its example comes from changed.
// ---------------------------------------------------------------------------
const SYNTHETIC_PENDING_LESSON = "red-control-fixture-lesson";
const SYNTHETIC_PENDING_SET = {
  kind: "match",
  title: "Red-control fixture",
  subtitle: "A fixture set that no backfill slice can ever author.",
  // The item id is deliberately NOT "p1": a synthetic lesson does not own a set
  // as far as the shipped resolver is concerned (`ownsLabSet` reads the real
  // lessonSets), so it falls through to the type table. A unique id that exists
  // in no type-level block makes that fall-through return null, which is the
  // state R11 and R12 need.
  pairs: [{ id: "fixture-p1", label: "fixture label", target: "fixture answer" }],
};

function unauthoredExample(base) {
  const pending = base.pending || [];
  if (pending.length > 0) {
    const lessonId = pending[0];
    if (Object.prototype.hasOwnProperty.call(base.workings || {}, lessonId)) {
      throw new Error(
        `red controls: the derived example lesson "${lessonId}" (PENDING[0]) is ALREADY AUTHORED — ` +
        `a control pointed at an authored lesson passes without proving anything. ` +
        `Either empty it out of PENDING (A3) or the tree is lying about the backfill ledger.`
      );
    }
    return { lessonId, synthetic: false };
  }
  return { lessonId: SYNTHETIC_PENDING_LESSON, synthetic: true };
}

// A REAL lesson that owns NO per-lesson set — DERIVED, never hand-typed.
//
// R1 and R4 used to name `mat-geo-bearings` by hand. Slice 5 (2026-11-15) gave
// that id a real lesson AND a real per-lesson set, so R1's fixture became an
// authored set (A1 stopped firing) and R4's phantom key became a live set (A2
// stopped firing) — both controls went quiet while still counting themselves as
// controls. That is the same rot as a hand-typed PENDING pointer, and it gets
// the same cure: derive the example, and THROW when the tree cannot supply one.
function noSetLessonId(env) {
  const id = (env.lessonIds || []).find((k) => !Object.prototype.hasOwnProperty.call(env.sets || {}, k));
  if (!id) {
    throw new Error(
      "red controls: no live lesson owns no per-lesson set — R1 and R4 have no example, " +
      "so they would pass without proving anything."
    );
  }
  return id;
}

// An env in which the example lesson is a LIVE, UNAUTHORED set that is listed in
// PENDING — the state R3/R5/R11/R12 each doctor one field of. `expectedItems` is
// recomputed from the resulting sets on purpose (same rule as R22/R23): a count
// borrowed from a different tree cannot tell two implementations apart.
function exampleEnv(base, ex) {
  const sets = ex.synthetic ? { ...base.sets, [ex.lessonId]: SYNTHETIC_PENDING_SET } : { ...base.sets };
  const pending = ex.synthetic ? [ex.lessonId] : (base.pending || []).slice();
  const lessonTypes = ex.synthetic
    ? new Map([...base.lessonTypes, [ex.lessonId, "matching-game"]])
    : base.lessonTypes;
  return { ...base, sets, pending, lessonTypes, expectedItems: liveItemCount(sets) };
}

// ---------------------------------------------------------------------------
// THE ASSERTIONS. Each returns problem strings; none of them resolves the
// reveal itself — they call the shipped `getLabWorking` / `labReveal`.
// ---------------------------------------------------------------------------
function revealProblems(env) {
  const problems = [];
  const { working, workings, sets } = env;
  const liveIds = Object.keys(sets || {});
  const authoredIds = Object.keys(workings || {});

  // ---- A1: every authored entry is a REAL lesson + a REAL item of its set ----
  for (const [lessonId, items] of Object.entries(workings || {})) {
    const set = (sets || {})[lessonId];
    if (!set) {
      problems.push(`A1: mathLessonWorkings.${lessonId}: "${lessonId}" is not a lesson that owns a set in lessonSets.mathematics`);
      continue;
    }
    const ids = itemsOf(set).map((i) => i.id);
    if (!items || typeof items !== "object" || Array.isArray(items)) {
      problems.push(`A1: mathLessonWorkings.${lessonId}: must map item ids to arrays of step strings`);
      continue;
    }
    for (const [itemId, steps] of Object.entries(items)) {
      if (!ids.includes(itemId)) {
        problems.push(`A1: mathLessonWorkings.${lessonId}.${itemId}: "${itemId}" is not an item id in that lesson's own set`);
      }
      if (!Array.isArray(steps) || steps.length === 0 || !steps.every((s) => typeof s === "string" && s.trim() !== "")) {
        problems.push(`A1: mathLessonWorkings.${lessonId}.${itemId}: the working must be a non-empty array of non-empty strings`);
      }
    }
  }

  // ---- A2: PENDING ∪ authored === every live per-lesson set, exactly --------
  const pending = env.pending || [];
  const seen = new Set();
  const dupes = pending.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
  if (dupes.length > 0) problems.push(`A2: PENDING lists ${dupes.length} lesson(s) more than once: [${dupes.join(", ")}]`);
  const union = new Set([...pending, ...authoredIds]);
  const unaccounted = liveIds.filter((k) => !union.has(k));
  if (unaccounted.length > 0) {
    problems.push(`A2: ${unaccounted.length} live per-lesson set(s) are neither authored nor in PENDING: [${unaccounted.join(", ")}]`);
  }
  const phantom = [...union].filter((k) => !liveIds.includes(k));
  if (phantom.length > 0) {
    problems.push(`A2: PENDING ∪ authored names ${phantom.length} key(s) that are not live per-lesson sets: [${phantom.join(", ")}]`);
  }

  // ---- A3: a lesson is authored OR pending, never both ----------------------
  const both = authoredIds.filter((k) => pending.includes(k));
  if (both.length > 0) {
    problems.push(`A3: ${both.length} lesson(s) are both authored and PENDING: [${both.join(", ")}] — empty the lesson out of PENDING in the same PR that authors it`);
  }

  // ---- A2b: a set is authored WHOLE, never half -----------------------------
  // A2 is SET-granular: it only asks whether a lesson appears in one of the two
  // lists, so a set with one authored item and five blank ones passed it. Every
  // backfill slice authors whole sets, so a half-finished set must not pass —
  // the moment a lesson has ANY authored entry, every item of its own set must
  // have one. Added 2026-11-08 (backfill slice A), red control R24.
  for (const [lessonId, items] of Object.entries(workings || {})) {
    const set = (sets || {})[lessonId];
    if (!set || !items || typeof items !== "object" || Array.isArray(items)) continue; // A1 owns those
    const ids = itemsOf(set).map((i) => i.id);
    if (ids.length === 0) continue; // A8's count is what catches an unenumerable set
    const missing = ids.filter((id) => !Object.prototype.hasOwnProperty.call(items, id));
    if (missing.length > 0) {
      problems.push(`A2b: mathLessonWorkings.${lessonId}: ${missing.length} of ${ids.length} item(s) have no working — [${missing.join(", ")}] — a set is authored whole, never half`);
    }
  }

  // ---- A4: the last step states THAT item's answer --------------------------
  for (const [lessonId, items] of Object.entries(workings || {})) {
    const set = (sets || {})[lessonId];
    if (!set || !items || typeof items !== "object") continue;
    const answers = Object.fromEntries(itemsOf(set).map((i) => [i.id, i.answer]));
    for (const [itemId, steps] of Object.entries(items)) {
      const answer = answers[itemId];
      if (!answer || !Array.isArray(steps) || steps.length === 0) continue; // A1 owns those
      const last = steps[steps.length - 1];
      if (!statesAnswer(last, answer)) {
        problems.push(`A4: mathLessonWorkings.${lessonId}.${itemId}: the last step "${last}" does not state the answer "${answer}"`);
      }
    }
  }

  // ---- A5: per-lesson working BEATS type-level working ----------------------
  // Real-tree form: every authored item resolves, through the shipped resolver,
  // to its own authored steps.
  for (const [lessonId, items] of Object.entries(workings || {})) {
    const type = env.lessonTypes.get(lessonId);
    if (!type) {
      problems.push(`A5: ${lessonId}: no experiment.type in content/mathematics/modules.json, so the reveal cannot be resolved`);
      continue;
    }
    for (const [itemId, steps] of Object.entries(items || {})) {
      const got = working.getLabWorking("mathematics", type, itemId, lessonId);
      if (JSON.stringify(got) !== JSON.stringify(steps)) {
        problems.push(`A5: ${lessonId}/${itemId}: getLabWorking returned ${JSON.stringify(got)} — the lesson's OWN working is ${JSON.stringify(steps)}`);
      }
    }
  }
  // Collision form (fixture trees only): an item id present in BOTH the type
  // table and a lesson's own table must resolve to the lesson's, and the 3-arg
  // call must still resolve to the type's.
  if (env.collision) {
    const { type, itemId, lessonId, typeSteps, lessonSteps } = env.collision;
    const withLesson = working.getLabWorking("mathematics", type, itemId, lessonId);
    if (JSON.stringify(withLesson) !== JSON.stringify(lessonSteps)) {
      problems.push(`A5: collision ${type}/${itemId} with lessonId ${lessonId}: got ${JSON.stringify(withLesson)} — expected the lesson's own working ${JSON.stringify(lessonSteps)}`);
    }
    const typeOnly = working.getLabWorking("mathematics", type, itemId);
    if (JSON.stringify(typeOnly) !== JSON.stringify(typeSteps)) {
      problems.push(`A5: collision ${type}/${itemId} with NO lessonId: got ${JSON.stringify(typeOnly)} — the type table must still answer ${JSON.stringify(typeSteps)}`);
    }
  }

  // ---- A6: a lesson that owns a set NEVER falls through ---------------------
  // Real-tree form, and it bites: every per-lesson item that is not authored
  // must be null even though the type table is reachable.
  for (const lessonId of liveIds) {
    const type = env.lessonTypes.get(lessonId);
    for (const { id: itemId } of itemsOf(sets[lessonId])) {
      const authored = workings?.[lessonId]?.[itemId];
      if (authored) continue;
      const got = working.getLabWorking("mathematics", type, itemId, lessonId);
      if (got !== null) {
        problems.push(`A6: ${lessonId}/${itemId}: no working is authored for this item, yet getLabWorking returned ${JSON.stringify(got)} — it fell through to another table`);
      }
    }
  }
  if (env.collision) {
    const { type, itemId, lessonId, otherLessonId } = env.collision;
    if (otherLessonId) {
      const got = working.getLabWorking("mathematics", type, itemId, otherLessonId);
      if (got !== null) {
        problems.push(`A6: collision ${type}/${itemId} with lessonId ${otherLessonId} (no authored working): got ${JSON.stringify(got)} — a lesson with no working of its own must never borrow another's`);
      }
    }
  }

  // ---- A7: the nine type-level blocks still resolve WITHOUT a lessonId ------
  // Plain containment here, exactly as tools/check-show-your-work.mjs has always
  // checked them: this PR must not change what the type table does, so it must
  // not impose a stricter rule on it either.
  const blocks = typeBlocksOf(env.ddSource);
  const blockTypes = Object.keys(blocks);
  if (blockTypes.length !== 9) {
    problems.push(`A7: the subjectTypeSets mathematics block has ${blockTypes.length} type blocks — expected 9`);
  }
  for (const type of blockTypes) {
    for (const { id: itemId, answer } of blocks[type]) {
      const steps = working.getLabWorking("mathematics", type, itemId); // 3-arg, unchanged
      if (!steps) { problems.push(`A7: ${type}/${itemId}: the 3-argument lookup returned null — the type table stopped answering`); continue; }
      if (steps.length < 2) problems.push(`A7: ${type}/${itemId}: the type-level working is a single line`);
      if (!answer || !statesAnswer(steps[steps.length - 1], answer, { tokenBoundary: false })) {
        problems.push(`A7: ${type}/${itemId}: the last step "${steps[steps.length - 1]}" does not state the answer "${answer}"`);
      }
    }
  }
  if (!env.sywSource.includes('getLabWorking("mathematics", type, id)')) {
    problems.push("A7: tools/check-show-your-work.mjs no longer makes the 3-argument call — the independent witness that the type table works is gone");
  }

  // ---- A8: ANSWER-ALWAYS — all 205 per-lesson items reveal their answer -----
  let revealed = 0;
  for (const lessonId of liveIds) {
    const type = env.lessonTypes.get(lessonId);
    for (const { id: itemId, answer } of itemsOf(sets[lessonId])) {
      const r = working.labReveal({ subjectId: "mathematics", experimentType: type, itemId, lessonId, answer });
      revealed += 1;
      if (!r) { problems.push(`A8: ${lessonId}/${itemId}: labReveal returned null — a wrong drop would show no answer at all`); continue; }
      if (r.answer !== answer) problems.push(`A8: ${lessonId}/${itemId}: labReveal returned answer ${JSON.stringify(r.answer)} — expected ${JSON.stringify(answer)}`);
      if (!Array.isArray(r.steps)) problems.push(`A8: ${lessonId}/${itemId}: labReveal.steps must be an array`);
    }
  }
  if (env.expectedItems !== undefined && revealed !== env.expectedItems) {
    problems.push(`A8: walked ${revealed} per-lesson items — expected ${env.expectedItems}`);
  }

  // ---- A9: no invented steps ------------------------------------------------
  for (const lessonId of liveIds) {
    const type = env.lessonTypes.get(lessonId);
    for (const { id: itemId, answer } of itemsOf(sets[lessonId])) {
      const r = working.labReveal({ subjectId: "mathematics", experimentType: type, itemId, lessonId, answer });
      if (!r) continue; // A8 owns that
      const authored = workings?.[lessonId]?.[itemId];
      if (!authored && r.steps.length !== 0) {
        problems.push(`A9: ${lessonId}/${itemId}: no working is authored, so steps must be exactly [] — got ${JSON.stringify(r.steps)}`);
      }
      if (authored && JSON.stringify(r.steps) !== JSON.stringify(authored)) {
        problems.push(`A9: ${lessonId}/${itemId}: labReveal returned ${JSON.stringify(r.steps)} — expected exactly the authored ${JSON.stringify(authored)}`);
      }
    }
  }

  // ---- A10: nothing reveals for another subject, or for a blank answer ------
  for (const subjectId of ["physics", "chemistry", "biology", "english-a", "social-studies", "city-guilds-mathematics", "", null]) {
    const r = working.labReveal({ subjectId, experimentType: "interactive-quiz", itemId: "r1", answer: "16" });
    if (r !== null) problems.push(`A10: labReveal revealed for subject ${JSON.stringify(subjectId)} — the reveal is Mathematics-only`);
  }
  for (const answer of [null, undefined, "", "   "]) {
    const r = working.labReveal({ subjectId: "mathematics", experimentType: "interactive-quiz", itemId: "r1", answer });
    if (r !== null) problems.push(`A10: labReveal returned a reveal for a blank answer (${JSON.stringify(answer)})`);
  }
  if (working.labReveal({}) !== null) problems.push("A10: labReveal with no arguments must return null");

  // ---- A11: REVEAL_SUBJECTS is exactly {"mathematics"}, exported and used ---
  const revealSubjects = working.REVEAL_SUBJECTS;
  const listed = revealSubjects instanceof Set ? [...revealSubjects].sort().join(",") : String(revealSubjects);
  if (listed !== "mathematics") {
    problems.push(`A11: REVEAL_SUBJECTS must be a Set holding exactly "mathematics" — got ${listed}`);
  }
  if (!env.workingSrc.includes("REVEAL_SUBJECTS.has(subjectId)")) {
    problems.push("A11: labReveal does not consult REVEAL_SUBJECTS — the named Set would be decorative");
  }

  // ---- A12: the call site passes lessonId (and no longer bypasses the rule) --
  const callAt = env.ddSource.indexOf("labReveal({");
  if (callAt === -1) {
    problems.push("A12: DragDropLabel.jsx never calls labReveal — the answer-always rule would be unreachable");
  } else {
    const closeAt = env.ddSource.indexOf("})", callAt);
    const call = env.ddSource.slice(callAt, closeAt === -1 ? callAt + 400 : closeAt);
    for (const key of ["subjectId", "experimentType", "itemId", "lessonId", "answer"]) {
      if (!new RegExp(`\\b${key}\\s*[,:]`).test(call)) {
        problems.push(`A12: the labReveal call site in DragDropLabel.jsx does not pass ${key}`);
      }
    }
    if (!/answer:\s*correctAnswerFor\(itemId\)/.test(call)) {
      problems.push("A12: the call site does not pass the set's own correctAnswerFor(itemId) as the answer");
    }
  }
  if (env.ddSource.includes("getLabWorking")) {
    problems.push("A12: DragDropLabel.jsx still calls getLabWorking directly — the reveal rule must live in labReveal, not be re-derived in JSX");
  }

  // ---- A13: the old `steps && answer` gate is gone --------------------------
  // The wrong branch must build the reveal from labReveal's result ALONE. Any
  // extra condition on `steps` re-creates the bug: no authored working would mean
  // no answer shown, which is the whole defect this PR removes.
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const dropAt = env.ddSource.indexOf("const revealed = labReveal(");
  const setAt = dropAt === -1 ? -1 : env.ddSource.indexOf("setReveal(", dropAt);
  const setLine = setAt === -1 ? "" : env.ddSource.slice(setAt, env.ddSource.indexOf("\n", setAt));
  const WANTED = "setReveal(revealed ? { label: displayLabel(itemId), ...revealed } : null);";
  if (!norm(setLine).includes(norm(WANTED))) {
    problems.push(`A13: the wrong branch must set the reveal from labReveal alone, with no condition on steps — got: ${norm(setLine) || "(no setReveal after the labReveal call)"}`);
  }
  if (/\bsteps\s*&&\s*[\w.]*\banswer\b/.test(env.ddSource)) {
    problems.push('A13: the old "steps && answer" gate is back in DragDropLabel.jsx — it suppresses the answer whenever no working is authored, which is exactly the bug');
  }

  // ---- A14: the title distinguishes working-present from answer-only --------
  const revealAt = env.ddSource.indexOf("const revealEl");
  const revealSlice = revealAt === -1 ? "" : env.ddSource.slice(revealAt, env.ddSource.indexOf("const actionsEl", revealAt));
  if (revealAt === -1) {
    problems.push("A14: DragDropLabel.jsx no longer builds a reveal element");
  } else {
    if (!revealSlice.includes("here's the working for")) problems.push('A14: no "here\'s the working for …" title for the case where the working exists');
    if (!revealSlice.includes("the answer for")) problems.push('A14: no "the answer for …" title for the answer-only case');
    if (!/reveal\.steps\s*&&\s*reveal\.steps\.length\s*>\s*0/.test(revealSlice)) {
      problems.push("A14: the title does not branch on whether steps are present");
    }
  }

  // ---- A15: the neighbouring harnesses' anchors still hold ------------------
  const anchors = ["const subjectTypeSets = {", "  mathematics: {", "  physics: {"];
  let from = 0;
  for (const anchor of anchors) {
    const at = env.ddSource.indexOf(anchor, from);
    if (at === -1) problems.push(`A15: DragDropLabel.jsx no longer contains the slicing anchor ${JSON.stringify(anchor)} that tools/check-show-your-work.mjs relies on`);
    else from = at;
  }
  if (!env.sywSource.includes('ddSource.indexOf("const subjectTypeSets = {")')) {
    problems.push("A15: tools/check-show-your-work.mjs no longer slices on the subjectTypeSets anchor");
  }
  for (const heading of ["<h4>{set.title}</h4>", "<p>{set.subtitle}</p>"]) {
    if (!env.ddSource.includes(heading)) {
      problems.push(`A15: DragDropLabel.jsx no longer renders ${heading} — tools/check-play-copy.mjs's Play-tab heading rule has nothing to compare`);
    }
  }
  // check-play-copy does not text-slice that JSX; it resolves the heading through
  // labActivityLabel and compares it to each set's title, so what it depends on is
  // the lessonSets import and the per-set title.
  if (!env.playCopySource.includes('src/components/lessonSets.js')) {
    problems.push("A15: tools/check-play-copy.mjs no longer imports lessonSets.js");
  }
  if (!env.playCopySource.includes("set.title")) {
    problems.push("A15: tools/check-play-copy.mjs no longer compares a Play-tab heading to set.title");
  }

  // ---- A16: the nine type-level blocks are byte-for-byte unchanged ----------
  const block = mathBlockOf(env.ddSource);
  if (!block) {
    problems.push("A16: could not slice the subjectTypeSets mathematics block");
  } else {
    const md5 = createHash("md5").update(block).digest("hex");
    if (md5 !== PINNED_MATH_BLOCK_MD5) {
      problems.push(`A16: the subjectTypeSets mathematics block changed (md5 ${md5}, pinned ${PINNED_MATH_BLOCK_MD5}) — the nine type-level blocks must stay byte-for-byte identical`);
    }
    for (const type of blockTypes) {
      const tableIds = Object.keys((working.mathLabWorkings || {})[type] || {}).sort();
      const blockIds = blocks[type].map((i) => i.id).sort();
      if (tableIds.join(",") !== blockIds.join(",")) {
        problems.push(`A16: ${type}: mathLabWorkings has [${tableIds.join(", ")}] but the component's set has [${blockIds.join(", ")}]`);
      }
    }
    const tableTypes = Object.keys(working.mathLabWorkings || {}).sort();
    if (tableTypes.join(",") !== blockTypes.slice().sort().join(",")) {
      problems.push(`A16: mathLabWorkings keys [${tableTypes.join(", ")}] differ from the component's type blocks [${blockTypes.join(", ")}]`);
    }
  }

  // ---- A17: the coverage figure is derived from data, and its arithmetic ----
  // Added 2026-11-10 (backfill slice F) because the coverage number quoted in
  // reports was 4 too high: the four mat-stat-* lessons were counted twice. The
  // figure is now computed here and PRINTED by the harness, and these assertions
  // are what make the printed sentence true — a hand-derived number that
  // disagrees has to disagree with a red harness, not with a footnote.
  const cov = coverageOf(env);
  const notLive = cov.authoredSets.filter((id) => !cov.setsOwning.includes(id));
  if (notLive.length > 0) {
    problems.push(`A17: ${notLive.length} authored key(s) are not live per-lesson sets: [${notLive.join(", ")}] — working that reveals in no lesson cannot count towards coverage`);
  }
  if (cov.authoredOwning.length !== cov.authoredSets.length) {
    problems.push(`A17: ${cov.authoredSets.length} authored key(s) but only ${cov.authoredOwning.length} of them land on a live set — the coverage figure would be inflated`);
  }
  if (cov.authoredOwning.length + cov.pendingOwning.length !== cov.setsOwning.length) {
    problems.push(`A17: coverage arithmetic broken: ${cov.authoredOwning.length} authored + ${cov.pendingOwning.length} still-PENDING = ${cov.authoredOwning.length + cov.pendingOwning.length}, but ${cov.setsOwning.length} lesson(s) own a per-lesson set`);
  }
  const notLessons = cov.setsOwning.filter((id) => !cov.lessons.includes(id));
  if (notLessons.length > 0) {
    problems.push(`A17: ${notLessons.length} live per-lesson set(s) are not lesson ids in content/mathematics/modules.json: [${notLessons.join(", ")}] — a module id would inflate the denominator`);
  }
  // The lesson list is derived twice, by different walks: modules[].lessons[]
  // above, and lessonTypesOf()'s `experiment.type` walk. A module id leaking in
  // (no experiment.type) or a lesson losing its experiment breaks this.
  const typeLessonIds = [...env.lessonTypes.keys()];
  const onlyStruct = cov.lessons.filter((id) => !typeLessonIds.includes(id));
  const onlyTypes = typeLessonIds.filter((id) => !cov.lessons.includes(id));
  if (onlyStruct.length > 0 || onlyTypes.length > 0) {
    problems.push(`A17: the lesson list from modules[].lessons[] ([${onlyStruct.join(", ")}]) disagrees with the one from experiment.type ([${onlyTypes.join(", ")}])`);
  }

  // ---- A18: every DragDropLabel lesson reveals a METHOD, per item ------------
  // The coverage line above counts the 48 set-owning lessons and says the rest
  // "resolve through the type table". A18 is what makes the rest of that
  // sentence true for the nine lessons that render the shared drag lab: it walks
  // the items the student actually sees and fails, by lesson and item, when the
  // reveal is the answer with no method.
  {
    const walk = revealWalkOf(env);
    problems.push(...walk.problems);
  }

  // ---- A19: the measurement tools' tasks, so the "not walked" line cannot drift
  // A18 cannot see perimeter-area or volume-capacity: they render a tool, not a
  // drag lab. A19 is what keeps the printed sentence true — the tasks in
  // src/data/measurementTasks.js must be keyed to EXACTLY the lessons the router
  // sends to <AreaBuilder /> and <VolumeFiller />. No more (a task on a lesson
  // whose Play tab shows another tool) and no fewer (a routed lesson with no
  // question, whose Play tab would reveal nothing at all).
  {
    const groups = mathTypeGroupsOf(env.sandboxSource);
    const routed = (env.lessonIds || [])
      .filter((id) => {
        const t = (env.lessonTypes || new Map()).get(id);
        return groups.area.has(t) || groups.volume.has(t);
      })
      .sort();
    const tasks = env.measurementTasks || {};
    const keyed = Object.keys(tasks).sort();
    if (routed.length === 0) {
      problems.push("A19: no Mathematics lesson is routed to a measurement tool — the router or the type sets changed and this assertion is now testing nothing");
    }
    const missing = routed.filter((id) => !keyed.includes(id));
    const extra = keyed.filter((id) => !routed.includes(id));
    if (missing.length > 0) {
      problems.push(`A19: ${missing.length} lesson(s) render a measurement tool and carry no task in src/data/measurementTasks.js: [${missing.join(", ")}] — nothing there is answerable, so no reveal can fire`);
    }
    if (extra.length > 0) {
      problems.push(`A19: measurementTasks is keyed to [${extra.join(", ")}], which render no measurement tool (the routed lessons are [${routed.join(", ")}])`);
    }
    for (const [lessonId, list] of Object.entries(tasks)) {
      if (!Array.isArray(list) || list.length === 0) {
        problems.push(`A19: ${lessonId}: has no task`);
        continue;
      }
      for (const t of list) {
        if (!t || !t.answer) problems.push(`A19: ${lessonId}/${t && t.id}: the task has no answer, so a wrong answer would reveal nothing`);
        if (!t || !Array.isArray(t.steps) || t.steps.length === 0) {
          problems.push(`A19: ${lessonId}/${t && t.id}: the task has no steps — the reveal would be the answer with NO method`);
        }
      }
    }
  }

  return problems;
}

// ---------------------------------------------------------------------------
// --selftest: a synthetic fixture with one authored lesson, so the assertions
// are proved to run on data they have never seen. No real run is performed.
// ---------------------------------------------------------------------------
if (SELFTEST) {
  section("selftest: a well-formed fixture yields zero problems");
  const FX_LESSON = "profit-loss-and-discounts";
  const fxSet = lessonSets.mathematics[FX_LESSON];
  const fxItems = itemsOf(fxSet);
  const fxWorkings = {
    [FX_LESSON]: Object.fromEntries(fxItems.map((it) => [it.id, [`Read the question for "${it.id}"`, `so the answer is ${it.answer}`]])),
  };
  const fxWorkingsSrc = `export const mathLessonWorkings = ${JSON.stringify(fxWorkings, null, 2)};\n`;
  const fixture = await treeEnv({ workingsSrc: fxWorkingsSrc });
  fixture.sets = { [FX_LESSON]: fxSet };
  // The fixture is a ONE-LESSON tree, so its lesson list must be one lesson too:
  // A18 walks `lessonIds` against `sets`, and a fixture that keeps the real 63
  // lessons while shipping one set is a tree no real run can produce (every other
  // lesson would look like it lost its set). Narrowing it here keeps the fixture
  // self-consistent instead of giving A18 an off-switch the real run could use.
  fixture.lessonIds = [FX_LESSON];
  fixture.lessonTypes = new Map([[FX_LESSON, "matching-game"]]);
  // …and its measurement-task table is empty for the same reason: A19 compares
  // the table against the lesson list, and a one-lesson fixture that kept the
  // real two-entry table would be a tree no real run can produce.
  fixture.measurementTasks = {};
  fixture.pending = [];
  fixture.expectedItems = fxItems.length;
  const clean = revealProblems(fixture);
  ok(clean.length === 0, `selftest: a well-formed fixture yields zero problems (got ${clean.length}: ${clean.join(" | ")})`);

  section("selftest: the same assertions must FAIL on doctored fixtures");
  // (1) an authored entry for a lesson that does not own a set.
  // The example is DERIVED from the shipped tree, not typed: the hardcoded
  // "mat-geo-bearings" was a lesson that owned no set until Slice 5 gave it one,
  // at which point this control silently stopped testing A1 at all.
  const FX_NON_OWNER = JSON.parse(read("content/mathematics/modules.json"))
    .flatMap((m) => (m.lessons || []).map((l) => l.id))
    .find((id) => !lessonSets.mathematics[id]);
  ok(typeof FX_NON_OWNER === "string" && FX_NON_OWNER.length > 0,
    "selftest: the tree still has a lesson that owns no per-lesson set to doctor");
  const badLesson = await treeEnv({ workingsSrc: `export const mathLessonWorkings = { "${FX_NON_OWNER}": { p1: ["a", "b"] } };\n` });
  badLesson.sets = { [FX_LESSON]: fxSet };
  badLesson.pending = [FX_LESSON];
  const badLessonProblems = revealProblems(badLesson);
  ok(badLessonProblems.some((p) => new RegExp(`^A1: mathLessonWorkings\\.${FX_NON_OWNER}: "${FX_NON_OWNER}" is not a lesson that owns a set`).test(p)),
    `selftest: an entry for a non-owning lesson (${FX_NON_OWNER}) fails A1 (${badLessonProblems[0] || "no problem"})`);
  // (2) the last step does not state the answer
  const wrongTail = JSON.parse(JSON.stringify(fxWorkings));
  wrongTail[FX_LESSON][fxItems[0].id] = ["work it out", "the answer is 999"];
  const wrongTailProblems = revealProblems({ ...fixture, workings: wrongTail });
  ok(wrongTailProblems.some((p) => /^A4: /.test(p)),
    `selftest: a last step that states the wrong answer fails A4 (${wrongTailProblems[0] || "no problem"})`);
  // (3) a blank answer is never revealed
  const blank = fixture.working.labReveal({ subjectId: "mathematics", experimentType: "matching-game", itemId: fxItems[0].id, answer: "" });
  ok(blank === null, "selftest: a blank answer returns null");
  // (4) a lesson in neither PENDING nor authored is caught
  const uncovered = { ...fixture, sets: { ...fixture.sets, "set-notation": lessonSets.mathematics["set-notation"] } };
  ok(revealProblems(uncovered).some((p) => /^A2: 1 live per-lesson set\(s\) are neither authored nor in PENDING: \[set-notation\]/.test(p)),
    "selftest: an unaccounted live set fails A2");
  // (5) a HALF-authored set is caught (A2b, added 2026-11-08)
  const half = { ...fixture, workings: { [FX_LESSON]: { [fxItems[0].id]: fxWorkings[FX_LESSON][fxItems[0].id] } } };
  const halfProblems = revealProblems(half);
  ok(halfProblems.some((p) => new RegExp(`^A2b: mathLessonWorkings\\.${FX_LESSON}: ${fxItems.length - 1} of ${fxItems.length} item\\(s\\) have no working`).test(p)),
    `selftest: a set with one item authored and the rest blank fails A2b (${halfProblems[0] || "no problem"})`);
  // (6) the item count does not share itemsOf()'s kind→pairs/items shape
  ok(liveItemCount({ a: { kind: "matching", pairs: [{}, {}] } }) === 2,
    "selftest: liveItemCount counts a set's pairs whatever `kind` says");
  ok(liveItemCount({ a: { kind: "match", pairs: [] } }) === 1,
    "selftest: liveItemCount floors a set at one item, so an empty set cannot hide");
  // Same fix as R22, same reason: the expectation is taken from the SAME doctored tree.
  // Borrowing the clean fixture's count (as this did first) made the assertion fire
  // under either implementation, so it could not tell them apart.
  const unenumerableSets = { [FX_LESSON]: { ...fxSet, kind: "matching" } };
  const unenumerable = { ...fixture, sets: unenumerableSets, expectedItems: liveItemCount(unenumerableSets) };
  ok(revealProblems(unenumerable).some((p) => /^A8: walked 0 per-lesson items/.test(p)),
    "selftest: a set whose shape itemsOf() cannot enumerate fails A8, with the count derived from the same doctored tree");

  console.log(`\ncheck-math-working (selftest): ${pass} passed, ${fail} failed`);
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The real run
// ---------------------------------------------------------------------------
const REAL = await realEnv();
section("1. the shipped resolver, on the shipped tree");
{
  const problems = revealProblems(REAL);
  if (problems.length === 0) pass += 1;
  else { fail += problems.length; for (const p of problems) console.log(`FAIL: ${p}`); }
  const authored = Object.keys(REAL.workings).length;
  const liveSets = Object.keys(REAL.sets).length;
  const items = Object.values(REAL.sets).reduce((n, s) => n + itemsOf(s).length, 0);
  const blocks = typeBlocksOf(REAL.ddSource);
  const typeItems = Object.values(blocks).reduce((n, arr) => n + arr.length, 0);
  console.log(`    ${liveSets} per-lesson sets / ${items} items · authored ${authored} · PENDING ${PENDING.length}`);
  console.log(`    ${Object.keys(blocks).length} type-level blocks / ${typeItems} items (3-arg lookup unchanged)`);
  console.log(`    answer-always walked ${items} items; reveal subjects [${[...REAL.working.REVEAL_SUBJECTS].join(", ")}]`);

  // THE COVERAGE LINE — printed, and its numbers asserted to be the derived
  // ones (A17 asserts the arithmetic that makes the sentence true). Quote this
  // line; do not re-derive the figure by hand.
  const cov = coverageOf(REAL);
  const line = coverageLine(cov);
  console.log(`    ${line}`);
  const printed = (line.match(/\d+/g) || []).map(Number);
  ok(
    printed.length === 5 &&
    printed[0] === cov.authoredOwning.length &&
    printed[1] === cov.setsOwning.length &&
    printed[2] === cov.authoredOwning.length &&
    printed[3] === cov.lessons.length &&
    printed[4] === cov.noSet.length,
    `coverage: the printed line's numbers are the derived ones (${line})`
  );

  // THE REVEAL WALK LINE — A18's numbers, printed and asserted to be the
  // derived ones. This is the sentence a report about "a lesson with an answer
  // and no method" is settled by: it names the lessons walked, the items walked,
  // and the lessons that render another tool (with the harness that owns each).
  const walk = revealWalkOf(REAL);
  const dragWalked = walk.walkedLessons.length - walk.ownCount;
  console.log(`    reveal walk: ${walk.walkedLessons.length} of ${REAL.lessonIds.length} lessons carry a method for every item their Play tab renders ` +
    `(${walk.ownCount} own a set + ${dragWalked} resolve through the drag type block) / ${walk.walkedItems} items`);
  // This line named check-mathematics-labs A13/A14 for area and volume, which is
  // FALSE: A13 asserts the tools' copy against the lesson, A14 the tools' own
  // sums. Neither says anything about a reveal, because until 2026-11-18 there
  // was nothing to reveal. tools/check-measurement-reveal.mjs is the harness that
  // asserts it (M1–M6), and A19 below keeps this table in step with the router.
  console.log(`    not walked here: ${walk.notWalked.length} lessons render another tool — graphing (tools/check-graph-reveal.mjs G2), ` +
    `balance (tools/check-show-your-work.mjs §5), area and volume (tools/check-measurement-reveal.mjs M1–M6)`);
  // A printed line that names a harness is a claim about the tree: prove each
  // named file exists, so it cannot name one that was renamed or never shipped.
  for (const named of ["tools/check-graph-reveal.mjs", "tools/check-show-your-work.mjs", "tools/check-measurement-reveal.mjs"]) {
    ok(fs.existsSync(path.join(root, named)),
      `reveal walk: the printed "not walked here" line names ${named}, which does not exist`);
  }
  const setItems = Object.values(REAL.sets).reduce((n, s) => n + itemsOf(s).length, 0);
  const dragItems = walk.walkedItems - setItems;
  const groups = mathTypeGroupsOf(REAL.sandboxSource);
  const walkBlocks = typeBlocksOf(REAL.ddSource);
  const dragBlockItems = REAL.lessonIds
    .filter((id) => !hasOwn(REAL.sets, id) && groups.drag.has(REAL.lessonTypes.get(id)))
    .reduce((n, id) => n + (walkBlocks[REAL.lessonTypes.get(id)] || []).length, 0);
  ok(walk.walkedLessons.length + walk.notWalked.length === REAL.lessonIds.length,
    `reveal walk: the walked lessons (${walk.walkedLessons.length}) plus the other-tool lessons (${walk.notWalked.length}) are all ${REAL.lessonIds.length} Mathematics lessons`);
  ok(dragWalked === dragTypeLessonCount(REAL),
    `reveal walk: the ${dragWalked} drag-type-keyed lessons are exactly the lessons whose type is in MATH_DRAG_TYPES and that own no set (${dragTypeLessonCount(REAL)})`);
  // Not vacuous: the item count the walk reports is checked against the type
  // blocks themselves, so a block that lost an item cannot leave the printed
  // count looking right.
  ok(dragItems > 0 && dragItems === dragBlockItems,
    `reveal walk: the ${dragItems} type-block items walked are the ${dragBlockItems} items the drag blocks hold`);
}

// The number of lessons that own no set and whose experiment.type is one of the
// nine drag types — DERIVED, so the printed drag count cannot drift from it.
function dragTypeLessonCount(env) {
  const groups = mathTypeGroupsOf(env.sandboxSource);
  return (env.lessonIds || []).filter((id) => !hasOwn(env.sets, id) && groups.drag.has(env.lessonTypes.get(id))).length;
}

// ---------------------------------------------------------------------------
// --red-control: every assertion must be proved to bite. Controls that need
// different data drive a temp copy of the REAL resolver.
// ---------------------------------------------------------------------------
if (RED_CONTROL) {
  section("2. red controls — every assertion is proved to bite");
  const results = [];
  // `precondition` is R7's guard (added 2026-11-10, backfill slice C): a control
  // whose own example no longer exists must be reported as MISSED with the
  // reason, never as "caught". Every other control passes no precondition, so
  // this parameter changes nothing about them.
  const red = async (name, why, expect, mutate, precondition) => {
    const pre = precondition ? precondition() : null;
    if (pre) {
      results.push({ name, why, caught: false, missed: [pre] });
      console.log(`  MISSED  ${name} — ${why} (precondition)`);
      console.log(`           ${pre}`);
      return;
    }
    const env = await mutate();
    const problems = revealProblems(env);
    const missed = expect.filter((re) => !problems.some((p) => re.test(p)));
    const caught = missed.length === 0;
    results.push({ name, why, caught, missed });
    const shown = problems.find((p) => expect.some((re) => re.test(p))) || problems[0] || "(no problem at all)";
    console.log(`  ${caught ? "caught  " : "MISSED  "} ${name} — ${why} (${problems.length} problem${problems.length === 1 ? "" : "s"})`);
    console.log(`           ${shown}`);
    if (!caught) for (const re of missed) console.log(`           expected a problem matching ${re} and got none`);
  };
  const workSrc = read("src/data/mathWorking.js");
  const workingsSrc = read("src/data/mathLessonWorkings.js");

  // -------------------------------------------------------------------------
  // The DERIVED example lesson, and the guards that keep it from decaying
  // (see unauthoredExample above). R3, R5, R11 and R12 all need a lesson that
  // owns a set and is STILL UNAUTHORED; that is PENDING[0] at runtime, so no
  // backfill slice has to move a pointer again.
  // -------------------------------------------------------------------------
  const EX = unauthoredExample(REAL);
  const EX_RE = EX.lessonId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const EX_SET = EX.synthetic ? SYNTHETIC_PENDING_SET : REAL.sets[EX.lessonId];
  const EX_FIRST_ITEM = itemsOf(EX_SET)[0].id;

  // Guard 1 — the example is unauthored. A control pointed at an authored
  // lesson passes without proving anything, so this is asserted, not assumed.
  ok(
    EX.synthetic || !Object.prototype.hasOwnProperty.call(REAL.workings, EX.lessonId),
    `red controls: the derived example lesson "${EX.lessonId}" is still UNAUTHORED (it is PENDING[0], not a hand-typed id)`
  );
  // Guard 2 — unauthoredExample THROWS rather than returning an authored id.
  {
    let threw = null;
    try { unauthoredExample({ pending: [EX.lessonId], workings: { [EX.lessonId]: {} } }); } catch (e) { threw = e; }
    ok(threw !== null, "red controls: unauthoredExample() THROWS when PENDING[0] is already authored, instead of handing back a control that cannot fail");
  }
  // Guard 3 — the empty-PENDING fallback works, and the fixture it falls back to
  // is sound: no slice can author that lesson id, and its item id exists in no
  // type table, so a synthetic lesson can never borrow type-level working (which
  // would make R11/R12 unreachable).
  ok(unauthoredExample({ pending: [], workings: REAL.workings }).lessonId === SYNTHETIC_PENDING_LESSON,
    `red controls: with PENDING empty the example falls back to the synthetic fixture "${SYNTHETIC_PENDING_LESSON}"`);
  ok(lessonSets.mathematics[SYNTHETIC_PENDING_LESSON] === undefined,
    `red controls: the synthetic fixture lesson "${SYNTHETIC_PENDING_LESSON}" is not a live set, so no backfill slice can ever author it`);
  ok(REAL.working.getLabWorking("mathematics", "matching-game", itemsOf(SYNTHETIC_PENDING_SET)[0].id) === null,
    "red controls: the synthetic fixture's item id exists in no type-level table, so it cannot resolve through the fall-through path");
  // Guard 4 — the fixture cannot be AUTHORED, which is what makes "no slice can
  // ever author it" a property of the harness rather than a promise in a
  // comment: a working keyed to it is not a live set, so A1 rejects it. (If a
  // future slice could author the fixture, R11/R12 would silently stop
  // discriminating, because the state they need — unauthored — would be gone.)
  {
    const env = await treeEnv({ workingsSrc: `export const mathLessonWorkings = { "${SYNTHETIC_PENDING_LESSON}": { "fixture-p1": ["a", "b"] } };\n` });
    ok(revealProblems(env).some((p) => new RegExp(`^A1: mathLessonWorkings\\.${SYNTHETIC_PENDING_LESSON}: "${SYNTHETIC_PENDING_LESSON}" is not a lesson that owns a set`).test(p)),
      `red controls: a working authored for the synthetic fixture "${SYNTHETIC_PENDING_LESSON}" is REJECTED by A1, so the fixture can never become an authored lesson`);
  }
  console.log(`  example lesson for R3/R5/R11/R12: ${EX.lessonId} (item ${EX_FIRST_ITEM})${EX.synthetic ? " — SYNTHETIC: PENDING is empty" : " — derived from PENDING[0]"}`);
  const NO_SET = noSetLessonId(REAL);
  console.log(`  example lesson for R1/R4: ${NO_SET} — a real lesson that owns no per-lesson set`);

  // A1
  await red("R1", `a working keyed to a lesson that owns no set -> A1 (example ${NO_SET})`,
    [new RegExp(`^A1: mathLessonWorkings\\.${NO_SET}: "${NO_SET}" is not a lesson that owns a set`)],
    () => treeEnv({ workingsSrc: `export const mathLessonWorkings = { "${NO_SET}": { p1: ["a", "b"] } };\n` }));
  await red("R2", "a working keyed to an item id that set does not have -> A1",
    [/^A1: mathLessonWorkings\.profit-loss-and-discounts\.p99/],
    () => treeEnv({ workingsSrc: 'export const mathLessonWorkings = { "profit-loss-and-discounts": { p99: ["a", "b"] } };\n' }));

  // A2 / A3 (data-only, so an in-memory override is enough)
  //
  // The example lesson is DERIVED FROM PENDING[0] AT RUNTIME (2026-11-10,
  // backfill slice C) — it used to be a hand-typed id, and slice A, slice B and
  // slice C each had to move it because they authored it. The RULE of each
  // control is unchanged; only the source of its example moved. `unauthoredExample`
  // throws if the derived lesson turns out to be authored, so this can never
  // quietly become a control that cannot fail.
  await red("R3", `a live set dropped from PENDING and not authored -> A2 (example ${EX.lessonId})`,
    [new RegExp(`^A2: 1 live per-lesson set\\(s\\) are neither authored nor in PENDING: \\[${EX_RE}\\]`)],
    async () => {
      const env = exampleEnv(await realEnv(), EX);
      return { ...env, pending: env.pending.filter((k) => k !== EX.lessonId) };
    });
  // R3b — the state after slice F: PENDING is EMPTY, so authorship is the ONLY
  // route out of A2. Dropping one REAL authored set must red A2 by name; if the
  // empty list had made A2 vacuous, this would pass with no problem at all.
  const R3B_LESSON = "angles-and-polygons";
  await red("R3b", `PENDING empty: a real authored set dropped -> A2 still names it (${R3B_LESSON})`,
    [new RegExp(`^A2: 1 live per-lesson set\\(s\\) are neither authored nor in PENDING: \\[${R3B_LESSON}\\]`)],
    async () => {
      const env = await realEnv();
      const workings = { ...env.workings };
      delete workings[R3B_LESSON];
      return { ...env, workings };
    });
  await red("R4", `PENDING naming a key that is not a live set -> A2 (example ${NO_SET})`,
    [new RegExp(`^A2: PENDING ∪ authored names 1 key\\(s\\) that are not live per-lesson sets: \\[${NO_SET}\\]`)],
    async () => ({ ...(await realEnv()), pending: [...PENDING, NO_SET] }));
  await red("R5", `a lesson authored but left in PENDING -> A3 (example ${EX.lessonId})`,
    [new RegExp(`^A3: 1 lesson\\(s\\) are both authored and PENDING: \\[${EX_RE}\\]`)],
    async () => {
      // The example is authored in a DOCTORED tree while it is still listed in
      // PENDING. The doctored module is the real one plus that one entry, so A3
      // is the only rule this fixture breaks (a module containing nothing but
      // the example would also red A2 for every other pending lesson, which is
      // noise, not evidence).
      const base = exampleEnv(await realEnv(), EX);
      const merged = { ...REAL.workings, [EX.lessonId]: { [EX_FIRST_ITEM]: ["a", "b"] } };
      const env = await treeEnv({ workingsSrc: `export const mathLessonWorkings = ${JSON.stringify(merged, null, 2)};\n` });
      return { ...env, sets: base.sets, pending: base.pending, lessonTypes: base.lessonTypes, expectedItems: base.expectedItems };
    });

  // A2b — item granularity (added 2026-11-08, backfill slice A). A2 is set-level,
  // so this is the only control that proves a HALF-authored set cannot pass.
  await red("R24", "a set with one item authored and the rest blank -> A2b",
    [/^A2b: mathLessonWorkings\.profit-loss-and-discounts: 4 of 5 item\(s\) have no working — \[p2, p3, p4, p5\]/],
    async () => {
      const env = await realEnv();
      const full = env.workings["profit-loss-and-discounts"];
      return { ...env, workings: { ...env.workings, "profit-loss-and-discounts": { p1: full.p1 } } };
    });

  // A4 (including ruling 3's numeric token boundary)
  await red("R6", "a last step that states a different answer -> A4",
    [/^A4: mathLessonWorkings\.profit-loss-and-discounts\.p1:/],
    async () => {
      const env = await treeEnv({ workingsSrc: 'export const mathLessonWorkings = { "profit-loss-and-discounts": { p1: ["Read it", "the answer is 999"] } };\n' });
      return env;
    });
  // R7's RESIDUAL — closed 2026-11-10 (backfill slice C).
  //
  // The control used to pick its answer with `?.answer` and NO guard. If
  // `set-notation` ever lost its purely numeric answer, the selector returned
  // undefined, the doctored step became "= 1undefined", A4 fired for an
  // unrelated reason, and the control still reported "caught" while proving
  // nothing about the token boundary — the exact defect it was fixed for on
  // 2026-11-08. Four guards, all checked BEFORE the control runs; if any stops
  // holding, the control is reported MISSED with the reason instead of passing:
  //   * the item is selected BY ID and must still exist;
  //   * its answer must still be a purely numeric token;
  //   * the glued step must still CONTAIN the answer as a plain substring, so
  //     that plain containment would accept it (otherwise A4 would fire for the
  //     wrong reason and the boundary would never be exercised);
  //   * the token-bounded rule must still REJECT the glued step — that is the
  //     property being proved.
  const R7_LESSON = "set-notation";
  const R7_ITEM = itemsOf(lessonSets.mathematics[R7_LESSON]).find((i) => i.id === "p1");
  const r7Precondition = () => {
    if (!R7_ITEM) return `R7 precondition: ${R7_LESSON} has no item p1 — the control has nothing to doctor`;
    const answer = String(R7_ITEM.answer);
    if (!ITEM_ANSWER_NUMERIC.test(answer)) {
      return `R7 precondition: ${R7_LESSON} p1's answer ${JSON.stringify(R7_ITEM.answer)} is not a purely numeric token, so the token boundary is not what this control would test`;
    }
    const glued = `= 1${answer}`;
    if (!glued.includes(answer)) {
      return `R7 precondition: the doctored step ${JSON.stringify(glued)} does not even contain ${JSON.stringify(answer)}, so A4 would fire for the wrong reason`;
    }
    if (statesAnswer(glued, answer)) {
      return `R7 precondition: the token-bounded rule ACCEPTS ${JSON.stringify(glued)} for ${JSON.stringify(answer)}, so the control can no longer prove the boundary`;
    }
    return null;
  };
  await red("R7", "a numeric answer that only appears inside a longer number -> A4 (token boundary)",
    [new RegExp(`^A4: mathLessonWorkings\\.${R7_LESSON}\\.p1:`)],
    async () => {
      // set-notation p1's real answer is a purely numeric token; glued into a
      // longer number ("= 14") it must NOT count as stating the answer.
      const src = `export const mathLessonWorkings = { "${R7_LESSON}": { p1: ["Read it", "= 1${R7_ITEM.answer}"] } };\n`;
      return treeEnv({ workingsSrc: src });
    },
    r7Precondition);

  // A5 / A6 — the collision fixture. `p1` is given a TYPE-LEVEL entry so the two
  // tables disagree, which is what the no-fall-through rule is for.
  const collisionWorkingSrc = workSrc.replace(
    '    r5: ["BODMAS: brackets first", "2 + 5 = 7", "7 × 3 = 21"],',
    '    r5: ["BODMAS: brackets first", "2 + 5 = 7", "7 × 3 = 21"],\n    p1: ["TYPE-LEVEL step", "type-level answer 999"],'
  );
  const collisionWorkingsSrc = 'export const mathLessonWorkings = { "profit-loss-and-discounts": { p1: ["LESSON-LEVEL step", "lesson answer 111"] } };\n';
  const collisionEnv = async (opts = {}) => {
    const env = await treeEnv({ workingSrc: opts.workingSrc ?? collisionWorkingSrc, workingsSrc: collisionWorkingsSrc });
    env.collision = {
      type: "interactive-quiz",
      itemId: "p1",
      lessonId: "profit-loss-and-discounts",
      otherLessonId: "set-notation",
      typeSteps: ["TYPE-LEVEL step", "type-level answer 999"],
      lessonSteps: ["LESSON-LEVEL step", "lesson answer 111"],
    };
    return env;
  };
  // Positive control first: the REAL resolver is green on this fixture, so the
  // red runs below are a broken resolver and not a broken fixture.
  {
    const env = await collisionEnv();
    const problems = revealProblems(env).filter((p) => /^A[56]: /.test(p));
    ok(problems.length === 0, `red control fixture: the real resolver passes A5/A6 on the collision tree (${problems[0] || "clean"})`);
  }
  await red("R8", "the resolver prefers the TYPE table -> A5 and A6 both fire",
    [/^A5: collision interactive-quiz\/p1/, /^A6: /],
    () => collisionEnv({
      workingSrc: collisionWorkingSrc.replace(
        "  if (ownsLabSet(lessonId)) return stepsAt(mathLessonWorkings, lessonId, itemId);\n  return stepsAt(mathLabWorkings, experimentType, itemId);",
        "  return stepsAt(mathLabWorkings, experimentType, itemId) || stepsAt(mathLessonWorkings, lessonId, itemId);"
      ),
    }));
  await red("R9", "the per-lesson table falls through when it has no entry -> A6 alone",
    [/^A6: /],
    () => collisionEnv({
      workingSrc: collisionWorkingSrc.replace(
        "  if (ownsLabSet(lessonId)) return stepsAt(mathLessonWorkings, lessonId, itemId);\n  return stepsAt(mathLabWorkings, experimentType, itemId);",
        "  if (ownsLabSet(lessonId)) { const own = stepsAt(mathLessonWorkings, lessonId, itemId); if (own) return own; }\n  return stepsAt(mathLabWorkings, experimentType, itemId);"
      ),
    }));

  // A7
  await red("R10", "a type block loses its table entry -> A7",
    [/^A7: trig-circle\/t1: the 3-argument lookup returned null/],
    () => treeEnv({ workingSrc: workSrc.replace('  "trig-circle": {', '  "trig-circle-retired": {') }));

  // A8 / A9 — the two rules this PR exists for. Both need a lesson that owns a
  // set and is STILL UNAUTHORED, which is the derived example (PENDING[0] at
  // runtime) rather than a hand-typed id: profit-loss-and-discounts was the
  // example until slice A authored it, set-notation/venn-diagrams until slice B
  // did, and types-of-numbers until slice C did. The RULE is unchanged — the
  // source of the example is now derived so no slice has to move it again.
  await red("R11", `the old gate: no working means no reveal -> A8 (example ${EX.lessonId}/${EX_FIRST_ITEM})`,
    [new RegExp(`^A8: ${EX_RE}/${EX_FIRST_ITEM.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: labReveal returned null`)],
    async () => exampleEnv(
      await treeEnv({ workingSrc: workSrc.replace("  return { answer, steps: steps || [] };", "  return steps ? { answer, steps } : null;") }),
      EX
    ));
  await red("R12", `a placeholder step invented when none is authored -> A9 (example ${EX.lessonId}/${EX_FIRST_ITEM})`,
    [new RegExp(`^A9: ${EX_RE}/${EX_FIRST_ITEM.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: no working is authored, so steps must be exactly \\[\\]`)],
    async () => exampleEnv(
      await treeEnv({ workingSrc: workSrc.replace("  return { answer, steps: steps || [] };", '  return { answer, steps: steps || ["work it out"] };') }),
      EX
    ));

  // A10 / A11
  await red("R13", "the reveal widened to another subject -> A10",
    [/^A10: labReveal revealed for subject "physics"/],
    () => treeEnv({ workingSrc: workSrc.replace('export const REVEAL_SUBJECTS = new Set(["mathematics"]);', 'export const REVEAL_SUBJECTS = new Set(["mathematics", "physics"]);') }));
  await red("R14", "a blank answer allowed through -> A10",
    [/^A10: labReveal returned a reveal for a blank answer \(""\)/],
    () => treeEnv({ workingSrc: workSrc.replace('  if (String(answer).trim() === "") return null;\n', "") }));
  await red("R15", "REVEAL_SUBJECTS emptied -> A11 (and A8, since nothing reveals)",
    [/^A11: REVEAL_SUBJECTS must be a Set holding exactly "mathematics"/],
    () => treeEnv({ workingSrc: workSrc.replace('export const REVEAL_SUBJECTS = new Set(["mathematics"]);', "export const REVEAL_SUBJECTS = new Set([]);") }));

  // A12–A14 — the component, mutated in memory.
  const ddSource = read("src/components/DragDropLabel.jsx");
  await red("R16", "the call site stops passing lessonId -> A12",
    [/^A12: the labReveal call site in DragDropLabel\.jsx does not pass lessonId/],
    async () => ({ ...(await realEnv()), ddSource: ddSource.replace("        lessonId,\n", "") }));
  await red("R17", "the old steps && answer gate put back -> A13",
    [/^A13: the old "steps && answer" gate is back/],
    async () => ({ ...(await realEnv()), ddSource: ddSource.replace("      setReveal(revealed ? { label: displayLabel(itemId), ...revealed } : null);", "      setReveal(revealed && revealed.steps && revealed.answer ? { label: displayLabel(itemId), ...revealed } : null);") }));
  await red("R18", "one title for both cases -> A14",
    [/^A14: no "the answer for …" title for the answer-only case/],
    async () => ({ ...(await realEnv()), ddSource: ddSource.replace('          : `Not quite — the answer for "${reveal.label}"`', '          : `Not quite — here\'s the working for "${reveal.label}"`') }));

  // A15 — the neighbours.
  await red("R19", "the Play-tab heading removed from the component -> A15",
    [/^A15: DragDropLabel\.jsx no longer renders <h4>\{set\.title\}<\/h4>/],
    async () => ({ ...(await realEnv()), ddSource: ddSource.replace("      <h4>{set.title}</h4>\n", "") }));
  await red("R20", "check-show-your-work stops slicing on the anchor -> A15",
    [/^A15: tools\/check-show-your-work\.mjs no longer slices on the subjectTypeSets anchor/],
    async () => {
      const env = await realEnv();
      return { ...env, sywSource: env.sywSource.replace('ddSource.indexOf("const subjectTypeSets = {")', 'ddSource.indexOf("const somethingElse = {")') };
    });

  // A16 — one byte inside the type-level block.
  await red("R21", "a type-level block edited -> A16 (byte pin)",
    [/^A16: the subjectTypeSets mathematics block changed \(md5 /],
    async () => ({ ...(await realEnv()), ddSource: ddSource.replace('      title: "Find the Hypotenuse",', '      title: "Find the Hypotenuse!",') }));

  // A8's independent count — the two halves of the 2026-11-08 fix. Before it,
  // liveItemCount() walked the same kind→pairs/items shape as itemsOf(), so a
  // set it could not enumerate made BOTH numbers smaller by the same amount and
  // A8 stayed green (this is the gate's RC8, which the old literal 181 caught).
  //
  // R22 was RELABELLED 2026-11-09 (the property it guards is real; the label lied).
  // As first written it doctored `env.sets` but borrowed `expectedItems` from the
  // REAL tree, so the expectation was ALL_ITEMS whether the count walked itemsOf()'s
  // shape or the raw arrays — the control fired under BOTH, for a reason that had
  // nothing to do with the fix (the gate's MUT2: put the old shape walk back and R22
  // still passed). It now derives the expectation from the SAME doctored tree, which
  // is the only version that separates the two implementations.
  const VENN_ITEMS = (lessonSets.mathematics["venn-diagrams"].pairs || []).length
    + (lessonSets.mathematics["venn-diagrams"].items || []).length;
  const ALL_ITEMS = liveItemCount(lessonSets.mathematics);
  await red("R22", "a set whose shape itemsOf() cannot enumerate -> A8, with the expectation derived from the SAME doctored tree (a count that shared itemsOf()'s shape would agree with the walk and stay silent)",
    [new RegExp(`^A8: walked ${ALL_ITEMS - VENN_ITEMS} per-lesson items — expected ${ALL_ITEMS}`)],
    async () => {
      const env = await realEnv();
      const real = env.sets["venn-diagrams"];
      // kind "matching" is not a shape itemsOf() knows, but the pairs are still
      // there — the independent count must still see them. The expectation is
      // recomputed from THIS tree on purpose: a count that shares itemsOf()'s shape
      // would say 0 for this set, agree with A8's walk of 0, and stay silent.
      const doctored = { ...env.sets, "venn-diagrams": { ...real, kind: "matching" } };
      return { ...env, sets: doctored, expectedItems: liveItemCount(doctored) };
    });
  await red("R23", "a live set with no items at all -> A8 (each set floors at one item)",
    [new RegExp(`^A8: walked ${ALL_ITEMS - VENN_ITEMS} per-lesson items — expected ${ALL_ITEMS - VENN_ITEMS + 1}`)],
    async () => {
      const env = await realEnv();
      const real = env.sets["venn-diagrams"];
      const doctored = { ...env.sets, "venn-diagrams": { ...real, kind: "match", pairs: [] } };
      // expectedItems is recomputed from the doctored sets on purpose: this
      // control is the tree where a set lost every item, so the expectation is
      // the one that tree would derive — and the floor makes it 1, not 0, so
      // the walk comes up short by exactly one and A8 fires.
      return { ...env, sets: doctored, expectedItems: liveItemCount(doctored) };
    });

  // A17 — the coverage figure. A live set that is not a lesson id in
  // modules.json must red it: that is the shape of the mistake that inflated the
  // quoted figure (a set counted as a lesson it is not). It is added to PENDING
  // and to lessonTypes as well, so A2 and A5 stay silent and A17 is the rule
  // that catches it.
  await red("R25", "a live per-lesson set that is not a lesson id in modules.json -> A17 (coverage denominator)",
    [/^A17: 1 live per-lesson set\(s\) are not lesson ids in content\/mathematics\/modules\.json/],
    async () => {
      const env = await realEnv();
      return {
        ...env,
        sets: { ...env.sets, [SYNTHETIC_PENDING_LESSON]: SYNTHETIC_PENDING_SET },
        pending: [SYNTHETIC_PENDING_LESSON],
        lessonTypes: new Map([...env.lessonTypes, [SYNTHETIC_PENDING_LESSON, "matching-game"]]),
      };
    });

  // A18 — the reveal walk (added 2026-11-18 with the walk itself). Three states
  // it must name. Every example is DERIVED from the tree, so a slice that
  // authors or retires a lesson cannot rot a control into passing on nothing.
  const DRAG_GROUPS = mathTypeGroupsOf(REAL.sandboxSource);
  const DRAG_EX = (REAL.lessonIds || []).find((id) => !hasOwn(REAL.sets, id) && DRAG_GROUPS.drag.has(REAL.lessonTypes.get(id)));
  if (!DRAG_EX) {
    throw new Error("red controls: no lesson resolves through the drag type block, so A18's controls have no example and would pass without proving anything");
  }
  const DRAG_EX_TYPE = REAL.lessonTypes.get(DRAG_EX);
  const DRAG_EX_ITEMS = typeBlocksOf(REAL.ddSource)[DRAG_EX_TYPE] || [];
  if (DRAG_EX_ITEMS.length === 0) {
    throw new Error(`red controls: the "${DRAG_EX_TYPE}" block holds no items, so A18's controls have no example item`);
  }
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const DRAG_EX_RE = escapeRe(DRAG_EX);
  const DRAG_EX_FIRST = DRAG_EX_ITEMS[0].id;
  console.log(`  example lesson for R26/R27/R28: ${DRAG_EX} (${DRAG_EX_TYPE}, ${DRAG_EX_ITEMS.length} items) — a lesson that owns no set and renders the drag lab`);
  // The state the 2026-11-18 audit reported: the correct answer, steps: [].
  // Caught by A18 ALONE — A7 makes the 3-argument call with no lessonId, and
  // A8/A9 walk only the set-owning lessons, so neither can see this lesson.
  await red("R26", `a drag-type lesson whose reveal is the answer with NO method -> A18 (example ${DRAG_EX}/${DRAG_EX_FIRST})`,
    [new RegExp(`^A18: ${DRAG_EX_RE}/${escapeRe(DRAG_EX_FIRST)}: the Play tab reveals the correct answer .* with NO method`)],
    async () => {
      const env = await realEnv();
      return {
        ...env,
        working: {
          ...env.working,
          labReveal: (args) => {
            const r = env.working.labReveal(args);
            return r && args && args.lessonId === DRAG_EX ? { ...r, steps: [] } : r;
          },
        },
      };
    });
  // An item the resolver has never been taught, rendered by the Play tab: the
  // block gains a pair, so the reveal for it can only be the answer with no method.
  await red("R27", `an item added to a rendered type block -> A18 (${DRAG_EX_TYPE}/red-control-item)`,
    [new RegExp(`^A18: ${DRAG_EX_RE}/red-control-item: the Play tab reveals the correct answer "red control answer" with NO method`)],
    async () => {
      const env = await realEnv();
      return { ...env, ddSource: addTypeBlockPair(env.ddSource, DRAG_EX_TYPE, '{ id: "red-control-item", target: "red control answer", label: "red control label" },') };
    });
  // A lesson whose type is in no group at all: its Play tab falls to the
  // Mathematics flashcard deck, so nothing there can reveal a method. In this
  // harness A18 is the only assertion that names it.
  await red("R28", `a lesson whose type is in no group -> A18 (${DRAG_EX})`,
    [new RegExp(`^A18: 1 lesson\\(s\\) are neither walked nor rendered by another tool: \\[${DRAG_EX_RE}\\]`)],
    async () => {
      const env = await realEnv();
      return { ...env, lessonTypes: new Map([...env.lessonTypes, [DRAG_EX, "no-such-type"]]) };
    });

  // A19's two halves. R29 drops a routed lesson's task (the Play tab would have
  // nothing answerable); R30 keeps the task but keys it to a lesson that renders
  // another tool (one lesson's question inside another lesson's Play tab).
  await red("R29", "a lesson routed to a measurement tool loses its task -> A19",
    [/^A19: 1 lesson\(s\) render a measurement tool and carry no task in src\/data\/measurementTasks\.js: \[perimeter-area\]/],
    async () => {
      const env = await realEnv();
      const tasks = { ...env.measurementTasks };
      delete tasks["perimeter-area"];
      return { ...env, measurementTasks: tasks };
    });
  await red("R30", "a measurement task keyed to a lesson that renders another tool -> A19",
    [/^A19: measurementTasks is keyed to \[real-numbers\], which render no measurement tool/],
    async () => {
      const env = await realEnv();
      return { ...env, measurementTasks: { ...env.measurementTasks, "real-numbers": [{ id: "red-control-task", answer: "x", steps: ["x"] }] } };
    });

  const caught = results.filter((r) => r.caught).length;
  const stillGreen = revealProblems(REAL).length === 0;
  console.log(`\n  shipped tree still green: ${stillGreen ? "yes" : "NO"}`);
  console.log(`RED CONTROLS: ${caught}/${results.length} caught`);
  if (!stillGreen) { fail += 1; console.log("FAIL: the shipped tree is not green after the controls"); }
  if (caught !== results.length) fail += 1;
  else pass += 1;
}

for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
console.log(`\ncheck-math-working: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
