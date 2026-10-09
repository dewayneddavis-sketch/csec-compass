#!/usr/bin/env node
// Harness: the City & Guilds English lessons each get their OWN Play-tab lab.
//
// The 18 lessons of content/city-guilds-english/modules.json carry per-lesson sets in
// lessonSets["city-guilds-english"], rendered by DragDropLabel through ExperimentSandbox's
// generic `if (lessonId && lessonSets[subjectId])` branch. This harness guards:
//   1. one well-formed set per lesson, keyed by lesson id, of the kind the coverage map
//      recorded (match / sort / order),
//   2. the heading of each set is the lesson's own title, and EVERY displayed string is a
//      verbatim phrase from that lesson's own title/content/objectives/concepts - so a lab
//      can never drift onto another lesson's topic,
//   3. no two match pairs in a set share a drop target (the PR #87 bug: two identical drop
//      zones are unanswerable),
//   4. the routing branch exists, is guarded by lessonId, passes lessonId through, and sits
//      BEFORE the flashcard fallback (the silent-downgrade trap).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const SUBJECT = "city-guilds-english";
const KIND_BY_LESSON = {
  "main-point-and-detail": "match",
  "skimming-scanning-close-reading": "sort",
  "instructions-notices-and-workplace-texts": "order",
  "vocabulary-and-meaning-in-context": "match",
  "fact-opinion-and-persuasion": "sort",
  "comparing-texts-and-using-evidence": "match",
  "planning-and-organising-writing": "order",
  "sentences-paragraphs-and-punctuation": "sort",
  "spelling-grammar-and-word-choice": "match",
  "writing-to-inform-and-instruct": "order",
  "writing-to-persuade-and-argue": "sort",
  "letters-emails-and-short-reports": "match",
  "listening-for-information": "order",
  "speaking-clearly-and-confidently": "sort",
  "asking-and-answering-questions": "match",
  "taking-part-in-discussions": "sort",
  "giving-a-short-talk": "order",
  "communicating-at-work-and-in-the-community": "match",
};

const modules = JSON.parse(read(`content/${SUBJECT}/modules.json`));
const lessons = modules.flatMap((m) => m.lessons || []);
const byId = new Map(lessons.map((l) => [l.id, l]));
const sets = lessonSets[SUBJECT];
const fold = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").toLowerCase();
const lessonText = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \u2022 "));

section("1. the subject is wired: 18 lessons, 18 sets, keyed by lesson id");
ok(!!sets && typeof sets === "object", `lessonSets["${SUBJECT}"] exists`);
const setIds = Object.keys(sets || {});
ok(lessons.length === 18, `modules.json holds 18 lessons (${lessons.length})`);
ok(setIds.length === 18, `the block holds 18 sets (${setIds.length})`);
ok(lessons.every((l) => setIds.includes(l.id)), `every lesson id has a set (${lessons.filter((l) => !setIds.includes(l.id)).map((l) => l.id).join(", ") || "none missing"})`);
ok(setIds.every((id) => byId.has(id)), `no set is keyed on a lesson that is not in modules.json (${setIds.filter((id) => !byId.has(id)).join(", ") || "none"})`);

section("2. every set is well formed and of the kind the coverage map recorded");
for (const id of setIds) {
  const set = sets[id];
  const lesson = byId.get(id);
  const at = `${SUBJECT}.${id}`;
  const kind = KIND_BY_LESSON[id];
  ok(set.kind === kind, `${at}: kind is "${kind}" (${set.kind})`);
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

section("4. the routing branch: per-lesson lookup, guarded, before the flashcard fallback");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const perLessonAt = sandbox.indexOf("if (lessonId && lessonSets[subjectId])");
const flashAt = sandbox.indexOf("return flash(subjectId)");
ok(perLessonAt !== -1, "ExperimentSandbox has the generic per-lesson branch");
ok(flashAt !== -1, "the flashcard fallback is still there");
ok(perLessonAt !== -1 && flashAt !== -1 && perLessonAt < flashAt, "the per-lesson branch sits before the fallback (no silent downgrade)");
ok(/lessonId=\{lessonId\}/.test(sandbox.slice(perLessonAt, perLessonAt + 220)), "the branch passes lessonId through to DragDropLabel");

section("5. the other subjects' sets are untouched");
// city-guilds-mathematics joined the tree in its own PR (and guards itself in
// tools/check-city-guilds-mathematics-labs.mjs); physics joined with the Physics
// syllabus-gap lessons (guarded by tools/check-physics-gap-labs.mjs). Both are listed
// here so this count stays an exact one: every other subject still has its block, and
// no key was renamed.
const OTHERS = ["biology", "information-technology", "principles-of-accounts", "social-studies", "human-social-biology", "spanish", "french", "english-b", "clothing-textile-and-fashion", "principles-of-business", "edpm", "visual-arts", "theater-arts", "caribbean-history", "integrated-science", "agriculture-double-option", "food-and-nutrition", "technical-drawing", "physical-education", "mathematics", "english-a", "city-guilds-mathematics", "physics"];
ok(OTHERS.every((s) => lessonSets[s]), `all ${OTHERS.length} pre-existing subjects still have their sets`);
ok(Object.keys(lessonSets).length === OTHERS.length + 1, `the block count is ${OTHERS.length + 1} (${Object.keys(lessonSets).length})`);

console.log(`\ncheck-city-guilds-english-labs: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
