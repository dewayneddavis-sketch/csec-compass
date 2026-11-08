import { useState } from "react";
import { VOLUME_COPY as C, prismWorking, cylinderWorking } from "../data/measurementTools";
import "./MeasurementTools.css";

// VolumeFiller — the Play-tab tool for experiment.type "volume-filler" (lesson
// volume-capacity). Fill a rectangular prism or a cylinder with water to a
// chosen height and read the volume in cm³ and the capacity in litres as the
// water rises.
//
// Every word this tool shows comes from VOLUME_COPY in ../data/measurementTools,
// where tools/check-mathematics-labs.mjs proves each one is taught by
// volume-capacity. Every text node below is an expression, never bare JSX text.

const PX_PER_CM = 12;
const W = 320;
const H = 240;
const CX = W / 2;
const MAX_HEIGHT = 12;
const BASE_Y = H - 30;
const TANK_W = 90;

export default function VolumeFiller() {
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

  const tankW = isPrism ? TANK_W : radius * 2 * PX_PER_CM;
  const tankTop = BASE_Y - MAX_HEIGHT * PX_PER_CM;
  const waterH = height * PX_PER_CM;
  const waterY = BASE_Y - waterH;

  return (
    <div className="volume-filler">
      <div className="mt-shapes">
        <button
          type="button"
          className={`mt-shape-tab ${isPrism ? "active" : ""}`}
          onClick={() => setShape("prism")}
        >
          {C.shapePrism}
        </button>
        <button
          type="button"
          className={`mt-shape-tab ${!isPrism ? "active" : ""}`}
          onClick={() => setShape("cylinder")}
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
                  onChange={(e) => setLength(Number(e.target.value))}
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
                  onChange={(e) => setWidth(Number(e.target.value))}
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
                onChange={(e) => setRadius(Number(e.target.value))}
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
              onChange={(e) => setHeight(Number(e.target.value))}
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
    </div>
  );
}
