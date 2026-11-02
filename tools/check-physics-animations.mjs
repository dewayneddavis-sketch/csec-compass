#!/usr/bin/env node
// Harness: the Physics ANIMATED simulations (the moving half of the figures contract).
//
// WHAT THIS IS FOR
// The owner's directive of 2026-10-23 asks for animated simulations — a pendulum, a
// transverse wave and a projectile — "moving diagrams done in code". The figures
// contract (tools/check-lesson-figures.mjs, src/data/lessonFigures.js) guards the
// SCHEMA of a figure; nothing in it would notice a simulation that has quietly become
// a still picture. That is the bug this harness exists to catch: the failure mode is
// silent (the lesson still renders an image, it just never moves).
//
// THE RULE THIS ENFORCES
//   a shipped animated figure must carry live declarative animation (SMIL) of the
//   kinds its row in the table below names, at the duration the lesson's own
//   arithmetic gives, looping indefinitely, wired into the lesson it belongs to,
//   byte-identical in both content trees.
//
// COMPLEMENTARITY (why both harnesses exist, and neither alone is enough)
//   • tools/check-figure-generators.mjs catches "the generator no longer reproduces
//     the shipped SVG" — a stale or hand-patched simulation.
//   • this harness catches "the shipped SVG has no live animation" — a generator that
//     writes a frozen picture, or a figure edited down to static art.
//   • TOGETHER they catch "both trees were made static while the generator still
//     animates" (the generator harness sees the drift, this one sees the missing
//     animation).
//
// WHAT THIS DOES NOT PROVE (read before trusting a green run)
//   • It proves STRUCTURE, not pixels. Node can see the animation elements; it cannot
//     see them move. The pixel proof is the two-screenshot motion read-back recorded
//     under docs/screenshots/physics-animations/ (two frames of the pendulum figure
//     ~0.5 s apart must differ; the static control must not).
//   • It does not prove the geometry is right. The generator asserts its own physics
//     (T = 2 pi sqrt(l/g), y = g x^2 / (2 v^2) sample by sample, a label clear of the
//     moving part at every sampled frame) and the render read-back checks the labels
//     on screen.
//   • A red control proves a rule bites; it cannot prove the rule is the right one.
//
// Usage:
//   node tools/check-physics-animations.mjs              green run
//   node tools/check-physics-animations.mjs --red-control additionally mutate the
//                                                        simulation in memory and
//                                                        require each rule to bite
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { animationEvidence, animationProblems, figureProblems } from "../src/data/lessonFigures.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RED_CONTROL = process.argv.includes("--red-control");

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, p))).digest("hex");
const sha256text = (t) => crypto.createHash("sha256").update(t, "utf8").digest("hex");
const filesApi = { exists, read, sha256 };

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const eq = (got, want, msg) => ok(got === want, `${msg} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
const section = (t) => console.log(`\n== ${t}`);

// ---------------------------------------------------------------- the table
// Counts and durations come from the simulations themselves (read below), never guessed:
// `min` is the number of animation elements the figure must carry, `need` the kinds, and
// `dur` the loop length the lesson's own arithmetic gives.
const SIMS = [
  {
    name: "pendulum",
    subject: "physics",
    src: "/content/physics/figures/pendulum-oscillation.svg",
    lesson: "mech-simple-pendulum",
    min: 1,
    need: ["animateTransform:rotate"],
    dur: 2,                       // T = 2 x 3.14 x sqrt(1.0/10) = 2.0 s, the lesson's own value
    why: "the arm swings on a cosine: one loop is one complete oscillation",
  },
  {
    name: "transverse wave",
    subject: "physics",
    src: "/content/physics/figures/transverse-wave-propagation.svg",
    lesson: "wave-properties",
    min: 2,
    need: ["animateTransform:translate", "animate:cy"],
    dur: 2,
    why: "the train translates one wavelength per period, and the marked particle rides it",
  },
  {
    name: "projectile",
    subject: "physics",
    src: "/content/physics/figures/projectile-motion.svg",
    lesson: "motion-graphs",
    min: 3,
    need: ["animate:cx", "animate:cy"],
    dur: 1.5,                     // 0.6 s of real fall, shown in slow motion
    why: "one ball runs across and down, the other falls straight down, landing together",
  },
];

const modules = JSON.parse(read("content/physics/modules.json"));
const mirror = JSON.parse(read("public/content/physics/modules.json"));
const rows = SIMS.map((r) => ({ ...r, modules }));

section("1. each simulation carries live declarative animation (counts read from the file)");
for (const r of SIMS) {
  const file = `public/content${r.src.replace(/^\/content/, "")}`;
  ok(exists(file), `${r.name}: ${file} exists`);
  if (!exists(file)) continue;
  const text = read(file);
  const ev = animationEvidence(text);
  console.log(`   ${r.name.padEnd(16)} ${ev.count} animation element(s): ${ev.kinds.join(", ")}`);
  console.log(`   ${"".padEnd(16)} dur ${[...new Set(ev.durations)].join(", ")} · repeat ${[...new Set(ev.animations.map((a) => a.repeatCount))].join(", ")} · parents with id ${ev.parentsWithId.filter(Boolean).length}/${ev.count}`);
  console.log(`   ${"".padEnd(16)} ${r.why}`);
  ok(ev.count >= r.min, `${r.name}: at least ${r.min} animation element(s)`);
  for (const k of r.need) ok(ev.kinds.includes(k), `${r.name}: has a ${k} animation`);
  ok(ev.parentsWithId.every(Boolean), `${r.name}: every animation element sits in a parent that carries an id`);
}

section("2. the animated figures keep every rule (animationProblems over the whole table)");
const problems = animationProblems(rows, filesApi);
ok(problems.length === 0, `animationProblems() finds nothing wrong: ${problems.join("; ")}`);
console.log(`   ${problems.length} problem(s) across ${rows.length} simulation(s)`);

section("3. wiring: each simulation is on the lesson its row names, and no sim is orphaned on disk");
for (const r of SIMS) {
  const lessons = modules.flatMap((m) => m.lessons || []);
  const named = lessons.find((l) => l.id === r.lesson);
  ok(Boolean(named), `${r.name}: lesson "${r.lesson}" exists`);
  const srcs = named && Array.isArray(named.figures) ? named.figures.map((f) => f.src) : [];
  ok(srcs.includes(r.src), `${r.name}: lesson "${r.lesson}" lists ${r.src}`);
  const hosts = lessons.filter((l) => Array.isArray(l.figures) && l.figures.some((f) => f.src === r.src));
  eq(hosts.length, 1, `${r.name}: the simulation is wired into exactly one lesson`);
  ok(figureProblems(named && named.figures, r.subject, filesApi).length === 0, `${r.name}: the lesson's figures array is still well formed`);
}
// the mirror carries the same wiring (both trees are read, and the modules files are
// compared byte for byte by check-lesson-figures.mjs — this catches a mirror that was
// regenerated from a different source)
eq(JSON.stringify(modules), JSON.stringify(mirror), "content/ and public/content/ modules.json agree on the wiring");
eq(sha256("content/physics/modules.json"), sha256("public/content/physics/modules.json"), "the two modules.json are byte-identical");

