#!/usr/bin/env node
// Generator for the Physics Tier-1 lesson figures (CSEC Compass).
//
// Provenance: every coordinate is COMPUTED from a small real data table or from the physics
// relations the lesson itself teaches (gradient of a distance-time graph = speed, area under a
// velocity-time graph = displacement, V = IR, n = sin i / sin r). Nothing is copied, traced or
// AI-generated. The numbers a figure shows are the numbers the lesson teaches (taught-numbers
// rule) — the source table of each figure is in the PR that ships them.
//
//   node tools/gen-physics-figures.mjs             # rewrites BOTH trees (author + served mirror)
//   node tools/gen-physics-figures.mjs <outdir>     # or writes the three SVGs into <outdir>
//
// Re-running it reproduces the committed SVGs byte for byte (prove with md5sum -c).
//
// LABEL PLACEMENT HERE IS MEASURED, NOT EYEBALLED. tools/check-lesson-figures.mjs proves the
// schema, never the picture: two earlier rounds of this figure shipped labels that the graph
// line ran straight through, and an arrowhead that rendered as an X. Both were found by opening
// the SVG in a browser and asking the DOM which stroked line crosses which text box
// (getBBox + segment/box clipping). Every coordinate below is chosen so that answer is "none".
import fs from "node:fs";
import path from "node:path";

// Both trees by default when run from a repo root (that is what keeps them byte-identical);
// a given directory otherwise; ./out when neither applies (the draft workflow).
const outs = process.argv[2]
  ? [process.argv[2]]
  : (fs.existsSync("content/physics")
      ? ["content/physics/figures", "public/content/physics/figures"]
      : ["out"]);
for (const dir of outs) fs.mkdirSync(dir, { recursive: true });

const INK = "#111827", MUTED = "#4b5563", LINE = "#374151", RULE = "#e5e7eb";
const BLUE = "#1d4ed8", BLUE_F = "rgba(29,78,216,0.10)";
const RED = "#b91c1c", RED_F = "rgba(185,28,28,0.10)";
const GREEN = "#15803d", GREEN_F = "rgba(21,128,61,0.12)";
const FONT = 'font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"';
const T = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${o.size || 12.5}" fill="${o.fill || INK}"${o.w ? ` font-weight="${o.w}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : ""}>${s}</text>`;

// ---------------------------------------------------------------------------
// 1. motion-graphs.svg — ONE data table, two graphs.
//
//   t / s         0  1  2  3   4   5   6   7   8   9
//   distance / m  0  1  4  9  15  21  24  27  27  27
//   velocity/(m/s)0  2  4  6   6   6   6   6   0   0     (from 6 m/s at 5 s to 0 at 7 s)
//   a = 2 m/s^2 (0-3 s); constant 6 m/s (3-5 s); a = -3 m/s^2 (5-7 s); stationary (7-9 s)
//   Areas: 1/2*3*6 = 9 m; 6*2 = 12 m; 1/2*2*6 = 6 m; 0 m -> 27 m = final distance
// The three shapes the lesson teaches therefore all appear: curved (accelerating),
// straight (constant speed) and horizontal (stationary).
// ---------------------------------------------------------------------------
function motionGraphs() {
  const TMAX = 9, DMAX = 30, VMAX = 6;
  const dist = [0, 1, 4, 9, 15, 21, 24, 27, 27, 27];
  const vel = [0, 2, 4, 6, 6, 6, 6, 6, 0, 0];

  const W = 780, H = 410;
  const P = { x: 78, y: 62, w: 250, h: 250 };   // d-t
  const Q = { x: 452, y: 62, w: 250, h: 250 };  // v-t
  const px = (p, t) => p.x + (t / TMAX) * p.w;
  const py = (p, v, max) => p.y + p.h - (v / max) * p.h;

  const axes = (p, max, ylab, ystep) => {
    let s = `<line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${p.y + p.h}" stroke="${LINE}" stroke-width="2"/>` +
            `<line x1="${p.x}" y1="${p.y + p.h}" x2="${p.x + p.w}" y2="${p.y + p.h}" stroke="${LINE}" stroke-width="2"/>`;
    for (let v = 0; v <= max; v += ystep) {
      const y = py(p, v, max);
      s += `<line x1="${p.x - 5}" y1="${y}" x2="${p.x}" y2="${y}" stroke="${LINE}" stroke-width="1.5"/>` +
           T(p.x - 9, y + 4, v, { fill: MUTED, size: 13, anchor: "end" });
    }
    for (let t = 0; t <= TMAX; t += 3) {
      const x = px(p, t);
      s += `<line x1="${x}" y1="${p.y + p.h}" x2="${x}" y2="${p.y + p.h + 5}" stroke="${LINE}" stroke-width="1.5"/>` +
           T(x, p.y + p.h + 20, t, { fill: MUTED, size: 13, anchor: "middle" });
    }
    s += T(p.x + p.w / 2, p.y + p.h + 40, "time / s", { size: 13.5, anchor: "middle" });
    s += T(p.x - 56, p.y + p.h / 2, ylab, { size: 13.5, anchor: "middle", rotate: -90 });
    return s;
  };

  // ---- left panel: distance-time
  let s = axes(P, DMAX, "distance / m", 10);
  s += `<polyline points="${dist.map((d, t) => `${px(P, t)},${py(P, d, DMAX)}`).join(" ")}" fill="none" stroke="${BLUE}" stroke-width="3" stroke-linejoin="round"/>`;
  dist.forEach((d, t) => { s += `<circle cx="${px(P, t)}" cy="${py(P, d, DMAX)}" r="3.2" fill="${BLUE}"/>`; });
  // the straight share of the graph (t = 3..5 s): one gradient, stated once.
  // These three boxes sit in the clear space right of the straight share; the first version
  // sat ON it (the line ran through the words) — the geometry was measured, not guessed.
  s += T(82, 225, "accelerating", { fill: BLUE, size: 12 });
  s += T(205, 190, "straight line =", { fill: GREEN, size: 12 });
  s += T(205, 206, "constant speed", { fill: GREEN, size: 12 });
  s += T(205, 222, "gradient = 6 m/s", { fill: GREEN, size: 12, w: "600" });
  s += T(px(P, 8.95), py(P, 27, DMAX) - 12, "horizontal: stationary", { fill: MUTED, size: 12, anchor: "end" });
  s += T(P.x, P.y - 24, "Distance-time graph", { size: 15, w: "600" });
  s += T(P.x, P.y - 7, "gradient = speed &#183; horizontal = stationary", { fill: MUTED, size: 12 });

  // ---- right panel: velocity-time, the three areas summing to the displacement
  s += axes(Q, VMAX, "velocity / (m/s)", 2);
  const tri1 = `${px(Q, 0)},${py(Q, 0, VMAX)} ${px(Q, 3)},${py(Q, VMAX, VMAX)} ${px(Q, 3)},${py(Q, 0, VMAX)}`;
  const rect = `${px(Q, 3)},${py(Q, VMAX, VMAX)} ${px(Q, 5)},${py(Q, VMAX, VMAX)} ${px(Q, 5)},${py(Q, 0, VMAX)} ${px(Q, 3)},${py(Q, 0, VMAX)}`;
  const tri2 = `${px(Q, 5)},${py(Q, VMAX, VMAX)} ${px(Q, 7)},${py(Q, 0, VMAX)} ${px(Q, 5)},${py(Q, 0, VMAX)}`;
  s += `<polygon points="${tri1}" fill="${BLUE_F}"/>`;
  s += `<polygon points="${rect}" fill="${GREEN_F}"/>`;
  s += `<polygon points="${tri2}" fill="${RED_F}"/>`;
  s += `<polyline points="${[0, 1, 2, 3].map(t => `${px(Q, t)},${py(Q, vel[t], VMAX)}`).join(" ")}" fill="none" stroke="${BLUE}" stroke-width="3"/>`;
  s += `<line x1="${px(Q, 3)}" y1="${py(Q, VMAX, VMAX)}" x2="${px(Q, 5)}" y2="${py(Q, VMAX, VMAX)}" stroke="${GREEN}" stroke-width="3"/>`;
  s += `<line x1="${px(Q, 5)}" y1="${py(Q, VMAX, VMAX)}" x2="${px(Q, 7)}" y2="${py(Q, 0, VMAX)}" stroke="${RED}" stroke-width="3"/>`;
  s += `<line x1="${px(Q, 7)}" y1="${py(Q, 0, VMAX)}" x2="${px(Q, TMAX)}" y2="${py(Q, 0, VMAX)}" stroke="${MUTED}" stroke-width="3"/>`;
  // each area label inside its own area, offset so the lines bounding that area miss the text
  s += T(px(Q, 1.32), py(Q, 1.9, VMAX), "9 m", { fill: BLUE, w: "600" });
  s += T(px(Q, 3.75), py(Q, 3.4, VMAX), "12 m", { fill: GREEN, w: "600" });
  s += T(px(Q, 5.25), py(Q, 1.5, VMAX), "6 m", { fill: RED, w: "600" });
  s += T(px(Q, 7.12), py(Q, 0, VMAX) - 12, "stationary: 0 m", { fill: MUTED, size: 12 });
  s += T(Q.x - 24, Q.y + Q.h + 64, "area under the line = displacement: 9 + 12 + 6 = 27 m", { size: 12.5, fill: INK });
  s += T(Q.x, Q.y - 24, "Velocity-time graph", { size: 15, w: "600" });
  s += T(Q.x, Q.y - 7, "gradient = acceleration &#183; area = displacement", { fill: MUTED, size: 12 });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>Distance-time and velocity-time graphs of the same journey</title>
