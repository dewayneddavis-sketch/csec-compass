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
// THE RED CONTROLS RUN BY DEFAULT (2026-11-22)
//   The suite is `npm test` = tools/check-all.sh, which passes no arguments, so the
//   controls below run on every suite run; `--no-red-control` is the only opt-out.
//   Each control loads a FRESH state, breaks exactly one thing, and runs the harness's
//   OWN assertions — the same runChecks() the real run uses, not a private copy. That
//   is the fix this file needed: the controls used to call animationProblems()
//   directly, so no control could reach §1, §3, §4 or the still loop, and deleting the
//   single §2 assertion silently took six rules out of the suite (attributeName
//   present, transform type present, duration positive, repeatCount="indefinite",
//   values hold two different numbers, duration equals the table's dur) while all the
//   controls still reported "caught". Every control is now PINNED (RED_EXPECT, an
//   ARRAY of substrings) to the failure it exists for, so a control caught by some
//   other assertion — or by none — fails the run.
//
// WHAT THE CONTROLS PROVE, AND WHAT THEY STILL DO NOT
//   They prove the harness's own assertions bite, including the six rules that only
//   §2 carries; they do NOT prove
//   • that the figures move — that is the two-screenshot motion read-back recorded
//     under docs/screenshots/physics-animations/ (two frames of the pendulum figure
//     ~0.5 s apart must differ; the static control must not);
//   • that the geometry is right. The generator asserts its own physics (T = 2 pi
//     sqrt(l/g), y = g x^2 / (2 v^2) sample by sample, a label clear of the moving
//     part at every sampled frame) and the render read-back checks the labels on screen;
//   • that the rule is the right rule. A red control proves a rule bites; it cannot
//     prove the rule is the one that should be there.
//
// Usage:
//   node tools/check-physics-animations.mjs                     real checks, then every red control
//   node tools/check-physics-animations.mjs --no-red-control    real checks only
//   node tools/check-physics-animations.mjs --red-control <name> run exactly that one control
//                                                               (exit 2 on an unknown name)
// NOTE the semantic change: `--red-control` used to mean "also run the controls"; it now
// means "run exactly this one", because the controls run by default.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { animationEvidence, animationProblems, figureProblems } from "../src/data/lessonFigures.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readFile = (p) => fs.readFileSync(path.join(root, p), "utf8");
const existsFile = (p) => fs.existsSync(path.join(root, p));
const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, p))).digest("hex");
const sha256text = (t) => crypto.createHash("sha256").update(t, "utf8").digest("hex");

// ---------------------------------------------------------------- the table
// Counts and durations come from the simulations themselves (read below), never guessed:
// `min` is the number of animation elements the figure must carry, `need` the kinds, and
// `dur` the loop length the lesson's own arithmetic gives. `subject` names the modules.json
// whose lessons the wiring is checked against, so a row in another subject (Mathematics is
// the next one planned) loads its own subject's modules instead of Physics's.
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

// the static figures in the same directory must NOT have grown animation (the contract is
// per figure, and a still diagram that starts moving on its own is a defect)
const STILL = [
  "/content/physics/figures/motion-graphs.svg",
  "/content/physics/figures/circuits-series-parallel.svg",
  "/content/physics/figures/light-refraction.svg",
];

const SUBJECTS = [...new Set(SIMS.map((r) => r.subject))];
const servedPath = (r) => `public/content${r.src.replace(/^\/content/, "")}`;
const authorPath = (r) => `content${r.src.replace(/^\/content/, "")}`;
const allLessons = (mods) => mods.flatMap((m) => (m && Array.isArray(m.lessons) ? m.lessons : []));

// the pendulum row, for the pins that quote it (derived, so a table edit moves the pin with it)
const P = SIMS.find((s) => s.name === "pendulum");

// ---------------------------------------------------------------------------------------------
// state: everything the checks read, loaded once per run and mutated by the red controls.
// Every file read goes through st.files, so a control that shadows one path is seen by EVERY
// section — §1, §2, §3, §4 and the still loop alike. (Only §2 used to read through a files API,
// which is exactly why no control could reach the other sections.)
function loadState() {
  const overrides = {};
  for (const s of SUBJECTS) {
    for (const p of [`content/${s}/modules.json`, `public/content/${s}/modules.json`]) overrides[p] = readFile(p);
  }
  const own = (p) => Object.prototype.hasOwnProperty.call(overrides, p);
  const files = {
    exists: (p) => own(p) || existsFile(p),
    read: (p) => (own(p) ? overrides[p] : readFile(p)),
    sha256: (p) => (own(p) ? sha256text(overrides[p]) : sha256File(p)),
  };
  return { overrides, files };
}

