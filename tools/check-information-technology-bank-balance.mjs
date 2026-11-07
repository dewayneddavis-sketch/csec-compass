// Information Technology bank re-balance (owner decision 2026-10-22) — the guardrails.
//
// The owner's rule: the two banks are RE-BALANCED, never grown. Practice stays exactly 100
// and the knowledge check exactly 25 (5 per section). The pass existed because the coverage
// build took Information Technology to 35 lessons while the practice bank still drilled 12
// topics: 23 lessons had nothing tagged to them at all, and one module supplied 30 of the
// 100 questions while another supplied none.
//
// This harness pins the outcome, and every assertion below is red-controlled:
//   1. practice is exactly 100, EVERY one of the 35 lessons is drilled, no orphans, no
//      duplicate ids or duplicate question text, every item a well-formed MCQ;
//   2. the five practice papers still partition the bank 20/20/20/20/20 and each one carries
//      every knowledge-check section, plus the reachable module-spread property;
//   3. the knowledge check is exactly 25, exactly 5 per section, five DISTINCT topics each
//      (every IT section holds at least five lessons, so there is no relaxation here);
//   4. the five knowledge-check sections are a COMPLETE and DISJOINT cover of the 35 lessons
//      — Information Technology cannot build them from module ids, because `it-mod-6` splits
//      across S3 and S4, so the map is keyed by lesson id and this is asserted both ways;
//   5. the ten lessons with no knowledge-check item are named, and that set is exactly
//      allLessons - distinctKcTopics, with |omissions| === lessons.length - 25;
//   6. content/ and public/content/ are byte-identical, for both banks;
//   7. docs/information-technology-bank-rebalance.md names every retirement (each with a
//      NON-EMPTY reason), every re-tag (practice and knowledge-check), and its
//      per-lesson/section/grouping tables match the bank that actually ships.
//
// Usage:
//   node tools/check-information-technology-bank-balance.mjs                green run
//   node tools/check-information-technology-bank-balance.mjs --red-control  also perturb the
//                                                                      shipped bytes and require
//                                                                      each guard to bite
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
const modules = readJson("content/information-technology/modules.json");
const lessons = modules.flatMap((s) => (s.lessons || []).map((l) => l.id));
const lessonIds = new Set(lessons);
const sectionOf = new Map(modules.flatMap((s) => (s.lessons || []).map((l) => [l.id, s.id])));
const SECTION_IDS = modules.map((s) => s.id);
const LESSONS = 35;
const MODULES = 7;

// The five knowledge-check sections, keyed by LESSON id: `it-mod-6` splits across S3 and S4
// (its word-processing half joins S3, its spreadsheet half joins S4), so a module-keyed map
// cannot express this grouping. Every section holds at least five lessons (11/7/7/5/5), so
// "5 per section over 5 distinct topics" holds exactly and needs no relaxation.
const modLessons = (id) => modules.find((s) => s.id === id).lessons.map((l) => l.id);
const KC_GROUPS = [
  { id: "S1", name: "Fundamentals and Data", lessons: modLessons("it-mod-1") },
  { id: "S2", name: "Networks and ICT Impact", lessons: [...modLessons("it-mod-4"), ...modLessons("it-mod-7")] },
  { id: "S3", name: "Web and Word-Processing", lessons: [...modLessons("it-mod-5"), "it-l6-1", "wp-document-protection-features", "wp-fillable-electronic-forms"] },
  { id: "S4", name: "Spreadsheets and Databases", lessons: ["it-l6-2", "sheet-column-and-row-manipulation", "sheet-worksheet-management", ...modLessons("it-mod-3")] },
  { id: "S5", name: "Design and Program Implementation", lessons: modLessons("it-mod-2") },
];
const KC_SECTION_IDS = KC_GROUPS.map((g) => g.id);
const kcSectionOf = new Map();
for (const g of KC_GROUPS) for (const l of g.lessons) kcSectionOf.set(l, g.id);
const lessonsInKcSection = new Map(KC_GROUPS.map((g) => [g.id, g.lessons.length]));

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

