#!/usr/bin/env node
// Harness: the Mathematics Play tab — one lab for every lesson, exactly once.
//
// Mathematics is a PARTITION, not a one-set-per-lesson subject like Physics.
// 63 lessons split in two, and every lesson is in exactly one half:
//
//   * 48 lessons carry their own per-lesson set in lessonSets.mathematics — the
//     24 that predate the corpus rule plus the coverage build's additions. A set
//     always wins: the per-lesson branch is consulted BEFORE the experiment-type
//     library (assertion 12c), so these lessons render their own set even where
//     their experiment.type would also resolve to a tool;
//   * 15 lessons are TYPE-KEYED — their experiment.type already resolves to a
//     dedicated tool (DragDropLabel, GraphingCalculator, BalanceScale,
//     AreaBuilder or VolumeFiller), and a per-lesson set would SHADOW that
//     tool. 9 of the 15 are MATH_DRAG_TYPES; the other 6 are the 3 graphing
//     lessons and the 3 measurement-tool lessons, which is why the message says
//     "would shadow its dedicated tool" and not "its type library" (the Physics
//     wording, tools/check-physics-gap-labs.mjs:54 — Physics has no graphing
//     lessons, so that wording would be wrong here).
//
// It replaces tools/check-math-gap-labs.mjs, which pinned the 24 ids and 15 ids
// as two hand-written arrays and could not survive the coverage build.
//
// THE GRANDFATHER RULE (owner ruling 2026-11-07, option A)
// -------------------------------------------------------
// The corpus rule — "every string a lab displays must be taught by that
// lesson's own copy" — CANNOT pass on the 24 sets that predate it. Measured
// 2026-11-07 against main 0824c8d: 22 of the 24 sets fail, 119 individual
// displayed strings are not in their lesson's copy. (The two that pass —
// factorization and union-intersection-complement — do so by luck of short
// literal wording; they are grandfathered with the other 22.) Two causes:
// paraphrase labels ("Perfect square" where the lesson says "prime") and
// superscript-vs-caret notation ("4.5 × 10⁴" displayed, "4.5 × 10^4" in the
// copy — fold() does not normalise superscripts, deliberately: normalising
// would make standard-form pass and quietly destroy the evidence for this
// ruling).
//
// So the rule applies to NEW sets only, and LEGACY_SETS names the 24 that are
// exempt. Assertion 8 holds LEGACY_SETS ∪ new sets === every live set exactly,
// so no set can quietly escape the rule and no legacy key can quietly vanish.
// DO NOT add a key to LEGACY_SETS to silence a failure: a key added there is a
// set the corpus rule will never check again. Assertion 8d makes that advice
// enforceable (2026-11-10): the grandfathered set must be exactly the original
// 24, derived from the live keys, so a new set id added here FAILS the harness.
//
// The corpus rule is NOT vacuous on the real tree: 63 lessons − 15 type-keyed =
// 48 sets, LEGACY_SETS grandfathers 24 of them, so the other 24 shipped sets are
// held to it on every run. labProblems() still takes `legacySets` as a
// PARAMETER defaulting to LEGACY_SETS, and the `legacy-set-forced-*` red
// controls move it — that is what forces a real legacy set through the corpus
// rule as well, on the real data, without one content edit. A rule that cannot
// fail is not a rule.
//
// Usage:
//   node tools/check-mathematics-labs.mjs                          # the real tree + all 27 red controls
//   node tools/check-mathematics-labs.mjs --no-red-control         # the real tree only
//   node tools/check-mathematics-labs.mjs --selftest               # synthetic fixture only
//   node tools/check-mathematics-labs.mjs --red-control <name>     # one control, by name
//
// The red controls run by DEFAULT, because the suite (`npm test` = tools/check-all.sh)
// passes no arguments — a control behind an opt-in flag is a control the suite never runs.
// Run it with the rest before any PR that touches Mathematics labs, routing or content:
//   sh tools/check-all.sh        (or: npm test)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";
import {
  AREA_COPY,
  VOLUME_COPY,
  MEASUREMENT_TOOL_COPY,
  MEASUREMENT_TOOL_LESSONS,
  rectangleWorking,
  circleWorking,
  prismWorking,
  cylinderWorking,
} from "../src/data/measurementTools.js";
import { measurementTasks, MEASUREMENT_TASK_COPY } from "../src/data/measurementTasks.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0;
let fail = 0;
// Module-level assertion helper for the selftest section. labProblems() keeps
// its own counter so it can return problems instead of printing them.
const ok = (cond, msg) => { if (cond) pass += 1; else { fail += 1; console.log(`FAIL: ${msg}`); } };
const section = (t) => console.log(`\n== ${t}`);

const SELFTEST = process.argv.includes("--selftest");
// The controls run by DEFAULT (the suite passes no arguments). `--no-red-control` is the only opt-out;
// `--red-control <name>` runs exactly one of them and nothing else.
const NO_RED_CONTROL = process.argv.includes("--no-red-control");
const ARGV = process.argv.slice(2);
const ONLY_CONTROL = ARGV.includes("--red-control") ? ARGV[ARGV.indexOf("--red-control") + 1] : null;

// ---------------------------------------------------------------------------
// GRANDFATHER LIST — owner ruling 2026-11-07 (option A).
//
// These 24 sets were authored BEFORE the corpus rule ("every displayed string
// must appear in that lesson's own copy"). They cannot satisfy it. Measured
// 2026-11-07 on main 0824c8d: 22 of the 24 sets fail, 119 individual displayed
// strings are not taught by their lesson. The only two that pass do so by luck
// of short literal wording (factorization, union-intersection-complement) —
// they stay in the list.
//
// Verified causes:
//   * PARAPHRASE labels — types-of-numbers displays "Perfect square",
//     "A cube number" and "Neither prime nor square"; none of the three
//     appears in its copy (the lesson says "cubes", "cube root", "prime").
//   * CARET/SUPERSCRIPT notation — standard-form's targets are "4.5 × 10⁴"
//     and "7.2 × 10⁻⁴" while the lesson writes "4.5 × 10^4"; indices-and-surds
//     displays "5⁶ ÷ 5⁴" while its copy writes "5^6 ÷ 5^4". fold() does not
//     normalise superscripts to carets, so these can never match.
//
// The corpus rule therefore applies to NEW sets only (assertion 7), and
// assertion 8 holds LEGACY_SETS ∪ newSetKeys === Object.keys(sets) exactly, so
// no set can quietly escape the rule and no legacy key can quietly disappear.
// DO NOT add a key here to silence a failure. A key added here is a set the
// corpus rule will never check again — assertion 8d fails the harness if you do.
//
// This list is its own literal on purpose: deriving it from lessonSets.js would
// make it change silently the moment a Slice-1 set is added.
// ---------------------------------------------------------------------------
const LEGACY_SETS = [
  "profit-loss-and-discounts",                          // lessonSets.js:5151
  "simple-and-compound-interest",                       // :5163
  "hire-purchase-and-instalments",                      // :5180
  "taxes-and-utility-bills",                            // :5192
  "exchange-rates-and-currency",                        // :5211
  "insurance-and-budgeting",                            // :5223
  "set-notation",                                       // :5244
  "subsets-and-cardinality",                            // :5256
  "venn-diagrams",                                      // :5274
  "union-intersection-complement",                      // :5286
  "shading-venn-regions",                               // :5298
  "set-word-problems",                                  // :5310
  "types-of-numbers",                                   // :5323
  "indices-and-surds",                                  // :5335
  "standard-form",                                      // :5348
  "factorization",                                      // :5360
  "algebraic-fractions",                                // :5372
  "transposition-and-substitution",                     // :5384
  "linear-and-quadratic-graphs",                        // :5396
  "angles-and-polygons",                                // :5408
  "circle-theorems",                                    // :5421
  "transformations",                                    // :5434
  "frequency-tables-and-cumulative-frequency",          // :5446
  "si-units-and-conversion",                            // :5459
];

