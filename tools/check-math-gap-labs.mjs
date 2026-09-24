#!/usr/bin/env node
// Harness: the Mathematics syllabus-gap lessons each get their OWN Play-tab lab.
//
// The gap lessons (Consumer Arithmetic, Sets and the additions to the existing
// modules) carry per-lesson sets in lessonSets.mathematics, and the mathematics
// branch of ExperimentSandbox must resolve them by lessonId BEFORE the older
// per-experiment-type library — otherwise a Sets lesson would show the BODMAS
// lab that belongs to another lesson. This harness guards both halves:
//   1. every new lesson has exactly one well-formed set,
//   2. the older lessons are untouched (they still resolve by experiment type),
//   3. the routing branch exists and is ordered correctly.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const modules = JSON.parse(read("content/mathematics/modules.json"));
const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const GAP_LESSONS = [
    "profit-loss-and-discounts", "simple-and-compound-interest", "hire-purchase-and-instalments",
    "taxes-and-utility-bills", "exchange-rates-and-currency", "insurance-and-budgeting",
    "set-notation", "subsets-and-cardinality", "venn-diagrams", "union-intersection-complement",
    "shading-venn-regions", "set-word-problems",
    "types-of-numbers", "indices-and-surds", "standard-form", "factorization",
    "algebraic-fractions", "transposition-and-substitution", "linear-and-quadratic-graphs",
    "angles-and-polygons", "circle-theorems", "transformations",
    "frequency-tables-and-cumulative-frequency", "si-units-and-conversion",
];
const OLDER_LESSONS = [
    "real-numbers", "fractions-decimals-percentages", "algebraic-expressions", "quadratic-equations",
    "inequalities", "coordinate-geometry", "functions", "pythagoras-theorem", "trig-ratios", "vectors",
    "matrices", "central-tendency", "probability", "perimeter-area", "volume-capacity",
];

section("1. every new lesson has its own lab set");
const sets = (lessonSets.mathematics) || {};
for (const id of GAP_LESSONS) {
    check(!!sets[id], `${id}: has a lessonSets.mathematics entry`);
}
check(Object.keys(sets).length === GAP_LESSONS.length,
    `no stray mathematics sets (${Object.keys(sets).length} keys for ${GAP_LESSONS.length} new lessons)`);
const lessonIds = new Set(allLessons.map((l) => l.id));
for (const id of GAP_LESSONS) check(lessonIds.has(id), `${id}: is a real lesson id in modules.json`);

section("2. every set is well formed and matched to its lesson");
for (const [id, set] of Object.entries(sets)) {
    const where = `lessonSets.mathematics.${id}`;
    check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
    check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
    // The lab heading must not be the generic subject-level copy.
    check(!/^Subject|^Lab$/i.test(set.title.trim()), `${where}: title names the lesson topic`);
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
        check(items.every((i) => i.id && i.label && cats.some((c) => c.id === i.category)),
            `${where}: every item id/label/known category`);
    } else {
        check(false, `${where}: kind must be match or sort (got ${set.kind})`);
    }
}

section("3. the older lessons keep resolving by experiment type");
for (const id of OLDER_LESSONS) {
    check(!sets[id], `${id}: untouched (no per-lesson set, so its type library still applies)`);
}

section("4. routing: lessonId resolves before the experiment-type library");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const mathBranch = sandbox.slice(sandbox.indexOf('if (subjectId === "mathematics")'));
const perLesson = mathBranch.indexOf('lessonSets["mathematics"] && lessonSets["mathematics"][lessonId]');
const byType = mathBranch.indexOf("MATH_DRAG_TYPES.has(t)");
check(perLesson !== -1, "the mathematics branch consults lessonSets.mathematics");
check(byType !== -1, "the mathematics branch still has its experiment-type library");
check(perLesson !== -1 && byType !== -1 && perLesson < byType,
    "the per-lesson set is checked BEFORE the experiment-type library");
check(/if \(lessonId && lessonSets\["mathematics"\]/.test(mathBranch),
    "the per-lesson branch is guarded by lessonId (subject-page labs keep their own deck)");
check(/lessonId=\{lessonId\}/.test(mathBranch.slice(perLesson, perLesson + 220)),
    "the per-lesson branch passes lessonId through to DragDropLabel");

console.log(`\ncheck-math-gap-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
