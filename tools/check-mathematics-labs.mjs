#!/usr/bin/env node
// Harness: the Mathematics Play tab — one lab for every lesson, exactly once.
//
// Mathematics is a PARTITION, not a one-set-per-lesson subject like Physics.
// 39 lessons split in two, and every lesson is in exactly one half:
//
//   * 24 lessons carry their own per-lesson set in lessonSets.mathematics —
//     all 24 have experiment.type "matching-game" or "classifier-sim", neither
//     of which is a recognised Mathematics lab type, so without a set they
//     would fall through to the generic Mathematics flashcard deck;
//   * 15 lessons are TYPE-KEYED — their experiment.type already resolves to a
//     dedicated tool (DragDropLabel, GraphingCalculator or BalanceScale), and a
//     per-lesson set would SHADOW that tool. 9 of the 15 are MATH_DRAG_TYPES;
//     the other 6 are the graphing and balance lessons, which is why the
//     message says "would shadow its dedicated tool" and not "its type
//     library" (the Physics wording, tools/check-physics-gap-labs.mjs:54 —
//     Physics has no graphing lessons, so that wording would be wrong here).
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
// set the corpus rule will never check again.
//
// Because Slice 0 adds no sets, the rule is VACUOUS on the real tree, so
// labProblems() takes `legacySets` as a PARAMETER defaulting to LEGACY_SETS and
// red controls R8/R9 move it — that is what forces real legacy sets through the
// corpus rule today, on the real data, without one content edit. A rule that
// cannot fail is not a rule.
//
// Usage:
//   node tools/check-mathematics-labs.mjs                     # the real tree
//   node tools/check-mathematics-labs.mjs --selftest           # synthetic fixture only
//   node tools/check-mathematics-labs.mjs --red-control       # + the 13 red controls
//   node tools/check-mathematics-labs.mjs --red-controls-all  # alias of --red-control
//
// Run it with the rest before any PR that touches Mathematics labs, routing or
// content:
//   for f in tools/check-*.mjs; do node "$f"; done
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0;
let fail = 0;
// Module-level assertion helper for the selftest section. labProblems() keeps
// its own counter so it can return problems instead of printing them.
const ok = (cond, msg) => { if (cond) pass += 1; else { fail += 1; console.log(`FAIL: ${msg}`); } };
const section = (t) => console.log(`\n== ${t}`);

const SELFTEST = process.argv.includes("--selftest");
const RED_CONTROL = process.argv.includes("--red-control") || process.argv.includes("--red-controls-all");

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
// corpus rule will never check again.
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
//   3 lessons → MATH_BALANCE_TYPES    → <BalanceScale subjectId="mathematics" … />
// i.e. 9 drag + 3 graphing + 3 balance = 15. Verified lesson-by-lesson against
// content/mathematics/modules.json and src/components/ExperimentSandbox.jsx.
// 39 − 15 = 24.
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
  // --- balance (3) — a set would shadow the BalanceScale
  "algebraic-expressions",           // balance-scale         → <BalanceScale />
  "perimeter-area",                  // area-builder
  "volume-capacity",                 // volume-filler
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
  balance: new Set(typesOf("MATH_BALANCE_TYPES")),                            // 3
};
const recognisedOf = (groups) => new Set([
  ...groups.drag, ...groups.graphing, ...groups.balance,
]);                                                                            // 19 types