// ---------------------------------------------------------------------------
// TYPE-KEYED LIST — lessons that MUST NOT carry a per-lesson set: their
// experiment.type already resolves to a dedicated tool, and a set would shadow
// it (assertion 2).
//   9 lessons → MATH_DRAG_TYPES       → DragDropLabel(subjectId, experimentType)
//   1 lesson  → MATH_LINEAR_TYPES     → <GraphingCalculator mode="linear" />
//   1 lesson  → MATH_PARABOLA_TYPES   → <GraphingCalculator mode="parabola" />
//   1 lesson  → MATH_NUMBERLINE_TYPES → <GraphingCalculator mode="number-line" />
//   1 lesson  → MATH_BALANCE_TYPES    → <BalanceScale subjectId="mathematics" … />
//   1 lesson  → MATH_AREA_TYPES       → <AreaBuilder />
//   1 lesson  → MATH_VOLUME_TYPES     → <VolumeFiller />
// i.e. 9 drag + 3 graphing + 3 measurement = 15. Verified lesson-by-lesson
// against content/mathematics/modules.json and src/components/ExperimentSandbox.jsx.
// 63 − 15 = 48.
// ---------------------------------------------------------------------------
const TYPE_KEYED = [
  // --- MATH_DRAG_TYPES (9) — a set would shadow the shared drag lab
  "real-numbers",                    // interactive-quiz      (number-theory-computation)
  "fractions-decimals-percentages",  // visual-converter
  "functions",                       // function-machine      (relations-functions-graphs)
  "pythagoras-theorem",              // interactive-triangle  (geometry-trigonometry)
  "trig-ratios",                     // trig-circle
  "vectors",                         // vector-addition       (vectors-matrices)
  "matrices",                        // matrix-transformer
  "central-tendency",                // data-visualizer       (statistics-probability)
  "probability",                     // probability-sim
  // --- graphing (3) — a set would shadow the GraphingCalculator
  "coordinate-geometry",             // graph-linear          → mode="linear"
  "quadratic-equations",             // graph-plotter         → mode="parabola"
  "inequalities",                    // number-line-plotter   → mode="number-line"
  // --- the three measurement tools (3) — a set would shadow the tool itself
  "algebraic-expressions",           // balance-scale         → <BalanceScale />
  "perimeter-area",                  // area-builder          → <AreaBuilder />
  "volume-capacity",                 // volume-filler         → <VolumeFiller />
];

// The type sets, read out of the routing component rather than retyped. Reading
// them (instead of hardcoding 19 strings) is what makes a type library change
// fail here instead of silently re-partitioning the subject.
const sandboxSrc = read("src/components/ExperimentSandbox.jsx");
const typesOf = (name) => {
  const at = sandboxSrc.indexOf(`const ${name} = new Set([`);
  if (at === -1) return [];
  const end = sandboxSrc.indexOf("]);", at);
  return [...sandboxSrc.slice(at, end).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
};
const REAL_TYPE_GROUPS = {
  drag: new Set(typesOf("MATH_DRAG_TYPES")),                                  // 9
  graphing: new Set([
    ...typesOf("MATH_LINEAR_TYPES"),                                          // 5
    ...typesOf("MATH_PARABOLA_TYPES"),                                        // 1
    ...typesOf("MATH_NUMBERLINE_TYPES"),                                      // 1
  ]),
  balance: new Set(typesOf("MATH_BALANCE_TYPES")),                            // 1
  area: new Set(typesOf("MATH_AREA_TYPES")),                                  // 1
  volume: new Set(typesOf("MATH_VOLUME_TYPES")),                              // 1
};
const recognisedOf = (groups) => new Set([
  ...groups.drag, ...groups.graphing, ...groups.balance, ...groups.area, ...groups.volume,
]);                                                                            // 19 types

// ---------------------------------------------------------------------------
// ASSERTION 8d's ANCHOR — the original 24 grandfathered sets, DERIVED.
//
// The window is not a second hand-typed list (that would be two lists to keep in
// step, and the copy nobody updates is the one that lets a new set through). It
// is derived from the id convention the coverage build itself uses: a NEW
// Mathematics lesson is `mat-<module>-<topic>` (all 8 sets added by Slices 1 and
// 2 carry that prefix), while the 24 sets that predate the corpus rule carry no
// such prefix. So the original 24 = every live set key that is not a
// `mat-`-prefixed coverage id, and `count` pins how many there were.
//
// Both anchors must hold: if a slice adds a new set and grandfathers it, the
// derived window is unchanged and 8d names the intruder; if a slice adds a set
// under a legacy-style id, the derived window grows past `count` and 8d says so.
// Either way the harness fails loudly instead of silently skipping the corpus
// rule for one more set — which is exactly what happened before this assertion
// (measured 2026-11-07: adding "mat-meas-scale-and-scale-drawings" to
// LEGACY_SETS still exited 0, with 12 corpus assertions quietly dropped).
// ---------------------------------------------------------------------------
const LEGACY_BASE = { count: 24, newLessonId: /^mat-/ };

// The red controls' stand-in id for "a key that is not a real lesson" (R2) and
// "a key that is not a real set" (R11). Both used to name `mat-geo-bearings` by
// hand, and Slice 5 (2026-11-15) gave that id a real lesson AND a real set, so
// both controls stopped biting while still reporting themselves as controls —
// the same rot as a hand-typed PENDING pointer. A reserved id that no content
// slice may ever create cannot rot that way.
const FIXTURE_ID = "red-control-fixture-id";

// The two measurement tools' copy, arithmetic and component sources, for
// assertions 13 and 14. Read once; a red control substitutes its own.
const MEASUREMENT_WORKING = { rectangleWorking, circleWorking, prismWorking, cylinderWorking };
const TOOL_SOURCES = {
  "area-builder": read("src/components/AreaBuilder.jsx"),
  "volume-filler": read("src/components/VolumeFiller.jsx"),
};

// Folding: case, curly quotes/dashes, whitespace. Deliberately generous so a
// legitimately worded label is not failed on punctuation alone — and
// deliberately NOT normalising superscripts to carets (see the header).
const fold = (s) => String(s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();
const corpusOf = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \n "));

// ---------------------------------------------------------------------------
// The two dedicated measurement tools (AreaBuilder, VolumeFiller). Their
// displayed strings live in src/data/measurementTools.js so that this harness
// can hold them to the SAME corpus rule as the lab sets: every string a tool
// shows must be taught by the lesson whose Play tab renders it. A13 checks the
// copy, A14 re-derives the arithmetic, and `leftover()` proves a generated
// worked step is built only from that taught copy plus numbers — so a formula
// or a unit that the lesson never mentions cannot reach the screen.
// ---------------------------------------------------------------------------
const TOOL_CASES = {
  "area-builder": { rectangle: [[3, 4], [7, 2], [1, 1]], circle: [[3], [5]] },
  "volume-filler": { prism: [[4, 3, 5], [2, 6, 9], [1, 1, 1]], cylinder: [[3, 10], [5, 4]] },
};
// Numbers, spacing and the arithmetic symbols a worked step is allowed to add
// to the taught words. Nothing else may survive. The notation symbols (≈ π ² ³
// √) were added with the task text on 2026-11-18: they are how the lesson WRITES
// a number, not a word, and the lessons teach π ≈ 3.142 and cm²/cm³ in exactly
// these forms.
const STEP_SYMBOLS = /[0-9\s.,=×+÷()\-−≈π²³√]/g;
// The words a lesson teaches, for the task text (A13's 13b). Same folding as
// the corpus rule, and single letters are left out: "r" and "h" are algebraic
// symbols, not words (the rule check-graph-reveal uses).
const wordsOf = (s) => fold(s).match(/[a-z]{2,}/g) || [];
function toolSteps(type, working) {
  const cases = TOOL_CASES[type] || {};
  const steps = [];
  if (type === "area-builder") {
    for (const [l, w] of cases.rectangle || []) steps.push(...working.rectangleWorking(l, w).steps);
    for (const [r] of cases.circle || []) steps.push(...working.circleWorking(r).steps);
  } else if (type === "volume-filler") {
    for (const [l, w, h] of cases.prism || []) steps.push(...working.prismWorking(l, w, h).steps);
    for (const [r, h] of cases.cylinder || []) steps.push(...working.cylinderWorking(r, h).steps);
  }
  return steps;
}
// English function words carry no subject content, so the corpus rule does not
// hold them. This list is closed and small, and it is the SAME list
// tools/check-graph-reveal.mjs applies to the graphing tasks (its G3): a word
// that is not here must be taught by the lesson.
//
// It was added to this harness on 2026-11-18, when A13 learned to check the
// measurement TASKS' text (src/data/measurementTasks.js). A worked step built
// from AREA_COPY never needed it — that text is composed from the taught strings
// and numbers — but a prompt is a sentence: "A rectangle with an area of 24 cm²
// and a length of 8 cm" is entirely taught content held together by function
// words, and `leftover()` used to call every one of them untaught.
//
// THIS IS A GENUINE LOOSENING, so it is red-controlled: R21 feeds a task text
// the lesson never teaches ("garden") through the loosened rule and proves A13
// still fails on it. A rule that cannot fail is not a rule.
const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "by", "for",
  "with", "from", "into", "through", "over", "under", "between", "that",
  "this", "these", "those", "it", "its", "is", "are", "was", "were", "be",
  "been", "being", "so", "if", "as", "then", "than", "not", "no", "all",
  "any", "each", "one", "two", "we", "you", "your", "there", "here", "do",
  "does", "did", "can", "will", "would", "should", "must", "may", "also",
  "just", "only", "very", "both", "same", "more", "most", "other", "such",
]);

/** What is left of a worked step after the taught copy, the numbers and the English function words are removed. */
function leftover(step, taught) {
  let s = fold(step);
  // Longest first: "cm²" must go before "cm", or the ² would be left behind.
  for (const t of [...taught].map(fold).sort((a, b) => b.length - a.length)) s = s.split(t).join(" ");
  return s.replace(STEP_SYMBOLS, " ")
    .split(/\s+/)
    // Single letters are algebraic symbols (r, h, V), never words.
    .filter((w) => w.length > 1 && !FUNCTION_WORDS.has(w))
    .join(" ")
    .trim();
}

