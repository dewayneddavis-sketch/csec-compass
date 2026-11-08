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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const SELFTEST = process.argv.includes("--selftest");
const RED_CONTROL = process.argv.includes("--red-control") || process.argv.includes("--red-controls-all");

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
const PENDING = [
  // slice A — consumer-arithmetic: 6 sets, 35 items
  "profit-loss-and-discounts",
  "simple-and-compound-interest",
  "hire-purchase-and-instalments",
  "taxes-and-utility-bills",
  "exchange-rates-and-currency",
  "insurance-and-budgeting",
  // slice B — sets: 6 sets, 31 items
  "set-notation",
  "subsets-and-cardinality",
  "venn-diagrams",
  "union-intersection-complement",
  "shading-venn-regions",
  "set-word-problems",
  // slice C — number-theory-computation: 8 sets, 46 items
  "types-of-numbers",
  "indices-and-surds",
  "standard-form",
  "mat-num-number-bases-and-place-value",
  "mat-num-significant-figures-and-decimal-places",
  "mat-num-properties-of-operations",
  "mat-num-number-sequences",
  "mat-num-ratio-and-proportion",
  // slice D — measurement: 4 sets, 26 items
  "si-units-and-conversion",
  "mat-meas-surface-area-of-solids",
  "mat-meas-measurement-error",
  "mat-meas-scale-and-scale-drawings",
  // slice E — algebra (3 sets, 15 items) + relations-functions-graphs (1, 5): 20
  "factorization",
  "algebraic-fractions",
  "transposition-and-substitution",
  "linear-and-quadratic-graphs",
  // slice F — geometry-trigonometry (2, 12) + vectors-matrices (1, 5) +
  // statistics-probability (1, 6): 23 items
  "angles-and-polygons",
  "circle-theorems",
  "transformations",
  "frequency-tables-and-cumulative-frequency",
];

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

function baseEnv() {
  return {
    sets: lessonSets.mathematics,
    lessonTypes: lessonTypesOf(),
    ddSource: read("src/components/DragDropLabel.jsx"),
    sywSource: read("tools/check-show-your-work.mjs"),
    playCopySource: read("tools/check-play-copy.mjs"),
    pending: PENDING.slice(),
    expectedItems: 181,
    workingSrc: read("src/data/mathWorking.js"),
  };
}

async function realEnv() {
  const working = await import(pathToFileURL(path.join(root, "src", "data", "mathWorking.js")).href);
  const workings = (await import(pathToFileURL(path.join(root, "src", "data", "mathLessonWorkings.js")).href)).mathLessonWorkings;
  return { ...baseEnv(), working, workings };
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

  // ---- A8: ANSWER-ALWAYS — all 181 per-lesson items reveal their answer -----
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
  fixture.pending = [];
  fixture.expectedItems = fxItems.length;
  const clean = revealProblems(fixture);
  ok(clean.length === 0, `selftest: a well-formed fixture yields zero problems (got ${clean.length}: ${clean.join(" | ")})`);

  section("selftest: the same assertions must FAIL on doctored fixtures");
  // (1) an authored entry for a lesson that does not own a set
  const badLesson = await treeEnv({ workingsSrc: 'export const mathLessonWorkings = { "mat-geo-bearings": { p1: ["a", "b"] } };\n' });
  badLesson.sets = { [FX_LESSON]: fxSet };
  badLesson.pending = [FX_LESSON];
  const badLessonProblems = revealProblems(badLesson);
  ok(badLessonProblems.some((p) => /^A1: mathLessonWorkings\.mat-geo-bearings: "mat-geo-bearings" is not a lesson that owns a set/.test(p)),
    `selftest: an entry for a non-owning lesson fails A1 (${badLessonProblems[0] || "no problem"})`);
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
}

// ---------------------------------------------------------------------------
// --red-control: every assertion must be proved to bite. Controls that need
// different data drive a temp copy of the REAL resolver.
// ---------------------------------------------------------------------------
if (RED_CONTROL) {
  section("2. red controls — every assertion is proved to bite");
  const results = [];
  const red = async (name, why, expect, mutate) => {
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

  // A1
  await red("R1", "a working keyed to a lesson that owns no set -> A1",
    [/^A1: mathLessonWorkings\.mat-geo-bearings/],
    () => treeEnv({ workingsSrc: 'export const mathLessonWorkings = { "mat-geo-bearings": { p1: ["a", "b"] } };\n' }));
  await red("R2", "a working keyed to an item id that set does not have -> A1",
    [/^A1: mathLessonWorkings\.profit-loss-and-discounts\.p99/],
    () => treeEnv({ workingsSrc: 'export const mathLessonWorkings = { "profit-loss-and-discounts": { p99: ["a", "b"] } };\n' }));

  // A2 / A3 (data-only, so an in-memory override is enough)
  await red("R3", "a live set dropped from PENDING and not authored -> A2",
    [/^A2: 1 live per-lesson set\(s\) are neither authored nor in PENDING: \[venn-diagrams\]/],
    async () => ({ ...(await realEnv()), pending: PENDING.filter((k) => k !== "venn-diagrams") }));
  await red("R4", "PENDING naming a key that is not a live set -> A2",
    [/^A2: PENDING ∪ authored names 1 key\(s\) that are not live per-lesson sets: \[mat-geo-bearings\]/],
    async () => ({ ...(await realEnv()), pending: [...PENDING, "mat-geo-bearings"] }));
  await red("R5", "a lesson authored but left in PENDING -> A3",
    [/^A3: 1 lesson\(s\) are both authored and PENDING: \[profit-loss-and-discounts\]/],
    async () => {
      const env = await treeEnv({ workingsSrc: 'export const mathLessonWorkings = { "profit-loss-and-discounts": { p1: ["a", "b"] } };\n' });
      return env; // profit-loss-and-discounts is still in PENDING
    });

  // A4 (including ruling 3's numeric token boundary)
  await red("R6", "a last step that states a different answer -> A4",
    [/^A4: mathLessonWorkings\.profit-loss-and-discounts\.p1:/],
    async () => {
      const env = await treeEnv({ workingsSrc: 'export const mathLessonWorkings = { "profit-loss-and-discounts": { p1: ["Read it", "the answer is 999"] } };\n' });
      return env;
    });
  await red("R7", "a numeric answer that only appears inside a longer number -> A4 (token boundary)",
    [/^A4: mathLessonWorkings\.profit-loss-and-discounts\.p1:/],
    async () => {
      // p1's real answer, glued into a longer number: "= 1<answer>".
      const answer = itemsOf(lessonSets.mathematics["profit-loss-and-discounts"]).find((i) => ITEM_ANSWER_NUMERIC.test(String(i.answer)))?.answer;
      const src = `export const mathLessonWorkings = { "profit-loss-and-discounts": { p1: ["Read it", "= 1${answer}"] } };\n`;
      return treeEnv({ workingsSrc: src });
    });

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

  // A8 / A9 — the two rules this PR exists for.
  await red("R11", "the old gate: no working means no reveal -> A8 (all 181)",
    [/^A8: profit-loss-and-discounts\/p1: labReveal returned null/],
    () => treeEnv({ workingSrc: workSrc.replace("  return { answer, steps: steps || [] };", "  return steps ? { answer, steps } : null;") }));
  await red("R12", "a placeholder step invented when none is authored -> A9",
    [/^A9: profit-loss-and-discounts\/p1: no working is authored, so steps must be exactly \[\]/],
    () => treeEnv({ workingSrc: workSrc.replace("  return { answer, steps: steps || [] };", '  return { answer, steps: steps || ["work it out"] };') }));

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
