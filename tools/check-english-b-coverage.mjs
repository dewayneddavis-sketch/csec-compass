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
//      sections and the class totals REUSE 9 / EXTEND 4 / NEW 3;
//   2. every row names a real lesson id (or, for a NEW row, an id that must still NOT exist);
//   3. the REUSE rule: every significant word of the chapter name is in the PRIMARY host's title or
//      `concepts` — the audit's own test for "already taught by name", so a REUSE row cannot rest on a
//      vague resemblance;
//   4. the EXTEND rule: that test FAILS on EVERY host the row lists. This is the assertion that the
//      naming gap is real. The moment a slice teaches the chapter by name, this goes red until the row
//      is re-classed — the doc can never quietly claim a gap that has been closed.
//      AFTER SLICE E NO ROW IS EXTEND ANY MORE: row 15 was the last one, and `eb-l6-1` now names it. The
//      rule and both of its controls are KEPT, because the class is part of the column contract and can
//      come back the moment a shipped name is removed or a REUSE claim is withdrawn — but on the shipped
//      doc the loop iterates over nothing, so each of its controls SYNTHESISES the state in memory
//      (re-classes row 15 to EXTEND) instead of pointing at a live row. The rule is DORMANT, not broken.
//      And a control must be caught BY the assertion it is aimed at, which is what RED_EXPECT pins: a
//      totals failure alone would otherwise keep a control green while the loop it guards had stopped
//      checking anything;
//   5. every non-pending row's evidence phrase occurs verbatim in the primary host's own copy
//      (title + content + objectives + concepts), so the substance the row claims is taught is checkable;
//   6. the PENDING_IDS list is exactly the NEW ids that do not exist yet — the doc's list, this harness's
//      constant and the tree must agree. A landed lesson left pending, or a lost id, goes red.
//      AFTER SLICE F NOTHING IS PENDING (`PENDING_IDS` is []), so that rule now iterates over empty lists
//      and cannot fail on the shipped doc. The half of it that still has something to look at is kept and
//      strengthened: every `eb-l8-*` lesson that exists must be the primary host of a coverage row, so a
//      lesson cannot appear without a row and a row cannot lose its lesson. Controls `pending-id-reappears`
//      and `ghost-eb-l8-lesson` keep both halves live (see RED_EXPECT);
//   7. row 11's spelling exception: the chapter name stays the owner's American "Analyzing", the doc
//      records the British "Analysing prose elements", and NO shipped English B copy uses the American
//      form (the pinned British/CXC baseline);
//   8. the resolved decisions D-1/D-2/D-3 stay recorded in the doc header, so no later slice re-litigates
//      them by deleting them.
//
// Usage
//   node tools/check-english-b-coverage.mjs                       # the real check AND every red control
//   node tools/check-english-b-coverage.mjs --red-control <name>  # one red control, on its own
//   node tools/check-english-b-coverage.mjs --no-red-control      # the real check only (the one opt-out)
//
// A red control mutates the loaded state in memory and MUST make the check fail. The controls run BY
// DEFAULT, because the suite (`tools/check-all.sh`) invokes every harness with no arguments: a guard that
// only runs behind a flag is not a guard, and until 2026-11-19 this file's 22 controls ran only in a manual
// `--red-controls-all` pass that the suite never made. Nothing is written to disk, so the tree is
// byte-identical after a run with the controls on.
//
// One exit code covers both halves: the real check's failures and any control that was not caught (or was
// caught by an assertion other than the one it is aimed at — see RED_EXPECT).
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
// Slice A re-classed row 5 (EXTEND -> REUSE) because `eb-l1-1` now names "The Nature of Poetry";
// Slice B re-classed rows 6 and 8 because `eb-l2-2` and `eb-l2-3` now name their chapters;
// Slice C re-classed rows 2, 3 and 4 because `eb-l3-1`, `eb-l3-2` and `eb-l3-3` now name theirs;
// Slice D re-classed rows 10, 11 and 12 because `eb-l4-1`, `eb-l4-3` and `eb-l4-2` now name theirs;
// Slice E re-classed row 15, the LAST EXTEND row, because `eb-l6-1` now names "Structured Literary
// Response". EXTEND is therefore 0: the totals loop below still runs, but over an empty class — honest
// and weak, since it cannot fail for EXTEND while no row carries the class. The class can only come back
// if a shipped name is removed or a REUSE claim is withdrawn, and when it does this constant and the
// doc's headline move with it in the same PR. What keeps the 0 real is the red control `class-flip`:
// it re-classes a row to EXTEND and must fail ON THE TOTALS LINE (see RED_EXPECT), not merely somewhere.
// Slice F re-classed rows 13, 14 and 16, the LAST three NEW rows, because `eb-l8-craft`,
// `eb-l8-critical-evaluation` and `eb-l8-context` now exist and name their chapters verbatim as their
// titles. NEW is therefore 0 as well, and BOTH class rules now run over empty lists — see the note above
// §6 and the controls `new-row-id-exists` / `new-row-bad-scheme` / `new-row-has-phrase`, which put the
// NEW class back in memory so the branch they guard still has something to reject.
// The totals follow the rows, they are not a target.
export const CLASS_TOTALS = { REUSE: 16, EXTEND: 0, NEW: 0 };

