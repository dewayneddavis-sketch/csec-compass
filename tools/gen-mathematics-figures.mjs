#!/usr/bin/env node
// Generator for the Mathematics Tier-1 lesson figures (CSEC Compass) — cycle 1.
//
// Provenance: every coordinate is COMPUTED from the arithmetic the lesson itself teaches.
// Nothing is copied, traced or AI-generated; there is no image tool in this pipeline.
// The numbers a figure shows are the numbers its lesson prints (the taught-numbers rule),
// and the generator ASSERTS that before it draws anything:
//   - venn-two-sets          40 surveyed, 25 C, 18 F, 10 both -> 15 / 10 / 8 / 7, summing to 40;
//   - sector-and-segment     r=9, θ=80° -> arc 12.57 cm, perimeter 30.57 cm (about 30.6 cm);
//                            r=6, θ=60° -> sector 18.85, triangle 15.59, segment 3.26 cm²;
//   - trig-ratios-soh-cah-toa  labels only, no numbers: θ, the three sides, the three ratios.
//
//   node tools/gen-mathematics-figures.mjs              # rewrites BOTH trees (author + mirror)
//   node tools/gen-mathematics-figures.mjs <outdir>     # or writes the three SVGs into <outdir>
//
// Re-running it reproduces the committed SVGs byte for byte (tools/check-figure-generators.mjs
// is the gate on that; prove by hand with md5sum after two runs).
//
// WHAT THIS DOES NOT PROVE (read before trusting a green run)
//   - It proves the arithmetic in the DATA TABLE, and that no stroked line crosses a label box.
//     It does not prove the picture reads well, is not visually crowded, or that a pupil learns
//     from it. Only opening the rendered figure in a browser answers that.
//   - The taught-labels guard proves every WORD and every NUMBER the figure emits is taught by
//     its lesson — the word check reads lab.texts, the strings that actually went into the SVG,
//     and the number check is token-bounded. It cannot catch a MISLABELLED figure: swap 15.59
//     and 18.85 in sector-and-segment and every word and every number is still taught, so the
//     guard passes. Only a human reading the drawing against the working catches that, which is
//     why the geometric read-back in the PR is evidence and this is not.
//     It does NOT prove the figure shows everything the lesson teaches: trig-ratios ships
//     LABELS ONLY in this cycle (no worked side, no worked angle, no numeric panel), so the
//     flagship chapter's diagram is started, not finished.
//   - It cannot see a figure that renders differently in a browser than the coordinates imply
//     (font substitution changes text width; the label boxes use a 0.52 em estimate, which is
//     the same estimate the Physics generator has used since its first round).
//   - It does not check that a figure is referenced by a lesson, assembled into a page or
//     rendered — tools/check-lesson-figures.mjs owns the wiring and the schema.
//   - No SMIL/animation ships in this cycle. tools/check-physics-animations.mjs enumerates only
//     Physics, so an animated Mathematics figure would be unguarded; static only until that
//     harness is generalised.
//
// LABEL PLACEMENT HERE IS MEASURED, NOT EYEBALLED. A label that a stroked line runs through is
// invisible until someone opens the picture. Mathematics adds one primitive Physics did not
// need: its drawings are made almost entirely of ARCS and CIRCLES, so the clearance test has to
// run against every stroked segment of an approximated curve, not just against one moving part.
// makePen() registers each segment it strokes (circles sampled 96 times, arcs every 2°), and
// pen.clear() refuses to let the generator write a figure whose label box any of them crosses.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Both trees by default when run from a repo root (that is what keeps them byte-identical);
// a given directory otherwise; ./out when neither applies (the draft workflow).
const outs = process.argv[2]
  ? [process.argv[2]]
  : (fs.existsSync("content/mathematics")
      ? ["content/mathematics/figures", "public/content/mathematics/figures"]
      : ["out"]);
for (const dir of outs) fs.mkdirSync(dir, { recursive: true });

