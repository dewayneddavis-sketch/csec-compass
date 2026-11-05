#!/usr/bin/env node
// Harness: Information Technology coverage — the owner's 61-chapter list really is taught.
//
// Authority: /home/team/shared/information-technology-coverage-audit.md (design) and
// /home/team/shared/information-technology-coverage-target-competitor-list.md (the 61 chapters).
// The repo copy of the table is docs/information-technology-coverage.md, and THIS harness parses it,
// so the document and the delivered content cannot drift apart.
//
// What it pins
//   1. the doc holds the owner's 61 chapters, verbatim, numbered 1..61 in order, with the per-section
//      counts 13/4/6/12/9/4/7/6 and the disp totals NEW 23 / EXTEND 30 / REUSE 8;
//   2. chapters are identified by (section, number), never by name — #52 and #59 share a name on
//      different hosts, and #46 carries "Data Types" a third time;
//   3. TWO-LAYER by-name coverage. Copy level: for a `taught` row the chapter name is in the host
//      lesson's own copy (title + content + objectives + concepts) AND the row's evidence phrase is.
//      Prose level: for NEW/EXTEND the evidence phrase must CONTAIN the chapter name, so a row can
//      never be "covered" by a phrase that does not name the chapter. `paraphrase` rows (REUSE only)
//      record the words the legacy lesson actually uses; `pending` rows must still be pending — the
//      moment a later slice teaches one, this goes red until the row is updated;
//   4. the 12 frozen ids survive in their original relative order, the EXPECTED_IDS union is complete,
//      and PENDING_IDS is exactly the set of not-yet-landed new ids (so a landed slice that forgets to
//      shrink the list goes red, and a lost lesson goes red);
//   5. the PROTECTED lessons (it-l1-2 data representation, it-l5-2 styling/interactivity) are present,
//      carry no mapping row, and still teach their own topic;
//   6. module placement per section, with the four host-lesson exceptions {12,18,19,20} each carrying a
//      written reason of at least 20 characters;
//   7. every new lesson is a real lesson with a recognised experiment.type, and every new lesson has
//      exactly ONE well-formed Play-tab set in lessonSets["information-technology"] whose vocabulary
//      the lesson itself teaches;
//   8. Slice 0's honest lab types: a lesson may declare code-playground only if its own description
//      describes writing code;
//   9. mirrors byte-identical, metadata.estimatedModules tracking the module count, and the two
//      question banks frozen (practice 100 / knowledge check 25) while the coverage build runs.
//
// Usage
//   node tools/check-information-technology-coverage.mjs                 # the real check
//   node tools/check-information-technology-coverage.mjs --self-test      # wiring self-test only
//   node tools/check-information-technology-coverage.mjs --red-control <name>
//   node tools/check-information-technology-coverage.mjs --red-controls-all
//
// A red control mutates the loaded state in memory and MUST make the check fail. In red-control mode
// the exit code is 0 when the mutation was caught and 1 when it slipped through — the control is part
// of the result.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const SUBJECT = "information-technology";
const DOC = `docs/${SUBJECT}-coverage.md`;
const MODULES = `content/${SUBJECT}/modules.json`;
const MIRROR = `public/${MODULES}`;

// ---------------------------------------------------------------------------------------------
// The owner's 61 chapters, verbatim (target-competitor-list.md). The doc's `chapter` column is
// compared against this, so a renamed chapter cannot quietly become the coverage claim.
export const CHAPTERS = [
  // 1-13 · SECTION 1 COMPUTER FUNDAMENTALS AND INFORMATION PROCESSING
  "Information Technology Concept", "Computer System Types", "Hardware Components and IPOS Cycle",
  "Cloud and Local Storage", "Input/Output Devices", "Software Types and Roles", "User Interface Types",
  "System Suitability and Specification", "Basic Hardware Troubleshooting", "Data and Information Distinction",
  "Online Information Reliability", "Data Validation and Verification", "File Organization",
  // 14-17 · SECTION 2 COMPUTER NETWORKS AND WEB TECHNOLOGIES
  "Network Types and Wireless Technologies", "Network Components and Functions", "Mobile Communication Importance",
  "Web Technologies",
  // 18-23 · SECTION 3 SOCIAL AND ECONOMIC IMPACT OF ICT
  "Computer Security and Misuse Concepts", "Impact of Computer Systems Misuse", "Countermeasures and Security Practices",
  "ICT and Employment", "Computer-Related Professions", "Societal and Economic Impact of ICT",
  // 24-35 · SECTION 4 WORD-PROCESSING AND WEB PAGE DESIGN
  "Document Creation and Content Integration", "Document Formatting Features",
  "Document Editing and Structural Organization", "Document Review Features", "Document Protection Features",
  "Table of Contents Generation", "Mail Merge Feature", "Fillable Electronic Forms",
  "Website Structure and Organization", "Simple Web Page Design", "Hyperlinks",
  "Website Evaluation and Publishing",
  // 36-44 · SECTION 5 SPREADSHEETS
  "Spreadsheet Purpose", "Spreadsheet Terminology", "Basic System Functions", "Advanced Arithmetic Formulae",
  "Formula Replication", "Column and Row Manipulation", "Data Manipulation", "Charting Operations",
  "Worksheet Management",
  // 45-48 · SECTION 6 DATABASE MANAGEMENT
  "Database Concepts", "Database Terminology and Data Types", "Database Creation and Structure",
  "Data Manipulation and Reporting",
  // 49-55 · SECTION 7 PROBLEM-SOLVING AND PROGRAM DESIGN
  "Problem-Solving Steps", "Divide-and-Conquer Approach", "Problem Components and IPO Chart",
  "Variables, Constants, and Data Types", "Algorithm Concepts and Characteristics",
  "Algorithm Representation: Flowcharts and Pseudocode", "Algorithm Testing and Trace Tables",
  // 56-61 · SECTION 8 PROGRAM IMPLEMENTATION
  "Programming Language Overview", "Program Implementation Steps", "Program Testing and Debugging",
  "Variables, Constants, and Data Types", "Algorithmic Statements Syntax", "Program Documentation",
];
export const SECTION_COUNTS = [13, 4, 6, 12, 9, 4, 7, 6];
// EXTEND 31 / REUSE 7: chapter #40 Formula Replication was upgraded REUSE -> EXTEND on the lead's
// decision (F1) — a clause about relative vs absolute referencing with no worked copy is not coverage.
export const DISP_TOTALS = { NEW: 23, EXTEND: 31, REUSE: 7 };

