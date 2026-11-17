// The graphing reveal — the differentiator's one hole, held shut.
//
// WHAT WAS WRONG (measured 2026-11-17 on main fd4eff3): three Mathematics
// lessons — `coordinate-geometry`, `quadratic-equations`, `inequalities` — are
// type-keyed to <GraphingCalculator />, which had no question, no submit and no
// right/wrong state. Nothing there was answerable, so the "wrong answer reveals
// the correct answer plus the step-by-step method" loop could never fire on
// them. The other Mathematics lessons reveal through `labReveal`; these three
// own no per-lesson lab set (`tools/check-mathematics-labs.mjs` A2 forbids one,
// because it would shadow the tool), so `check-math-working.mjs` cannot see them
// either — A8 walks only set-owning lessons and A7 only the nine type blocks.
// They were invisible to BOTH harnesses, which is why a green suite never
// mentioned them.
//
// THE FIX THIS GUARDS: the question, the target and the method live in
// src/data/graphingTasks.js keyed by lessonId; <GraphingCalculator /> renders
// the prompt and a "Check my graph" button, grades the student's own sliders
// against the target, and reveals the method from that table. Nothing here
// touches lesson content, the banks, lesson ids or lessonSets.
//
// ASSERTIONS — every one derived from the tree, none from a hand-typed list:
//   G1  every lesson routed to the graphing calculator has a task, and the
//       task's mode is the mode the router draws it in. The three type sets and
//       their modes are READ OUT OF ExperimentSandbox.jsx, the same way
//       check-mathematics-labs reads them — a hand-typed id has gone stale in
//       this repo before (`mat-geo-bearings`).
//   G2  every task has a prompt, an answer and non-empty steps, and the LAST
//       step states that task's answer (token boundary) — the same rule the lab
//       workings follow.
//   G3  corpus rule: every word a task displays is taught by that lesson's own
//       title/content/objectives/concepts. This is what keeps the prompt honest
//       — "parabola" belongs to another lesson, "sliders" is in neither.
//   G4  the arithmetic is re-derived from the PROMPT, independently of the
//       authored steps: two points → gradient and intercept; two roots + A →
//       B and C; an inequality → boundary and direction. A green suite cannot
//       check arithmetic; this can, because it never reads the steps.
//   G5  the reveal comes only from the table: the component imports the
//       resolver, renders MathWorkingReveal, and authors no steps of its own —
//       and the router passes subjectId/lessonId into the tool, without which
//       the reveal could never fire on the real page.
//   G6  nothing reveals for another subject, for a lesson with no task, or for
//       a task id that does not exist.
//
// Usage:
//   node tools/check-graph-reveal.mjs                # the real tree
//   node tools/check-graph-reveal.mjs --red-control   # + the 6 red controls
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { graphingTasks, graphReveal, tasksForLesson } from "../src/data/graphingTasks.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const RED_CONTROL = process.argv.includes("--red-control");

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass += 1;
  else { fail += 1; console.log(`FAIL: ${msg}`); }
};
const section = (t) => console.log(`\n== ${t}`);