const INK = "#111827", MUTED = "#4b5563", LINE = "#374151", RULE = "#e5e7eb";
const BLUE = "#1d4ed8", BLUE_F = "rgba(29,78,216,0.10)";
const RED = "#b91c1c", RED_F = "rgba(185,28,28,0.10)";
const GREEN = "#15803d", GREEN_F = "rgba(21,128,61,0.12)";
const FONT = 'font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"';
const T = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${o.size || 12.5}" fill="${o.fill || INK}"${o.w ? ` font-weight="${o.w}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : ""}>${s}</text>`;

const must = (cond, msg) => { if (!cond) throw new Error("gen-mathematics-figures: " + msg); };
const round2 = (x) => Math.round(x * 100) / 100;
const round1 = (x) => Math.round(x * 10) / 10;
const rad = (deg) => (deg * Math.PI) / 180;

// ---------------------------------------------------------------------------
// The taught-labels guard — two halves, and BOTH read what the figure EMITS.
//
// A figure may label — and therefore show — only what its lesson names. The lesson's own text
// is the authority, so this reads it out of the repo and refuses to write a figure carrying a
// word or a number the lesson never prints.
//
// The first version of this guard was handed a HAND-WRITTEN ARRAY beside each call, so it only
// failed if the author remembered to declare the offending string: a figure labelling the
// hypotenuse "Diagonal" passed it, because the array still said "Hypotenuse". It is now called
// with `lab.texts` — the strings that actually went into the SVG — which is the only input that
// cannot lie about what the picture says.
// ---------------------------------------------------------------------------
function lessonRecord(lessonId) {
  const file = path.join(ROOT, "content/mathematics/modules.json");
  must(fs.existsSync(file), `cannot read ${file}: the taught-labels guard needs the lesson copy`);
  const mods = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const m of mods) for (const l of (m.lessons || [])) if (l.id === lessonId) return l;
  throw new Error(`gen-mathematics-figures: lesson "${lessonId}" not found in content/mathematics/modules.json`);
}
const lessonCopy = (lessonId) => lessonRecord(lessonId).content || "";
const lessonText = (lessonId) => {
  const l = lessonRecord(lessonId);
  return `${l.title || ""} ${l.content || ""}`;
};
const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

// Ordinary English words a figure's own captions use and a lesson body does not have to repeat.
// Deliberately tiny, and NOT a place to park a mathematical term — a term belongs in the lesson
// copy, which is what makes the guard worth having. Every run prints the words it excused, and
// an entry no figure needed is an ERROR (checked after the figures are built), so the list
// cannot quietly grow into a blanket that lets any label through.
const ORDINARY = new Set(["named", "rest"]);
const excused = new Set();

// A word is letters: ASCII, plus the Greek letters these lessons use (θ, π, ξ). Digits are the
// number guard's business below. Punctuation and mathematical symbols (×, −, °, ²) carry no
// vocabulary claim and are not checked — the venn lesson, for one, writes its minus as "-" while
// the figure prints "−", and neither form is a word.
const WORD = /[A-Za-z\u0370-\u03ff]+/g;

// Matching is case-insensitive with whitespace collapsed: it proves the VOCABULARY is taught,
// not the capitalisation of a heading. The lesson's TITLE counts as its text — a figure may use
// "Trigonometric" because the lesson is called "Trigonometric Ratios (SOH CAH TOA)".
function assertTaught(lessonId, texts) {
  const copy = norm(lessonText(lessonId));
  const words = new Set();
  for (const t of texts) for (const m of String(t).matchAll(WORD)) words.add(m[0].toLowerCase());
  must(words.size > 0,
    `${lessonId}: the taught-labels guard was handed no words at all — a guard that checks nothing proves nothing`);
  const missing = [];
  for (const w of words) {
    if (copy.includes(w)) continue;
    if (ORDINARY.has(w)) { excused.add(w); continue; }
    missing.push(w);
  }
  must(missing.length === 0,
    `${lessonId}: the figure displays ${missing.map((m) => `"${m}"`).join(", ")}, which the lesson's own text never teaches`);
  return words.size;
}