// The 12 frozen lessons: ids are identity, never renamed, re-keyed or split.
export const FROZEN = ["it-l1-1", "it-l1-2", "it-l2-1", "it-l2-2", "it-l3-1", "it-l3-2",
  "it-l4-1", "it-l4-2", "it-l5-1", "it-l5-2", "it-l6-1", "it-l6-2"];
// Every NEW id of the 23-row NEW set, whether landed or not.
export const NEW_IDS = [
  "fund-information-technology-concept", "fund-computer-system-types", "fund-cloud-and-local-storage",
  "fund-user-interface-types", "fund-system-suitability-and-specification",
  "fund-basic-hardware-troubleshooting", "fund-data-and-information-distinction",
  "fund-online-information-reliability", "fund-file-organisation",
  "net-mobile-communication-importance", "net-web-technologies",
  "imp-ict-and-employment", "imp-computer-related-professions", "imp-societal-and-economic-impact",
  "wp-document-protection-features", "wp-fillable-electronic-forms",
  "web-website-structure-and-organisation", "web-website-evaluation-and-publishing",
  "sheet-column-and-row-manipulation", "sheet-worksheet-management",
  "impl-programming-language-overview", "impl-variables-constants-and-data-types", "impl-program-documentation",
];
// Not landed yet: slices C and D. SHRINK this list as each slice merges — the harness fails if an
// id in here is found in modules.json (landed but still listed) or if a listed id is also expected
// somewhere else. It is derived from the doc's pending NEW rows, so the doc and this list must agree.
export const PENDING_IDS = [
  "net-mobile-communication-importance", "net-web-technologies",
  "imp-ict-and-employment", "imp-computer-related-professions", "imp-societal-and-economic-impact",
  "impl-programming-language-overview", "impl-variables-constants-and-data-types", "impl-program-documentation",
];
export const EXPECTED_IDS = [...FROZEN, ...NEW_IDS];
// No chapter in the list may claim these: they teach syllabus topics the owner's list does not name.
export const PROTECTED = {
  "it-l1-2": ["binary", "hexadecimal", "ascii", "byte"],
  "it-l5-2": ["css", "javascript", "styling"],
};
// Which module a section's chapters live in. Slice C creates it-mod-7.
export const ALLOWED_MODULES = {
  1: ["it-mod-1"], 2: ["it-mod-4"], 3: ["it-mod-7"], 4: ["it-mod-5", "it-mod-6"],
  5: ["it-mod-6"], 6: ["it-mod-3"], 7: ["it-mod-2"], 8: ["it-mod-2"],
};
// Chapters hosted outside their own section's module, by host-lesson ownership (audit M5).
export const EXCEPTIONS = {
  12: "it-mod-3", 18: "it-mod-4", 19: "it-mod-4", 20: "it-mod-4",
};
// Slice 0: the lab type each of the 12 pre-existing lessons actually describes.
export const HONEST_TYPES = {
  "it-l1-1": "drag-drop", "it-l1-2": "visual-converter", "it-l2-1": "flowchart-builder",
  "it-l2-2": "code-playground", "it-l3-1": "schema-designer", "it-l3-2": "drag-drop",
  "it-l4-1": "network-topology", "it-l4-2": "simulation", "it-l5-1": "code-playground",
  "it-l5-2": "web-builder", "it-l6-1": "simulation", "it-l6-2": "visual-converter",
};
// Slice A: the lessons this branch authored (9 NEW + the 3 EXTEND chapters' host).
export const SLICE_A_LESSONS = NEW_IDS.filter((id) => id.startsWith("fund-"));
// Slice B: the 6 NEW office-tool lessons and the two frozen hosts it grew in place.
export const SLICE_B_LESSONS = NEW_IDS.filter((id) => /^(wp|web|sheet)-/.test(id));
export const SLICE_B_HOSTS = ["it-l6-1", "it-l6-2"];
// The two hosts' original copy, so a rewrite cannot pass as an extension.
export const HOST_PREFIX = {
  "it-l6-1": "Word processing is more than just typing text",
  "it-l6-2": "Spreadsheets are powerful tools for organising",
};
export const HOST_CONCEPTS = {
  "it-l6-1": "Mail Merge|Table of Contents|Columns|Styles",
  "it-l6-2": "Absolute/Relative Referencing|IF/VLOOKUP Functions|Pivot Tables|Charts",
};

