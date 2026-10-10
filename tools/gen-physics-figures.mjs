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

const figs = {
  "motion-graphs.svg": motionGraphs(),
  "circuits-series-parallel.svg": circuits(),
  "light-refraction.svg": refraction(),
};
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
console.log(`refraction: sin i / sin r at i=48.6, r=30 -> ${(Math.sin(48.6 * Math.PI / 180) / Math.sin(30 * Math.PI / 180)).toFixed(4)}`);
