// check-biology-bank-balance — the Biology practice bank and knowledge check must tell the
// truth about the 30 lessons that actually ship.
//
// The coverage build finished with two banks that had never been re-balanced after the lessons
// were added: 12 of the 30 lessons had no practice question at all, and the knowledge check put
// 25 questions on 11 lessons with three whole modules carrying none. Nothing failed, because
// nothing looked — check-biology-labs deliberately does not assert "no lesson has zero practice
// items" (a new lesson lands before its bank does).
//
// It asserts, for content/biology and its byte-identical public/content mirror:
//   1. practice holds exactly practiceBankSize("biology") questions (read from src/data/bankSizes.js,
//      never retyped) and the knowledge check exactly knowledgeCheckSize().
//   2. every question's topic names a LIVE lesson id in modules.json — no dead id, no orphan.
//   3. every one of the lessons carries at least 3 practice questions and none more than 5, and
//      drilled + undrilled equals the lesson total (a counter that cannot detect a double-count
//      is not a counter).
//   4. the knowledge check sits on 25 DISTINCT lessons, every module carries its allocated
//      count and no module carries none. The allocation below is the LEAD's ruling of
//      2026-11-19, NOT an owner-endorsed rule: "5 per section" is arithmetically impossible with
//      9 modules (5 x 9 = 45 > 25), so Biology distributes 25 across the 9 modules instead,
//      exactly as Mathematics did.
//   5. every question has four distinct options, an answer that is one of them, a non-empty
//      explanation and an id unique across the bank.
//   6. content/biology/*.json and public/content/biology/*.json are byte-identical.
//
// The harness cannot prove a marked option is the RIGHT one — it proves the item exists, is
// well-formed and is reachable. Every new question's answer was re-derived from its own prompt
// by hand, and its explanation states only facts the hosting lesson already carries.
//
// Red controls run BY DEFAULT, because the suite invokes every harness with no arguments and a
// control behind a flag is a control the suite never runs (the measured defect of 8 harnesses,
// 2026-11-19). `--no-red-control` skips them. Each control synthesises the broken state it
// needs from the shipped bank rather than relying on one being present.
//
// Usage:
//   node tools/check-biology-bank-balance.mjs                  # the real check + every red control
//   node tools/check-biology-bank-balance.mjs --no-red-control # the real check only
//   node tools/check-biology-bank-balance.mjs --red-control <name>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { practiceBankSize, knowledgeCheckSize } from "../src/data/bankSizes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const readBytes = (p) => fs.readFileSync(path.join(root, p));

const WANT_PRACTICE = practiceBankSize("biology");
const WANT_KC = knowledgeCheckSize();
const MIN_PER_LESSON = 3;
const MAX_PER_LESSON = 5;
// The LEAD's allocation ruling (2026-11-19) — not an owner-endorsed rule. It sums to 25.
const KC_ALLOCATION = {
  "cells-life-processes": 3,
  "nutrition-transport": 4,
  "respiration-excretion": 4,
  "ecology-environment": 4,
  "genetics-variation": 4,
  "coordination-response": 2,
  "health-and-disease": 2,
  "reproduction-development": 1,
  "diversity-classification": 1,
};
const SHAPE = ["id", "question", "options", "answer", "explanation", "topic"];

function loadState() {
  const modules = readJson("content/biology/modules.json");
  return {
    modules,
    practice: readJson("content/biology/practice.json"),
    kc: readJson("content/biology/knowledge-check.json"),
    mirror: {
      "practice.json": [readBytes("content/biology/practice.json"), readBytes("public/content/biology/practice.json")],
      "knowledge-check.json": [
        readBytes("content/biology/knowledge-check.json"),
        readBytes("public/content/biology/knowledge-check.json"),
      ],
    },
  };
}