// The guard proves it can still fail, on every run, on a word no lesson contains. "Hypotenuse"
// is taught by trig-ratios and "Diagonal" is not, so a guard that accepts both has stopped
// reading the copy — which is exactly what the array-literal version did for a whole cycle.
function proveTaughtGuardBites() {
  let threw = false;
  try { assertTaught("trig-ratios", ["Hypotenuse", "Diagonal"]); } catch { threw = true; }
  must(threw,
    'the taught-labels guard accepted the word "Diagonal", which the trig-ratios lesson never teaches — ' +
    "the guard is decorative, not enforcing");
}

// Every NUMBER the figure displays must be a number the lesson prints — on TOKEN BOUNDARIES, the
// way tools/check-math-working.mjs's statesAnswer checks a worked step (lead ruling 2026-11-08,
// ruling 3, after R7 was found asserting "= 1undefined" and passing for months). A plain
// substring test lets a figure print "12.5" against a lesson that only ever prints "12.57".
function numberIsTaught(n, copy) {
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9.])${escaped}(?![0-9])(?!\\.[0-9])`).test(copy);
}
function assertNumbersTaught(lessonId, texts) {
  const copy = norm(lessonCopy(lessonId));
  const shown = new Set();
  for (const t of texts) for (const m of String(t).matchAll(/\d+(?:\.\d+)?/g)) shown.add(m[0]);
  const untaught = [...shown].filter((n) => !numberIsTaught(n, copy));
  must(untaught.length === 0,
    `${lessonId}: the figure displays the number(s) ${untaught.join(", ")}, which the lesson copy never prints`);
  return shown.size;
}

// ---------------------------------------------------------------------------
// Label boxes and the collision toolkit (shared shape with the Physics generator).
// ---------------------------------------------------------------------------
/** A text labeller that remembers where each label sits (0.52 em per character). */
function makeLabeller() {
  const boxes = [];
  const texts = [];
  const lab = (x, y, s, o = {}) => {
    const size = o.size || 12.5;
    const plain = s.replace(/&#\d+;/g, "x").replace(/[^\x20-\x7e]/g, "x");
    const w = plain.length * size * 0.52;
    const x0 = o.anchor === "middle" ? x - w / 2 : o.anchor === "end" ? x - w : x;
    boxes.push({ text: plain.slice(0, 30), x0, y0: y - size * 0.82, x1: x0 + w, y1: y + size * 0.24 });
    texts.push(s);
    return T(x, y, s, o);
  };
  lab.boxes = boxes;
  lab.texts = texts;
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

// ---------------------------------------------------------------------------
// THE MATHEMATICS PRIMITIVE: a pen that remembers every segment it strokes.
//
// Physics needed this against one moving arm. Mathematics' drawings are arcs and circles, so a
// "is the label clear?" answer computed from the markup alone is a guess. Every stroked path
// registers the segments it is drawn from — a circle as 96 chords, an arc every 2° — and
// clear() fails the build if any of them crosses any label box.
// ---------------------------------------------------------------------------
function makePen() {
  const segs = [];
  const add = (pts) => { for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]); };
  const pen = {
    segs,
    line(x1, y1, x2, y2, attrs = "") {
      add([[x1, y1], [x2, y2]]);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
    },
    /** pts: [[x,y],...] — open polyline, every chord registered. */
    polyline(pts, attrs = "") {
      add(pts);
      return `<polyline points="${pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(" ")}" ${attrs}/>`;
    },
    polygon(pts, attrs = "") {
      add([...pts, pts[0]]);
      return `<polygon points="${pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(" ")}" ${attrs}/>`;
    },
    /** A full circle: one <circle> element, 96 chords for the clearance test. */
    circle(cx, cy, r, attrs = "") {
      const pts = [];
      for (let i = 0; i <= 96; i++) pts.push([cx + r * Math.cos((2 * Math.PI * i) / 96), cy + r * Math.sin((2 * Math.PI * i) / 96)]);
      add(pts);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" ${attrs}/>`;
    },
    /** An arc from a0 to a1 degrees (screen coords, y down, clockwise positive). */
    arc(cx, cy, r, a0, a1, attrs = "") {
      const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 2));
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const a = rad(a0 + ((a1 - a0) * i) / steps);
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      add(pts);
      const p0 = pts[0], p1 = pts[pts.length - 1];
      const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
      const sweep = a1 > a0 ? 1 : 0;
      return `<path d="M${p0[0].toFixed(3)},${p0[1].toFixed(3)} A${r},${r} 0 ${large} ${sweep} ${p1[0].toFixed(3)},${p1[1].toFixed(3)}" ${attrs}/>`;
    },
    /** The assertion: no registered segment may cross a label box, and no box may leave the canvas. */
    clear(lab, name, W, H, pad = 1) {
      for (const seg of segs) {
        for (const b of lab.boxes) {
          must(!segBoxHit(seg[0], seg[1], b),
            `${name}: a stroked line runs through the label "${b.text}" ` +
            `(segment ${seg[0].map((v) => v.toFixed(0))} -> ${seg[1].map((v) => v.toFixed(0))})`);
        }
      }
      // a box that leaves the viewBox is a label half-cropped away — the text is drawn, the
      // reader sees a truncated word, and nothing else in the pipeline notices.
      for (const b of lab.boxes) {
        must(b.x0 >= pad && b.x1 <= W - pad && b.y0 >= pad && b.y1 <= H - pad,
          `${name}: the label "${b.text}" leaves the ${W}x${H} canvas ` +
          `(x ${b.x0.toFixed(0)}..${b.x1.toFixed(0)}, y ${b.y0.toFixed(0)}..${b.y1.toFixed(0)})`);
      }
      return segs.length;
    },
  };
  return pen;
}

