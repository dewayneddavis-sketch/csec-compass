#!/usr/bin/env node
// Harness: the Social Studies M4-M5 slice (Elections, Government) is really shipped.
//
// Coverage build: /home/team/shared/social-studies-coverage-audit.md sections 4, 5, 6, 10 —
// chapters 17-26 = 1 REUSE + 3 EXTEND (ss-l3-1, ss-l3-2 grown in place) + 6 NEW lessons
// (elec- x4, gov- x2) in two new modules. What this pins:
//   1. the 12 frozen lesson ids are all still there, exactly once (never renamed/re-keyed), and the
//      tree is the UNION of this slice and the M1-M3 sibling: 12 frozen + 6 M1-M3 + 6 M4-M5 = 24;
//   2. the EXTEND lessons still carry their ORIGINAL opening teaching (pure insertion) and now
//      teach the chapters they were grown for, by name;
//   3. each of the 6 new lessons is a real lesson (content, objectives, string-array concepts,
//      a recognised experiment.type) filed under its own module's prefix;
//   4. each new lesson has exactly ONE well-formed Play-tab set in lessonSets["social-studies"],
//      borrowed no vocabulary the lesson does not teach, and the ExperimentSandbox
//      social-studies branch resolves it (lessonId passed through);
//   5. mirrors are byte-identical and the two banks are untouched (100 / 25).
// Red controls mutate the loaded state in memory and MUST make this fail:
//   node tools/verify-social-studies-m4m5.mjs --red-control <name>
//   drop-set | dup-target | bad-category | order-gap | wrong-prefix | thin-content |
//   unrecognised-type | extend-removed | set-for-dead-lesson | missing-objectives
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
// contentLoader.js cannot be imported here: it pulls extensionless internal imports
// (`src/data/lessonFigures`) that bare Node ESM refuses to resolve. The recognised lab types are
// therefore read out of the experimentTypes block as text - the same map the app uses.
const loaderSrc = read("src/data/contentLoader.js");
const typeBlock = loaderSrc.slice(loaderSrc.indexOf("export const experimentTypes = {"),
                                 loaderSrc.indexOf("\n};", loaderSrc.indexOf("export const experimentTypes = {")));