// ---------------------------------------------------------------------------
// Text helpers. `fold` is the same generosity check-mathematics-labs uses:
// case, curly quotes and dashes, whitespace. Single letters are algebraic
// symbols (m, c, x, y, A, B, C), not words, so they are left to G4's arithmetic
// instead of the corpus rule.
// ---------------------------------------------------------------------------
const fold = (s) => String(s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();
const wordsOf = (s) => fold(s).match(/[a-z]{2,}/g) || [];

// English function words carry no subject content, so the corpus rule does not
// hold them. This list is deliberately closed and small: a word that is NOT
// here must be taught by the lesson. (The red control RC2 proves it bites on a
// word that is not here — "parabola".)
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
// Does `haystack` state `needle` as a whole token? "x > 5" matches inside
// "so x > 5:" but not inside "x > 50".
const statesToken = (haystack, needle) => {
  const h = fold(haystack);
  const n = fold(needle);
  if (!n) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRe(n)}($|[^a-z0-9])`).test(h);
};

// ---------------------------------------------------------------------------
// The routing, READ OUT OF THE COMPONENT (never hand-typed).
// ---------------------------------------------------------------------------
const sandboxSrc = read("src/components/ExperimentSandbox.jsx");
const typeSetOf = (name) => {
  const at = sandboxSrc.indexOf(`const ${name} = new Set([`);
  if (at === -1) return [];
  const end = sandboxSrc.indexOf("]);", at);
  return [...sandboxSrc.slice(at, end).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
};
// The mode the router gives a type set, read from its own return line.
const routedModeOf = (name) => {
  const m = sandboxSrc.match(new RegExp(`if \\(${name}\\.has\\(t\\)\\) return <GraphingCalculator mode="([a-z-]+)"`));
  return m ? m[1] : null;
};

const GRAPH_SET_NAMES = ["MATH_LINEAR_TYPES", "MATH_PARABOLA_TYPES", "MATH_NUMBERLINE_TYPES"];
const typeToMode = new Map();
for (const name of GRAPH_SET_NAMES) {
  const mode = routedModeOf(name);
  for (const t of typeSetOf(name)) typeToMode.set(t, mode);
}

const modules = JSON.parse(read("content/mathematics/modules.json"));
const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));

// ---------------------------------------------------------------------------
// The checker. It takes its inputs as a parameter so every red control can
// doctor them; the real tree is just one input.
// ---------------------------------------------------------------------------
function graphProblems(input) {
  const problems = [];
  const add = (p) => problems.push(p);
  const { tasks, lessons, typeModes, component, sandbox, reveal } = input;

  // ---- G1: every graphing-routed lesson has a task, in the routed mode -----
  const graphingLessons = lessons.filter((l) => l.experiment && typeModes.has(l.experiment.type));
  if (graphingLessons.length === 0) {
    add("G1: no Mathematics lesson is routed to the graphing calculator — the router or the type sets changed and this harness is now testing nothing");
  }
  for (const l of graphingLessons) {
    const want = typeModes.get(l.experiment.type);
    const list = tasks[l.id];
    if (!Array.isArray(list) || list.length === 0) {
      add(`G1: ${l.id} renders the graphing calculator (experiment.type "${l.experiment.type}" → mode "${want}") but has no task in src/data/graphingTasks.js`);
      continue;
    }
    for (const t of list) {
      if (t.mode !== want) {
        add(`G1: ${l.id}: task "${t.id}" is mode "${t.mode}" but the router draws this lesson in mode "${want}" — the student would never be able to answer it`);
      }
    }
  }
  // A task on a lesson that never renders the tool is dead copy, and worse, it
  // would put one lesson's question inside another lesson's Play tab.
  const graphingIds = new Set(graphingLessons.map((l) => l.id));
  for (const id of Object.keys(tasks)) {
    if (!graphingIds.has(id)) {
      add(`G1: graphingTasks.${id} is not a lesson routed to the graphing calculator (routed lessons: ${[...graphingIds].join(", ")})`);
    }
  }

  // ---- G2: the last step states the answer --------------------------------
  for (const [lessonId, list] of Object.entries(tasks)) {
    for (const t of list) {
      if (!t.id) add(`G2: ${lessonId}: a task has no id`);
      if (!t.prompt || !String(t.prompt).trim()) add(`G2: ${lessonId}/${t.id}: empty prompt`);
      if (!t.answer || !String(t.answer).trim()) add(`G2: ${lessonId}/${t.id}: empty answer`);
      const steps = (t.steps || []).filter(Boolean);
      if (steps.length === 0) { add(`G2: ${lessonId}/${t.id}: no steps authored`); continue; }
      const last = steps[steps.length - 1];
      if (!statesToken(last, t.answer)) {
        add(`G2: ${lessonId}/${t.id}: the LAST step does not state the answer — last step "${last}", answer "${t.answer}"`);
      }
    }
  }

  // ---- G3: corpus rule — every displayed word is taught by the lesson -----
  for (const [lessonId, list] of Object.entries(tasks)) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) continue; // G1 already names a task on a non-lesson
    const corpus = new Set(wordsOf([
      lesson.title, lesson.content, ...(lesson.objectives || []), ...(lesson.concepts || []),
    ].join(" \n ")));
    for (const t of list) {
      const displayed = [t.prompt, t.answer, ...(t.steps || [])];
      for (const s of displayed) {
        const missing = [...new Set(wordsOf(s).filter((w) => !corpus.has(w) && !FUNCTION_WORDS.has(w)))];
        if (missing.length > 0) {
          add(`G3: ${lessonId}/${t.id}: "${missing.join('", "')}" is not taught by that lesson's own copy — displayed as "${s}"`);
        }
      }
    }
  }

  // ---- G4: the arithmetic, re-derived from the PROMPT ---------------------
  for (const [lessonId, list] of Object.entries(tasks)) {
    for (const t of list) {
      const derived = deriveFromPrompt(t.mode, t.prompt);
      if (derived.error) { add(`G4: ${lessonId}/${t.id}: ${derived.error} — prompt "${t.prompt}"`); continue; }
      const target = t.target || {};
      const expectedKeys = TARGET_KEYS[t.mode];
      if (!expectedKeys) { add(`G4: ${lessonId}/${t.id}: mode "${t.mode}" is not a graphing mode this harness can derive`); continue; }
      const keys = Object.keys(target).sort().join(",");
      if (keys !== expectedKeys.slice().sort().join(",")) {
        add(`G4: ${lessonId}/${t.id}: target keys [${Object.keys(target).join(", ")}] — a "${t.mode}" target must be exactly [${expectedKeys.join(", ")}]`);
        continue;
      }
      if (t.mode === "number-line") {
        if (target.ineq !== derived.ineq) {
          add(`G4: ${lessonId}/${t.id}: the prompt solves to x ${derived.ineq} ${derived.boundary} but the target says "${target.ineq}"`);
        }
        if (Math.abs(target.boundary - derived.boundary) > 1e-9) {
          add(`G4: ${lessonId}/${t.id}: the prompt solves to boundary ${derived.boundary} but the target says ${target.boundary}`);
        }
      } else {
        for (const k of expectedKeys) {
          if (Math.abs(Number(target[k]) - Number(derived[k])) > 1e-9) {
            add(`G4: ${lessonId}/${t.id}: the prompt gives ${k} = ${derived[k]} but the target says ${target[k]}`);
          }
        }
      }
      // …and the answer the student is shown must state those same values.
      for (const claim of answerClaims(t.mode, target)) {
        if (!statesToken(t.answer, claim)) {
          add(`G4: ${lessonId}/${t.id}: the answer "${t.answer}" does not state "${claim}", which is what the target grades`);
        }
      }
    }
  }

  // ---- G5: the reveal comes only from the table, and the router wires it --
  if (!/from\s+"\.\.\/data\/graphingTasks"/.test(component)) {
    add("G5: src/components/GraphingCalculator.jsx does not import from ../data/graphingTasks — the reveal would have no table to read");
  }
  if (!component.includes("graphReveal(")) {
    add("G5: GraphingCalculator does not call graphReveal() — the reveal is not wired to the table");
  }
  if (!component.includes("matchesTaskTarget(")) {
    add("G5: GraphingCalculator does not call matchesTaskTarget() — nothing grades the student's graph");
  }
  if (!component.includes("<MathWorkingReveal")) {
    add("G5: GraphingCalculator does not render <MathWorkingReveal /> — a wrong graph would show no answer and no method");
  }
  if (/\bsteps\s*:/.test(component)) {
    add("G5: GraphingCalculator authors its own `steps:` — the method must come from src/data/graphingTasks.js, never from the component");
  }
  for (const name of GRAPH_SET_NAMES) {
    const line = sandbox.match(new RegExp(`if \\(${name}\\.has\\(t\\)\\) return <GraphingCalculator[^\\n]*`));
    if (!line) { add(`G5: ${name} is not routed to <GraphingCalculator />`); continue; }
    if (!/subjectId=/.test(line[0])) add(`G5: ${name} renders <GraphingCalculator /> without subjectId — no task can resolve`);
    if (!/lessonId=\{lessonId\}/.test(line[0])) add(`G5: ${name} renders <GraphingCalculator /> without the lessonId — the task is keyed by lesson, so none would resolve`);
  }

  // ---- G6: nothing reveals for another subject or another lesson ----------
  const noReveal = [
    ["physics", "coordinate-geometry"],
    ["chemistry", "quadratic-equations"],
    ["social-studies", "inequalities"],
    [undefined, "coordinate-geometry"],
    ["mathematics", "real-numbers"],            // a Mathematics lesson with no task
    ["mathematics", "not-a-lesson"],            // a lesson that does not exist
  ];
  for (const [subjectId, lessonId] of noReveal) {
    if (reveal({ subjectId, lessonId }) !== null) {
      add(`G6: graphReveal({ subjectId: ${JSON.stringify(subjectId)}, lessonId: "${lessonId}" }) revealed something — only a Mathematics lesson with a task may reveal`);
    }
  }
  if (reveal({ subjectId: "mathematics", lessonId: "coordinate-geometry", taskId: "not-a-task" }) !== null) {
    add("G6: graphReveal() with a task id that does not exist revealed something");
  }
  for (const id of graphingIds) {
    const r = reveal({ subjectId: "mathematics", lessonId: id });
    if (!r || !r.answer) add(`G6: graphReveal() must reveal the answer for ${id} — a wrong graph has to teach the answer`);
  }
  if (tasksForLesson("physics", "coordinate-geometry", "linear").length > 0) {
    add("G6: tasksForLesson() hands another subject's Play tab a Mathematics task");
  }

  return problems;
}