// ===========================================================================
// 1. venn-two-sets.svg — a two-set survey, every region a number.
//
//   n(ξ) = 40,  n(C) = 25,  n(F) = 18,  n(C ∩ F) = 10
//   C only      = 25 - 10           = 15
//   F only      = 18 - 10           = 8
//   neither     = 40 - (15+10+8)    = 7
//   check       = 15 + 10 + 8 + 7   = 40 = n(ξ)
// ===========================================================================
function vennTwoSets() {
  const N_XI = 40, N_C = 25, N_F = 18, N_CF = 10;
  const cOnly = N_C - N_CF;
  const fOnly = N_F - N_CF;
  const neither = N_XI - (cOnly + N_CF + fOnly);
  must(cOnly === 15, `C only must be 15, got ${cOnly}`);
  must(fOnly === 8, `F only must be 8, got ${fOnly}`);
  must(neither === 7, `neither must be 7, got ${neither}`);
  must(cOnly + N_CF + fOnly + neither === N_XI, `the regions must add to n(ξ) = ${N_XI}`);
  must(N_C + N_F - N_CF === cOnly + N_CF + fOnly, "n(C) + n(F) - n(C∩F) must equal the counted union");

  const W = 660, H = 480;
  const RX = 40, RY = 64, RW = 560, RH = 320;       // the universal-set rectangle
  const CX = 250, FX = 390, CY = 240, R = 118;      // the two circles
  const pen = makePen();
  const lab = makeLabeller();
  let s = "";

  // the rectangle: ξ
  s += pen.polyline([[RX, RY], [RX + RW, RY], [RX + RW, RY + RH], [RX, RY + RH], [RX, RY]],
    `fill="none" stroke="${LINE}" stroke-width="2.5"`);
  // the two circles, each region filled so the overlap reads as one lens
  s += pen.circle(CX, CY, R, `fill="${BLUE_F}" stroke="${BLUE}" stroke-width="2.5"`);
  s += pen.circle(FX, CY, R, `fill="${GREEN_F}" stroke="${GREEN}" stroke-width="2.5"`);

  // the region counts, each inside its own region
  s += lab(CX - 50, CY + 7, String(cOnly), { size: 20, w: "600", anchor: "middle", fill: BLUE });
  s += lab((CX + FX) / 2, CY + 7, String(N_CF), { size: 20, w: "600", anchor: "middle", fill: INK });
  s += lab(FX + 50, CY + 7, String(fOnly), { size: 20, w: "600", anchor: "middle", fill: GREEN });
  s += lab(RX + RW - 44, RY + RH - 40, String(neither), { size: 20, w: "600", anchor: "middle", fill: MUTED });

  // the set names above each circle, and ξ in the corner of the rectangle
  s += lab(CX, RY + 42, "C", { size: 15, w: "600", anchor: "middle", fill: BLUE });
  s += lab(FX, RY + 42, "F", { size: 15, w: "600", anchor: "middle", fill: GREEN });
  s += lab(RX + 16, RY + 26, "ξ", { size: 15, w: "600", fill: INK });

  // what each region means, read off the lesson's own wording
  s += lab(RX, RY + RH + 30, "C only = 25 \u2212 10,  F only = 18 \u2212 10,  neither = the rest of the 40", { size: 12.5, fill: MUTED });
  s += lab(RX, RY + RH + 56, "15 + 10 + 8 + 7 = 40", { size: 14, w: "600" });

  s += lab(40, 34, "Two sets inside the universal set ξ", { size: 15, w: "600" });
  s += lab(40, 52, "write the overlap first, then the two \u2018only\u2019 regions, then the \u2018neither\u2019 region", { fill: MUTED, size: 12 });

  assertTaught("venn-diagrams", lab.texts);
  assertNumbersTaught("venn-diagrams", lab.texts);
  pen.clear(lab, "venn-two-sets", W, H);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>A two-set Venn diagram: 40 students, 25 play cricket, 18 play football, 10 play both</title>
${s}
</svg>
`;
}

// ===========================================================================
// 2. sector-and-segment.svg — the lesson's own two worked methods, drawn.
//
//   Sector, r = 9 cm, θ = 80°, π ≈ 3.142 (the lesson's approximation)
//     θ/360        = 80/360                  = 2/9
//     2πr          = 2 × 3.142 × 9           = 56.56 cm
//     arc          = 2/9 × 56.56             = 12.57 cm
//     perimeter    = 12.57 + 9 + 9           = 30.57 cm  (about 30.6 cm)
//   Segment, r = 6 cm, θ = 60°
//     sector       = 60/360 × 3.142 × 36     = 18.85 cm²
//     triangle     = 1/2 × 36 × 0.8660       = 15.59 cm²
//     segment      = 18.85 − 15.59           = 3.26 cm²
// ===========================================================================
function sectorAndSegment() {
  const PI = 3.142;                                  // the lesson's own approximation
  const r1 = 9, th1 = 80;
  const frac1 = th1 / 360;
  const circ1 = 2 * PI * r1;
  const arc1 = frac1 * circ1;
  const per1 = arc1 + 2 * r1;
  must(round2(circ1) === 56.56, `2πr for r=9 must round to 56.56, got ${circ1}`);
  must(round2(arc1) === 12.57, `the arc must round to 12.57, got ${arc1}`);
  must(round2(per1) === 30.57, `the sector perimeter must round to 30.57, got ${per1}`);
  must(round1(per1) === 30.6, `the sector perimeter must read about 30.6, got ${per1}`);

  const r2 = 6, th2 = 60;
  const sector2 = (th2 / 360) * PI * r2 * r2;
  const tri2 = 0.5 * r2 * r2 * 0.8660;               // 1/2 r² sin 60°
  const seg2 = sector2 - tri2;
  must(round2(sector2) === 18.85, `the sector area must round to 18.85, got ${sector2}`);
  must(round2(tri2) === 15.59, `the triangle area must round to 15.59, got ${tri2}`);
  must(round2(seg2) === 3.26, `the segment area must round to 3.26, got ${seg2}`);
  must(Math.abs(0.5 * r2 * r2 * Math.sin(rad(60)) - tri2) < 0.005,
    "0.8660 must be sin 60° to the precision the lesson uses");

  const W = 880, H = 576;
  const pen = makePen();
  const lab = makeLabeller();
  let s = "";

  // ---- panel A: the sector, r = 9 cm, θ = 80°
  const AX = 250, AY = 250, AR = 180;
  const A0 = 50, A1 = 130;                            // the sector opens downward, 80° wide
  const P = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
  const aP0 = P(AX, AY, AR, A0), aP1 = P(AX, AY, AR, A1);
  // the whole circle, dashed: the arc is a fraction of it
  s += pen.circle(AX, AY, AR, `fill="none" stroke="${RULE}" stroke-width="1.6" stroke-dasharray="6 6"`);
  // the sector: two radii and the arc, filled
  s += `<path d="M${AX},${AY} L${aP0[0].toFixed(3)},${aP0[1].toFixed(3)} A${AR},${AR} 0 0 1 ${aP1[0].toFixed(3)},${aP1[1].toFixed(3)} Z" fill="${BLUE_F}" stroke="none"/>`;
  s += pen.line(AX, AY, aP0[0], aP0[1], `stroke="${BLUE}" stroke-width="2.5"`);
  s += pen.line(AX, AY, aP1[0], aP1[1], `stroke="${BLUE}" stroke-width="2.5"`);
  s += pen.arc(AX, AY, AR, A0, A1, `fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round"`);
  // the angle at the centre
  s += pen.arc(AX, AY, 56, A0, A1, `fill="none" stroke="${RED}" stroke-width="2"`);
  s += lab(AX, AY + 80, "θ = 80°", { size: 14, w: "600", anchor: "middle", fill: RED });
  s += lab(AX, AY - 14, "O", { size: 13, w: "600", anchor: "middle", fill: MUTED });
  // the radius, labelled beside the right-hand one
  s += lab(AX + 80, AY + 50, "r = 9 cm", { size: 13, w: "600", fill: BLUE });
  s += lab(AX, AY + AR + 22, "arc = 12.57 cm", { size: 13, w: "600", anchor: "middle", fill: BLUE });
  s += lab(AX, AY + 118, "sector", { size: 13, fill: MUTED, anchor: "middle" });
  s += lab(40, 34, "Sector: r = 9 cm, θ = 80°", { size: 15, w: "600" });
  s += lab(40, 52, "the arc is the same fraction of the circle as the angle is of 360°", { fill: MUTED, size: 12 });

  // ---- panel B: the segment, r = 6 cm, θ = 60°
  const BX = 660, BY = 250, BR = 156;
  const B0 = 60, B1 = 120;
  const bP0 = P(BX, BY, BR, B0), bP1 = P(BX, BY, BR, B1);
  // the sector as a whole, tinted; the segment then stands out from it
  s += `<path d="M${BX},${BY} L${bP0[0].toFixed(3)},${bP0[1].toFixed(3)} A${BR},${BR} 0 0 1 ${bP1[0].toFixed(3)},${bP1[1].toFixed(3)} Z" fill="${BLUE_F}" stroke="none"/>`;
  // the segment: the chord and the arc, filled more strongly
  s += `<path d="M${bP0[0].toFixed(3)},${bP0[1].toFixed(3)} A${BR},${BR} 0 0 1 ${bP1[0].toFixed(3)},${bP1[1].toFixed(3)} L${bP0[0].toFixed(3)},${bP0[1].toFixed(3)} Z" fill="${RED_F}" stroke="none"/>`;
  s += pen.line(BX, BY, bP0[0], bP0[1], `stroke="${BLUE}" stroke-width="2.5"`);
  s += pen.line(BX, BY, bP1[0], bP1[1], `stroke="${BLUE}" stroke-width="2.5"`);
  s += pen.line(bP0[0], bP0[1], bP1[0], bP1[1], `stroke="${INK}" stroke-width="2.5"`);
  s += pen.arc(BX, BY, BR, B0, B1, `fill="none" stroke="${RED}" stroke-width="4" stroke-linecap="round"`);
  s += pen.arc(BX, BY, 50, B0, B1, `fill="none" stroke="${RED}" stroke-width="2"`);
  s += lab(BX, BY + 72, "θ = 60°", { size: 14, w: "600", anchor: "middle", fill: RED });
  s += lab(BX, BY - 14, "O", { size: 13, w: "600", anchor: "middle", fill: MUTED });
  s += lab(BX + 62, BY + 52, "r = 6 cm", { size: 13, w: "600", fill: BLUE });
  s += lab(BX, BY + 86, "triangle", { size: 13, fill: MUTED, anchor: "middle" });
  s += lab(BX, BY + 104, "15.59 cm²", { size: 13, w: "600", anchor: "middle", fill: BLUE });
  // the segment is 3.26 of 18.85 — far too thin to hold its own label, so a leader line
  // carries the words outside the circle. The leader stops 6 px short of the text box.
  s += pen.line(BX, BY + 146, BX + 96, BY + 178, `stroke="${RED}" stroke-width="1.6"`);
  s += lab(BX + 102, BY + 182, "segment", { size: 13, w: "600", fill: RED });
  s += lab(494, 34, "Segment: r = 6 cm, θ = 60°", { size: 15, w: "600" });
  s += lab(494, 52, "a segment is the sector minus the triangle", { fill: MUTED, size: 12 });

  // ---- the working, both panels, printed as the lesson prints it
  s += pen.line(40, 472, 840, 472, `stroke="${RULE}" stroke-width="2"`);
  s += lab(40, 498, "arc = 80/360 × 2πr = 2/9 × 56.56 = 12.57 cm", { size: 12.5 });
  s += lab(40, 522, "perimeter = 12.57 + 9 + 9 = 30.57 cm, so about 30.6 cm", { size: 12.5 });
  s += lab(470, 498, "sector = 60/360 × 3.142 × 36 = 18.85 cm²", { size: 12.5 });
  s += lab(470, 522, "triangle = 1/2 × 36 × 0.8660 = 15.59 cm²", { size: 12.5 });
  s += lab(470, 546, "segment = 18.85 \u2212 15.59 = 3.26 cm²", { size: 12.5, w: "600" });

  assertTaught("perimeter-area", lab.texts);
  assertNumbersTaught("perimeter-area", lab.texts);
  pen.clear(lab, "sector-and-segment", W, H);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>A sector of a circle and a segment of a circle, with the lesson's arc, perimeter and area working</title>
${s}
</svg>
`;
}

// ===========================================================================
// 3. trig-ratios-soh-cah-toa.svg — LABELS ONLY (cycle 1).
//
//   A right-angled triangle with the angle θ marked at one vertex, the right-angle square at
//   the opposite one, and the three sides named Opposite / Adjacent / Hypotenuse exactly as
//   the lesson names them. No numbers: this cycle ships the labelling the ratios depend on.
//   Slice 5 owes the worked side, the worked angle and the numeric panel — this is not the
//   flagship chapter finished, and the PR says so.
// ===========================================================================
function trigRatios() {
  const W = 620, H = 480;
  const AX = 110, AY = 300;         // θ at the bottom-left
  const BX = 430, BY = 300;         // the right angle at the bottom-right
  const CX = 430, CY = 90;          // the third vertex
  const pen = makePen();
  const lab = makeLabeller();
  let s = "";

  // the triangle
  s += pen.polygon([[AX, AY], [BX, BY], [CX, CY]], `fill="${BLUE_F}" stroke="${BLUE}" stroke-width="2.5" stroke-linejoin="round"`);
  // the right-angle mark: a square in the corner at B, drawn inward
  const Q = 22;
  s += pen.polyline([[BX - Q, BY], [BX - Q, BY - Q], [BX, BY - Q]], `fill="none" stroke="${INK}" stroke-width="2"`);
  // the angle at A, from the adjacent side round to the hypotenuse
  const thetaDeg = (Math.atan2(CY - AY, CX - AX) * 180) / Math.PI;   // negative: above the base
  s += pen.arc(AX, AY, 52, thetaDeg, 0, `fill="none" stroke="${RED}" stroke-width="2"`);
  s += lab(AX + 72, AY - 14, "θ", { size: 15, w: "600", fill: RED });

  // the three sides, named the way the lesson names them
  s += lab((AX + BX) / 2, AY + 30, "Adjacent", { size: 13.5, w: "600", anchor: "middle", fill: GREEN });
  s += lab(BX + 16, (BY + CY) / 2 + 5, "Opposite", { size: 13.5, w: "600", fill: GREEN });
  s += lab(AX + 128, AY - 128, "Hypotenuse", { size: 13.5, w: "600", anchor: "middle", fill: GREEN });

  // the three ratios, in the lesson's own words
  s += lab(60, 372, "SOH CAH TOA", { size: 15, w: "600", fill: INK });
  s += lab(60, 400, "Sin θ = Opposite / Hypotenuse", { size: 13.5, fill: BLUE });
  s += lab(60, 424, "Cos θ = Adjacent / Hypotenuse", { size: 13.5, fill: BLUE });
  s += lab(60, 448, "Tan θ = Opposite / Adjacent", { size: 13.5, fill: BLUE });

  s += lab(40, 34, "Trigonometric ratios: SOH CAH TOA", { size: 15, w: "600" });
  s += lab(40, 52, "the three sides of a right-angled triangle, named from the angle θ", { fill: MUTED, size: 12 });

  assertTaught("trig-ratios", lab.texts);
  assertNumbersTaught("trig-ratios", lab.texts);
  pen.clear(lab, "trig-ratios-soh-cah-toa", W, H);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>A right-angled triangle labelled Opposite, Adjacent and Hypotenuse, with the three trigonometric ratios</title>
${s}
</svg>
`;
}

