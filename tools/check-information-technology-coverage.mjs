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
//   node tools/check-information-technology-coverage.mjs                  # the real check AND all 56 red controls
//   node tools/check-information-technology-coverage.mjs --no-red-control # the real check only (the only opt-out)
//   node tools/check-information-technology-coverage.mjs --self-test      # wiring self-test only
//   node tools/check-information-technology-coverage.mjs --red-control <name>
//
// A red control mutates the loaded state in memory and MUST make the check fail — AND must fail with the
// assertion it exists for: RED_EXPECT pins each control to the failure text it is aimed at, because
// `real[0]` is only what got printed first, not what the control tests. A control that is not caught, has
// no pin, or is caught only by a different assertion is a red run. The suite (`tools/check-all.sh`) passes
// no arguments, so the default path is the one that enforces all of this.
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
// Not landed yet. EMPTY after Slice D — the last coverage slice. The harness fails if an id in here
// is found in modules.json (landed but still listed) or if a listed id is also expected somewhere
// else. It is derived from the doc's pending NEW rows, so the doc and this list must agree; with the
// list empty, a row left `pending` in the doc and a lesson that has landed go red in opposite
// directions, which is what keeps the two halves honest once nothing is outstanding.
export const PENDING_IDS = [];
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
// Slice C: the 5 NEW network/impact lessons and the two frozen hosts it grew in place.
export const SLICE_C_LESSONS = NEW_IDS.filter((id) => /^(net|imp)-/.test(id));
export const SLICE_C_HOSTS = ["it-l4-1", "it-l4-2"];
// The two hosts' original copy and their original concept arrays, so a rewrite or a re-order cannot
// pass as an insertion. The JOIN strings pin the exact seam: the original tail is immediately
// followed by the extension, so the old copy is still one unbroken prefix.
export const SLICE_C_HOST_PREFIX = {
  "it-l4-1": "A computer network is a group of two or more computers connected together to share resources",
  "it-l4-2": "As we become more connected, internet security and ethics become increasingly important.",
};
export const SLICE_C_HOST_JOIN = {
  "it-l4-1": "key topics in the CSEC IT exam.\n\nNetwork Types and Wireless Technologies is the second half",
  "it-l4-2": "safe, legal, and ethical.\n\nComputer Security and Misuse Concepts are the vocabulary",
};
export const SLICE_C_HOST_CONCEPTS = {
  "it-l4-1": "Star, Bus, Ring Topologies|Client-Server vs Peer-to-Peer|Wireless Networking",
  "it-l4-2": "Firewalls|Encryption|Phishing|Copyright/Piracy",
};
export const SLICE_C_HOST_OBJECTIVES = {
  "it-l4-1": "Differentiate between LAN, WAN, and MAN|Identify network topologies",
  "it-l4-2": "Identify security threats and protection methods|Understand ethical IT use",
};
// Slice C creates exactly ONE module. The two `net-` lessons are Section 2 chapters and grow the
// EXISTING it-mod-4 (2 -> 4); only the three `imp-` lessons are Section 3 and open it-mod-7 (0 -> 3).
export const IT_MOD_7 = {
  id: "it-mod-7",
  title: "Social/Economic Impact of ICT",
  lessons: ["imp-ict-and-employment", "imp-computer-related-professions", "imp-societal-and-economic-impact"],
};
export const NET_LESSONS = SLICE_C_LESSONS.filter((id) => id.startsWith("net-"));

