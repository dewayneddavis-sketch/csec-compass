import { useState } from "react";
import MathWorkingReveal from "./MathWorkingReveal";
import { VOLUME_COPY as C, prismWorking, cylinderWorking } from "../data/measurementTools";
import {
  MEASUREMENT_TASK_COPY as T,
  measurementTaskFor,
  measurementReveal,
  matchesMeasurementTarget,
} from "../data/measurementTasks";
import "./MeasurementTools.css";

// VolumeFiller — the Play-tab tool for experiment.type "volume-filler" (lesson
// volume-capacity). Fill a rectangular prism or a cylinder with water to a
// chosen height and read the volume in cm³ and the capacity in litres as the
// water rises.
//
// Every word this tool shows comes from VOLUME_COPY in ../data/measurementTools,
// where tools/check-mathematics-labs.mjs proves each one is taught by
// volume-capacity. Every text node below is an expression, never bare JSX text.
//
// THE TASK AND THE REVEAL (added 2026-11-18). Until this, the tool was a
// calculator with nothing answerable, so the step-by-step reveal could never
// fire on volume-capacity. The question, its target and its method now live in
// src/data/measurementTasks.js keyed by lessonId; this component only renders
// the prompt for the tab it is on, grades the sliders against the target, and
// shows the method the table hands back. It authors no method of its own, and
// the reveal is never gated on `steps` being present — an answer with no steps
// must still reveal the answer.
//
// With no lessonId (the Mathematics subject-page lab) `measurementTaskFor`
// returns null and this tool renders exactly as it did before the tasks
// existed.

const PX_PER_CM = 12;
const W = 320;
const H = 240;
const CX = W / 2;
const MAX_HEIGHT = 12;
const BASE_Y = H - 30;
const TANK_W = 90;

export default function VolumeFiller({ subjectId, lessonId }) {
  const [shape, setShape] = useState("prism");
  const [length, setLength] = useState(4);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(5);
  const [radius, setRadius] = useState(3);

  const isPrism = shape === "prism";
  const prism = prismWorking(length, width, height);
  const cylinder = cylinderWorking(radius, height);
  const steps = isPrism ? prism.steps : cylinder.steps;
  const volume = isPrism ? prism.volume : cylinder.volume;
  const litres = isPrism ? prism.litres : cylinder.litres;
  const baseArea = isPrism ? prism.baseArea : cylinder.baseArea;

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
    const correct = matchesMeasurementTarget(shape, { shape, length, width, height, radius }, task.target);
    setResult({ correct, reveal: measurementReveal({ subjectId, lessonId, taskId: task.id }) });
  };

  const tankW = isPrism ? TANK_W : radius * 2 * PX_PER_CM;
  const tankTop = BASE_Y - MAX_HEIGHT * PX_PER_CM;
  const waterH = height * PX_PER_CM;
  const waterY = BASE_Y - waterH;

  return (
    <div className="volume-filler">
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
          className={`mt-shape-tab ${isPrism ? "active" : ""}`}
          onClick={() => pickShape("prism")}
        >
          {C.shapePrism}
        </button>
        <button
          type="button"
          className={`mt-shape-tab ${!isPrism ? "active" : ""}`}
          onClick={() => pickShape("cylinder")}
        >
          {C.shapeCylinder}
        </button>
      </div>

      <div className="mt-main">
        <svg
          className="mt-canvas"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={isPrism ? C.shapePrism : C.shapeCylinder}
        >
          {isPrism ? (
            <>
              <rect
                x={CX - TANK_W / 2}
                y={tankTop}
                width={TANK_W}
                height={MAX_HEIGHT * PX_PER_CM}
                fill="#ffffff"
                stroke="#94a3b8"
                strokeWidth="2"
              />
              <rect x={CX - TANK_W / 2} y={waterY} width={TANK_W} height={waterH} fill="#60a5fa" />
            </>
          ) : (
            <>
              <rect
                x={CX - tankW / 2}
                y={tankTop}
                width={tankW}
                height={MAX_HEIGHT * PX_PER_CM}
                fill="#ffffff"
                stroke="#94a3b8"
                strokeWidth="2"
              />
              <ellipse cx={CX} cy={tankTop} rx={tankW / 2} ry={tankW / 6} fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
              <rect x={CX - tankW / 2} y={waterY} width={tankW} height={waterH} fill="#60a5fa" />
              <ellipse cx={CX} cy={waterY} rx={tankW / 2} ry={tankW / 6} fill="#93c5fd" stroke="#60a5fa" strokeWidth="1" />
            </>
          )}
        </svg>

        <div className="mt-controls">
          {isPrism ? (
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
                  max="10"
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
                  max="10"
                  step="1"
                  value={width}
                  aria-label={C.width}
                  onChange={slide(setWidth)}
                />
              </div>
            </>
          ) : (
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
                max="5"
                step="1"
                value={radius}
                aria-label={C.radius}
                onChange={slide(setRadius)}
              />
            </div>
          )}

          <div className="mt-slider-group">
            <label>
              {C.height}
              <span>
                {height} {C.cm}
              </span>
            </label>
            <input
              type="range"
              min="1"
              max={MAX_HEIGHT}
              step="1"
              value={height}
              aria-label={C.height}
              onChange={slide(setHeight)}
            />
          </div>

          <div className="mt-readouts">
            <div className="mt-readout">
              <span className="mt-readout-label">{C.baseArea}</span>
              <span className="mt-readout-value" data-readout="base">
                {baseArea} {C.cmSquared}
              </span>
            </div>
            <div className="mt-readout">
              <span className="mt-readout-label">{C.volume}</span>
              <span className="mt-readout-value" data-readout="volume">
                {volume} {C.cmCubed}
              </span>
            </div>
            <div className="mt-readout">
              <span className="mt-readout-label">{C.capacity}</span>
              <span className="mt-readout-value" data-readout="capacity">
                {litres} {C.litres}
              </span>
            </div>
          </div>

          {task && (
            <button type="button" className="mt-check" onClick={handleCheck}>
              {T.checkMyAnswer}
            </button>
          )}

          <p className="mt-formula">{isPrism ? C.formulaPrismVolume : C.formulaCylinderVolume}</p>
          <p className="mt-formula">{C.oneLitre}</p>

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
