#!/usr/bin/env node
// Harness: the Biology coverage-gap build (task 33b20aee, owner ruling
// 2026-10-08) must not regress, and the defect it fixes must stay fixed.
//
// The shipped Biology bank carried drill items whose `topic` pointed at a
// lesson that never taught them. WeakTopicsPanel turns every weak topic into a
// "Revise" link to /lesson/biology/<topic>, so a student who missed a digestion
// question was sent to revise The Circulatory System. This harness guards the
// three halves of the fix:
//   1. every drill item's topic is a real Biology lesson id, every lesson has
//      at least one practice item, and the bank floors are exactly 100 / 25;
//   2. the 8 new coverage-gap lessons each carry exactly one well-formed,
//      topic-matched Play-tab lab in lessonSets.biology, and the pre-existing
//      lessons keep the sets they had;
//   3. the routing works: ExperimentSandbox passes lessonId through for
//      biology and DragDropLabel resolves the per-lesson set first.
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

const GAP_LESSONS = [
    "nutrition-and-digestion", "transport-and-growth-in-plants", "breathing-and-gas-exchange",
    "nervous-system-and-sense-organs", "disease-and-pathogens", "body-defences-and-immunity",
    "reproduction-and-development", "classification-of-living-things",
];
// lessons that shipped before this PR (cell-structure is deliberately absent -
// it keeps the subject-level cell diagram in DragDropLabel's subjectSets).
const ORIGINAL_LESSONS_WITH_SETS = [
    "osmosis-diffusion", "photosynthesis", "circulatory-system", "respiration",
    "excretion-homeostasis", "food-chains", "human-impact", "dna-inheritance",
    "selection-evolution",
];
const ALL_ORIGINAL_LESSONS = ["cell-structure", ...ORIGINAL_LESSONS_WITH_SETS];

const modules = readJson("content/biology/modules.json");
const lessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const lessonIds = new Set(lessons.map((l) => l.id));
const practice = readJson("content/biology/practice.json");
const kc = readJson("content/biology/knowledge-check.json");

section("1. every Original lesson survives, unchanged in order");
const beforeOrder = ALL_ORIGINAL_LESSONS;
const nowOrder = lessons.map((l) => l.id);
check(beforeOrder.every((id) => nowOrder.includes(id)), "all 10 original lesson ids are still present");
const perModule = {};
for (const m of modules) perModule[m.id] = (m.lessons || []).map((l) => l.id);
check(perModule["cells-life-processes"].slice(0, 2).join() === "cell-structure,osmosis-diffusion",
    "cells-life-processes keeps its original lessons first");
check(perModule["nutrition-transport"].slice(0, 2).join() === "photosynthesis,circulatory-system",
    "nutrition-transport keeps its original lessons first");
check(perModule["respiration-excretion"].slice(0, 2).join() === "respiration,excretion-homeostasis",
    "respiration-excretion keeps its original lessons first");
check(perModule["ecology-environment"].slice(0, 2).join() === "food-chains,human-impact",
    "ecology-environment keeps its original lessons first");
check(perModule["genetics-variation"].slice(0, 2).join() === "dna-inheritance,selection-evolution",
    "genetics-variation keeps its original lessons first");
check(lessons.length === 18, `Biology now has 18 lessons (has ${lessons.length})`);

section("2. every new lesson exists, has content, and is wired to the catalog");
for (const id of GAP_LESSONS) {
    const l = lessons.find((x) => x.id === id);
    check(!!l, `${id}: is a lesson in modules.json`);
    if (!l) continue;
    check(typeof l.title === "string" && l.title.trim().length > 3, `${id}: has a title`);
    check(typeof l.content === "string" && l.content.split("\n\n").length >= 3,
        `${id}: has at least 3 taught paragraphs (has ${(l.content || "").split("\n\n").length})`);
    check(Array.isArray(l.objectives) && l.objectives.length >= 2, `${id}: has objectives`);
    check(Array.isArray(l.concepts) && l.concepts.length >= 2, `${id}: has concepts`);
    check(l.experiment && typeof l.experiment.type === "string" && l.experiment.description,
        `${id}: declares a Play-tab lab`);
    check(!/promise|coming soon|will show/i.test(l.experiment.description || ""),
        `${id}: the lab description promises nothing it does not render`);
}
const meta = readJson("content/biology/metadata.json");
check(meta.estimatedModules === modules.length,
    `metadata.estimatedModules tracks the module count (${meta.estimatedModules} vs ${modules.length})`);

