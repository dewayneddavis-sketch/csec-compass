#!/usr/bin/env node
// Harness: English B coverage — the owner's 16 chapters, and the NAMING GAP this build rests on, are real.
//
// Authority: /home/team/shared/english-b-coverage-audit.md (the 16-row table, D-1/D-2/D-3) and
// /home/team/shared/english-b-build-constraints.md (the traps). The repo copy of the table is
// docs/english-b-coverage.md, and THIS harness parses it, so the document and the delivered content
// cannot drift apart.
//
// What it pins
//   1. the doc holds the owner's 16 chapters, verbatim and in order, with 4 chapters in each of the four
//      sections and the class totals REUSE 3 / EXTEND 10 / NEW 3;
//   2. every row names a real lesson id (or, for a NEW row, an id that must still NOT exist);
//   3. the REUSE rule: every significant word of the chapter name is in the PRIMARY host's title or
//      `concepts` — the audit's own test for "already taught by name", so a REUSE row cannot rest on a
//      vague resemblance;
//   4. the EXTEND rule: that test FAILS on EVERY host the row lists. This is the assertion that the
//      naming gap is real. The moment a slice teaches the chapter by name, this goes red until the row
//      is re-classed — the doc can never quietly claim a gap that has been closed;
//   5. every non-pending row's evidence phrase occurs verbatim in the primary host's own copy
//      (title + content + objectives + concepts), so the substance the row claims is taught is checkable;
//   6. the PENDING_IDS list is exactly the NEW ids that do not exist yet — the doc's list, this harness's
//      constant and the tree must agree. A landed lesson left pending, or a lost id, goes red;
//   7. row 11's spelling exception: the chapter name stays the owner's American "Analyzing", the doc
//      records the British "Analysing prose elements", and NO shipped English B copy uses the American
//      form (the pinned British/CXC baseline);
//   8. the resolved decisions D-1/D-2/D-3 stay recorded in the doc header, so no later slice re-litigates
//      them by deleting them.
//
// Usage
//   node tools/check-english-b-coverage.mjs                       # the real check
//   node tools/check-english-b-coverage.mjs --red-control <name>  # one red control
//   node tools/check-english-b-coverage.mjs --red-controls-all    # every red control
//
// A red control mutates the loaded state in memory and MUST make the check fail. In red-control mode the
// exit code is 0 when the mutation was caught and 1 when it slipped through — the control is part of the
// result. Nothing is written to disk, so the tree is byte-identical after a red-control run.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const SUBJECT = "english-b";
const DOC = `docs/${SUBJECT}-coverage.md`;
const MODULES = `content/${SUBJECT}/modules.json`;

// ---------------------------------------------------------------------------------------------
// The owner's 16 chapters, verbatim (target-competitor-list.md). Row 11 is American on purpose.
export const CHAPTERS = [
  "Drama as a Genre",
  "Developing Dramatic Elements",
  "Plot Structure and Dramatic Techniques",
  "Interpreting Drama",
  "The Nature of Poetry",
  "Poetic Form and Structure",
  "Figurative Language and Poetic Devices",
  "Critical Interpretation of Poetry",
  "Prose Fiction Genre",
  "Analyzing Prose Elements",
  "Interpreting Language and Meaning",
  "Critical Engagement with Prose",
  "Author's Craft and Reader Influence",
  "Critical Evaluation of Literary Texts",
  "Structured Literary Response",
  "Context and Shared Human Experience",
];
export const SECTIONS = ["Drama", "Poetry", "Prose Fiction", "Literary Appreciation"];
export const PER_SECTION = 4;
export const CLASS_TOTALS = { REUSE: 3, EXTEND: 10, NEW: 3 };

// The 3 NEW ids, in row order (rows 13, 14, 16). A slice that lands one deletes it here and in the doc.
export const PENDING_IDS = ["eb-l8-craft", "eb-l8-critical-evaluation", "eb-l8-context"];

// Row 10 is the one chapter whose name is American. The doc must record the British form.
// (The audit's §G.7 and the Slice 0 brief call this "row 11"; the owner's own row order — paste rows
// 10-13 -> chapters 9-12 — makes "Analyzing Prose Elements" chapter 10, and this harness follows the
// row table, not the prose.)
export const SPELLING_EXCEPTION = { row: 10, shipped: "Analysing prose elements" };
const US_FORMS = ["analyzing", "analyze", "analyzed", "analyzes"];