// Empty since Slice F: every id the coverage build was going to add has landed. A slice that lands one
// deletes it here and in the doc; this list is what makes "nothing is pending" checkable at all.
export const PENDING_IDS = [];

// Row 10 is the one chapter whose name is American. The doc must record the British form.
// (The audit's §G.7 and the Slice 0 brief call this "row 11"; the owner's own row order — paste rows
// 10-13 -> chapters 9-12 — makes "Analyzing Prose Elements" chapter 10, and this harness follows the
// row table, not the prose.)
export const SPELLING_EXCEPTION = { row: 10, shipped: "Analysing prose elements" };
const US_FORMS = ["analyzing", "analyze", "analyzed", "analyzes"];

const STOP = new Set(["as", "and", "the", "of", "with", "a", "an", "in", "to", "on", "its"]);

// Row 10's chapter name is American ("Analyzing Prose Elements") but the copy must ship the British form
// (section 7 forbids "analyzing" in any lesson), so the naming tests accept the British equivalent of that
// ONE word and nothing else. The red control `row10-name-removed` proves the row still needs the word.
export const WORD_EQUIVALENTS = { analyzing: ["analysing"] };

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

/** hasWord, plus the recorded spelling equivalent of the word (see WORD_EQUIVALENTS). */
export const hasWordOrEquivalent = (text, w) => hasWord(text, w) || (WORD_EQUIVALENTS[w] || []).some((alt) => hasWord(text, alt));

