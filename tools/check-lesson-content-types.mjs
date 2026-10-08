#!/usr/bin/env node
// Harness: lesson element TYPES (the guardrail for the blank-page defect class).
//
// Why this exists: PR #143 shipped lesson `concepts` as {term, definition} objects while
// LessonView renders <li>{c}</li>. React throws on an object child, so 8 lessons took the
// white screen — and the whole suite (34 harnesses, ~7.7k checks) stayed green, because every
// other harness asserted JSON *shape* (key present, array length), never element *type*.
// A green suite with a blank page is worse than a red one. This harness closes the class:
//
//   1. `concepts` and `objectives` are arrays of non-empty STRINGS, never objects/numbers/null,
//   2. `title` and `content` are non-empty strings (the two other fields LessonView renders),
//   3. every lesson has a unique non-empty string id, and every module a unique id + lessons[],
//   4. `experiment` (string, or object with a string `type`) resolves to a type the app actually
//      recognizes — a key of experimentTypes in src/data/contentLoader.js, a type literal in
//      src/components/ExperimentSandbox.jsx, or a per-lesson entry in lessonSets.js. An unknown
//      type silently falls back to a generic subject-level tool (wrong lab, or none).
//   5. every key in lessonSets[subject] is a real lesson id of that subject (a stale/typo'd key
//      is wired lab content no lesson can ever reach), and the entry is not empty.
//
// Red/green control: `--self-test` proves the validator rejects each defect on synthetic input;
// the same file run against a branch that has the defect (see --root) fails on the real data.
//
// Usage: node tools/check-lesson-content-types.mjs [--root <dir>] [--self-test]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rootArg = argv.indexOf("--root");
const root = path.resolve(rootArg >= 0 ? argv[rootArg + 1] : path.join(here, ".."));
const selfTestOnly = argv.includes("--self-test");

let pass = 0;
const failLines = [];
const ok = (cond, name) => { if (cond) pass++; else { failLines.push(name); } };
const eq = (a, b, name) => ok(a === b, `${name} (got ${JSON.stringify(a)})`);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const isStr = (v) => typeof v === "string" && v.trim() !== "";

