import { useState } from "react";
import MathWorkingReveal from "./MathWorkingReveal";
import { AREA_COPY as C, rectangleWorking, circleWorking } from "../data/measurementTools";
import {
  MEASUREMENT_TASK_COPY as T,
  measurementTaskFor,
  measurementReveal,
  matchesMeasurementTarget,
} from "../data/measurementTasks";
import "./MeasurementTools.css";

// AreaBuilder — the Play-tab tool for experiment.type "area-builder" (lesson
// perimeter-area). Resize a rectangle (length, width) or a circle (radius) and
// read the area and the perimeter/circumference as they change.
//
// Every word this tool shows comes from AREA_COPY in ../data/measurementTools,
// where tools/check-mathematics-labs.mjs proves each one is taught by
// perimeter-area. Nothing is written into the markup: every text node below is
// an expression, so a new untaught string cannot slip in as bare JSX text.
//
// THE TASK AND THE REVEAL (added 2026-11-18). Until this, the tool was a
// calculator with nothing answerable, so the step-by-step reveal could never
// fire on perimeter-area. The question, its target and its method now live in
// src/data/measurementTasks.js keyed by lessonId; this component only renders
// the prompt for the tab it is on, grades the sliders against the target, and
// shows the method the table hands back. It authors no method of its own, and
// the reveal is never gated on `steps` being present — an answer with no steps
// must still reveal the answer.
//
// With no lessonId (the Mathematics subject-page lab) `measurementTaskFor`
// returns null and this tool renders exactly as it did before the tasks
// existed.

const PX_PER_CM = 16;
const W = 320;
const H = 220;
const CX = W / 2;
const CY = H / 2;

export default function AreaBuilder({ subjectId, lessonId }) {
  const [shape, setShape] = useState("rectangle");
  const [length, setLength] = useState(3);
  const [width, setWidth] = useState(4);
  const [radius, setRadius] = useState(3);

  const isRectangle = shape === "rectangle";
  const rect = rectangleWorking(length, width);
  const circle = circleWorking(radius);
  const steps = isRectangle ? rect.steps : circle.steps;

  // The task for THIS lesson and THIS tab (src/data/measurementTasks.js).
  // null on the subject page and for every lesson without a task.
  const task = measurementTaskFor(subjectId, lessonId, shape);
  // null until "Check my answer" is pressed: { correct, reveal }.
  const [result, setResult] = useState(null);

  // Moving a slider or changing tab changes the answer, so an old verdict must
  // not linger next to it.
  const slide = (setter) => (e) => {
    setResult(null);
    setter(Number(e.target.value));
  };
  const pickShape = (next) => {
    setResult(null);
    setShape(next);
  };

  const handleCheck = () => {
    if (!task) return;
    const correct = matchesMeasurementTarget(shape, { shape, length, width, radius }, task.target);
    setResult({ correct, reveal: measurementReveal({ subjectId, lessonId, taskId: task.id }) });
  };

  return (
    <div className="area-builder">
      {task && (
        <div className="mt-task">
          <p className="mt-task-prompt">
            <strong>{T.yourTask}</strong> {task.prompt}
          </p>
        </div>
      )}
      <div className="mt-shapes">
        <button
          type="button"
          className={`mt-shape-tab ${isRectangle ? "active" : ""}`}
          onClick={() => pickShape("rectangle")}
        >
          {C.shapeRectangle}
        </button>
        <button
          type="button"
          className={`mt-shape-tab ${!isRectangle ? "active" : ""}`}
          onClick={() => pickShape("circle")}
        >
          {C.shapeCircle}
        </button>
      </div>

      <div className="mt-main">
        <svg
          className="mt-canvas"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={isRectangle ? C.shapeRectangle : C.shapeCircle}
        >
          {isRectangle ? (
            <rect
              x={CX - (length * PX_PER_CM) / 2}
              y={CY - (width * PX_PER_CM) / 2}
              width={length * PX_PER_CM}
              height={width * PX_PER_CM}
              fill="#bfdbfe"
              stroke="#2563eb"
              strokeWidth="2"
            />
          ) : (
            <circle cx={CX} cy={CY} r={radius * PX_PER_CM} fill="#bfdbfe" stroke="#2563eb" strokeWidth="2" />
          )}
        </svg>

        <div className="mt-controls">
          {isRectangle ? (
            <>
              <div className="mt-slider-group">
                <label>
                  {C.length}
                  <span>
                    {length} {C.cm}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={length}
                  aria-label={C.length}
                  onChange={slide(setLength)}
                />
              </div>
              <div className="mt-slider-group">
                <label>
                  {C.width}
                  <span>
                    {width} {C.cm}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={width}
                  aria-label={C.width}
                  onChange={slide(setWidth)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mt-slider-group">
                <label>
                  {C.radius}
                  <span>
                    {radius} {C.cm}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={radius}
                  aria-label={C.radius}
                  onChange={slide(setRadius)}
                />
              </div>
              <p className="mt-note">{C.pi}</p>
            </>
          )}

          <div className="mt-readouts">
            <div className="mt-readout">
              <span className="mt-readout-label">{C.area}</span>
              <span className="mt-readout-value" data-readout="area">
                {isRectangle ? rect.area : circle.area} {C.cmSquared}
              </span>
            </div>
            <div className="mt-readout">
              <span className="mt-readout-label">{isRectangle ? C.perimeter : C.circumference}</span>
              <span className="mt-readout-value" data-readout="perimeter">
                {isRectangle ? rect.perimeter : circle.circumference} {C.cm}
              </span>
            </div>
          </div>

          {task && (
            <button type="button" className="mt-check" onClick={handleCheck}>
              {T.checkMyAnswer}
            </button>
          )}

          <p className="mt-formula">{isRectangle ? C.formulaRectArea : C.formulaCircleArea}</p>
          <p className="mt-formula">{isRectangle ? C.formulaRectPerimeter : C.formulaCircleCircumference}</p>

          <div className="mt-worked">
            <div className="mt-worked-title">{C.workedMethod}</div>
            {steps.map((step) => (
              <div className="mt-worked-step" key={step}>
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <MathWorkingReveal
          title={result.correct ? T.correctTitle : T.wrongTitle}
          answer={result.reveal?.answer}
          steps={result.reveal?.steps}
          tone={result.correct ? "right" : "wrong"}
        />
      )}
    </div>
  );
}