${s}
</svg>
`;
}

// ---------------------------------------------------------------------------
// 2. circuits-series-parallel.svg — both arrangements with metered values that
//    satisfy V = IR, plus a key of the symbols used.
//      Series   6 V battery, 2 ohm + 4 ohm  -> I = 6/(2+4) = 1 A everywhere
//                                            V = 1x2 = 2 V and 1x4 = 4 V (2 + 4 = 6 V)
//      Parallel 6 V battery, 2 ohm and 3 ohm branches -> 6/2 = 3 A, 6/3 = 2 A, total 5 A
// ---------------------------------------------------------------------------
function circuits() {
  const W = 780, H = 560;
  const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="${LINE}" stroke-width="2.5"/>`;
  // A battery sitting in a VERTICAL wire: both plates are horizontal, the longer one is +.
  // Callers leave a gap in the wire between the plates so the symbol reads as a cell.
  const battery = (x, y) =>
    `<line x1="${x - 19}" y1="${y - 5}" x2="${x + 19}" y2="${y - 5}" stroke="${INK}" stroke-width="3"/>` +
    `<line x1="${x - 10}" y1="${y + 6}" x2="${x + 10}" y2="${y + 6}" stroke="${INK}" stroke-width="6"/>`;
  const resistorBox = (cx, cy, label) =>
    `<rect x="${cx - 26}" y="${cy - 13}" width="52" height="26" rx="4" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` +
    T(cx, cy + 5, label, { size: 13, anchor: "middle" });
  const resistorBoxV = (cx, cy, label) =>
    `<rect x="${cx - 13}" y="${cy - 26}" width="26" height="52" rx="4" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` +
    T(cx + 18, cy + 5, label, { size: 13 });
  const arrow = (x, y, dir) => `<path d="M${x},${y} l${15 * dir},0 m0,0 l-6,-4 m6,4 l-6,4" fill="none" stroke="${RED}" stroke-width="2"/>`;
  const arrowV = (x, y, dir) => `<path d="M${x},${y} v${15 * dir} m0,0 l-4,${-6 * dir} m4,${6 * dir} l4,${-6 * dir}" fill="none" stroke="${RED}" stroke-width="2"/>`;
  const bulb = (cx, cy) =>
    `<circle cx="${cx}" cy="${cy}" r="13" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` +
    `<line x1="${cx - 9}" y1="${cy - 9}" x2="${cx + 9}" y2="${cy + 9}" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="${cx + 9}" y1="${cy - 9}" x2="${cx - 9}" y2="${cy + 9}" stroke="${INK}" stroke-width="2"/>`;

  let s = "";

  // ---- series panel (x 30..380)
  s += box(30, 74, 350, 268);
  s += T(30, 50, "Series: one path", { size: 15, w: "600" });
  s += T(30, 67, "the current is the same at every point in the loop", { fill: MUTED, size: 12 });
  const SL = 92, SR = 318, ST = 176, SB = 262, SY = 219;   // series loop + battery y
  s += `<line x1="${SL}" y1="${ST}" x2="${SR}" y2="${ST}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${SL}" y1="${SB}" x2="${SR}" y2="${SB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${SL}" y1="${ST}" x2="${SL}" y2="${SY - 9}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${SL}" y1="${SY + 10}" x2="${SL}" y2="${SB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${SR}" y1="${ST}" x2="${SR}" y2="${SB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += battery(SL, SY);
  s += resistorBox(166, ST, "2 &#937;") + resistorBox(256, ST, "4 &#937;");
  s += arrow(118, ST, 1);
  s += arrow(230, SB, -1);
  s += arrowV(SL + 26, SY - 14, -1);
  s += T(SL + 40, SY - 4, "1 A", { fill: RED, size: 12.5, w: "600" });
  s += T(118, ST - 32, "1 A", { fill: RED, size: 12.5, w: "600" });
  s += T(222, ST - 30, "6 V battery", { fill: "#1f2937", size: 12.5, anchor: "middle" });
  s += T(30 + 14, 314, "V = 1 A &#215; 2 &#937; = 2 V and 1 A &#215; 4 &#937; = 4 V", { size: 12.5 });
  s += T(30 + 14, 332, "R = 2 + 4 = 6 &#937;, so I = V / R = 6 / 6 = 1 A", { size: 12.5 });

  // ---- parallel panel (x 410..750)
  s += box(410, 74, 340, 268);
  s += T(410, 50, "Parallel: more than one path", { size: 15, w: "600" });
  s += T(410, 67, "the branch currents add up to the total current", { fill: MUTED, size: 12 });
  const PL = 490, PR = 700, PT = 178, PB = 262, PY = 220;   // parallel rails + battery y
  const B1 = 560, B2 = 650;                                  // the two branches
  s += `<line x1="${PL}" y1="${PT}" x2="${PR}" y2="${PT}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${PL}" y1="${PB}" x2="${PR}" y2="${PB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PY - 9}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${PL}" y1="${PY + 10}" x2="${PL}" y2="${PB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${PR}" y1="${PT}" x2="${PR}" y2="${PB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += battery(PL, PY);
  s += `<line x1="${B1}" y1="${PT}" x2="${B1}" y2="${PB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += `<line x1="${B2}" y1="${PT}" x2="${B2}" y2="${PB}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += resistorBoxV(B1, 220, "2 &#937;") + resistorBoxV(B2, 220, "3 &#937;");
  // the total-current arrow and its label sit in the gap between the battery wire and the
  // first branch: at PL+40 the label ran into that branch's resistor body (measured, not seen)
  s += arrowV(PL + 14, PY + 24, -1);
  s += T(PL + 24, PY + 28, "5 A", { fill: RED, size: 12.5, w: "600" });
  s += arrowV(B1, PT + 10, 1) + arrowV(B2, PT + 10, 1);
  s += T(B1 - 46, PT + 22, "3 A", { fill: RED, size: 12.5, w: "600" });
  s += T(B2 - 46, PT + 22, "2 A", { fill: RED, size: 12.5, w: "600" });
  s += T(PL - 52, PT + 4, "6 V", { fill: "#1f2937", size: 12.5, anchor: "middle" });
  s += T(410 + 14, 314, "each branch gets the full 6 V: 6 / 2 = 3 A", { size: 12.5 });
  s += T(410 + 14, 332, "and 6 / 3 = 2 A, so 3 A + 2 A = 5 A total", { size: 12.5 });

  // ---- symbol key
  s += `<line x1="30" y1="384" x2="750" y2="384" stroke="${RULE}" stroke-width="2"/>`;
  s += T(30, 410, "Circuit symbols used above", { size: 13.5, w: "600" });
  s += `<line x1="66" y1="428" x2="66" y2="446" stroke="${LINE}" stroke-width="2.5"/>` +
       `<line x1="66" y1="460" x2="66" y2="478" stroke="${LINE}" stroke-width="2.5"/>` +
       battery(66, 452) + T(134, 456, "battery (the long plate is the + terminal)", { size: 12.5 });
  s += resistorBox(430, 452, "R") + T(478, 456, "resistor, in ohms", { size: 12.5 });
  s += bulb(430, 508) + `<line x1="417" y1="508" x2="392" y2="508" stroke="${LINE}" stroke-width="2.5"/>` +
       `<line x1="443" y1="508" x2="470" y2="508" stroke="${LINE}" stroke-width="2.5"/>` +
       T(486, 512, "bulb (a lamp lights when current flows)", { size: 12.5 });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>Series and parallel circuits with their currents and voltages</title>
