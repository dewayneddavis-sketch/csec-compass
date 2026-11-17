// The three Mathematics lessons whose Play tab is the GraphingCalculator.
//
// THE HOLE THIS FILE CLOSES (measured 2026-11-17 on main fd4eff3):
// `coordinate-geometry`, `quadratic-equations` and `inequalities` render
// <GraphingCalculator />, which had no question, no submit and no right/wrong
// state. Nothing there was answerable, so the step-by-step reveal the whole
// product is sold on could never fire: the student dragged sliders and the tool
// printed their own equation back. The other 48 Mathematics lessons that own a
// per-lesson lab set reveal through `labReveal` (src/data/mathWorking.js); the
// three graphing lessons own no set — `tools/check-mathematics-labs.mjs` A2
// fails any type-keyed lesson that carries one, because it would shadow this
// tool — so the question has to live here instead.
//
// KEYED BY lessonId, NEVER BY mode. The "linear" mode is shared by five type
// keys, including the subject-level fallback `graphing-calc`, so a mode-keyed
// table would put Coordinate Geometry's task on the Mathematics subject page
// for every lesson that falls through to the generic graph. `lessonId` is the
// only key that identifies the lesson actually being taught.
//
// Each task is:
//   { id, mode, prompt, target, answer, steps }
//     mode   — which GraphingCalculator mode answers it: "linear" |
//              "parabola" | "number-line". Must equal the mode the router gives
//              that lesson's experiment type (tools/check-graph-reveal.mjs G1).
//     target — the slider state that answers the prompt. Keys are the MATHS
//              names from the lesson's own copy, not the component's state
//              names: linear is { m, c } (y = mx + c, so the slider labelled
//              "Y-Intercept (b)" is c), parabola is { a, B, C } (standard form
//              ax² + bx + c), number-line is { ineq, boundary } with ineq one of
//              ">", ">=", "<", "<=".
//     answer — the correct answer as the student reads it. The LAST step must
//              state it (G2), the same rule the lab workings follow.
//     steps  — the numbered method. Every word must be taught by that lesson's
//              own title/content/objectives/concepts (G3), and the arithmetic
//              is re-derived from the prompt by the harness (G4) — a green suite
//              cannot check arithmetic, so the derivation is the assurance.
//
// Zero content-JSON work: nothing here touches modules.json, the practice bank,
// the knowledge check, lesson ids or lesson copy.
import { REVEAL_SUBJECTS } from "./mathWorking.js";

export const graphingTasks = {
  // ---- Coordinate Geometry — y = mx + c, mode "linear" ---------------------
  // Corpus traps: "sliders" does not appear in this lesson's copy, and neither
  // does "through" — it is a preposition and the corpus rule allows English
  // function words, but every content word below is in the lesson verbatim.
  "coordinate-geometry": [
    {
      id: "cg-two-points",
      mode: "linear",
      prompt: "Find the equation of the line through the points (1, 2) and (4, 11).",
      target: { m: 3, c: -1 },
      answer: "y = 3x - 1 (m = 3, c = -1)",
      steps: [
        "The gradient (slope) of a line is m = (y2 - y1) / (x2 - x1)",
        "m = (11 - 2) / (4 - 1) = 9 / 3",
        "m = 3",
        "The equation of a straight line is y = mx + c",
        "Substitute one point to find c: 2 = 3(1) + c",
        "3 + c = 2, so c = -1",
        "The equation is y = 3x - 1 (m = 3, c = -1)",
      ],
    },
  ],

  // ---- Quadratic Equations — ax² + bx + c, mode "parabola" ----------------
  // Corpus trap: "parabola" is NOT in this lesson's copy (it belongs to
  // linear-and-quadratic-graphs), so the prompt never says it. A = 1 is
  // required for the target to be unique: with A free, (2, 10, 12) draws the
  // same two roots.
  "quadratic-equations": [
    {
      id: "qe-two-roots",
      mode: "parabola",
      prompt: "Use the roots x = -2 and x = -3, with A = 1. Find B and C.",
      target: { a: 1, B: 5, C: 6 },
      answer: "A = 1, B = 5, C = 6",
      steps: [
        "Two numbers that multiply to 6 and add to 5 are 2 and 3",
        "So (x + 2)(x + 3) = x² + 3x + 2x + 6",
        "x² + 3x + 2x + 6 = x² + 5x + 6",
        "Standard form is ax² + bx + c = 0, so A = 1, B = 5, C = 6",
      ],
    },
  ],

  // ---- Linear Inequalities — mode "number-line" ---------------------------
  // Both examples are worked verbatim in the lesson's content, including the
  // sign flip when dividing by a negative.
  inequalities: [
    {
      id: "in-three-x-minus-five",
      mode: "number-line",
      prompt: "Show the solution of 3x - 5 > 10.",
      target: { ineq: ">", boundary: 5 },
      answer: "x > 5",
      steps: [
        "Add 5 to both sides: 3x > 15",
        "Divide both sides by 3: x > 5",
        "So the solution is x > 5: all numbers greater than 5",
      ],
    },
    {
      id: "in-minus-two-x",
      mode: "number-line",
      prompt: "Show the solution of -2x ≤ 8.",
      target: { ineq: ">=", boundary: -4 },
      answer: "x ≥ -4",
      steps: [
        "Divide both sides by -2: 8 ÷ (-2) = -4",
        "Dividing by a negative number flips the inequality sign",
        "So the solution is x ≥ -4",
      ],
    },
  ],
};

// How close a slider has to be. Every slider steps by 0.1 (the number line by
// 0.5), so half a step is a genuine "on the target", and a student cannot land
// on the answer by accident with a neighbouring value.
export const TARGET_TOLERANCE = 0.05;

// The tasks for one lesson, filtered to the mode this calculator is drawing in.
// Returns [] for any other subject and for any lesson without a task, so the
// component falls back to exactly the tool it rendered before this file
// existed.
export function tasksForLesson(subjectId, lessonId, mode) {
  if (!REVEAL_SUBJECTS.has(subjectId)) return [];
  const tasks = graphingTasks[lessonId];
  if (!Array.isArray(tasks)) return [];
  return mode ? tasks.filter((t) => t.mode === mode) : tasks;
}

// The "always show the correct answer" rule for a graph task — the sibling of
// `labReveal`. Mathematics-only (same named REVEAL_SUBJECTS set), null when the
// lesson has no task or the id does not resolve, so nothing can reveal for
// another subject or another lesson's question.
export function graphReveal({ subjectId, lessonId, taskId } = {}) {
  if (!REVEAL_SUBJECTS.has(subjectId)) return null;
  const tasks = graphingTasks[lessonId];
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  const task = taskId ? tasks.find((t) => t.id === taskId) : tasks[0];
  if (!task) return null;
  if (!task.answer && !(task.steps || []).length) return null;
  return { answer: task.answer, steps: (task.steps || []).filter(Boolean) };
}

const near = (a, b) => Math.abs(Number(a) - Number(b)) <= TARGET_TOLERANCE;

// Does the student's slider state answer the task?
// `state` is the component's own state: { m, b, a, c, ineq, boundary }, where
// the parabola sliders labelled B and C are held in `m` and `c`.
export function matchesTaskTarget(mode, state, target) {
  if (!target) return false;
  if (mode === "number-line") {
    return state.ineq === target.ineq && near(state.boundary, target.boundary);
  }
  if (mode === "parabola") {
    return near(state.a, target.a) && near(state.m, target.B) && near(state.c, target.C);
  }
  return near(state.m, target.m) && near(state.b, target.c);
}