// ---------------------------------------------------------------------------------------------
/** The real check. `pass`/`fail` are LOCAL here, so control verdicts can never enter the count. */
export function runChecks(st) {
  let pass = 0;
  const failures = [];
  const check = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const eq = (got, want, msg) => check(got === want, `${msg} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
  // headers and notes ride in `failures` behind a \u0000 marker so they print in place and are
  // never counted as assertions
  const section = (t) => failures.push(`\u0000== ${t}`);
  const note = (t) => failures.push(`\u0000   ${t}`);

  const modulesOf = (subject) => JSON.parse(st.files.read(`content/${subject}/modules.json`));
  const rows = SIMS.map((r) => ({ ...r, modules: modulesOf(r.subject) }));

  section("1. each simulation carries live declarative animation (counts read from the file)");
  for (const r of rows) {
    const file = servedPath(r);
    check(st.files.exists(file), `${r.name}: ${file} exists`);
    if (!st.files.exists(file)) continue;
    const text = st.files.read(file);
    const ev = animationEvidence(text);
    note(`${r.name.padEnd(16)} ${ev.count} animation element(s): ${ev.kinds.join(", ")}`);
    note(`${"".padEnd(16)} dur ${[...new Set(ev.durations)].join(", ")} · repeat ${[...new Set(ev.animations.map((a) => a.repeatCount))].join(", ")} · parents with id ${ev.parentsWithId.filter(Boolean).length}/${ev.count}`);
    note(`${"".padEnd(16)} ${r.why}`);
    check(ev.count >= r.min, `${r.name}: at least ${r.min} animation element(s)`);
    for (const k of r.need) check(ev.kinds.includes(k), `${r.name}: has a ${k} animation`);
    check(ev.parentsWithId.every(Boolean), `${r.name}: every animation element sits in a parent that carries an id`);
  }

  section("2. the animated figures keep every rule (animationProblems over the whole table)");
  const problems = animationProblems(rows, st.files);
  check(problems.length === 0, `animationProblems() finds nothing wrong: ${problems.join("; ")}`);
  note(`${problems.length} problem(s) across ${rows.length} simulation(s)`);

  section("3. wiring: each simulation is on the lesson its row names, and no sim is orphaned on disk");
  for (const r of rows) {
    const lessons = allLessons(modulesOf(r.subject));
    const named = lessons.find((l) => l && l.id === r.lesson);
    check(Boolean(named), `${r.name}: lesson "${r.lesson}" exists`);
    const srcs = named && Array.isArray(named.figures) ? named.figures.map((f) => f.src) : [];
    check(srcs.includes(r.src), `${r.name}: lesson "${r.lesson}" lists ${r.src}`);
    const hosts = lessons.filter((l) => Array.isArray(l.figures) && l.figures.some((f) => f && f.src === r.src));
    eq(hosts.length, 1, `${r.name}: the simulation is wired into exactly one lesson`);
    check(figureProblems(named && named.figures, r.subject, st.files).length === 0, `${r.name}: the lesson's figures array is still well formed`);
  }
  // the mirror carries the same wiring (both trees are read, and the modules files are
  // compared byte for byte by check-lesson-figures.mjs — this catches a mirror that was
  // regenerated from a different source)
  for (const s of SUBJECTS) {
    eq(JSON.stringify(modulesOf(s)), JSON.stringify(JSON.parse(st.files.read(`public/content/${s}/modules.json`))),
      `content/ and public/content/ ${s} modules.json agree on the wiring`);
    eq(st.files.sha256(`content/${s}/modules.json`), st.files.sha256(`public/content/${s}/modules.json`),
      `the two ${s} modules.json are byte-identical`);
  }

  for (const s of STILL) {
    eq(animationEvidence(st.files.read(`public${s}`)).count, 0, `${s} is still a static figure (no animation elements)`);
  }

  section("4. summary");
  note(`${SIMS.length} simulations, ${SIMS.reduce((n, r) => n + r.min, 0)} required animation element(s) minimum`);
  note(`lesson anchors: ${SIMS.map((r) => r.lesson).join(", ")}`);
  note(`subjects read: ${SUBJECTS.join(", ")}`);

  return { pass, failures };
}

// ---------------------------------------------------------------------------------------------
// RED CONTROLS. Each takes a fresh state and breaks exactly one thing; every mutation is
// resolved BY NAME (never by array index) and every mutation asserts that it applied, so a
// drifted literal reports BROKEN instead of passing as a control that proved nothing.
const rowByName = (name) => {
  const r = SIMS.find((s) => s.name === name);
  if (!r) throw new Error(`no "${name}" row in the simulation table`);
  return r;
};

