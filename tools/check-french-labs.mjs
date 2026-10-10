#!/usr/bin/env node
// Harness: every French lesson's Play tab shows its OWN topic-matched lab.
//
// Before this change, a French lesson resolved to no per-lesson set, so
// DragDropLabel fell through to the subject-level deck and FlashcardSystem's
// SUBJECT_DECK mapped `french: "spanish"` — i.e. a French lesson displayed the
// SPANISH vocabulary deck. Every one of the 18 French lessons now carries its
// own set in lessonSets.french, built from that lesson's own content in
// content/french/modules.json. This harness guards:
//   1. coverage: exactly one set per French lesson, none for a non-lesson key,
//   2. every set is well formed AND every string the student reads appears in
//      that lesson's own text (so the lab cannot drift from its lesson),
//   3. the other subjects' blocks are untouched,
//   4. routing: the per-lesson lookup is what a French lesson reaches, before
//      the subject-deck fallback, and French has its own flashcard deck so no
//      subject-level lab can show Spanish words either.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

// The same rule the authoring script applies: accents, apostrophes and case are
// folded away, so the lesson's own wording is what is being checked.
const norm = (s) => String(s)
  .replace(/[\u2018\u2019\u00b4]/g, "'")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ").toLowerCase().trim();

const modules = JSON.parse(read("content/french/modules.json"));
const lessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const lessonById = new Map(lessons.map((l) => [l.id, l]));
const lessonText = (l) => norm([
  l.title, l.content, ...(l.objectives || []), ...(l.concepts || []),
].join(" "));

const sets = lessonSets.french || {};
const ids = lessons.map((l) => l.id);
const missing = ids.filter((id) => !sets[id]);
const extra = Object.keys(sets).filter((id) => !ids.includes(id));

section("1. coverage: one lab set per French lesson");
check(ids.length === 18, `18 French lessons in modules.json (found ${ids.length})`);
check(missing.length === 0, `no French lesson without a lab set (missing: ${missing.join(", ") || "none"})`);
check(extra.length === 0, `no lab set keyed to a non-lesson (extra: ${extra.join(", ") || "none"})`);
check(Object.keys(sets).length === ids.length,
  `one set per lesson (${Object.keys(sets).length} sets for ${ids.length} lessons)`);
console.log(`coverage: lessons=${ids.length} sets=${Object.keys(sets).length} missing=[${missing}] extra=[${extra}]`);

section("2. every set is well formed and names its own lesson");
let traced = 0, stringChecks = 0;
const titles = new Set();
for (const id of ids) {
  const set = sets[id];
  if (!set) continue;
  const lesson = lessonById.get(id);
  const where = `lessonSets.french.${id}`;
  const text = lessonText(lesson);
  check(set.title === lesson.title, `${where}: heading is the lesson's own title`);
  check(!titles.has(set.title), `${where}: heading is unique among the 18 labs`);
  titles.add(set.title);
  check(typeof set.subtitle === "string" && set.subtitle.trim().length > 10, `${where}: has an instruction subtitle`);
  check(["match", "sort", "order"].includes(set.kind), `${where}: kind is match/sort/order (got ${set.kind})`);

  const trace = (label, side) => {
    stringChecks++;
    if (text.includes(norm(label))) traced++;
    else check(false, `${where}: ${side} "${label}" is NOT in the lesson's own content`);
  };

  if (set.kind === "match") {
    const pairs = set.pairs || [];
    check(pairs.length >= 4, `${where}: at least 4 pairs (has ${pairs.length})`);
    const pairIds = pairs.map((p) => p.id);
    const targetList = pairs.map((p) => p.target);
    const labelList = pairs.map((p) => p.label);
    check(pairIds.every(Boolean) && new Set(pairIds).size === pairIds.length, `${where}: pair ids are unique`);
    check(targetList.every(Boolean) && new Set(targetList).size === targetList.length,
      `${where}: every drop target is distinct (unambiguous drops)`);
    check(labelList.every(Boolean) && new Set(labelList).size === labelList.length, `${where}: every label is distinct`);
    for (const p of pairs) { trace(p.label, "label"); trace(p.target, "target"); }
  } else if (set.kind === "sort") {
    const cats = set.categories || [];
    const items = set.items || [];
    const catIds = cats.map((c) => c.id);
    check(cats.length >= 2, `${where}: at least 2 categories (has ${cats.length})`);
    check(catIds.every(Boolean) && new Set(catIds).size === catIds.length, `${where}: category ids are unique`);
    check(cats.every((c) => c.label && c.label.trim()), `${where}: every category has a label`);
    check(items.length >= 4, `${where}: at least 4 items (has ${items.length})`);
    check(items.every((i) => i.id && i.label && catIds.includes(i.category)),
      `${where}: every item has id/label and a known category`);
    const itemIds = items.map((i) => i.id);
    check(new Set(itemIds).size === itemIds.length, `${where}: item ids are unique`);
    check(new Set(items.map((i) => i.label)).size === items.length, `${where}: item labels are distinct`);
    // every category must actually receive an item (no decorative column)
    for (const c of catIds) {
      check(items.some((i) => i.category === c), `${where}: category "${c}" has at least one item`);
    }
    for (const i of items) trace(i.label, "item");
  } else {
    const items = set.items || [];
    check(items.length >= 4, `${where}: at least 4 ordered items (has ${items.length})`);
    const itemIds = items.map((i) => i.id);
    check(itemIds.every(Boolean) && new Set(itemIds).size === itemIds.length, `${where}: item ids are unique`);
    check(new Set(items.map((i) => i.label)).size === items.length, `${where}: item labels are distinct`);
    const orders = items.map((i) => Number(i.order)).sort((a, b) => a - b);
    check(orders.every((o, n) => o === n + 1), `${where}: orders are exactly 1..${items.length} (got ${orders.join(",")})`);
    for (const i of items) trace(i.label, "item");
  }
}
check(traced === stringChecks, `all ${stringChecks} displayed strings come from their lesson (traced ${traced})`);
console.log(`traceability: ${traced}/${stringChecks} displayed strings matched their lesson's own content`);

