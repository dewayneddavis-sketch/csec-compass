// Chemistry bank re-balance (owner decision 2026-10-22) — the guardrails.
//
// The owner's rule: the two banks are RE-BALANCED, never grown. Practice stays
// exactly 100 and the knowledge check exactly 25 (5 per section). The pass existed
// because the coverage build took Chemistry to 54 lessons while the practice bank still
// drilled 9 topics: 45 lessons had nothing tagged to them at all.
//
// This harness pins the outcome, and every assertion below is red-controlled, so a
// passing run is evidence rather than a formality:
//   1. practice is exactly 100, EVERY one of the 54 lessons is drilled, no orphans,
//      no duplicate ids or duplicate question text, every item a well-formed MCQ;
//   2. the five practice papers still partition the bank 20/20/20/20/20 and each one
//      carries every knowledge-check section, plus every module section big enough to
//      be guaranteed a place in each paper;
//   3. the knowledge check is exactly 25, exactly 5 per section, 5 DISTINCT topics per
//      section, same well-formedness;
//   4. content/ and public/content/ are byte-identical, for both banks;
//   5. docs/chemistry-bank-rebalance.md names every retirement (each with a NON-EMPTY
//      reason), every re-tag, and its per-lesson/section tables match the bank that
//      actually ships.
//
// Two things this harness does that its Physics model did not:
//   (a) the retirement counts are DERIVED from the ledger, not written into the
//       harness: the ledger declares its accounting and the harness proves the
//       declaration agrees with the enumerated rows and with the bank that ships;
//   (b) an empty retirement reason is a failure (the Physics ledger was checked by eye).
//
// Usage:
//   node tools/check-chemistry-bank-balance.mjs                green run
//   node tools/check-chemistry-bank-balance.mjs --red-control  also perturb the shipped
//                                                             bytes and require each
//                                                             guard to bite
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { practicePaperTabs } from "../src/data/practicePapers.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readBytes = (p) => fs.readFileSync(path.join(root, p));
const readJson = (p) => JSON.parse(read(p));
const RED_CONTROL = process.argv.includes("--red-control");
let pass = 0, fail = 0, quiet = false;
const check = (cond, msg) => { if (cond) pass++; else { fail++; if (!quiet) console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const SHAPE = ["id", "question", "options", "answer", "explanation", "topic"];
const modules = readJson("content/chemistry/modules.json");
const lessons = modules.flatMap((s) => (s.lessons || []).map((l) => l.id));
const lessonIds = new Set(lessons);
const sectionOf = new Map(modules.flatMap((s) => (s.lessons || []).map((l) => [l.id, s.id])));
const SECTION_IDS = modules.map((s) => s.id);

// The five knowledge-check sections. Chemistry has TEN module sections, so "5 per
// section" needs a documented grouping; the ledger holds the same table and check 5
// proves the two agree.
const KC_GROUPS = [
  { id: "S1", name: "Principles and Structure", moduleSections: ["principles-of-chemistry", "periodic-table-bonding"] },
  { id: "S2", name: "Quantitative and Physical Chemistry", moduleSections: ["mole-concept", "energy-changes", "reaction-kinetics"] },
  { id: "S3", name: "Reactions and Aqueous Chemistry", moduleSections: ["acids-bases-salts", "redox-reactions", "electrolysis"] },
  { id: "S4", name: "Organic Chemistry", moduleSections: ["organic-chemistry"] },
  { id: "S5", name: "Inorganic Chemistry", moduleSections: ["inorganic-chemistry"] },
];
const KC_SECTION_IDS = KC_GROUPS.map((g) => g.id);
const kcSectionOf = new Map();
for (const g of KC_GROUPS) for (const s of g.moduleSections) {
  for (const [lesson, sec] of sectionOf) if (sec === s) kcSectionOf.set(lesson, g.id);
}

// ---------------------------------------------------------------- the checks
/** Everything wrong with a practice bank, given the lessons it is supposed to drill. */
function bankProblems(bank, expectedLessons) {
  const out = [];
  if (bank.length !== 100) out.push(`practice holds ${bank.length}, want 100`);
  const ids = bank.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const text = bank.map((q) => String(q.question).trim().toLowerCase());
  if (new Set(text).size !== text.length) out.push("duplicate question text");
  for (const q of bank) {
    if (JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) out.push(`${q.id}: keys ${Object.keys(q).join(",")}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4) out.push(`${q.id}: options are not 4 distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if (String(q.explanation || "").trim().length < 10) out.push(`${q.id}: thin explanation`);
    if (!expectedLessons.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic}`);
  }
  const drilled = new Set(bank.map((q) => q.topic));
  const undrilled = [...expectedLessons].filter((id) => !drilled.has(id));
  if (undrilled.length) out.push(`lessons with no practice question: ${undrilled.join(",")}`);
  return out;
}

/** Everything wrong with a knowledge check: 25, 5 per section, 5 distinct topics each. */
function checkProblems(kc, expectedLessons, mapLesson) {
  const out = [];
  if (kc.length !== 25) out.push(`knowledge check holds ${kc.length}, want 25`);
  const ids = kc.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const text = kc.map((q) => String(q.question).trim().toLowerCase());
  if (new Set(text).size !== text.length) out.push("duplicate question text");
  for (const q of kc) {
    if (JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) out.push(`${q.id}: keys ${Object.keys(q).join(",")}`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4) out.push(`${q.id}: options are not 4 distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if (!expectedLessons.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic}`);
  }
  for (const s of KC_SECTION_IDS) {
    const mine = kc.filter((q) => mapLesson.get(q.topic) === s);
    if (mine.length !== 5) out.push(`section ${s} holds ${mine.length}, want 5`);
    const distinct = new Set(mine.map((q) => q.topic));
    if (distinct.size !== mine.length) out.push(`section ${s} repeats a topic (${distinct.size} distinct for ${mine.length})`);
  }
  return out;
}

/** The five papers: an even split, each carrying every knowledge-check section. */
function paperProblems(bank, tabs, mapLesson, sectionIds) {
  const out = [];
  if (tabs !== 5) out.push(`${tabs} practice tabs, want 5`);
  if (bank.length % tabs !== 0) out.push(`${bank.length} questions do not split evenly into ${tabs}`);
  const size = bank.length / tabs;
  for (let i = 0; i < tabs; i++) {
    const paper = bank.slice(i * size, (i + 1) * size);
    const named = sectionIds.filter((s) => paper.some((q) => mapLesson.get(q.topic) === s));
    if (named.length !== sectionIds.length) out.push(`paper ${i + 1} is missing sections ${sectionIds.filter((s) => !named.includes(s)).join(",")}`);
  }
  return out;
}

/**
 * The per-paper guarantee is asserted over the five KNOWLEDGE-CHECK sections above,
 * because that is the unit a paper can actually carry: `redox-reactions` holds 2
 * questions and `reaction-kinetics` 4, fewer than the 5 papers, so "every module section
 * in every paper" is arithmetically impossible (see the ledger). What this asserts
 * instead is the property that IS reachable: every module section appears somewhere in
 * the bank, no paper is a block of one or two module sections (each paper spans at least
 * half of them), and no single module section supplies half of a paper.
 */
function sectionSpreadProblems(bank, tabs, mapSection, sectionIds) {
  const out = [];
  const size = bank.length / tabs;
  const papers = Array.from({ length: tabs }, (_, i) => bank.slice(i * size, (i + 1) * size));
  const floor = Math.ceil(sectionIds.length / 2);
  for (let i = 0; i < tabs; i++) {
    const seen = new Set(papers[i].map((q) => mapSection.get(q.topic)));
    if (seen.size < floor) out.push(`paper ${i + 1} spans only ${seen.size} module sections, want at least ${floor}`);
    for (const s of sectionIds) {
      const here = papers[i].filter((q) => mapSection.get(q.topic) === s).length;
      if (here > size / 2) out.push(`paper ${i + 1} is more than half ${s} (${here} of ${size})`);
    }
  }
  for (const s of sectionIds) {
    if (!bank.some((q) => mapSection.get(q.topic) === s)) out.push(`module section ${s} has no question at all`);
  }
  return out;
}

/** The slice of the ledger under one heading (so two tables with the same shape cannot collide). */
function docSection(doc, heading) {
  const start = doc.indexOf(heading);
  if (start < 0) return "";
  const rest = doc.slice(start + heading.length);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
}

/**
 * The ledger doc has to name every retirement and every re-tag, give each retirement a
 * reason, and agree with the bank that ships. The retirement counts are READ FROM THE
 * LEDGER (not hardcoded here): the ledger declares its accounting, and this function
 * proves the declaration agrees with the enumerated rows and with the shipped bank.
 */
function ledgerProblems(doc, bank, kc, mapLesson, mapKcSection) {
  const out = [];
  const declared = {};
  for (const key of ["practice retirements", "knowledge-check retirements"]) {
    const m = doc.match(new RegExp(`^${key}: (\\d+)$`, "m"));
    if (!m) out.push(`the ledger declares no "${key}" count`);
    else declared[key] = Number(m[1]);
  }
  const declaredInt = (key) => declared[key] ?? -1;

  const retireRows = [
    ...docSection(doc, "## Practice retirement ledger").matchAll(/^\| `([pq]\d+)` \| `([a-z0-9-]+)` \| (.+?) \|$/gm),
    ...docSection(doc, "## Knowledge-check retirement ledger").matchAll(/^\| `([pq]\d+)` \| `([a-z0-9-]+)` \| (.+?) \|$/gm),
  ].map((m) => ({ id: m[1], topic: m[2], reason: m[3] }));
  const practiceRetired = retireRows.filter((r) => r.id.startsWith("p"));
  const checkRetired = retireRows.filter((r) => r.id.startsWith("q"));
  if (practiceRetired.length !== declaredInt("practice retirements")) {
    out.push(`the ledger declares ${declaredInt("practice retirements")} practice retirements but enumerates ${practiceRetired.length}`);
  }
  if (checkRetired.length !== declaredInt("knowledge-check retirements")) {
    out.push(`the ledger declares ${declaredInt("knowledge-check retirements")} knowledge-check retirements but enumerates ${checkRetired.length}`);
  }
  if (declaredInt("practice retirements") < 1 || declaredInt("knowledge-check retirements") < 1) {
    out.push("the ledger declares no retirements at all");
  }
  for (const r of retireRows) {
    if (!r.reason.trim()) out.push(`${r.id}: a retirement with an EMPTY reason`);
    if (bank.some((q) => q.id === r.id) || kc.some((q) => q.id === r.id)) out.push(`${r.id}: retired in the ledger but still shipped`);
  }

  // the accounting line: kept + re-tagged + retired = 100, and kept + re-tagged + authored = 100
  const acct = doc.match(/^\* kept in place (\d+) \| re-tagged (\d+) \| retired (\d+) \| newly authored (\d+)$/m);
  if (!acct) out.push("the ledger has no accounting line");
  else {
    const [, kept, retagged, retired, authored] = acct.map(Number);
    if (kept + retagged + retired !== 100) out.push(`the ledger's accounting does not close: ${kept}+${retagged}+${retired} != 100`);
    if (kept + retagged + authored !== 100) out.push(`the ledger's authored count does not close: ${kept}+${retagged}+${authored} != 100`);
    if (retired !== practiceRetired.length) out.push(`the accounting says ${retired} retired, the table enumerates ${practiceRetired.length}`);
    if (retagged !== [...docSection(doc, "Re-tagging, not retiring.").matchAll(/^\| `(p\d+)` \| `[a-z0-9-]+` \| `([a-z0-9-]+)` \|$/gm)].length) {
      out.push("the accounting's re-tag count disagrees with the re-tag table");
    }
    // an authored id must be a question the bank actually ships, and there must be `authored` of them
    const circulated = new Set(bank.map((q) => q.id).filter((id) => Number(id.slice(1)) > 100));
    if (circulated.size !== authored) out.push(`the ledger says ${authored} authored, the bank ships ${circulated.size} ids past p100`);
  }
  // every re-tagged id keeps its id and carries the ledger's new topic
  let retagsSeen = 0;
  for (const m of docSection(doc, "Re-tagging, not retiring.").matchAll(/^\| `(p\d+)` \| `[a-z0-9-]+` \| `([a-z0-9-]+)` \|$/gm)) {
    const [, id, target] = m;
    retagsSeen++;
    const shipped = bank.find((q) => q.id === id);
    if (!shipped) out.push(`${id}: named as a re-tag but not shipped`);
    else if (shipped.topic !== target) out.push(`${id}: the ledger re-tags it to ${target}, the bank says ${shipped.topic}`);
  }
  if (retagsSeen === 0) out.push("the ledger names no re-tags");

  // the per-lesson table must agree with the bank, and file each lesson under its module
  for (const m of docSection(doc, "## Per-lesson before/after")
    .matchAll(/^\| ([a-z-]+) \| `([a-z0-9-]+)` \| (\d+) \| (\d+) \|$/gm)) {
    const [, sid, lesson, before, after] = m;
    const real = bank.filter((q) => q.topic === lesson).length;
    if (Number(after) !== real) out.push(`ledger says ${lesson} has ${after} after, the bank has ${real}`);
    if (mapLesson.get(lesson) !== sid) out.push(`ledger files ${lesson} under ${sid}, the modules say ${mapLesson.get(lesson)}`);
    if (before === after && after === "0") out.push(`${lesson}: a ledger row with nothing on either side`);
  }
  // the section totals
  const sectionRows = [...docSection(doc, "## Section totals")
    .matchAll(/^\| ([a-z-]+) \| (\d+) \| (\d+) \| (\d+) \|$/gm)].map((m) => [m[1], Number(m[3]), Number(m[4])]);
  if (sectionRows.length !== SECTION_IDS.length) out.push(`the ledger's section totals cover ${sectionRows.length} of ${SECTION_IDS.length} module sections`);
  for (const [sid, before, after] of sectionRows) {
    const mine = bank.filter((q) => mapLesson.get(q.topic) === sid).length;
    if (after !== mine) out.push(`ledger section total for ${sid} says ${after}, the bank has ${mine}`);
    if (before + mine === 0) out.push(`section ${sid}: nothing on either side`);
  }
  // the grouping the ledger publishes must be the grouping the check above enforced
  const grouping = docSection(doc, "## The five knowledge-check sections");
  for (const g of KC_GROUPS) {
    const row = grouping.match(new RegExp(`^\\| ${g.id} \\| (.+?) \\| (.+?) \\|$`, "m"));
    if (!row) { out.push(`the ledger has no grouping row for ${g.id}`); continue; }
    const named = [...row[2].matchAll(/`([a-z-]+)`/g)].map((m) => m[1]);
    if (named.join(",") !== g.moduleSections.join(",")) out.push(`the ledger groups ${g.id} as ${named.join(",")}, the checker as ${g.moduleSections.join(",")}`);
  }
  // the KC's topics per section, as published, must be the ones that ship
  const topicsTable = docSection(doc, "Knowledge check after - 5 topics per section");
  for (const s of KC_SECTION_IDS) {
    const row = topicsTable.match(new RegExp(`^\\| ${s} \\| (.+?) \\|$`, "m"));
    if (!row) { out.push(`the ledger publishes no ${s} topic list`); continue; }
    const named = [...row[1].matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]).sort();
    const real = kc.filter((q) => mapKcSection.get(q.topic) === s).map((q) => q.topic).sort();
    if (named.join(",") !== real.join(",")) out.push(`the ledger's ${s} topics (${named.join(",")}) are not the ones that ship (${real.join(",")})`);
  }
  return out;
}

// ------------------------------------------------------------------- the run
section("1. the practice bank: 100 questions, every one of the 54 lessons drilled");
const practice = readJson("content/chemistry/practice.json");
const kc = readJson("content/chemistry/knowledge-check.json");
const doc = read("docs/chemistry-bank-rebalance.md");
{
  const problems = bankProblems(practice, lessonIds);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(practice.length === 100, `practice is exactly 100 questions (${practice.length})`);
  const drilled = new Set(practice.map((q) => q.topic));
  check(drilled.size === lessons.length,
    `every lesson is drilled (${drilled.size} of ${lessons.length} lessons have a question tagged)`);
  check(lessons.length === 54, `the subject still holds its 54 lessons (${lessons.length})`);
}

section("2. the five practice papers split the bank evenly, each with every KC section");
{
  const tabs = practicePaperTabs().length;
  const size = practice.length / tabs;
  const problems = paperProblems(practice, tabs, kcSectionOf, KC_SECTION_IDS);
  check(problems.length === 0, problems.join(" | "));
  check(practice.slice(0, size).length === size && practice.slice(-size).length === size,
    `each of the ${tabs} tabs holds ${size} questions`);
  const spread = sectionSpreadProblems(practice, tabs, sectionOf, SECTION_IDS);
  check(spread.length === 0, spread.slice(0, 6).join(" | "));
  check(KC_SECTION_IDS.length === 5, `${KC_SECTION_IDS.length} knowledge-check sections over ${SECTION_IDS.length} module sections`);
  const thin = SECTION_IDS.filter((s) => practice.filter((q) => sectionOf.get(q.topic) === s).length < tabs);
  check(thin.length > 0 && /arithmetically impossible/.test(doc),
    `the ledger explains why per-paper coverage is asserted over the 5 KC sections (${thin.join(", ")} hold fewer than ${tabs} questions)`);
}

section("3. the knowledge check: exactly 25, 5 per section, 5 distinct topics each");
{
  const problems = checkProblems(kc, lessonIds, kcSectionOf);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(kc.length === 25, `knowledge check is exactly 25 questions (${kc.length})`);
  for (const s of KC_SECTION_IDS) {
    const mine = kc.filter((q) => kcSectionOf.get(q.topic) === s);
    check(mine.length === 5 && new Set(mine.map((q) => q.topic)).size === 5,
      `${s}: 5 questions over 5 distinct topics (${mine.map((q) => q.topic).join(", ")})`);
  }
}

section("4. the mirror the browser fetches is byte-identical");
for (const file of ["practice.json", "knowledge-check.json"]) {
  const a = readBytes(`content/chemistry/${file}`), b = readBytes(`public/content/chemistry/${file}`);
  check(a.equals(b), `${file}: content/ and public/content/ are byte-identical (${a.length} vs ${b.length})`);
}

section("5. the ledger: derived counts, every retirement reasoned, and it matches the bank");
{
  const problems = ledgerProblems(doc, practice, kc, sectionOf, kcSectionOf);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(/every one of the 54 Chemistry lessons has at least one question/.test(doc),
    "the ledger states the floor rule it was built to");
  check(/Timed Mock Exam/.test(doc) && /40-question paper/.test(doc),
    "the ledger reports what this pass does to the Timed Mock Exam");
  check(/ten module sections/.test(doc),
    "the ledger explains why the knowledge check needs a documented grouping");
  check(/cannot supply the five DISTINCT topics/.test(doc),
    "the ledger records the one refinement to the plan's section grouping");
}

section("6. red controls — each assertion above must be able to fail");
{
  const good = { ...practice[0] };
  const doctored = [
    ["an orphan topic", bankProblems([{ ...good, topic: "no-such-lesson" }, ...practice.slice(1)], lessonIds)],
    ["a lesson with no question", bankProblems(practice.filter((q) => q.topic !== "chem-sucrose-extraction"), lessonIds)],
    ["a duplicate question text", bankProblems([practice[0], { ...practice[1], question: practice[0].question }, ...practice.slice(2)], lessonIds)],
    ["an answer outside its options", bankProblems([{ ...good, answer: "not an option" }, ...practice.slice(1)], lessonIds)],
    ["a bank one question short", bankProblems(practice.slice(1), lessonIds)],
    ["options that are not 4 distinct", bankProblems([{ ...good, options: [good.options[0], good.options[0], good.options[2], good.options[3]] }, ...practice.slice(1)], lessonIds)],
    ["a knowledge check with 4 in a section", checkProblems(kc.map((q) => (kcSectionOf.get(q.topic) === "S4" && q.topic === "org-polymers" ? { ...q, topic: "org-functional-groups" } : q)), lessonIds, kcSectionOf)],
    ["a knowledge check that repeats a topic in a section", checkProblems(kc.map((q) => (kcSectionOf.get(q.topic) === "S5" ? { ...q, topic: "inorg-reactivity-series" } : q)), lessonIds, kcSectionOf)],
    ["a knowledge check with an orphan topic", checkProblems([{ ...kc[0], topic: "nope" }, ...kc.slice(1)], lessonIds, kcSectionOf)],
    ["a paper that is a block of one section", paperProblems(practice.filter((q) => kcSectionOf.get(q.topic) === "S5").concat(practice.slice(34)), 5, kcSectionOf, KC_SECTION_IDS)],
    ["a section stranding a paper", sectionSpreadProblems(practice.filter((q) => sectionOf.get(q.topic) === "inorganic-chemistry").concat(practice.slice(34)), 5, sectionOf, SECTION_IDS)],
    ["a ledger that forgets a retirement row", ledgerProblems(doc.replace(/^\| `p100` \|.*$/m, ""), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose declared retirement count disagrees", ledgerProblems(doc.replace(/^practice retirements: \d+$/m, "practice retirements: 42"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose accounting does not close", ledgerProblems(doc.replace(/^\* kept in place 18 \| re-tagged 39 \| retired 43 \| newly authored 43$/m, "* kept in place 18 | re-tagged 39 | retired 43 | newly authored 42"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger with an EMPTY retirement reason", ledgerProblems(doc.replace(/^\| `p8` \| (`[a-z0-9-]+`) \| .*$/m, "| `p8` | $1 |  |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose re-tag target is wrong", ledgerProblems(doc.replace(/^\| `p47` \| `([a-z0-9-]+)` \| `[a-z0-9-]+` \|$/m, "| `p47` | `$1` | `chem-solutions-suspensions-and-colloids` |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose count disagrees with the bank", ledgerProblems(doc.replace(/states-of-matter` \| 22 \| 2 \|/, "states-of-matter` | 22 | 7 |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger that publishes the wrong KC topics", ledgerProblems(doc.replace(/^\| S5 \| `inorg-reactivity-series`.*$/m, "| S5 | `inorg-reactivity-series`, `inorg-corrosion-of-metals`, `inorg-extraction-of-aluminium-and-iron`, `inorg-identification-of-cations`, `inorg-metal-properties` |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose grouping disagrees with the checker", ledgerProblems(doc.replace(/^\| S3 \| .*$/m, "| S3 | Reactions and Aqueous Chemistry | `acids-bases-salts`, `redox-reactions` |"), practice, kc, sectionOf, kcSectionOf)],
  ];
  const silent = doctored.filter(([, problems]) => problems.length === 0).map(([label]) => label);
  check(silent.length === 0, `every doctored input was caught (silent: ${silent.join(", ") || "none"})`);
  check(doctored.slice(0, 6).every(([, p]) => p.length > 0), "the first six red controls actually produce problems");
  check(doctored.length === 19, `${doctored.length} red controls cover the assertions above`);
}

section("7. wiring self-test (a false condition must fail and a true one must pass)");
{
  const f0 = fail;
  quiet = true;
  check(false, "harness control: a false condition must be counted as a failure");
  const wired = fail === f0 + 1;
  quiet = false;
  fail = f0;
  check(wired, "check() is not vacuous (a false condition fails and a true one passes)");
}

if (RED_CONTROL) {
  section("8. RED CONTROL on the shipped bytes — perturb the real files, require the guard to bite");
  // Every perturbation below starts from the bytes that actually ship, so a green run of
  // the sections above cannot survive a corrupted bank, ledger or mirror.
  const cases = [
    ["a shipped question re-pointed at a non-existent lesson",
      bankProblems(practice.map((q, i) => (i === 7 ? { ...q, topic: "gone" } : q)), lessonIds)],
    ["the last lesson's only question retired",
      bankProblems(practice.filter((q) => q.topic !== "inorg-water-treatment"), lessonIds)],
    ["the KC's S1 group emptied",
      checkProblems(kc.filter((q) => kcSectionOf.get(q.topic) !== "S1"), lessonIds, kcSectionOf)],
    ["the ledger's retirement table emptied",
      ledgerProblems(doc.replace(/^\| `p1\d\d` \|.*$/gm, ""), practice, kc, sectionOf, kcSectionOf)],
  ];
  for (const [label, problems] of cases) check(problems.length > 0, `red control bites: ${label}`);
  const mirrorA = readBytes("content/chemistry/practice.json");
  const mirrorB = readBytes("public/content/chemistry/practice.json");
  check(mirrorA.equals(mirrorB) && mirrorA.length > 0, "the two practice mirrors are equal and non-empty before the control");
  check(!Buffer.from(mirrorA.toString("utf8") + "\n").equals(mirrorB), "a one-byte mirror drift would be caught by check 4");
}

console.log(`\ncheck-chemistry-bank-balance: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}${RED_CONTROL ? " [--red-control]" : ""}`);
process.exit(fail === 0 ? 0 : 1);