${s}
</svg>
`;
}

// ---------------------------------------------------------------------------
// 3. light-refraction.svg — a Snell's-law ray diagram whose ANGLES ARE COMPUTED
//    (i = 48.6 and r = 30 chosen so sin i / sin r = 1.50), plus the two lens shapes.
//    The refracted ray leaves the boundary on the far side of the normal, inside the
//    glass, CLOSER to the normal than the incident ray — that is the whole point.
// ---------------------------------------------------------------------------
function refraction() {
  const W = 780, H = 480;
  const iDeg = 48.6, rDeg = 30, n = 1.5;
  const measured = Math.sin(iDeg * Math.PI / 180) / Math.sin(rDeg * Math.PI / 180);
  if (Math.abs(measured - n) > 0.005) throw new Error("Snell check failed: " + measured);

  const BX = 210, BY = 236, LEN = 132;
  const rad = (d) => (d * Math.PI) / 180;
  const up = (deg, len) => [BX - Math.sin(rad(deg)) * len, BY - Math.cos(rad(deg)) * len];  // in the air
  const down = (deg, len) => [BX + Math.sin(rad(deg)) * len, BY + Math.cos(rad(deg)) * len]; // in the glass

  let s = "";
  s += `<rect x="40" y="${BY}" width="350" height="126" fill="rgba(29,78,216,0.07)"/>`;
  s += `<line x1="40" y1="${BY}" x2="390" y2="${BY}" stroke="${LINE}" stroke-width="2.5"/>`;
  s += T(52, BY - 12, "air", { fill: MUTED, size: 13 });
  s += T(52, BY + 30, "glass, n = 1.5", { fill: MUTED, size: 13 });
  s += `<line x1="${BX}" y1="${BY + 138}" x2="${BX}" y2="${BY - 138}" stroke="${MUTED}" stroke-width="2" stroke-dasharray="7 5"/>`;
  s += T(BX + 9, BY - 122, "normal", { fill: MUTED });
  // An arrowhead showing the DIRECTION OF TRAVEL: both barbs are the reverse of the ray
  // direction rotated by +/-24 degrees, so the head always points the way the light goes.
  // (The first version's markup drew an X across the ray's tail and left the refracted ray
  // with no head at all; both were visible the moment the PNG was read.)
  const head = (x, y, ux, uy, colour) => {
    const a = (24 * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), L = 16;
    const b1 = [-ux * c + uy * sn, -ux * sn - uy * c];
    const b2 = [-ux * c - uy * sn, ux * sn - uy * c];
    const pt = (p) => `${(x + p[0] * L).toFixed(2)},${(y + p[1] * L).toFixed(2)}`;
    return `<path d="M${pt(b1)} L${x.toFixed(2)},${y.toFixed(2)} L${pt(b2)}" fill="none" stroke="${colour}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  };
  const [ix, iy] = up(iDeg, LEN);
  const [rx, ry] = down(rDeg, LEN * 0.92);
  s += `<line x1="${ix}" y1="${iy}" x2="${BX}" y2="${BY}" stroke="${BLUE}" stroke-width="3"/>`;
  s += head(BX - 0.62 * (BX - ix), BY - 0.62 * (BY - iy), Math.sin(rad(iDeg)), Math.cos(rad(iDeg)), BLUE);
  s += T(ix - 80, iy - 22, "incident ray", { fill: BLUE, size: 12.5, w: "600" });
  s += `<line x1="${BX}" y1="${BY}" x2="${rx}" y2="${ry}" stroke="${RED}" stroke-width="3"/>`;
  s += head(BX + 0.8 * (rx - BX), BY + 0.8 * (ry - BY), Math.sin(rad(rDeg)), Math.cos(rad(rDeg)), RED);
  s += T(rx + 12, ry + 12, "refracted ray", { fill: RED, size: 12.5, w: "600" });
  // angle arcs measured FROM THE NORMAL, each on its own side of it
  const R = 62;
  const [ax, ay] = up(iDeg, R), [cx, cy] = down(rDeg, R);
  s += `<path d="M${BX},${BY - R} A${R},${R} 0 0 0 ${ax},${ay}" fill="none" stroke="${BLUE}" stroke-width="2"/>`;
  s += `<path d="M${BX},${BY + R} A${R},${R} 0 0 0 ${cx},${cy}" fill="none" stroke="${RED}" stroke-width="2"/>`;
  s += T(BX - 120, BY - 38, "i = 48.6&#176;", { fill: BLUE, size: 12.5, w: "600" });
  // the r label gets a leader line: the wedge between the normal and the ray is too narrow for text
  s += `<line x1="${BX + 74}" y1="${BY + 34}" x2="${BX + 22}" y2="${BY + 56}" stroke="${RED}" stroke-width="1.5"/>`;
  s += T(BX + 78, BY + 30, "r = 30&#176;", { fill: RED, size: 12.5, w: "600" });
  s += T(52, BY + 74, "closer to the normal:", { size: 12, fill: INK });
  s += T(52, BY + 91, "the light slows and bends", { size: 12, fill: INK });
  s += T(52, BY + 108, "toward it", { size: 12, fill: INK });
  s += T(40, 44, "Refraction at a boundary", { size: 15, w: "600" });
  s += T(40, 62, "n = sin i / sin r = 1.5 for the angles drawn here", { fill: MUTED });

  // ---- lenses
  const CX = 600;
  const convex = (x, cy) =>
    `<path d="M${x - 13},${cy - 52} Q${x + 26},${cy} ${x - 13},${cy + 52} Q${x - 52},${cy} ${x - 13},${cy - 52} Z" fill="${BLUE_F}" stroke="${INK}" stroke-width="2.5"/>`;
  const concave = (x, cy) =>
    `<path d="M${x - 9},${cy - 52} Q${x + 16},${cy} ${x - 9},${cy + 52} L${x + 9},${cy + 52} Q${x - 16},${cy} ${x + 9},${cy - 52} Z" fill="${BLUE_F}" stroke="${INK}" stroke-width="2.5"/>`;
  const passthrough = (x, cy, dy, mode) =>
    `<line x1="${x - 74}" y1="${cy + dy}" x2="${x - 10}" y2="${cy + dy}" stroke="${BLUE}" stroke-width="2"/>` +
    // converging lens: every parallel ray leaves through the focal point.
    // diverging lens: rays leave as if they came from a virtual focus 96 px in front, so a ray
    // entering dy off the axis leaves 2*dy off it at the same distance.
    (mode === "converge"
      ? `<line x1="${x + 6}" y1="${cy + dy}" x2="${x + 96}" y2="${cy}" stroke="${RED}" stroke-width="2"/>`
      : `<line x1="${x + 6}" y1="${cy + dy}" x2="${x + 96}" y2="${cy + 2 * dy}" stroke="${RED}" stroke-width="2"/>`);

  const CY1 = 150, CY2 = 356;
  s += `<line x1="${CX - 130}" y1="${CY1}" x2="${CX + 100}" y2="${CY1}" stroke="${MUTED}" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  s += convex(CX, CY1);
  for (const dy of [-33, -16, 16, 33]) s += passthrough(CX, CY1, dy, "converge");
  s += `<circle cx="${CX + 96}" cy="${CY1}" r="4" fill="${INK}"/>`;
  s += T(470, 88, "converging (convex) lens", { size: 12.5, w: "600" });
  s += T(CX + 62, CY1 + 34, "focal point", { size: 12.5 });
  s += T(470, CY1 + 78, "parallel rays brought together at the focal point", { size: 12, fill: MUTED });

  s += `<line x1="${CX - 130}" y1="${CY2}" x2="${CX + 100}" y2="${CY2}" stroke="${MUTED}" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  s += concave(CX, CY2);
  for (const dy of [-33, -16, 16, 33]) s += passthrough(CX, CY2, dy, "diverge");
  s += T(470, 276, "diverging (concave) lens", { size: 12.5, w: "600" });
  s += T(470, CY2 + 78, "the rays spread apart, so the image is virtual", { size: 12, fill: MUTED });
  s += `<line x1="470" y1="252" x2="770" y2="252" stroke="${RULE}" stroke-width="2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>Refraction at an air-glass boundary, and the two lens shapes</title>
${s}
</svg>
`;
}