const lessonsOf = (modules) => modules.flatMap((m) => (m.lessons || []).map((l) => l.id));
const moduleOfLesson = (modules) =>
  new Map(modules.flatMap((m) => (m.lessons || []).map((l) => [l.id, m.id])));

/** Every problem in one bank's shape: options, answer, explanation, id, live topic. */
function shapeProblems(bank, live) {
  const out = [];
  const seen = new Set();
  for (const q of bank) {
    const id = q && q.id;
    if (seen.has(id)) out.push(`${id}: duplicate id`);
    seen.add(id);
    if (!q || JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) {
      out.push(`${id}: keys are ${q ? Object.keys(q).join(",") : "missing"}`);
      continue;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) out.push(`${id}: options are not 4`);
    else if (new Set(q.options).size !== 4) out.push(`${id}: options are not distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${id}: the answer is not one of its options`);
    if (!String(q.explanation || "").trim()) out.push(`${id}: empty explanation`);
    if (!String(q.question || "").trim()) out.push(`${id}: empty question`);
    if (!live.has(q.topic)) out.push(`${id}: topic ${q.topic} names no live lesson`);
  }
  return out;
}

/** Every problem the two banks have against the shipped lessons and the allocation ruling. */
function bankProblems(state) {
  const { modules, practice, kc } = state;
  const lessons = lessonsOf(modules);
  const live = new Set(lessons);
  const moduleOf = moduleOfLesson(modules);
  const out = [];

  // 1. the two sizes
  if (practice.length !== WANT_PRACTICE) out.push(`practice holds ${practice.length}, want ${WANT_PRACTICE}`);
  if (kc.length !== WANT_KC) out.push(`knowledge check holds ${kc.length}, want ${WANT_KC}`);

  // 2 + 5. shape, unique ids and a live lesson for every topic
  out.push(...shapeProblems(practice, live));
  out.push(...shapeProblems(kc, live));

  // 3. every lesson drilled, between 3 and 5 questions, and the counts add up
  const perLesson = new Map();
  for (const q of practice) perLesson.set(q.topic, (perLesson.get(q.topic) || 0) + 1);
  const drilled = lessons.filter((l) => perLesson.has(l));
  const undrilled = lessons.filter((l) => !perLesson.has(l));
  if (drilled.length + undrilled.length !== lessons.length)
    out.push(`drilled ${drilled.length} + undrilled ${undrilled.length} does not equal ${lessons.length} lessons`);
  for (const l of undrilled) out.push(`${l}: has no practice question`);
  for (const l of lessons) {
    const n = perLesson.get(l) || 0;
    if (n > 0 && (n < MIN_PER_LESSON || n > MAX_PER_LESSON))
      out.push(`${l}: carries ${n} practice questions, want ${MIN_PER_LESSON} to ${MAX_PER_LESSON}`);
  }

  // 4. the knowledge check: 25 distinct lessons, the allocation, no module at zero
  const kcLessons = kc.map((q) => q.topic);
  const distinct = new Set(kcLessons);
  if (distinct.size !== WANT_KC)
    out.push(`the knowledge check sits on ${distinct.size} distinct lessons, want ${WANT_KC}`);
  const perLessonKc = new Map();
  for (const t of kcLessons) perLessonKc.set(t, (perLessonKc.get(t) || 0) + 1);
  for (const [lesson, n] of perLessonKc) if (n > 1) out.push(`${lesson}: carries ${n} knowledge-check questions, want 1`);
  const perModule = new Map(modules.map((m) => [m.id, 0]));
  for (const q of kc) {
    const m = moduleOf.get(q.topic);
    if (m) perModule.set(m, (perModule.get(m) || 0) + 1);
  }
  for (const m of modules) {
    const want = KC_ALLOCATION[m.id];
    const got = perModule.get(m.id) || 0;
    if (want === undefined) out.push(`${m.id}: has no knowledge-check allocation`);
    else if (got !== want) out.push(`${m.id}: carries ${got} knowledge-check questions, want ${want}`);
    if (got === 0) out.push(`${m.id}: carries 0 knowledge-check questions`);
    if (got > (m.lessons || []).length) out.push(`${m.id}: carries ${got} questions for ${(m.lessons || []).length} lessons`);
  }
  const allocSum = Object.values(KC_ALLOCATION).reduce((a, b) => a + b, 0);
  if (allocSum !== WANT_KC) out.push(`the allocation ruling sums to ${allocSum}, want ${WANT_KC}`);
  if (Object.keys(KC_ALLOCATION).length !== modules.length)
    out.push(`the allocation names ${Object.keys(KC_ALLOCATION).length} modules, the subject has ${modules.length}`);

  // 6. the mirrors
  for (const [file, [a, b]] of Object.entries(state.mirror)) {
    if (!a.equals(b)) out.push(`${file}: the two mirrors differ`);
  }
  return out;
}

