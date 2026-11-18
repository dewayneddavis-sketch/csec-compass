// The two Mathematics measurement lessons' Play-tab tasks.
//
// THE HOLE THIS FILE CLOSES (measured 2026-11-18 on main cd94115):
// `perimeter-area` and `volume-capacity` render <AreaBuilder /> and
// <VolumeFiller />, which had no question, no submit and no right/wrong state —
// they are measurement calculators, so there was nothing to be wrong about.
// Nothing answerable meant the step-by-step reveal the product is sold on could
// never fire there: 61 of 63 Mathematics lessons revealed, these two did not.
// They own no per-lesson lab set — tools/check-mathematics-labs.mjs A2 fails any
// type-keyed lesson that carries one, because it would shadow the tool — so the
// question has to live here, exactly as it does for the graphing lessons in
// src/data/graphingTasks.js.
//
// KEYED BY lessonId, NEVER BY experiment.type. Both tools are also reachable
// from the Mathematics subject page, where there is no lessonId at all; a
// type-keyed table would put one lesson's question on that page.
//
// Each task is:
//   { id, shape, prompt, target, answer, steps }
//     shape  — the tab that answers it, using the tool's OWN state value:
//              AreaBuilder is "rectangle" | "circle", VolumeFiller is "prism" |
//              "cylinder" (the `useState` default in each component). The task
//              shown is the one whose shape matches the active tab.
//     target — the slider state that answers the prompt, keyed by the slider's
//              maths name. Every value is an integer the slider can land on, and
//              the target state makes the tool's own readouts show exactly the
//              number the prompt quotes — if a target and its readout disagreed,
//              the task would be wrong, not the readout.
//     answer — the correct answer as the student reads it. The LAST step must
//              state it (M2), the same rule the lab workings follow.
//     steps  — the numbered method. Every word must be taught by that lesson's
//              own title/content/objectives/concepts, or be an English function
//              word (M3, and A13 of tools/check-mathematics-labs.mjs), and the
//              arithmetic is re-derived from the prompt alone by
//              tools/check-measurement-reveal.mjs (M4) — a green suite cannot
//              check arithmetic, so that derivation is the assurance.
//
// ROUNDING IS WRITTEN WHERE IT HAPPENS. The cylinder's prompt quotes 0.283 L
// where the exact volume is 282.78 cm³, so 283 ÷ 28.278 = 10.007 and the step
// says so before it says 10.0 cm to 1 d.p. A student who divides and gets
// 10.007 must not be told they are wrong.
//
// Zero content-JSON work: nothing here touches modules.json, the practice bank,
// the knowledge check, lesson ids or lesson copy.
import { REVEAL_SUBJECTS } from "./mathWorking.js";