// Folding: case, curly quotes/dashes, whitespace. Deliberately generous so a
// legitimately worded label is not failed on punctuation alone — and
// deliberately NOT normalising superscripts to carets (see the header).
const fold = (s) => String(s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();
const corpusOf = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \n "));

// The tool a type resolves to — used only for the assertion-2 message.
function toolOf(type, groups) {
  if (groups.drag.has(type)) return "DragDropLabel";
  if (groups.graphing.has(type)) return "GraphingCalculator";
  if (groups.balance.has(type)) return "BalanceScale";
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
    typeKeyed: ["b"],
    typeGroups: REAL_TYPE_GROUPS,
    types: recognisedOf(REAL_TYPE_GROUPS),
  };
  // JSON round-trip for the doctored copies, then re-attach the type Sets —
  // a Set does not survive JSON and a clone without them is not the same input.
  const cloneFixture = () => {
    const c = JSON.parse(JSON.stringify(FIXTURE));
    c.typeGroups = REAL_TYPE_GROUPS;
    c.types = recognisedOf(REAL_TYPE_GROUPS);
    return c;
  };
  const clean = labProblems(FIXTURE);
  ok(clean.length === 0, `selftest: a well-formed input yields zero problems (got ${clean.length}: ${clean.join(" | ")})`);

  section("selftest: the same function must FAIL on three doctored inputs");
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

  console.log(`\ncheck-mathematics-labs (selftest): ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
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
  console.log(`    types: ${REAL_TYPE_GROUPS.drag.size} drag + ${REAL_TYPE_GROUPS.graphing.size} graphing + ${REAL_TYPE_GROUPS.balance.size} balance = ${recognisedOf(REAL_TYPE_GROUPS).size} recognised`);
  console.log(`    grandfathered sets: ${LEGACY_SETS.length} (corpus rule applies to ${Object.keys(sets).filter((k) => !LEGACY_SETS.includes(k)).length} new set(s))`);
  // The positive control the spec calls for: the caller must be green on the
  // real tree, or the red runs below are a broken caller rather than a bite.
  const again = labProblems(REAL);
  if (again.length === 0) pass += 1;
  else { fail += 1; console.log("FAIL: the caller is green on the real tree, so the red runs are not a broken caller"); }
}

// ---------------------------------------------------------------------------
// --red-control / --red-controls-all: 13 controls, all on doctored INPUTS.
// Each must produce a problem whose message matches a named regex; then the
// caller is proved green on the untouched real tree.
// ---------------------------------------------------------------------------
if (RED_CONTROL) {
  section("2. red controls — every assertion is proved to bite");
  const results = [];
  const red = (name, why, expect, mutate) => {
    const input = cloneReal();
    mutate(input);
    const problems = labProblems(input);
    const missed = expect.filter((re) => !problems.some((p) => re.test(p)));
    const caught = missed.length === 0;
    results.push({ name, why, caught, missed, problems });
    const shown = problems.find((p) => expect.some((re) => re.test(p))) || problems[0] || "(no problem at all)";
    console.log(`  ${caught ? "caught  " : "MISSED  "} ${name} — ${why}`);
    console.log(`           ${shown}`);
    if (!caught) for (const re of missed) console.log(`           expected a problem matching ${re} and got none`);
  };

  // The A3 arithmetic is DERIVED, not pinned: the control expects the numbers
  // A3 must print for THIS tree with one set deleted (Mathematics Slice 1 took
  // it from 23/24 to 28/29). A hardcoded pair here goes stale the moment a
  // coverage slice adds a set, and a stale control reads as "the assertion
  // stopped biting". Deleting venn-diagrams removes one SET, never a type-keyed
  // lesson, so the coverage count (allLessons − TYPE_KEYED) is unchanged.
  const liveSetCount = Object.keys(REAL.sets).length;
  const coverageCount = REAL.allLessons.length - REAL.typeKeyed.length;
  red("R1", "a set deleted -> the count and the union both fire",
    [new RegExp(`^A3: ${liveSetCount - 1} sets for ${coverageCount} coverage lessons`),
     /^A8: LEGACY_SETS is not an exact partition/],
    (i) => { delete i.sets["venn-diagrams"]; });
  red("R2", "a set keyed to a lesson that does not exist -> A1",
    [/^A1: lessonSets\.mathematics\.mat-geo-bearings: "mat-geo-bearings" is not a lesson id/],
    (i) => {
      i.sets["mat-geo-bearings"] = { title: "Bearings Drill", subtitle: "Drag each.", kind: "match", pairs: [
        { id: "p1", label: "a", target: "b" }, { id: "p2", label: "b", target: "c" },
        { id: "p3", label: "c", target: "d" }, { id: "p4", label: "d", target: "a" },
      ] };
    });
  red("R3", "a set on a TYPE-KEYED lesson -> the shadow assertion AND the partition",
    [/^A2: trig-ratios: carries a per-lesson set, which would shadow its dedicated tool \(trig-circle — DragDropLabel\)/, /^A4: partition: .*duplicated trig-ratios/],
    (i) => {
      i.sets["trig-ratios"] = { title: "Trig Ratio Drill", subtitle: "Drag each.", kind: "match", pairs: [
        { id: "p1", label: "sin", target: "opposite over hypotenuse" },
        { id: "p2", label: "cos", target: "adjacent over hypotenuse" },
        { id: "p3", label: "tan", target: "opposite over adjacent" },
        { id: "p4", label: "cosec", target: "hypotenuse over opposite" },
      ] };
    });
  red("R4", "a set whose kind is neither match nor sort -> A5e",
    [/^A5e: lessonSets\.mathematics\.venn-diagrams: kind must be match or sort \(got order\)/],
    (i) => { i.sets["venn-diagrams"].kind = "order"; });
  red("R5", "two lessons sharing one activity heading -> A6",
    [/^A6: two lessons share one activity heading: "Number Families"/],
    (i) => { i.sets["venn-diagrams"].title = i.sets["types-of-numbers"].title; });
  red("R6", "an unrecognised experiment type on a lesson with no set -> A10",
    [/^A10: trig-ratios: type "text-sort" is not recognised and the lesson has no set/],
    (i) => { i.allLessons.find((l) => l.id === "trig-ratios").experiment.type = "text-sort"; });
  red("R7", "a module count the catalog no longer matches -> A11",
    [/^A11: metadata\.estimatedModules is 10, modules\.length is 9/],
    (i) => { i.metadata.estimatedModules = 10; });
  red("R8", "types-of-numbers forced through the corpus rule -> A7 names \"Perfect square\"",
    [/^A7: lessonSets\.mathematics\.types-of-numbers: "Perfect square" is not in that lesson's own copy/],
    (i) => { i.legacySets = i.legacySets.filter((k) => k !== "types-of-numbers"); });
  red("R9", "standard-form forced through the corpus rule -> A7 names \"4.5 × 10⁴\"",
    [/^A7: lessonSets\.mathematics\.standard-form: "4\.5 × 10⁴" is not in that lesson's own copy/],
    (i) => { i.legacySets = i.legacySets.filter((k) => k !== "standard-form"); });
  red("R10", "a legacy key that is no longer a live set -> the UNION mismatch, specifically",
    [/^A8: LEGACY_SETS is not an exact partition of the live sets: union names \[venn-diagrams\] that no set provides/],
    (i) => { delete i.sets["venn-diagrams"]; });
  red("R11", "LEGACY_SETS naming a key that is not a set -> A8 names it",
    [/^A8: LEGACY_SETS is not an exact partition of the live sets: "mat-geo-bearings" is not a set/],
    (i) => { i.legacySets = [...i.legacySets, "mat-geo-bearings"]; });
  red("R12", "an experiment stored as a bare string -> A9",
    [/^A9: real-numbers: experiment must be an object with a type and a description/],
    (i) => { i.allLessons.find((l) => l.id === "real-numbers").experiment = "interactive-quiz"; });
  // R13 is the live form of the corpus rule: R8/R9 force a LEGACY set through it,
  // which proves the rule can bite but not that a shipped NEW set is subject to
  // it. This one doctors a Slice 1 set, which is on the wrong side of
  // LEGACY_SETS by construction, so it is checked with no grandfathering at all.
  red("R13", "a NEW (non-grandfathered) set forced to display a string its lesson does not teach -> A7",
    [/^A7: lessonSets\.mathematics\.mat-num-properties-of-operations: "Zebra" is not in that lesson's own copy/],
    (i) => { i.sets["mat-num-properties-of-operations"].pairs[0].label = "Zebra"; });

  const caught = results.filter((r) => r.caught).length;
  // The caller is green on the untouched real tree, so the controls above were
  // exercised by a working caller and not by an already-broken one.
  const stillGreen = labProblems(REAL).length === 0;
  console.log(`\n  caller green on the untouched real tree: ${stillGreen ? "yes" : "NO"}`);
  console.log(`RED CONTROLS: ${caught}/${results.length} caught`);
  if (!stillGreen) { fail += 1; console.log("FAIL: the caller is not green on the real tree"); }
  if (caught !== results.length) { fail += 1; console.log("FAIL: a red control was not caught"); }
  else pass += 1;
}

console.log(`\ncheck-mathematics-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
