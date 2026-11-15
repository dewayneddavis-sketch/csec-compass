#!/usr/bin/env node
// Generator for the Mathematics Tier-1 lesson figures (CSEC Compass) — cycles 1 and 2.
//
// Provenance: every coordinate is COMPUTED from the arithmetic the lesson itself teaches.
// Nothing is copied, traced or AI-generated; there is no image tool in this pipeline.
// The numbers a figure shows are the numbers its lesson prints (the taught-numbers rule),
// and the generator ASSERTS that before it draws anything:
//   - venn-two-sets          40 surveyed, 25 C, 18 F, 10 both -> 15 / 10 / 8 / 7, summing to 40;
//   - sector-and-segment     r=9, θ=80° -> arc 12.57 cm, perimeter 30.57 cm (about 30.6 cm);
//                            r=6, θ=60° -> sector 18.85, triangle 15.59, segment 3.26 cm²;
//   - trig-ratios-soh-cah-toa  labels only, no numbers: θ, the three sides, the three ratios.
//   - statistical-diagrams-pie  60 students, frequencies 8/22/20/10 -> 48°/132°/120°/60°,
//                            asserted to sum to 360° before a sector is drawn;
//   - ogive-readings         THREE readings only — (44, 10), (52, 20), (61, 30) of 40 — plotted
//                            as points with their reading lines and NO curve through them.
//                            No endpoint is invented (the lesson gives no reading at 40) and the
//                            lesson's second, incompatible dataset (20 at 30 marks, 34 at 40
//                            marks) is never mixed in; both are asserted, not trusted.
//
//   node tools/gen-mathematics-figures.mjs              # rewrites BOTH trees (author + mirror)
//   node tools/gen-mathematics-figures.mjs <outdir>     # or writes the five SVGs into <outdir>
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

