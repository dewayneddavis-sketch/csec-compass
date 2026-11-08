import { useState } from "react";
import { AREA_COPY as C, rectangleWorking, circleWorking } from "../data/measurementTools";
import "./MeasurementTools.css";

// AreaBuilder — the Play-tab tool for experiment.type "area-builder" (lesson
// perimeter-area). Resize a rectangle (length, width) or a circle (radius) and
// read the area and the perimeter/circumference as they change.
//
// Every word this tool shows comes from AREA_COPY in ../data/measurementTools,
// where tools/check-mathematics-labs.mjs proves each one is taught by
// perimeter-area. Nothing is written into the markup: every text node below is
// an expression, so a new untaught string cannot slip in as bare JSX text.

const PX_PER_CM = 16;
const W = 320;
const H = 220;
const CX = W / 2;
const CY = H / 2;

export default function AreaBuilder() {
  const [shape, setShape] = useState("rectangle");
  const [length, setLength] = useState(3);
  const [width, setWidth] = useState(4);
  const [radius, setRadius] = useState(3);

  const isRectangle = shape === "rectangle";
  const rect = rectangleWorking(length, width);
  const circle = circleWorking(radius);
  const steps = isRectangle ? rect.steps : circle.steps;

  return (
    <div className="area-builder">
      <div className="mt-shapes">
        <button
          type="button"
          className={`mt-shape-tab ${isRectangle ? "active" : ""}`}
          onClick={() => setShape("rectangle")}
        >
          {C.shapeRectangle}
        </button>
        <button
          type="button"
          className={`mt-shape-tab ${!isRectangle ? "active" : ""}`}
          onClick={() => setShape("circle")}
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
                  max="12"
                  step="1"
                  value={width}
                  aria-label={C.width}
                  onChange={(e) => setWidth(Number(e.target.value))}
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
                  onChange={(e) => setRadius(Number(e.target.value))}
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
    </div>
  );
}