section("3. the drill banks: floors hold and every item has a real teaching home");
check(practice.length === 100, `practice bank is exactly 100 (is ${practice.length})`);
check(kc.length === 25, `knowledge check is exactly 25 (is ${kc.length})`);
const practiceIds = practice.map((q) => q.id);
const kcIds = kc.map((q) => q.id);
check(new Set(practiceIds).size === practiceIds.length, "practice ids are unique");
check(new Set(kcIds).size === kcIds.length, "knowledge-check ids are unique");
const badPractice = practice.filter((q) => !lessonIds.has(q.topic));
check(badPractice.length === 0, `every practice topic is a real lesson id (${badPractice.map((q) => q.id + "->" + q.topic).join(", ")})`);
const badKc = kc.filter((q) => !lessonIds.has(q.topic));
check(badKc.length === 0, `every knowledge-check topic is a real lesson id (${badKc.map((q) => q.id + "->" + q.topic).join(", ")})`);
const counts = new Map(lessons.map((l) => [l.id, 0]));
for (const q of practice) counts.set(q.topic, (counts.get(q.topic) || 0) + 1);
const emptyLessons = lessons.filter((l) => (counts.get(l.id) || 0) === 0).map((l) => l.id);
check(emptyLessons.length === 0,
    `no lesson is left with zero practice items (${emptyLessons.join(", ")}) - weak-topic analytics need one`);
const newLessonCounts = GAP_LESSONS.map((id) => counts.get(id) || 0);
check(newLessonCounts.every((n) => n >= 2), `every new lesson is drilled (${newLessonCounts.join(", ")})`);
check(practiceIds.includes("p101") && practiceIds.includes("p102"),
    "the two new selection-evolution items replaced the retired duplicates");
check(!practiceIds.includes("p28") && !practiceIds.includes("p36"),
    "the two retired duplicate items are gone");
check(kcIds.includes("q26") && !kcIds.includes("q23"),
    "the untaught joint question was replaced by the immunity item");

section("4. content/ and public/content/ mirrors are byte-identical");
for (const f of ["modules.json", "practice.json", "knowledge-check.json", "metadata.json"]) {
    check(read(`content/biology/${f}`) === read(`public/content/biology/${f}`),
        `content/biology/${f} matches its public/ mirror`);
}

section("5. one well-formed, topic-matched lab per new lesson");
const sets = lessonSets.biology || {};
for (const id of GAP_LESSONS) check(!!sets[id], `lessonSets.biology.${id}: has a lab set`);
check(Object.keys(sets).length === GAP_LESSONS.length + ORIGINAL_LESSONS_WITH_SETS.length,
    `no stray biology sets (${Object.keys(sets).length} keys)`);
for (const id of ALL_ORIGINAL_LESSONS.filter((x) => x !== "cell-structure")) {
    check(!!sets[id], `lessonSets.biology.${id}: the original set is still there`);
}
for (const [id, set] of Object.entries(sets)) {
    const where = `lessonSets.biology.${id}`;
    check(lessonIds.has(id), `${where}: is a real lesson id`);
    check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
    check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
    check(["match", "sort", "order", "diagram"].includes(set.kind), `${where}: kind is supported (${set.kind})`);
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
        check(new Set(items.map((i) => i.id)).size === items.length, `${where}: item ids are unique`);
    } else if (set.kind === "order") {
        const items = set.items || [];
        check(items.length >= 4, `${where}: at least 4 items (has ${items.length})`);
        const orders = items.map((i) => i.order);
        check(orders.every((o) => Number.isInteger(o) && o >= 1 && o <= items.length),
            `${where}: orders are 1..n`);
        check(new Set(orders).size === items.length, `${where}: orders are unique`);
    }
}

section("6. routing: biology passes lessonId and DragDropLabel resolves it first");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const bioBranch = sandbox.slice(sandbox.indexOf('if (subjectId === "biology")'),
    sandbox.indexOf('if (subjectId === "human-social-biology")'));
check(/DragDropLabel subjectId="biology"/.test(bioBranch), "the biology branch renders DragDropLabel");
check(/lessonId=\{lessonId\}/.test(bioBranch), "the biology branch passes lessonId through");
const drag = read("src/components/DragDropLabel.jsx");
const perLesson = drag.indexOf("lessonSets[subjectId] && lessonSets[subjectId][lessonId]");
const byType = drag.indexOf("subjectTypeSets[subjectId]");
const subjectWide = drag.indexOf('subjectSets[subjectId] || subjectSets["english-a"]');
check(perLesson !== -1, "DragDropLabel consults lessonSets[subjectId][lessonId]");
check(byType !== -1 && subjectWide !== -1, "DragDropLabel still has its type and subject-wide fallbacks");
check(perLesson !== -1 && perLesson < byType && perLesson < subjectWide,
    "the per-lesson set resolves BEFORE the type and subject-wide fallbacks");

console.log(`\ncheck-biology-gap-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
