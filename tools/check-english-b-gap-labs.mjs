#!/usr/bin/env node
// Harness: the English B syllabus-gap module (Prescribed Texts) is wired end to end.
//
// English B routes EVERY lesson through lessonSets["english-b"][lessonId] (its own
// ExperimentSandbox branch), so a new lesson without a set would fall through to the
// subject-level deck and show another lesson's activity. This harness asserts one
// topic-matched set per lesson (24 = 18 older + 6 new), the older sets untouched, the
// routing order, the banks (100 practice / 25 knowledge check with the new lessons
// represented and every old lesson still represented), the additive module rewrite and
// the byte-identical mirrors.
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

const NEW_LESSONS = ["eb-l7-1", "eb-l7-2", "eb-l7-3", "eb-l7-4", "eb-l7-5", "eb-l7-6"];
const OLDER_LESSONS = [
    "eb-l1-1", "eb-l1-2", "eb-l1-3", "eb-l2-1", "eb-l2-2", "eb-l2-3",
    "eb-l3-1", "eb-l3-2", "eb-l3-3", "eb-l4-1", "eb-l4-2", "eb-l4-3",
    "eb-l5-1", "eb-l5-2", "eb-l5-3", "eb-l6-1", "eb-l6-2", "eb-l6-3",
];
// The 18 sets that shipped before this module existed: a new lesson must never
// silently take one of these over.
const OLDER_SET_KINDS = {
    "eb-l1-1": "match", "eb-l1-2": "sort", "eb-l1-3": "match", "eb-l2-1": "match",
    "eb-l2-2": "match", "eb-l2-3": "match", "eb-l3-1": "sort", "eb-l3-2": "match",
    "eb-l3-3": "match", "eb-l4-1": "order", "eb-l4-2": "match", "eb-l4-3": "match",
    "eb-l5-1": "order", "eb-l5-2": "sort", "eb-l5-3": "sort", "eb-l6-1": "order",
    "eb-l6-2": "match", "eb-l6-3": "match",
};
const EB_TYPES = new Set(["matching-game", "highlight-tool", "drag-drop",
    "vocab-flashcards", "plot-arranger", "outliner", "sentence-fixer", "interactive-quiz"]);

section("1. one lab set per lesson, and the six new lessons have their own");
const sets = lessonSets["english-b"] || {};
const modules = readJson("content/english-b/modules.json");
const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
for (const id of NEW_LESSONS) check(!!sets[id], `${id}: has a lessonSets["english-b"] entry`);
for (const id of lessonIds) check(!!sets[id], `${id}: every lesson id resolves to its own set`);
const keys = Object.keys(sets);
check(keys.length === lessonIds.length,
    `no stray sets (${keys.length} keys for ${lessonIds.length} lessons)`);
check(keys.every((k) => lessonIds.includes(k)), "every set key is a real lesson id");

section("2. the module rewrite is additive");
check(modules.length === 7, `7 modules after the gap module (has ${modules.length})`);
const modIds = modules.map((m) => m.id);
check(modIds[6] === "eb-mod-7", "the new module is appended as eb-mod-7");
const allIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
check(olderOrderIntact(allIds), "the 18 original lesson ids keep their original order");
check(NEW_LESSONS.every((id) => allIds.includes(id)), "all six new lesson ids are present");
check(new Set(allIds).size === allIds.length, "no duplicate lesson id");
const meta = readJson("content/english-b/metadata.json");
check(meta.estimatedModules === modules.length,
    `metadata.estimatedModules matches the module count (${meta.estimatedModules} vs ${modules.length})`);

function olderOrderIntact(ids) {
    const seen = ids.filter((id) => OLDER_LESSONS.includes(id));
    return seen.length === OLDER_LESSONS.length && seen.every((id, i) => id === OLDER_LESSONS[i]);
}

section("3. the older lessons keep the sets they shipped with");
for (const id of OLDER_LESSONS) {
    check(!!sets[id], `${id}: still has its own set`);
    check(sets[id] && sets[id].kind === OLDER_SET_KINDS[id],
        `${id}: kind is unchanged (${sets[id] && sets[id].kind})`);
}

section("4. every new set is well formed and unambiguous");
for (const id of NEW_LESSONS) {
    const set = sets[id];
    if (!set) continue;
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

section("5. routing: the english-b branch resolves by lessonId, before the fallback");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const bStart = sandbox.indexOf('if (subjectId === "english-b")');
check(bStart !== -1, "ExperimentSandbox has an english-b branch");
const bBranch = bStart === -1 ? "" : sandbox.slice(bStart, bStart + 400);
check(/lessonId=\{lessonId\}/.test(bBranch), "the english-b branch passes lessonId through to DragDropLabel");
check(bBranch.includes('subjectId="english-b"'), "the english-b branch renders the english-b deck");
const fallback = sandbox.indexOf("if (lessonId && lessonSets[subjectId])");
check(bStart !== -1 && fallback !== -1 && bStart < fallback,
    "the english-b branch is reached before the generic lessonSets[subjectId] fallback");

section("6. the new lessons use a lab type English B already understands");
for (const id of NEW_LESSONS) {
    const lesson = modules.flatMap((m) => m.lessons).find((l) => l.id === id);
    const type = ((lesson || {}).experiment || {}).type;
    check(EB_TYPES.has(type), `${id}: experiment type "${type}" is one English B already routes`);
}

section("7. banks: exactly 100 practice questions and 25 knowledge-check items");
const practice = readJson("content/english-b/practice.json");
const kc = readJson("content/english-b/knowledge-check.json");
check(practice.length === 100, `practice bank is exactly 100 (has ${practice.length})`);
check(kc.length === 25, `knowledge check is exactly 25 (has ${kc.length})`);
const byTopic = (list) => list.reduce((a, q) => { a[q.topic] = (a[q.topic] || 0) + 1; return a; }, {});
const pTopic = byTopic(practice), kTopic = byTopic(kc);
check(practice.every((q) => lessonIds.includes(q.topic)), "every practice topic is a real lesson id");
check(kc.every((q) => lessonIds.includes(q.topic)), "every knowledge-check topic is a real lesson id");
for (const id of NEW_LESSONS) {
    check((pTopic[id] || 0) >= 1, `${id}: represented in the practice bank`);
    check((kTopic[id] || 0) >= 1, `${id}: represented in the knowledge check`);
}
for (const id of OLDER_LESSONS) {
    check((pTopic[id] || 0) >= 1, `${id}: still has at least one practice question`);
}
check(practice.filter((q) => q.id === "p35").length === 1 && pTopic["eb-l7-3"] >= 2,
    "the comparative-essay item was retagged onto eb-l7-3 (retag before you retire)");
const retired = ["p6", "p11", "p17", "p24", "p42", "p48", "kc1", "kc4", "kc6", "kc9", "kc16", "kc18"];
const liveIds = new Set([...practice, ...kc].map((q) => q.id));
for (const id of retired) check(!liveIds.has(id), `${id}: retired id is no longer in use`);

section("8. the content mirrors stay byte-identical");
for (const f of ["modules.json", "metadata.json", "practice.json", "knowledge-check.json", "sba.json", "paper2.json"]) {
    let same = true;
    try {
        same = read("content/english-b/" + f) === read("public/content/english-b/" + f);
    } catch (e) { same = false; }
    check(same, `content/english-b/${f} and its public mirror are byte-identical`);
}

console.log(`\ncheck-english-b-gap-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