const STOP = new Set(["as", "and", "the", "of", "with", "a", "an", "in", "to", "on", "its"]);

// Folding: case, curly quotes/dashes, whitespace. Deliberately generous so a legitimately worded phrase
// is not failed on punctuation alone.
export const fold = (s) => String(s == null ? "" : s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();

export const corpusOf = (l) => fold([l.title, l.content, ...(l.objectives || []), ...(l.concepts || [])].join(" \n "));
export const nameOf = (l) => fold([l.title, ...(l.concepts || [])].join(" \n "));

/** The significant words of a chapter name: length >= 4, stopwords dropped. Plurals are allowed later. */
export const wordsOf = (name) => fold(name).split(/[^a-z']+/).filter((w) => w.length >= 4 && !STOP.has(w));

/** Word-boundary match, plural allowed: "genre" matches "Genres", "drama" does NOT match "dramatic". */
export const hasWord = (text, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?\\b`).test(text);

/** True when EVERY significant word of the chapter name is in the lesson's title/concepts. */
export const namedByLesson = (l, chapter) => wordsOf(chapter).every((w) => hasWord(nameOf(l), w));

export const sectionOf = (n) => SECTIONS[Math.ceil(n / PER_SECTION) - 1];

/** Parse the doc's 16-row conformance table. Keyed by row number. */
export function parseDocRows(md) {
  const start = md.indexOf("## The 16-row coverage table");
  if (start < 0) return [];
  const rest = md.slice(start + 1);
  const end = rest.indexOf("\n## ");
  const block = end < 0 ? rest : rest.slice(0, end);
  const rows = [];
  for (const line of block.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 6) continue;
    if (!/^\d+$/.test(cells[0])) continue;
    rows.push({ n: Number(cells[0]), chapter: cells[1], section: cells[2], cls: cells[3],
      hosts: cells[4].split(",").map((s) => s.trim()).filter(Boolean), phrase: cells[5] });
  }
  return rows;
}

/** Parse the doc's Pending ids list: backticked ids on bullet lines. */
export function parsePending(md) {
  const start = md.indexOf("## Pending ids");
  if (start < 0) return [];
  const rest = md.slice(start + 1);
  const end = rest.indexOf("\n## ");
  const block = end < 0 ? rest : rest.slice(0, end);
  return [...block.matchAll(/^-\s+`([a-z0-9-]+)`/gm)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------------------------
// state: everything the checks read, loaded once and mutated by the red controls
function loadState() {
  const modulesText = read(MODULES);
  return {
    modules: JSON.parse(modulesText),
    doc: read(DOC),
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
  const docPending = parsePending(st.doc);
  const lessons = st.modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));

  // ---------------------------------------------------------------- 1. the doc is the owner's list
  section("1. the doc holds the owner's 16 chapters, verbatim, in order");
  check(rows.length === 16, `the coverage table has 16 rows (found ${rows.length})`);
  rows.forEach((r, i) => {
    check(r.n === i + 1, `row ${i + 1} is chapter ${i + 1} (found #${r.n})`);
    const want = CHAPTERS[r.n - 1];
    check(want !== undefined && fold(r.chapter) === fold(want),
      `row ${r.n} is the owner's chapter "${want}" (doc says "${r.chapter}")`);
    check(r.section === sectionOf(r.n), `row ${r.n} sits in section "${sectionOf(r.n)}" (doc says "${r.section}")`);
  });
  const secCount = (s) => rows.filter((r) => r.section === s).length;
  for (const s of SECTIONS) check(secCount(s) === PER_SECTION, `section "${s}" holds ${PER_SECTION} chapters (found ${secCount(s)})`);
  check(rows.every((r) => ["REUSE", "EXTEND", "NEW"].includes(r.cls)),
    "every row's class is REUSE, EXTEND or NEW");
  for (const [c, n] of Object.entries(CLASS_TOTALS))
    check(rows.filter((r) => r.cls === c).length === n, `${c} rows total ${n} (found ${rows.filter((r) => r.cls === c).length})`);

  // ---------------------------------------------------------------- 2. every row names a lesson id
  section("2. every row names a lesson id that means something");
  for (const r of rows) {
    check(r.hosts.length >= 1, `row ${r.n} names at least one host lesson id`);
    const pendingRow = r.cls === "NEW";
    for (const id of r.hosts) {
      if (pendingRow) {
        check(!byId[id], `row ${r.n} is NEW but its id ${id} already exists — re-class the row and shrink PENDING_IDS`);
        check(/^eb-l8-[a-z0-9-]+$/.test(id), `row ${r.n} new id ${id} follows the eb-l8-<topic> scheme`);
      } else {
        check(!!byId[id], `row ${r.n} host ${id} is a real lesson id in modules.json`);
      }
    }
  }

  // ---------------------------------------------------------------- 3. REUSE: the name is there
  section("3. REUSE rows are taught BY NAME in their primary host");
  for (const r of rows.filter((x) => x.cls === "REUSE")) {
    const l = byId[r.hosts[0]];
    if (!l) { check(false, `row ${r.n} primary host ${r.hosts[0]} does not exist`); continue; }
    const missing = wordsOf(r.chapter).filter((w) => !hasWord(nameOf(l), w));
    check(missing.length === 0,
      `row ${r.n} "${r.chapter}" is taught by name in ${r.hosts[0]} (missing from its title/concepts: ${missing.join(", ") || "none"})`);
  }

  // ---------------------------------------------------------------- 4. EXTEND: the name is NOT there
  section("4. EXTEND rows really are a naming gap — no host names the chapter");
  for (const r of rows.filter((x) => x.cls === "EXTEND")) {
    for (const id of r.hosts) {
      const l = byId[id];
      if (!l) { check(false, `row ${r.n} host ${id} does not exist`); continue; }
      const missing = wordsOf(r.chapter).filter((w) => !hasWord(nameOf(l), w));
      check(missing.length > 0,
        `row ${r.n} "${r.chapter}" is marked EXTEND but ${id} now names it by name — re-class the row to REUSE`);
    }
  }

  // ---------------------------------------------------------------- 5. evidence phrases
  section("5. every taught row's evidence phrase is in its primary host's own copy");
  for (const r of rows) {
    if (r.cls === "NEW") {
      check(r.phrase === "-", `row ${r.n} is NEW, so its evidence cell is "-" (found "${r.phrase}")`);
      continue;
    }
    check(!!r.phrase && r.phrase !== "-", `row ${r.n} records an evidence phrase`);
    if (!r.phrase || r.phrase === "-") continue;
    const l = byId[r.hosts[0]];
    if (!l) continue;
    check(corpusOf(l).includes(fold(r.phrase)),
      `row ${r.n} evidence phrase appears in ${r.hosts[0]}'s own copy`);
  }

  // ---------------------------------------------------------------- 6. PENDING_IDS is exact
  section("6. PENDING_IDS is exactly the new ids the tree is still missing");
  const newRowIds = rows.filter((r) => r.cls === "NEW").map((r) => r.hosts[0]);
  check(new Set(newRowIds).size === newRowIds.length, "no two NEW rows claim the same new id");
  check(JSON.stringify(newRowIds) === JSON.stringify(PENDING_IDS),
    `the NEW rows' ids are exactly PENDING_IDS (rows: ${newRowIds.join(", ")})`);
  check(JSON.stringify(docPending) === JSON.stringify(PENDING_IDS),
    `the doc's Pending ids list is exactly PENDING_IDS (doc: ${docPending.join(", ") || "none"})`);
  check(JSON.stringify(st.pendingIds) === JSON.stringify(PENDING_IDS),
    "the harness's PENDING_IDS constant is the list the tree actually needs");
  const absent = PENDING_IDS.filter((id) => !byId[id]);
  check(JSON.stringify(absent) === JSON.stringify(PENDING_IDS),
    `every pending id is still absent from modules.json (landed: ${PENDING_IDS.filter((id) => byId[id]).join(", ") || "none"})`);
  check(lessons.every((l) => !/^eb-l8-/.test(l.id) || PENDING_IDS.includes(l.id)),
    "no eb-l8- lesson exists that is not a known new id");

  // ---------------------------------------------------------------- 7. row 10's spelling exception
  section("7. row 10 keeps the owner's American name and we ship the British form");
  const r11 = rows.find((r) => r.n === SPELLING_EXCEPTION.row);
  check(!!r11 && r11.chapter === "Analyzing Prose Elements", "row 10 keeps the owner's verbatim \"Analyzing Prose Elements\"");
  check(fold(st.doc).includes(fold(SPELLING_EXCEPTION.shipped)),
    `the doc records the shipped British form "${SPELLING_EXCEPTION.shipped}"`);
  const usHits = lessons.filter((l) => US_FORMS.some((w) => corpusOf(l).includes(w)));
  check(usHits.length === 0,
    `no English B lesson copy uses the American form (found in: ${usHits.map((l) => l.id).join(", ") || "none"})`);

  // ---------------------------------------------------------------- 8. decisions stay recorded
  section("8. the resolved decisions stay in the doc header");
  for (const d of ["D-1", "D-2", "D-3"])
    check(new RegExp(`\\*\\*${d}\\b`).test(st.doc), `the doc still records decision ${d} as a bolded decision`);
  check(/OWNER-CONFIRMED/.test(st.doc), "the doc still marks the owner-confirmed decisions as such");

  return { pass, failures };
}

// ---------------------------------------------------------------------------------------------
// red controls: each mutates the loaded state and MUST produce at least one failure
const rowLine = (md, n) => {
  const re = new RegExp(`^\\| ${n} \\|[^\\n]*$`, "m");
  const m = re.exec(md);
  return m ? m[0] : null;
};
const editRow = (st, n, fn) => {
  const line = rowLine(st.doc, n);
  if (!line) throw new Error("red control could not find row " + n);
  st.doc = st.doc.replace(line, fn(line));
};
export const RED_CONTROLS = {
  "drop-row": (st) => { st.doc = st.doc.replace(rowLine(st.doc, 4) + "\n", ""); },
  "swap-rows": (st) => {
    const a = rowLine(st.doc, 3), b = rowLine(st.doc, 4);
    st.doc = st.doc.replace(a, "\u0001").replace(b, a).replace("\u0001", b);
  },
  "rename-chapter": (st) => { editRow(st, 1, (l) => l.replace("Drama as a Genre", "Drama")); },
  "wrong-section": (st) => { editRow(st, 2, (l) => l.replace("| Drama |", "| Poetry |")); },
  "class-flip": (st) => { editRow(st, 15, (l) => l.replace("| EXTEND |", "| REUSE |")); },
  "phrase-not-in-copy": (st) => {
    editRow(st, 4, (l) => l.replace(
      "If it asks whether we sympathise with her, take a position and defend it with evidence from several parts of the play",
      "If it asks whether we sympathise with her, take a position and defend it with three quotations"));
  },
  "phrase-dropped": (st) => {
    editRow(st, 7, (l) => l.replace("Figurative language is language used beyond its literal sense.", "-"));
  },
  "reuse-host-swapped": (st) => { editRow(st, 7, (l) => l.replace("| eb-l2-1 |", "| eb-l2-2 |")); },
  "extend-name-added": (st) => {
    const l = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l3-3");
    l.concepts = [...l.concepts, "Interpreting"];
  },
  "extend-secondary-names-it": (st) => {
    const l = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l3-1");
    l.concepts = [...l.concepts, "Plot", "Structure", "Dramatic", "Techniques"];
  },
  "pending-id-landed": (st) => {
    st.modules[0].lessons.push({ id: "eb-l8-craft", title: "Author's Craft and Reader Influence", content: "x", concepts: ["Craft"] });
  },
  "pending-list-shrunk": (st) => { st.pendingIds.pop(); },
  "doc-pending-list-shrunk": (st) => { st.doc = st.doc.replace("- `eb-l8-context` (row 16)\n", ""); },
  "ghost-host": (st) => { editRow(st, 15, (l) => l.replace("| eb-l6-1 |", "| eb-l9-9 |")); },
  "american-shipped": (st) => {
    const l = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l4-1");
    l.content = l.content + " Analyzing prose elements means reading closely.";
  },
  "row10-americanised": (st) => { editRow(st, 10, (l) => l.replace("Analyzing Prose Elements", "Analysing Prose Elements")); },
  "decisions-dropped": (st) => { st.doc = st.doc.replace("**D-2 —", "**D-two —"); },
};

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
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
    try { RED_CONTROLS[name](st); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
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
console.log(`\ncheck-english-b-coverage: ${pass} checks passed, ${real.length} failed · ${PENDING_IDS.length} new ids still pending (${PENDING_IDS.join(", ")})`);
process.exit(real.length ? 1 : 0);