// ===========================================================================
// 4. statistical-diagrams-pie.svg — the lesson's own four-class survey, drawn.
//
//   60 students' marks in the classes 0–9, 10–19, 20–29, 30–39, frequencies 8, 22, 20, 10
//     total  = 8 + 22 + 20 + 10            = 60
//     angles = (8, 22, 20, 10) ÷ 60 × 360° = 48°, 132°, 120°, 60°   (the lesson prints these)
//     check  = 48 + 132 + 120 + 60         = 360°
//     share  = 8 ÷ 60 = 0.133              = 13.3%
//   The angles are COMPUTED from the frequencies and then asserted against the four
//   the lesson prints, and their sum is asserted to be 360° before anything is drawn.
//
//   NOT drawn: the frequency polygon. Its class midpoints (4.5, 14.5, 24.5, 34.5) are
//   taught by the cumulative-frequency lesson, not this one, so the taught-number guard
//   would (correctly) refuse the build. The fix is never to add them to the lesson copy
//   in a figures PR.
// ===========================================================================
function statisticalDiagramsPie() {
  const TOTAL = 60;
  const ROWS = [["0\u20139", 8], ["10\u201319", 22], ["20\u201329", 20], ["30\u201339", 10]];
  const TAUGHT_ANGLES = [48, 132, 120, 60];

  must(ROWS.reduce((t, r) => t + r[1], 0) === TOTAL, `the four frequencies must add to ${TOTAL}`);
  const angles = ROWS.map((r) => (r[1] / TOTAL) * 360);
  angles.forEach((a, i) => must(round2(a) === TAUGHT_ANGLES[i],
    `the sector angle for ${ROWS[i][0]} must be ${TAUGHT_ANGLES[i]}°, got ${a.toFixed(3)}`));
  must(angles.reduce((t, a) => t + round2(a), 0) === 360,
    "the four computed sector angles must add to exactly 360° before anything is drawn");
  must(TAUGHT_ANGLES.reduce((t, a) => t + a, 0) === 360,
    "the four angles the lesson prints must add to 360°");
  const share = ROWS[0][1] / TOTAL;
  must(Math.round(share * 1000) / 1000 === 0.133, `8 ÷ 60 must round to 0.133, got ${share}`);
  must(round1(share * 100) === 13.3, `8 ÷ 60 must be 13.3%, got ${(share * 100).toFixed(4)}`);

  const W = 880, H = 560;
  const CX = 240, CY = 320, R = 175;
  const pen = makePen();
  const lab = makeLabeller();
  let s = "";
  const pt = (r, deg) => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];
  const FILLS = [BLUE_F, GREEN_F, RED_F, "rgba(75,85,99,0.10)"];
  const STROKES = [BLUE, GREEN, RED, MUTED];

  // one sector per class, swept clockwise from the top of the circle
  let a0 = -90;
  ROWS.forEach(([label, f], i) => {
    const a1 = a0 + angles[i];
    const p0 = pt(R, a0), p1 = pt(R, a1);
    s += `<path d="M${CX},${CY} L${p0[0].toFixed(3)},${p0[1].toFixed(3)} A${R},${R} 0 ${angles[i] > 180 ? 1 : 0} 1 ${p1[0].toFixed(3)},${p1[1].toFixed(3)} Z" fill="${FILLS[i]}" stroke="none"/>`;
    s += pen.line(CX, CY, p0[0], p0[1], `stroke="${STROKES[i]}" stroke-width="2"`);
    s += pen.arc(CX, CY, R, a0, a1, `fill="none" stroke="${STROKES[i]}" stroke-width="2"`);
    // the class and its frequency, on the sector's bisector, clear of both bounding radii
    const lp = pt(R * 0.62, a0 + angles[i] / 2);
    s += lab(lp[0], lp[1], label, { size: 13.5, w: "600", anchor: "middle", fill: STROKES[i] });
    s += lab(lp[0], lp[1] + 20, String(f), { size: 17, w: "600", anchor: "middle", fill: INK });
    a0 = a1;
  });
  must(round2(a0) === 270, `the four sectors must sweep one full turn from -90° to 270°, got ${a0}`);

  // the lesson's own working, printed beside the circle
  s += lab(470, 120, "Worked method \u2014 60 students' marks", { size: 14, w: "600" });
  s += lab(470, 152, "8 + 22 + 20 + 10 = 60", { size: 13 });
  s += lab(470, 182, "(8 ÷ 60) × 360° = 48°", { size: 13, fill: BLUE });
  s += lab(470, 212, "(22 ÷ 60) × 360° = 132°", { size: 13, fill: GREEN });
  s += lab(470, 242, "(20 ÷ 60) × 360° = 120°", { size: 13, fill: RED });
  s += lab(470, 272, "(10 ÷ 60) × 360° = 60°", { size: 13, fill: MUTED });
  s += lab(470, 302, "48 + 132 + 120 + 60 = 360°, so the angles are correct", { size: 13, w: "600" });
  s += lab(470, 336, "8 ÷ 60 = 0.133 = 13.3%, the share of the 0\u20139 class", { size: 13 });
  s += lab(470, 372, "class and frequency, not relative frequency", { size: 12.5, fill: MUTED });

  s += lab(40, 34, "A pie chart of 60 students' marks", { size: 15, w: "600" });
  s += lab(40, 52, "the angle of a sector is (frequency ÷ total) × 360°", { fill: MUTED, size: 12 });

  assertTaught("mat-stat-statistical-diagrams", lab.texts);
  assertNumbersTaught("mat-stat-statistical-diagrams", lab.texts);
  pen.clear(lab, "statistical-diagrams-pie", W, H);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>A pie chart of 60 students' marks in the classes 0-9, 10-19, 20-29 and 30-39, with frequencies 8, 22, 20 and 10 and sector angles 48, 132, 120 and 60 degrees</title>