// ------------------------------------------------------------------ the red controls
// Each control names the failure it must produce. A control that fails for the WRONG reason
// proves nothing, so the expected message is required to appear in the real failure list.
const RED_CONTROLS = {
  "practice-99": {
    expect: [`practice holds ${WANT_PRACTICE - 1}`],
    make: (st) => ({ ...st, practice: st.practice.slice(0, WANT_PRACTICE - 1) }),
  },
  "practice-101": {
    expect: [`practice holds ${WANT_PRACTICE + 1}`],
    make: (st) => ({ ...st, practice: [...st.practice, { ...st.practice[0], id: "synthetic-extra", question: "synthetic extra question" }] }),
  },
  "lesson-with-no-practice": {
    // Synthesised: the lesson carrying the FEWEST questions loses all of them. With the
    // shipped bank every lesson carries 3 or 4, so this always creates the zero state.
    expect: ["has no practice question"],
    make: (st) => {
      const lessons = lessonsOf(st.modules);
      const n = new Map(lessons.map((l) => [l, 0]));
      for (const q of st.practice) n.set(q.topic, (n.get(q.topic) || 0) + 1);
      const fewest = lessons.reduce((a, b) => (n.get(b) < n.get(a) ? b : a));
      return { ...st, practice: st.practice.filter((q) => q.topic !== fewest) };
    },
  },
  "lesson-over-the-cap": {
    expect: [`want ${MIN_PER_LESSON} to ${MAX_PER_LESSON}`],
    make: (st) => {
      const lessons = lessonsOf(st.modules);
      const n = new Map(lessons.map((l) => [l, 0]));
      for (const q of st.practice) n.set(q.topic, (n.get(q.topic) || 0) + 1);
      const most = lessons.reduce((a, b) => (n.get(b) > n.get(a) ? b : a));
      const extra = [];
      for (let i = 0; i <= MAX_PER_LESSON; i++)
        extra.push({ ...st.practice.find((q) => q.topic === most), id: `synthetic-cap-${i}`, question: `synthetic cap question ${i}` });
      return { ...st, practice: [...st.practice, ...extra] };
    },
  },
  "kc-24": {
    expect: [`knowledge check holds ${WANT_KC - 1}`],
    make: (st) => ({ ...st, kc: st.kc.slice(0, WANT_KC - 1) }),
  },
  "kc-two-on-one-lesson": {
    expect: ["want 1"],
    make: (st) => ({ ...st, kc: st.kc.map((q, i) => (i === 1 ? { ...q, topic: st.kc[0].topic } : q)) }),
  },
  "module-with-no-kc": {
    // Synthesised: the module with the SMALLEST allocation loses its questions.
    expect: ["carries 0 knowledge-check questions"],
    make: (st) => {
      const smallest = Object.keys(KC_ALLOCATION).reduce((a, b) => (KC_ALLOCATION[b] < KC_ALLOCATION[a] ? b : a));
      const moduleOf = moduleOfLesson(st.modules);
      return { ...st, kc: st.kc.filter((q) => moduleOf.get(q.topic) !== smallest) };
    },
  },
  "dead-topic": {
    expect: ["names no live lesson"],
    make: (st) => ({ ...st, practice: st.practice.map((q, i) => (i === 0 ? { ...q, topic: "no-such-lesson" } : q)) }),
  },
  "answer-not-an-option": {
    expect: ["the answer is not one of its options"],
    make: (st) => ({ ...st, kc: st.kc.map((q, i) => (i === 0 ? { ...q, answer: "an answer that is not an option" } : q)) }),
  },
  "perturbed-mirror": {
    expect: ["the two mirrors differ"],
    make: (st) => ({
      ...st,
      mirror: { ...st.mirror, "practice.json": [st.mirror["practice.json"][0], Buffer.concat([st.mirror["practice.json"][1], Buffer.from("\n")])] },
    }),
  },
};

