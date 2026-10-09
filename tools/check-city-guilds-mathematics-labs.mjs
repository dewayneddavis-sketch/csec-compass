#!/usr/bin/env node
// Harness: the City & Guilds Mathematics lessons each get their OWN Play-tab lab.
//
// The 18 lessons of content/city-guilds-mathematics/modules.json carry per-lesson sets in
// lessonSets["city-guilds-mathematics"], rendered by DragDropLabel through
// ExperimentSandbox's generic per-lesson branch. This harness guards, for this subject:
//   1. all 18 lesson ids resolve to exactly one set, and no set names a lesson that is
//      not in modules.json,
//   2. every set is well formed and of the kind the coverage map recorded for it
//      (order / match / sort), with the lab type the modules.json lesson carries,
//   3. every displayed string is a verbatim phrase from THAT lesson's own title,
//      content, objectives or concepts — so a lab can never drift onto another topic,
//   4. the routing branch that renders it sits BEFORE the flashcard fallback, so a
//      City & Guilds Mathematics lesson can never silently downgrade to a flashcard deck,
//   5. the 23 pre-existing subjects still have their sets and none was renamed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);
const SUBJECT = "city-guilds-mathematics";
// The three pillars of the qualification are the three modules, and the per-lesson lab
// kind is recorded in the approved coverage map (f2e8e794, section 3): every match, sort
// and order here matches that map, lesson by lesson.
const KIND_BY_LESSON = {
  "whole-numbers-and-place-value": "order",
  "fractions-decimals-percentages": "match",
  "negative-numbers-in-context": "order",
  "calculator-and-estimating": "match",
  "money-and-everyday-calculations": "match",
  "ratio-proportion-and-scale": "match",
  "powers-roots-and-formulas": "match",
  "units-and-conversions": "match",
  "perimeter-and-area": "match",
  "angles-and-2d-shapes": "sort",
  "circles-circumference-and-area": "match",
  "volume-and-capacity": "match",
  "time-speed-and-distance": "order",
  "collecting-and-recording-data": "sort",
  "tables-charts-and-graphs": "match",
  "averages-and-range": "match",
  "probability-and-chance": "order",
  "interpreting-data-and-solve-problems": "sort",
};
// The lab name the teacher dashboard shows comes from experimentTypes in
// contentLoader.js. Every type used here must be one of those keys, or a lesson
// records a lab the dashboard cannot name. (The routing still picks the per-lesson set
// by lesson id; the type only names the activity.)
const ALLOWED_TYPES = new Set([
  "number-line-plotter", "matching-game", "calculator-tool", "interactive-equation",
  "visual-converter", "area-builder", "drag-drop", "volume-filler", "interactive-pathway",
  "data-explorer", "data-visualizer", "probability-sim",
]);
const modules = JSON.parse(read(`content/${SUBJECT}/modules.json`));
const lessons = modules.flatMap((m) => m.lessons || []);
const byId = new Map(lessons.map((l) => [l.id, l]));
const sets = lessonSets[SUBJECT];
const fold = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").toLowerCase();
const lessonText = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \u2022 "));
section("1. the subject is wired: 18 lessons, 18 sets, keyed by lesson id");
ok(!!sets && typeof sets === "object", `lessonSets["${SUBJECT}"] exists`);
const setIds = Object.keys(sets || {});
ok(modules.length === 3, `modules.json holds the 3 pillars (${modules.length})`);
ok(lessons.length === 18, `modules.json holds 18 lessons (${lessons.length})`);
ok(setIds.length === 18, `the block holds 18 sets (${setIds.length})`);
ok(lessons.every((l) => setIds.includes(l.id)), `every lesson id has a set (${lessons.filter((l) => !setIds.includes(l.id)).map((l) => l.id).join(", ") || "none missing"})`);
ok(setIds.every((id) => byId.has(id)), `no set is keyed on a lesson that is not in modules.json (${setIds.filter((id) => !byId.has(id)).join(", ") || "none"})`);
ok(Object.keys(KIND_BY_LESSON).length === 18, "the recorded coverage map has 18 lesson kinds");
section("2. every set is well formed and of the kind the coverage map recorded");
for (const id of setIds) {
  const set = sets[id];
  const lesson = byId.get(id);
  const at = `${SUBJECT}.${id}`;
  const kind = KIND_BY_LESSON[id];
  ok(set.kind === kind, `${at}: kind is "${kind}" (${set.kind})`);
  ok(ALLOWED_TYPES.has((lesson.experiment || {}).type), `${at}: lab type "${(lesson.experiment || {}).type}" is a known experiment type`);
  ok(set.title === lesson.title, `${at}: heading is the lesson's own title ("${set.title}")`);
  ok(typeof set.subtitle === "string" && set.subtitle.length > 20, `${at}: has a subtitle that says what to do`);
  if (set.kind === "match") {
    ok(Array.isArray(set.pairs) && set.pairs.length >= 3, `${at}: at least 3 pairs (${(set.pairs || []).length})`);
    const targets = (set.pairs || []).map((p) => p.target);
    ok(new Set(targets).size === targets.length, `${at}: every drop target is distinct`);
    ok((set.pairs || []).every((p) => p.id && p.label && p.target), `${at}: every pair has an id, a label and a target`);
    ok(new Set((set.pairs || []).map((p) => p.id)).size === (set.pairs || []).length, `${at}: pair ids are unique`);
  } else if (set.kind === "sort") {
    ok(Array.isArray(set.categories) && set.categories.length >= 2, `${at}: at least 2 categories (${(set.categories || []).length})`);
    ok(Array.isArray(set.items) && set.items.length >= 4, `${at}: at least 4 items (${(set.items || []).length})`);
    const catIds = (set.categories || []).map((c) => c.id);
    ok(new Set(catIds).size === catIds.length, `${at}: category ids are unique`);
    ok((set.items || []).every((i) => catIds.includes(i.category)), `${at}: every item names a real category`);
    ok((set.items || []).every((i) => i.id && i.label), `${at}: every item has an id and a label`);
  } else if (set.kind === "order") {
    ok(Array.isArray(set.items) && set.items.length >= 3, `${at}: at least 3 items (${(set.items || []).length})`);
    const orders = (set.items || []).map((i) => i.order);
    ok(new Set(orders).size === orders.length, `${at}: every item has a distinct order value`);
    ok(orders.slice().sort((a, b) => a - b).every((o, n) => o === n + 1), `${at}: order values run 1..${orders.length} (${orders.join(",")})`);
    ok((set.items || []).every((i) => i.id && i.label), `${at}: every item has an id and a label`);
  } else {
    ok(false, `${at}: unknown kind ${set.kind}`);
  }
}
section("3. every displayed string is the lesson's own text (no lab drifts onto another topic)");
let checkedStrings = 0, untraced = [];
for (const id of setIds) {
  const set = sets[id];
  const text = lessonText(byId.get(id));
  const strings = [];
  if (set.kind === "match") for (const p of set.pairs) strings.push(p.label, p.target);
  if (set.kind === "sort") { for (const c of set.categories) strings.push(c.label); for (const i of set.items) strings.push(i.label); }
  if (set.kind === "order") for (const i of set.items) strings.push(i.label);
  for (const s of strings) {
    checkedStrings++;
    if (!text.includes(fold(s))) untraced.push(`${id}: "${s.slice(0, 60)}"`);
  }
}
ok(untraced.length === 0, `every displayed string traces to its lesson (${untraced.length ? untraced.join(" | ") : checkedStrings + " strings traced"})`);
console.log(`  • ${checkedStrings} displayed strings checked against their lesson's title, content, objectives and concepts`);
section("3b. the per-lesson level bands the owner approved (Math 11 / 15 / 3)");
const bandOf = (l) => String(l.level || "");
const servesL1 = lessons.filter((l) => bandOf(l).includes("L1")).length;
const servesL2 = lessons.filter((l) => bandOf(l).includes("L2")).length;
const servesL3 = lessons.filter((l) => bandOf(l).includes("L3")).length;
ok(lessons.every((l) => /^L[123](\u2013L[123])?$/.test(bandOf(l))), `every lesson carries an L1/L2/L3 band (${lessons.filter((l) => !/^L[123]/.test(bandOf(l))).map((l) => l.id).join(", ") || "all banded"})`);
ok(servesL1 === 11, `11 lessons serve level 1 (${servesL1})`);
ok(servesL2 === 15, `15 lessons serve level 2 (${servesL2})`);
ok(servesL3 === 3, `3 lessons serve level 3 by design — thin here, and the coverage map records why (${servesL3})`);
ok(lessons.every((l) => bandOf(l).startsWith("L1") || bandOf(l).startsWith("L2")), "every lesson opens at level 1 or 2, so no candidate starts above their band");

