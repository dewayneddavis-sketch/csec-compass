#!/usr/bin/env node
// Harness: the Clothing, Textile and Fashion syllabus-gap lesson
// ("Textiles Colouring and Finishing", ctf-l1-4) gets its OWN Play-tab lab, and
// the additive gap batch left the other 15 lessons exactly as they were.
//
// CTF has no dedicated ExperimentSandbox branch: it resolves through the generic
// per-subject branch (`if (lessonId && lessonSets[subjectId])`) and DragDropLabel
// then looks the set up as lessonSets[subjectId][lessonId] BEFORE any
// experiment-type library. So if ctf-l1-4 had no set it would silently fall
// through to the CTF subject-level deck and show some other lesson's activity —
// a bug no existing harness would see. This one guards both halves:
//   1. one well-formed set per lesson id, and no stray keys,
//   2. the 15 older lesson ids are untouched (nothing renamed or reordered),
//   3. both routing lookups still resolve by lessonId,
//   4. the new lesson's topic is reachable in practice / knowledge check / paper 2.
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

const SUBJECT = "clothing-textile-and-fashion";
const NEW_LESSON = "ctf-l1-4";
// The 15 lesson ids that shipped before this batch, in their original order.
const OLD_LESSONS = [
    "ctf-l1-1", "ctf-l1-2", "ctf-l1-3",
    "ctf-l2-1", "ctf-l2-2", "ctf-l2-3",
    "ctf-l3-1", "ctf-l3-2", "ctf-l3-3",
    "ctf-l4-1", "ctf-l4-2", "ctf-l4-3",
    "ctf-l5-1", "ctf-l5-2", "ctf-l5-3",
];

const modules = readJson(`content/${SUBJECT}/modules.json`);
const lessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const lessonIds = lessons.map((l) => l.id);
const practice = readJson(`content/${SUBJECT}/practice.json`);
const kc = readJson(`content/${SUBJECT}/knowledge-check.json`);
const paper2 = readJson(`content/${SUBJECT}/paper2.json`);

section("1. the new lesson is additive - no existing lesson id moved");
const survivors = lessons.filter((l) => l.id !== NEW_LESSON).map((l) => l.id);
check(survivors.join(",") === OLD_LESSONS.join(","),
    "the 15 older lesson ids survive in their original order");
check(lessonIds.length === OLD_LESSONS.length + 1,
    `${NEW_LESSON} is the only new lesson (${lessonIds.length} lessons)`);
check(new Set(lessonIds).size === lessonIds.length, "lesson ids are unique");
const mod1 = modules.find((m) => m.id === "ctf-mod-1");
check(!!mod1 && mod1.lessons[mod1.lessons.length - 1].id === NEW_LESSON,
    `${NEW_LESSON} is appended last to ctf-mod-1`);
check(modules.length === 5, "module count is unchanged (a lesson, not a module)");
check(readJson(`content/${SUBJECT}/metadata.json`).estimatedModules === 5,
    "metadata estimatedModules still matches the 5 modules");
check(modules.flatMap((m) => m.lessons).every((l) => typeof l.experiment?.type === "string" && l.experiment.type),
    "every lesson carries an experiment type");
check(lessons.find((l) => l.id === NEW_LESSON).experiment.type === "dye-and-finish-lab",
    `${NEW_LESSON} names its dye/finish lab`);

section("2. every lesson has its own lab set, and there are no strays");
const sets = lessonSets[SUBJECT] || {};
check(!!sets[NEW_LESSON], `${NEW_LESSON}: has a lessonSets["${SUBJECT}"] entry`);
for (const id of lessonIds) check(!!sets[id], `${id}: has a lessonSets entry`);
const keyCount = Object.keys(sets).length;
check(keyCount === lessonIds.length,
    `one set per lesson (${keyCount} keys for ${lessonIds.length} lessons, no strays)`);