// --- the app's recognized experiment types ---------------------------------------------------
// contentLoader.js keeps `experimentTypes` extension-less-imported ("./lessonFigures"), so Node
// cannot import it — parse the object literal instead. ExperimentSandbox.jsx is JSX (not
// loadable either): every type it routes on appears as a quoted literal there.
function experimentTypesFromSource(src) {
  const start = src.search(/export\s+const\s+experimentTypes\s*=\s*\{/);
  if (start < 0) return new Set();
  const open = src.indexOf("{", start);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = src.slice(open, end < 0 ? src.length : end + 1);
  const keys = new Set();
  for (const m of body.matchAll(/^\s*"([^"]+)"\s*:/gm)) keys.add(m[1]);
  for (const m of body.matchAll(/^\s*([A-Za-z0-9_-]+)\s*:\s*\{/gm)) keys.add(m[1]);
  return keys;
}

// --- the validators (kept free of fs so they are unit-testable) -------------------------------
// A lesson field that React renders directly must be a string; an array of them must be an
// array of strings. Returns a list of human-readable problems (empty = healthy).
export function lessonTypeProblems(lesson) {
  const p = [];
  if (!isStr(lesson?.id)) p.push("lesson id is not a non-empty string");
  if (!isStr(lesson?.title)) p.push("title is not a non-empty string");
  if (!isStr(lesson?.content)) p.push("content is not a non-empty string");
  for (const field of ["concepts", "objectives"]) {
    const v = lesson?.[field];
    if (v === undefined || v === null) continue; // optional — LessonView guards these
    if (!Array.isArray(v)) { p.push(`${field} is not an array (typeof ${typeof v})`); continue; }
    v.forEach((el, i) => {
      if (!isStr(el)) {
        const kind = el === null ? "null" : Array.isArray(el) ? "array" : typeof el;
        p.push(`${field}[${i}] is ${kind}, not a string → LessonView renders it as a React child and throws`);
      }
    });
  }
  return p;
}

// experiment.type must be recognized by the app (or routed per lesson). `types` is the union of
// contentLoader keys + ExperimentSandbox literals; `hasLessonSet` is lessonSets[subject][lessonId].
export function experimentTypeProblems(lesson, { types, hasLessonSet, subject }) {
  const p = [];
  const exp = lesson?.experiment;
  if (exp === undefined || exp === null) return p; // some subjects carry no experiment
  let type;
  if (typeof exp === "string") type = exp;
  else if (typeof exp === "object" && !Array.isArray(exp)) {
    if (!isStr(exp.type)) p.push(`experiment.type is not a non-empty string (${JSON.stringify(exp.type)})`);
    else type = exp.type;
  } else { p.push(`experiment is ${Array.isArray(exp) ? "an array" : typeof exp}, expected a string or object`); }
  if (type === undefined) return p;
  if (types.has(type)) return p;
  if (hasLessonSet) return p; // per-lesson lessonSets routing resolves it even without a config
  p.push(`experiment.type "${type}" is unknown — not an experimentTypes key in contentLoader.js, not a type routed in ExperimentSandbox.jsx, and lessonSets["${subject}"] has no entry for "${lesson.id}" (the Play tab falls back to a generic tool, or nothing)`);
  return p;
}

// ---------------------------------------------------------------------------------------------
if (selfTestOnly) {
  const types = new Set(["drag-drop"]);
  const ctx = { types, hasLessonSet: false, subject: "demo" };
  // green controls
  eq(lessonTypeProblems({ id: "l1", title: "T", content: "C", concepts: ["a", "b"], objectives: ["o"] }).length, 0,
    "self-test: a well-formed lesson has no problems");
  eq(lessonTypeProblems({ id: "l1", title: "T", content: "C" }).length, 0,
    "self-test: concepts/objectives are optional");
  eq(experimentTypeProblems({ id: "l1", experiment: "drag-drop" }, ctx).length, 0,
    "self-test: a known experiment type passes");
  eq(experimentTypeProblems({ id: "l1", experiment: { type: "drag-drop" } }, ctx).length, 0,
    "self-test: an object experiment with a known type passes");
  eq(experimentTypeProblems({ id: "l1", experiment: "text-sort" }, { ...ctx, hasLessonSet: true }).length, 0,
    "self-test: an unknown type passes when the lesson has a per-lesson set");
  // red controls — the exact defects PR #143 shipped
  ok(lessonTypeProblems({ id: "l1", title: "T", content: "C", concepts: [{ term: "a", definition: "b" }] }).length > 0,
    "self-test: an object concept is REJECTED (the #143 white-screen defect)");
  ok(lessonTypeProblems({ id: "l1", title: "T", content: "C", objectives: [{ text: "o" }] }).length > 0,
    "self-test: an object objective is REJECTED");
  ok(lessonTypeProblems({ id: "l1", title: "T", content: "C", concepts: ["ok", 7, null] }).length > 0,
    "self-test: a non-string concept element is REJECTED");
  ok(lessonTypeProblems({ id: "l1", title: "T", content: "C", concepts: "not-an-array" }).length > 0,
    "self-test: a non-array concepts is REJECTED");
  ok(lessonTypeProblems({ id: "l1", title: 42, content: "C" }).length > 0,
    "self-test: a non-string title is REJECTED");
  ok(lessonTypeProblems({ id: "l1", title: "T", content: "" }).length > 0,
    "self-test: empty content is REJECTED");
  ok(experimentTypeProblems({ id: "l1", experiment: "worked-walkthrough" }, ctx).length > 0,
    "self-test: an unknown type with no per-lesson set is REJECTED (the #143 lab bug)");
  ok(experimentTypeProblems({ id: "l1", experiment: { type: "text-sort" } }, ctx).length > 0,
    "self-test: an unknown object experiment.type is REJECTED");
  ok(experimentTypeProblems({ id: "l1", experiment: { type: 5 } }, ctx).length > 0,
    "self-test: a non-string experiment.type is REJECTED");
  ok(experimentTypeProblems({ id: "l1", experiment: ["drag-drop"] }, ctx).length > 0,
    "self-test: an array experiment is REJECTED");
} else {
  // --- load the app's type knowledge + real content -------------------------------------------
  const loaderSrc = exists("src/data/contentLoader.js") ? read("src/data/contentLoader.js") : "";
  const sandboxSrc = exists("src/components/ExperimentSandbox.jsx") ? read("src/components/ExperimentSandbox.jsx") : "";
  const types = experimentTypesFromSource(loaderSrc);
  for (const m of sandboxSrc.matchAll(/"([a-z][a-z0-9-]*)"/g)) types.add(m[1]); // types routed in the component
  ok(types.size > 50, `the app's recognized experiment types were read from source (${types.size} types)`);

  let lessonSets = {};
  try {
    const mod = await import(pathToFileURL(path.join(root, "src/components/lessonSets.js")).href);
    lessonSets = mod.lessonSets || mod.default || {};
  } catch (e) {
    failLines.push(`could not load src/components/lessonSets.js (${e.message})`);
  }

  const contentDir = path.join(root, "content");
  const subjects = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(contentDir, d.name, "modules.json")))
    .map((d) => d.name).sort();
  ok(subjects.length >= 25, `modules.json found for ${subjects.length} subjects`);

  let lessonCount = 0, withExperiment = 0;
  const allIds = new Map(); // subject → Set(lessonId)
  for (const subject of subjects) {
    const rel = `content/${subject}/modules.json`;
    let modules;
    try { modules = JSON.parse(read(rel)); }
    catch (e) { failLines.push(`${rel} is not valid JSON (${e.message})`); continue; }
    if (!Array.isArray(modules)) { failLines.push(`${rel} is not an array of modules`); continue; }

    const moduleIds = modules.map((m) => m?.id);
    eq(new Set(moduleIds).size, moduleIds.length, `${subject}: module ids are unique`);
    ok(moduleIds.every(isStr), `${subject}: every module has a non-empty string id`);

    const ids = new Set();
    for (const [mi, mod] of modules.entries()) {
      ok(Array.isArray(mod?.lessons), `${subject}: module ${mod?.id ?? mi} has a lessons array`);
      for (const lesson of mod?.lessons || []) {
        lessonCount++;
        const where = `${subject}/${mod?.id ?? mi}/${lesson?.id ?? "?"}`;
        for (const problem of lessonTypeProblems(lesson)) failLines.push(`${where}: ${problem}`);
        if (lesson?.id !== undefined) {
          ok(!ids.has(lesson.id), `${where}: lesson id is unique within the subject`);
          ids.add(lesson.id);
        }
        if (lesson?.experiment !== undefined && lesson?.experiment !== null) withExperiment++;
        const set = lessonSets?.[subject]?.[lesson?.id];
        for (const problem of experimentTypeProblems(lesson, {
          types, subject, hasLessonSet: set !== undefined && set !== null,
        })) failLines.push(`${where}: ${problem}`);

        if (Array.isArray(lesson?.figures)) {
          lesson.figures.forEach((f, fi) => {
            if (typeof f !== "object" || f === null || Array.isArray(f)) {
              failLines.push(`${where}: figures[${fi}] is not an object`);
              return;
            }
            if (!isStr(f.src)) failLines.push(`${where}: figures[${fi}].src is not a non-empty string`);
            if (!isStr(f.alt)) failLines.push(`${where}: figures[${fi}].alt is not a non-empty string`);
            if (f.caption !== undefined && typeof f.caption !== "string") {
              failLines.push(`${where}: figures[${fi}].caption is not a string`);
            }
          });
        }
      }
    }
    allIds.set(subject, ids);
  }
  ok(lessonCount > 100, `every lesson in the platform was checked (${lessonCount} lessons)`);
  ok(withExperiment > 0, `lessons with an experiment were found (${withExperiment})`);

  // lessonSets keys must point at real lessons of that subject (unreachable lab content class)
  for (const [subject, byLesson] of Object.entries(lessonSets)) {
    if (!byLesson || typeof byLesson !== "object") { failLines.push(`lessonSets["${subject}"] is not an object`); continue; }
    const realIds = allIds.get(subject);
    if (!realIds) { failLines.push(`lessonSets has a "${subject}" key but content/${subject}/modules.json does not exist`); continue; }
    for (const [lessonId, set] of Object.entries(byLesson)) {
      ok(realIds.has(lessonId), `lessonSets["${subject}"]["${lessonId}"] matches a real lesson id`);
      ok(Array.isArray(set) ? set.length > 0 : (set !== null && typeof set === "object" && Object.keys(set).length > 0),
        `lessonSets["${subject}"]["${lessonId}"] is not empty`);
    }
  }
}

for (const line of failLines.slice(0, 40)) console.log(`  FAIL ${line}`);
if (failLines.length > 40) console.log(`  ... and ${failLines.length - 40} more`);
console.log(`\ncheck-lesson-content-types: ${pass}/${pass + failLines.length} green${failLines.length ? ` (${failLines.length} FAILED)` : ""}${selfTestOnly ? " [self-test]" : ` [root ${root}]`}`);
process.exit(failLines.length ? 1 : 0);