// ---------------------------------------------------------------------------------------------
// helpers (exported so the self-test can drive them directly)
export const fold = (s) => String(s ?? "").toLowerCase()
  .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
  .replace(/[\u2013\u2014\u2212]/g, "-")
  .replace(/\u2026/g, "...")
  .replace(/isation/g, "ization").replace(/isations/g, "izations")
  .replace(/ise\b/g, "ize").replace(/ised\b/g, "ized").replace(/ising\b/g, "izing")
  .replace(/yse\b/g, "yze").replace(/ysed\b/g, "yzed").replace(/ysing\b/g, "yzing")
  .replace(/\s+/g, " ").trim();

export const corpusOf = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \n "));
export const proseOf = (l) => fold([l.content, ...(l.objectives || [])].join(" \n "));

/** Parse the doc's 61-row conformance table. Keyed by (section, number) — never by name. */
export function parseDocRows(md) {
  const start = md.indexOf("## The 61-row conformance table");
  if (start < 0) return [];
  const rest = md.slice(start + 1);
  const end = rest.indexOf("\n## ");
  const block = end < 0 ? rest : rest.slice(0, end);
  const rows = [];
  for (const line of block.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 7) continue;
    if (!/^\d+$/.test(cells[0]) || !/^\d+$/.test(cells[1])) continue;
    rows.push({ s: Number(cells[0]), n: Number(cells[1]), chapter: cells[2], disp: cells[3],
      state: cells[4], id: cells[5], phrase: cells[6] });
  }
  return rows;
}

/** Parse the "hosted outside their own section's module" table: chapter -> written reason. */
export function parseExceptionReasons(md) {
  const start = md.indexOf("**Four chapters are hosted outside");
  if (start < 0) return {};
  const rest = md.slice(start);
  const end = rest.indexOf("\n## ");
  const block = end < 0 ? rest : rest.slice(0, end);
  const out = {};
  for (const line of block.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 3) continue;
    const m = /^#(\d+)$/.exec(cells[0]);
    if (!m) continue;
    out[Number(m[1])] = cells[2];
  }
  return out;
}

export const sectionOf = (n) => { let acc = 0; for (let i = 0; i < SECTION_COUNTS.length; i++) { acc += SECTION_COUNTS[i]; if (n <= acc) return i + 1; } return -1; };
export const sectionSizes = (rows) => SECTION_COUNTS.map((_, i) => rows.filter((r) => r.s === i + 1).length);

