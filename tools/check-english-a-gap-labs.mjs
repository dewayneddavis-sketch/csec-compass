#!/usr/bin/env node
// Harness: the English A syllabus-gap lessons each get their OWN Play-tab lab.
//
// English A routes labs by experiment type (englishSets[type]); the gap lessons
// carry per-lesson sets in lessonSets["english-a"] and the english-a branch of
// ExperimentSandbox must resolve them by lessonId BEFORE the type library,
// otherwise a functional-writing lesson would show the punctuation deck that
// belongs to another lesson.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const GAP_LESSONS = [
    "visual-text-literacy", "expository-and-poetic-comprehension", "syntax-and-sentence-structure",
    "descriptive-writing", "persuasive-techniques", "functional-writing", "functional-text-formats",
];
const OLDER_LESSONS = [
    "literal-meaning", "figurative-language", "identifying-main-points", "drafting-summary",
    "subject-verb-agreement", "punctuation-mastery", "synonyms-antonyms", "diction-context",
    "plot-structure", "argument-structure",
];

section("1. every new lesson has its own lab set");
const sets = lessonSets["english-a"] || {};
for (const id of GAP_LESSONS) check(!!sets[id], `${id}: has a lessonSets["english-a"] entry`);
check(Object.keys(sets).length === GAP_LESSONS.length,
    `no stray english-a sets (${Object.keys(sets).length} keys for ${GAP_LESSONS.length} new lessons)`);

const modules = JSON.parse(read("content/english-a/modules.json"));
const lessonIds = new Set(modules.flatMap((m) => m.lessons.map((l) => l.id)));
for (const id of GAP_LESSONS) check(lessonIds.has(id), `${id}: is a real lesson id in modules.json`);
for (const id of OLDER_LESSONS) check(lessonIds.has(id), `${id}: the older lesson still exists`);

section("2. every set is well formed and matched to its lesson");
for (const [id, set] of Object.entries(sets)) {
    const where = `lessonSets["english-a"].${id}`;
    check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
    check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
    if (set.kind === "match") {
        const pairs = set.pairs || [];
        check(pairs.length >= 4, `${where}: at least 4 pairs (has ${pairs.length})`);
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
            `${where}: every item id/label/known category`);
        check(new Set(cats.map((c) => c.id)).size === cats.length, `${where}: category ids are unique`);
        check(cats.every((c) => items.some((i) => i.category === c.id)), `${where}: every category is used`);
    } else {
        check(false, `${where}: kind must be match or sort (got ${set.kind})`);
    }
}

section("3. the older lessons keep resolving by experiment type");
for (const id of OLDER_LESSONS) {
    check(!sets[id], `${id}: untouched (no per-lesson set, so englishSets[type] still applies)`);
}

section("4. routing: lessonId resolves before the experiment-type library");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const branch = sandbox.slice(sandbox.indexOf('if (subjectId === "english-a")'));
const perLesson = branch.indexOf('lessonSets["english-a"] && lessonSets["english-a"][lessonId]');
const byType = branch.indexOf("ENG_DRAG_TYPES.has(t)");
check(perLesson !== -1, 'the english-a branch consults lessonSets["english-a"]');
check(byType !== -1, "the english-a branch still has its experiment-type library");
check(perLesson !== -1 && byType !== -1 && perLesson < byType,
    "the per-lesson set is checked BEFORE the experiment-type library");
check(/if \(lessonId && lessonSets\["english-a"\]/.test(branch),
    "the per-lesson branch is guarded by lessonId (subject-page labs keep their own deck)");
check(/lessonId=\{lessonId\}/.test(branch.slice(perLesson, perLesson + 240)),
    "the per-lesson branch passes lessonId through to DragDropLabel");

section("5. the new lessons use a lab type English A already understands");
const ENG_TYPES = new Set(["matching-game", "dialogue-builder", "punctuation-drag-drop", "plot-arranger",
    "outliner", "highlight-tool", "text-trimmer", "sentence-fixer", "word-swap"]);
const newLessonTypes = modules.flatMap((m) => m.lessons)
    .filter((l) => GAP_LESSONS.includes(l.id))
    .map((l) => [l.id, (l.experiment || {}).type]);
for (const [id, type] of newLessonTypes) {
    check(ENG_TYPES.has(type), `${id}: experiment type "${type}" is one English A already routes`);
}

console.log(`\ncheck-english-a-gap-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