// The tool a type resolves to — used only for the assertion-2 message.
function toolOf(type, groups) {
  if (groups.drag.has(type)) return "DragDropLabel";
  if (groups.graphing.has(type)) return "GraphingCalculator";
  if (groups.balance && groups.balance.has(type)) return "BalanceScale";
  if (groups.area && groups.area.has(type)) return "AreaBuilder";
  if (groups.volume && groups.volume.has(type)) return "VolumeFiller";
  return "no dedicated tool";
}

// ---------------------------------------------------------------------------
// THE ONE PURE FUNCTION. Every assertion returns a NAMED problem string
// ("A<n>: …") so a red control can point at the assertion that fired rather
// than at "some problem".
// ---------------------------------------------------------------------------
function collectProblems(input) {
  const {
    sets,
    modules,
    metadata,
    sandbox,
    typeKeyed = TYPE_KEYED,
    typeGroups = REAL_TYPE_GROUPS,
    types = recognisedOf(typeGroups),
    legacySets = LEGACY_SETS,
    // The original-grandfather window (assertion 8d) and the measurement tools'
    // copy/arithmetic (assertions 13/14). Both are parameters so a red control
    // can doctor them instead of editing the real tree.
    legacyBase = LEGACY_BASE,
    toolSources = TOOL_SOURCES,
    working = MEASUREMENT_WORKING,
    // The measurement tasks' text, for A13's task clause. A parameter so R21 can
    // doctor it instead of editing the real tree.
    tasks = measurementTasks,
  } = input;
  // The caller may pass the flattened lesson list or just the modules; the
  // selftest fixture passes modules only, exactly as a caller would.
  const allLessons = input.allLessons ||
    modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));

  const problems = [];
  let checks = 0;
  const ok = (cond, msg) => { checks += 1; if (!cond) problems.push(msg); };

  const setKeys = Object.keys(sets || {});
  const allIds = allLessons.map((l) => l.id);
  const lessonIds = new Set(allIds);
  const byId = Object.fromEntries(allLessons.map((l) => [l.id, l]));
  const legacy = new Set(legacySets);
  // The sets the corpus rule applies to: everything that is not grandfathered.
  const newSetKeys = setKeys.filter((k) => !legacy.has(k));

  // 1. every set key is a real lesson id
  for (const k of setKeys) {
    ok(lessonIds.has(k), `A1: lessonSets.mathematics.${k}: "${k}" is not a lesson id in content/mathematics/modules.json`);
  }

  // 2. no type-keyed lesson carries a set — it would shadow its dedicated tool
  for (const id of typeKeyed) {
    if (!sets || !sets[id]) { checks += 1; continue; }
    const type = (byId[id] && byId[id].experiment && byId[id].experiment.type) || "no experiment type";
    ok(false, `A2: ${id}: carries a per-lesson set, which would shadow its dedicated tool (${type} — ${toolOf(type, typeGroups)})`);
  }

  // 3. the count is the arithmetic: lessons − type-keyed
  ok(setKeys.length === allLessons.length - typeKeyed.length,
    `A3: ${setKeys.length} sets for ${allLessons.length - typeKeyed.length} coverage lessons (allLessons ${allLessons.length} − TYPE_KEYED ${typeKeyed.length})`);

  // 4. the partition: every lesson exactly once, nothing missing, nothing twice
  {
    const union = [...setKeys, ...typeKeyed];
    const missing = allIds.filter((id) => !union.includes(id));
    const duplicated = union.filter((id, i) => union.indexOf(id) !== i);
    ok(missing.length === 0 && duplicated.length === 0,
      `A4: partition: ${missing.length ? `missing ${missing.join(", ")}` : "nothing missing"} / ${duplicated.length ? `duplicated ${[...new Set(duplicated)].join(", ")}` : "nothing duplicated"}`);
  }

  // 5. every set is well formed and headed by its own activity
  for (const [id, set] of Object.entries(sets || {})) {
    const where = `lessonSets.mathematics.${id}`;
    const title = typeof set.title === "string" ? set.title : "";
    ok(title.trim().length > 3, `A5a: ${where}: has a title`);
    ok(!/^Subject|^Lab$/i.test(title.trim()), `A5b: ${where}: title names the lesson topic`);
    ok(!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(title.trim()), `A5c: ${where}: title is not a raw lesson slug`);
    ok(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `A5d: ${where}: has a subtitle`);
    if (set.kind === "match") {
      const pairs = set.pairs || [];
      ok(pairs.length >= 4, `A5f: ${where}: at least 4 pairs (has ${pairs.length})`);
      ok(pairs.every((p) => p && p.id && p.target && p.label), `A5f: ${where}: every pair has id/target/label`);
      const ids = pairs.map((p) => p.id);
      const targets = pairs.map((p) => p.target);
      ok(new Set(ids).size === ids.length, `A5f: ${where}: pair ids are unique`);
      ok(new Set(targets).size === targets.length, `A5f: ${where}: targets are unique (unambiguous drops)`);
    } else if (set.kind === "sort") {
      const cats = set.categories || [];
      const items = set.items || [];
      ok(cats.length >= 2, `A5g: ${where}: at least 2 categories`);
      ok(items.length >= 4, `A5g: ${where}: at least 4 items (has ${items.length})`);
      ok(cats.every((c) => c && c.id && c.label), `A5g: ${where}: every category has id/label`);
      ok(new Set(cats.map((c) => c.id)).size === cats.length, `A5g: ${where}: category ids are unique`);
      ok(cats.every((c) => items.some((i) => i && i.category === c.id)), `A5g: ${where}: every category has at least one item`);
      ok(items.every((i) => i && i.label && cats.some((c) => c.id === i.category)), `A5g: ${where}: every item has a label and a known category`);
      ok(new Set(items.map((i) => i.id)).size === items.length, `A5g: ${where}: item ids are unique`);
    } else {
      ok(false, `A5e: ${where}: kind must be match or sort (got ${set.kind})`);
    }
  }

  // 6. no two lessons share one activity heading
  {
    const seen = new Map();
    let clash = null;
    for (const [id, set] of Object.entries(sets || {})) {
      const t = String(set.title || "").trim();
      if (!t) continue;
      if (seen.has(t)) { clash = [seen.get(t), id, t]; break; }
      seen.set(t, id);
    }
    ok(clash === null, clash
      ? `A6: two lessons share one activity heading: "${clash[2]}" (${clash[0]}, ${clash[1]})`
      : "A6: two lessons share one activity heading");
  }

  // 7. THE CORPUS RULE — every displayed string is taught by that lesson.
  //    NEW sets only; the 24 legacy sets are grandfathered (see the header).
  for (const k of newSetKeys) {
    const set = sets[k];
    const lesson = byId[k];
    const corpus = lesson ? corpusOf(lesson) : "";
    const shown = [];
    if (set.kind === "match") for (const p of set.pairs || []) shown.push(p.label, p.target);
    else {
      for (const c of set.categories || []) shown.push(c.label);
      for (const i of set.items || []) shown.push(i.label);
    }
    for (const s of shown) {
      ok(corpus.includes(fold(s)), `A7: lessonSets.mathematics.${k}: "${s}" is not in that lesson's own copy`);
    }
  }

  // 8. LEGACY_SETS ∪ new sets === every live set, EXACTLY. Three predicates.
  {
    ok(new Set(legacySets).size === legacySets.length,
      `A8: LEGACY_SETS is not an exact partition of the live sets: LEGACY_SETS repeats a key`);
    const notASet = legacySets.filter((k) => !Object.prototype.hasOwnProperty.call(sets || {}, k));
    ok(notASet.length === 0,
      `A8: LEGACY_SETS is not an exact partition of the live sets: ${notASet.map((k) => `"${k}" is not a set`).join(", ")}`);
    const union = [...new Set([...legacySets, ...newSetKeys])].sort();
    const live = setKeys.slice().sort();
    const onlyLegacy = union.filter((k) => !live.includes(k));
    const onlyLive = live.filter((k) => !union.includes(k));
    ok(JSON.stringify(union) === JSON.stringify(live),
      `A8: LEGACY_SETS is not an exact partition of the live sets: union names ${onlyLegacy.length ? `[${onlyLegacy.join(", ")}]` : "nothing"} that no set provides, and the live sets have ${onlyLive.length ? `[${onlyLive.join(", ")}]` : "nothing"} the union does not`);
  }

  // 8d. NO NEW SET MAY EVER BE GRANDFATHERED. A8 above tolerates a key that is
  //     in both LEGACY_SETS and the new-set list, so before this assertion
  //     adding a shipped set id to LEGACY_SETS passed and silently exempted it
  //     from the corpus rule (the gate's RC2, 2026-11-07). The grandfathered set
  //     must be EXACTLY the original 24 — derived from the live keys and the
  //     coverage build's `mat-` id convention, never a second hand-typed list:
  //
  //        LEGACY_SETS ∩ (allSetKeys − BASE_24) === ∅   and   BASE_24 ⊆ LEGACY_SETS
  //
  //     The header's "DO NOT add a key here" is now enforced, not advice.
  {
    const BASE_24 = setKeys.filter((k) => !legacyBase.newLessonId.test(k));
    ok(BASE_24.length === legacyBase.count,
      `A8d: the original grandfathered sets are the ${legacyBase.count} sets that predate the coverage build (a new lesson id is mat-<module>-<topic>); the live sets now contain ${BASE_24.length} such keys — if a coverage slice added one, it must satisfy the corpus rule, not extend the window`);
    const intruders = legacySets.filter((k) => !BASE_24.includes(k));
    ok(intruders.length === 0,
      `A8d: LEGACY_SETS grandfathered a set that is not one of the original ${legacyBase.count}: [${intruders.join(", ")}] — a new set must pass the corpus rule, never be grandfathered (remove it from LEGACY_SETS)`);
    const dropped = BASE_24.filter((k) => !legacySets.includes(k));
    ok(dropped.length === 0,
      `A8d: LEGACY_SETS no longer grandfathers [${dropped.join(", ")}], which is one of the original ${legacyBase.count} — removing it from the list is a real change to what the corpus rule enforces, so it must come with the copy that makes the set pass`);
  }

  // 9. every lesson's experiment is an OBJECT with a type and a description
  for (const l of allLessons) {
    const e = l.experiment;
    const good = e && typeof e === "object" && !Array.isArray(e) &&
      typeof e.type === "string" && e.type.trim() && typeof e.description === "string" && e.description.trim();
    ok(Boolean(good), `A9: ${l.id}: experiment must be an object with a type and a description`);
  }

  // 10. every type is recognised OR the lesson carries its own set
  for (const l of allLessons) {
    const type = l.experiment && l.experiment.type;
    const hasSet = Boolean(sets && sets[l.id]);
    ok(types.has(type) || hasSet,
      `A10: ${l.id}: type "${type}" is not recognised and the lesson has no set (it would fall to the Mathematics flashcard deck)`);
  }

  // 11. the module count the catalog advertises is the module count that ships
  ok(metadata && metadata.estimatedModules === modules.length,
    `A11: metadata.estimatedModules is ${metadata && metadata.estimatedModules}, modules.length is ${modules.length}`);

  // 12. routing: lessonId resolves BEFORE the experiment-type library
  if (typeof sandbox === "string") {
    const mathBranch = sandbox.slice(sandbox.indexOf('if (subjectId === "mathematics")'),
      sandbox.indexOf('if (subjectId === "chemistry")'));
    const perLesson = mathBranch.indexOf('lessonSets["mathematics"] && lessonSets["mathematics"][lessonId]');
    const byType = mathBranch.indexOf("MATH_DRAG_TYPES.has(t)");
    ok(mathBranch.length > 0, "A12a: the mathematics branch exists in ExperimentSandbox");
    ok(perLesson !== -1, "A12a: the mathematics branch consults lessonSets.mathematics");
    ok(byType !== -1, "A12b: the mathematics branch still has its experiment-type library");
    ok(perLesson !== -1 && byType !== -1 && perLesson < byType,
      "A12c: the per-lesson set is checked BEFORE the experiment-type library");
    ok(/if \(lessonId && lessonSets\["mathematics"\]/.test(mathBranch),
      "A12d: the per-lesson branch is guarded by lessonId (subject-page labs keep their own deck)");
    ok(/lessonId=\{lessonId\}/.test(mathBranch.slice(perLesson, perLesson + 240)),
      "A12e: the per-lesson branch passes lessonId through to DragDropLabel");
    ok(mathBranch.includes('return flash("mathematics")'),
      "A12f: the fallback is still the Mathematics flashcard deck, never another subject's");
  }

  // 13. THE MEASUREMENT TOOLS' CORPUS RULE. AreaBuilder and VolumeFiller are the
  //     dedicated Play-tab tools for perimeter-area and volume-capacity. Their
  //     words live in src/data/measurementTools.js, and every one of them must be
  //     taught by the lesson that renders it — the same standard assertion 7
  //     holds the lab sets to. A worked step may add numbers and arithmetic
  //     symbols to those words and nothing else, so a formula or a unit the
  //     lesson never mentions cannot reach the screen.
  for (const [type, copy] of Object.entries(MEASUREMENT_TOOL_COPY)) {
    const lessonId = MEASUREMENT_TOOL_LESSONS[type];
    const lesson = byId[lessonId];
    if (!lesson) continue; // A4 already reports a lesson that vanished
    ok(lesson.experiment && lesson.experiment.type === type,
      `A13: ${lessonId}: experiment.type is "${lesson.experiment && lesson.experiment.type}", but ${type} is the tool routed to it`);
    const corpus = corpusOf(lesson);
    for (const [key, text] of Object.entries(copy)) {
      ok(corpus.includes(fold(text)),
        `A13: ${lessonId} renders ${type}, which displays "${text}" (${key}) — that lesson does not teach it`);
    }
    const taught = Object.values(copy);
    for (const step of toolSteps(type, working)) {
      const rest = leftover(step, taught);
      ok(rest === "",
        `A13: ${lessonId} renders ${type}, whose worked step "${step}" contains "${rest}" — not taught by that lesson`);
    }
    // The component must render only from that copy: every text node in the
    // returned JSX is an expression, so a bare string cannot be added later
    // without this failing.
    const src = toolSources[type];
    if (typeof src === "string") {
      ok(/from\s+"\.\.\/data\/measurementTools"/.test(src),
        `A13: ${type}: the component imports its copy from src/data/measurementTools.js`);
      const jsx = src.slice(src.indexOf("return ("));
      const bare = [...jsx.matchAll(/>([^<>{}]*)</g)].map((m) => m[1].trim()).filter((t) => /[a-z]/i.test(t));
      ok(bare.length === 0,
        `A13: ${type}: bare JSX text would bypass the corpus check — found ${bare.slice(0, 3).map((t) => `"${t}"`).join(", ")}`);
      // The task panel's own labels ("Check my answer", "Your task") are UI
      // chrome, not subject content, so they are not held to the corpus rule —
      // but they must come from src/data/measurementTasks.js, never be typed
      // into the markup, or the bare-JSX rule above is the only thing between a
      // later edit and an untaught string on screen.
      // Comments are prose, not markup: a comment naming the label is not the
      // label being typed into the JSX, so they are stripped first.
      const markup = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
      for (const label of Object.values(MEASUREMENT_TASK_COPY)) {
        ok(!markup.includes(`"${label}"`),
          `A13: ${type}: the panel label "${label}" is typed into the component — it must come from src/data/measurementTasks.js`);
      }
    }
  }

  // 13b. THE MEASUREMENT TASKS' TEXT. The prompt, the answer and the steps the
  //      student reads for perimeter-area and volume-capacity live in
  //      src/data/measurementTasks.js, and they are held to the same rule as the
  //      tools' copy: every word must be taught by the lesson whose Play tab
  //      shows it, or be an English function word. This is what stops a task
  //      being written about something the lesson never taught — R21 proves it.
  for (const [lessonId, list] of Object.entries(tasks || {})) {
    const lesson = byId[lessonId];
    if (!lesson) continue; // A4/A1 own a task keyed to no lesson
    const type = lesson.experiment && lesson.experiment.type;
    // What the student has been taught: the tool's own copy AND the words of
    // the lesson that renders it. A prompt is written in the lesson's language,
    // so a word the lesson teaches is taught — "drag", "sliders" and "find" are
    // in these two lessons but in neither tool's copy.
    const taught = [...Object.values(MEASUREMENT_TOOL_COPY[type] || {}), ...wordsOf(corpusOf(lesson))];
    for (const t of list || []) {
      for (const text of [t.prompt, t.answer, ...(t.steps || [])]) {
        const rest = leftover(text, taught);
        ok(rest === "",
          `A13: ${lessonId}/${t.id}: the task text "${text}" contains "${rest}" — not taught by that lesson`);
      }
    }
  }

  // 14. THE MEASUREMENT TOOLS' ARITHMETIC. The worked step the student reads has
  //     to be the sum the tool actually performs, so every number is re-derived
  //     here from the inputs with plain arithmetic, and the last step must state
  //     the answer the readout shows.
  {
    const near = (a, b) => Math.abs(a - b) < 0.005;
    for (const [l, w] of TOOL_CASES["area-builder"].rectangle) {
      const got = working.rectangleWorking(l, w);
      ok(near(got.area, l * w) && near(got.perimeter, 2 * (l + w)),
        `A14: rectangleWorking(${l}, ${w}) → area ${got.area}, perimeter ${got.perimeter}; expected ${l * w} and ${2 * (l + w)}`);
      ok(got.steps.length >= 2 && got.steps[got.steps.length - 1].includes(String(got.perimeter)),
        `A14: rectangleWorking(${l}, ${w}): the last worked step must state the perimeter (${got.perimeter})`);
    }
    for (const [r] of TOOL_CASES["area-builder"].circle) {
      const got = working.circleWorking(r);
      ok(near(got.area, Math.round(3.142 * r * r * 100) / 100) &&
        near(got.circumference, Math.round(2 * 3.142 * r * 100) / 100),
        `A14: circleWorking(${r}) → area ${got.area}, circumference ${got.circumference}; expected ${3.142 * r * r} and ${2 * 3.142 * r}`);
      ok(got.steps.length >= 2 && got.steps[got.steps.length - 1].includes(String(got.circumference)),
        `A14: circleWorking(${r}): the last worked step must state the circumference (${got.circumference})`);
    }
    for (const [l, w, h] of TOOL_CASES["volume-filler"].prism) {
      const got = working.prismWorking(l, w, h);
      ok(near(got.baseArea, l * w) && near(got.volume, l * w * h) && near(got.litres, (l * w * h) / 1000),
        `A14: prismWorking(${l}, ${w}, ${h}) → base ${got.baseArea}, volume ${got.volume}, litres ${got.litres}`);
      ok(got.steps.some((s) => s.includes(String(got.volume))) && got.steps.some((s) => s.includes(String(got.litres))),
        `A14: prismWorking(${l}, ${w}, ${h}): the steps must state the volume (${got.volume}) and the capacity (${got.litres})`);
    }
    for (const [r, h] of TOOL_CASES["volume-filler"].cylinder) {
      const got = working.cylinderWorking(r, h);
      const base = Math.round(3.142 * r * r * 100) / 100;
      const exact = 3.142 * r * r * h;
      const litres = Math.round((exact / 1000) * 1000) / 1000;
      ok(near(got.baseArea, base) && near(got.volume, Math.round(exact * 100) / 100) &&
        near(got.litres, litres),
        `A14: cylinderWorking(${r}, ${h}) → base ${got.baseArea}, volume ${got.volume}, litres ${got.litres}; expected ${base}, ${Math.round(exact * 100) / 100} and ${litres} (from πr²h itself, not the rounded base)`);
      ok(got.steps.some((s) => s.includes(String(got.volume))) && got.steps.some((s) => s.includes(String(got.litres))),
        `A14: cylinderWorking(${r}, ${h}): the steps must state the volume (${got.volume}) and the capacity (${got.litres})`);
    }
  }

  return { problems, checks };
}

