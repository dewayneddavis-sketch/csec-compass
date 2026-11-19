// The two measurement lessons' reveal — the last hole in the differentiator.
//
// WHAT WAS WRONG (measured 2026-11-18 on main cd94115): `perimeter-area` and
// `volume-capacity` are type-keyed to <AreaBuilder /> and <VolumeFiller />.
// Both are measurement calculators — sliders, readouts, a worked method — with
// no question, no submit and no right/wrong state. Nothing there was
// answerable, so "a wrong answer reveals the correct answer plus the
// step-by-step method" could never fire on them. They were the last two of the
// 63 Mathematics lessons; the other 61 reveal (57 through `labReveal` item by
// item, 3 through tools/check-graph-reveal.mjs, 1 through the balance scale).
// They own no per-lesson lab set — tools/check-mathematics-labs.mjs A2 forbids
// one, because it would shadow the tool — so check-math-working.mjs cannot see
// them either (A18 walks only set-owning and drag-type lessons).
//
// THE FIX THIS GUARDS: the question, its target and the method live in
// src/data/measurementTasks.js keyed by lessonId; each tool renders the prompt
// for the tab it is on, grades the student's own sliders against the target,
// and reveals the method from that table. Nothing here touches lesson content,
// the banks, lesson ids or lessonSets.
//
// ASSERTIONS — every one derived from the tree, none from a hand-typed list:
//   M1  every lesson routed to the two tools (derived from MATH_AREA_TYPES /
//       MATH_VOLUME_TYPES in ExperimentSandbox.jsx + modules.json) has a task,
//       each task's `shape` is a tab its tool actually draws, no task is keyed
//       to a lesson that renders another tool — and the routed set is EXACTLY 2,
//       so it cannot shrink to zero and pass.
//   M2  every task has a prompt, an answer and non-empty steps, and the LAST
//       step states that task's answer (token boundary).
//   M3  corpus rule: every word a task displays is taught by that lesson's own
//       title/content/objectives/concepts, or is an English function word. This
//       is what keeps a prompt honest — "garden" belongs to no lesson here.
//   M4  the arithmetic is re-derived from the PROMPT alone, never from the
//       authored steps: rectangle width = area ÷ length, circle r = √(A/3.142),
//       prism width = (L×1000) ÷ (length×height), cylinder h = (L×1000) ÷
//       (3.142 r²). Then the target is checked to be a value the sliders can
//       land on, and the tool's OWN readout at the target is checked to show
//       the number the prompt quotes — if those two disagree the task is wrong.
//       A green suite cannot check arithmetic; this can, because it never reads
//       the steps.
//   M5  the reveal comes only from the table: each tool imports the resolver,
//       grades with matchesMeasurementTarget, renders <MathWorkingReveal /> and
//       authors no `steps:` of its own — and the router passes subjectId and
//       lessonId into both tools, without which no task could resolve.
//   M6  nothing reveals for another subject, for a lesson with no task, or for
//       a task id that does not exist.
//
// Usage:
//   node tools/check-measurement-reveal.mjs                # the real tree
//   node tools/check-measurement-reveal.mjs --red-control   # + the 7 red controls
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  measurementTasks,
  measurementReveal,
  measurementTaskFor,
  matchesMeasurementTarget,
} from "../src/data/measurementTasks.js";
import {
  rectangleWorking,
  circleWorking,
  prismWorking,
  cylinderWorking,
} from "../src/data/measurementTools.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
// The red controls run by DEFAULT: the suite invokes every harness with no
// arguments, so an opt-in flag would mean the shipped suite never proves that
// any of these assertions can bite. Pass --no-red-control to skip them.
const RED_CONTROL = !process.argv.includes("--no-red-control");

let pass = 0;
let fail = 0;
// This checker returns a list of problems rather than a flat list of
// assertions, so a "N passed" total here would count SECTIONS and understate
// what was checked (it printed "2 passed" while M1-M6 ran dozens of checks).
// The closing line therefore names what the harness established instead.
let ROUTED_N = 0;
let TASK_N = 0;
let RED_BIT = 0;
let RED_TOTAL = 0;
const ok = (cond, msg) => {
  if (cond) pass += 1;
  else { fail += 1; console.log(`FAIL: ${msg}`); }
};
const section = (t) => console.log(`\n== ${t}`);

