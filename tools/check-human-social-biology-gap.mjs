#!/usr/bin/env node
// Harness: the Human & Social Biology coverage fix (task c99d3938, owner-ruled
// 2026-10-08, the "add the missing lessons" pattern shipped for Physics in #143).
//
// The audit (human-social-biology-figure-audit.md §6c/§6d) found that 40 of the
// subject's 125 drills tested concepts no lesson taught — whole untaught blocks
// (excretion, the eye and ear, the endocrine system, human reproduction and
// development, cellular respiration, dental health, vitamins and minerals) — and
// that the cell module, the copy's own "foundation", had ZERO practice items.
// Seven lessons were added and the drills were re-tagged onto real homes.
//
// This harness pins the fix so it cannot silently rot:
//   1. the 7 new lessons exist, each with its own well-formed Play-tab set;
//   2. the 12 original lessons keep their original sets (title + kind snapshot);
//   3. every Play-tab description tells the truth about what renders;
//   4. the subject resolves labs by lessonId;
//   5. the banks stay at the 100 / 25 floors, every drill sits on a real lesson,
//      every lesson is drilled, and the re-tagged items land on the new homes;
//   6. every lesson is still reachable in the sampled mock paper.
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

const modules = readJson("content/human-social-biology/modules.json");
const lessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const lessonIds = lessons.map((l) => l.id);
const byId = new Map(lessons.map((l) => [l.id, l]));

const NEW_LESSONS = ["hsb-l1-3", "hsb-l1-4", "hsb-l1-5", "hsb-l1-6", "hsb-l3-3", "hsb-l3-4", "hsb-l6-3"];
const OLD_LESSONS = {
  "hsb-l1-1": { title: "The Skeletal and Muscular Systems", kind: "match" },
  "hsb-l1-2": { title: "Heart and Lungs", kind: "order" },
  "hsb-l2-1": { title: "Cell Structure", kind: "match" },
  "hsb-l2-2": { title: "Cell Division", kind: "order" },
  "hsb-l3-1": { title: "Nutrients", kind: "match" },
  "hsb-l3-2": { title: "Digestion and Absorption", kind: "match" },
  "hsb-l4-1": { title: "Communicable or Non-communicable?", kind: "sort" },
  "hsb-l4-2": { title: "Immunity and Vaccination", kind: "match" },
  "hsb-l5-1": { title: "Water Purification", kind: "order" },
  "hsb-l5-2": { title: "Waste Disposal", kind: "sort" },
  "hsb-l6-1": { title: "Effects of Substances", kind: "match" },
  "hsb-l6-2": { title: "Family Planning", kind: "match" },
};

// id -> its real teaching home after the re-tag (audit §6c). Each of these was
// examinable but taught nothing before this PR.
const RETAGGED = {
  p36: "hsb-l1-3", p37: "hsb-l1-3", p38: "hsb-l1-3", p39: "hsb-l1-3", p40: "hsb-l1-3", p41: "hsb-l1-3",
  p46: "hsb-l1-4", p47: "hsb-l1-4", p48: "hsb-l1-4", p49: "hsb-l1-4", p50: "hsb-l1-4",
  p42: "hsb-l1-5", p43: "hsb-l1-5", p44: "hsb-l1-5", p45: "hsb-l1-5",
  p31: "hsb-l1-6", p32: "hsb-l1-6", p33: "hsb-l1-6", p34: "hsb-l1-6", p35: "hsb-l1-6",
  p74: "hsb-l3-4", p75: "hsb-l3-4", p76: "hsb-l3-4", p78: "hsb-l3-4", p79: "hsb-l3-4",
  p80: "hsb-l3-2", p81: "hsb-l3-2", p85: "hsb-l3-2",
  p88: "hsb-l3-3", p89: "hsb-l3-3",
  p90: "hsb-l6-3", p91: "hsb-l6-3", p92: "hsb-l6-3", p93: "hsb-l6-3", p94: "hsb-l6-3",
  p97: "hsb-l4-2", p100: "hsb-l4-1",
  q17: "hsb-l1-3", q19: "hsb-l6-3", q20: "hsb-l1-6", q22: "hsb-l1-4", q23: "hsb-l4-1",
};
// Retired duplicates (ids are never renumbered; a retired id simply stops being used).
const RETIRED = ["p13", "p26", "p51", "p63", "p67", "p84", "p98", "q13", "q16", "q18"];
const ADDED = ["p101", "p102", "p103", "p104", "p105", "p106", "p107", "q26", "q27", "q28"];