${s}
</svg>
`;
}

// ===========================================================================
// 5. ogive-readings.svg — THE HONEST LIMIT: three readings, and no curve.
//
// The lesson prints exactly three cumulative-frequency readings of 40 students:
//   cf 10 at 44 marks (Q1),  cf 20 at 52 marks (the median),  cf 30 at 61 marks (Q3)
//   IQR = 61 − 44 = 17, semi-IQR = 8.5, and 30 − 10 = 20 out of 40 = 50%.
//
// It prints NO reading at or near 40, so a full 0 → 40 ogive would need an endpoint no
// student can check — and the taught-number guard CANNOT catch that, because 40 is
// taught elsewhere in the same lesson. So this figure plots the three readings as
// POINTS with their reading lines and draws NO curve through them: three points do not
// make a curve, and a straight segment between two of them would read as the shape of
// the distribution, which the lesson never gives. Reading across from a cumulative
// frequency to the marks IS what the lesson teaches, and that is what is drawn.
//
// The lesson also carries a SECOND, incompatible dataset — "the curve reads 20 at 30
// marks and 34 at 40 marks". Cumulating frequency cannot fall as marks rise, so that is
// a different survey and is never mixed into this figure; the assertions below prove
// neither of its marks (30 as a mark, 40 as a mark) nor its reading 34 appears here.
// ===========================================================================
function ogiveReadings() {
  const TOTAL = 40;
  // [marks, cumulative frequency] — the lesson's three readings, in the order it reads them
  const READINGS = [[44, 10], [52, 20], [61, 30]];

  must(READINGS[1][1] === TOTAL / 2, `the median is read at half of ${TOTAL} = 20`);
  must(READINGS[0][1] === TOTAL / 4, `Q1 is read at one quarter of ${TOTAL} = 10`);
  must(READINGS[2][1] === TOTAL * 3 / 4, `Q3 is read at three quarters of ${TOTAL} = 30`);
  const iqr = READINGS[2][0] - READINGS[0][0];
  const semi = iqr / 2;
  const middleHalf = READINGS[2][1] - READINGS[0][1];
  must(iqr === 17, `Q3 - Q1 must be 17 marks, got ${iqr}`);
  must(semi === 8.5, `the semi-interquartile range must be 8.5, got ${semi}`);
  must(middleHalf === 20, `30 - 10 must be 20 students, got ${middleHalf}`);
  must((middleHalf / TOTAL) * 100 === 50, `20 out of 40 must be 50%`);
  // a cumulative reading is a running total: it can never fall as the marks rise
  for (let i = 1; i < READINGS.length; i++) {
    must(READINGS[i][0] > READINGS[i - 1][0], "the readings must be taken at rising marks");
    must(READINGS[i][1] > READINGS[i - 1][1], "a cumulative frequency can never fall as the marks rise");
  }

  const W = 880, H = 580;
  const OX = 130, OY = 470, PW = 470, PH = 360;      // the plot box: origin, width, height
  const XMIN = 34, XMAX = 68, YMAX = 34;             // data window (its edges carry no label)
  const X = (m) => OX + ((m - XMIN) / (XMAX - XMIN)) * PW;
  const Y = (cf) => OY - (cf / YMAX) * PH;

  const pen = makePen();
  const lab = makeLabeller();
  let s = "";

  // the two axes — marks across, cumulative frequency up ("against the upper class boundary")
  s += pen.line(OX, OY, OX, 110, `stroke="${LINE}" stroke-width="2.5"`);
  s += pen.line(OX, OY, 600, OY, `stroke="${LINE}" stroke-width="2.5"`);
  s += lab(40, 88, "cumulative", { size: 12.5, fill: MUTED });
  s += lab(40, 106, "frequency", { size: 12.5, fill: MUTED });
  s += lab(365, 530, "marks", { size: 13, w: "600", anchor: "middle" });

  // the tick labels: only the three cumulative frequencies and the three marks the lesson prints
  for (const [marks, cf] of READINGS) {
    s += lab(122, Y(cf) + 4.5, String(cf), { size: 12.5, anchor: "end", fill: MUTED });
    s += lab(X(marks), 492, String(marks), { size: 12.5, anchor: "middle", fill: MUTED });
  }

  // the three readings: read ACROSS from the cumulative frequency to the mark, then DOWN to it
  const NOTE = { 10: "Q1", 20: "median", 30: "Q3" };
  for (const [marks, cf] of READINGS) {
    const px = X(marks), py = Y(cf);
    s += pen.line(OX, py, px, py, `stroke="${BLUE}" stroke-width="1.8" stroke-dasharray="6 4"`);
    s += pen.line(px, py, px, OY, `stroke="${BLUE}" stroke-width="1.8" stroke-dasharray="6 4"`);
    s += pen.circle(px, py, 5, `fill="${BLUE}" stroke="${INK}" stroke-width="1.5"`);
    const label = `${NOTE[cf]} = ${marks} marks`;
    // Q1 and the median are labelled to the LEFT of their points, so neither label can run into
    // the reading line of the point above it; Q3 has clear space to its right.
    if (cf === 30) s += lab(px + 12, py - 12, label, { size: 12.5, w: "600", fill: BLUE });
    else s += lab(px - 12, py - 12, label, { size: 12.5, w: "600", anchor: "end", fill: BLUE });
  }

  // what the readings give, worked the way the lesson works it
  s += lab(630, 196, "reading the quartiles", { size: 13, w: "600" });
  s += lab(630, 228, "interquartile range", { size: 12.5 });
  s += lab(630, 250, "= 61 \u2212 44 = 17 marks", { size: 12.5, w: "600", fill: BLUE });
  s += lab(630, 282, "semi-interquartile range = 8.5", { size: 12.5 });
  s += lab(630, 314, "20 out of 40 = 50%", { size: 12.5, w: "600", fill: BLUE });
  s += lab(630, 336, "the middle half of the class", { size: 12.5, fill: MUTED });

  s += lab(40, 34, "An ogive: three readings", { size: 15, w: "600" });
  s += lab(40, 52, "each reading is read from the curve at the cumulative frequency", { fill: MUTED, size: 12 });
  s += lab(40, 552, "no curve through the three readings", { fill: MUTED, size: 12 });

  // no endpoint is invented and no second dataset is mixed in
  must(!/34/.test(lab.texts.join(" ")),
    "the figure must never carry 34: that reading belongs to the lesson's other, incompatible dataset");
  must(!/30 marks|40 marks/.test(lab.texts.join(" ")),
    "the figure must never read a mark at 30 or 40: the lesson gives no such reading");
  // three points do not make a curve — prove no curve element exists at all
  must(!/<path|<polyline|<polygon/.test(s),
    "the ogive ships plotted points and reading lines only: no path, polyline or polygon may be drawn");
  must((s.match(/<circle /g) || []).length === 3, "the figure must plot exactly the three readings");

  assertTaught("frequency-tables-and-cumulative-frequency", lab.texts);
  assertNumbersTaught("frequency-tables-and-cumulative-frequency", lab.texts);
  pen.clear(lab, "ogive-readings", W, H);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<title>Readings taken from an ogive of 40 students' marks: cumulative frequency 10 at 44 marks, 20 at 52 marks and 30 at 61 marks, plotted as three points with their reading lines and no curve drawn through them</title>
${s}
</svg>
`;
}

proveTaughtGuardBites();

const figs = {
  "statistical-diagrams-pie.svg": statisticalDiagramsPie(),
  "ogive-readings.svg": ogiveReadings(),
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
console.log(`pie: total = 8 + 22 + 20 + 10 = ${8 + 22 + 20 + 10}, angles = 48 + 132 + 120 + 60 = ${48 + 132 + 120 + 60}, 8 ÷ 60 = ${(8 / 60).toFixed(3)} = 13.3%`);
console.log(`ogive: three readings only — (44, 10), (52, 20), (61, 30) of 40; IQR = 61 - 44 = ${61 - 44}, semi = ${(61 - 44) / 2}, 30 - 10 = 20 out of 40 = ${((20 / 40) * 100)}%; no curve drawn, no endpoint invented`);