section("4. the routing branch: per-lesson lookup, guarded, before the flashcard fallback");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const perLessonAt = sandbox.indexOf("if (lessonId && lessonSets[subjectId])");
const flashAt = sandbox.indexOf("return flash(subjectId)");
ok(perLessonAt !== -1, "ExperimentSandbox has the generic per-lesson branch");
ok(flashAt !== -1, "the flashcard fallback is still there");
ok(perLessonAt !== -1 && flashAt !== -1 && perLessonAt < flashAt, "the per-lesson branch sits before the fallback (no silent downgrade)");
ok(/lessonId=\{lessonId\}/.test(sandbox.slice(perLessonAt, perLessonAt + 220)), "the branch passes lessonId through to DragDropLabel");
// The subject must not be caught by another subject's branch earlier in the file.
const mathBranchAt = sandbox.indexOf('if (subjectId === "mathematics")');
ok(mathBranchAt !== -1 && mathBranchAt < perLessonAt, "the mathematics branch is the CSEC subject's own, not this one");
ok(sandbox.indexOf('if (subjectId === "city-guilds-mathematics")') === -1, "City & Guilds Mathematics is not special-cased into the mathematics branch");
section("5. the other subjects' sets are untouched");
const OTHERS = ["biology", "information-technology", "principles-of-accounts", "social-studies", "human-social-biology", "spanish", "french", "english-b", "clothing-textile-and-fashion", "principles-of-business", "edpm", "visual-arts", "theater-arts", "caribbean-history", "integrated-science", "agriculture-double-option", "food-and-nutrition", "technical-drawing", "physical-education", "mathematics", "english-a", "city-guilds-english", "physics"];
ok(OTHERS.every((s) => lessonSets[s]), `all ${OTHERS.length} pre-existing subjects still have their sets`);
ok(Object.keys(lessonSets).length === OTHERS.length + 1, `the block count is ${OTHERS.length + 1} (${Object.keys(lessonSets).length})`);
console.log(`\ncheck-city-guilds-mathematics-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