const sets = lessonSets["human-social-biology"] || {};

// ===========================================================================
section("1. the seven gap lessons exist and each has its own Play-tab set");
for (const id of NEW_LESSONS) {
  check(byId.has(id), `${id}: is a lesson in modules.json ("${byId.get(id)?.title || "?"}")`);
  check(!!sets[id], `${id}: has a lessonSets["human-social-biology"] entry`);
}
check(NEW_LESSONS.every((i) => byId.has(i)) && new Set(lessonIds).size === lessonIds.length,
  `lesson ids are unique (${lessonIds.length} lessons)`);
check(Object.keys(sets).length === lessonIds.length,
  `one set per lesson and no stray keys (${Object.keys(sets).length} sets / ${lessonIds.length} lessons)`);
check(Object.keys(sets).every((id) => byId.has(id)), "every set is keyed by a real lesson id");

section("2. every new set is well formed and unambiguous");
for (const id of NEW_LESSONS) {
  const set = sets[id] || {};
  const where = `lessonSets.human-social-biology.${id}`;
  check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
  check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
  if (set.kind === "match") {
    const pairs = set.pairs || [];
    check(pairs.length >= 4 && pairs.length <= 7, `${where}: 4-7 pairs (has ${pairs.length})`);
    check(pairs.every((p) => p.id && p.target && p.label), `${where}: every pair has id/target/label`);
    const ids = pairs.map((p) => p.id), targets = pairs.map((p) => p.target);
    check(new Set(ids).size === ids.length, `${where}: pair ids are unique`);
    check(new Set(targets).size === targets.length, `${where}: targets are unique (unambiguous drops)`);
  } else if (set.kind === "sort") {
    const cats = set.categories || [], items = set.items || [];
    check(cats.length >= 2, `${where}: at least 2 categories`);
    check(items.length >= 4 && items.length <= 8, `${where}: 4-8 items (has ${items.length})`);
    check(new Set(cats.map((c) => c.id)).size === cats.length, `${where}: category ids are unique`);
    check(items.every((i) => i.id && i.label && cats.some((c) => c.id === i.category)),
      `${where}: every item has an id, a label and a known category`);
  } else if (set.kind === "order") {
    const items = set.items || [];
    check(items.length >= 4, `${where}: at least 4 steps (has ${items.length})`);
    const orders = items.map((i) => i.order).sort((a, b) => a - b);
    check(orders.every((o, i) => o === i + 1), `${where}: order is 1..${items.length} with no gaps`);
    check(new Set(items.map((i) => i.id)).size === items.length, `${where}: item ids are unique`);
  } else {
    check(false, `${where}: kind must be match, sort or order (got ${set.kind})`);
  }
}

section("3. the twelve original lessons keep their original labs");
for (const [id, want] of Object.entries(OLD_LESSONS)) {
  const set = sets[id];
  check(!!set, `${id}: still has its set`);
  check(set && set.title === want.title, `${id}: title unchanged ("${set?.title}")`);
  check(set && set.kind === want.kind, `${id}: kind unchanged (${set?.kind})`);
}

section("4. every Play-tab description tells the truth about what renders");
// The audit §6b found 10 of 12 descriptions promising a 3D model, microscope or
// simulator while the student gets a text match / order / sort. The description is
// printed directly above the activity and again on the About tab.
const HYPE = /\b3D\b|animation|animate|microscope|simulator|simulation|real-time|live\b|virtual|see how|watch\b/i;
const VERB = { match: /\bMatch\b/i, sort: /\bSort\b/i, order: /\bArrange\b|\bOrder\b|\bin order\b/i };
for (const lesson of lessons) {
  const set = sets[lesson.id] || {};
  const description = lesson.experiment?.description || "";
  check(description.trim().length > 20, `${lesson.id}: has an experiment description`);
  check(!HYPE.test(description), `${lesson.id}: promises no tool that does not render ("${description.slice(0, 60)}")`);
  check(VERB[set.kind] ? VERB[set.kind].test(description) : true,
    `${lesson.id}: the description names the ${set.kind} activity that actually renders`);
  const type = lesson.experiment?.type;
  const honest = { match: "matching-game", sort: "classifier-sim", order: "interactive-pathway" }[set.kind];
  check(type === honest, `${lesson.id}: experiment.type "${type}" matches the rendered ${set.kind} set`);
}