section("3. the other subjects' blocks are untouched");
check(Object.keys(lessonSets.spanish || {}).length === 12, "spanish block still has its 12 sets");
// The biology block grows when the subject's own coverage-gap lessons land
// (task 33b20aee added 8), so assert its original sets survive rather than a
// raw count: this harness only cares that French did not disturb them.
const BIOLOGY_ORIGINAL_SETS = [
    "osmosis-diffusion", "photosynthesis", "circulatory-system", "respiration",
    "excretion-homeostasis", "food-chains", "human-impact", "dna-inheritance",
    "selection-evolution",
];
for (const key of BIOLOGY_ORIGINAL_SETS) {
    check(!!(lessonSets.biology || {})[key], `biology block still has its "${key}" set`);
}
check(!!lessonSets.biology && !lessonSets.biology["cell-structure"],
    "biology still leaves cell-structure to the subject-level cell diagram");
check(Object.keys(lessonSets.mathematics || {}).length === 24, "mathematics block still has its 24 sets");
check((lessonSets.spanish && !lessonSets.spanish["fre-l1-1"]) === true, "no french key leaked into the spanish block");

section("4. routing: a French lesson reaches its own set, never another subject's deck");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const dragdrop = read("src/components/DragDropLabel.jsx");
const perLesson = sandbox.indexOf("if (lessonId && lessonSets[subjectId])");
const deckFallback = sandbox.indexOf("return flash(subjectId);");
check(perLesson !== -1, "ExperimentSandbox has the generic per-lesson lookup");
check(deckFallback !== -1, "ExperimentSandbox still has its subject-deck fallback");
check(perLesson !== -1 && deckFallback !== -1 && perLesson < deckFallback,
  "the per-lesson lookup runs BEFORE the subject-deck fallback");
check(!/if \(subjectId === "french"\)/.test(sandbox),
  "no earlier french branch shadows the per-lesson lookup");
check(sandbox.includes("Theatre Arts, and French"),
  "the routing comment lists French among the per-lesson subjects");
check(!sandbox.includes("any other subject (french,"),
  "french is no longer described as falling through to the subject deck");
// DragDropLabel order: lessonId → (english-a type) → subject type → subject deck
const dLesson = dragdrop.indexOf("if (lessonSets[subjectId] && lessonSets[subjectId][lessonId])");
const dType = dragdrop.indexOf("subjectTypeSets[subjectId] && subjectTypeSets[subjectId][experimentType]");
const dSubject = dragdrop.indexOf("subjectSets[subjectId] || subjectSets[\"english-a\"]");
check(dLesson !== -1 && dType !== -1 && dSubject !== -1, "DragDropLabel keeps all three resolution layers");
check(dLesson < dType && dType < dSubject, "DragDropLabel resolves lessonId first, subject deck last");
check(!/\bfrench\b/.test(dragdrop.slice(dSubject)),
  "no french entry in the subject-level fallback (a french lesson can never land there)");

section("5. the French subject-level lab no longer shows the Spanish deck");
const flash = read("src/components/FlashcardSystem.jsx");
check(/french: "french"/.test(flash), 'SUBJECT_DECK maps french to its own deck');
check(!/french: "spanish"/.test(flash), 'SUBJECT_DECK no longer aliases french to the spanish deck');
check(/french: \{ title: "French Vocabulary"/.test(flash), "the French deck exists with its own title");
const deckMatch = flash.match(/french: \{ title: "French Vocabulary", cards: \[([\s\S]*?)\n  \]\}/);
check(!!deckMatch, "the French deck parses");
if (deckMatch) {
  const cards = [...deckMatch[1].matchAll(/\{ front: "([^"]*)", back: "([^"]*)" \}/g)];
  check(cards.length >= 8, `the French deck has at least 8 cards (has ${cards.length})`);
  const deckText = deckMatch[1];
  check(!/[¿¡ñ]/.test(deckText), "no Spanish-only characters in the French deck");
  check(/père|Bonjour|s'il vous plaît/.test(deckText), "the French deck contains French words from the lessons");
}

console.log(`\n${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