/**
 * Everything wrong with a knowledge check: 25, 5 per section, and five DISTINCT lesson
 * topics in each section. Information Technology's smallest section holds five lessons, so
 * unlike Social Studies there is no `min(5, lessons)` relaxation to apply.
 */
function checkProblems(kc, expectedLessons, mapLesson, kcLessonCount) {
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
    if (String(q.explanation || "").trim().length < 10) out.push(`${q.id}: thin explanation`);
    if (!expectedLessons.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic}`);
  }
  for (const s of KC_SECTION_IDS) {
    const mine = kc.filter((q) => mapLesson.get(q.topic) === s);
    if (mine.length !== 5) out.push(`section ${s} holds ${mine.length}, want 5`);
    const distinct = new Set(mine.map((q) => q.topic));
    if (distinct.size !== 5) out.push(`section ${s} has ${distinct.size} distinct topics, want 5 (${kcLessonCount.get(s)} lessons)`);
  }
  return out;
}

/**
 * The group map itself: every lesson in exactly one section, and the five sections together
 * are the whole subject. This is a separate assertion from the counts above because a lesson
 * that falls out of every group is invisible to them (its questions simply stop being
 * counted), and a lesson in two groups would be counted twice.
 */
function groupMapProblems(groups, expectedLessons) {
  const out = [];
  const seen = new Map();
  for (const g of groups) {
    for (const l of g.lessons) seen.set(l, (seen.get(l) || 0) + 1);
  }
  for (const l of expectedLessons) {
    if (!seen.has(l)) out.push(`${l} is in no knowledge-check section`);
    else if (seen.get(l) > 1) out.push(`${l} is in ${seen.get(l)} knowledge-check sections`);
  }
  for (const l of seen.keys()) if (!expectedLessons.has(l)) out.push(`${l} is in a section but is not a lesson`);
  const union = new Set([...seen.keys()].filter((l) => expectedLessons.has(l)));
  if (union.size !== expectedLessons.size) out.push(`the sections cover ${union.size} of ${expectedLessons.size} lessons`);
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
 * The reachable per-paper guarantee: every module section appears somewhere in the bank,
 * each paper spans at least half of the seven module sections, and no module supplies half
 * of a paper.
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

/**
 * The omission table: 35 lessons cannot all carry a knowledge-check item, so the ledger must
 * name exactly the lessons that do not — and that set is derived, not asserted by hand.
 */
function omissionProblems(doc, kc, expectedLessons) {
  const out = [];
  const withItem = new Set(kc.map((q) => q.topic));
  const want = [...expectedLessons].filter((l) => !withItem.has(l)).sort();
  const named = [...docSection(doc, "## Lessons with no knowledge-check item")
    .matchAll(/^\| (S\d) \| `([a-z0-9-]+)` \| (.+?) \|$/gm)].map((m) => ({ group: m[1], lesson: m[2], why: m[3] }));
  const got = named.map((r) => r.lesson).sort();
  if (got.join(",") !== want.join(",")) out.push(`the ledger names ${got.join(",")} as having no item, the bank says ${want.join(",")}`);
  if (named.length !== expectedLessons.size - kc.length) {
    out.push(`the ledger names ${named.length} omissions, want ${expectedLessons.size - kc.length}`);
  }
  for (const r of named) {
    if (!r.why.trim()) out.push(`${r.lesson}: an omission with an EMPTY reason`);
    if (withItem.has(r.lesson)) out.push(`${r.lesson}: named as having no item but the knowledge check ships one`);
    if (kcSectionOf.get(r.lesson) !== r.group) out.push(`${r.lesson}: filed under ${r.group}, the checker says ${kcSectionOf.get(r.lesson)}`);
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
 * The ledger has to name every retirement and every re-tag, give each retirement a reason,
 * and agree with the bank that ships. The retirement counts are READ FROM THE LEDGER (not
 * hardcoded here): the ledger declares its accounting, and this function proves the
 * declaration agrees with the enumerated rows and with the shipped bank.
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
    const circulated = new Set(bank.map((q) => q.id).filter((id) => Number(id.slice(1)) > 100));
    if (circulated.size !== authored) out.push(`the ledger says ${authored} authored, the bank ships ${circulated.size} ids past p100`);
  }
  // every practice re-tagged id keeps its id and carries the ledger's new topic
  let retagsSeen = 0;
  for (const m of docSection(doc, "Re-tagging, not retiring.").matchAll(/^\| `(p\d+)` \| `[a-z0-9-]+` \| `([a-z0-9-]+)` \|$/gm)) {
    const [, id, target] = m;
    retagsSeen++;
    const shipped = bank.find((q) => q.id === id);
    if (!shipped) out.push(`${id}: named as a re-tag but not shipped`);
    else if (shipped.topic !== target) out.push(`${id}: the ledger re-tags it to ${target}, the bank says ${shipped.topic}`);
  }
  if (retagsSeen === 0) out.push("the ledger names no practice re-tags");

  // the knowledge-check re-tags, published under their own heading
  let kcRetagsSeen = 0;
  for (const m of docSection(doc, "## Knowledge-check re-tagging").matchAll(/^\| `(q\d+)` \| `[a-z0-9-]+` \| `([a-z0-9-]+)` \|$/gm)) {
    const [, id, target] = m;
    kcRetagsSeen++;
    const shipped = kc.find((q) => q.id === id);
    if (!shipped) out.push(`${id}: named as a knowledge-check re-tag but not shipped`);
    else if (shipped.topic !== target) out.push(`${id}: the ledger re-tags it to ${target}, the knowledge check says ${shipped.topic}`);
  }
  if (kcRetagsSeen === 0) out.push("the ledger names no knowledge-check re-tags");

  // the per-lesson table must agree with the bank, and file each lesson under its module
  let perLessonRows = 0;
  for (const m of docSection(doc, "## Per-lesson before/after")
    .matchAll(/^\| ([a-z0-9-]+) \| `([a-z0-9-]+)` \| (\d+) \| (\d+) \|$/gm)) {
    const [, sid, lesson, before, after] = m;
    perLessonRows++;
    const real = bank.filter((q) => q.topic === lesson).length;
    if (Number(after) !== real) out.push(`ledger says ${lesson} has ${after} after, the bank has ${real}`);
    if (mapLesson.get(lesson) !== sid) out.push(`ledger files ${lesson} under ${sid}, the modules say ${mapLesson.get(lesson)}`);
    if (before === after && after === "0") out.push(`${lesson}: a ledger row with nothing on either side`);
  }
  if (perLessonRows !== 35) out.push(`the per-lesson table has ${perLessonRows} rows, want one per lesson (35)`);
  // the section totals
  const sectionRows = [...docSection(doc, "## Section totals")
    .matchAll(/^\| ([a-z0-9-]+) \| (\d+) \| (\d+) \| (\d+) \|$/gm)].map((m) => [m[1], Number(m[3]), Number(m[4])]);
  if (sectionRows.length !== SECTION_IDS.length) out.push(`the ledger's section totals cover ${sectionRows.length} of ${SECTION_IDS.length} module sections`);
  for (const [sid, before, after] of sectionRows) {
    const mine = bank.filter((q) => mapLesson.get(q.topic) === sid).length;
    if (after !== mine) out.push(`ledger section total for ${sid} says ${after}, the bank has ${mine}`);
    if (before + mine === 0) out.push(`section ${sid}: nothing on either side`);
  }
  // the grouping the ledger publishes must be the grouping the checker enforced
  const grouping = docSection(doc, "## The five knowledge-check sections");
  for (const g of KC_GROUPS) {
    const row = grouping.match(new RegExp(`^\\| ${g.id} \\| (.+?) \\| (.+?) \\|$`, "m"));
    if (!row) { out.push(`the ledger has no grouping row for ${g.id}`); continue; }
    const named = [...row[2].matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
    if (named.join(",") !== g.lessons.join(",")) out.push(`the ledger groups ${g.id} as ${named.join(",")}, the checker as ${g.lessons.join(",")}`);
  }
  // the KC's topics per section, as published, must be the ones that ship
  const topicsTable = docSection(doc, "## Knowledge check after - topics per section");
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
section("1. the practice bank: 100 questions, every one of the 35 lessons drilled");
const practice = readJson("content/information-technology/practice.json");
const kc = readJson("content/information-technology/knowledge-check.json");
const doc = read("docs/information-technology-bank-rebalance.md");
{
  const problems = bankProblems(practice, lessonIds);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(practice.length === 100, `practice is exactly 100 questions (${practice.length})`);
  const drilled = new Set(practice.map((q) => q.topic));
  check(drilled.size === lessons.length,
    `every lesson is drilled (${drilled.size} of ${lessons.length} lessons have a question tagged)`);
  check(lessons.length === LESSONS, `the subject holds its ${LESSONS} lessons (${lessons.length})`);
  check(modules.length === MODULES, `the subject holds its ${MODULES} modules (${modules.length})`);
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
  check(/arithmetically impossible|reachable/.test(doc) && /seven module sections/.test(doc),
    `the ledger explains the per-paper coverage over the 5 KC sections (${thin.join(", ")} hold fewer than ${tabs} questions)`);
}

section("3. the knowledge check: exactly 25, 5 per section, 5 distinct topics each");
{
  const problems = checkProblems(kc, lessonIds, kcSectionOf, lessonsInKcSection);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(kc.length === 25, `knowledge check is exactly 25 questions (${kc.length})`);
  for (const s of KC_SECTION_IDS) {
    const mine = kc.filter((q) => kcSectionOf.get(q.topic) === s);
    check(mine.length === 5 && new Set(mine.map((q) => q.topic)).size === 5,
      `${s}: 5 questions over 5 distinct topics (${mine.map((q) => q.topic).join(", ")})`);
  }
}

section("4. the five sections are a complete, disjoint cover of the 35 lessons");
{
  const problems = groupMapProblems(KC_GROUPS, lessonIds);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  const sizes = KC_GROUPS.map((g) => g.lessons.length);
  check(sizes.join(",") === "11,7,7,5,5", `the sections hold 11/7/7/5/5 lessons (${sizes.join("/")})`);
  check(KC_GROUPS.reduce((n, g) => n + g.lessons.length, 0) === lessons.length,
    `the sections sum to every lesson (${KC_GROUPS.reduce((n, g) => n + g.lessons.length, 0)} of ${lessons.length})`);
  const split = KC_GROUPS.filter((g) => g.lessons.includes("it-l6-2")).map((g) => g.id);
  check(split.length === 1 && split[0] === "S4", `it-mod-6's spreadsheet half sits in S4 alone (${split.join(",")})`);
  const wp = KC_GROUPS.filter((g) => g.lessons.includes("it-l6-1")).map((g) => g.id);
  check(wp.length === 1 && wp[0] === "S3", `it-mod-6's word-processing half sits in S3 alone (${wp.join(",")})`);
}

section("5. the ten lessons with no knowledge-check item are named, and the set is derived");
{
  const problems = omissionProblems(doc, kc, lessonIds);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  const withItem = new Set(kc.map((q) => q.topic));
  const omitted = [...lessonIds].filter((l) => !withItem.has(l));
  check(omitted.length === lessons.length - 25, `${omitted.length} lessons carry no item (35 - 25 = 10)`);
  check(withItem.size === 25, `the knowledge check drills ${withItem.size} distinct lessons`);
}

section("6. the mirror the browser fetches is byte-identical");
for (const file of ["practice.json", "knowledge-check.json"]) {
  const a = readBytes(`content/information-technology/${file}`), b = readBytes(`public/content/information-technology/${file}`);
  check(a.equals(b), `${file}: content/ and public/content/ are byte-identical (${a.length} vs ${b.length})`);
}

section("7. the ledger: derived counts, every retirement reasoned, and it matches the bank");
{
  const problems = ledgerProblems(doc, practice, kc, sectionOf, kcSectionOf);
  check(problems.length === 0, problems.slice(0, 6).join(" | "));
  check(/every one of the 35 Information Technology lessons has at least one question/.test(doc),
    "the ledger states the floor rule it was built to");
  check(/Timed Mock Exam/.test(doc) && /40-question paper/.test(doc),
    "the ledger reports what this pass does to the Timed Mock Exam");
  check(/seven module sections/.test(doc),
    "the ledger explains why the knowledge check needs a documented grouping");
  check(/keyed by \*\*lesson id\*\*/.test(doc),
    "the ledger records that the grouping cannot be built from module ids");
}

section("8. red controls — each assertion above must be able to fail");
{
  const good = { ...practice[0] };
  const oneSection = (bank, s) => bank.filter((q) => kcSectionOf.get(q.topic) === s);
  const doctored = [
    ["an orphan topic", bankProblems([{ ...good, topic: "no-such-lesson" }, ...practice.slice(1)], lessonIds)],
    ["a lesson with no question", bankProblems(practice.filter((q) => q.topic !== "imp-computer-related-professions"), lessonIds)],
    ["a duplicate question text", bankProblems([practice[0], { ...practice[1], question: practice[0].question }, ...practice.slice(2)], lessonIds)],
    ["an answer outside its options", bankProblems([{ ...good, answer: "not an option" }, ...practice.slice(1)], lessonIds)],
    ["a bank one question short", bankProblems(practice.slice(1), lessonIds)],
    ["options that are not 4 distinct", bankProblems([{ ...good, options: [good.options[0], good.options[0], good.options[2], good.options[3]] }, ...practice.slice(1)], lessonIds)],
    ["a knowledge check with 4 in a section", checkProblems(kc.map((q) => (kcSectionOf.get(q.topic) === "S5" && q.topic === "impl-program-documentation" ? { ...q, topic: "it-l2-1" } : q)), lessonIds, kcSectionOf, lessonsInKcSection)],
    ["a knowledge check that repeats one topic five times", checkProblems(kc.map((q) => (kcSectionOf.get(q.topic) === "S5" ? { ...q, topic: "it-l2-1" } : q)), lessonIds, kcSectionOf, lessonsInKcSection)],
    ["a knowledge check with an orphan topic", checkProblems([{ ...kc[0], topic: "nope" }, ...kc.slice(1)], lessonIds, kcSectionOf, lessonsInKcSection)],
    ["a paper that is a block of one section", paperProblems(oneSection(practice, "S5").concat(practice.slice(34)), 5, kcSectionOf, KC_SECTION_IDS)],
    ["a section stranding a paper", sectionSpreadProblems(practice.filter((q) => sectionOf.get(q.topic) === "it-mod-1").slice(0, 20).concat(practice.slice(20)), 5, sectionOf, SECTION_IDS)],
    ["a group map missing a lesson (union incomplete)", groupMapProblems(KC_GROUPS.map((g) => (g.id === "S1" ? { ...g, lessons: g.lessons.slice(1) } : g)), lessonIds)],
    ["a lesson in two groups", groupMapProblems(KC_GROUPS.map((g) => (g.id === "S5" ? { ...g, lessons: [...g.lessons, "it-l6-1"] } : g)), lessonIds)],
    ["an omission table that drops a lesson", omissionProblems(doc.replace(/^\| S1 \| `fund-computer-system-types` \|.*$/m, ""), kc, lessonIds)],
    ["an omission table that names a lesson which does carry an item", omissionProblems(doc.replace(/^\| S1 \| `fund-computer-system-types` \| .*$/m, "| S1 | `it-l1-1` | a lesson that does carry one |"), kc, lessonIds)],
    ["an omission row filed under the wrong section", omissionProblems(doc.replace(/^\| S1 \| `fund-file-organisation` \| /m, "| S3 | `fund-file-organisation` | "), kc, lessonIds)],
    ["a ledger that forgets a retirement row", ledgerProblems(doc.replace(/^\| `p13` \|.*$/m, ""), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose declared retirement count disagrees", ledgerProblems(doc.replace(/^practice retirements: \d+$/m, "practice retirements: 47"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose accounting does not close", ledgerProblems(doc.replace(/^\* kept in place 36 \| re-tagged 16 \| retired 48 \| newly authored 48$/m, "* kept in place 36 | re-tagged 16 | retired 48 | newly authored 47"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger with an EMPTY retirement reason", ledgerProblems(doc.replace(/^\| `p13` \| (`[a-z0-9-]+`) \| .*$/m, "| `p13` | $1 |  |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose re-tag target is wrong", ledgerProblems(doc.replace(/^\| `p79` \| `([a-z0-9-]+)` \| `[a-z0-9-]+` \|$/m, "| `p79` | `$1` | `fund-file-organisation` |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose KC re-tag target is wrong", ledgerProblems(doc.replace(/^\| `q16` \| `([a-z0-9-]+)` \| `[a-z0-9-]+` \|$/m, "| `q16` | `$1` | `fund-cloud-and-local-storage` |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose count disagrees with the bank", ledgerProblems(doc.replace(/`it-l1-1` \| 23 \| 5 \|/, "`it-l1-1` | 23 | 8 |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger that publishes the wrong KC topics", ledgerProblems(doc.replace(/^\| S5 \| `it-l2-1`.*$/m, "| S5 | `it-l2-1`, `it-l2-2`, `impl-programming-language-overview`, `impl-variables-constants-and-data-types`, `it-l3-1` |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose grouping disagrees with the checker", ledgerProblems(doc.replace(/^\| S3 \| .*$/m, "| S3 | Web and Word-Processing | `it-l5-1` |"), practice, kc, sectionOf, kcSectionOf)],
    ["a ledger whose per-lesson table drops a row", ledgerProblems(doc.replace(/^\| it-mod-7 \| `imp-societal-and-economic-impact` \|.*$/m, ""), practice, kc, sectionOf, kcSectionOf)],
  ];
  const silent = doctored.filter(([, problems]) => problems.length === 0).map(([label]) => label);
  check(silent.length === 0, `every doctored input was caught (silent: ${silent.join(", ") || "none"})`);
  check(doctored.every(([, p]) => p.length > 0), "every red control produces at least one problem");
  check(doctored.length === 26, `${doctored.length} red controls cover the assertions above`);
}

section("9. wiring self-test (a false condition must fail and a true one must pass)");
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
  section("10. RED CONTROL on the shipped bytes — perturb the real files, require the guard to bite");
  const cases = [
    ["a shipped question re-pointed at a non-existent lesson",
      bankProblems(practice.map((q, i) => (i === 7 ? { ...q, topic: "gone" } : q)), lessonIds)],
    ["a lesson's every question retired",
      bankProblems(practice.filter((q) => q.topic !== "imp-computer-related-professions"), lessonIds)],
    ["the KC's S1 group emptied",
      checkProblems(kc.filter((q) => kcSectionOf.get(q.topic) !== "S1"), lessonIds, kcSectionOf, lessonsInKcSection)],
    ["the KC's S5 group collapsed onto one lesson",
      checkProblems(kc.map((q) => (kcSectionOf.get(q.topic) === "S5" ? { ...q, topic: "it-l2-1" } : q)), lessonIds, kcSectionOf, lessonsInKcSection)],
    ["the ledger's practice retirement table emptied",
      ledgerProblems(doc.replace(/^\| `p\d+` \|.*$/gm, ""), practice, kc, sectionOf, kcSectionOf)],
    ["the ledger's omission table emptied",
      omissionProblems(doc.replace(/^\| S\d \| `[a-z0-9-]+` \| .*$/gm, ""), kc, lessonIds)],
  ];
  for (const [label, problems] of cases) check(problems.length > 0, `red control bites: ${label}`);
  const mirrorA = readBytes("content/information-technology/practice.json");
  const mirrorB = readBytes("public/content/information-technology/practice.json");
  check(mirrorA.equals(mirrorB) && mirrorA.length > 0, "the two practice mirrors are equal and non-empty before the control");
  check(!Buffer.from(mirrorA.toString("utf8") + "\n").equals(mirrorB), "a one-byte mirror drift would be caught by check 6");
}

console.log(`\ncheck-information-technology-bank-balance: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}${RED_CONTROL ? " [--red-control]" : ""}`);
process.exit(fail === 0 ? 0 : 1);