/** True when EVERY significant word of the chapter name is in the lesson's title/concepts. */
export const namedByLesson = (l, chapter) => wordsOf(chapter).every((w) => hasWordOrEquivalent(nameOf(l), w));

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
    // The NEW branch is DORMANT since Slice F: no row carries the class, so neither of its two checks
    // runs. It is kept because a slice that re-classes a row to NEW (a withdrawn REUSE claim) must not
    // be able to point at an id that already exists or at an id outside the eb-l8- scheme. The controls
    // `new-row-id-exists` and `new-row-bad-scheme` synthesise the class in memory and are pinned by
    // RED_EXPECT to the message each one is aimed at.
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
    const missing = wordsOf(r.chapter).filter((w) => !hasWordOrEquivalent(nameOf(l), w));
    check(missing.length === 0,
      `row ${r.n} "${r.chapter}" is taught by name in ${r.hosts[0]} (missing from its title/concepts: ${missing.join(", ") || "none"})`);
  }

  // ---------------------------------------------------------------- 4. EXTEND: the name is NOT there
  section("4. EXTEND rows really are a naming gap — no host names the chapter");
  for (const r of rows.filter((x) => x.cls === "EXTEND")) {
    for (const id of r.hosts) {
      const l = byId[id];
      if (!l) { check(false, `row ${r.n} host ${id} does not exist`); continue; }
      const missing = wordsOf(r.chapter).filter((w) => !hasWordOrEquivalent(nameOf(l), w));
      check(missing.length > 0,
        `row ${r.n} "${r.chapter}" is marked EXTEND but ${id} now names it by name — re-class the row to REUSE`);
    }
  }

  // ---------------------------------------------------------------- 5. evidence phrases
  section("5. every taught row's evidence phrase is in its primary host's own copy");
  for (const r of rows) {
    if (r.cls === "NEW") {
      // Dormant since Slice F (no row is NEW). Kept so that a withdrawn REUSE claim cannot carry an
      // evidence phrase it has not earned; `new-row-has-phrase` re-classes row 13 in memory to keep it live.
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
  // `st.pendingIds`, not the module constant, so a red control can put a pending id back in memory and
  // make this filter do some work. With the shipped [] it is `[] === []` — honest, and the controls below
  // are what keep it from being decorative.
  const absent = st.pendingIds.filter((id) => !byId[id]);
  check(JSON.stringify(absent) === JSON.stringify(st.pendingIds),
    `every pending id is still absent from modules.json (landed: ${st.pendingIds.filter((id) => byId[id]).join(", ") || "none"})`);
  // AFTER SLICE F NOTHING IS PENDING, so every check above iterates over empty lists and cannot fail on
  // the shipped doc. This is the half of the same guard that still has something to look at: the `eb-l8-*`
  // lessons that DO exist are exactly the ones the coverage table claims. A fourth new lesson with no row
  // goes red, and a row that loses its lesson goes red — which is what "the build is finished" means in a
  // form a machine can check. Kept live by `ghost-eb-l8-lesson` (see RED_EXPECT).
  const newLessons = lessons.filter((l) => /^eb-l8-/.test(l.id)).map((l) => l.id).sort();
  const claimedNew = [...new Set(rows.map((r) => r.hosts[0]).filter((id) => /^eb-l8-/.test(id)))].sort();
  check(newLessons.length > 0, `the landed eb-l8-* lessons exist (found ${newLessons.length})`);
  check(JSON.stringify(newLessons) === JSON.stringify(claimedNew),
    `every eb-l8-* lesson is the primary host of a coverage row (lessons: ${newLessons.join(", ") || "none"}; rows: ${claimedNew.join(", ") || "none"})`);

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
  // Aimed at the CLASS_TOTALS loop. After Slice E no row is EXTEND, so the totals line "EXTEND 0" can
  // only be tested by putting the class back: re-class row 15 (a real, shipped REUSE row) to EXTEND and
  // the totals must disagree. This also trips the EXTEND rule, which is why RED_EXPECT pins the failure
  // this control is FOR — the totals message — and not just "something failed".
  "class-flip": (st) => { editRow(st, 15, (l) => l.replace("| REUSE |", "| EXTEND |")); },
  "phrase-not-in-copy": (st) => {
    editRow(st, 4, (l) => l.replace(
      "an interpretation has to be built from what an audience sees and hears",
      "an interpretation is whatever the director decides it is"));
  },
  "phrase-dropped": (st) => {
    editRow(st, 7, (l) => l.replace("Figurative language is language used beyond its literal sense.", "-"));
  },
  "reuse-host-swapped": (st) => { editRow(st, 7, (l) => l.replace("| eb-l2-1 |", "| eb-l2-2 |")); },
  // Aimed at the EXTEND rule's PRIMARY-host branch: a row marked EXTEND whose primary host names the
  // chapter must red the row. No live row is EXTEND after Slice E, so this control puts the class back on
  // row 15 in memory — `eb-l6-1` really does name "Structured Literary Response" now, so the loop has a
  // genuine violation to catch. If that branch stopped checking, this control would report NOT CAUGHT.
  "extend-name-added": (st) => {
    editRow(st, 15, (l) => l.replace("| REUSE |", "| EXTEND |"));
  },
  // Aimed at the EXTEND rule's PER-HOST loop, not at any one row. No live row exercises it now: after
  // Slice E there is no EXTEND row at all. Rather than leave a control that guards nothing, this one
  // supplies the property in memory — it re-classes row 15 to EXTEND, gives it a real second host
  // (`eb-l6-3`), STRIPS the chapter name out of the primary host `eb-l6-1` (so hosts[0] legitimately
  // passes) and makes only the second host name it. If the loop only ever checked hosts[0], nothing
  // would fail and this control would report NOT CAUGHT.
  "extend-secondary-names-it": (st) => {
    editRow(st, 15, (l) => l.replace("| REUSE |", "| EXTEND |").replace("| eb-l6-1 |", "| eb-l6-1, eb-l6-3 |"));
    const primary = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l6-1");
    primary.concepts = primary.concepts.filter((c) => c !== "Structured literary response");
    const secondary = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l6-3");
    secondary.concepts = [...secondary.concepts, "Structured", "Literary", "Response"];
  },
  // Aimed at row 15's REUSE claim: it is REUSE only because `eb-l6-1` now carries the chapter's name in
  // its `concepts`, so removing that concept must red the row. Without this control the new concept could
  // be dropped by a later edit and the row would keep claiming a name nobody writes.
  "row15-name-removed": (st) => {
    const l = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l6-1");
    l.concepts = l.concepts.filter((c) => c !== "Structured literary response");
  },
  // Aimed at the row-10 spelling equivalence (WORD_EQUIVALENTS): the row is REUSE only because
  // `eb-l4-1` ships the British "Analysing", so removing it must red row 10. Without this control the
  // equivalence could hide a row that names nothing.
  "row10-name-removed": (st) => {
    const l = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l4-1");
    l.concepts = l.concepts.filter((c) => c !== "Analysing prose elements");
  },
  "pending-id-reappears": (st) => { st.pendingIds.push("eb-l8-craft"); },
  "doc-pending-list-grown": (st) => {
    st.doc = st.doc.replace("## Pending ids\n", "## Pending ids\n\n- `eb-l8-ghost` (row 17)\n");
  },
  // Aimed at §6's `absent` filter, which is `[] === []` on the shipped doc now that nothing is pending:
  // putting a landed id back in the list must red it, or the rule that a pending id is genuinely missing
  // has stopped checking anything. `doc-pending-list-grown` does the same for the doc's own list.
  // Aimed at §2's NEW branch and §5's NEW branch, which no live row reaches any more. Each control puts
  // the class back on row 13 (a real, shipped REUSE row) so the branch has something to reject.
  "new-row-id-exists": (st) => { editRow(st, 13, (l) => l.replace("| REUSE |", "| NEW |")); },
  "new-row-bad-scheme": (st) => {
    editRow(st, 13, (l) => l.replace("| REUSE |", "| NEW |").replace("| eb-l8-craft |", "| eb-l9-craft |"));
  },
  "new-row-has-phrase": (st) => { editRow(st, 13, (l) => l.replace("| REUSE |", "| NEW |")); },
  // Aimed at §6's live half: every eb-l8-* lesson is the primary host of a coverage row. A fourth new
  // lesson appearing with no row must red it — that is "the build is finished" in a checkable form.
  "ghost-eb-l8-lesson": (st) => {
    // Resolve the module BY ID, never by index: `st.modules[7]` is correct today and silently aimed at the
    // wrong module the moment a module is inserted ahead of it.
    const mod = st.modules.find((m) => m.id === "eb-mod-8");
    if (!mod) throw new Error("no eb-mod-8 module to append the ghost lesson to");
    mod.lessons.push({ id: "eb-l8-ghost", title: "A Ghost Lesson", content: "x", concepts: ["Ghost"] });
  },
  "ghost-host": (st) => { editRow(st, 15, (l) => l.replace("| eb-l6-1 |", "| eb-l9-9 |")); },
  "american-shipped": (st) => {
    const l = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "eb-l4-1");
    l.content = l.content + " Analyzing prose elements means reading closely.";
  },
  "row10-americanised": (st) => { editRow(st, 10, (l) => l.replace("Analyzing Prose Elements", "Analysing Prose Elements")); },
  "decisions-dropped": (st) => { st.doc = st.doc.replace("**D-2 —", "**D-two —"); },
};

