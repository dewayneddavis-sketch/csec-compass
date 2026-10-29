#!/usr/bin/env node
// Proof of the Social Studies M1–M3 wiring, run against the SHIPPED modules.json and the SHIPPED
// lessonSets.js (not a description of them):
//   1. every one of the union's 24 lessons (12 frozen + 6 M1–M3 + 6 M4–M5) resolves to a set of its
//      OWN subject (never another subject's);
//   2. the 6 new lessons resolve by lessonId to the set this PR added;
//   3. each new set's title IS the lesson's own title (the physics-gap standard), and its subtitle is real;
//   4. every string the set displays appears in that lesson's own copy (the trace rule);
//   5. no frozen lesson id lost its set, and the banks' sizes are untouched.
import fs from "node:fs";
import path from "node:path";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const mods = JSON.parse(read("content/social-studies/modules.json"));
const mirrorMods = JSON.parse(read("public/content/social-studies/modules.json"));

let pass = 0, fail = 0;
const check = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL: " + m); } };
const section = (t) => console.log(`\n== ${t}`);

const lessons = mods.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
const ss = lessonSets["social-studies"];
const NEW_IDS = ["fam-preparation-for-parenthood", "fam-effective-parenting",
  "fam-social-issues-affecting-families", "fam-laws-protecting-the-family",
  "cult-caribbean-cultural-diversity", "soc-social-group-interaction"];
const FROZEN = ["ss-l1-1", "ss-l1-2", "ss-l2-1", "ss-l2-2", "ss-l3-1", "ss-l3-2",
  "ss-l4-1", "ss-l4-2", "ss-l5-1", "ss-l5-2", "ss-l6-1", "ss-l6-2"];
// The M4-M5 sibling slice (PR #204) shipped ten lessons in ss-mod-8/9. Declared here so the union
// total is DERIVED from id lists rather than pinned to this slice's own head: a further slice must add
// its ids to a list like this one, and this check then fails loudly instead of quietly measuring a
// tree it no longer describes.
const SIBLING_NEW_IDS = ["elec-political-party-election-preparation",
  "elec-factors-influencing-election-outcomes", "elec-voter-participation",
  "elec-interpreting-election-data", "gov-citizens-government-and-the-constitution",
  "gov-essentials-of-good-governance"];
const EXPECTED_IDS = [...FROZEN, ...NEW_IDS, ...SIBLING_NEW_IDS];
// 6 original modules + ss-mod-7 (this slice) + ss-mod-8/9 (the M4-M5 slice)
const EXPECTED_MODULES = ["ss-mod-1", "ss-mod-2", "ss-mod-3", "ss-mod-4", "ss-mod-5", "ss-mod-6",
  "ss-mod-7", "ss-mod-8", "ss-mod-9"];

section("1. the content tree");
check(lessons.length === EXPECTED_IDS.length,
  `the union tree holds ${EXPECTED_IDS.length} lessons = ${FROZEN.length} frozen + ${NEW_IDS.length} M1-M3 + ${SIBLING_NEW_IDS.length} M4-M5 (got ${lessons.length})`);
check(EXPECTED_IDS.every((id) => lessons.some((l) => l.id === id)),
  "every declared id from both slices is still present (none dropped by the union)");
check(lessons.every((l) => EXPECTED_IDS.includes(l.id)),
  "no lesson in the tree sits outside the two slices' declared ids (no id re-keyed)");
check(mods.length === EXPECTED_MODULES.length,
  `${EXPECTED_MODULES.length} modules = 6 original + ss-mod-7 + ss-mod-8/9 (got ${mods.length})`);
check(EXPECTED_MODULES.every((id) => mods.some((m) => m.id === id)) &&
  mods.every((m) => EXPECTED_MODULES.includes(m.id)),
  "the module list is exactly the union of the original modules and both slices' new ones");
check(JSON.stringify(mods) === JSON.stringify(mirrorMods), "content/ and public/content/ modules.json are identical");
const ids = lessons.map((l) => l.id);
check(new Set(ids).size === ids.length, "no duplicate lesson id");
for (const f of FROZEN) check(ids.includes(f), `frozen id present and unmoved: ${f}`);
const m1 = mods.find((m) => m.id === "ss-mod-1").lessons.map((l) => l.id);
check(JSON.stringify(m1.slice(0, 2)) === JSON.stringify(["ss-l1-1", "ss-l1-2"]),
  "ss-mod-1 still opens with its two original lessons, in order");
check(mods.find((m) => m.id === "ss-mod-7").lessons.length === 1, "the new module ss-mod-7 holds one lesson");
for (const l of lessons) {
  check(Array.isArray(l.concepts) && l.concepts.every((c) => typeof c === "string"),
    `${l.id}: concepts is an array of strings`);
  check(!!(l.experiment && l.experiment.type), `${l.id}: declares an experiment type`);
  check(typeof l.content === "string" && l.content.length > 400, `${l.id}: has real content`);
}

section("2. every lesson resolves to a set of its own subject");
for (const l of lessons) check(!!ss[l.id], `${l.id}: has a per-lesson set in lessonSets["social-studies"]`);
check(Object.keys(ss).length === EXPECTED_IDS.length,
  `the subject block holds one set per lesson of the union (${Object.keys(ss).length} of ${EXPECTED_IDS.length})`);
check(!Object.keys(lessonSets).some((s) => s !== "social-studies" && NEW_IDS.some((n) => lessonSets[s][n])),
  "no new id leaked into another subject's block");

section("3/4. the new sets: title is the lesson's title, and every shown string is taught by it");
for (const nid of NEW_IDS) {
  const lesson = lessons.find((l) => l.id === nid);
  const set = ss[nid];
  check(!!lesson, `${nid}: lesson exists`);
  check(set.title === lesson.title, `${nid}: set title "${set.title}" === lesson title`);
  check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${nid}: has a real subtitle`);
  const corpus = [lesson.title, lesson.content, ...(lesson.objectives || []), ...(lesson.concepts || [])]
    .join(" ").toLowerCase();
  const shown = [];
  if (set.kind === "match") { for (const p of set.pairs || []) shown.push(p.label, p.target); }
  else { for (const c of set.categories || []) shown.push(c.label); for (const i of set.items || []) shown.push(i.label); }
  check(shown.length >= 8, `${nid}: its deck shows ${shown.length} strings (needs >= 4 pairs/items)`);
  const miss = shown.filter((s) => !corpus.includes(String(s).toLowerCase()));
  check(miss.length === 0, `${nid}: every displayed string is taught by the lesson (missing: ${JSON.stringify(miss)})`);
  for (const o of lesson.objectives || []) check(typeof o === "string" && o.length > 10, `${nid}: objective is a real string`);
}

section("5. the banks were not touched");
const p = JSON.parse(read("content/social-studies/practice.json"));
const k = JSON.parse(read("content/social-studies/knowledge-check.json"));
const pq = Array.isArray(p) ? p : (p.questions || p.practice || []);
const kq = Array.isArray(k) ? k : (k.questions || []);
check(pq.length === 100, `practice stays exactly 100 (got ${pq.length})`);
check(kq.length === 25, `knowledge check stays exactly 25 (got ${kq.length})`);

console.log(`\nsocial-studies-m1-m3 wiring: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