// Slice D: the 3 NEW program-implementation lessons and the three frozen hosts it grew in place.
// THE HYPHEN MATTERS: `/^impl-/` must not be written `/^imp-/` — Slice C's `imp-` lessons would be
// swallowed whole and the slice would look 6 lessons long. It is the mirror of the C-brief trap.
export const SLICE_D_LESSONS = NEW_IDS.filter((id) => /^impl-/.test(id));
export const SLICE_D_HOSTS = ["it-l3-1", "it-l2-1", "it-l2-2"];
// The three hosts' original copy, so a rewrite cannot pass as an extension, and the exact seam the
// extension was appended at: the original tail is immediately followed by the extension, so the old
// copy is still one unbroken prefix.
export const SLICE_D_HOST_PREFIX = {
  "it-l3-1": "A database is a structured collection of related data.",
  "it-l2-1": "Problem-solving in IT involves analysing a task and developing a logical sequence of steps to solve it.",
  "it-l2-2": "Once an algorithm has been developed, it can be translated into a programming language that the computer can execute.",
};
export const SLICE_D_HOST_JOIN = {
  "it-l3-1": "design a simple schema for a given scenario.\n\nDatabase Concepts begin",
  "it-l2-1": "the foundation of computer programming.\n\nProblem-Solving Steps are the six stages",
  "it-l2-2": "is also an essential skill you will develop.\n\nVariables, Constants, and Data Types are the conceptual question",
};
// The hosts' original concept arrays. The lengths DIFFER (4, 5, 4) and are derived from the string,
// never hardcoded to one slice(0, 4) — that was Slice B's exact mistake and it reds on a correct build.
export const SLICE_D_HOST_CONCEPTS = {
  "it-l3-1": "Relational Database|Primary/Foreign Keys|Data Types|One-to-Many Relationships",
  "it-l2-1": "Logic Gates|Sequence|Selection|Iteration|Flowchart Symbols",
  "it-l2-2": "Data Types|Variables|Loops (For, While, Repeat)|Conditional Statements",
};
export const SLICE_D_HOST_OBJECTIVES = {
  "it-l3-1": "Define tables, fields, records, and primary keys|Understand relationships between tables",
  "it-l2-1": "Develop algorithms using pseudocode and flowcharts",
  "it-l2-2": "Implement code using variables, constants, and loops",
};
// Slice D creates NO module. Section 8's only allowed home is the EXISTING it-mod-2, so the three
// impl- lessons APPEND after it-l2-2 in chapter order (#56, #59, #61). estimatedModules stays 7.
export const IT_MOD_2 = {
  id: "it-mod-2",
  lessons: ["it-l2-1", "it-l2-2", "impl-programming-language-overview",
    "impl-variables-constants-and-data-types", "impl-program-documentation"],
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

// Red controls resolve their mutation target BY ID, never by array index: nine `fund-` lessons are appended
// to it-mod-1, so one inserted lesson silently re-aims every `modules[0].lessons[n]` control at a different
// lesson. A target that cannot be found throws, which the runner reports as BROKEN rather than as a pass.
const lessonById = (st, id) => {
  for (const m of st.modules) for (const l of m.lessons || []) if (l.id === id) return l;
  throw new Error(`no lesson ${id} in modules.json`);
};
const moduleOfLesson = (st, id) => {
  const m = st.modules.find((x) => (x.lessons || []).some((l) => l.id === id));
  if (!m) throw new Error(`no module holds lesson ${id}`);
  return m;
};
// A control that mutates a `match` set's pairs must say so: if the set's kind ever changes, the control
// throws and reports BROKEN instead of mutating a field that no longer exists and passing quietly.
const setOf = (st, id, kind) => {
  const s = st.sets[id];
  if (!s) throw new Error(`no lessonSets entry for ${id}`);
  if (s.kind !== kind) throw new Error(`${id} is a "${s.kind}" set, but this control needs a "${kind}" one`);
  return s;
};

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
  // Slice C creates it-mod-7 — exactly one, with the three imp- lessons in doc order. The two net-
  // lessons do NOT live here: they are Section 2 chapters and grow the existing it-mod-4.
  const mod7 = st.modules.filter((m) => m.id === IT_MOD_7.id);
  check(mod7.length === 1, `exactly one ${IT_MOD_7.id} module exists (found ${mod7.length})`);
  check(mod7[0]?.title === IT_MOD_7.title,
    `${IT_MOD_7.id} is titled "${IT_MOD_7.title}" (found "${mod7[0]?.title}")`);
  check(JSON.stringify((mod7[0]?.lessons || []).map((l) => l.id)) === JSON.stringify(IT_MOD_7.lessons),
    `${IT_MOD_7.id} holds exactly the three imp- lessons, in doc order`);
  for (const id of NET_LESSONS) {
    const host = st.modules.find((m) => (m.lessons || []).some((l) => l.id === id));
    check(host?.id === "it-mod-4",
      `${id} is appended to the EXISTING it-mod-4 Networking & Internet, not to the new module (found ${host?.id})`);
  }
  check(st.modules.length === 7, `the tree has 7 modules (found ${st.modules.length})`);
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

  // ---------------------------------------------------------------- 7c. Slice C pure insertions
  section("7c. Slice C grew its two hosts by insertion only, and landed its 5 new lessons");
  for (const id of SLICE_C_LESSONS) check(!!byId[id], `Slice C lesson ${id} is present`);
  for (const id of SLICE_C_HOSTS) {
    const l = byId[id];
    check(!!l, `${id} (a Slice C host) is present`);
    // the original opening is still the prefix
    check(!!l && l.content.startsWith(SLICE_C_HOST_PREFIX[id]),
      `${id} still opens with its original teaching (the Slice C EXTEND was an insertion, not a rewrite)`);
    // the original tail is immediately followed by the extension: one unbroken old prefix
    check(!!l && l.content.includes(SLICE_C_HOST_JOIN[id]),
      `${id} keeps its original closing sentence, with the extension appended directly after it`);
    // every original concept, in its original position, at the front
    check((l?.concepts || []).slice(0, SLICE_C_HOST_CONCEPTS[id].split("|").length).join("|") === SLICE_C_HOST_CONCEPTS[id],
      `${id} keeps its original concepts, in order, at the front`);
    check((l?.concepts || []).length > SLICE_C_HOST_CONCEPTS[id].split("|").length,
      `${id} did gain the concepts its extension teaches`);
    // the original objectives are still the prefix of the objective list
    check((l?.objectives || []).slice(0, SLICE_C_HOST_OBJECTIVES[id].split("|").length).join("|") === SLICE_C_HOST_OBJECTIVES[id],
      `${id} keeps its original objectives, in order, at the front`);
    check(l?.experiment?.type === HONEST_TYPES[id], `${id} keeps the honest lab type Slice 0 gave it`);
  }

  // ---------------------------------------------------------------- 7d. Slice D pure insertions
  section("7d. Slice D grew its three hosts by insertion only, and created no module");
  for (const id of SLICE_D_LESSONS) check(!!byId[id], `Slice D lesson ${id} is present`);
  check(SLICE_D_LESSONS.length === 3, `Slice D authored exactly 3 lessons (found ${SLICE_D_LESSONS.length})`);
  for (const id of SLICE_D_HOSTS) {
    const l = byId[id];
    check(!!l, `${id} (a Slice D host) is present`);
    // the original opening is still the prefix
    check(!!l && l.content.startsWith(SLICE_D_HOST_PREFIX[id]),
      `${id} still opens with its original teaching (the Slice D EXTEND was an insertion, not a rewrite)`);
    // the original tail is immediately followed by the extension: one unbroken old prefix
    check(!!l && l.content.includes(SLICE_D_HOST_JOIN[id]),
      `${id} keeps its original closing sentence, with the extension appended directly after it`);
    // every original concept, in its original position, at the front — the LENGTH IS PER HOST (4, 5, 4)
    const n = SLICE_D_HOST_CONCEPTS[id].split("|").length;
    check((l?.concepts || []).slice(0, n).join("|") === SLICE_D_HOST_CONCEPTS[id],
      `${id} keeps its original ${n} concepts, in order, at the front`);
    check((l?.concepts || []).length > n, `${id} did gain the concepts its extension teaches`);
    check((l?.objectives || []).slice(0, SLICE_D_HOST_OBJECTIVES[id].split("|").length).join("|") === SLICE_D_HOST_OBJECTIVES[id],
      `${id} keeps its original objectives, in order, at the front`);
    check(l?.experiment?.type === HONEST_TYPES[id], `${id} keeps the honest lab type Slice 0 gave it`);
  }
  // no new module: Slice D appends to the EXISTING it-mod-2, in chapter order
  check(!st.modules.some((m) => m.id === "it-mod-8"),
    "Slice D creates no module — there is no it-mod-8 (section 8's only home is it-mod-2)");
  const mod2s = st.modules.filter((m) => m.id === IT_MOD_2.id);
  check(mod2s.length === 1, `exactly one ${IT_MOD_2.id} module exists (found ${mod2s.length})`);
  check(JSON.stringify((mod2s[0]?.lessons || []).map((l) => l.id)) === JSON.stringify(IT_MOD_2.lessons),
    `${IT_MOD_2.id} holds it-l2-1, it-l2-2 then the 3 impl- lessons in chapter order #56/#59/#61 (found ${(mod2s[0]?.lessons || []).map((l) => l.id).join(",")})`);

  // ---------------------------------------------------------------- 7e. Slice D closes five lab-deck gaps
  // Every one of these facts was taught by a frozen lab deck or a bank question while the lesson's own
  // copy never said it. Slice D closes them by TEACHING, never by editing the deck or the bank.
  // proseOf, NOT corpusOf: several of these words are also concept NAMES ("Modulus", "Subprogram",
  // "Assignment Statement"), and a concept label is a keyword, not teaching. The pin must read prose.
  section("7e. Slice D closes the five lab-deck gaps by teaching them");
  const d211 = proseOf(byId["it-l2-1"] || {});
  const d212 = proseOf(byId["it-l2-2"] || {});
  const d311 = proseOf(byId["it-l3-1"] || {});
  check(/(^|[^a-z])modulus([^a-z]|$)/.test(d212),
    "it-l2-2 teaches MODULUS in its prose (the deck's pair pc5 tested it with no teaching)");
  check(d211.includes("parallelogram"),
    "it-l2-1 names the PARALLELOGRAM flowchart symbol (the deck's pair al4 tested it with no teaching)");
  check(d211.includes("arrow"),
    "it-l2-1 names the ARROW, the direction of flow (the deck's pair al5 tested it with no teaching)");
  check(d311.includes("a form is") && d311.includes("a report presents"),
    "it-l3-1 teaches FORM and REPORT as database objects (bank p100/p99 tested them with no teaching)");
  check(d212.includes("subprogram") && /(^|[^a-z])function([^a-z]|$)/.test(d212),
    "it-l2-2 teaches a function and a subprogram (bank p59 tested it with no teaching)");
  check(d212.includes("assignment"),
    "it-l2-2 teaches the assignment statement (bank p58 tested it with no teaching)");
  check(d212.includes("plus, minus, multiply, divide and modulus"),
    "it-l2-2 names the arithmetic operators (bank p57 tested them with no teaching)");

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
// red controls: each mutates the loaded state and MUST produce the failure RED_EXPECT pins it to.
export const RED_CONTROLS = {
  "drop-lesson": (st) => {
    const m = moduleOfLesson(st, "fund-file-organisation");
    m.lessons = m.lessons.filter((l) => l.id !== "fund-file-organisation");
  },
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
  "pending-extend-taught": (st) => { st.doc = st.doc.replace("| 6 | 45 | Database Concepts | EXTEND | taught |", "| 6 | 45 | Database Concepts | EXTEND | pending |"); },
  "land-a-ghost-id": (st) => {
    const m = moduleOfLesson(st, "fund-computer-system-types");
    m.lessons.push({ ...lessonById(st, "fund-computer-system-types"), id: "impl-ghost-lesson" });
  },
  "pend-a-landed-id": (st) => { st.pendingIds.push("impl-program-documentation"); },
  "drop-lesson-set": (st) => { delete st.sets["fund-computer-system-types"]; },
  "set-for-ghost": (st) => { st.sets["fund-ghost-lesson"] = JSON.parse(JSON.stringify(st.sets["fund-file-organisation"])); },
  "dup-target": (st) => { const s = setOf(st, "fund-information-technology-concept", "match"); s.pairs[1].target = s.pairs[0].target; },
  "bad-category": (st) => { setOf(st, "fund-computer-system-types", "sort").items[0].category = "nope"; },
  "order-gap": (st) => { setOf(st, "fund-basic-hardware-troubleshooting", "order").items[2].order = 9; },
  "unrecognised-type": (st) => { lessonById(st, "fund-computer-system-types").experiment.type = "not-a-lab-type"; },
  "revert-lab-type": (st) => { lessonById(st, "it-l4-1").experiment.type = "code-playground"; },
  "thin-content": (st) => { lessonById(st, "fund-cloud-and-local-storage").content = "Too short."; },
  "object-concept": (st) => { lessonById(st, "fund-user-interface-types").concepts[0] = { term: "x", definition: "y" }; },
  "mirror-drift": (st) => { st.mirrorText = st.mirrorText + " "; },
  "second-it-key": (st) => { st.setsSource = st.setsSource.replace('  "information-technology": {', '  "information-technology": {\n  },\n  "information-technology": {'); },
  "rename-frozen-id": (st) => { lessonById(st, "it-l1-1").id = "it-l1-1-renamed"; },
  "estimated-modules": (st) => { st.meta.estimatedModules = 6; },
  "drop-it-mod-7": (st) => { st.modules = st.modules.filter((m) => m.id !== "it-mod-7"); },
  "it-mod-7-retitled": (st) => { st.modules.find((m) => m.id === "it-mod-7").title = "Impact"; },
  "it-mod-7-short": (st) => { st.modules.find((m) => m.id === "it-mod-7").lessons.pop(); },
  "net-lesson-in-new-module": (st) => {
    const src = st.modules.find((m) => m.id === "it-mod-4");
    const moved = src.lessons.pop();
    st.modules.find((m) => m.id === "it-mod-7").lessons.push(moved);
  },
  "slice-c-host-rewritten": (st) => {
    const l = lessonById(st, "it-l4-1");
    l.content = "A network connects computers. " + l.content.slice(400);
  },
  // The JOIN SEAM, not the evidence phrase: dropping one comma leaves both the chapter name and the
  // evidence phrase intact, so only §7c's "the old copy is still one unbroken prefix" can catch this.
  // Before this fix the control edited the evidence phrase and was caught by §3 instead — it looked aimed
  // at the join and tested something else.
  "slice-c-host-join-broken": (st) => {
    const l = lessonById(st, "it-l4-2");
    const join = SLICE_C_HOST_JOIN["it-l4-2"];
    l.content = l.content.replace(join, join.replace("safe, legal, and ethical.", "safe, legal and ethical."));
  },
  "slice-c-host-concepts-reordered": (st) => {
    const l = lessonById(st, "it-l4-2");
    l.concepts = [l.concepts[1], l.concepts[0], ...l.concepts.slice(2)];
  },
  "slice-c-host-objectives-reordered": (st) => {
    const l = lessonById(st, "it-l4-1");
    l.objectives = [l.objectives[1], l.objectives[0], ...l.objectives.slice(2)];
  },
  "drop-slice-c-set": (st) => { delete st.sets["net-web-technologies"]; },
  "slice-c-invented-vocab": (st) => { setOf(st, "imp-computer-related-professions", "match").pairs[0].label = "Quantum sommelier"; },
  "slice-c-set-on-wrong-lesson": (st) => {
    st.sets["imp-ict-and-employment"] = JSON.parse(JSON.stringify(st.sets["net-web-technologies"]));
  },
  "bank-growth": (st) => { st.practice.push({ ...st.practice[0], id: "extra-q" }); },
  "drop-protected": (st) => {
    const m = moduleOfLesson(st, "it-l5-2");
    m.lessons = m.lessons.filter((l) => l.id !== "it-l5-2");
  },
  "weak-exception-reason": (st) => { st.doc = st.doc.replace("| #12 | `it-l3-1` (`it-mod-3`) | `it-l3-1` already teaches field validation, so chapter 12 grows there instead of in a fundamentals lesson. |", "| #12 | `it-l3-1` (`it-mod-3`) | host. |"); },
  "invented-vocab": (st) => { setOf(st, "fund-file-organisation", "match").pairs[0].label = "Zettabyte"; },
  "slice-b-host-rewritten": (st) => {
    lessonById(st, "it-l6-1").content = "Word processing is more than typing text.";
  },
  "slice-b-host-concepts-reordered": (st) => {
    const l = lessonById(st, "it-l6-2");
    l.concepts = [l.concepts[1], l.concepts[0], ...l.concepts.slice(2)];
  },
  "drop-slice-b-set": (st) => { delete st.sets["sheet-worksheet-management"]; },
  "slice-b-gap-reopened": (st) => {
    const l = lessonById(st, "it-l6-2");
    l.content = l.content.replace("MIN, MAX and COUNT", "a few functions");
  },
  // ---- Slice D -------------------------------------------------------------------------------
  // FIX 1's own control: the #51 sentence must keep the chapter name CONTIGUOUS. "and the IPO
  // chart" folds to `problem components and the ipo chart`, which does not contain the required
  // `problem components and ipo chart` — the defect the checkpoint shipped and this slice fixed.
  "chapter-51-wording-drift": (st) => {
    const l = lessonById(st, "it-l2-1");
    l.content = l.content.replace("Problem Components and IPO Chart name the inputs",
      "Problem Components and the IPO chart name the inputs");
  },
  "slice-d-host-rewritten": (st) => {
    const l = lessonById(st, "it-l2-1");
    l.content = "Problem solving is a useful skill. " + l.content.slice(120);
  },
  "slice-d-host-join-broken": (st) => {
    const l = lessonById(st, "it-l3-1");
    l.content = l.content.replace("scenario.\n\nDatabase Concepts begin", "scenario.\n\nThe database concepts begin");
  },
  "slice-d-host-concepts-reordered": (st) => {
    const l = lessonById(st, "it-l2-2");
    l.concepts = [l.concepts[1], l.concepts[0], ...l.concepts.slice(2)];
  },
  "slice-d-gap-reopened": (st) => {
    const l = lessonById(st, "it-l2-2");
    // remove EVERY mention from the prose: a single surviving "modulus" would keep the pin green
    l.content = l.content.replace(
      "multiply, divide and modulus, and modulus gives the remainder after a division, so 17 modulus 5 is 2.",
      "multiply and divide, and the remainder is taken after a division.");
  },
  "it-mod-2-reordered": (st) => {
    const m = st.modules.find((x) => x.id === "it-mod-2");
    m.lessons = [m.lessons[0], m.lessons[1], m.lessons[4], m.lessons[2], m.lessons[3]];
  },
  "it-mod-8-created": (st) => {
    const m = st.modules.find((x) => x.id === "it-mod-2");
    const moved = m.lessons.splice(2);
    st.modules.push({ id: "it-mod-8", title: "Program Implementation", lessons: moved });
  },
  // ---- the rules the audit found with NO control at all --------------------------------------
  // §4: "every pending id is one of the 23 NEW ids". A frozen id pushed into the pending list is absent
  // from the tree by construction, so every other §4 assertion still balances and only this one can fire.
  "non-new-pending-id": (st) => { st.pendingIds.push("it-l1-1"); },
  // §3: "pending NEW id is listed in PENDING_IDS" (354). Marking a row pending AND deleting its lesson
  // satisfies the OTHER half of the pair (353, "marked pending but its lesson has landed"), so the only
  // assertion left able to catch this is 354 itself.
  "pending-id-not-listed": (st) => {
    st.doc = st.doc.replace("| 1 | 1 | Information Technology Concept | NEW | taught |",
      "| 1 | 1 | Information Technology Concept | NEW | pending |");
    const m = moduleOfLesson(st, "fund-information-technology-concept");
    m.lessons = m.lessons.filter((l) => l.id !== "fund-information-technology-concept");
  },
  // §2: chapters are keyed by (section, number) — nothing in the file mutated these three facts.
  "dup-section-number": (st) => {
    st.doc = st.doc.replace("| 2 | 15 | Network Components and Functions |", "| 2 | 14 | Network Components and Functions |");
  },
  // §2: #52 and #59 are two lessons that share a chapter name — give #59 #52's id and a different name
  // and both halves of the pair break.
  "rows-52-59-merged": (st) => {
    st.doc = st.doc.replace(
      "| 8 | 59 | Variables, Constants, and Data Types | NEW | taught | impl-variables-constants-and-data-types |",
      "| 8 | 59 | Variables, Constants, and Data Types (syntactic) | NEW | taught | it-l2-2 |");
  },
  // §2: #46 carries "Data Types" a third time and is still its own chapter — merge it into #52's name.
  "row46-data-types-merged": (st) => {
    st.doc = st.doc.replace("| 6 | 46 | Database Terminology and Data Types |", "| 6 | 46 | Variables, Constants, and Data Types |");
  },
};

// ---------------------------------------------------------------------------------------------
// What each control must be caught BY. `real[0]` is only the first failure printed, not the assertion a
// control exists for: without a pin a control is "caught" by any failure at all, including one from a
// different rule that the same mutation happens to trip. Every pin below is copied from a real run of
// that control, not from a report — `includes()` is a substring test, so it must match the shipped text.
// Counts are left out of a pin where the count would drift with content (the assertion wording is the
// stable part).
export const RED_EXPECT = {
  // §3's "marked taught but its lesson does not exist" — the dropped lesson's own chapter row.
  "drop-lesson": ["#13 is marked taught but fund-file-organisation does not exist"],
  // §1's chapter-name assertion, not §3's by-name test it also trips.
  "rename-chapter": ['chapter #1 is the owner\'s name "Information Technology Concept"'],
  // §1's row count, not the 45 row-numbering failures it also causes.
  "drop-row": ["the conformance table has 61 rows (found 60)"],
  // §1's `r.n === i + 1`: a swap leaves the count at 61 and every name intact.
  "swap-rows": ["row 14 is chapter 14 (found #15)"],
  // §1's `sectionOf`, NOT the per-section counts (13/4/6/11/10/…) that are the side-effect.
  "wrong-section": ["chapter #34 sits in section 4 (doc says 5)"],
  "drop-phrase": ["#13 records an evidence phrase"],
  "weak-phrase": ["#4 (NEW) evidence phrase names the chapter"],
  "phrase-not-in-copy": ["appears in fund-user-interface-types's own copy"],
  "pending-but-taught": ["#1 is marked pending but its lesson fund-information-technology-concept has landed"],
  "pending-extend-taught": ["#45 is marked pending but it-l3-1 already teaches"],
  // §4's stray-id assertion — the lesson-count and set-count failures are the side-effect.
  "land-a-ghost-id": ["no lesson sits outside the expected union (stray: impl-ghost-lesson)"],
  "pend-a-landed-id": ["the ids that are absent are exactly PENDING_IDS (absent: 0, pending: 1)"],
  // §8's missing per-lesson set (582), not the "one set per lesson" count above it.
  "drop-lesson-set": ["fund-computer-system-types has a lessonSets entry"],
  // §8's ghost-key assertion (578), not the set count.
  "set-for-ghost": ["lessonSets key fund-ghost-lesson is a real lesson id"],
  "dup-target": ["every match target is distinct"],
  "bad-category": ["every item has a label and a declared category"],
  "order-gap": ["order values are 1..n with no gap"],
  "unrecognised-type": ["is a key of experimentTypes"],
  // §9's honest lab type (632), not the code-playground description clause it also trips.
  "revert-lab-type": ["it-l4-1 declares network-topology"],
  // §7's content-length floor (453).
  "thin-content": ["fund-cloud-and-local-storage has real content"],
  // §7's concepts-all-strings (455).
  "object-concept": ["fund-user-interface-types has >=5 concepts, all strings"],
  "mirror-drift": ["is byte-identical to its public mirror"],
  "second-it-key": ["the lessonSets source declares the IT block exactly once"],
  // §4's frozen relative order (382) — 12 minus the one renamed id.
  "rename-frozen-id": ["the 12 frozen ids keep their original relative order (got 11)"],
  "estimated-modules": ["metadata.estimatedModules tracks the module count (6 vs 7)"],
  // §6's "exactly one it-mod-7" (434), not the 15 failures it drags with it.
  "drop-it-mod-7": ["exactly one it-mod-7 module exists (found 0)"],
  "it-mod-7-retitled": ["it-mod-7 is titled"],
  // §6's it-mod-7 lesson list (437).
  "it-mod-7-short": ["it-mod-7 holds exactly the three imp- lessons, in doc order"],
  // §6's it-mod-4 host assertion (441).
  "net-lesson-in-new-module": ["net-web-technologies is appended to the EXISTING it-mod-4"],
  // §7's prefix assertion (472).
  "slice-c-host-rewritten": ["it-l4-1 still opens with its original teaching"],
  // §7c's join seam (489) — the one assertion this control can reach now that it edits the seam.
  "slice-c-host-join-broken": ["it-l4-2 keeps its original closing sentence"],
  "slice-c-host-concepts-reordered": ["it-l4-2 keeps its original concepts, in order, at the front"],
  "slice-c-host-objectives-reordered": ["it-l4-1 keeps its original objectives, in order, at the front"],
  "drop-slice-c-set": ["net-web-technologies has a lessonSets entry"],
  // §8b's vocabulary trace for one lesson. Count-free: "all N lab strings … (M traced)" would drift
  // with the set's size, and the lesson id already names the assertion.
  "slice-c-invented-vocab": ["imp-computer-related-professions: all"],
  "slice-c-set-on-wrong-lesson": ["imp-ict-and-employment: all"],
  "bank-growth": ["practice bank is still exactly 100"],
  "drop-protected": ["protected lesson it-l5-2 is present"],
  "weak-exception-reason": ["the exception for #12 carries a written reason of at least 20 characters"],
  "invented-vocab": ["fund-file-organisation: all"],
  // §7's prefix assertion for a Slice B host (472).
  "slice-b-host-rewritten": ["it-l6-1 still opens with its original teaching"],
  "slice-b-host-concepts-reordered": ["it-l6-2 keeps its original four concepts, in order, at the front"],
  "drop-slice-b-set": ["sheet-worksheet-management has a lessonSets entry"],
  "slice-b-gap-reopened": ["it-l6-2 names MIN in its own copy"],
  "chapter-51-wording-drift": ['#51 "Problem Components and IPO Chart" is taught by name in it-l2-1'],
  "slice-d-host-rewritten": ["it-l2-1 still opens with its original teaching"],
  "slice-d-host-join-broken": ["it-l3-1 keeps its original closing sentence"],
  "slice-d-host-concepts-reordered": ["it-l2-2 keeps its original 4 concepts"],
  "slice-d-gap-reopened": ["it-l2-2 teaches MODULUS in its prose"],
  "it-mod-2-reordered": ["it-mod-2 holds it-l2-1, it-l2-2 then the 3 impl- lessons"],
  // §7d's "there is no it-mod-8" (525), not the §6 placement failures that follow it.
  "it-mod-8-created": ["Slice D creates no module — there is no it-mod-8"],
  // ---- the five controls added for the rules that had none ------------------------------------
  "non-new-pending-id": ["every pending id is one of the 23 NEW ids"],
  "pending-id-not-listed": ["is listed in PENDING_IDS"],
  "dup-section-number": ["every (section, number) pair is unique"],
  "rows-52-59-merged": ["#52 and #59 carry the SAME chapter name", "#52 and #59 are two different lessons, not one"],
  "row46-data-types-merged": ['#46 carries "Data Types" a third time and is still its own chapter'],
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
  ok(NEW_IDS.length === 23 && PENDING_IDS.length === 0, "23 new ids, none still pending");
  ok(SLICE_A_LESSONS.length === 9 && SLICE_B_LESSONS.length === 6, "Slice A authored 9 lessons, Slice B 6");
  ok(SLICE_C_LESSONS.length === 5 && NET_LESSONS.length === 2,
    "Slice C authored 5 lessons: 2 net- + 3 imp-");
  ok(SLICE_D_LESSONS.length === 3 && SLICE_D_LESSONS.every((id) => id.startsWith("impl-")),
    `Slice D authored 3 impl- lessons (got ${SLICE_D_LESSONS.join(", ")})`);
  ok(SLICE_D_LESSONS.every((id) => !SLICE_A_LESSONS.includes(id) && !SLICE_B_LESSONS.includes(id) &&
    !SLICE_C_LESSONS.includes(id)),
    "the four slice lists are disjoint — /^impl-/ did not swallow Slice C's imp- lessons");
  ok(SLICE_C_LESSONS.every((id) => !/^impl-/.test(id)),
    "no Slice C imp- lesson is reported as a Slice D impl- lesson");
  ok(SLICE_D_HOSTS.length === 3 && SLICE_D_HOSTS.every((id) => FROZEN.includes(id)),
    "Slice D's three hosts are all frozen ids");
  ok(Object.values(SLICE_D_HOST_CONCEPTS).map((s) => s.split("|").length).join(",") === "4,5,4",
    "the three Slice D host concept prefixes are 4, 5 and 4 long — never one hardcoded slice(0, 4)");
  ok(IT_MOD_2.lessons.length === 5 && IT_MOD_2.lessons.slice(0, 2).join(",") === "it-l2-1,it-l2-2" &&
    IT_MOD_2.lessons.slice(2).every((id) => SLICE_D_LESSONS.includes(id)),
    "it-mod-2 keeps its 2 frozen lessons first, then the 3 impl- lessons in chapter order");
  ok(IT_MOD_7.lessons.length === 3 && IT_MOD_7.lessons.every((id) => SLICE_C_LESSONS.includes(id)),
    "the new module holds the three imp- lessons, all of them Slice C lessons");
  ok(!NET_LESSONS.some((id) => IT_MOD_7.lessons.includes(id)),
    "the two net- lessons are NOT in the new module (Section 2 lives in it-mod-4)");
  ok(SLICE_C_LESSONS.every((id) => !SLICE_A_LESSONS.includes(id) && !SLICE_B_LESSONS.includes(id)),
    "the three slice lists are disjoint");
  ok(PENDING_IDS.every((id) => !SLICE_C_LESSONS.includes(id)),
    "no Slice C lesson is still listed as pending");
  ok(SLICE_B_LESSONS.every((id) => !SLICE_A_LESSONS.includes(id)), "the slice lists are disjoint");
  ok(DISP_TOTALS.NEW + DISP_TOTALS.EXTEND + DISP_TOTALS.REUSE === CHAPTERS.length,
    "the disposition totals add up to the 61 chapters");
  ok(PENDING_IDS.every((id) => NEW_IDS.includes(id)), "PENDING_IDS is a subset of NEW_IDS");
  ok(Object.keys(RED_CONTROLS).length === 56, `exactly 56 red controls are wired (${Object.keys(RED_CONTROLS).length})`);
  ok(JSON.stringify(Object.keys(RED_CONTROLS).sort()) === JSON.stringify(Object.keys(RED_EXPECT).sort()),
    `RED_CONTROLS and RED_EXPECT name the same set (unpinned: ${Object.keys(RED_CONTROLS).filter((n) => !RED_EXPECT[n]).join(", ") || "none"}; stale pins: ${Object.keys(RED_EXPECT).filter((n) => !RED_CONTROLS[n]).join(", ") || "none"})`);
  ok(Object.values(RED_EXPECT).every((v) => Array.isArray(v) && v.length > 0),
    "every control carries at least one pinned expectation");
  ok(corpusOf({ title: "T", content: "C", objectives: ["O"], concepts: ["K"] }) === "t c o k",
    "corpusOf folds title, content, objectives and concepts together");
  ok(proseOf({ title: "T", content: "C", objectives: ["O"], concepts: ["K"] }) === "c o",
    "proseOf excludes the title and the concepts");
  return { pass, fail };
}

// ---------------------------------------------------------------------------------------------
/** Run one control against a fresh load. ok = it was caught, AND caught by the assertion it names. */
function runControl(name) {
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name] || [];
  if (!expect.length)
    return { ok: false, real, why: "NO PINNED EXPECTATION — this control is not aimed at any assertion" };
  const missing = expect.filter((e) => !real.some((f) => f.includes(e)));
  if (missing.length)
    return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${missing[0]}"` };
  return { ok: true, real: real.filter((f) => expect.some((e) => f.includes(e))) };
}

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const only = argv.includes("--red-control") ? argv[argv.indexOf("--red-control") + 1] : null;