/** Replace one file's text; a no-op mutation is an error, not a pass. */
function editText(st, p, fn) {
  const before = st.files.read(p);
  const after = fn(before);
  if (after === before) throw new Error(`the mutation did not apply to ${p}`);
  st.overrides[p] = after;
}

/** Edit a figure in BOTH trees, so only the rule under test fires (not the mirror-drift rule). */
function editFigure(st, r, fn) {
  for (const p of [authorPath(r), servedPath(r)]) editText(st, p, fn);
}

/** Edit a subject's modules.json in both trees, and require the mutation to change something. */
function editModules(st, subject, fn) {
  const author = `content/${subject}/modules.json`;
  const served = `public/content/${subject}/modules.json`;
  const mods = JSON.parse(st.files.read(author));
  const before = JSON.stringify(mods);
  fn(mods);
  const after = JSON.stringify(mods);
  if (after === before) throw new Error(`the mutation did not apply to ${author}`);
  st.overrides[author] = after;
  st.overrides[served] = after;
}

export const RED_CONTROLS = {
  // (a) the sim is written as a still picture: every animation element stripped
  "no-animation": (st) => {
    const r = rowByName("pendulum");
    editFigure(st, r, (t) => t.replace(/<animate(Transform)?\b[^>]*\/?>(<\/animate(Transform)?>)?/g, ""));
  },

  // (b) the animation plays once and freezes
  "no-repeat-count": (st) => {
    const r = rowByName("pendulum");
    editFigure(st, r, (t) => t.replace(' repeatCount="indefinite"', ""));
  },

  // (c) a zero duration
  "zero-duration": (st) => {
    const r = rowByName("pendulum");
    editFigure(st, r, (t) => t.replace(` dur="${r.dur}s"`, ' dur="0s"'));
  },

  // (d) animation markup whose values never change
  "frozen-values": (st) => {
    const r = rowByName("pendulum");
    editFigure(st, r, (t) => t.replace(/values="[^"]*"/g, 'values="10 10;10 10"'));
  },

  // (e) an orphaned animation: moved out of its named parent, directly under <svg>
  "orphaned-animation": (st) => {
    const r = rowByName("pendulum");
    editFigure(st, r, (t) => {
      const m = /<animate(Transform)?[^>]*>(<\/animate(Transform)?>)?/.exec(t);
      if (!m) throw new Error("no animation element found to orphan");
      return t.replace(m[0], "").replace(/(<svg[^>]*>)/, (_open, tag) => `${tag}${m[0]}`);
    });
  },

  // (f) the simulation ships but is wired nowhere
  "wired-nowhere": (st) => {
    const r = rowByName("pendulum");
    editModules(st, r.subject, (mods) => {
      const lesson = allLessons(mods).find((l) => l && l.id === r.lesson);
      if (!lesson) throw new Error(`no lesson "${r.lesson}" to un-wire`);
      const had = Array.isArray(lesson.figures) ? lesson.figures.length : 0;
      const kept = (lesson.figures || []).filter((f) => f && f.src !== r.src);
      if (kept.length === had) throw new Error(`lesson "${r.lesson}" does not list ${r.src}`);
      if (kept.length) lesson.figures = kept; else delete lesson.figures;
    });
  },

  // (g) the served mirror drifts from the author copy
  "mirror-drift": (st) => {
    const r = rowByName("pendulum");
    editText(st, servedPath(r), (t) => t.replace("</svg>", "\n</svg>\n"));
  },

  // (h) the loop length is not the one the lesson's arithmetic gives (positive, so only the
  //     `dur` column can catch it)
  "wrong-duration": (st) => {
    const r = rowByName("pendulum");
    const wrong = r.dur === 1 ? 2 : 1;
    editFigure(st, r, (t) => t.replace(` dur="${r.dur}s"`, ` dur="${wrong}s"`));
  },

  // (i) the transform kind the row requires is gone (count and values unchanged)
  "missing-kind": (st) => {
    const r = rowByName("pendulum");
    const need = r.need.find((k) => k.startsWith("animateTransform:"));
    if (!need) throw new Error("the pendulum row names no animateTransform kind");
    const type = need.split(":")[1];
    const wrong = type === "scale" ? "translate" : "scale";
    editFigure(st, r, (t) => t.replace(` type="${type}"`, ` type="${wrong}"`));
  },

  // (j) an <animate> that names no attribute to animate
  "animate-no-attribute": (st) => {
    const r = SIMS.find((s) => s.need.some((k) => k.startsWith("animate:")));
    if (!r) throw new Error("no row requires an <animate attributeName> kind");
    const attr = r.need.find((k) => k.startsWith("animate:")).split(":")[1];
    editFigure(st, r, (t) => t.replace(` attributeName="${attr}"`, ""));
  },

  // (k) an <animateTransform> that names no transform type
  "transform-no-type": (st) => {
    const r = rowByName("pendulum");
    const need = r.need.find((k) => k.startsWith("animateTransform:"));
    if (!need) throw new Error("the pendulum row names no animateTransform kind");
    const type = need.split(":")[1];
    editFigure(st, r, (t) => t.replace(` type="${type}"`, ""));
  },

  // (l) the same simulation wired into a second lesson — nothing else in the suite checks this
  "two-hosts": (st) => {
    const r = rowByName("pendulum");
    editModules(st, r.subject, (mods) => {
      const lessons = allLessons(mods);
      const host = lessons.find((l) => l && l.id === r.lesson);
      if (!host) throw new Error(`no lesson "${r.lesson}"`);
      const fig = (host.figures || []).find((f) => f && f.src === r.src);
      if (!fig) throw new Error(`lesson "${r.lesson}" does not list ${r.src}`);
      const other = lessons.find((l) => l && l.id !== r.lesson && !(l.figures || []).some((f) => f && f.src === r.src));
      if (!other) throw new Error("no second lesson to wire the simulation into");
      other.figures = [...(other.figures || []), { ...fig }];
    });
  },

  // (m) the lesson the row anchors to is renamed out from under it
  "lesson-renamed": (st) => {
    const r = rowByName("pendulum");
    editModules(st, r.subject, (mods) => {
      const lesson = allLessons(mods).find((l) => l && l.id === r.lesson);
      if (!lesson) throw new Error(`no lesson "${r.lesson}"`);
      lesson.id = `${r.lesson}-renamed`;
    });
  },

  // (n) a figure that must stay still starts moving
  "static-figure-animated": (st) => {
    const target = STILL.find((p) => !SIMS.some((r) => r.src === p));
    if (!target) throw new Error("every figure in the still list is a simulation — nothing to animate");
    const rel = target.replace(/^\/content\//, "");
    const anim = '<animate attributeName="opacity" values="1;0" dur="1s" repeatCount="indefinite"/>\n</svg>';
    for (const p of [`content/${rel}`, `public/content/${rel}`]) editText(st, p, (t) => t.replace("</svg>", anim));
  },

  // (o) the lesson's figures array loses a required key
  "figure-not-well-formed": (st) => {
    const r = rowByName("pendulum");
    editModules(st, r.subject, (mods) => {
      const lesson = allLessons(mods).find((l) => l && l.id === r.lesson);
      if (!lesson) throw new Error(`no lesson "${r.lesson}"`);
      const fig = (lesson.figures || []).find((f) => f && f.src === r.src);
      if (!fig) throw new Error(`lesson "${r.lesson}" does not list ${r.src}`);
      delete fig.alt;
    });
  },
};

// ---------------------------------------------------------------------------------------------
// Every control is PINNED, and pinned to an ARRAY: the first entry is the rule the control
// exists for, and where the failure reaches the run through §2 that §2 message is pinned too —
// which is what makes deleting the §2 assertion red the run instead of leaving it green.
// Pins are stable PREFIXES of the shipped messages (eq() appends "(got …, want …)").
export const RED_EXPECT = {
  "no-animation": [`${P.name}: at least ${P.min} animation element(s)`, `expected at least ${P.min}`],
  "no-repeat-count": ["must loop indefinitely"],
  "zero-duration": ["a duration must be positive"],
  "frozen-values": ["two different numbers"],
  "orphaned-animation": [`${P.name}: every animation element sits in a parent that carries an id`, "carries no id"],
  "wired-nowhere": [`${P.name}: lesson "${P.lesson}" lists`, "wired nowhere"],
  "mirror-drift": ["must be byte-identical"],
  "wrong-duration": [`expected ${P.dur}s`],
  "missing-kind": [`no ${P.need.find((k) => k.startsWith("animateTransform:"))}`],
  "animate-no-attribute": ["names no attribute to animate"],
  "transform-no-type": ["names no transform type"],
  "two-hosts": ["wired into exactly one lesson"],
  "lesson-renamed": [`${P.name}: lesson "${P.lesson}" exists`, "wired to nothing"],
  "static-figure-animated": ["is still a static figure"],
  "figure-not-well-formed": ["figures array is still well formed"],
};

// ---------------------------------------------------------------------------------------------
/** Run one control against a fresh load. ok = caught, and caught by the assertion it names. */
function runControl(name) {
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name] || [];
  if (!expect.length)
    return { ok: false, real, why: "NO PINNED EXPECTATION — this control is not aimed at any assertion" };
  const missing = expect.filter((e) => !real.some((f) => f.includes(e)));
  if (missing.length)
    return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${missing[0]}"` };
  return { ok: true, real: real.filter((f) => expect.some((e) => f.includes(e))) };
}

/** Both directions between the registry and its pins: a control with no pin, a pin with no control. */
function registryProblems() {
  const out = [];
  for (const n of Object.keys(RED_CONTROLS))
    if (!(RED_EXPECT[n] || []).length) out.push(`red control "${n}" has NO PINNED EXPECTATION`);
  for (const n of Object.keys(RED_EXPECT))
    if (!(n in RED_CONTROLS)) out.push(`RED_EXPECT names "${n}", which is not a red control`);
  if (Object.keys(RED_EXPECT).length !== Object.keys(RED_CONTROLS).length)
    out.push(`the registry and its pins disagree: ${Object.keys(RED_CONTROLS).length} controls, ${Object.keys(RED_EXPECT).length} pins`);
  return out;
}

/** The reader must see the shipped animation, or every "not caught" verdict below is meaningless. */
function instrumentProblems(st) {
  const out = [];
  for (const r of SIMS) {
    const ev = animationEvidence(st.files.read(servedPath(r)));
    if (!(ev.count >= r.min) || !ev.parentsWithId.every(Boolean))
      out.push(`the reader is blind to ${r.name}: saw ${ev.count} animation element(s), ${ev.parentsWithId.filter(Boolean).length} with a named parent`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);

// --red-control <name>: run exactly one control, before the real half, and exit on its verdict.
const only = argv.includes("--red-control") ? argv[argv.indexOf("--red-control") + 1] : null;
if (only) {
  if (!RED_CONTROLS[only]) {
    console.log(`unknown red control: ${only}`);
    console.log(`known: ${Object.keys(RED_CONTROLS).join(", ")}`);
    process.exit(2);
  }
  let r;
  try {
    r = runControl(only);
  } catch (e) {
    console.log(`RED CONTROL "${only}" BROKE — ${e.message}`);
    process.exit(1);
  }
  if (!r.ok) {
    console.log(`RED CONTROL "${only}" ${r.why}`);
    r.real.slice(0, 3).forEach((f) => console.log("   " + f));
    process.exit(1);
  }
  console.log(`red control "${only}": caught — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}

// ---- the real half
const st = loadState();
const { pass, failures } = runChecks(st);
for (const f of failures) {
  if (f.startsWith("\u0000== ")) console.log(`\n${f.slice(4)}`);
  else if (f.startsWith("\u0000   ")) console.log(f.slice(4));
  else console.log("FAIL: " + f);
}
const realFailures = failures.filter((f) => !f.startsWith("\u0000")).length;
console.log(`\ncheck-physics-animations: ${pass} checks passed, ${realFailures} failed`);
if (realFailures) {
  console.log("\nA failure here means a shipped simulation is not the animated figure it is meant to be\n" +
    "(or has been wired to nothing). Re-run tools/gen-physics-figures.mjs to regenerate it —\n" +
    "never hand-edit an SVG to satisfy the harness.");
}

// --no-red-control is the ONLY opt-out, and it sits after the real half.
if (argv.includes("--no-red-control")) process.exit(realFailures ? 1 : 0);

// ---- the red-control half: on by default, because the suite passes no arguments
const names = Object.keys(RED_CONTROLS);
let bad = 0;
try {
  for (const name of names) {
    let r;
    try {
      r = runControl(name);
    } catch (e) {
      bad++;
      console.log(`BROKEN: ${name} — ${e.message}`);
      continue;
    }
    if (!r.ok) {
      bad++;
      console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`);
      r.real.slice(0, 3).forEach((f) => console.log("   " + f));
    } else {
      console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
    }
  }
} catch (e) {
  bad++;
  console.log(`BROKEN: the red-control sweep threw — ${e.message}`);
} finally {
  // these run even if the sweep threw: a control that cannot run must not hide the fact that
  // the registry and the instrument were never checked.
  for (const p of registryProblems()) { bad++; console.log("REGISTRY: " + p); }
  for (const p of instrumentProblems(loadState())) { bad++; console.log("INSTRUMENT: " + p); }
  console.log(`\n${names.length} red controls, ${bad} not caught`);
  // ONE exit code for both halves: a failing real check and an uncaught control are both red.
  process.exit(realFailures || bad ? 1 : 0);
}