// ---------------------------------------------------------------------------------------------
// What each control must be caught BY — one ARRAY per control, and every one of the 22 is pinned.
// A control that synthesises state trips more than one assertion at once (re-classing a row to EXTEND
// breaks the class totals as well as the EXTEND rule), so "some failure appeared" is not proof that the
// assertion the control is FOR still checks anything: a control whose guard had been deleted would still
// report caught because a DIFFERENT assertion tripped. The run only passes if every message listed here is
// among the failures; a control with no entry here fails outright (runControl), so a later edit cannot add
// a control and leave it unpinned. Where a control is listed below, the comment names the assertion it is
// aimed at and, where one exists, the side-effect it also trips.
export const RED_EXPECT = {
  // §1's row count — aimed at "the table has 16 rows", NOT the row-numbering loop it also trips.
  "drop-row": ["the coverage table has 16 rows (found 15)"],
  // §1's row-numbering assertion `r.n === i + 1`: a swap leaves the count at 16 and every name intact.
  "swap-rows": ["row 3 is chapter 3 (found #4)"],
  "rename-chapter": ['row 1 is the owner\'s chapter "Drama as a Genre"'],
  // §1's `sectionOf` assertion — the per-section counts (Drama 3 / Poetry 5) are the side-effect.
  "wrong-section": ['row 2 sits in section "Drama" (doc says "Poetry")'],
  "class-flip": ["EXTEND rows total 0 (found 1)"],
  "phrase-not-in-copy": ["row 4 evidence phrase appears in eb-l3-3's own copy"],
  "phrase-dropped": ["row 7 records an evidence phrase"],
  // §3's REUSE name test — §5's phrase check on eb-l2-2 is the side-effect.
  "reuse-host-swapped": ['row 7 "Figurative Language and Poetic Devices" is taught by name in eb-l2-2'],
  "extend-name-added": ["is marked EXTEND but eb-l6-1 now names it by name"],
  "extend-secondary-names-it": ["is marked EXTEND but eb-l6-3 now names it by name"],
  "row15-name-removed": ['row 15 "Structured Literary Response" is taught by name in eb-l6-1'],
  "row10-name-removed": ['row 10 "Analyzing Prose Elements" is taught by name in eb-l4-1'],
  "pending-id-reappears": ["every pending id is still absent from modules.json (landed: eb-l8-craft)"],
  "doc-pending-list-grown": ["the doc's Pending ids list is exactly PENDING_IDS (doc: eb-l8-ghost)"],
  "new-row-id-exists": ["row 13 is NEW but its id eb-l8-craft already exists"],
  "new-row-bad-scheme": ["row 13 new id eb-l9-craft follows the eb-l8-<topic> scheme"],
  "new-row-has-phrase": ['row 13 is NEW, so its evidence cell is "-"'],
  "ghost-eb-l8-lesson": ["every eb-l8-* lesson is the primary host of a coverage row"],
  // §2's "host is a real lesson id" — §3's "primary host … does not exist" is the side-effect.
  "ghost-host": ["row 15 host eb-l9-9 is a real lesson id in modules.json"],
  "american-shipped": ["no English B lesson copy uses the American form (found in: eb-l4-1)"],
  // §7's verbatim-name assertion: row 10 must keep the owner's American spelling. §1's chapter-name
  // assertion also trips (it is the same fact stated twice) and is the side-effect, not the target.
  "row10-americanised": ['row 10 keeps the owner\'s verbatim "Analyzing Prose Elements"'],
  "decisions-dropped": ["the doc still records decision D-2 as a bolded decision"],
};