// ===========================================================================
// ANIMATED SIMULATIONS (owner directive 2026-10-23)
//
// Three simulations — a simple pendulum, a transverse wave and a projectile —
// drawn as declarative SVG animation (SMIL) so they move INSIDE the <img> the
// lesson renders. Why not script: <script> is banned by the figures contract,
// and a browser runs declarative animation in a standalone image document but
// not scripting or interaction. The rule is written up for authors in
// content/LESSON-FIGURES-FORMAT.md ("Animated figures").
//
// Byte-reproducibility: no clock, no random source, no locale formatting. Every
// coordinate is a fixed-point decimal (toFixed(3)) built in a fixed-count integer
// loop, so re-running this generator reproduces the committed SVGs byte for byte
// (tools/check-figure-generators.mjs is the gate on that).
//
// EVERY LABEL IS MEASURED, NOT EYEBALLED. Each label below registers its own box,
// and the generator refuses to write a figure whose label the moving part passes
// through at any of the four sampled frames t = 0, T/4, T/2, 3T/4. The lesson of
// the earlier figure rounds is that a label the drawing runs through is invisible
// until someone opens the picture; this makes it a build failure instead.
// ===========================================================================

const must = (cond, msg) => { if (!cond) throw new Error("gen-physics-figures: " + msg); };