// ---------------------------------------------------------------------------
// Text helpers — the same generosity check-mathematics-labs and
// check-graph-reveal use: case, curly quotes and dashes, whitespace.
// ---------------------------------------------------------------------------
const fold = (s) => String(s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();
const wordsOf = (s) => fold(s).match(/[a-z]{2,}/g) || [];

// English function words carry no subject content, so the corpus rule does not
// hold them. Deliberately closed and small — the same list check-graph-reveal
// uses, and the same list tools/check-mathematics-labs.mjs A13 now applies to
// this task text. (RC2 proves it still bites on a word that is not here.)
const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "by", "for",
  "with", "from", "into", "through", "over", "under", "between", "that",
  "this", "these", "those", "it", "its", "is", "are", "was", "were", "be",
  "been", "being", "so", "if", "as", "then", "than", "not", "no", "all",
  "any", "each", "one", "two", "we", "you", "your", "there", "here", "do",
  "does", "did", "can", "will", "would", "should", "must", "may", "also",
  "just", "only", "very", "both", "same", "more", "most", "other", "such",
]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Does `haystack` state `needle` as a whole token? "width = 2 cm" matches
// inside "so the width = 2 cm" but not inside "width = 20 cm".
const statesToken = (haystack, needle) => {
  const h = fold(haystack);
  const n = fold(needle);
  if (!n) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRe(n)}($|[^a-z0-9])`).test(h);
};

// ---------------------------------------------------------------------------
// The routing and the tools' own sources, READ OUT OF THE TREE (never typed).
// ---------------------------------------------------------------------------
const sandboxSrc = read("src/components/ExperimentSandbox.jsx");
const typeSetOf = (name) => {
  const at = sandboxSrc.indexOf(`const ${name} = new Set([`);
  if (at === -1) return [];
  const end = sandboxSrc.indexOf("]);", at);
  return [...sandboxSrc.slice(at, end).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
};

// Which tool each routed experiment type renders, and the file that renders it.
const TOOLS = {
  "area-builder": { name: "AreaBuilder", file: "src/components/AreaBuilder.jsx" },
  "volume-filler": { name: "VolumeFiller", file: "src/components/VolumeFiller.jsx" },
};
const ROUTED_SETS = { "area-builder": "MATH_AREA_TYPES", "volume-filler": "MATH_VOLUME_TYPES" };

const typeToTool = new Map();
for (const [tool, setName] of Object.entries(ROUTED_SETS)) {
  for (const t of typeSetOf(setName)) typeToTool.set(t, tool);
}

const modules = JSON.parse(read("content/mathematics/modules.json"));
const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));

// The tabs a tool draws, and the slider each target key names, read out of the
// component's own source: `pickShape("rectangle")` / `setShape("circle")` are
// the tabs, and every range input carries `aria-label={C.<key>}` next to its
// min/max/step.
const shapesOf = (src) => {
  const found = new Set();
  for (const m of src.matchAll(/(?:setShape|pickShape)\("([a-z]+)"\)/g)) found.add(m[1]);
  for (const m of src.matchAll(/useState\("([a-z]+)"\)/g)) found.add(m[1]);
  return found;
};
const slidersOf = (src) => {
  const constOf = (name) => {
    const m = src.match(new RegExp(`const ${name} = (\\d+(?:\\.\\d+)?)`));
    return m ? Number(m[1]) : NaN;
  };
  const num = (raw) => {
    const braced = raw.match(/^\{(.+)\}$/);
    if (braced) return constOf(braced[1].trim());
    return Number(raw);
  };
  const out = {};
  const re = /<input\s+type="range"\s+min=("[^"]*"|\{[^}]*\})\s+max=("[^"]*"|\{[^}]*\})\s+step=("[^"]*"|\{[^}]*\})[\s\S]{0,120}?aria-label=\{C\.(\w+)\}/g;
  for (const m of src.matchAll(re)) {
    const unq = (s) => s.replace(/^"|"$/g, "");
    out[m[4]] = { min: num(unq(m[1])), max: num(unq(m[2])), step: num(unq(m[3])) };
  }
  return out;
};

const TOOL_SRC = {};
for (const [tool, info] of Object.entries(TOOLS)) {
  TOOL_SRC[tool] = {
    file: info.file,
    src: read(info.file),
    shapes: shapesOf(read(info.file)),
    sliders: slidersOf(read(info.file)),
  };
}

// ---------------------------------------------------------------------------
// The checker. It takes its inputs as a parameter so every red control can
// doctor them; the real tree is just one input.
// ---------------------------------------------------------------------------
function measurementProblems(input) {
  const problems = [];
  const add = (p) => problems.push(p);
  const { tasks, lessons, typeTools, tools, component = {}, sandbox, reveal, taskFor } = input;

  // ---- M1: every tool-routed lesson has a task, on a tab the tool draws ----
  const routedLessons = lessons.filter((l) => l.experiment && typeTools.has(l.experiment.type));
  if (routedLessons.length !== 2) {
    add(`M1: ${routedLessons.length} Mathematics lesson(s) are routed to the measurement tools — this harness asserts exactly 2 (perimeter-area and volume-capacity), so the routed set cannot shrink to zero and pass`);
  }
  for (const l of routedLessons) {
    const tool = typeTools.get(l.experiment.type);
    const list = tasks[l.id];
    if (!Array.isArray(list) || list.length === 0) {
      add(`M1: ${l.id} renders <${TOOLS[tool].name} /> (experiment.type "${l.experiment.type}") but has no task in src/data/measurementTasks.js`);
      continue;
    }
    const shapes = (tools[tool] && tools[tool].shapes) || new Set();
    for (const t of list) {
      if (!shapes.has(t.shape)) {
        add(`M1: ${l.id}: task "${t.id}" is shape "${t.shape}" but ${tool} draws only [${[...shapes].join(", ")}] — the student could never reach it`);
      }
    }
  }
  // A task on a lesson that never renders the tool is dead copy, and worse, it
  // would put one lesson's question inside another lesson's Play tab.
  const routedIds = new Set(routedLessons.map((l) => l.id));
  for (const id of Object.keys(tasks)) {
    if (!routedIds.has(id)) {
      add(`M1: measurementTasks.${id} is not a lesson routed to a measurement tool (routed lessons: ${[...routedIds].join(", ")})`);
    }
  }

  // ---- M2: the last step states the answer --------------------------------
  for (const [lessonId, list] of Object.entries(tasks)) {
    for (const t of list) {
      if (!t.id) add(`M2: ${lessonId}: a task has no id`);
      if (!t.prompt || !String(t.prompt).trim()) add(`M2: ${lessonId}/${t.id}: empty prompt`);
      if (!t.answer || !String(t.answer).trim()) add(`M2: ${lessonId}/${t.id}: empty answer`);
      const steps = (t.steps || []).filter(Boolean);
      if (steps.length === 0) { add(`M2: ${lessonId}/${t.id}: no steps authored`); continue; }
      const last = steps[steps.length - 1];
      if (!statesToken(last, t.answer)) {
        add(`M2: ${lessonId}/${t.id}: the LAST step does not state the answer — last step "${last}", answer "${t.answer}"`);
      }
    }
  }

  // ---- M3: corpus rule — every displayed word is taught by the lesson -----
  for (const [lessonId, list] of Object.entries(tasks)) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) continue; // M1 already names a task on a non-lesson
    const corpus = new Set(wordsOf([
      lesson.title, lesson.content, ...(lesson.objectives || []), ...(lesson.concepts || []),
    ].join(" \n ")));
    for (const t of list) {
      for (const s of [t.prompt, t.answer, ...(t.steps || [])]) {
        const missing = [...new Set(wordsOf(s).filter((w) => !corpus.has(w) && !FUNCTION_WORDS.has(w)))];
        if (missing.length > 0) {
          add(`M3: ${lessonId}/${t.id}: "${missing.join('", "')}" is not taught by that lesson's own copy — displayed as "${s}"`);
        }
      }
    }
  }

  // ---- M4: the arithmetic, re-derived from the PROMPT ---------------------
  for (const [lessonId, list] of Object.entries(tasks)) {
    const lesson = lessons.find((l) => l.id === lessonId);
    const tool = lesson && lesson.experiment ? typeTools.get(lesson.experiment.type) : null;
    for (const t of list) {
      const derived = deriveFromPrompt(t.shape, t.prompt);
      if (derived.error) { add(`M4: ${lessonId}/${t.id}: ${derived.error} — prompt "${t.prompt}"`); continue; }
      const target = t.target || {};
      const expectedKeys = TARGET_KEYS[t.shape];
      if (!expectedKeys) { add(`M4: ${lessonId}/${t.id}: shape "${t.shape}" is not one this harness can derive`); continue; }
      if (Object.keys(target).sort().join(",") !== expectedKeys.slice().sort().join(",")) {
        add(`M4: ${lessonId}/${t.id}: target keys [${Object.keys(target).join(", ")}] — a "${t.shape}" target must be exactly [${expectedKeys.join(", ")}]`);
        continue;
      }
      for (const k of expectedKeys) {
        // The prompt's own numbers are rounded (0.283 L is 282.78 cm³ to 3
        // d.p.), so a re-derivation may land within a hundredth of the integer
        // the slider can reach — never further. Anything larger is a wrong task.
        if (Math.abs(Number(target[k]) - Number(derived[k])) > DERIVE_TOLERANCE) {
          add(`M4: ${lessonId}/${t.id}: the prompt gives ${k} = ${Number(derived[k].toFixed(4))} but the target says ${target[k]}`);
        }
      }
      // …the answer the student is shown must state those same values…
      for (const claim of answerClaims(t.shape, target)) {
        if (!statesToken(t.answer, claim)) {
          add(`M4: ${lessonId}/${t.id}: the answer "${t.answer}" does not state "${claim}", which is what the target grades`);
        }
      }
      // …the target must be a value the sliders can actually land on…
      const sliders = (tools[tool] && tools[tool].sliders) || {};
      for (const k of expectedKeys) {
        const s = sliders[k];
        if (!s) { add(`M4: ${lessonId}/${t.id}: the tool has no "${k}" slider, so the target could never be reached`); continue; }
        const v = Number(target[k]);
        const onGrid = Math.abs(((v - s.min) / s.step) - Math.round((v - s.min) / s.step)) < 1e-9;
        if (!(v >= s.min && v <= s.max) || !onGrid) {
          add(`M4: ${lessonId}/${t.id}: target ${k} = ${target[k]} is not a value the "${k}" slider can land on (min ${s.min}, max ${s.max}, step ${s.step})`);
        }
      }
      // …and the tool's own readout at the target must show the number the
      // prompt quotes. This is the assertion the brief calls "if any target and
      // its readout disagree, the task is wrong".
      const quoted = quotedNumbers(t.prompt);
      const readout = readoutAt(t.shape, target);
      for (const [label, value] of Object.entries(readout)) {
        if (!quoted.some((q) => Math.abs(q - value) < 1e-9)) {
          add(`M4: ${lessonId}/${t.id}: at the target the ${label} readout shows ${value}, which is not a number the prompt quotes (${quoted.join(", ")})`);
        }
      }
    }
  }

  // ---- M5: the reveal comes only from the table, and the router wires it --
  for (const [tool, info] of Object.entries(tools)) {
    const src = info.src || "";
    if (!/from\s+"\.\.\/data\/measurementTasks"/.test(src)) {
      add(`M5: ${info.file} does not import from ../data/measurementTasks — the reveal would have no table to read`);
    }
    if (!src.includes("measurementReveal(")) {
      add(`M5: ${info.file} does not call measurementReveal() — the reveal is not wired to the table`);
    }
    if (!src.includes("matchesMeasurementTarget(")) {
      add(`M5: ${info.file} does not call matchesMeasurementTarget() — nothing grades the student's sliders`);
    }
    if (!src.includes("<MathWorkingReveal")) {
      add(`M5: ${info.file} does not render <MathWorkingReveal /> — a wrong answer would show no answer and no method`);
    }
    // An object-literal key, not any `steps` followed by a colon: both tools
    // already hold `const steps = isRectangle ? rect.steps : circle.steps`, and
    // a bare \bsteps\s*: reads that ternary's colon as an authored method.
    if (/[{,]\s*steps\s*:/.test(src)) {
      add(`M5: ${info.file} authors its own \`steps:\` — the method must come from src/data/measurementTasks.js, never from the component`);
    }
    // The reveal must not be gated on the steps being present: the table is the
    // only source, and an answer with no steps still has to reveal.
    if (/reveal\?\.steps[^)]*\.length/.test(src) || /steps\.length\s*>/.test(src)) {
      add(`M5: ${info.file} gates the reveal on the steps being present — the DragDropLabel bug; an answer must reveal with or without steps`);
    }
  }
  for (const [tool, setName] of Object.entries(ROUTED_SETS)) {
    const line = sandbox.match(new RegExp(`if \\(${setName}\\.has\\(t\\)\\) return <${TOOLS[tool].name}[^\\n]*`));
    if (!line) { add(`M5: ${setName} is not routed to <${TOOLS[tool].name} />`); continue; }
    if (!/subjectId=/.test(line[0])) add(`M5: ${setName} renders <${TOOLS[tool].name} /> without subjectId — no task can resolve`);
    if (!/lessonId=\{lessonId\}/.test(line[0])) add(`M5: ${setName} renders <${TOOLS[tool].name} /> without the lessonId — the task is keyed by lesson, so none would resolve`);
  }

  // ---- M6: nothing reveals for another subject or another lesson ----------
  const noReveal = [
    ["physics", "perimeter-area"],
    ["chemistry", "volume-capacity"],
    ["social-studies", "perimeter-area"],
    [undefined, "volume-capacity"],
    ["mathematics", "real-numbers"],   // a Mathematics lesson with no task
    ["mathematics", "not-a-lesson"],   // a lesson that does not exist
  ];
  for (const [subjectId, lessonId] of noReveal) {
    if (reveal({ subjectId, lessonId }) !== null) {
      add(`M6: measurementReveal({ subjectId: ${JSON.stringify(subjectId)}, lessonId: "${lessonId}" }) revealed something — only a Mathematics lesson with a task may reveal`);
    }
    if (taskFor(subjectId, lessonId, "rectangle") !== null) {
      add(`M6: measurementTaskFor({ subjectId: ${JSON.stringify(subjectId)}, lessonId: "${lessonId}" }) handed out a task — only a Mathematics lesson with a task may have one`);
    }
  }
  if (reveal({ subjectId: "mathematics", lessonId: "perimeter-area", taskId: "not-a-task" }) !== null) {
    add("M6: measurementReveal() with a task id that does not exist revealed something");
  }
  for (const id of routedIds) {
    const r = reveal({ subjectId: "mathematics", lessonId: id });
    if (!r || !r.answer) add(`M6: measurementReveal() must reveal the answer for ${id} — a wrong answer has to teach the answer`);
    if (!r || !Array.isArray(r.steps) || r.steps.length === 0) add(`M6: measurementReveal() must reveal a METHOD for ${id} — an answer with no steps is the DragDropLabel bug`);
  }

  return problems;
}