// ---------------------------------------------------------------------------------------------
/** Run one control against a fresh load. ok = it was caught, and caught by the assertion it names. */
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

if (only) {
  if (!RED_CONTROLS[only]) { console.log(`unknown red control: ${only}`); process.exit(2); }
  let r;
  try { r = runControl(only); } catch (e) { console.log(`RED CONTROL "${only}" BROKE — ${e.message}`); process.exit(1); }
  if (!r.ok) { console.log(`RED CONTROL "${only}" ${r.why}`); r.real.slice(0, 3).forEach((f) => console.log("   " + f)); process.exit(1); }
  console.log(`red control "${only}": caught — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}

const st = loadState();
const { pass, failures } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const realFailures = failures.filter((f) => !f.startsWith("\u0000")).length;
console.log(`\ncheck-english-b-coverage: ${pass} checks passed, ${realFailures} failed · ${PENDING_IDS.length} new ids still pending (${PENDING_IDS.join(", ")})`);

if (argv.includes("--no-red-control")) process.exit(realFailures ? 1 : 0);

// Red controls run by DEFAULT — the suite passes no arguments, so this is the path it takes.
let bad = 0;
for (const name of Object.keys(RED_CONTROLS)) {
  let r;
  try { r = runControl(name); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
  if (!r.ok) { bad++; console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`); }
  else console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
}
console.log(`${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
// ONE exit code for both halves: a failing real check and an uncaught control are both red.
process.exit(realFailures || bad ? 1 : 0);