/** A text labeller that remembers where each label sits (0.52 em per character). */
function makeLabeller() {
  const boxes = [];
  const lab = (x, y, s, o = {}) => {
    const size = o.size || 12.5;
    const plain = s.replace(/&#\d+;/g, "x").replace(/[^\x20-\x7e]/g, "x");
    const w = plain.length * size * 0.52;
    const x0 = o.anchor === "middle" ? x - w / 2 : o.anchor === "end" ? x - w : x;
    boxes.push({ text: plain.slice(0, 26), x0, y0: y - size * 0.82, x1: x0 + w, y1: y + size * 0.24 });
    return T(x, y, s, o);
  };
  lab.boxes = boxes;
  return lab;
}

const boxHitsPoint = (b, x, y, pad = 0) =>
  x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;
const orient = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
const segSeg = (a, b, c, d) => {
  const d1 = orient(c[0], c[1], d[0], d[1], a[0], a[1]);
  const d2 = orient(c[0], c[1], d[0], d[1], b[0], b[1]);
  const d3 = orient(a[0], a[1], b[0], b[1], c[0], c[1]);
  const d4 = orient(a[0], a[1], b[0], b[1], d[0], d[1]);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
};
const segBoxHit = (p, q, b) => {
  if (boxHitsPoint(b, p[0], p[1]) || boxHitsPoint(b, q[0], q[1])) return true;
  const c = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
  for (let i = 0; i < 4; i++) if (segSeg(p, q, c[i], c[(i + 1) % 4])) return true;
  return false;
};
const circleBoxHit = (cx, cy, r, b) => {
  const nx = Math.min(Math.max(cx, b.x0), b.x1), ny = Math.min(Math.max(cy, b.y0), b.y1);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
};

// ---------------------------------------------------------------------------
// 4. pendulum-oscillation.svg — ANIMATED.
//
//   theta(t) = A cos(2 pi t / T), sampled eight times per period, so ONE LOOP OF
//   THE ANIMATION IS ONE COMPLETE OSCILLATION (out to one side and back, then out
//   to the other side and back) — exactly the lesson's own definition.
//   The period is the lesson's own arithmetic: T = 2 pi sqrt(l/g) = 2 x 3.14 x
//   sqrt(1.0/10) = 2.0 s, so dur="2s". No decaying amplitude: a decaying swing
//   would destroy the exact 2 s loop; the honest note about air resistance is
//   written on the figure instead (the lesson says the amplitude slowly falls).
// ---------------------------------------------------------------------------
function pendulum() {
  const LEN_M = 1.0, G = 10;                              // the lesson's numbers
  const PERIOD = 2 * 3.14 * Math.sqrt(LEN_M / G);         // 1.986 s -> 2.0 s
  must(Math.round(PERIOD * 10) / 10 === 2.0, `the lesson's own arithmetic must give 2.0 s, got ${PERIOD}`);
  const DUR = "2s";
  const AMP = 15, SWEEP = 8;

  const W = 780, H = 430;
  const PX = 390, PY = 108, LEN = 230, BOB = 14;
  const rad = (deg) => (deg * Math.PI) / 180;
  const armEnd = (deg) => [PX + LEN * Math.sin(rad(deg)), PY + LEN * Math.cos(rad(deg))];

  const angles = [];
  for (let i = 0; i <= SWEEP; i++) angles.push(AMP * Math.cos((2 * Math.PI * i) / SWEEP));
  must(Math.abs(angles[0] - angles[SWEEP]) < 1e-9, "the swing must start and end at the same angle (a seamless loop)");
  must(Math.abs(angles[0] - AMP) < 1e-9 && Math.abs(angles[SWEEP / 2] + AMP) < 1e-9,
    "the swing must reach +A and -A: that is one complete oscillation");
  const rotValues = angles.map((a) => `${a.toFixed(3)} ${PX} ${PY}`).join(";");

  const lab = makeLabeller();
  let s = "";

  // the fixed support the clamp grips
  s += `<rect x="300" y="80" width="180" height="16" rx="3" fill="${LINE}"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 310 + i * 30;
    s += `<line x1="${x}" y1="80" x2="${x - 10}" y2="66" stroke="${LINE}" stroke-width="2"/>`;
  }
  s += `<rect x="${PX - 16}" y="96" width="32" height="12" rx="3" fill="${INK}"/>`;
  s += `<line x1="${PX}" y1="96" x2="${PX}" y2="${PY}" stroke="${INK}" stroke-width="3"/>`;

  // the dashed vertical rest line, and the amplitude arc (0 -> +15 degrees from it)
  s += `<line x1="${PX}" y1="108" x2="${PX}" y2="392" stroke="${MUTED}" stroke-width="1.8" stroke-dasharray="7 6"/>`;
  const AR = 118;
  const ax = PX + AR * Math.sin(rad(AMP)), ay = PY + AR * Math.cos(rad(AMP));
  s += `<path d="M${PX},${PY + AR} A${AR},${AR} 0 0 0 ${ax.toFixed(3)},${ay.toFixed(3)}" fill="none" stroke="${GREEN}" stroke-width="2" stroke-dasharray="5 4"/>`;
  s += lab(ax + 10, ay - 6, "15°", { fill: GREEN, size: 12.5, w: "600" });

  // the moving arm: the string and the bob, rotating about the pivot (underside of the clamp)
  s += `<g id="pend-arm">` +
       `<animateTransform attributeName="transform" type="rotate" values="${rotValues}" dur="${DUR}" repeatCount="indefinite"/>` +
       `<line x1="${PX}" y1="${PY}" x2="${PX}" y2="${PY + LEN}" stroke="${INK}" stroke-width="2.2"/>` +
       `<circle cx="${PX}" cy="${PY + LEN}" r="${BOB}" fill="${RED_F}" stroke="${RED}" stroke-width="2.5"/>` +
       `</g>`;

  // the centre of the swing: a dashed marker on the rest line, where the bob is fastest
  s += `<path d="M${PX - 7},${PY + LEN - 7} l14,14 M${PX + 7},${PY + LEN - 7} l-14,14" fill="none" stroke="${MUTED}" stroke-width="1.6" stroke-dasharray="3 3"/>`;
  s += lab(PX + 16, 380, "The bob moves fastest at the centre of the swing:", { size: 12.5 });
  s += lab(PX + 16, 398, "start the stopwatch as it passes here.", { size: 12.5 });

  // the length: underside of the clamp down to the centre of the bob
  s += `<line x1="300" y1="108" x2="344" y2="108" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
  s += `<line x1="300" y1="338" x2="370" y2="338" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
  s += `<line x1="300" y1="108" x2="300" y2="338" stroke="${BLUE}" stroke-width="1.8"/>`;
  s += `<path d="M300,107 l-4.5,9 h9 z" fill="${BLUE}"/>` + `<path d="M300,339 l-4.5,-9 h9 z" fill="${BLUE}"/>`;
  s += T(288, 224, "l = 1.0 m", { size: 12.5, fill: BLUE, w: "600", anchor: "middle", rotate: -90 });
  lab.boxes.push({ text: "l = 1.0 m (rotated)", x0: 276, y0: 196, x1: 290, y1: 252 });

  // the left column: what the lesson says about the measurement
  s += lab(24, 150, "The length is measured from the", { size: 12.5 });
  s += lab(24, 168, "underside of the clamp down to the", { size: 12.5 });
  s += lab(24, 186, "centre of the bob: l = 1.0 m.", { size: 12.5 });
  s += lab(24, 220, "Amplitude: the small angle from the", { size: 12.5 });
  s += lab(24, 238, "vertical. At small angles it does", { size: 12.5 });
  s += lab(24, 256, "not change the period, and the", { size: 12.5 });
  s += lab(24, 274, "mass of the bob does not either.", { size: 12.5 });
  s += lab(24, 310, "One loop of the animation is one", { size: 12.5 });
  s += lab(24, 328, "complete oscillation: out and back,", { size: 12.5 });
  s += lab(24, 346, "then out to the other side and back.", { size: 12.5 });

  // the right column: the period, the loop, and the honest note about air resistance
  s += lab(496, 150, "T = 2 π √(l / g)", { size: 14, w: "600" });
  s += lab(496, 172, "= 2 × 3.14 × √(1.0 / 10)", { size: 12.5 });
  s += lab(496, 192, "= 2.0 s", { size: 14, w: "600" });
  s += lab(496, 226, "The animation loops once every", { size: 12.5 });
  s += lab(496, 244, "2.0 s — exactly one period.", { size: 12.5 });
  s += lab(496, 278, "In a real experiment air resistance", { size: 12.5 });
  s += lab(496, 296, "slowly reduces the amplitude, so", { size: 12.5 });
  s += lab(496, 314, "time the oscillations straight after", { size: 12.5 });
  s += lab(496, 332, "releasing the bob.", { size: 12.5 });

  s += T(40, 34, "A simple pendulum: one complete oscillation", { size: 15, w: "600" });
  s += T(40, 54, "one loop of the animation lasts exactly one period, 2.0 s", { fill: MUTED, size: 12 });

  // MEASURED: no label may sit where the arm or the bob is, at any of the four
  // sampled frames of the loop.
  const frames = [0, SWEEP / 4, SWEEP / 2, (3 * SWEEP) / 4];       // t = 0, T/4, T/2, 3T/4
  for (const f of frames) {
    const end = armEnd(angles[f]);
    for (const b of lab.boxes) {
      must(!segBoxHit([PX, PY], end, b),
        `label "${b.text}" is in the way of the arm at ${angles[f].toFixed(1)}°`);
      must(!circleBoxHit(end[0], end[1], BOB + 3, b),
        `label "${b.text}" is in the way of the bob at ${angles[f].toFixed(1)}°`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>A simple pendulum swinging through one complete oscillation per period</title>
${s}
</svg>
`;
}

// ---------------------------------------------------------------------------
// 5. transverse-wave-propagation.svg — ANIMATED.
//
//   y(u) = REST - A sin(2 pi u / lambda) is the wave; the whole train translates
//   by exactly ONE WAVELENGTH per period T (a seamless loop — the picture at the
//   end of the loop is identical to the picture at the start), which is the visual
//   statement of v = f lambda. The marked particle sits at a fixed x and its cy is
//   sampled from that same curve, so it rides the wave and moves only up and down:
//   "the particles vibrate perpendicular to the direction the wave travels".
//   Symbolic labels only: this lesson prints no numeric values for a wave.
// ---------------------------------------------------------------------------
function transverseWave() {
  const W = 780, H = 486;
  const X0 = 60, X1 = 720, REST = 220, AMP = 70, LAM = 165;
  const DUR = "2s";
  const STEP = 3;
  const yAt = (u) => REST - AMP * Math.sin((2 * Math.PI * u) / LAM);

  // the train is drawn wider than the plot by one full wavelength, so translating it
  // by lambda never uncovers the left edge; the plot clips it.
  const pts = [];
  for (let u = -LAM; u <= 660; u += STEP) pts.push([X0 + u, yAt(u)]);
  must(pts.length === 276, `the wave path must be a fixed 276 points, got ${pts.length}`);
  must(Math.abs(pts[0][1] - yAt(660)) < 1e-9, "the wave must repeat after one wavelength (the loop is seamless)");

  // the marked particle: fixed x, cy read off the same curve as the train moves on
  const MARK = 636;    // a vertex of the drawn train, so the particle starts exactly on it
  const particleY = (tau) => REST - AMP * Math.sin((2 * Math.PI * (MARK - X0 - LAM * tau)) / LAM);
  const cyVals = [];
  for (let i = 0; i <= 8; i++) cyVals.push(particleY(i / 8).toFixed(3));
  must(cyVals[0] === cyVals[8], "the marked particle must return to its starting height (a seamless loop)");
  must(Number(cyVals[2]) < REST - AMP + 0.5 && Number(cyVals[6]) > REST + AMP - 0.5,
    "the marked particle must reach both the crest and the trough height");
  must(new Set(cyVals).size >= 5, "the marked particle's cy values must actually move");
  const onWave = pts.find((p) => Math.abs(p[0] - MARK) < 1e-9);
  must(onWave && Math.abs(onWave[1] - particleY(0)) < 1e-9, "the marked particle must start on the drawn wave");

  const lab = makeLabeller();
  let s = "";

  // the plot and the clipping window (the train is one wavelength wider than the plot)
  s += `<clipPath id="wave-clip"><rect x="${X0}" y="140" width="${X1 - X0}" height="160"/></clipPath>`;

  // the rest position
  s += `<line x1="${X0}" y1="${REST}" x2="${X1}" y2="${REST}" stroke="${MUTED}" stroke-width="1.8" stroke-dasharray="7 6"/>`;
  s += lab(770, 142, "rest position", { size: 12.5, fill: MUTED, anchor: "end" });
  s += `<line x1="758" y1="146" x2="716" y2="216" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="4 4"/>`;

  // the moving train
  s += `<g id="wave-plot" clip-path="url(#wave-clip)">` +
       `<g id="wave-train">` +
       `<animateTransform attributeName="transform" type="translate" values="0 0;${LAM} 0" dur="${DUR}" repeatCount="indefinite"/>` +
       `<polyline points="${pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(" ")}" fill="none" stroke="${BLUE}" stroke-width="3" stroke-linejoin="round"/>` +
       `</g></g>`;

  // the marked particle: only its height changes
  s += `<line x1="${MARK}" y1="140" x2="${MARK}" y2="296" stroke="${MUTED}" stroke-width="1.4" stroke-dasharray="5 5"/>`;
  s += `<circle id="marked-particle" cx="${MARK}" cy="${Number(cyVals[0]).toFixed(3)}" r="6" fill="${RED}">` +
       `<animate attributeName="cy" values="${cyVals.join(";")}" dur="${DUR}" repeatCount="indefinite"/>` +
       `</circle>`;

  // crest, trough, amplitude, wavelength, direction of travel
  s += lab(266.25, 140, "crest", { size: 12.5, fill: BLUE, anchor: "middle", w: "600" });
  s += lab(348.75, 316, "trough", { size: 12.5, fill: BLUE, anchor: "middle", w: "600" });

  // amplitude: a key on the left, spanning rest position up to crest height
  s += `<line x1="36" y1="150" x2="36" y2="220" stroke="${GREEN}" stroke-width="1.8"/>`;
  s += `<path d="M36,148 l-4.5,9 h9 z" fill="${GREEN}"/>` + `<path d="M36,222 l-4.5,-9 h9 z" fill="${GREEN}"/>`;
  s += `<line x1="30" y1="150" x2="${X0}" y2="150" stroke="${GREEN}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
  s += `<line x1="30" y1="220" x2="${X0}" y2="220" stroke="${GREEN}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
  s += lab(30, 190, "A", { size: 13, fill: GREEN, anchor: "end", w: "600" });

  // one wavelength, crest to crest
  s += `<line x1="101.25" y1="296" x2="101.25" y2="346" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
  s += `<line x1="266.25" y1="296" x2="266.25" y2="346" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
  s += `<line x1="101.25" y1="342" x2="266.25" y2="342" stroke="${BLUE}" stroke-width="1.8"/>`;
  s += `<path d="M99,342 l9,-4.5 v9 z" fill="${BLUE}"/>` + `<path d="M268.5,342 l-9,-4.5 v9 z" fill="${BLUE}"/>`;
  s += lab(183.75, 370, "λ = one wavelength (crest to crest)", { size: 12.5, fill: BLUE, anchor: "middle", w: "600" });

  // the direction the energy travels
  s += `<line x1="430" y1="88" x2="612" y2="88" stroke="${RED}" stroke-width="2.2"/>`;
  s += `<path d="M620,88 l-12,-5.5 v11 z" fill="${RED}"/>`;
  s += lab(525, 76, "direction of energy travel", { size: 12.5, fill: RED, anchor: "middle", w: "600" });

  s += lab(MARK, 314, "the marked particle", { size: 12.5, fill: RED, anchor: "middle", w: "600" });
  s += lab(MARK, 332, "moves only up and down", { size: 12.5, fill: RED, anchor: "middle", w: "600" });

  s += T(40, 34, "A transverse wave travelling to the right", { size: 15, w: "600" });
  s += T(40, 54, "crests, troughs, amplitude, wavelength — and one particle that only moves up and down", { fill: MUTED, size: 12 });

  s += T(40, 400, "The dashed horizontal line is the rest position — where the particles sit when no wave is passing.", { size: 12.5 });
  s += T(40, 422, "A is the amplitude: the height of a crest above the rest position, never the trough-to-crest height.", { size: 12.5 });
  s += T(40, 444, "The particles vibrate perpendicular to the direction the wave travels; it carries energy, not matter.", { size: 12.5 });
  s += T(40, 466, "The train moves on by exactly one wavelength λ every period T, which is why v = fλ and f = 1/T.", { size: 12.5 });

  // MEASURED: no label may sit where the wave, or the marked particle, gets to.
  const phases = [0, 0.25, 0.5, 0.75];
  for (const tau of phases) {
    for (const p of pts) {
      const x = p[0] + LAM * tau;
      if (x < X0 - 1e-9 || x > X1 + 1e-9) continue;   // clipped away: never on screen
      for (const b of lab.boxes) {
        must(!boxHitsPoint(b, x, p[1], 2),
          `the wave runs through the label "${b.text}" at t = ${tau}T`);
      }
    }
    const py = particleY(tau);
    for (const b of lab.boxes) {
      must(!circleBoxHit(MARK, py, 8, b), `the marked particle runs into "${b.text}" at t = ${tau}T`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>A transverse wave travelling to the right, with one particle moving only up and down</title>
${s}
</svg>
`;
}

// ---------------------------------------------------------------------------
// 6. projectile-motion.svg — ANIMATED.
//
//   One ball leaves a table edge horizontally at 3 m/s from a 1.80 m table; a second
//   ball is released at the same instant and falls straight down. Table of values
//   (g = 10 N/kg, dots every 0.1 s):
//     t / s        0    0.1    0.2    0.3    0.4    0.5    0.6
//     x / m        0   0.30   0.60   0.90   1.20   1.50   1.80
//     y / m        0   0.05   0.20   0.45   0.80   1.25   1.80
//   Equal horizontal steps, growing vertical steps; t = sqrt(2h/g) = 0.60 s and the
//   range is v t = 1.80 m, so both balls land together. Every sample is asserted
//   against y = g x^2 / (2 v^2) before anything is written.
// ---------------------------------------------------------------------------
function projectile() {
  const G = 10, V = 3, HM = 1.8, PPM = 130;     // N/kg, m/s, m, px per metre
  const DT = 0.1, N = 6;
  const FALL = Math.sqrt((2 * HM) / G);
  must(Math.abs(FALL - N * DT) < 1e-12, `the fall time ${FALL} s must be the ${N} steps of ${DT} s the dots mark`);
  const DUR = "1.5s";                            // 0.6 s of real time, shown in slow motion

  const W = 780, H = 536;
  const LX = 300, TOP = 190, FLOOR = TOP + HM * PPM;
  must(FLOOR === 424, `the floor must land on the 424 px line, got ${FLOOR}`);

  const xs = [], ys = [];                        // metres
  for (let i = 0; i <= N; i++) {
    const t = i * DT;
    xs.push(V * t);
    ys.push(0.5 * G * t * t);
  }
  for (let i = 0; i <= N; i++) {
    const expect = (G * xs[i] * xs[i]) / (2 * V * V);
    must(Math.abs(ys[i] - expect) < 1e-12, `sample ${i}: y = ${ys[i]} but g x²/(2 v²) = ${expect}`);
  }
  const px = (m) => LX + m * PPM, py = (m) => TOP + m * PPM;
  must(Math.abs(py(ys[N]) - FLOOR) < 1e-9, "the last sample must be on the floor");

  // the two balls' animations: the same cy values (the drop is independent of the
  // horizontal motion), and cx only for the projected ball.
  const cxVals = xs.map((m) => px(m).toFixed(3)).join(";");
  const cyVals = ys.map((m) => py(m).toFixed(3)).join(";");
  const keyTimes = xs.map((_, i) => (i / N).toFixed(4)).join(";");
  must(cxVals.split(";").length === N + 1 && cyVals.split(";").length === N + 1, "one value per sample");

  const lab = makeLabeller();
  let s = "";

  // the table, the floor
  s += `<rect x="60" y="${TOP - 11}" width="${LX - 60}" height="11" fill="${LINE}"/>`;
  s += `<rect x="82" y="${TOP}" width="12" height="${FLOOR - TOP}" fill="${LINE}"/>`;
  s += `<rect x="${LX - 96}" y="${TOP}" width="12" height="${FLOOR - TOP}" fill="${LINE}"/>`;
  s += `<line x1="40" y1="${FLOOR}" x2="740" y2="${FLOOR}" stroke="${LINE}" stroke-width="2.5"/>`;
  for (let i = 0; i < 28; i++) {
    const x = 44 + i * 25;
    s += `<line x1="${x}" y1="${FLOOR}" x2="${x - 12}" y2="${FLOOR + 12}" stroke="${RULE}" stroke-width="2"/>`;
  }

  // the path itself (dashed) and the equal-time dots
  const curve = [];
  for (let i = 0; i <= 200; i++) {
    const t = (FALL * i) / 200;
    curve.push([px(V * t), py(0.5 * G * t * t)]);
  }
  s += `<polyline points="${curve.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(" ")}" fill="none" stroke="${BLUE}" stroke-width="2" stroke-dasharray="6 5"/>`;

  // the released ball first, so the projected ball is the one on top where they start together
  s += `<circle id="released-ball" cx="${px(0).toFixed(3)}" cy="${py(0).toFixed(3)}" r="9" fill="${BLUE_F}" stroke="${BLUE}" stroke-width="3">` +
       `<animate attributeName="cy" values="${cyVals}" keyTimes="${keyTimes}" dur="${DUR}" repeatCount="indefinite"/>` +
       `</circle>`;
  s += `<circle id="projectile" cx="${px(0).toFixed(3)}" cy="${py(0).toFixed(3)}" r="9" fill="${RED_F}" stroke="${RED}" stroke-width="3">` +
       `<animate attributeName="cx" values="${cxVals}" keyTimes="${keyTimes}" dur="${DUR}" repeatCount="indefinite"/>` +
       `<animate attributeName="cy" values="${cyVals}" keyTimes="${keyTimes}" dur="${DUR}" repeatCount="indefinite"/>` +
       `</circle>`;
  for (let i = 0; i <= N; i++) s += `<circle cx="${px(xs[i]).toFixed(3)}" cy="${py(ys[i]).toFixed(3)}" r="3.4" fill="${BLUE}"/>`;

  // the horizontal component (steady) and the vertical component (accelerating)
  s += `<line x1="310" y1="168" x2="400" y2="168" stroke="${RED}" stroke-width="2.2"/>`;
  s += `<path d="M406,168 l-12,-5.5 v11 z" fill="${RED}"/>`;
  s += lab(410, 154, "horizontal velocity: constant —", { size: 12.5, fill: RED, w: "600" });
  s += lab(410, 172, "a straight distance-time line", { size: 12.5, fill: RED });

  s += `<line x1="568" y1="250" x2="568" y2="400" stroke="${RED}" stroke-width="2.5"/>`;
  s += `<path d="M568,404 l-5,-10 h10 z" fill="${RED}"/>`;
  s += lab(772, 296, "vertical velocity increases —", { size: 12.5, fill: RED, anchor: "end", w: "600" });
  s += lab(772, 314, "a curving distance-time line:", { size: 12.5, fill: RED, anchor: "end" });
  s += lab(772, 332, "the acceleration of free fall", { size: 12.5, fill: RED, anchor: "end" });

  s += lab(316, 292, "the second ball", { size: 12.5, fill: BLUE, w: "600" });
  s += lab(316, 310, "is released at", { size: 12.5, fill: BLUE });
  s += lab(316, 328, "the same instant", { size: 12.5, fill: BLUE });
  s += lab(316, 346, "and lands with it.", { size: 12.5, fill: BLUE });

  s += T(40, 34, "A ball projected horizontally from a table edge", { size: 15, w: "600" });
  s += T(40, 54, "constant velocity across, the acceleration of free fall down — so the path is a parabola", { fill: MUTED, size: 12 });

  s += T(40, 452, "The dots mark equal time intervals: the ball moves the same 0.30 m across in each one, but falls 0.05 m,", { size: 12.5 });
  s += T(40, 474, "then 0.20 m, 0.45 m, 0.80 m, 1.25 m and 1.80 m — the same growing drop as a ball released from rest,", { size: 12.5 });
  s += T(40, 496, "so the two balls land together. Drawn from y = g x² / (2 v²) with g = 10 N/kg, v = 3 m/s, table 1.80 m high.", { size: 12.5 });

  // MEASURED: no label may sit where either ball, or the path, gets to.
  const at = (tau) => {
    const fi = tau * N, i0 = Math.floor(fi), i1 = Math.min(N, i0 + 1), f = fi - i0;
    return [px(xs[i0] + (xs[i1] - xs[i0]) * f), py(ys[i0] + (ys[i1] - ys[i0]) * f)];
  };
  const boxFrames = [];
  for (let i = 0; i <= 200; i++) boxFrames.push(curve[i]);
  for (const tau of [0, 0.25, 0.5, 0.75, 1]) {
    boxFrames.push(at(tau));                                  // the projected ball
    boxFrames.push([px(0), at(tau)[1]]);                      // the released ball
  }
  for (const p of boxFrames) {
    for (const b of lab.boxes) {
      must(!boxHitsPoint(b, p[0], p[1], 11),
        `the ball or its path runs into the label "${b.text}" at (${p[0].toFixed(0)}, ${p[1].toFixed(0)})`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>A ball projected horizontally from a table edge, tracing a parabola to the floor</title>
${s}
</svg>
`;
}

const figs = {
  "motion-graphs.svg": motionGraphs(),
  "circuits-series-parallel.svg": circuits(),
  "light-refraction.svg": refraction(),
  "pendulum-oscillation.svg": pendulum(),
  "transverse-wave-propagation.svg": transverseWave(),
  "projectile-motion.svg": projectile(),
};

// The two animation rules the harness will re-check on the shipped file are asserted
// here on the text about to be written, so a violator never reaches the tree:
//   1. every "&" is one of the five XML entities or a numeric reference (no raw one);
//   2. every animation element sits inside an element that CARRIES AN ID — the
//      movable part is named, which is what lets the harness check the animator
//      animates the thing it says it animates.
for (const [name, svg] of Object.entries(figs)) {
  if (/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(svg)) throw new Error(`${name}: a raw "&" would not parse as XML`);
  const stack = [];
  const tag = /<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tag.exec(svg))) {
    if (m[1]) { stack.pop(); continue; }
    const id = /\sid="([^"]+)"/.exec(m[3]);
    if (m[2] === "animate" || m[2] === "animateTransform") {
      const parent = stack[stack.length - 1];
      if (!parent || !parent.id) throw new Error(`${name}: the <${m[2]}> at offset ${m.index} has no named parent (id)`);
    }
    if (!m[4]) stack.push({ name: m[2], id: id ? id[1] : null });
  }
}
for (const dir of outs) {
  for (const [name, svg] of Object.entries(figs)) {
    fs.writeFileSync(path.join(dir, name), svg);
    console.log(`${dir}/${name}: ${svg.length} bytes`);
  }
}
// the arithmetic each figure asserts, printed so the numbers can be checked by eye
const dist = [0, 1, 4, 9, 15, 21, 24, 27, 27, 27];
console.log(`motion: areas ${0.5 * 3 * 6} + ${6 * 2} + ${0.5 * 2 * 6} + 0 = ${0.5 * 3 * 6 + 6 * 2 + 0.5 * 2 * 6} m (table ends at ${dist[9]} m)`);
console.log(`circuits: series I = 6/(2+4) = ${6 / (2 + 4)} A, V = ${(6 / 6) * 2} V + ${(6 / 6) * 4} V; parallel ${6 / 2} A + ${6 / 3} A = ${6 / 2 + 6 / 3} A`);
console.log(`pendulum: T = 2 x 3.14 x sqrt(${1.0} / ${10}) = ${(2 * 3.14 * Math.sqrt(0.1)).toFixed(3)} s -> dur="2s", one loop = one complete oscillation`);
console.log(`wave: the train advances one wavelength (165 px) per period, so the loop is seamless; the marked particle rides that same curve`);
console.log(`projectile: t = sqrt(2 x 1.8 / 10) = ${Math.sqrt(0.36).toFixed(2)} s, range = 3 x ${Math.sqrt(0.36).toFixed(2)} = ${(3 * Math.sqrt(0.36)).toFixed(2)} m; every sample satisfies y = g x^2 / (2 v^2)`);
console.log(`refraction: sin i / sin r at i=48.6, r=30 -> ${(Math.sin(48.6 * Math.PI / 180) / Math.sin(30 * Math.PI / 180)).toFixed(4)}`);