const experimentTypes = new Set([...typeBlock.matchAll(/^\s*"([a-z0-9-]+)":\s*\{\s*title:/gm)].map((m) => m[1]));
if (experimentTypes.size < 20) {
  console.log(`FAIL: could not read the experimentTypes map (found ${experimentTypes.size} keys)`);
  process.exit(1);
}
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const SUBJECT = "social-studies";
const NEW_IDS = [
  "elec-political-party-election-preparation",
  "elec-factors-influencing-election-outcomes",
  "elec-voter-participation",
  "elec-interpreting-election-data",
  "gov-citizens-government-and-the-constitution",
  "gov-essentials-of-good-governance",
];
const NEW_MODULE = {
  "elec-political-party-election-preparation": "ss-mod-8",
  "elec-factors-influencing-election-outcomes": "ss-mod-8",
  "elec-voter-participation": "ss-mod-8",
  "elec-interpreting-election-data": "ss-mod-8",
  "gov-citizens-government-and-the-constitution": "ss-mod-9",
  "gov-essentials-of-good-governance": "ss-mod-9",
};
const FROZEN = ["ss-l1-1", "ss-l1-2", "ss-l2-1", "ss-l2-2", "ss-l3-1", "ss-l3-2",
                "ss-l4-1", "ss-l4-2", "ss-l5-1", "ss-l5-2", "ss-l6-1", "ss-l6-2"];
// The M1-M3 sibling slice (PR #203) shipped six lessons of its own. They are declared here so the
// union total is DERIVED from id lists rather than pinned to this branch's head: a further slice must
// add its ids to a list like this one, and this check then fails loudly instead of quietly measuring
// a tree it no longer describes.
const SIBLING_NEW_IDS = ["fam-preparation-for-parenthood", "fam-effective-parenting",
  "fam-social-issues-affecting-families", "fam-laws-protecting-the-family",
  "cult-caribbean-cultural-diversity", "soc-social-group-interaction"];
const EXPECTED_IDS = [...FROZEN, ...SIBLING_NEW_IDS, ...NEW_IDS];
// The opening sentence of each extended lesson as it stood BEFORE this slice: if a lane ever
// rewrites rather than inserts, this is what catches it.
const ORIGINAL_OPENINGS = {
  "ss-l3-1": "Government is the system by which a society is organised and controlled.",
  "ss-l3-2": "Most democratic governments are divided into three branches",
};
// chapter -> words the grown lesson must now teach (folded substring match, generous)
const EXTEND_COVERAGE = {
  "ss-l3-1": ["constituencies", "nomination day", "polling day", "by-election", "voters' list",
              "first-past-the-post", "proportional representation"],
  "ss-l3-2": ["head of state", "head of government", "governor-general", "prime minister", "cabinet",
              "house of representatives", "senate", "leader of the opposition", "local government",
              "law and order", "taxation", "social services"],
};

const modules = JSON.parse(read(`content/${SUBJECT}/modules.json`));
const meta = JSON.parse(read(`content/${SUBJECT}/metadata.json`));
const sandbox = read("src/components/ExperimentSandbox.jsx");
const practice = JSON.parse(read(`content/${SUBJECT}/practice.json`));
const kc = JSON.parse(read(`content/${SUBJECT}/knowledge-check.json`));
const sets = lessonSets[SUBJECT];

// ---------------------------------------------------------------- red controls
const red = process.argv.includes("--red-control") ? process.argv[process.argv.indexOf("--red-control") + 1] : null;
if (red) {
  const lessons = modules.flatMap((m) => m.lessons);
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
  switch (red) {
    case "drop-set": delete sets["elec-voter-participation"]; break;
    case "dup-target": {
      const s = sets["elec-factors-influencing-election-outcomes"];
      s.pairs[1].target = s.pairs[0].target; break;
    }
    case "bad-category": sets["gov-essentials-of-good-governance"].items[0].category = "nope"; break;
    case "order-gap": sets["elec-political-party-election-preparation"].items[2].order = 9; break;
    case "wrong-prefix": byId["elec-voter-participation"].id = "gov-voter-participation"; break;
    case "thin-content": byId["elec-interpreting-election-data"].content = "Too short."; break;
    case "unrecognised-type": byId["elec-voter-participation"].experiment.type = "not-a-lab-type"; break;
    case "extend-removed":
      byId["ss-l3-2"].content = byId["ss-l3-2"].content.replace(
        "Head of State", "the head person").replace("Taxation", "money"); break;
    case "set-for-dead-lesson": sets["elec-ghost-lesson"] = { ...sets["elec-voter-participation"] }; break;
    case "missing-objectives": delete byId["gov-essentials-of-good-governance"].objectives; break;
    default: console.log(`unknown red control: ${red}`); process.exit(2);
  }
}

const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const byId = Object.fromEntries(allLessons.map((l) => [l.id, l]));
const fold = (s) => String(s).toLowerCase()
  .replace(/[\u2018\u2019\u201c\u201d]/g, "'").replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ");

// ---------------------------------------------------------------- 1. frozen ids
section("1. the 12 frozen lesson ids survive untouched, and the tree is the union of both slices");
check(allLessons.length === EXPECTED_IDS.length,
  `lesson count is the union: ${FROZEN.length} frozen + ${SIBLING_NEW_IDS.length} M1-M3 + ${NEW_IDS.length} M4-M5 = ${EXPECTED_IDS.length} (got ${allLessons.length})`);
check(EXPECTED_IDS.every((id) => !!byId[id]), "every declared id from both slices is still present (none dropped)");
check(allLessons.every((l) => EXPECTED_IDS.includes(l.id)),
  "no lesson in the tree sits outside the two slices' declared ids (no id re-keyed)");
for (const id of FROZEN) check(!!byId[id], `frozen id ${id} is still present`);
check(new Set(allLessons.map((l) => l.id)).size === allLessons.length, "no duplicate lesson id");
for (const id of FROZEN) {
  const l = byId[id];
  if (l) check(typeof l.title === "string" && l.title.length > 0 && Array.isArray(l.concepts) &&
               l.concepts.every((c) => typeof c === "string"),
    `${id} still has a title and string-array concepts`);
}

// ---------------------------------------------------------------- 2. EXTEND
section("2. EXTEND: pure insertion, and the new chapters are taught by name");
for (const [lid, opening] of Object.entries(ORIGINAL_OPENINGS)) {
  const l = byId[lid];
  check(!!l && l.content.includes(opening), `${lid} still carries its original opening teaching`);
}
for (const [lid, words] of Object.entries(EXTEND_COVERAGE)) {
  const l = byId[lid];
  // the PROSE only: a chapter must be taught in the lesson body, not merely listed as a concept
  const hay = fold(l.content);
  const missing = words.filter((w) => !hay.includes(fold(w)));
  check(missing.length === 0, `${lid} teaches every chapter it was grown for, in its copy (missing: ${missing.join(", ") || "none"})`);
}

// ---------------------------------------------------------------- 3. the 6 new lessons
section("3. the 6 new lessons are real lessons, filed under their own module");
for (const id of NEW_IDS) {
  const l = byId[id];
  if (!l) { check(false, `${id} exists`); continue; }
  check(l.module === NEW_MODULE[id], `${id} sits in ${NEW_MODULE[id]} (found ${l.module})`);
  check(id.startsWith(id.split("-")[0] + "-") && ["elec", "gov"].includes(id.split("-")[0]),
    `${id} carries its module prefix`);
  check(typeof l.title === "string" && l.title.length > 3, `${id} has a title`);
  check(typeof l.content === "string" && l.content.length > 900, `${id} has real content (${(l.content || "").length} chars)`);
  check(Array.isArray(l.objectives) && l.objectives.length >= 3, `${id} has at least 3 objectives`);
  check(Array.isArray(l.concepts) && l.concepts.length >= 5 && l.concepts.every((c) => typeof c === "string"),
    `${id} has >=5 concepts, all strings`);
  check(!!l.experiment && !!l.experiment.type && !!l.experiment.description, `${id} has an experiment type + description`);
  check(experimentTypes.has(l.experiment?.type), `${id}'s experiment.type "${l.experiment?.type}" is a recognised type`);
}
check(modules.some((m) => m.id === "ss-mod-8") && modules.some((m) => m.id === "ss-mod-9"),
  "the two new modules (ss-mod-8 Elections, ss-mod-9 Governance) exist");
check(meta.estimatedModules === modules.length, `metadata.estimatedModules tracks the module count (${meta.estimatedModules} vs ${modules.length})`);

// ---------------------------------------------------------------- 4. the labs
section("4. one well-formed Play-tab set per new lesson");
for (const id of NEW_IDS) {
  const s = sets[id];
  if (!s) { check(false, `${id} has a lessonSets entry`); continue; }
  check(typeof s.title === "string" && s.title.length > 0, `${id}: set has a title`);
  check(typeof s.subtitle === "string" && s.subtitle.length > 0, `${id}: set has a subtitle`);
  check(["match", "sort", "order"].includes(s.kind), `${id}: kind "${s.kind}" is one of match/sort/order`);
  if (s.kind === "match") {
    check(Array.isArray(s.pairs) && s.pairs.length >= 3 && s.pairs.length <= 8, `${id}: ${s.pairs?.length} match pairs (3-8)`);
    const targets = (s.pairs || []).map((p) => p.target);
    check(new Set(targets).size === targets.length, `${id}: every match target is distinct (a duplicate is unanswerable)`);
    check((s.pairs || []).every((p) => p.id && p.target && p.label), `${id}: every pair has id + target + label`);
  } else if (s.kind === "sort") {
    const cats = (s.categories || []).map((c) => c.id);
    check(Array.isArray(s.categories) && cats.length >= 2, `${id}: at least 2 sort categories`);
    check(new Set(cats).size === cats.length, `${id}: category ids are distinct`);
    check(Array.isArray(s.items) && s.items.length >= 3, `${id}: at least 3 sort items`);
    check((s.items || []).every((i) => cats.includes(i.category)), `${id}: every item's category is a declared category`);
    check((s.items || []).every((i) => i.id && i.label), `${id}: every item has id + label`);
  } else {
    const orders = (s.items || []).map((i) => i.order).sort((a, b) => a - b);
    check(Array.isArray(s.items) && s.items.length >= 3, `${id}: at least 3 order items`);
    check(orders.every((o, i) => o === i + 1), `${id}: order values are 1..n with no gap (${orders.join(",")})`);
  }
}
const setKeys = Object.keys(sets);
check(setKeys.filter((k) => k.startsWith("elec-") || k.startsWith("gov-")).every((k) => NEW_IDS.includes(k)),
  "no lessonSets key for a lesson that does not exist");
check(NEW_IDS.every((id) => setKeys.includes(id)), "every new lesson is keyed (none falls back to another subject's panel)");
check(FROZEN.every((id) => setKeys.includes(id)), "the 12 older sets are still present");
check(SIBLING_NEW_IDS.every((id) => setKeys.includes(id)),
  "the M1-M3 sibling's six sets are still present (the union kept both slices' labs)");
check(setKeys.length === EXPECTED_IDS.length,
  `one set per lesson of the union (${setKeys.length} of ${EXPECTED_IDS.length})`);

// vocabulary trace: a lab may not invent terms the lesson never teaches
section("5. every lab string is vocabulary the lesson itself teaches");
for (const id of NEW_IDS) {
  const s = sets[id], l = byId[id];
  if (!s || !l) continue;
  const hay = fold([l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \n "));
  const strings = s.kind === "match" ? s.pairs.map((p) => p.label) : s.items.map((i) => i.label);
  const traced = strings.filter((str) => {
    const words = fold(str).split(/[^a-z0-9'-]+/).filter((w) => w.length >= 5);
    return words.some((w) => hay.includes(w.slice(0, Math.max(5, w.length - 2))));
  });
  check(traced.length === strings.length,
    `${id}: all ${strings.length} lab strings trace to the lesson copy (${traced.length} traced)`);
}

// the sandbox resolves it
section("6. the Play tab actually routes to these sets");
const ssBranch = sandbox.match(
  /if \(subjectId === "social-studies"\) \{[\s\S]*?\};/);
check(!!ssBranch, "ExperimentSandbox has a social-studies branch");
check(!!ssBranch && ssBranch[0].includes("lessonId={lessonId}"), "that branch passes lessonId through (per-lesson set)");
check(!!ssBranch && ssBranch[0].includes('subjectId="social-studies"'), "that branch stays inside the subject's own decks");

// ---------------------------------------------------------------- mirrors, banks
section("7. mirrors byte-identical, banks frozen");
for (const rel of [`content/${SUBJECT}/modules.json`, `content/${SUBJECT}/metadata.json`]) {
  check(read(rel) === read(`public/${rel}`), `${rel} is byte-identical to its public mirror`);
}
check(practice.length === 100, `practice bank is still exactly 100 (${practice.length})`);
check(kc.length === 25, `knowledge check is still exactly 25 (${kc.length})`);

console.log(`\n${pass} checks passed, ${fail} failed${red ? ` (red control: ${red})` : ""}`);
process.exit(fail ? 1 : 0);