// The public shape the red controls and the selftest both call.
const labProblems = (input) => collectProblems(input).problems;

// ---------------------------------------------------------------------------
// The real tree
// ---------------------------------------------------------------------------
const modules = JSON.parse(read("content/mathematics/modules.json"));
const metadata = JSON.parse(read("content/mathematics/metadata.json"));
const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const sets = lessonSets.mathematics || {};

const REAL = {
  sets,
  allLessons,
  modules,
  metadata,
  sandbox: sandboxSrc,
  typeKeyed: TYPE_KEYED,
  typeGroups: REAL_TYPE_GROUPS,
  types: recognisedOf(REAL_TYPE_GROUPS),
  legacySets: LEGACY_SETS,
  legacyBase: LEGACY_BASE,
  toolSources: TOOL_SOURCES,
  working: MEASUREMENT_WORKING,
  tasks: measurementTasks,
};
// A fresh deep copy for every red control, so one control can never leak into
// the next (or into the real run).
const cloneReal = () => ({
  sets: JSON.parse(JSON.stringify(REAL.sets)),
  allLessons: JSON.parse(JSON.stringify(REAL.allLessons)),
  modules: JSON.parse(JSON.stringify(REAL.modules)),
  metadata: JSON.parse(JSON.stringify(REAL.metadata)),
  sandbox: REAL.sandbox,
  typeKeyed: REAL.typeKeyed.slice(),
  typeGroups: REAL.typeGroups,
  types: REAL.types,
  legacySets: REAL.legacySets.slice(),
  legacyBase: REAL.legacyBase,
  toolSources: REAL.toolSources,
  working: REAL.working,
  tasks: JSON.parse(JSON.stringify(REAL.tasks)),
});

