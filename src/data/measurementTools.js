// ---------------------------------------------------------------------------
// The two dedicated Mathematics measurement tools: their words and their sums.
//
// `experiment.type` "area-builder" (lesson perimeter-area) renders <AreaBuilder />
// and "volume-filler" (lesson volume-capacity) renders <VolumeFiller />. Before
// this module existed both types were routed to the Equation Balance Scale, so
// the two lessons promised a shape resizer and a water tank and delivered a
// scale with weights 1, 2, 3, 5 and x.
//
// Everything the two tools DISPLAY lives here — every label, formula and unit —
// so that it can be machine-checked against the lesson that renders it, the same
// way the lab sets are checked:
//
//   * tools/check-mathematics-labs.mjs  A13: every string in AREA_COPY is taught
//     by perimeter-area and every string in VOLUME_COPY by volume-capacity; every
//     generated worked step is composed only of those taught strings plus
//     numbers, so nothing untaught can reach the screen.
//     A14 (same file) re-derives every worked step independently — rectangle,
//     circle, prism and cylinder — so the arithmetic the student reads is the
//     arithmetic the tool performs. (This citation used to name
//     tools/check-show-your-work.mjs, which does not contain that check; it is
//     A14 here. Corrected 2026-11-08 — a comment naming a check that does not
//     exist is the same defect class as the one that hid the lab reveal bug.)
//
// This file is deliberately plain JavaScript: no React, no CSS, no imports. The
// components render it; the harnesses import it directly.
// ---------------------------------------------------------------------------

// π to three decimal places, the value both lessons teach.
const PI = 3.142;

// Two decimal places for lengths/areas, three for litres (a millilitre).
const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------------------
// AreaBuilder — rectangle (length, width) and circle (radius).
// ---------------------------------------------------------------------------
export const AREA_COPY = {
  shapeRectangle: "Rectangle",
  shapeCircle: "Circle",
  length: "Length",
  width: "Width",
  radius: "Radius",
  area: "Area",
  perimeter: "Perimeter",
  circumference: "Circumference",
  formulaRectArea: "A = l × w",
  formulaRectPerimeter: "P = 2(l + w)",
  formulaCircleArea: "A = πr²",
  formulaCircleCircumference: "C = 2πr",
  workedMethod: "Worked method",
  pi: "π ≈ 3.142",
  cm: "cm",
  cmSquared: "cm²",
  times: "×",
};

/**
 * Rectangle l × w: area and perimeter, with the substitution shown.
 * `steps` are the lines the student reads; each is built from AREA_COPY only.
 */
export function rectangleWorking(length, width) {
  const area = round2(length * width);
  const perimeter = round2(2 * (length + width));
  const C = AREA_COPY;
  return {
    area,
    perimeter,
    steps: [
      `${C.formulaRectArea} = ${length} ${C.cm} ${C.times} ${width} ${C.cm} = ${area} ${C.cmSquared}`,
      `${C.formulaRectPerimeter} = 2(${length} + ${width}) = ${perimeter} ${C.cm}`,
    ],
  };
}

/**
 * Circle radius r: area πr² and circumference 2πr, using π ≈ 3.142.
 */
export function circleWorking(radius) {
  const square = round2(radius * radius);
  const area = round2(PI * radius * radius);
  const circumference = round2(2 * PI * radius);
  const C = AREA_COPY;
  return {
    area,
    circumference,
    steps: [
      `${C.formulaCircleArea} = 3.142 ${C.times} ${square} = ${area} ${C.cmSquared}`,
      `${C.formulaCircleCircumference} = 2 ${C.times} 3.142 ${C.times} ${radius} = ${circumference} ${C.cm}`,
    ],
  };
}

// ---------------------------------------------------------------------------
// VolumeFiller — rectangular prism (length, width, height) and cylinder
// (radius, height), each filled to a chosen height, plus cm³ → litres.
// ---------------------------------------------------------------------------
export const VOLUME_COPY = {
  shapePrism: "Rectangular prism",
  shapeCylinder: "Cylinder",
  length: "Length",
  width: "Width",
  height: "Height",
  radius: "Radius",
  baseArea: "Base area",
  volume: "Volume",
  capacity: "Capacity",
  formulaPrismBase: "A_base = length × width",
  formulaPrismVolume: "V = A_base × h",
  formulaCylinderVolume: "V = πr²h",
  oneLitre: "1 L = 1000 cm³",
  workedMethod: "Worked method",
  pi: "π ≈ 3.142",
  cm: "cm",
  cmSquared: "cm²",
  cmCubed: "cm³",
  litres: "L",
  times: "×",
};

/**
 * Rectangular prism l × w × h, filled to height h:
 * base area, volume, and the capacity in litres.
 */
export function prismWorking(length, width, height) {
  const baseArea = round2(length * width);
  const volume = round2(baseArea * height);
  const litres = round3(volume / 1000);
  const C = VOLUME_COPY;
  return {
    baseArea,
    volume,
    litres,
    steps: [
      `${C.formulaPrismBase} = ${length} ${C.cm} ${C.times} ${width} ${C.cm} = ${baseArea} ${C.cmSquared}`,
      `${C.formulaPrismVolume} = ${baseArea} ${C.times} ${height} = ${volume} ${C.cmCubed}`,
      `${volume} ${C.cmCubed} ÷ 1000 = ${litres} ${C.litres}`,
    ],
  };
}

/**
 * Cylinder radius r, filled to height h: base area πr², volume πr²h, capacity.
 */
export function cylinderWorking(radius, height) {
  // The volume is taken from πr²h itself, not from the rounded base area: a
  // student who multiplies 28.28 by 10 gets 282.8, and the tool must not teach
  // that rounding an intermediate is free.
  const baseArea = round2(PI * radius * radius);
  const volume = round2(PI * radius * radius * height);
  const litres = round3((PI * radius * radius * height) / 1000);
  const C = VOLUME_COPY;
  return {
    baseArea,
    volume,
    litres,
    steps: [
      `${C.formulaCylinderVolume} = 3.142 ${C.times} ${round2(radius * radius)} ${C.times} ${height} = ${volume} ${C.cmCubed}`,
      `${volume} ${C.cmCubed} ÷ 1000 = ${litres} ${C.litres}`,
    ],
  };
}

/** Every string the two tools can display, for the corpus check. */
export const MEASUREMENT_TOOL_COPY = {
  "area-builder": AREA_COPY,
  "volume-filler": VOLUME_COPY,
};

/** The lesson each tool is the Play tab for. */
export const MEASUREMENT_TOOL_LESSONS = {
  "area-builder": "perimeter-area",
  "volume-filler": "volume-capacity",
};