// Hoisted ABOVE the real check: `--red-control <name>` runs one control and nothing else.
if (only) {
  if (!RED_CONTROLS[only]) { console.log(`unknown red control: ${only}`); process.exit(2); }
  let r;
  try { r = runControl(only); } catch (e) { console.log(`RED CONTROL "${only}" BROKE — ${e.message}`); process.exit(1); }
  if (!r.ok) { console.log(`RED CONTROL "${only}" ${r.why}`); r.real.slice(0, 3).forEach((f) => console.log("   " + f)); process.exit(1); }
  console.log(`red control "${only}": caught — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}
if (argv.includes("--self-test")) {
  const { pass, fail } = selfTest();
  fail.forEach((f) => console.log("FAIL: " + f));
  console.log(`self-test: ${pass} passed, ${fail.length} failed`);
  process.exit(fail.length ? 1 : 0);
}

const st = loadState();
const { pass, failures } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const realFailures = failures.filter((f) => !f.startsWith("\u0000")).length;
console.log(`\ncheck-information-technology-coverage: ${pass} checks passed, ${realFailures} failed · ${PENDING_IDS.length} new ids still pending (${PENDING_IDS.join(", ")})`);

// --no-red-control is the ONLY opt-out, and it still honours the real check's exit code.
if (argv.includes("--no-red-control")) process.exit(realFailures ? 1 : 0);

// Red controls run by DEFAULT — the suite (tools/check-all.sh) passes no arguments, so this is the path it
// takes. The two set assertions live here as well as in the self-test: --self-test never runs in the suite,
// so a control added without a pin, or a pin left behind by a deleted control, must red THIS run.
let bad = 0;
const controlNames = Object.keys(RED_CONTROLS).sort();
for (const name of controlNames)
  if (!RED_EXPECT[name]?.length) { bad++; console.log(`UNPINNED CONTROL: ${name} — it has no RED_EXPECT entry`); }
for (const name of Object.keys(RED_EXPECT).sort())
  if (!RED_CONTROLS[name]) { bad++; console.log(`STALE PIN: ${name} — RED_EXPECT names a control that does not exist`); }
for (const name of controlNames) {
  let r;
  try { r = runControl(name); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
  if (!r.ok) { bad++; console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`); }
  else console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
}
console.log(`${controlNames.length} red controls, ${bad} not caught`);
// ONE exit code for both halves: a failing real check and an uncaught control are both red.
process.exit(realFailures || bad ? 1 : 0);