// ---------------------------------------------------------------------------------------------
// state: everything the checks read, loaded once and mutated by the red controls
function loadState() {
  const modulesText = read(MODULES);
  const loaderSrc = read("src/data/contentLoader.js");
  const typeStart = loaderSrc.indexOf("export const experimentTypes = {");
  const typeBlock = loaderSrc.slice(typeStart, loaderSrc.indexOf("\n};", typeStart));
  const experimentTypes = new Set([...typeBlock.matchAll(/^\s*"([a-z0-9-]+)":\s*\{\s*title:/gm)].map((m) => m[1]));
  const setsSource = read("src/components/lessonSets.js");
  return {
    modules: JSON.parse(modulesText),
    modulesText,
    mirrorText: read(MIRROR),
    meta: JSON.parse(read(`content/${SUBJECT}/metadata.json`)),
    practice: JSON.parse(read(`content/${SUBJECT}/practice.json`)),
    kc: JSON.parse(read(`content/${SUBJECT}/knowledge-check.json`)),
    doc: read(DOC),
    setsSource,
    sets: JSON.parse(JSON.stringify(lessonSets[SUBJECT])),
    experimentTypes,
    subjectKeys: Object.keys(lessonSets),
    pendingIds: PENDING_IDS.slice(),
  };
}

// ---------------------------------------------------------------------------------------------
export function runChecks(st) {
  let pass = 0;
  const failures = [];
  const check = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const section = (t) => failures.push(`\u0000== ${t}`);

  const rows = parseDocRows(st.doc);
  const lessons = st.modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
  const moduleOf = (id) => byId[id]?.module;

  // ---------------------------------------------------------------- 1. the doc is the owner's list
  section("1. the doc holds the owner's 61 chapters, verbatim, in order");
  check(rows.length === 61, `the conformance table has 61 rows (found ${rows.length})`);
  check(JSON.stringify(sectionSizes(rows)) === JSON.stringify(SECTION_COUNTS),
    `per-section chapter counts are ${SECTION_COUNTS.join("/")} (found ${sectionSizes(rows).join("/")})`);
  rows.forEach((r, i) => {
    check(r.n === i + 1, `row ${i + 1} is chapter ${i + 1} (found #${r.n})`);
    check(r.s === sectionOf(r.n), `chapter #${r.n} sits in section ${sectionOf(r.n)} (doc says ${r.s})`);
    check(r.chapter === CHAPTERS[r.n - 1], `chapter #${r.n} is the owner's name "${CHAPTERS[r.n - 1]}" (doc says "${r.chapter}")`);
  });
  const dispCount = (d) => rows.filter((r) => r.disp === d).length;
  for (const [d, n] of Object.entries(DISP_TOTALS))
    check(dispCount(d) === n, `${d} rows total ${n} (found ${dispCount(d)})`);
  check(rows.every((r) => ["NEW", "EXTEND", "REUSE"].includes(r.disp)), "every row's disp is NEW, EXTEND or REUSE");
  check(rows.every((r) => ["taught", "paraphrase", "pending"].includes(r.state)),
    "every row's state is taught, paraphrase or pending");
  check(rows.every((r) => r.id && r.id.length > 3), "every row names a lesson id");

  // ---------------------------------------------------------------- 2. identity is (section, number)
  section("2. chapters are keyed by (section, number), never by name");
  const pairs = rows.map((r) => `${r.s}:${r.n}`);
  check(new Set(pairs).size === pairs.length, "every (section, number) pair is unique");
  const r52 = rows.find((r) => r.n === 52), r59 = rows.find((r) => r.n === 59), r46 = rows.find((r) => r.n === 46);
  check(!!r52 && !!r59 && r52.chapter === r59.chapter,
    "#52 and #59 carry the SAME chapter name (conceptual vs syntactic)");
  check(!!r52 && !!r59 && r52.id !== r59.id, "#52 and #59 are two different lessons, not one");
  check(!!r46 && fold(r46.chapter).includes("data types") && r46.chapter !== r52?.chapter,
    "#46 carries \"Data Types\" a third time and is still its own chapter");

  // ---------------------------------------------------------------- 3. two-layer by-name coverage
  section("3. every taught chapter is taught BY NAME in its host lesson");
  for (const r of rows) {
    const l = byId[r.id];
    if (r.state === "pending") {
      if (r.disp === "NEW") {
        check(!l, `#${r.n} is marked pending but its lesson ${r.id} has landed — mark the row taught and shrink PENDING_IDS`);
        check(st.pendingIds.includes(r.id), `#${r.n} pending NEW id ${r.id} is listed in PENDING_IDS`);
      } else {
        check(!l || !corpusOf(l).includes(fold(r.chapter)),
          `#${r.n} is marked pending but ${r.id} already teaches "${r.chapter}" by name — mark the row taught`);
      }
      continue;
    }
    if (!l) { check(false, `#${r.n} is marked ${r.state} but ${r.id} does not exist`); continue; }
    check(r.phrase && r.phrase !== "-", `#${r.n} records an evidence phrase`);
    if (r.state === "taught") {
      check(corpusOf(l).includes(fold(r.chapter)),
        `#${r.n} "${r.chapter}" is taught by name in ${r.id}`);
    }
    check(corpusOf(l).includes(fold(r.phrase)),
      `#${r.n} evidence phrase "${r.phrase}" appears in ${r.id}'s own copy`);
    if (r.disp === "NEW" || r.disp === "EXTEND") {
      check(fold(r.phrase).includes(fold(r.chapter)),
        `#${r.n} (${r.disp}) evidence phrase names the chapter — a paraphrase is not proof for a ${r.disp} row`);
    }
    if (r.disp === "NEW") check(proseOf(l).includes(fold(r.phrase)),
      `#${r.n} (NEW) evidence phrase is in the lesson's content/objectives, not only in its concepts`);
    if (r.state === "paraphrase") check(r.disp === "REUSE",
      `#${r.n} is a paraphrase row, which is only allowed for REUSE (it is ${r.disp})`);
  }

  // ---------------------------------------------------------------- 4. frozen ids + the id union
  section("4. the 12 frozen lessons survive in order, and the id union is complete");
  const frozenInOrder = lessons.map((l) => l.id).filter((id) => FROZEN.includes(id));
  check(JSON.stringify(frozenInOrder) === JSON.stringify(FROZEN),
    `the 12 frozen ids keep their original relative order (got ${frozenInOrder.length})`);
  for (const id of FROZEN) check(!!byId[id], `frozen id ${id} is still present`);
  check(new Set(lessons.map((l) => l.id)).size === lessons.length, "no duplicate lesson id");
  check(lessons.every((l) => EXPECTED_IDS.includes(l.id)),
    `no lesson sits outside the expected union (stray: ${lessons.filter((l) => !EXPECTED_IDS.includes(l.id)).map((l) => l.id).join(", ") || "none"})`);
  const absent = EXPECTED_IDS.filter((id) => !byId[id]);
  check(JSON.stringify(absent.slice().sort()) === JSON.stringify(st.pendingIds.slice().sort()),
    `the ids that are absent are exactly PENDING_IDS (absent: ${absent.length}, pending: ${st.pendingIds.length})`);
  check(st.pendingIds.every((id) => NEW_IDS.includes(id)), "every pending id is one of the 23 NEW ids");
  check(JSON.stringify(st.pendingIds.slice().sort()) === JSON.stringify(PENDING_IDS.slice().sort()),
    "the harness's PENDING_IDS constant is the list the tree actually needs");
  const landedNew = NEW_IDS.filter((id) => !!byId[id]);
  check(lessons.length === FROZEN.length + landedNew.length,
    `the tree is 12 frozen + ${landedNew.length} landed new lessons = ${FROZEN.length + landedNew.length} (got ${lessons.length})`);
  for (const id of SLICE_A_LESSONS) check(!!byId[id], `Slice A lesson ${id} is present`);

  // ---------------------------------------------------------------- 5. protected lessons
  section("5. the protected lessons are untouched and unmapped");
  for (const [id, words] of Object.entries(PROTECTED)) {
    const l = byId[id];
    check(!!l, `protected lesson ${id} is present`);
    if (!l) continue;
    check(!rows.some((r) => r.id === id), `no chapter row maps to the protected lesson ${id}`);
    const hay = corpusOf(l);
    const missing = words.filter((w) => !hay.includes(w));
    check(missing.length === 0, `${id} still teaches its own topic (missing: ${missing.join(", ") || "none"})`);
    check(!!st.sets[id], `${id} still has its own Play-tab set`);
  }

  // ---------------------------------------------------------------- 6. module placement
  section("6. each section lives in its own module, with the four declared exceptions");
  for (const r of rows) {
    const mod = moduleOf(r.id);
    if (!mod) continue; // pending new lesson
    if (EXCEPTIONS[r.n]) {
      check(mod === EXCEPTIONS[r.n], `#${r.n} is an exception hosted in ${EXCEPTIONS[r.n]} (found ${mod})`);
      continue;
    }
    check(ALLOWED_MODULES[r.s].includes(mod),
      `#${r.n} sits in one of section ${r.s}'s modules (${ALLOWED_MODULES[r.s].join("/")}) — found ${mod}`);
  }
  const reasons = parseExceptionReasons(st.doc);
  check(JSON.stringify(Object.keys(reasons).map(Number).sort((a, b) => a - b)) ===
        JSON.stringify(Object.keys(EXCEPTIONS).map(Number).sort((a, b) => a - b)),
    `the doc declares exactly the four exceptions {${Object.keys(EXCEPTIONS).join(", ")}}`);
  for (const [n, reason] of Object.entries(reasons))
    check(typeof reason === "string" && reason.trim().length >= 20,
      `the exception for #${n} carries a written reason of at least 20 characters`);
  check(!st.modules.some((m) => m.id === "it-mod-7"),
    "it-mod-7 is NOT created here — it belongs to slice C");
  check(st.meta.estimatedModules === st.modules.length,
    `metadata.estimatedModules tracks the module count (${st.meta.estimatedModules} vs ${st.modules.length})`);

  // ---------------------------------------------------------------- 7. lesson shape
  section("7. every landed new lesson is a real lesson with a recognised lab type");
  for (const id of landedNew) {
    const l = byId[id];
    check(typeof l.title === "string" && l.title.length > 3, `${id} has a title`);
    check(typeof l.content === "string" && l.content.length > 900, `${id} has real content (${(l.content || "").length} chars)`);
    check(Array.isArray(l.objectives) && l.objectives.length >= 3, `${id} has at least 3 objectives`);
    check(Array.isArray(l.concepts) && l.concepts.length >= 5 && l.concepts.every((c) => typeof c === "string"),
      `${id} has >=5 concepts, all strings`);
    check(!!l.experiment && typeof l.experiment.type === "string", `${id} declares an experiment.type`);
    check(st.experimentTypes.has(l.experiment?.type),
      `${id}'s experiment.type "${l.experiment?.type}" is a key of experimentTypes`);
  }
  // the 3 EXTEND chapters are pure insertions: the original opening survives
  check(byId["it-l1-1"]?.content?.startsWith("A computer system consists of two main components: hardware and software."),
    "it-l1-1 still opens with its original teaching (the EXTEND was an insertion, not a rewrite)");
  check((byId["it-l1-1"]?.concepts || []).slice(0, 6).join("|") === "CPU|RAM|ROM|Input/Output Devices|Operating Systems|Utility Programs",
    "it-l1-1 keeps its original six concepts in order");
  for (const id of SLICE_B_LESSONS) check(!!byId[id], `Slice B lesson ${id} is present`);
  // Slice B: the two EXTEND hosts are pure insertions too — the old copy is still the prefix, and
  // every original concept is still in its original position at the front of the array.
  for (const id of SLICE_B_HOSTS) {
    const l = byId[id];
    check(!!l, `${id} (a Slice B host) is present`);
    check(!!l && l.content.startsWith(HOST_PREFIX[id]),
      `${id} still opens with its original teaching (the Slice B EXTEND was an insertion, not a rewrite)`);
    check((l?.concepts || []).slice(0, 4).join("|") === HOST_CONCEPTS[id],
      `${id} keeps its original four concepts, in order, at the front`);
    check((l?.concepts || []).length > 4, `${id} did gain the concepts its extension teaches`);
  }

  // ---------------------------------------------------------------- 7b. the three honesty gaps
  section("7b. Slice B closes the three pre-existing honesty gaps (F4/F5/F6)");
  const host61 = corpusOf(byId["it-l6-1"] || {}), host62 = corpusOf(byId["it-l6-2"] || {});
  for (const fn of ["min", "max", "count"])
    check(new RegExp(`(^|[^a-z])${fn}([^a-z]|$)`).test(host62),
      `it-l6-2 names ${fn.toUpperCase()} in its own copy, not only in the lab deck`);
  check(host62.includes("pivot table"),
    "it-l6-2 teaches pivot tables (it was already a host concept with no teaching)");
  check(host61.includes("headers and footers"),
    "it-l6-1 names headers and footers (they existed only as lab-deck pairs)");
  check(host61.includes("find and replace"),
    "it-l6-1 names find and replace (it existed only as a lab-deck pair)");

  // ---------------------------------------------------------------- 8. the Play-tab labs
  section("8. one well-formed Play-tab set per new lesson, in the single IT key");
  const setKeys = Object.keys(st.sets);
  check(setKeys.length === st.modules.flatMap((m) => m.lessons || []).length,
    `one set per lesson (${setKeys.length} sets for ${lessons.length} lessons)`);
  check(st.subjectKeys.filter((k) => k === SUBJECT).length === 1,
    "lessonSets has exactly one information-technology key");
  check(st.subjectKeys.length === 25, `lessonSets still has 25 subject keys (found ${st.subjectKeys.length})`);
  check((st.setsSource.match(/^  "information-technology": \{/gm) || []).length === 1,
    "the lessonSets source declares the IT block exactly once");
  for (const id of setKeys) check(!!byId[id], `lessonSets key ${id} is a real lesson id`);
  for (const id of FROZEN) check(!!st.sets[id], `the older lesson ${id} keeps its set`);
  for (const id of landedNew) {
    const s = st.sets[id];
    if (!s) { check(false, `${id} has a lessonSets entry`); continue; }
    check(typeof s.title === "string" && s.title.trim().length > 3, `${id}: set has a title`);
    check(typeof s.subtitle === "string" && s.subtitle.trim().length > 3, `${id}: set has a subtitle`);
    check(["match", "sort", "order"].includes(s.kind), `${id}: kind "${s.kind}" is one of match/sort/order`);
    if (s.kind === "match") {
      const pairs = s.pairs || [];
      check(pairs.length >= 4 && pairs.length <= 8, `${id}: ${pairs.length} match pairs (4-8)`);
      check(pairs.every((p) => p.id && p.target && p.label), `${id}: every pair has id + target + label`);
      check(new Set(pairs.map((p) => p.id)).size === pairs.length, `${id}: pair ids are unique`);
      check(new Set(pairs.map((p) => p.target)).size === pairs.length,
        `${id}: every match target is distinct (a duplicate is unanswerable)`);
    } else if (s.kind === "sort") {
      const cats = (s.categories || []).map((c) => c.id);
      const items = s.items || [];
      check(cats.length >= 2, `${id}: at least 2 sort categories`);
      check(new Set(cats).size === cats.length, `${id}: category ids are unique`);
      check(items.length >= 4, `${id}: at least 4 sort items (has ${items.length})`);
      check(cats.every((c) => items.some((i) => i.category === c)), `${id}: every category has at least one item`);
      check(items.every((i) => i.id && i.label && cats.includes(i.category)),
        `${id}: every item has a label and a declared category`);
      check(new Set(items.map((i) => i.id)).size === items.length, `${id}: item ids are unique`);
    } else {
      const items = s.items || [];
      check(items.length >= 4, `${id}: at least 4 order items (has ${items.length})`);
      const orders = items.map((i) => i.order).sort((a, b) => a - b);
      check(orders.every((o, i) => o === i + 1), `${id}: order values are 1..n with no gap (${orders.join(",")})`);
      check(items.every((i) => i.id && i.label), `${id}: every order item has id + label`);
    }
  }
  section("8b. every lab string is vocabulary the lesson itself teaches");
  for (const id of landedNew) {
    const s = st.sets[id], l = byId[id];
    if (!s || !l) continue;
    const hay = corpusOf(l);
    const strings = s.kind === "match" ? s.pairs.map((p) => p.label) : s.items.map((i) => i.label);
    const traced = strings.filter((str) => {
      const words = fold(str).split(/[^a-z0-9'-]+/).filter((w) => w.length >= 5);
      // A short label ("Data", "File", "Path") has no word long enough to sample: it traces as a whole.
      if (!words.length) return hay.includes(fold(str));
      return words.some((w) => hay.includes(w.slice(0, Math.max(5, w.length - 2))));
    });
    check(traced.length === strings.length,
      `${id}: all ${strings.length} lab strings trace to the lesson copy (${traced.length} traced)`);
  }

  // ---------------------------------------------------------------- 9. Slice 0 honesty
  section("9. Slice 0: the 12 existing lessons declare the lab type they describe");
  for (const [id, type] of Object.entries(HONEST_TYPES)) {
    const l = byId[id];
    check(!!l, `${id} exists`);
    check(l?.experiment?.type === type, `${id} declares ${type} (found ${l?.experiment?.type})`);
    if (l?.experiment?.type === "code-playground")
      check(/write and run|edit html code/i.test(l.experiment.description || ""),
        `${id} keeps code-playground only because its description describes writing code`);
  }
  const claimed = Object.values(HONEST_TYPES).filter((t) => t === "code-playground").length;
  check(claimed === 2, `exactly two lessons legitimately claim code-playground (${claimed})`);

  // ---------------------------------------------------------------- 10. mirrors + banks
  section("10. mirrors byte-identical, metadata honest, both banks frozen");
  check(st.modulesText === st.mirrorText, `${MODULES} is byte-identical to its public mirror`);
  check(st.practice.length === 100, `practice bank is still exactly 100 (${st.practice.length})`);
  check(st.kc.length === 25, `knowledge check is still exactly 25 (${st.kc.length})`);

  return { pass, failures };
}

// ---------------------------------------------------------------------------------------------
// red controls: each mutates the loaded state and MUST produce at least one failure
export const RED_CONTROLS = {
  "drop-lesson": (st) => { st.modules[0].lessons.pop(); },
  "rename-chapter": (st) => { st.doc = st.doc.replace("| 1 | 1 | Information Technology Concept |", "| 1 | 1 | IT Basics |"); },
  "drop-row": (st) => { st.doc = st.doc.replace(/\| 3 \| 18 \|[^\n]*\n/, ""); },
  "swap-rows": (st) => {
    const a = st.doc.indexOf("| 2 | 14 |"), b = st.doc.indexOf("| 2 | 15 |");
    const lineA = st.doc.slice(a, st.doc.indexOf("\n", a) + 1);
    const lineB = st.doc.slice(b, st.doc.indexOf("\n", b) + 1);
    st.doc = st.doc.replace(lineA, "\u0001").replace(lineB, lineA).replace("\u0001", lineB);
  },
  "wrong-section": (st) => { st.doc = st.doc.replace("| 4 | 34 | Hyperlinks |", "| 5 | 34 | Hyperlinks |"); },
  "drop-phrase": (st) => { st.doc = st.doc.replace("| fund-file-organisation | file organisation is how you arrange stored work |", "| fund-file-organisation | - |"); },
  "weak-phrase": (st) => { st.doc = st.doc.replace("| fund-cloud-and-local-storage | cloud and local storage are the two places |", "| fund-cloud-and-local-storage | two places your files can live |"); },
  "phrase-not-in-copy": (st) => { st.doc = st.doc.replace("| fund-user-interface-types | user interface types differ in how much the user has to remember and how much the machine shows |", "| fund-user-interface-types | user interface types differ in how much the user has to remember and how much the machine shows, honestly |"); },
  "pending-but-taught": (st) => { st.doc = st.doc.replace("| 1 | 1 | Information Technology Concept | NEW | taught |", "| 1 | 1 | Information Technology Concept | NEW | pending |"); },
  "pending-extend-taught": (st) => { st.doc = st.doc.replace("| 2 | 14 | Network Types and Wireless Technologies | EXTEND | pending |", "| 2 | 14 | Network Types and Wireless Technologies | EXTEND | taught |"); },
  "land-a-pending-id": (st) => { st.modules[0].lessons.push({ ...st.modules[0].lessons[2], id: "impl-program-documentation" }); },
  "unpend-without-landing": (st) => { st.pendingIds.pop(); },
  "drop-lesson-set": (st) => { delete st.sets["fund-computer-system-types"]; },
  "set-for-ghost": (st) => { st.sets["fund-ghost-lesson"] = JSON.parse(JSON.stringify(st.sets["fund-file-organisation"])); },
  "dup-target": (st) => { const s = st.sets["fund-information-technology-concept"]; s.pairs[1].target = s.pairs[0].target; },
  "bad-category": (st) => { st.sets["fund-computer-system-types"].items[0].category = "nope"; },
  "order-gap": (st) => { st.sets["fund-basic-hardware-troubleshooting"].items[2].order = 9; },
  "unrecognised-type": (st) => { st.modules[0].lessons[3].experiment.type = "not-a-lab-type"; },
  "revert-lab-type": (st) => { st.modules.flatMap((m) => m.lessons).find((l) => l.id === "it-l4-1").experiment.type = "code-playground"; },
  "thin-content": (st) => { st.modules[0].lessons[4].content = "Too short."; },
  "object-concept": (st) => { st.modules[0].lessons[5].concepts[0] = { term: "x", definition: "y" }; },
  "mirror-drift": (st) => { st.mirrorText = st.mirrorText + " "; },
  "second-it-key": (st) => { st.setsSource = st.setsSource.replace('  "information-technology": {', '  "information-technology": {\n  },\n  "information-technology": {'); },
  "rename-frozen-id": (st) => { st.modules[0].lessons[0].id = "it-l1-1-renamed"; },
  "estimated-modules": (st) => { st.meta.estimatedModules = 7; },
  "create-it-mod-7": (st) => { st.modules.push({ id: "it-mod-7", title: "Impact", lessons: [] }); },
  "bank-growth": (st) => { st.practice.push({ ...st.practice[0], id: "extra-q" }); },
  "drop-protected": (st) => { st.modules[4].lessons = st.modules[4].lessons.filter((l) => l.id !== "it-l5-2"); },
  "weak-exception-reason": (st) => { st.doc = st.doc.replace("| #12 | `it-l3-1` (`it-mod-3`) | `it-l3-1` already teaches field validation, so chapter 12 grows there instead of in a fundamentals lesson. |", "| #12 | `it-l3-1` (`it-mod-3`) | host. |"); },
  "invented-vocab": (st) => { st.sets["fund-file-organisation"].pairs[0].label = "Zettabyte"; },
  "slice-b-host-rewritten": (st) => {
    st.modules.find((m) => m.id === "it-mod-6").lessons[0].content = "Word processing is more than typing text.";
  },
  "slice-b-host-concepts-reordered": (st) => {
    const l = st.modules.find((m) => m.id === "it-mod-6").lessons[1];
    l.concepts = [l.concepts[1], l.concepts[0], ...l.concepts.slice(2)];
  },
  "drop-slice-b-set": (st) => { delete st.sets["sheet-worksheet-management"]; },
  "slice-b-gap-reopened": (st) => {
    const l = st.modules.find((m) => m.id === "it-mod-6").lessons[1];
    l.content = l.content.replace("MIN, MAX and COUNT", "a few functions");
  },
};

// ---------------------------------------------------------------------------------------------
// wiring self-test: the helpers themselves
function selfTest() {
  let pass = 0; const fail = [];
  const ok = (c, m) => { if (c) pass++; else fail.push(m); };
  ok(fold("File Organisation") === fold("File Organization"), "fold normalises -isation/-ization");
  ok(fold("analysing") === fold("analyzing"), "fold normalises -yse/-yze");
  ok(fold("Authorised") === fold("Authorized"), "fold normalises -ise/-ize");
  ok(fold("a \u2014 b") === fold("a - b"), "fold normalises dashes");
  ok(fold("it\u2019s") === fold("it's"), "fold normalises smart quotes");
  ok(fold("  A   B  ") === "a b", "fold collapses whitespace");
  ok(!fold("File Organization").includes(fold("File Organisation and Storage")),
    "fold does not make a longer phrase match a shorter one");
  ok(sectionOf(1) === 1 && sectionOf(13) === 1 && sectionOf(14) === 2 && sectionOf(17) === 2 &&
     sectionOf(18) === 3 && sectionOf(23) === 3 && sectionOf(24) === 4 && sectionOf(35) === 4 &&
     sectionOf(36) === 5 && sectionOf(44) === 5 && sectionOf(45) === 6 && sectionOf(48) === 6 &&
     sectionOf(49) === 7 && sectionOf(55) === 7 && sectionOf(56) === 8 && sectionOf(61) === 8,
    "sectionOf maps all eight section boundaries");
  ok(SECTION_COUNTS.reduce((a, b) => a + b, 0) === CHAPTERS.length, "SECTION_COUNTS sums to the chapter list length");
  ok(CHAPTERS.length === 61, "the owner's chapter list has 61 entries");
  ok(new Set(CHAPTERS.map(fold)).size === 60, "exactly one duplicated chapter name (#52/#59)");
  const sample = "| S | # | chapter | disp | state | lesson id | phrase |\n|---|---|---|---|---|---|---|\n| 1 | 1 | A | NEW | taught | x | y |\n";
  ok(parseDocRows("## The 61-row conformance table\n" + sample).length === 1, "parseDocRows reads a well-formed row");
  ok(parseDocRows(sample).length === 0, "parseDocRows ignores a table with no section heading");
  ok(parseDocRows("## The 61-row conformance table\n| 1 | 1 | A | NEW |\n").length === 0, "parseDocRows rejects a short row");
  ok(parseDocRows("## The 61-row conformance table\n| a | b | c | d | e | f | g |\n").length === 0, "parseDocRows rejects non-numeric numbers");
  ok(Object.keys(parseExceptionReasons("**Four chapters are hosted outside\n| #12 | m | a reason of twenty chars |\n")).length === 1,
    "parseExceptionReasons reads an exception row");
  ok(EXPECTED_IDS.length === 35, "EXPECTED_IDS is 12 frozen + 23 new = 35");
  ok(NEW_IDS.length === 23 && PENDING_IDS.length === 8, "23 new ids, 8 of them still pending (slices C and D)");
  ok(SLICE_A_LESSONS.length === 9 && SLICE_B_LESSONS.length === 6, "Slice A authored 9 lessons, Slice B 6");
  ok(SLICE_B_LESSONS.every((id) => !SLICE_A_LESSONS.includes(id)), "the slice lists are disjoint");
  ok(DISP_TOTALS.NEW + DISP_TOTALS.EXTEND + DISP_TOTALS.REUSE === CHAPTERS.length,
    "the disposition totals add up to the 61 chapters");
  ok(PENDING_IDS.every((id) => NEW_IDS.includes(id)), "PENDING_IDS is a subset of NEW_IDS");
  ok(Object.keys(RED_CONTROLS).length >= 20, `at least 20 red controls are wired (${Object.keys(RED_CONTROLS).length})`);
  ok(corpusOf({ title: "T", content: "C", objectives: ["O"], concepts: ["K"] }) === "t c o k",
    "corpusOf folds title, content, objectives and concepts together");
  ok(proseOf({ title: "T", content: "C", objectives: ["O"], concepts: ["K"] }) === "c o",
    "proseOf excludes the title and the concepts");
  return { pass, fail };
}

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.includes("--self-test")) {
  const { pass, fail } = selfTest();
  fail.forEach((f) => console.log("FAIL: " + f));
  console.log(`self-test: ${pass} passed, ${fail.length} failed`);
  process.exit(fail.length ? 1 : 0);
}
if (argv.includes("--red-control")) {
  const name = argv[argv.indexOf("--red-control") + 1];
  if (!RED_CONTROLS[name]) { console.log(`unknown red control: ${name}`); process.exit(2); }
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) { console.log(`RED CONTROL "${name}" WAS NOT CAUGHT — the check is blind to it`); process.exit(1); }
  console.log(`red control "${name}": caught with ${real.length} failure(s) — as expected`);
  real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}
if (argv.includes("--red-controls-all")) {
  let bad = 0;
  for (const name of Object.keys(RED_CONTROLS)) {
    const st = loadState();
    RED_CONTROLS[name](st);
    const { failures } = runChecks(st);
    const real = failures.filter((f) => !f.startsWith("\u0000"));
    if (!real.length) { bad++; console.log(`NOT CAUGHT: ${name}`); }
    else console.log(`caught (${real.length}): ${name} — ${real[0]}`);
  }
  console.log(`\n${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
  process.exit(bad ? 1 : 0);
}

const st = loadState();
const { pass, failures } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const real = failures.filter((f) => !f.startsWith("\u0000"));
console.log(`\n${pass} checks passed, ${real.length} failed · ${PENDING_IDS.length} new ids still pending (${PENDING_IDS.join(", ")})`);
process.exit(real.length ? 1 : 0);