proveTaughtGuardBites();

const figs = {
  "venn-two-sets.svg": vennTwoSets(),
  "sector-and-segment.svg": sectorAndSegment(),
  "trig-ratios-soh-cah-toa.svg": trigRatios(),
};

// The ordinary-word allowance is a hole by design, so it has to stay a small and visible one:
// an entry no figure needed is dead weight, and dead weight is what a future label hides behind.
for (const w of ORDINARY) {
  must(excused.has(w),
    `the ordinary-word allowance lists "${w}" but no figure needed it — delete the entry rather than let the list grow`);
}
console.log(`taught-labels: words excused as ordinary (not in their lesson's text): ${[...excused].sort().join(", ") || "(none)"}`);

// No figure here carries SMIL in this cycle, so there is nothing to assert about animation
// parents. The one rule that still applies to every file: a raw "&" would not parse as XML.
for (const [name, svg] of Object.entries(figs)) {
  if (/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(svg)) throw new Error(`${name}: a raw "&" would not parse as XML`);
  if (/<script|<image|xlink:href|https?:\/\/(?!www\.w3\.org)/.test(svg)) {
    throw new Error(`${name}: the figures contract bans scripting, raster images and remote references`);
  }
}

for (const dir of outs) {
  for (const [name, svg] of Object.entries(figs)) {
    fs.writeFileSync(path.join(dir, name), svg);
    console.log(`${dir}/${name}: ${svg.length} bytes`);
  }
}