// the static figures in the same directory must NOT have grown animation (the contract
// is per figure, and a still diagram that starts moving on its own is a defect)
const still = ["/content/physics/figures/motion-graphs.svg", "/content/physics/figures/circuits-series-parallel.svg", "/content/physics/figures/light-refraction.svg"];
for (const s of still) {
  const t = read(`public${s}`);
  eq(animationEvidence(t).count, 0, `${s} is still a static figure (no animation elements)`);
}

section("4. summary");
console.log(`   ${SIMS.length} simulations, ${SIMS.reduce((n, r) => n + r.min, 0)} required animation element(s) minimum`);
console.log(`   lesson anchors: ${SIMS.map((r) => r.lesson).join(", ")}`);

if (RED_CONTROL) {
  section("5. RED CONTROL — every rule must bite when the simulation is broken in memory");
  const base = {};
  for (const r of SIMS) {
    const t = read(`public/content${r.src.replace(/^\/content/, "")}`);
    base[r.name] = {
      [`content${r.src.replace(/^\/content/, "")}`]: t,
      [`public/content${r.src.replace(/^\/content/, "")}`]: t,
    };
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const textOf = (o, r) => o[r.name][`public/content${r.src.replace(/^\/content/, "")}`];
  const setText = (o, r, t) => { o[r.name][`public/content${r.src.replace(/^\/content/, "")}`] = t; };
  const flat = (o) => {
    const out = {};
    for (const name of Object.keys(o)) for (const k of Object.keys(o[name])) out[k] = o[name][k];
    return out;
  };
  // the mutated copies shadow the real files; everything else still resolves on disk,
  // so a control changes exactly the one thing it names.
  const inline = (o) => {
    const f = flat(o);
    const own = (p) => Object.prototype.hasOwnProperty.call(f, p);
    return {
      exists: (p) => own(p) || exists(p),
      read: (p) => (own(p) ? f[p] : exists(p) ? read(p) : ""),
      sha256: (p) => (own(p) ? sha256text(f[p]) : exists(p) ? sha256(p) : ""),
    };
  };
  const run = (o, mods = modules) => animationProblems(SIMS.map((r) => ({ ...r, modules: mods })), inline(o));
  const redCase = (label, mutate, expectRe) => {
    const o = clone(base);
    const mods = JSON.parse(JSON.stringify(modules));
    mutate(o, mods);
    const found = run(o, mods);
    const hit = found.some((p) => expectRe.test(p));
    ok(hit, `red control: ${label} is caught${hit ? "" : " — no matching problem, got: " + (found.join(" | ") || "none")}`);
    return found;
  };

  // (a) the sim is written as a still picture: every animation element stripped
  redCase("a simulation with no animation at all (reverted to static art)",
    (o) => { setText(o, SIMS[0], textOf(o, SIMS[0]).replace(/<animate(Transform)?\b[^>]*\/?>(<\/animate(Transform)?>)?/g, "")); },
    /expected at least 1/);

  // (b) the animation plays once and freezes
  redCase("an animation with no repeatCount (it would play once and freeze)",
    (o) => { setText(o, SIMS[0], textOf(o, SIMS[0]).replace(/ repeatCount="indefinite"/, "")); },
    /must loop indefinitely/);

  // (c) a zero duration
  redCase("an animation with dur=\"0s\"",
    (o) => { setText(o, SIMS[0], textOf(o, SIMS[0]).replace(/ dur="2s"/, ' dur="0s"')); },
    /a duration must be positive/);

  // (d) animation markup whose values never change
  redCase("animation markup that never moves (values repeated)",
    (o) => { setText(o, SIMS[0], textOf(o, SIMS[0]).replace(/values="[^"]*"/g, 'values="10 10;10 10"')); },
    /two different numbers/);

  // (e) an orphaned animation: moved out of its named parent, directly under <svg>
  redCase("an animation orphaned directly under <svg> (the movable part is not named)",
    (o) => {
      const t = textOf(o, SIMS[0]);
      const m = /<animate(Transform)?[^>]*>(<\/animate(Transform)?>)?/.exec(t);
      const moved = m[0];
      setText(o, SIMS[0], t.replace(moved, "").replace(/(<svg[^>]*>)/, `$1${moved}`));
    },
    /carries no id/);

  // (f) the simulation ships but is wired nowhere
  redCase("a simulation whose figures entry was removed from the lesson",
    (o, mods) => { for (const m of mods) for (const l of m.lessons || []) if (l.id === SIMS[0].lesson) l.figures = (l.figures || []).filter((f) => f.src !== SIMS[0].src); },
    /wired nowhere/);

  // (g) the served mirror drifts from the author copy
  redCase("a served mirror that differs from the author copy",
    (o) => { setText(o, SIMS[0], textOf(o, SIMS[0]).replace("</svg>", "\n</svg>\n")); },
    /must be byte-identical/);

  // the baseline must be green, or the controls above prove nothing
  eq(run(clone(base)).length, 0, "red control baseline: the unmutated simulations are clean");
  // and the rules are blind to nothing: prove the evidence reader sees the elements
  for (const r of SIMS) {
    const ev = animationEvidence(read(`public/content${r.src.replace(/^\/content/, "")}`));
    ok(ev.count >= r.min && ev.parentsWithId.every(Boolean), `red control: the reader sees ${r.name}'s ${ev.count} animation element(s)`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("\nA failure here means a shipped simulation is not the animated figure it is meant to be\n" +
    "(or has been wired to nothing). Re-run tools/gen-physics-figures.mjs to regenerate it —\n" +
    "never hand-edit an SVG to satisfy the harness.");
}
process.exit(fail === 0 ? 0 : 1);