// The keys a target carries, per tab.
const TARGET_KEYS = {
  rectangle: ["length", "width"],
  circle: ["radius"],
  prism: ["length", "width", "height"],
  cylinder: ["radius", "height"],
};

// The prompt's capacity is quoted rounded (0.283 L for 282.78 cm³), so a
// re-derivation lands within a hundredth of the integer slider value.
const DERIVE_TOLERANCE = 0.01;

// What the ANSWER must state, given the target — the values the tool grades.
function answerClaims(shape, target) {
  if (shape === "rectangle") return [`length ${target.length} cm`, `width ${target.width} cm`];
  if (shape === "circle") return [`r = ${target.radius}`];
  if (shape === "prism") return [`width = ${target.width} cm`];
  return [`height = ${target.height} cm`];
}

// Every number the prompt quotes, for the readout agreement check.
function quotedNumbers(prompt) {
  return [...fold(prompt).matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
}

// The tool's OWN readout at the target for the ONE quantity the prompt quotes —
// the sums from src/data/measurementTools.js, which are what the student sees on
// screen. The other readout (a perimeter, a volume in cm³) is not quoted by the
// prompt and is not held to it.
function readoutAt(shape, target) {
  if (shape === "rectangle") {
    return { area: rectangleWorking(target.length, target.width).area };
  }
  if (shape === "circle") {
    return { area: circleWorking(target.radius).area };
  }
  if (shape === "prism") {
    return { capacity: prismWorking(target.length, target.width, target.height).litres };
  }
  return { capacity: cylinderWorking(target.radius, target.height).litres };
}

// ---------------------------------------------------------------------------
// INDEPENDENT RE-DERIVATION. This function never reads `steps` — that is the
// whole point. It reads the question the student was asked and solves it.
// ---------------------------------------------------------------------------
function deriveFromPrompt(shape, prompt) {
  const p = fold(prompt);
  const area = p.match(/area of (\d+(?:\.\d+)?)/);
  const length = p.match(/length of (\d+(?:\.\d+)?)/);
  const height = p.match(/height of (\d+(?:\.\d+)?)/);
  const radius = p.match(/radius of (\d+(?:\.\d+)?)/);
  const capacity = p.match(/capacity of (\d+(?:\.\d+)?)\s*l\b/);
  const num = (m) => (m ? Number(m[1]) : null);

  if (shape === "rectangle") {
    if (num(area) === null) return { error: "the prompt does not state an area" };
    if (num(length) === null) return { error: "the prompt does not state a length" };
    return { length: num(length), width: num(area) / num(length) };
  }
  if (shape === "circle") {
    if (num(area) === null) return { error: "the prompt does not state an area" };
    return { radius: Math.sqrt(num(area) / 3.142) };
  }
  if (shape === "prism") {
    if (num(capacity) === null) return { error: "the prompt does not state a capacity in litres" };
    if (num(length) === null) return { error: "the prompt does not state a length" };
    if (num(height) === null) return { error: "the prompt does not state a height" };
    return {
      length: num(length),
      height: num(height),
      width: (num(capacity) * 1000) / (num(length) * num(height)),
    };
  }
  if (shape === "cylinder") {
    if (num(capacity) === null) return { error: "the prompt does not state a capacity in litres" };
    if (num(radius) === null) return { error: "the prompt does not state a radius" };
    return {
      radius: num(radius),
      height: (num(capacity) * 1000) / (3.142 * num(radius) * num(radius)),
    };
  }
  return { error: `shape "${shape}" is not derivable` };
}

// ---------------------------------------------------------------------------
// The real tree
// ---------------------------------------------------------------------------
const REAL = {
  tasks: measurementTasks,
  lessons: allLessons,
  typeTools: typeToTool,
  tools: TOOL_SRC,
  sandbox: sandboxSrc,
  reveal: measurementReveal,
  taskFor: measurementTaskFor,
};

const cloneReal = () => ({
  tasks: JSON.parse(JSON.stringify(REAL.tasks)),
  lessons: JSON.parse(JSON.stringify(REAL.lessons)),
  typeTools: REAL.typeTools,
  tools: { ...REAL.tools },
  sandbox: REAL.sandbox,
  reveal: REAL.reveal,
  taskFor: REAL.taskFor,
});

section("1. the measurement tasks on the real tree");
{
  const problems = measurementProblems(REAL);
  if (problems.length === 0) pass += 1;
  else { fail += problems.length; for (const p of problems) console.log(`FAIL: ${p}`); }
  const routed = allLessons.filter((l) => l.experiment && typeToTool.has(l.experiment.type));
  const taskCount = Object.values(measurementTasks).reduce((n, l) => n + l.length, 0);
  console.log(`    routed: ${routed.length} measurement lesson(s) — ${routed.map((l) => `${l.id} (${l.experiment.type} → <${TOOLS[typeToTool.get(l.experiment.type)].name} />)`).join(", ")}`);
  console.log(`    tasks: ${taskCount} across ${Object.keys(measurementTasks).length} lesson(s); ${routed.filter((l) => measurementTasks[l.id]).length} of ${routed.length} measurement lessons carry one`);
  ROUTED_N = routed.length;
  TASK_N = taskCount;
  // The positive control: the caller is green on the untouched tree, or the red
  // runs below are a broken caller rather than a bite.
  const again = measurementProblems(REAL);
  if (again.length === 0) pass += 1;
  else { fail += 1; console.log("FAIL: the caller is not green on the real tree, so the red runs below prove nothing"); }
}

// ---------------------------------------------------------------------------
// Red controls. Each doctors the INPUT, must produce a failure matching a named
// regex, and then the caller must be green again on the untouched tree.
// ---------------------------------------------------------------------------
if (RED_CONTROL) {
  section("2. red controls — every assertion is proved to bite");
  const red = (name, why, expect, mutate) => {
    const input = cloneReal();
    mutate(input);
    const problems = measurementProblems(input);
    const missed = expect.filter((re) => !problems.some((p) => re.test(p)));
    const caught = missed.length === 0;
    console.log(`${caught ? "ok  " : "MISS"} ${name} — ${why}`);
    if (!caught) {
      console.log(`     expected ${expect.map(String).join(" | ")}`);
      console.log(`     got ${problems.slice(0, 3).join(" | ") || "(nothing)"}`);
    }
    return caught;
  };

  const results = [
    red("RC1", "the last step no longer states the answer -> M2",
      [/^M2: perimeter-area\/pa-rectangle-sides: the LAST step does not state the answer/],
      (i) => {
        const steps = i.tasks["perimeter-area"][0].steps;
        steps[steps.length - 1] = "The rectangle has those sides";
      }),
    red("RC2", "a task word the lesson never teaches (\"garden\") -> M3",
      [/^M3: perimeter-area\/pa-rectangle-sides: "garden" is not taught by that lesson's own copy/],
      (i) => { i.tasks["perimeter-area"][0].prompt = "A garden with an area of 24 cm² and a length of 8 cm."; }),
    red("RC3", "a tool-routed lesson with no task -> M1",
      [/^M1: volume-capacity renders <VolumeFiller \/> .* but has no task/],
      (i) => { delete i.tasks["volume-capacity"]; }),
    red("RC4", "the reveal removed from a tool -> M5",
      [/^M5: src\/components\/VolumeFiller.jsx does not render <MathWorkingReveal \/>/],
      (i) => {
        i.tools = { ...i.tools, "volume-filler": { ...i.tools["volume-filler"], src: i.tools["volume-filler"].src.replace(/<MathWorkingReveal/g, "<Unused") } };
      }),
    red("RC5", "a target whose arithmetic disagrees with the prompt -> M4",
      [/^M4: perimeter-area\/pa-rectangle-sides: the prompt gives width = 3 but the target says 4/],
      (i) => { i.tasks["perimeter-area"][0].target.width = 4; }),
    red("RC6", "the subject gate removed from the resolver -> M6",
      [/^M6: measurementReveal\(\{ subjectId: "physics"/],
      (i) => {
        i.reveal = ({ lessonId, taskId } = {}) => {
          const list = i.tasks[lessonId];
          if (!Array.isArray(list) || list.length === 0) return null;
          const t = taskId ? list.find((x) => x.id === taskId) : list[0];
          return t ? { answer: t.answer, steps: t.steps || [] } : null;
        };
      }),
    red("RC7", "the router stops passing the lessonId into a tool -> M5",
      [/^M5: MATH_VOLUME_TYPES renders <VolumeFiller \/> without the lessonId/],
      (i) => {
        i.sandbox = i.sandbox.replace(
          'if (MATH_VOLUME_TYPES.has(t)) return <VolumeFiller subjectId="mathematics" lessonId={lessonId} />;',
          "if (MATH_VOLUME_TYPES.has(t)) return <VolumeFiller />;");
      }),
  ];

  const caughtAll = results.every(Boolean);
  if (caughtAll) pass += 1; else { fail += 1; console.log("FAIL: a red control did not bite"); }
  const green = measurementProblems(REAL).length === 0;
  if (green) pass += 1; else { fail += 1; console.log("FAIL: the caller is no longer green on the untouched real tree after the red controls"); }
  RED_BIT = results.filter(Boolean).length;
  RED_TOTAL = results.length;
  console.log(`    ${RED_BIT}/${RED_TOTAL} red controls bit; caller green again: ${green}`);
}

const reds = RED_CONTROL ? `, ${RED_BIT}/${RED_TOTAL} red controls bit` : " (red controls SKIPPED)";
console.log(`\ncheck-measurement-reveal: ${fail === 0 ? "green" : "RED"} — M1-M6 clean over ${ROUTED_N} measurement lesson(s) and ${TASK_N} task(s)${reds}, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
