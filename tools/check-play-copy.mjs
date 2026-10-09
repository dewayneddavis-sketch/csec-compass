#!/usr/bin/env node
// Harness: the Play tab's COPY must describe the tool the student actually gets.
//
// Why this exists: the type-level description library in src/data/contentLoader.js
// (`experimentTypes`) describes the tool each *type key* is named after, and
// ExperimentSandbox used to print it above whatever rendered. For 8 of the 25
// subjects that was a promise the student never received — /subject/chemistry
// announced "Lab Simulation — Explore chemical reactions and lab procedures
// interactively" above the Chemistry Terms flashcard deck; /subject/spanish
// offered "Flashcard Trainer" over a Spanish word-matching game;
// /subject/principles-of-accounts offered a "Ledger Tool" over a sorting activity.
// Nothing caught it: the copy came from data, the tool from routing, and no
// harness ever compared them.
//
// The rule now (ExperimentSandbox.jsx): a tool that prints its own heading —
// DragDropLabel (the set's title/subtitle) and FlashcardSystem (the deck's title)
// — is left to name itself, and the type-level copy is dropped for it. A tool
// that prints no heading of its own (Circuit Builder, Graphing Calculator,
// Balance Scale) keeps the type-level copy, which for those is true of what
// renders. This harness holds that rule by:
//   1. reflecting the app's own routing (Set literals + SUBJECT_FALLBACK parsed
//      out of ExperimentSandbox.jsx, lessonSets imported) and enumerating, for
//      every subject and every lesson, which family renders,
//   2. asserting no lesson Play tab relies on the type library for its copy when
//      its tool names itself (a future lesson storing a bare type key fails here),
//   3. asserting the subject-level gate is present in the component (all three
//      parts) and, via the mirrored decision, that no self-naming tool is
//      announced by type-level copy — with the 12 subjects that DO reach the
//      subject-level tab pinned to their before/after truth table,
//   4. `--self-test` red controls: stripping any part of the gate from the source
//      must make this harness fail (proves the guard is not vacuous).
//
// What this harness does NOT do: it verifies the data and the source, not the pixels.
// The behavioural proof for this change is the rendered before/after capture of all
// 25 subject tabs taken with a browser (see the PR evidence, --report prints the
// machine-readable version of the same table).
//
// Usage:
//   node tools/check-play-copy.mjs [--root <dir>] [--report] [--self-test]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rootArg = argv.indexOf("--root");
const root = path.resolve(rootArg >= 0 ? argv[rootArg + 1] : path.join(here, ".."));
const selfTestOnly = argv.includes("--self-test");
const report = argv.includes("--report");

let pass = 0;
const failLines = [];
const ok = (cond, name) => { if (cond) pass++; else failLines.push(name); };
const eq = (a, b, name) => ok(a === b, `${name} (got ${JSON.stringify(a)})`);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const isStr = (v) => typeof v === "string" && v.trim() !== "";

// --- reflection over the app's own source ------------------------------------------------------