export const measurementTasks = {
  // ---- Perimeter and Area — the rectangle tab -----------------------------
  // Readout at the target: area 24 cm², perimeter 22 cm. The prompt quotes 24.
  "perimeter-area": [
    {
      id: "pa-rectangle-sides",
      shape: "rectangle",
      prompt: "A rectangle with an area of 24 cm² and a length of 8 cm. Drag the Length and Width sliders to its sides.",
      target: { length: 8, width: 3 },
      answer: "length 8 cm and width 3 cm",
      steps: [
        "Area of a rectangle = length × width",
        "24 = 8 × width, so width = 24 ÷ 8 = 3 cm",
        "Perimeter = 2(length + width) = 2(8 + 3) = 2 × 11 = 22 cm",
        "The rectangle is length 8 cm and width 3 cm",
      ],
    },
    {
      // ---- Perimeter and Area — the circle tab ----------------------------
      // Readout at the target: area 28.28 cm², circumference 18.85 cm. The
      // prompt quotes the area; 28.28 ÷ 3.142 = 9.0006, not 9, so the step says
      // so rather than pretending the division is exact.
      id: "pa-circle-radius",
      shape: "circle",
      prompt: "A circle with an area of 28.28 cm². Drag the Radius slider to its radius.",
      target: { radius: 3 },
      answer: "r = 3 cm",
      steps: [
        "Area = πr², and π ≈ 3.142",
        "28.28 = 3.142 × r², so r² = 28.28 ÷ 3.142 = 9.0006 ≈ 9",
        "r = 3 cm, so the circumference = 2 × 3.142 × 3 = 18.85 cm",
      ],
    },
  ],

  // ---- Volume and Capacity — the prism tab --------------------------------
  // Readout at the target: base area 12 cm², volume 108 cm³, capacity 0.108 L.
  // The prompt quotes the capacity. 0.108 L is exactly 108 cm³, so there is no
  // rounding to declare here.
  "volume-capacity": [
    {
      id: "vc-prism-width",
      shape: "prism",
      prompt: "Find the width of a rectangular prism with a capacity of 0.108 L, a length of 6 cm and a height of 9 cm.",
      target: { length: 6, width: 2, height: 9 },
      answer: "width = 2 cm",
      steps: [
        "1 L = 1000 cm³, so a capacity of 0.108 L = 0.108 × 1000 = 108 cm³",
        "The volume is V = A_base × h, so the base area = 108 ÷ 9 = 12 cm²",
        "A_base = length × width, so width = 12 ÷ 6 = 2 cm",
        "So the width = 2 cm",
      ],
    },
    {
      // ---- Volume and Capacity — the cylinder tab -------------------------
      // Readout at the target: base area 28.28 cm², volume 282.78 cm³, capacity
      // 0.283 L. The prompt quotes the capacity, which is the volume rounded to
      // 3 d.p.; 283 ÷ 28.278 = 10.007, so the step shows that division and then
      // the height it rounds to, never 283 ÷ 28.278 = 10 as if it were exact.
      id: "vc-cylinder-height",
      shape: "cylinder",
      prompt: "Find the height of a cylinder with a capacity of 0.283 L and a radius of 3 cm.",
      target: { radius: 3, height: 10 },
      answer: "height = 10 cm",
      steps: [
        "The volume is 282.78 cm³, so the capacity is 0.283 L (282.78 ÷ 1000 = 0.283)",
        "The base area = πr² = 3.142 × 9 = 28.278 cm²",
        "V = πr²h, so h = 283 ÷ 28.278 = 10.007, and h = 10.0 cm to 1 d.p.",
        "So the height = 10 cm",
      ],
    },
  ],
};

// The two tools' panel words. They are UI chrome ("Check my answer", "Your
// task"), not subject content, so they are NOT held to the corpus rule the task
// text is held to — the same way <GraphingCalculator />'s "Check my graph" is
// not. They live here rather than in the components so neither component has to
// carry a bare JSX text node, which is what A13 of tools/check-mathematics-labs
// forbids (a literal in the markup would bypass the corpus check entirely).
export const MEASUREMENT_TASK_COPY = {
  yourTask: "Your task",
  checkMyAnswer: "Check my answer",
  correctTitle: "Correct — here is the method",
  wrongTitle: "Not quite — here is the method",
};

// How close a slider has to be. Both tools' sliders step by 1, and every target
// is an integer, so half a step is a genuine "on the target" and a student
// cannot land on the answer by accident with a neighbouring value.
export const TARGET_TOLERANCE = 0.05;

// The task for one lesson and one tab. null for any other subject, for the
// subject-page lab (no lessonId) and for a tab with no task, so the tool then
// renders exactly as it did before this file existed.
export function measurementTaskFor(subjectId, lessonId, shape) {
  if (!REVEAL_SUBJECTS.has(subjectId)) return null;
  const tasks = measurementTasks[lessonId];
  if (!Array.isArray(tasks)) return null;
  return tasks.find((t) => t.shape === shape) || null;
}

// The "always show the correct answer" rule for a measurement task — the
// sibling of `labReveal` and `graphReveal`. Mathematics-only (same named
// REVEAL_SUBJECTS set), null when the lesson has no task or the id does not
// resolve, so nothing can reveal for another subject or another lesson.
//
// It is deliberately NOT gated on `steps` being present: a task with an answer
// and no steps must still reveal the answer (that gate was the DragDropLabel
// bug — an answer shown with steps: [] and nothing said about it).
export function measurementReveal({ subjectId, lessonId, taskId } = {}) {
  if (!REVEAL_SUBJECTS.has(subjectId)) return null;
  const tasks = measurementTasks[lessonId];
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  const task = taskId ? tasks.find((t) => t.id === taskId) : tasks[0];
  if (!task) return null;
  return { answer: task.answer, steps: (task.steps || []).filter(Boolean) };
}

const near = (a, b) => Math.abs(Number(a) - Number(b)) <= TARGET_TOLERANCE;

// Does the student's slider state answer the task? `state` is the component's
// own state, including the tab it is on: the tab must be the task's shape, or
// the right numbers on the wrong tab would score.
export function matchesMeasurementTarget(shape, state, target) {
  if (!target || !state) return false;
  if (state.shape !== shape) return false;
  return Object.keys(target).every((k) => near(state[k], target[k]));
}