section("5. routing: the subject resolves labs by lessonId");
const sandbox = read("src/components/ExperimentSandbox.jsx");
const hsbBranchAt = sandbox.indexOf('subjectId === "human-social-biology"');
const hsbBranch = hsbBranchAt === -1 ? "" : sandbox.slice(hsbBranchAt, hsbBranchAt + 600);
check(hsbBranchAt !== -1, "ExperimentSandbox has a human-social-biology branch");
check(/lessonId=\{lessonId\}/.test(hsbBranch), "the branch passes lessonId through to DragDropLabel");
check(/DragDropLabel/.test(hsbBranch), "the branch renders DragDropLabel");

section("6. the banks stay at the floors and the drills sit on real lessons");
const practice = readJson("content/human-social-biology/practice.json");
const kc = readJson("content/human-social-biology/knowledge-check.json");
check(practice.length === 100, `Extra Practice is exactly 100 questions (${practice.length})`);
check(kc.length === 25, `Knowledge Check is exactly 25 questions (${kc.length})`);
for (const [bank, name] of [[practice, "practice"], [kc, "knowledge-check"]]) {
  check(new Set(bank.map((q) => q.id)).size === bank.length, `${name}: question ids are unique`);
  const orphans = bank.filter((q) => !byId.has(q.topic)).map((q) => q.id);
  check(orphans.length === 0, `${name}: every topic is a real lesson id (${orphans.join(",") || "none"})`);
  check(bank.every((q) => (q.options || []).includes(q.answer)), `${name}: every answer is one of its options`);
}
const practiceTopics = new Set(practice.map((q) => q.topic));
const undrilled = lessonIds.filter((id) => !practiceTopics.has(id));
check(undrilled.length === 0, `every lesson has at least one practice question (${undrilled.join(",") || "none"})`);
check(kc.filter((q) => NEW_LESSONS.includes(q.topic)).length >= NEW_LESSONS.length,
  "every new lesson is represented in the Knowledge Check");
// the cell module — the copy's own "foundation" — was the lesson pair with zero drills
check(practice.filter((q) => q.topic === "hsb-l2-1").length >= 2 &&
  practice.filter((q) => q.topic === "hsb-l2-2").length >= 2,
  "the cell module is drilled (hsb-l2-1 and hsb-l2-2 have at least 2 practice questions each)");

section("7. the re-tag landed on the new homes, the duplicates are retired, the additions shipped");
const bank = new Map([...practice, ...kc].map((q) => [q.id, q]));
for (const [id, topic] of Object.entries(RETAGGED)) {
  check(bank.has(id), `${id}: still in a bank (re-tagging never renumbers an id)`);
  check(bank.get(id)?.topic === topic, `${id}: topic is ${topic} (was not) — got ${bank.get(id)?.topic}`);
}
for (const id of RETIRED) check(!bank.has(id), `${id}: retired duplicate is gone`);
for (const id of ADDED) check(bank.has(id), `${id}: new question shipped`);
check(practice.filter((q) => q.id.startsWith("p10")).length >= 7, "the appended practice rows are present");

section("8. every lesson is reachable in the sampled mock paper");
{
  const { buildMockPaper } = await import("../src/data/mockPaper.js");
  const missing = [];
  for (const seed of [1, 7, 424242]) {
    const paper = buildMockPaper(practice, { seed });
    const topics = new Set(paper.map((q) => q.topic));
    for (const id of lessonIds) if (!topics.has(id)) missing.push(`${seed}:${id}`);
  }
  check(missing.length === 0, `one question per lesson in every sampled paper (${missing.slice(0, 4).join(",") || "none"})`);
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed += 1) for (const q of buildMockPaper(practice, { seed })) seen.add(q.id);
  const stranded = practice.filter((q) => !seen.has(q.id)).map((q) => q.id);
  check(stranded.length === 0, `no practice question is stranded (${stranded.slice(0, 4).join(",") || "none"})`);
}

section("9. wiring self-test (a false condition must fail, a true one must pass)");
{
  const p0 = pass, f0 = fail;
  const realLog = console.log;
  console.log = () => {};
  check(false, "probe-false");
  console.log = realLog;
  check(true, "probe-true");
  const wired = fail === f0 + 1 && pass === p0 + 1;
  pass = p0;
  fail = f0;
  check(wired, "check() is not vacuous (a false condition fails and a true one passes)");
}

console.log(`\ncheck-human-social-biology-gap: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}`);
process.exit(fail === 0 ? 0 : 1);