// ---------------------------------------------------------------------------
// --selftest: a synthetic fixture only, so the function is proved to
// discriminate on input it has never seen. No real tree is read for it.
// ---------------------------------------------------------------------------
if (SELFTEST) {
  section("selftest: a well-formed synthetic input yields zero problems");
  const FIXTURE = {
    modules: [{ id: "m1", lessons: [
      { id: "a", title: "Alpha", content: "alpha beta gamma", objectives: [], concepts: [],
        experiment: { type: "matching-game", description: "d" } },
      { id: "b", title: "Beta", content: "delta", objectives: [], concepts: [],
        experiment: { type: "interactive-quiz", description: "d" } },
    ] }],
    sets: {
      a: { title: "Alpha Match", subtitle: "Drag each.", kind: "match", pairs: [
        { id: "p1", label: "alpha", target: "beta" },
        { id: "p2", label: "beta", target: "gamma" },
        { id: "p3", label: "gamma", target: "alpha" },
        { id: "p4", label: "alpha beta", target: "beta gamma" },
      ] },
    },
    metadata: { estimatedModules: 1 },
    legacySets: [],
    // The fixture's one set is not a `mat-` coverage id, so the derived
    // original-grandfather window is that one key and nothing is grandfathered.
    legacyBase: { count: 0, newLessonId: /^a$/ },
    typeKeyed: ["b"],
    typeGroups: REAL_TYPE_GROUPS,
    types: recognisedOf(REAL_TYPE_GROUPS),
  };
  // JSON round-trip for the doctored copies, then re-attach the type Sets and
  // the base pattern — a Set and a RegExp do not survive JSON, and a clone
  // without them is not the same input.
  const cloneFixture = () => {
    const c = JSON.parse(JSON.stringify(FIXTURE));
    c.typeGroups = REAL_TYPE_GROUPS;
    c.types = recognisedOf(REAL_TYPE_GROUPS);
    c.legacyBase = { count: 0, newLessonId: /^a$/ };
    return c;
  };
  const clean = labProblems(FIXTURE);
  ok(clean.length === 0, `selftest: a well-formed input yields zero problems (got ${clean.length}: ${clean.join(" | ")})`);

  section("selftest: the same function must FAIL on four doctored inputs");
  // (1) one displayed label is not taught by the lesson
  const badLabel = cloneFixture();
  badLabel.sets.a.pairs[0].label = "delta";
  const badLabelProblems = labProblems(badLabel);
  ok(badLabelProblems.some((p) => /^A7: .*"delta" is not in that lesson's own copy/.test(p)),
    `selftest: a label outside the lesson's copy fails the corpus rule (${badLabelProblems[0] || "no problem"})`);
  // (2) the type-keyed lesson count is broken
  const badPartition = cloneFixture();
  badPartition.typeKeyed = [];
  const badPartitionProblems = labProblems(badPartition);
  ok(badPartitionProblems.some((p) => /^A3: 1 sets for 2 coverage lessons/.test(p)),
    `selftest: a wrong partition fails the count assertion (${badPartitionProblems[0] || "no problem"})`);
  // (3) a type-keyed lesson is given a set, which would shadow its tool
  const shadowed = cloneFixture();
  shadowed.sets.b = { title: "Beta Sort", subtitle: "Sort each.", kind: "match", pairs: [
    { id: "q1", label: "delta", target: "delta" }, { id: "q2", label: "delta", target: "delta two" },
    { id: "q3", label: "delta", target: "delta three" }, { id: "q4", label: "delta", target: "delta four" },
  ] };
  const shadowProblems = labProblems(shadowed);
  ok(shadowProblems.some((p) => /^A2: b: carries a per-lesson set, which would shadow its dedicated tool \(interactive-quiz — DragDropLabel\)/.test(p)),
    `selftest: a set on a type-keyed lesson fails the shadow assertion (${shadowProblems[0] || "no problem"})`);
  // (4) a set grandfathered that is not one of the original ones — the hole that
  //     let a coverage slice hide a corpus failure (A8d, the gate's RC2).
  const grandfathered = cloneFixture();
  grandfathered.legacySets = ["a"];
  const gfProblems = labProblems(grandfathered);
  ok(gfProblems.some((p) => /^A8d: LEGACY_SETS grandfathered a set that is not one of the original 0: \[a\]/.test(p)),
    `selftest: grandfathering a new set fails A8d (${gfProblems[0] || "no problem"})`);

  console.log(`\ncheck-mathematics-labs (selftest): ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// A18. THE ROUTING SPLIT IS PINNED (gate of #222).
//
// PR #222 stopped area-builder and volume-filler rendering the Equation Balance
// Scale by giving them their own tools, and split the one MATH_BALANCE_TYPES set
// into three. The gate then proved that putting `area-builder` BACK into
// MATH_BALANCE_TYPES — so perimeter-area renders the balance scale again — left
// both existing harnesses GREEN. A fix that can be reverted without a single
// failure is not guarded, so this pins:
//   * the exact contents of the three sets,
//   * their pairwise disjointness (a type routed to two tools is ambiguous, and
//     the router's branch order would silently decide which one wins),
//   * the router's own wiring: each set must reach ITS component, or a set can
//     exist, be correct, and still never be consulted.
//
// Honest note: with the contents pinned exactly, the disjointness check can
// never fire on its own today — two sets cannot both equal their expected
// single-member contents and overlap. It is kept because it is the readable
// statement of the rule, and it is what still holds if the exact-contents pin is
// ever relaxed to "these types, in some order".
// ---------------------------------------------------------------------------
const ROUTING_EXPECTED = {
  MATH_BALANCE_TYPES: ["balance-scale"],
  MATH_AREA_TYPES: ["area-builder"],
  MATH_VOLUME_TYPES: ["volume-filler"],
};
const ROUTING_COMPONENT = {
  MATH_BALANCE_TYPES: "<BalanceScale",
  MATH_AREA_TYPES: "<AreaBuilder",
  MATH_VOLUME_TYPES: "<VolumeFiller",
};

function setLiteralIn(src, name) {
  const at = src.indexOf(`const ${name} = new Set([`);
  if (at === -1) return null;
  const end = src.indexOf("]);", at);
  if (end === -1) return null;
  return [...src.slice(at, end).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
}

function routingSplitProblems(src) {
  const problems = [];
  const found = {};
  for (const [name, expected] of Object.entries(ROUTING_EXPECTED)) {
    const got = setLiteralIn(src, name);
    if (!got) {
      problems.push(`A18: ${name} is not declared in src/components/ExperimentSandbox.jsx`);
      continue;
    }
    found[name] = got;
    if (got.join(",") !== expected.join(",")) {
      problems.push(`A18: ${name} is [${got.join(", ")}] — expected exactly [${expected.join(", ")}]`);
    }
    if (!src.includes(`if (${name}.has(t)) return ${ROUTING_COMPONENT[name]}`)) {
      problems.push(`A18: ${name} is not routed to ${ROUTING_COMPONENT[name]} — the set exists but never reaches its tool`);
    }
  }
  const names = Object.keys(found);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const shared = found[names[i]].filter((t) => found[names[j]].includes(t));
      if (shared.length > 0) {
        problems.push(`A18: ${names[i]} and ${names[j]} both claim [${shared.join(", ")}] — one type, two tools`);
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// THE RED CONTROLS — one named mutation each, run by DEFAULT.
//
// The suite (tools/check-all.sh, `npm test`) passes no arguments, so a control
// behind an opt-in flag is a control the suite never runs. Every control is a
// named entry in RED_CONTROLS and every one is pinned in RED_EXPECT to the
// failures it must produce — `includes()` on the printed string, so "something
// failed" is not proof that the assertion the control exists for still checks
// anything (a control can trip a different assertion and report itself caught).
//
// Every mutation resolves what it edits BY ID and throws when the id is gone, so
// a control whose target moved reports BROKEN instead of dying on a TypeError
// and taking the rest of the sweep with it.
// ---------------------------------------------------------------------------
const need = (obj, key, what) => {
  if (!obj || obj[key] === undefined) throw new Error(`no ${what} "${key}" on the real tree`);
  return obj[key];
};
const needLesson = (allLessons, id) => {
  const l = (allLessons || []).find((x) => x.id === id);
  if (!l) throw new Error(`no lesson "${id}" in content/mathematics/modules.json`);
  return l;
};
// A source edit that silently matches nothing would turn its control into a
// no-op that still reports itself as a control, so a miss throws BROKEN.
const replaceOnce = (src, from, to, what) => {
  if (!src.includes(from)) throw new Error(`ExperimentSandbox.jsx no longer contains ${what}`);
  return src.replace(from, to);
};

// The pins below are built from the tree, not typed: a hardcoded count goes
// stale the moment a coverage slice adds a set or a module, and a stale pin
// reads as "the assertion stopped biting".
const LIVE_SET_COUNT = Object.keys(REAL.sets).length;
const COVERAGE_COUNT = REAL.allLessons.length - REAL.typeKeyed.length;
const MODULE_COUNT = REAL.modules.length;
const SHARED_TITLE = REAL.sets["types-of-numbers"].title;      // the heading A6 must name
const NEW_SET_ID = Object.keys(REAL.sets).find((k) => /^mat-/.test(k) && !LEGACY_SETS.includes(k)) || null;
const AREA_LESSON = MEASUREMENT_TOOL_LESSONS["area-builder"];
const RECT_FORMULA = MEASUREMENT_TOOL_COPY["area-builder"].formulaRectArea;
const [RECT_L, RECT_W] = TOOL_CASES["area-builder"].rectangle[0];
const RECT_REAL = MEASUREMENT_WORKING.rectangleWorking(RECT_L, RECT_W);
const PA_TASK = (measurementTasks[AREA_LESSON] || [])[0] || { id: "<no task>" };
const GARDEN_PROMPT = "A garden with an area of 24 cm² and a length of 8 cm.";

const RED_CONTROLS = {
  // R1 — aimed at A3's arithmetic AND at A8's UNION predicate (the half of A8
  // that says a key LEGACY_SETS grandfathers is no longer provided by a set).
  // R10 is the correctly aimed twin: its pin is the union message alone.
  "set-deleted": (i) => {
    need(i.sets, "venn-diagrams", "set");
    delete i.sets["venn-diagrams"];
  },
  // R2 — a set keyed to a lesson that does not exist. Also trips A7 (no lesson,
  // so no corpus) and A8d (the fixture id joins the derived base window); the A1
  // pin is what makes this control aimed.
  "set-keyed-to-no-lesson": (i) => {
    i.sets[FIXTURE_ID] = { title: "Fixture Drill", subtitle: "Drag each.", kind: "match", pairs: [
      { id: "p1", label: "a", target: "b" }, { id: "p2", label: "b", target: "c" },
      { id: "p3", label: "c", target: "d" }, { id: "p4", label: "d", target: "a" },
    ] };
  },
  // R3 — a set on a TYPE-KEYED lesson: the shadow rule (A2) AND the partition (A4).
  "set-on-type-keyed-lesson": (i) => {
    i.sets["trig-ratios"] = { title: "Trig Ratio Drill", subtitle: "Drag each.", kind: "match", pairs: [
      { id: "p1", label: "sin", target: "opposite over hypotenuse" },
      { id: "p2", label: "cos", target: "adjacent over hypotenuse" },
      { id: "p3", label: "tan", target: "opposite over adjacent" },
      { id: "p4", label: "cosec", target: "hypotenuse over opposite" },
    ] };
  },
  // R4 — a set whose kind is neither match nor sort.
  "unknown-set-kind": (i) => { need(i.sets, "venn-diagrams", "set").kind = "order"; },
  // R5 — two lessons sharing one activity heading. The pin's title is the live
  // one, so the control stays aimed if the heading is reworded.
  "duplicate-heading": (i) => {
    need(i.sets, "venn-diagrams", "set").title = need(i.sets, "types-of-numbers", "set").title;
  },
  // R6 — an unrecognised experiment type on a lesson with no set.
  "unrecognised-type": (i) => { needLesson(i.allLessons, "trig-ratios").experiment.type = "text-sort"; },
  // R7 — the advertised module count no longer matches the shipped modules.
  "module-count-mismatch": (i) => { i.metadata.estimatedModules = MODULE_COUNT + 1; },
  // R8/R9 — a LEGACY set forced through the corpus rule, so the rule is exercised
  // on real grandfathered data. Each pin is a shipped string that set displays.
  "legacy-set-forced-types-of-numbers": (i) => {
    i.legacySets = i.legacySets.filter((k) => k !== "types-of-numbers");
  },
  "legacy-set-forced-standard-form": (i) => {
    i.legacySets = i.legacySets.filter((k) => k !== "standard-form");
  },
  // R10 — the UNION predicate alone: a legacy key that no live set provides.
  "legacy-key-not-a-set": (i) => {
    need(i.sets, "venn-diagrams", "set");
    delete i.sets["venn-diagrams"];
  },
  // R11 — LEGACY_SETS naming a key that is not a set at all.
  "legacy-key-is-not-a-set": (i) => { i.legacySets = [...i.legacySets, FIXTURE_ID]; },
  // R12 — an experiment stored as a bare string.
  "experiment-is-a-string": (i) => { needLesson(i.allLessons, "real-numbers").experiment = "interactive-quiz"; },
  // R13 — the live form of the corpus rule: a shipped NEW (non-grandfathered) set
  // forced to display a string its lesson does not teach. R8/R9 prove the rule can
  // bite, not that a shipped new set is subject to it.
  "new-set-untaught-label": (i) => {
    need(i.sets, "mat-num-properties-of-operations", "set").pairs[0].label = "Zebra";
  },
  // R14 — the hole A8d closes: a new set id added to LEGACY_SETS, which A8's
  // union test tolerates and A8d does not.
  "new-set-grandfathered": (i) => {
    if (!NEW_SET_ID) throw new Error("no live mat-* set to grandfather");
    i.legacySets = [...i.legacySets, NEW_SET_ID];
  },
  // R15 — AreaBuilder's arithmetic broken by one: A14 re-derives the area.
  "rectangle-arithmetic-broken": (i) => {
    i.working = {
      ...i.working,
      rectangleWorking: (l, w) => {
        const real = MEASUREMENT_WORKING.rectangleWorking(l, w);
        return { ...real, area: real.area + 1 };
      },
    };
  },
  // R16 — the lesson stops teaching a formula its tool displays.
  "lesson-stops-teaching-formula": (i) => {
    const lesson = needLesson(i.allLessons, AREA_LESSON);
    if (!lesson.content.includes(RECT_FORMULA)) throw new Error(`the ${AREA_LESSON} copy no longer contains "${RECT_FORMULA}"`);
    lesson.content = lesson.content.split(RECT_FORMULA).join("the rule below");
  },
  // R17 — bare JSX text in a tool: it would bypass the corpus check entirely.
  // The text goes where the rule looks (between a > and a < inside the returned
  // JSX); inserting it straight after the root <div> no longer bites once that
  // element opens with a {expression}, because the rule cannot cross a brace.
  "bare-jsx-text": (i) => {
    i.toolSources = {
      ...i.toolSources,
      "area-builder": replaceOnce(i.toolSources["area-builder"],
        "<strong>{T.yourTask}</strong>", "<strong>Untaught</strong>", "<strong>{T.yourTask}</strong>"),
    };
  },
  // R18 — the exact reversion the #222 gate performed: area-builder back in
  // MATH_BALANCE_TYPES, so perimeter-area renders the balance scale again. On the
  // pre-A18 tree this left every harness green.
  "area-builder-back-in-balance-set": (i) => {
    i.sandbox = replaceOnce(i.sandbox,
      'const MATH_BALANCE_TYPES = new Set(["balance-scale"]);',
      'const MATH_BALANCE_TYPES = new Set(["balance-scale", "area-builder"]);',
      "the MATH_BALANCE_TYPES declaration");
  },
  // R19 — the area set kept but routed to the balance scale: the wiring check.
  "area-set-routed-to-balance": (i) => {
    const before = i.sandbox;
    i.sandbox = before.replace(/if \(MATH_AREA_TYPES\.has\(t\)\) return <AreaBuilder[^/]*\/>;/,
      'if (MATH_AREA_TYPES.has(t)) return <BalanceScale subjectId="mathematics" experimentType={t} />;');
    if (i.sandbox === before) throw new Error("ExperimentSandbox.jsx no longer routes MATH_AREA_TYPES to <AreaBuilder");
  },
  // R20 — a whole set deleted: A18 must name the missing declaration.
  "volume-set-deleted": (i) => {
    i.sandbox = replaceOnce(i.sandbox,
      'const MATH_VOLUME_TYPES = new Set(["volume-filler"]);', "",
      "the MATH_VOLUME_TYPES declaration");
  },
  // R21 — the control for the FUNCTION_WORDS loosening A13 gained on 2026-11-18.
  // The loosening lets an English prompt through; it must NOT let a subject word
  // the lesson never taught through. "garden" is taught by no Mathematics lesson.
  "task-word-untaught": (i) => {
    const list = need(i.tasks, AREA_LESSON, "measurement task list");
    if (!list[0]) throw new Error(`no task for ${AREA_LESSON}`);
    list[0].prompt = GARDEN_PROMPT;
  },
  // R22 — the task panel's own labels come from the table, never from the markup.
  "panel-label-typed-into-markup": (i) => {
    i.toolSources = {
      ...i.toolSources,
      "area-builder": replaceOnce(i.toolSources["area-builder"],
        '<div className="area-builder">',
        `<div className="area-builder">"${MEASUREMENT_TASK_COPY.checkMyAnswer}"`,
        'the <div className="area-builder"> root'),
    };
  },

  // --- the five rules the audit found with NO control at all -----------------
  // A12a–f had none. This swaps the per-lesson branch and the experiment-type
  // library inside the mathematics branch, so the set no longer wins: A12c is the
  // only assertion that can catch it, and it is a string-presence test otherwise.
  "routing-order-flipped": (i) => {
    const start = i.sandbox.indexOf('if (subjectId === "mathematics")');
    const end = i.sandbox.indexOf('if (subjectId === "chemistry")');
    if (start === -1 || end === -1 || end < start) throw new Error("ExperimentSandbox.jsx has no mathematics branch to reorder");
    const branch = i.sandbox.slice(start, end);
    const perLessonAt = branch.indexOf('if (lessonId && lessonSets["mathematics"]');
    const byTypeAt = branch.indexOf("if (MATH_DRAG_TYPES.has(t))");
    if (perLessonAt === -1 || byTypeAt === -1 || perLessonAt > byTypeAt)
      throw new Error("the mathematics branch is not in the order this control expects");
    const eol = branch.indexOf("\n", byTypeAt);
    if (eol === -1) throw new Error("the MATH_DRAG_TYPES line has no line break");
    const perLessonBlock = branch.slice(perLessonAt, byTypeAt);
    const byTypeLine = branch.slice(byTypeAt, eol + 1);
    const flipped = branch.slice(0, perLessonAt) + byTypeLine + perLessonBlock + branch.slice(eol + 1);
    i.sandbox = i.sandbox.slice(0, start) + flipped + i.sandbox.slice(end);
  },
  // A13's worked-step leftover() was red-controlled for the TASK text only (R21).
  // A step the tool generates may add numbers and arithmetic symbols to the
  // taught words and nothing else — this feeds it a word the lesson never teaches.
  "worked-step-untaught": (i) => {
    i.working = {
      ...i.working,
      rectangleWorking: (l, w) => {
        const real = MEASUREMENT_WORKING.rectangleWorking(l, w);
        return { ...real, steps: [...real.steps, "garden"] };
      },
    };
  },
  // A4's MISSING half had no control (R3 covers "duplicated" only). A lesson in
  // the tree that is in neither `sets` nor `typeKeyed` is a hole in the partition.
  "partition-missing": (i) => {
    i.allLessons = [...i.allLessons, {
      id: FIXTURE_ID, title: "Fixture Lesson", content: "fixture", objectives: [], concepts: [],
      experiment: { type: "matching-game", description: "d" },
    }];
  },
  // A5a–d (title/subtitle shape) had no control at all.
  "title-is-lab": (i) => { need(i.sets, "venn-diagrams", "set").title = "Lab"; },
  // A13 skips a measurement lesson that is not in allLessons (`if (!lesson)
  // continue`) — deliberately, because A4/A1 own a vanished lesson. What notices
  // is A3's arithmetic, and only through its count: this proves it does.
  "measurement-lesson-vanished": (i) => {
    needLesson(i.allLessons, AREA_LESSON);
    i.allLessons = i.allLessons.filter((l) => l.id !== AREA_LESSON);
  },
};

// ---------------------------------------------------------------------------
// WHAT EACH CONTROL MUST BE CAUGHT BY — one ARRAY per control, and every one of
// the 27 is pinned. A control that synthesises state trips more than one
// assertion at once, so the run only passes if EVERY message listed here is
// among the failures; a control with no entry here fails outright (runControl),
// and a pin naming no control fails too (section 3). Strings, not regexes: the
// pin is the exact text the assertion prints, so it cannot be widened by a
// regex that happens to match a different failure.
// ---------------------------------------------------------------------------
const RED_EXPECT = {
  // A3's derived count, then A8's UNION message — the predicate R1 exists for.
  "set-deleted": [
    `A3: ${LIVE_SET_COUNT - 1} sets for ${COVERAGE_COUNT} coverage lessons`,
    "A8: LEGACY_SETS is not an exact partition of the live sets: union names [venn-diagrams] that no set provides",
  ],
  "set-keyed-to-no-lesson": [
    `A1: lessonSets.mathematics.${FIXTURE_ID}: "${FIXTURE_ID}" is not a lesson id in content/mathematics/modules.json`,
  ],
  "set-on-type-keyed-lesson": [
    "A2: trig-ratios: carries a per-lesson set, which would shadow its dedicated tool (trig-circle — DragDropLabel)",
    "A4: partition: nothing missing / duplicated trig-ratios",
  ],
  "unknown-set-kind": ["A5e: lessonSets.mathematics.venn-diagrams: kind must be match or sort (got order)"],
  "duplicate-heading": [`A6: two lessons share one activity heading: "${SHARED_TITLE}"`],
  "unrecognised-type": [
    'A10: trig-ratios: type "text-sort" is not recognised and the lesson has no set (it would fall to the Mathematics flashcard deck)',
  ],
  "module-count-mismatch": [`A11: metadata.estimatedModules is ${MODULE_COUNT + 1}, modules.length is ${MODULE_COUNT}`],
  "legacy-set-forced-types-of-numbers": [
    'A7: lessonSets.mathematics.types-of-numbers: "Perfect square" is not in that lesson\'s own copy',
  ],
  "legacy-set-forced-standard-form": [
    'A7: lessonSets.mathematics.standard-form: "4.5 × 10⁴" is not in that lesson\'s own copy',
  ],
  "legacy-key-not-a-set": [
    "A8: LEGACY_SETS is not an exact partition of the live sets: union names [venn-diagrams] that no set provides",
  ],
  "legacy-key-is-not-a-set": [
    `A8: LEGACY_SETS is not an exact partition of the live sets: "${FIXTURE_ID}" is not a set`,
  ],
  "experiment-is-a-string": ["A9: real-numbers: experiment must be an object with a type and a description"],
  "new-set-untaught-label": [
    'A7: lessonSets.mathematics.mat-num-properties-of-operations: "Zebra" is not in that lesson\'s own copy',
  ],
  "new-set-grandfathered": [
    `A8d: LEGACY_SETS grandfathered a set that is not one of the original ${LEGACY_BASE.count}: [${NEW_SET_ID}]`,
  ],
  "rectangle-arithmetic-broken": [
    `A14: rectangleWorking(${RECT_L}, ${RECT_W}) → area ${RECT_REAL.area + 1}, perimeter ${RECT_REAL.perimeter}; expected ${RECT_L * RECT_W} and ${2 * (RECT_L + RECT_W)}`,
  ],
  "lesson-stops-teaching-formula": [
    `A13: ${AREA_LESSON} renders area-builder, which displays "${RECT_FORMULA}" (formulaRectArea) — that lesson does not teach it`,
  ],
  "bare-jsx-text": ['A13: area-builder: bare JSX text would bypass the corpus check — found "Untaught"'],
  "area-builder-back-in-balance-set": [
    "A18: MATH_BALANCE_TYPES is [balance-scale, area-builder]",
    "A18: MATH_BALANCE_TYPES and MATH_AREA_TYPES both claim [area-builder]",
  ],
  "area-set-routed-to-balance": ["A18: MATH_AREA_TYPES is not routed to <AreaBuilder"],
  "volume-set-deleted": ["A18: MATH_VOLUME_TYPES is not declared in src/components/ExperimentSandbox.jsx"],
  "task-word-untaught": [
    `A13: ${AREA_LESSON}/${PA_TASK.id}: the task text "${GARDEN_PROMPT}" contains "garden"`,
  ],
  "panel-label-typed-into-markup": [
    `A13: area-builder: the panel label "${MEASUREMENT_TASK_COPY.checkMyAnswer}" is typed into the component`,
  ],
  "routing-order-flipped": ["A12c: the per-lesson set is checked BEFORE the experiment-type library"],
  "worked-step-untaught": [
    `A13: ${AREA_LESSON} renders area-builder, whose worked step "garden" contains "garden" — not taught by that lesson`,
  ],
  "partition-missing": [`A4: partition: missing ${FIXTURE_ID}`],
  "title-is-lab": ["A5b: lessonSets.mathematics.venn-diagrams: title names the lesson topic"],
  "measurement-lesson-vanished": [`A3: ${LIVE_SET_COUNT} sets for ${COVERAGE_COUNT - 1} coverage lessons`],
};

// ---------------------------------------------------------------------------
/** Run one control on a fresh clone. ok = it was caught, and caught by the assertion it names. */
function runControl(name) {
  const mutate = RED_CONTROLS[name];
  if (!mutate) throw new Error(`unknown red control "${name}"`);
  const input = cloneReal();
  mutate(input);
  // Both halves: collectProblems() for A1–A14 and routingSplitProblems() for A18.
  const real = [...labProblems(input), ...routingSplitProblems(input.sandbox)];
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name] || [];
  if (!expect.length) return { ok: false, real, why: "NO PINNED EXPECTATION — this control is not aimed at any assertion" };
  const missing = expect.filter((e) => !real.some((f) => f.includes(e)));
  if (missing.length) return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${missing[0]}"` };
  return { ok: true, real: real.filter((f) => expect.some((e) => f.includes(e))) };
}

// ---------------------------------------------------------------------------
// --red-control <name>: one control, hoisted ABOVE the real check so a single
// control can be run on its own. --red-controls-all is gone: it was an alias of
// "run them all", which is now the default.
// ---------------------------------------------------------------------------
if (ONLY_CONTROL) {
  if (!RED_CONTROLS[ONLY_CONTROL]) {
    console.log(`unknown red control: ${ONLY_CONTROL}`);
    console.log(`known: ${Object.keys(RED_CONTROLS).join(", ")}`);
    process.exit(2);
  }
  let r;
  try { r = runControl(ONLY_CONTROL); } catch (e) { console.log(`RED CONTROL "${ONLY_CONTROL}" BROKE — ${e.message}`); process.exit(1); }
  if (!r.ok) {
    console.log(`RED CONTROL "${ONLY_CONTROL}" ${r.why}`);
    r.real.slice(0, 5).forEach((f) => console.log(`   ${f}`));
    process.exit(1);
  }
  console.log(`red control "${ONLY_CONTROL}": caught — as expected`);
  r.real.slice(0, 5).forEach((f) => console.log(`   ${f}`));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The real run
// ---------------------------------------------------------------------------
section("1. the Mathematics lab partition");
{
  const run = collectProblems(REAL);
  pass += run.checks - run.problems.length;
  fail += run.problems.length;
  for (const p of run.problems) console.log(`FAIL: ${p}`);
  console.log(`    partition: ${Object.keys(sets).length} sets + ${TYPE_KEYED.length} type-keyed = ${allLessons.length} lessons`);
  console.log(`    estimatedModules ${metadata.estimatedModules} = modules.length ${modules.length}`);
  console.log(`    types: ${REAL_TYPE_GROUPS.drag.size} drag + ${REAL_TYPE_GROUPS.graphing.size} graphing + ${REAL_TYPE_GROUPS.balance.size} balance + ${REAL_TYPE_GROUPS.area.size} area + ${REAL_TYPE_GROUPS.volume.size} volume = ${recognisedOf(REAL_TYPE_GROUPS).size} recognised`);
  console.log(`    grandfathered sets: ${LEGACY_SETS.length} (corpus rule applies to ${Object.keys(sets).filter((k) => !LEGACY_SETS.includes(k)).length} new set(s))`);
  // The positive control the spec calls for: the caller must be green on the
  // real tree, or the red runs below are a broken caller rather than a bite.
  const again = labProblems(REAL);
  if (again.length === 0) pass += 1;
  else { fail += 1; console.log("FAIL: the caller is green on the real tree, so the red runs are not a broken caller"); }
}

section("2. routing split: balance / area / volume are three separate tools");
{
  const splitProblems = routingSplitProblems(sandboxSrc);
  if (splitProblems.length === 0) pass += 1;
  else { fail += splitProblems.length; for (const p of splitProblems) console.log(`FAIL: ${p}`); }
  console.log(`    balance [${(setLiteralIn(sandboxSrc, "MATH_BALANCE_TYPES") || []).join(", ")}] · area [${(setLiteralIn(sandboxSrc, "MATH_AREA_TYPES") || []).join(", ")}] · volume [${(setLiteralIn(sandboxSrc, "MATH_VOLUME_TYPES") || []).join(", ")}]`);
}

if (NO_RED_CONTROL) {
  console.log(`\ncheck-mathematics-labs: ${pass} passed, ${fail} failed (red controls skipped: --no-red-control)`);
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 3. The two directions between RED_CONTROLS and RED_EXPECT, asserted on the
// DEFAULT path. --selftest exits before this point, so it can never be the place
// that holds it; a control added without a pin, or a pin left behind by a
// renamed control, fails the run.
// ---------------------------------------------------------------------------
section("3. every red control is pinned, every pin names a control");
{
  const names = Object.keys(RED_CONTROLS);
  const unpinned = names.filter((n) => !(RED_EXPECT[n] || []).length);
  const orphans = Object.keys(RED_EXPECT).filter((n) => !RED_CONTROLS[n]);
  ok(unpinned.length === 0,
    `every one of the ${names.length} red controls is pinned to at least one expected failure — unpinned: ${unpinned.join(", ")}`);
  ok(orphans.length === 0, `every RED_EXPECT entry names a real control — orphans: ${orphans.join(", ")}`);
  console.log(`    ${names.length} controls, ${Object.values(RED_EXPECT).reduce((n, list) => n + list.length, 0)} pinned failures`);
}

// ---------------------------------------------------------------------------
// 4. The controls themselves — run by DEFAULT, because the suite passes no
// arguments. A control that throws reports BROKEN and the sweep continues; one
// exit code covers both halves (a failing real check and an uncaught control are
// both red).
// ---------------------------------------------------------------------------
section("4. red controls — every assertion is proved to bite");
{
  let bad = 0;
  for (const name of Object.keys(RED_CONTROLS)) {
    let r;
    try { r = runControl(name); } catch (e) { bad += 1; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
    if (!r.ok) {
      bad += 1;
      console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`);
    } else {
      console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
    }
  }
  // The caller is green on the untouched real tree, so the controls above were
  // exercised by a working caller and not by an already-broken one.
  const stillGreen = labProblems(REAL).length === 0 && routingSplitProblems(sandboxSrc).length === 0;
  console.log(`\n  caller green on the untouched real tree: ${stillGreen ? "yes" : "NO"}`);
  if (!stillGreen) { bad += 1; console.log("FAIL: the caller is not green on the real tree"); }
  console.log(`${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
  console.log(`\ncheck-mathematics-labs: ${pass} passed, ${fail} failed`);
  process.exit(fail || bad ? 1 : 0);
}