// --------------------------------------------------------------------------------- the run
const argv = process.argv.slice(2);
const state = loadState();
const lessons = lessonsOf(state.modules);
const live = new Set(lessons);
const problems = bankProblems(state);

let pass = 0;
let fail = 0;
const check = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.log("FAIL: " + msg);
  }
};

console.log("== 1. the sizes and the shape of both banks");
check(state.practice.length === WANT_PRACTICE, `practice holds ${state.practice.length}, want ${WANT_PRACTICE}`);
check(state.kc.length === WANT_KC, `knowledge check holds ${state.kc.length}, want ${WANT_KC}`);
for (const q of state.practice) {
  check(JSON.stringify(Object.keys(q)) === JSON.stringify(SHAPE), `${q.id}: keys are ${Object.keys(q).join(",")}`);
  check(Array.isArray(q.options) && q.options.length === 4, `${q.id}: options are not 4`);
  check(new Set(q.options).size === 4, `${q.id}: options are not distinct`);
  check(q.options.includes(q.answer), `${q.id}: the answer is not one of its options`);
  check(!!String(q.explanation || "").trim(), `${q.id}: empty explanation`);
  check(live.has(q.topic), `${q.id}: topic ${q.topic} names no live lesson`);
}
check(new Set(state.practice.map((q) => q.id)).size === state.practice.length, "practice ids are unique");

console.log("\n== 2. every lesson is drilled, 3 to 5 questions each");
const perLesson = new Map();
for (const q of state.practice) perLesson.set(q.topic, (perLesson.get(q.topic) || 0) + 1);
const undrilled = lessons.filter((l) => !perLesson.has(l));
check(perLesson.size + undrilled.length === lessons.length, `drilled ${perLesson.size} + undrilled ${undrilled.length} does not equal ${lessons.length} lessons`);
check(undrilled.length === 0, `${undrilled.length} lessons have no practice question: ${undrilled.join(", ")}`);
for (const l of lessons) {
  const n = perLesson.get(l) || 0;
  check(n >= MIN_PER_LESSON && n <= MAX_PER_LESSON, `${l}: carries ${n} practice questions, want ${MIN_PER_LESSON} to ${MAX_PER_LESSON}`);
}
console.log(`   practice drills ${perLesson.size} of ${lessons.length} lessons; ${undrilled.length} undrilled`);
console.log(`   the ten lessons carrying 4: ${lessons.filter((l) => perLesson.get(l) === 4).join(", ")}`);