section("3. every set is well formed");
for (const [id, set] of Object.entries(sets)) {
    const where = `lessonSets["${SUBJECT}"].${id}`;
    check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
    check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
    check(!/^(Subject|Lab)$/i.test(set.title.trim()), `${where}: title names the lesson topic`);
    if (set.kind === "match") {
        const pairs = set.pairs || [];
        check(pairs.length >= 4, `${where}: at least 4 pairs (has ${pairs.length})`);
        check(pairs.length <= 7, `${where}: at most 7 pairs (has ${pairs.length})`);
        check(pairs.every((p) => p.id && p.target && p.label), `${where}: every pair has id/target/label`);
        const ids = pairs.map((p) => p.id), targets = pairs.map((p) => p.target);
        check(new Set(ids).size === ids.length, `${where}: pair ids are unique`);
        check(new Set(targets).size === targets.length, `${where}: targets are unique (unambiguous drops)`);
    } else if (set.kind === "sort") {
        const cats = set.categories || [], items = set.items || [];
        check(cats.length >= 2, `${where}: at least 2 categories`);
        check(items.length >= 4 && items.length <= 8, `${where}: 4-8 sort items (has ${items.length})`);
        check(items.every((i) => i.id && i.label && cats.some((c) => c.id === i.category)),
            `${where}: every item id/label/known category`);
        const ids = items.map((i) => i.id);
        check(new Set(ids).size === ids.length, `${where}: item ids are unique`);
    } else if (set.kind === "order") {
        const items = set.items || [];
        check(items.length >= 4, `${where}: at least 4 ordered items (has ${items.length})`);
        const orders = items.map((i) => Number(i.order)).sort((a, b) => a - b);
        check(items.every((i) => i.id && i.label), `${where}: every item has id/label`);
        check(orders.join(",") === orders.map((_, n) => n + 1).join(","),
            `${where}: orders are 1..n with no gaps or repeats`);
    } else {
        check(false, `${where}: kind must be match, sort or order (got ${set.kind})`);
    }
}
const newSet = sets[NEW_LESSON] || {};
check(newSet.pairs.some((p) => /dye/i.test(p.label)), `${NEW_LESSON}: the lab covers dyeing`);
check(newSet.pairs.some((p) => /ing$/i.test(p.label)), `${NEW_LESSON}: the lab covers finishing`);

section("4. routing resolves the per-lesson set by lessonId");
const sandbox = read("src/components/ExperimentSandbox.jsx");
check(/if \(lessonId && lessonSets\[subjectId\]\)/.test(sandbox),
    "ExperimentSandbox resolves lessonSets[subjectId][lessonId]");
const genericIdx = sandbox.indexOf("if (lessonId && lessonSets[subjectId])");
const nothingIdx = sandbox.indexOf('return flash(subjectId);');
check(genericIdx !== -1 && nothingIdx !== -1 && genericIdx < nothingIdx,
    "the per-lesson lookup runs before the subject fallback deck");
check(/lessonId=\{lessonId\}/.test(sandbox.slice(genericIdx, genericIdx + 160)),
    "the per-lesson branch passes lessonId through to DragDropLabel");
const ddl = read("src/components/DragDropLabel.jsx");
const byLesson = ddl.indexOf("lessonSets[subjectId] && lessonSets[subjectId][lessonId]");
const byType = ddl.indexOf("subjectTypeSets[subjectId][experimentType]");
check(byLesson !== -1, "DragDropLabel looks the set up by subject + lessonId");
check(byLesson !== -1 && byType !== -1 && byLesson < byType,
    "the per-lesson set wins over the experiment-type library");

section("5. the new lesson's topic is reachable in every bank");
check(practice.length === 100, `practice bank is exactly 100 questions (${practice.length})`);
check(kc.length === 25, `knowledge check is exactly 25 questions (${kc.length})`);
const practiceFor = practice.filter((q) => q.topic === NEW_LESSON);
const kcFor = kc.filter((q) => q.topic === NEW_LESSON);
check(practiceFor.length >= 6, `${NEW_LESSON}: at least 6 practice questions (has ${practiceFor.length})`);
check(kcFor.length >= 1, `${NEW_LESSON}: at least 1 knowledge-check question (has ${kcFor.length})`);
check(lessons.every((l) => practice.some((q) => q.topic === l.id)), "every lesson still has a practice question");
check(lessons.every((l) => kc.some((q) => q.topic === l.id)), "every lesson still has a knowledge-check question");
const q2 = paper2.find((q) => q.id === "ctf-p2-02");
check(!!q2 && q2.topic === NEW_LESSON,
    `ctf-p2-02 (dyeing and finishing / care) is tagged ${NEW_LESSON}`);
check(paper2.every((q) => lessonIds.includes(q.topic)), "every paper2 topic is a real lesson id");

section("6. no old lesson was starved of questions");
for (const id of OLD_LESSONS) {
    const n = practice.filter((q) => q.topic === id).length;
    // ctf-l1-2 gave one item (sanforising) to the new lesson; the rest kept 6+.
    const floor = id === "ctf-l1-2" ? 5 : 6;
    check(n >= floor, `${id}: keeps at least ${floor} practice questions (has ${n})`);
}

console.log(`\ncheck-ctf-gap-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