// The arithmetic each figure asserts, printed so a human can check the numbers by eye.
const PI = 3.142;
console.log(`venn: C only = 25 - 10 = ${25 - 10}, F only = 18 - 10 = ${18 - 10}, neither = 40 - (15+10+8) = ${40 - (15 + 10 + 8)}, sum = ${15 + 10 + 8 + 7} = n(ξ)`);
console.log(`sector: θ/360 = 80/360 = ${(80 / 360).toFixed(4)}, 2πr = 2 x 3.142 x 9 = ${(2 * PI * 9).toFixed(3)} -> 56.56 cm, arc = 2/9 x 56.56 = ${((2 / 9) * 2 * PI * 9).toFixed(3)} -> 12.57 cm, perimeter = 12.57 + 9 + 9 = ${((2 / 9) * 2 * PI * 9 + 18).toFixed(3)} -> 30.57 cm (about ${Math.round(((2 / 9) * 2 * PI * 9 + 18) * 10) / 10})`);
console.log(`segment: sector = 60/360 x 3.142 x 36 = ${((60 / 360) * PI * 36).toFixed(3)} -> 18.85, triangle = 1/2 x 36 x 0.8660 = ${(0.5 * 36 * 0.866).toFixed(3)} -> 15.59, segment = ${(((60 / 360) * PI * 36) - 0.5 * 36 * 0.866).toFixed(3)} -> 3.26 cm²`);
console.log(`trig: labels only — no numeric values in this cycle, so there is no arithmetic to log`);