/** Parse `export const experimentTypes = { "key": { title, description, interactive } }`. */
export function experimentTypesFromSource(src) {
  const start = src.search(/export\s+const\s+experimentTypes\s*=\s*\{/);
  if (start < 0) return new Map();
  const open = src.indexOf("{", start);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = src.slice(open, end < 0 ? src.length : end + 1);
  const map = new Map();
  const re = /"([^"]+)"\s*:\s*\{\s*title:\s*"((?:[^"\\]|\\.)*)"\s*,\s*description:\s*"((?:[^"\\]|\\.)*)"\s*,\s*interactive:\s*"([^"]+)"/g;
  for (const m of body.matchAll(re)) map.set(m[1], { title: m[2], description: m[3], interactive: m[4] });
  return map;
}

/** Parse a `const NAME = new Set([...])` literal out of the sandbox source. */
export function setLiteralFromSource(src, name) {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`));
  return m ? new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])) : null;
}

/** Parse a flat string→string map literal (`const NAME = { key: "value", ... }`). */
export function stringMapFromSource(src, name) {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  const out = {};
  if (!m) return out;
  for (const mm of m[1].matchAll(/(?:"([^"]+)"|([A-Za-z][\w-]*))\s*:\s*"([^"]+)"/g)) out[mm[1] || mm[2]] = mm[3];
  return out;
}

/** The two per-subject experiment selectors in contentLoader.js. */
export function subjectExperimentSelectors(loaderSrc) {
  const fb = {};
  const fbBlock = loaderSrc.match(/const fallbackSubjects = \[([\s\S]*?)\n\];/);
  if (fbBlock) {
    for (const m of fbBlock[1].matchAll(/\{\s*id:\s*"([^"]+)",[\s\S]*?experiment:\s*"([^"]+)"\s*\}/g)) fb[m[1]] = m[2];
  }
  const perSubject = {};
  const block = loaderSrc.match(/const subjectExpFallback = \{([\s\S]*?)\n  \};/);
  if (block) {
    for (const m of block[1].matchAll(/(?:"([^"]+)"|([a-z-]+)):\s*"([^"]+)"/g)) perSubject[m[1] || m[2]] = m[3];
  }
  return { fb, perSubject };
}

/**
 * Does the subject-level gate exist in ExperimentSandbox.jsx? Returns the three
 * parts the copy rule depends on, each verified separately so a partial edit is
 * reported rather than silently passing.
 */
export function gateParts(sandboxSrc) {
  return {
    resolvesToolFirst: /const\s+tool\s*=\s*resolveInteractive\(/.test(sandboxSrc),
    classifiesSelfNaming: /tool\?\.type\s*===\s*DragDropLabel[\s\S]{0,120}?tool\?\.type\s*===\s*FlashcardSystem/.test(sandboxSrc),
    configCameFromTypeLibrary: /copyFromTypeLibrary\s*=/.test(sandboxSrc),
    dropsCopyForSelfNaming: /if\s*\(\s*toolNamesItself\s*&&\s*copyFromTypeLibrary\s*\)\s*experimentConfig\s*=\s*null/.test(sandboxSrc),
    toolNamesItselfUsedInHeader: /experimentConfig\?\.title\s*\|\|\s*"Interactive Lab"/.test(sandboxSrc),
  };
}

/** The mirrored copy decision: exactly the rule those source parts implement. */
export function copyShownFor({ copyFromTypeLibrary, toolNamesItself, typeEntry }) {
  if (copyFromTypeLibrary && toolNamesItself) return null;
  return typeEntry || null;
}

// ---------------------------------------------------------------------------------------------

export const SELF_NAMING = new Set(["drag-drop", "cards"]);
export const DEDICATED = new Set(["circuit", "graph", "balance"]);

if (selfTestOnly) {
  // (a) the type-library parser and the copy rule
  const types = experimentTypesFromSource(fs.readFileSync(path.join(root, "src/data/contentLoader.js"), "utf8"));
  ok(types.has("ripple-tank") && types.size > 50, `self-test: experimentTypes parsed from source (${types.size} keys)`);
  const ripple = types.get("ripple-tank");
  eq(ripple && ripple.title, "Ripple Tank", "self-test: a type entry carries its title");
  eq(copyShownFor({ copyFromTypeLibrary: true, toolNamesItself: true, typeEntry: ripple }), null,
    "self-test: a self-naming tool gets NO type-level copy");
  ok(copyShownFor({ copyFromTypeLibrary: true, toolNamesItself: false, typeEntry: ripple }) === ripple,
    "self-test: a tool with no heading of its own keeps the type-level copy");
  ok(copyShownFor({ copyFromTypeLibrary: false, toolNamesItself: true, typeEntry: ripple }) === ripple,
    "self-test: a lesson's OWN description is never dropped");

  // (b) the source gate, red controls — strip one part at a time
  const src = fs.readFileSync(path.join(root, "src/components/ExperimentSandbox.jsx"), "utf8");
  const all = gateParts(src);
  ok(Object.values(all).every(Boolean), `self-test: the honest-copy gate is present (${Object.entries(all).filter(([, v]) => !v).map(([k]) => k).join(", ") || "all parts"})`);
  const stripped = {
    "tool resolved first": src.replace(/const\s+tool\s*=\s*resolveInteractive\([^\n]*\n/, ""),
    "self-naming classification": src.replace(/tool\?\.type\s*===\s*DragDropLabel[\s\S]{0,120}?tool\?\.type\s*===\s*FlashcardSystem/, "false"),
    "copy dropped for self-naming tools": src.replace(/if\s*\(\s*toolNamesItself\s*&&\s*copyFromTypeLibrary\s*\)\s*experimentConfig\s*=\s*null;/, ""),
  };
  for (const [name, mutated] of Object.entries(stripped)) {
    const parts = gateParts(mutated);
    ok(!Object.values(parts).every(Boolean), `self-test: RED control — removing "${name}" makes the gate guard fail`);
  }
} else {
  // --- load the app's knowledge + real content -------------------------------------------------
  const loaderSrc = exists("src/data/contentLoader.js") ? read("src/data/contentLoader.js") : "";
  const sandboxSrc = exists("src/components/ExperimentSandbox.jsx") ? read("src/components/ExperimentSandbox.jsx") : "";
  const ddSrc = exists("src/components/DragDropLabel.jsx") ? read("src/components/DragDropLabel.jsx") : "";
  const fcSrc = exists("src/components/FlashcardSystem.jsx") ? read("src/components/FlashcardSystem.jsx") : "";

  const types = experimentTypesFromSource(loaderSrc);
  ok(types.size > 50, `the type-level description library was read from contentLoader.js (${types.size} types)`);
  const { fb: fbExp, perSubject: expFallback } = subjectExperimentSelectors(loaderSrc);
  ok(Object.keys(fbExp).length >= 10, `the fallbackSubjects experiment map was read (${Object.keys(fbExp).length} subjects)`);
  ok(Object.keys(expFallback).length >= 10, `the per-subject experiment fallback map was read (${Object.keys(expFallback).length} subjects)`);

  const SETS = {};
  for (const n of ["MATH_LINEAR_TYPES", "MATH_PARABOLA_TYPES", "MATH_NUMBERLINE_TYPES", "MATH_BALANCE_TYPES",
    "MATH_DRAG_TYPES", "PHYS_DRAG_TYPES", "CHEM_DRAG_TYPES", "ENG_DRAG_TYPES", "ENG_DICTION_TYPES"]) {
    SETS[n] = setLiteralFromSource(sandboxSrc, n);
  }
  ok(Object.values(SETS).every((s) => s && s.size > 0), "every routing Set literal was read from ExperimentSandbox.jsx");
  const SUBJECT_FALLBACK = stringMapFromSource(sandboxSrc, "SUBJECT_FALLBACK");
  ok(Object.keys(SUBJECT_FALLBACK).length >= 10, `SUBJECT_FALLBACK was read (${Object.keys(SUBJECT_FALLBACK).length} subjects)`);

  const gate = gateParts(sandboxSrc);
  for (const [part, present] of Object.entries(gate)) {
    ok(present, `ExperimentSandbox.jsx keeps the honest-copy gate: ${part}`);
  }
  ok(/<h4>\{set\.title\}<\/h4>/.test(ddSrc) && /<p>\{set\.subtitle\}<\/p>/.test(ddSrc),
    "DragDropLabel really prints the set's own title and subtitle (the self-naming premise)");
  ok(/<h4>\{deck\.title\}<\/h4>/.test(fcSrc), "FlashcardSystem really prints the deck's own title (the self-naming premise)");

  let lessonSets = {};
  try {
    lessonSets = (await import(pathToFileURL(path.join(root, "src/components/lessonSets.js")).href)).lessonSets || {};
  } catch (e) {
    failLines.push(`could not load src/components/lessonSets.js (${e.message})`);
  }

  // mirror of resolveInteractive(): returns the FAMILY of tool that renders
  const familyOf = (subjectId, t0, lessonId) => {
    const t = t0 || "flashcard";
    if (subjectId === "physics") {
      if (t === "circuit-builder") return "circuit";
      if (SETS.PHYS_DRAG_TYPES.has(t)) return "drag-drop";
      return "cards";
    }
    if (subjectId === "mathematics") {
      if (lessonId && lessonSets?.["mathematics"]?.[lessonId]) return "drag-drop";
      if (SETS.MATH_DRAG_TYPES.has(t)) return "drag-drop";
      if (SETS.MATH_LINEAR_TYPES.has(t) || SETS.MATH_PARABOLA_TYPES.has(t) || SETS.MATH_NUMBERLINE_TYPES.has(t)) return "graph";
      if (SETS.MATH_BALANCE_TYPES.has(t)) return "balance";
      return "cards";
    }
    if (subjectId === "chemistry") return SETS.CHEM_DRAG_TYPES.has(t) ? "drag-drop" : "cards";
    if (subjectId === "biology" || subjectId === "human-social-biology") return "drag-drop";
    if (subjectId === "english-a") {
      if (lessonId && lessonSets?.["english-a"]?.[lessonId]) return "drag-drop";
      if (SETS.ENG_DRAG_TYPES.has(t)) return "drag-drop";
      if (SETS.ENG_DICTION_TYPES.has(t)) return "cards";
      return "cards";
    }
    if (subjectId === "principles-of-accounts") return t === "balance-scale" ? "balance" : "drag-drop";
    if (["information-technology", "social-studies", "english-b", "spanish"].includes(subjectId)) return "drag-drop";
    if (lessonId && lessonSets?.[subjectId]) return "drag-drop";
    return "cards";
  };

  // mirror of getExperimentConfig(): the type key a subject-level lab runs on
  const subjectLabType = (subjectId) => {
    if (fbExp[subjectId] && types.has(fbExp[subjectId])) return fbExp[subjectId];
    const t = expFallback[subjectId];
    if (t && types.has(t)) return t;
    return null;
  };

  // --- real content ----------------------------------------------------------------------------
  const contentDir = path.join(root, "content");
  const subjects = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(contentDir, d.name, "modules.json")))
    .map((d) => d.name).sort();
  ok(subjects.length >= 25, `modules.json found for ${subjects.length} subjects`);

  // --- 1/2. lesson level: the Play copy is the lesson's own, whenever its tool self-names ------
  let lessonCount = 0, withExperiment = 0, selfNamingLessons = 0, typedFromLibrary = 0;
  const lessonRows = [];
  for (const subject of subjects) {
    const modules = JSON.parse(read(`content/${subject}/modules.json`));
    for (const mod of modules) {
      for (const lesson of mod.lessons || []) {
        lessonCount++;
        const exp = lesson.experiment;
        if (exp === undefined || exp === null) continue;
        withExperiment++;
        const type = typeof exp === "string" ? exp : exp.type;
        const family = familyOf(subject, type, lesson.id);
        const selfNaming = SELF_NAMING.has(family);
        if (selfNaming) selfNamingLessons++;
        // Copy for a lesson comes from the type library only when `experiment` is a bare string.
        const fromLibrary = typeof exp === "string";
        if (fromLibrary) typedFromLibrary++;
        const copied = copyShownFor({
          copyFromTypeLibrary: fromLibrary,
          toolNamesItself: selfNaming,
          typeEntry: fromLibrary && types.has(exp) ? types.get(exp) : null,
        });
        const ownDescription = typeof exp === "object" && isStr(exp.description);
        lessonRows.push({ subject, lesson: lesson.id, family, copied: copied ? copied.title : null, ownDescription });
        if (selfNaming && !ownDescription) {
          failLines.push(`${subject}/${lesson.id}: its Play tool (${family}) prints its own heading, so no type-level copy may be shown — give the lesson an experiment.description or leave it to the tool`);
        }
      }
    }
  }
  ok(lessonCount > 100, `every lesson in the platform was walked (${lessonCount} lessons, ${withExperiment} with an experiment)`);
  eq(typedFromLibrary, 0, `no lesson relies on the type library for its Play copy (${selfNamingLessons} lessons render a self-naming tool and carry their own description)`);

  // --- 3. subject level: the copy rule + the pinned truth table --------------------------------
  const TRUTH = {
    // subject: { family that renders, was the type-level promise true as rendered? }
    // Audited by rendering the live tab (see the task/PR evidence): these 12 are the
    // subjects whose subject-level Interactive Lab tab reaches the type-level copy.
    biology: { family: "drag-drop", promiseWasTrue: true },
    mathematics: { family: "graph", promiseWasTrue: true },
    physics: { family: "circuit", promiseWasTrue: true },
    french: { family: "cards", promiseWasTrue: true },
    chemistry: { family: "cards", promiseWasTrue: false },
    "english-a": { family: "cards", promiseWasTrue: false },
    "human-social-biology": { family: "drag-drop", promiseWasTrue: false },
    "information-technology": { family: "drag-drop", promiseWasTrue: false },
    "principles-of-accounts": { family: "drag-drop", promiseWasTrue: false },
    "principles-of-business": { family: "cards", promiseWasTrue: false },
    "social-studies": { family: "drag-drop", promiseWasTrue: false },
    spanish: { family: "drag-drop", promiseWasTrue: false },
  };
  let withTypeCopy = 0;
  const rows = [];
  for (const subject of subjects) {
    const typeKey = subjectLabType(subject);
    const typeEntry = typeKey ? types.get(typeKey) : null;
    const experimentType = (typeEntry && typeEntry.interactive) || SUBJECT_FALLBACK[subject] || "flashcard";
    const family = familyOf(subject, experimentType, undefined);
    const selfNaming = SELF_NAMING.has(family);
    const shown = copyShownFor({ copyFromTypeLibrary: true, toolNamesItself: selfNaming, typeEntry });
    if (shown) withTypeCopy++;
    rows.push({ subject, typeKey, family, selfNaming, shown: shown ? shown.title : null });
  }
  ok(rows.every((r) => DEDICATED.has(r.family) || SELF_NAMING.has(r.family)),
    "every subject-level lab resolves to a classified tool family (the reflection is working)");

  // Pin the truth table, so a routing change that makes copy and tool disagree goes red here.
  const pinned = Object.keys(TRUTH).sort();
  const actual = rows.filter((r) => r.typeKey).map((r) => r.subject).sort();
  eq(actual.join(","), pinned.join(","), "the subjects reaching the subject-level type-level copy are exactly the audited 12");
  for (const [subject, t] of Object.entries(TRUTH)) {
    const row = rows.find((r) => r.subject === subject);
    eq(row && row.family, t.family, `${subject}: the subject-level lab renders the audited tool family`);
    // Kept only where the tool prints no heading of its own (a dedicated simulator).
    eq(row && row.shown !== null, DEDICATED.has(t.family),
      `${subject}: type-level copy ${DEDICATED.has(t.family) ? "kept — the tool prints no heading of its own" : "dropped — the tool names itself"}`);
    if (!t.promiseWasTrue) {
      const was = types.get(row?.typeKey)?.title;
      ok(row && row.shown === null && isStr(was),
        `${subject}: the promise that contradicted the tool ("${was}" over ${t.family} — what actually renders) is no longer displayed`);
    } else if (DEDICATED.has(t.family)) {
      const e = types.get(row?.typeKey);
      ok(e && isStr(e.title) && isStr(e.description),
        `${subject}: the copy kept for its heading-less tool is complete (title + description)`);
    }
  }

  if (report) {
    console.log("\nsubject-level Interactive Lab tab — what renders, what is shown:");
    for (const r of rows) {
      console.log(`  ${r.subject.padEnd(29)} type=${(r.typeKey || "—").padEnd(16)} renders=${r.family.padEnd(10)} copy=${r.shown ? `"${r.shown}"` : "(none — the tool names itself)"}`);
    }
    console.log(`\n  ${rows.length} subjects: ${withTypeCopy} keep a type-level description, ${rows.length - withTypeCopy} are left to the tool's own heading`);
    console.log(`  lessons: ${lessonCount} walked, ${withExperiment} with a Play tab, ${selfNamingLessons} rendering a self-naming tool\n`);
  }
}

for (const line of failLines.slice(0, 40)) console.log(`  FAIL ${line}`);
if (failLines.length > 40) console.log(`  ... and ${failLines.length - 40} more`);
console.log(`\ncheck-play-copy: ${pass}/${pass + failLines.length} green${failLines.length ? ` (${failLines.length} FAILED)` : ""}${selfTestOnly ? " [self-test]" : ` [root ${root}]`}`);
process.exit(failLines.length ? 1 : 0);