// The keys a target carries, per mode. B and C are the maths names from
// standard form; the tool's slider state calls them m and c.
const TARGET_KEYS = {
  linear: ["m", "c"],
  parabola: ["a", "B", "C"],
  "number-line": ["ineq", "boundary"],
};

// What the ANSWER must state, given the target — the values the tool grades.
function answerClaims(mode, target) {
  if (mode === "linear") return [`m = ${target.m}`, `c = ${target.c}`];
  if (mode === "parabola") return [`A = ${target.a}`, `B = ${target.B}`, `C = ${target.C}`];
  const sym = { ">": ">", ">=": "≥", "<": "<", "<=": "≤" }[target.ineq];
  return [`${sym} ${target.boundary}`];
}

// ---------------------------------------------------------------------------
// INDEPENDENT RE-DERIVATION. This function never reads `steps` — that is the
// whole point. It reads the question the student was asked and solves it.
// ---------------------------------------------------------------------------
function deriveFromPrompt(mode, prompt) {
  const p = fold(prompt);
  if (mode === "linear") {
    const pts = [...p.matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)]
      .map((m) => [Number(m[1]), Number(m[2])]);
    if (pts.length !== 2) return { error: "the prompt does not state exactly two points (x, y)" };
    const [[x1, y1], [x2, y2]] = pts;
    if (x1 === x2) return { error: "the two points have the same x, so the gradient is undefined" };
    const m = (y2 - y1) / (x2 - x1);
    return { m, c: y1 - m * x1 };
  }
  if (mode === "parabola") {
    const roots = [...p.matchAll(/x\s*=\s*(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    const aMatch = p.match(/\ba\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (roots.length !== 2) return { error: "the prompt does not state exactly two roots x = …" };
    if (!aMatch) return { error: "the prompt does not state A, so the target would not be unique" };
    const a = Number(aMatch[1]);
    return { a, B: -a * (roots[0] + roots[1]), C: a * roots[0] * roots[1] };
  }
  if (mode === "number-line") {
    const m = p.match(/(-?\d*)\s*x\s*(?:([-+])\s*(\d+(?:\.\d+)?)\s*)?(>=|<=|>|<|≥|≤)\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return { error: "the prompt does not state an inequality in x" };
    const coefText = m[1];
    const a = coefText === "" || coefText === "-" ? (coefText === "-" ? -1 : 1) : Number(coefText);
    const b = m[2] ? Number(`${m[2]}${m[3]}`) : 0;
    const opRaw = m[4];
    const rhs = Number(m[5]);
    if (a === 0) return { error: "the inequality has no x-term" };
    // a·x + b  OP  rhs   →   a·x  OP  (rhs − b);  dividing by a negative flips.
    let value = (rhs - b) / a;
    const canonical = { ">": ">", ">=": ">=", "<": "<", "<=": "<=", "≥": ">=", "≤": "<=" }[opRaw];
    const flipped = { ">": "<", ">=": "<=", "<": ">", "<=": ">=" };
    const ineq = a < 0 ? flipped[canonical] : canonical;
    return { ineq, boundary: value };
  }
  return { error: `mode "${mode}" is not derivable` };
}

// ---------------------------------------------------------------------------
// The real tree
// ---------------------------------------------------------------------------
const REAL = {
  tasks: graphingTasks,
  lessons: allLessons,
  typeModes: typeToMode,
  component: read("src/components/GraphingCalculator.jsx"),
  sandbox: sandboxSrc,
  reveal: graphReveal,
};

const cloneReal = () => ({
  tasks: JSON.parse(JSON.stringify(REAL.tasks)),
  lessons: JSON.parse(JSON.stringify(REAL.lessons)),
  typeModes: REAL.typeModes,
  component: REAL.component,
  sandbox: REAL.sandbox,
  reveal: REAL.reveal,
});

section("1. the graphing tasks on the real tree");
{
  const problems = graphProblems(REAL);
  if (problems.length === 0) pass += 1;
  else { fail += problems.length; for (const p of problems) console.log(`FAIL: ${p}`); }
  const routed = allLessons.filter((l) => l.experiment && typeToMode.has(l.experiment.type));
  const taskCount = Object.values(graphingTasks).reduce((n, l) => n + l.length, 0);
  console.log(`    routed: ${routed.length} graphing lesson(s) — ${routed.map((l) => `${l.id} (${l.experiment.type} → ${typeToMode.get(l.experiment.type)})`).join(", ")}`);
  console.log(`    tasks: ${taskCount} across ${Object.keys(graphingTasks).length} lesson(s); ${routed.filter((l) => graphingTasks[l.id]).length} of ${routed.length} graphing lessons carry one`);
  // The positive control: the caller is green on the untouched tree, or the red
  // runs below are a broken caller rather than a bite.
  const again = graphProblems(REAL);
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
    const problems = graphProblems(input);
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
    red("RC1", "the last step no longer states the answer -> G2",
      [/^G2: quadratic-equations\/qe-two-roots: the LAST step does not state the answer/],
      (i) => { i.tasks["quadratic-equations"][0].steps[i.tasks["quadratic-equations"][0].steps.length - 1] = "Standard form is ax² + bx + c = 0"; }),
    red("RC2", "a task word the lesson never teaches (\"parabola\") -> G3",
      [/^G3: quadratic-equations\/qe-two-roots: "parabola" is not taught by that lesson's own copy/],
      (i) => { i.tasks["quadratic-equations"][0].prompt = "Use the roots x = -2 and x = -3, with A = 1, on the parabola. Find B and C."; }),
    red("RC3", "a graphing lesson with no task -> G1",
      [/^G1: inequalities renders the graphing calculator .* but has no task/],
      (i) => { delete i.tasks.inequalities; }),
    red("RC4", "the reveal removed from the component -> G5",
      [/^G5: GraphingCalculator does not render <MathWorkingReveal \/>/],
      (i) => { i.component = i.component.replace(/<MathWorkingReveal/g, "<Unused"); }),
    red("RC5", "a target whose arithmetic disagrees with the prompt -> G4",
      [/^G4: coordinate-geometry\/cg-two-points: the prompt gives m = 3 but the target says 4/],
      (i) => { i.tasks["coordinate-geometry"][0].target.m = 4; }),
    red("RC6", "the subject gate removed from the resolver -> G6",
      [/^G6: graphReveal\(\{ subjectId: "physics"/],
      (i) => {
        // The resolver as it would be with the REVEAL_SUBJECTS guard deleted.
        i.reveal = ({ lessonId, taskId } = {}) => {
          const list = i.tasks[lessonId];
          if (!Array.isArray(list) || list.length === 0) return null;
          const t = taskId ? list.find((x) => x.id === taskId) : list[0];
          return t ? { answer: t.answer, steps: t.steps || [] } : null;
        };
      }),
  ];

  const caughtAll = results.every(Boolean);
  if (caughtAll) pass += 1; else { fail += 1; console.log("FAIL: a red control did not bite"); }
  const green = graphProblems(REAL).length === 0;
  if (green) pass += 1; else { fail += 1; console.log("FAIL: the caller is no longer green on the untouched real tree after the red controls"); }
  console.log(`    ${results.filter(Boolean).length}/${results.length} red controls bit; caller green again: ${green}`);
}

console.log(`\ncheck-graph-reveal: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