console.log("\n== 3. the knowledge check: 25 on 25 distinct lessons, the allocation ruling per module");
const moduleOf = moduleOfLesson(state.modules);
const kcLessons = new Set(state.kc.map((q) => q.topic));
check(kcLessons.size === WANT_KC, `the knowledge check sits on ${kcLessons.size} distinct lessons, want ${WANT_KC}`);
const kcCount = new Map();
for (const q of state.kc) kcCount.set(q.topic, (kcCount.get(q.topic) || 0) + 1);
for (const [lesson, n] of kcCount) check(n === 1, `${lesson}: carries ${n} knowledge-check questions, want 1`);
for (const m of state.modules) {
  const got = state.kc.filter((q) => moduleOf.get(q.topic) === m.id).length;
  const want = KC_ALLOCATION[m.id];
  check(want !== undefined, `${m.id}: has no knowledge-check allocation`);
  check(got === want, `${m.id}: carries ${got} knowledge-check questions, want ${want}`);
  check(got > 0, `${m.id}: carries 0 knowledge-check questions`);
  check(got <= (m.lessons || []).length, `${m.id}: carries ${got} questions for ${(m.lessons || []).length} lessons`);
}
check(Object.values(KC_ALLOCATION).reduce((a, b) => a + b, 0) === WANT_KC, "the allocation ruling sums to 25");
check(Object.keys(KC_ALLOCATION).length === state.modules.length, "the allocation names every module");
for (const q of state.kc) {
  check(JSON.stringify(Object.keys(q)) === JSON.stringify(SHAPE), `${q.id}: keys are ${Object.keys(q).join(",")}`);
  check(Array.isArray(q.options) && q.options.length === 4, `${q.id}: options are not 4`);
  check(new Set(q.options).size === 4, `${q.id}: options are not distinct`);
  check(q.options.includes(q.answer), `${q.id}: the answer is not one of its options`);
  check(!!String(q.explanation || "").trim(), `${q.id}: empty explanation`);
  check(live.has(q.topic), `${q.id}: topic ${q.topic} names no live lesson`);
}
check(new Set(state.kc.map((q) => q.id)).size === state.kc.length, "knowledge-check ids are unique");
console.log(`   distribution ${Object.keys(KC_ALLOCATION).map((m) => `${m}:${state.kc.filter((q) => moduleOf.get(q.topic) === m).length}`).join(" ")} = ${state.kc.length}`);

console.log("\n== 4. content/ and public/content/ are byte-identical");
for (const [file, [a, b]] of Object.entries(state.mirror)) {
  check(a.length > 0 && a.equals(b), `${file}: the two mirrors differ`);
}

// The single derived failure list, used by the summary line and by every red control.
check(problems.length === 0, `the two banks have ${problems.length} problems: ${problems.slice(0, 3).join("; ")}`);
console.log(`\ncheck-biology-bank-balance: ${pass} checks passed, ${fail} failed`);

if (argv.includes("--no-red-control")) process.exit(fail ? 1 : 0);

const only = argv.includes("--red-control") ? argv[argv.indexOf("--red-control") + 1] : null;
const runControl = (name) => {
  const ctl = RED_CONTROLS[name];
  const broken = bankProblems(ctl.make(state));
  const missing = ctl.expect.filter((e) => !broken.some((f) => f.includes(e)));
  return { ok: broken.length > 0 && missing.length === 0, real: broken, missing };
};
if (only) {
  if (!RED_CONTROLS[only]) {
    console.log(`unknown red control: ${only}`);
    process.exit(2);
  }
  const r = runControl(only);
  if (!r.ok) {
    console.log(`RED CONTROL "${only}" ${r.real.length ? "CAUGHT BY THE WRONG ASSERTION — missing " + r.missing[0] : "NOT CAUGHT"}`);
    r.real.slice(0, 3).forEach((f) => console.log("   " + f));
    process.exit(1);
  }
  console.log(`red control "${only}": caught — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}

console.log("\n== 5. red controls — every guard above must bite (they run by default)");
let bad = 0;
for (const name of Object.keys(RED_CONTROLS)) {
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
    console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.missing[0] || "no failure at all"}`);
  } else {
    console.log(`caught (${r.real.length}): ${name} — ${r.real.find((f) => RED_CONTROLS[name].expect.some((e) => f.includes(e)))}`);
  }
}
console.log(`${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
process.exit(fail || bad ? 1 : 0);
