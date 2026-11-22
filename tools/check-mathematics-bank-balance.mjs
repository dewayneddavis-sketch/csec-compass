// check-mathematics-bank-balance — the Mathematics practice bank and knowledge check must tell
// the truth about the 63 lessons that actually ship.
//
// Before this harness existed, the orphan-topic check lived only in a brief: seven questions
// tested topics no lesson taught, and the knowledge check put three questions on one lesson and
// none on the three the bank never examined. Nothing failed, because nothing looked.
//
// It asserts, for content/ and its byte-identical public/ mirror:
//   1. practice: exactly practiceBankSize("mathematics") questions (150 since the
//      owner's Mathematics exception; the size is READ, never retyped here), every
//      topic naming a LIVE lesson (orphans must read 0), no two questions with the
//      same text inside one lesson, four distinct options, the answer among them,
//      and a multi-step explanation (the same rule check-math-review-loop applies).
//   1b. every one of the live lessons is drilled by at least one practice question,
//      and at least one lesson carries exactly one (so the fallback path is real).
//   2. knowledge check: exactly 25, distributed 3 per module for the seven largest modules and
//      2 for the rest (25 = 3x7 + 2x2), never two questions on one lesson inside a module, the
//      named gap closed (factorization, quadratic-equations, inequalities), and the same shape,
//      option, answer and orphan rules as the practice bank.
//   3. the mirrors are byte-identical.
//   4. the red controls (PR #269 shape, as check-english-b-coverage and
//      check-information-technology-coverage carry it): every guard above is shown to bite on a
//      perturbed copy of the shipped bytes, and — this is the part that makes a control evidence —
//      each control is PINNED to the failure text of the assertion it exists for. A control that
//      trips some other assertion is not proof that its own guard still checks anything: the old
//      C4/C5/C6 here passed only because a different assertion happened to fire. Every mutation
//      resolves its target by id (or by a derived property of the bank), never by array index,
//      because an index re-aims silently the moment the bank is re-balanced.
//
// Usage:
//   node tools/check-mathematics-bank-balance.mjs                    real check + every red control
//   node tools/check-mathematics-bank-balance.mjs --red-control NAME  one control, on its own
//   node tools/check-mathematics-bank-balance.mjs --no-red-control    the real check only (the only opt-out)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { practiceBankSize } from "../src/data/bankSizes.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const readBytes = (p) => fs.readFileSync(path.join(root, p));

const SHAPE = ["id", "question", "options", "answer", "explanation", "topic"];
// The practice size is the owner's Mathematics exception, read from the one place
// that owns it. Retyping 150 here would let the harness and the promise drift.
const PRACTICE = practiceBankSize("mathematics");
const KC = 25;
// The knowledge check's distribution: a third question to the seven largest modules.
const KC_THIRD_FOR_LARGEST = 7;
// The gap the re-balance had to close, named by the owner's ruling rather than derived.
const GAP = ["factorization", "quadratic-equations", "inequalities"];
// Section 3's files. The mirror control drifts the first of these.
const MIRROR_FILES = ["practice.json", "knowledge-check.json", "modules.json"];

/** A fresh read of everything the checks look at, so a control can perturb one copy. */
function loadState() {
  const modules = readJson("content/mathematics/modules.json");
  return {
    practice: readJson("content/mathematics/practice.json"),
    kc: readJson("content/mathematics/knowledge-check.json"),
    modules,
    lessons: modules.flatMap((m) => (m.lessons || []).map((l) => l.id)),
    mirrors: MIRROR_FILES.map((file) => ({
      file,
      content: readBytes(`content/mathematics/${file}`),
      public: readBytes(`public/content/mathematics/${file}`),
    })),
  };
}

/** The knowledge check's plan: which module each lesson sits in, and how many questions each wants. */
function kcPlan(modules) {
  const moduleOf = new Map(modules.flatMap((m) => (m.lessons || []).map((l) => [l.id, m.id])));
  const size = new Map(modules.map((m) => [m.id, (m.lessons || []).length]));
  // largest first; ties keep file order, which is stable and only ever separates 6-lesson modules
  // that all receive the third question anyway.
  const ranked = modules.map((m) => m.id).sort((a, b) => size.get(b) - size.get(a));
  const wantPerModule = new Map(ranked.map((id, i) => [id, i < KC_THIRD_FOR_LARGEST ? 3 : 2]));
  return { moduleOf, wantPerModule, ranked };
}

/** Everything wrong with the practice bank. */
function practiceProblems(bank, live) {
  const out = [];
  if (bank.length !== PRACTICE) out.push(`practice holds ${bank.length}, want ${PRACTICE}`);
  const ids = bank.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const perTopic = new Map();
  for (const q of bank) {
    if (JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) out.push(`${q.id}: keys ${Object.keys(q).join(",")}`);
    if (!Array.isArray(q.options) || q.options.length !== 4) out.push(`${q.id}: options are not 4`);
    else if (new Set(q.options).size !== 4) out.push(`${q.id}: options are not distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if ((String(q.explanation || "").match(/\n/g) || []).length < 2) out.push(`${q.id}: explanation is not multi-step`);
    if (!live.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic} names no lesson`);
    const text = String(q.question || "").trim().toLowerCase();
    const seen = perTopic.get(q.topic) || new Set();
    if (seen.has(text)) out.push(`${q.id}: duplicate question text inside ${q.topic}`);
    seen.add(text);
    perTopic.set(q.topic, seen);
  }
  return out;
}

/** Everything wrong with the knowledge check. */
function checkProblems(kc, live, mapLesson, want) {
  const out = [];
  if (kc.length !== KC) out.push(`knowledge check holds ${kc.length}, want ${KC}`);
  const ids = kc.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
  const perTopic = new Map();
  for (const q of kc) {
    if (JSON.stringify(Object.keys(q)) !== JSON.stringify(SHAPE)) out.push(`${q.id}: keys ${Object.keys(q).join(",")}`);
    if (!Array.isArray(q.options) || q.options.length !== 4) out.push(`${q.id}: options are not 4`);
    else if (new Set(q.options).size !== 4) out.push(`${q.id}: options are not distinct`);
    if (!(q.options || []).includes(q.answer)) out.push(`${q.id}: the answer is not one of its options`);
    if ((String(q.explanation || "").match(/\n/g) || []).length < 2) out.push(`${q.id}: explanation is not multi-step`);
    if (!live.has(q.topic)) out.push(`${q.id}: orphan topic ${q.topic} names no lesson`);
    const text = String(q.question || "").trim().toLowerCase();
    const seen = perTopic.get(q.topic) || new Set();
    if (seen.has(text)) out.push(`${q.id}: duplicate question text inside ${q.topic}`);
    seen.add(text);
    perTopic.set(q.topic, seen);
  }
  for (const [mod, wantN] of want) {
    const mine = kc.filter((q) => mapLesson.get(q.topic) === mod);
    if (mine.length !== wantN) out.push(`module ${mod} holds ${mine.length}, want ${wantN}`);
    const distinct = new Set(mine.map((q) => q.topic));
    if (distinct.size !== mine.length) out.push(`module ${mod} asks ${mine.length} questions on ${distinct.size} lessons`);
  }
  const unplaced = kc.filter((q) => !mapLesson.has(q.topic));
  if (unplaced.length) out.push(`${unplaced.length} questions sit outside every module`);
  for (const lesson of GAP) {
    const n = kc.filter((q) => q.topic === lesson).length;
    if (n !== 1) out.push(`the named gap ${lesson} holds ${n} questions, want 1`);
  }
  return out;
}

/** The live lessons no practice question drills. */
function undrilledLessons(bank, all) {
  const drilled = new Set(bank.map((q) => q.topic));
  return all.filter((l) => !drilled.has(l));
}

/** The live lessons carrying exactly one practice question — the fallback path. */
function singleQuestionLessons(bank, all) {
  const n = new Map();
  for (const q of bank) n.set(q.topic, (n.get(q.topic) || 0) + 1);
  return all.filter((l) => n.get(l) === 1);
}

/**
 * The two coverage guards, extracted so a red control can reach THEM and not only the helpers.
 * Before this, the stripped-lesson and second-question controls drove `undrilledLessons` and
 * `singleQuestionLessons` and asserted on their return values: deleting the real assertions
 * (`:147`, `:150`) left both controls green.
 */
function bankProblems(bank, all) {
  const out = [];
  const undrilled = undrilledLessons(bank, all);
  // Every shipped lesson is drilled at least once. This is the assertion the
  // re-balance existed to earn: before it, 16 of the 63 lessons were unreachable
  // from the practice tab and nothing failed, because nothing looked.
  if (undrilled.length) out.push(`${undrilled.length} lessons have no practice question: ${undrilled.join(", ")}`);
  const single = singleQuestionLessons(bank, all);
  if (!single.length) out.push("no lesson carries exactly one question, so the single-question fallback is not real");
  return out;
}

/** Section 3's comparison, extracted so a control can drift a byte and require it to fail. */
const mirrorsEqual = (a, b) => a.equals(b) && a.length > 0;

// ------------------------------------------------------------------------- the run
function runChecks(st) {
  const { moduleOf, wantPerModule, ranked } = kcPlan(st.modules);
  const lessons = st.lessons;
  const lessonIds = new Set(lessons);
  const info = [];
  const failures = [];
  let pass = 0;
  const ok = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const problemsMsg = (what, problems) => `${what} has ${problems.length} problem${problems.length === 1 ? "" : "s"}: ${problems.join(" | ")}`;

  info.push(`\n== 1. the practice bank: ${PRACTICE} questions, every topic naming a live lesson`);
  const practiceOut = practiceProblems(st.practice, lessonIds);
  // ONE assertion per section, with every problem inside its message. The old shape counted each
  // problem AND an "is empty" summary, so the printed denominator was never a count of assertions.
  ok(practiceOut.length === 0, problemsMsg("the practice bank", practiceOut));

  const drilled = new Set(st.practice.map((q) => q.topic));
  const undrilled = undrilledLessons(st.practice, lessons);
  info.push(`   practice drills ${drilled.size} of ${lessons.length} lessons; ${undrilled.length} have no practice question`);
  info.push(`   (${undrilled.join(", ")})`);
  ok(lessonIds.size === lessons.length, "lesson ids are unique");
  ok(drilled.size + undrilled.length === lessons.length, "the drilled and undrilled counts add up to the lesson total");
  const single = singleQuestionLessons(st.practice, lessons);
  info.push(`   ${single.length} lessons carry exactly one question: ${single.join(", ")}`);
  const coverageOut = bankProblems(st.practice, lessons);
  ok(coverageOut.length === 0, problemsMsg("practice coverage", coverageOut));

  info.push("\n== 2. the knowledge check: 25, 3 for the seven largest modules and 2 for the rest");
  const kcOut = checkProblems(st.kc, lessonIds, moduleOf, wantPerModule);
  ok(kcOut.length === 0, problemsMsg("the knowledge check", kcOut));
  const dist = ranked.map((m) => `${m}:${st.kc.filter((q) => moduleOf.get(q.topic) === m).length}`).join(" ");
  info.push(`   distribution ${dist} = ${st.kc.length}`);
  const kcLessons = new Set(st.kc.map((q) => q.topic));
  info.push(`   the knowledge check drills ${kcLessons.size} of ${lessons.length} lessons; ${lessons.length - kcLessons.size} have no question`);
  ok(st.kc.length === [...wantPerModule.values()].reduce((a, b) => a + b, 0), "the per-module rule adds up to 25");
  ok([...wantPerModule.values()].filter((n) => n === 3).length === KC_THIRD_FOR_LARGEST, "exactly seven modules carry a third question");

  info.push("\n== 3. content/ and public/content/ are byte-identical");
  for (const m of st.mirrors) ok(mirrorsEqual(m.content, m.public), `${m.file}: the two mirrors differ`);

  return { pass, failures, info };
}

// ---------------------------------------------------------------------------------------------
// The control targets. Every one is DERIVED from the shipped bank or resolved by id — never an
// array index: practice[7], kc[1] and lessons[length-1] all re-aim silently when the bank is
// re-balanced, and Mathematics has already been re-balanced once.
const BASE = loadState();
const BASE_PLAN = kcPlan(BASE.modules);
const BASE_LESSONS = BASE.lessons;
const byId = (id) => {
  const q = BASE.practice.find((x) => x.id === id);
  if (!q) throw new Error(`control target practice question ${id} no longer exists — re-derive the target`);
  return q;
};
const kcById = (id) => {
  const q = BASE.kc.find((x) => x.id === id);
  if (!q) throw new Error(`control target knowledge-check question ${id} no longer exists — re-derive the target`);
  return q;
};
const countByTopic = (() => {
  const n = new Map();
  for (const q of BASE.practice) n.set(q.topic, (n.get(q.topic) || 0) + 1);
  return n;
})();
/** The lesson carrying the most practice questions (ties by id) — stripping it cannot also empty the single-question list. */
const RICHEST_LESSON = [...BASE_LESSONS].sort((a, b) => (countByTopic.get(b) || 0) - (countByTopic.get(a) || 0) || a.localeCompare(b))[0];
/** A practice question on a lesson that keeps at least one other question — dropping it changes only the size. */
const SHRINK_Q = BASE.practice.find((q) => (countByTopic.get(q.topic) || 0) >= 2);
/** Two knowledge-check questions in one module on two different lessons. */
const KC_PAIR = (() => {
  for (const mod of BASE_PLAN.ranked) {
    const mine = BASE.kc.filter((q) => BASE_PLAN.moduleOf.get(q.topic) === mod);
    if (mine.length >= 2 && new Set(mine.map((q) => q.topic)).size === mine.length) {
      return { mod, first: mine[0], second: mine[1], held: mine.length };
    }
  }
  throw new Error("no module carries two knowledge-check questions on two different lessons — re-derive the target");
})();
const KC_DROP = kcById("q1");
const KC_DROP_MOD = BASE_PLAN.moduleOf.get(KC_DROP.topic);
const KC_DROP_HELD = BASE.kc.filter((q) => BASE_PLAN.moduleOf.get(q.topic) === KC_DROP_MOD).length;
const GAP_Q = BASE.kc.find((q) => q.topic === GAP[0]);
if (!GAP_Q) throw new Error(`no knowledge-check question carries the named gap ${GAP[0]} — re-derive the target`);
const SINGLE = singleQuestionLessons(BASE.practice, BASE_LESSONS);
const KEY_Q = byId("p2");
const OPT_Q = byId("p3");
const EXPL_Q = byId("p1");
const ID_Q = byId("p4");
const ID_KEEP = byId("p5");

// The mutation for each control: a fresh state in, one perturbation applied, and the checks re-run.
export const RED_CONTROLS = {
  // §1's orphan rule: a topic naming no live lesson.
  "orphan-topic": (st) => { st.practice = st.practice.map((q) => (q.id === byId("p1").id ? { ...q, topic: "gone-lesson" } : q)); },
  // §1's duplicate-text-inside-one-lesson rule.
  "duplicate-text": (st) => {
    const src = byId("p1");
    st.practice = st.practice.map((q) => (q.id === byId("p2").id ? { ...q, question: src.question, topic: src.topic } : q));
  },
  // §1's answer-among-its-options rule.
  "answer-not-an-option": (st) => { st.practice = st.practice.map((q) => (q.id === byId("p3").id ? { ...q, answer: "not an option" } : q)); },
  // §2's never-two-questions-on-one-lesson-inside-a-module rule. The old control here pinned
  // nothing and was caught by whichever assertion fired first; this one names its own.
  "kc-two-on-one-lesson": (st) => {
    st.kc = st.kc.map((q) => (q.id === KC_PAIR.second.id ? { ...q, topic: KC_PAIR.first.topic } : q));
  },
  // §2's per-module count, one short. The size assertion is the side-effect; this control is
  // aimed at the module allocation, which is what a re-balance actually breaks.
  "kc-one-short": (st) => { st.kc = st.kc.filter((q) => q.id !== KC_DROP.id); },
  // §2's named-gap rule, emptied.
  "named-gap-emptied": (st) => { st.kc = st.kc.filter((q) => q.id !== GAP_Q.id); },
  // §1b's every-lesson-drilled rule — the assertion the re-balance existed to earn.
  "lesson-undrilled": (st) => { st.practice = st.practice.filter((q) => q.topic !== RICHEST_LESSON); },
  // §1b's single-question fallback: give every single-question lesson a second one.
  "single-question-fallback-gone": (st) => {
    const extra = st.practice
      .filter((q) => SINGLE.includes(q.topic))
      .map((q) => ({ ...q, id: `${q.id}-second`, question: `${q.question} (a second question)` }));
    st.practice = st.practice.concat(extra);
  },
  // §1's practice size.
  "practice-size": (st) => { st.practice = st.practice.filter((q) => q.id !== SHRINK_Q.id); },
  // §2's knowledge-check size.
  "kc-size": (st) => { st.kc = st.kc.filter((q) => q.id !== KC_DROP.id); },
  // §1's key shape.
  "key-shape": (st) => { st.practice = st.practice.map((q) => { if (q.id !== KEY_Q.id) return q; const { explanation, ...rest } = q; return rest; }); },
  // §1's four-distinct-options rule.
  "options-not-distinct": (st) => { st.practice = st.practice.map((q) => (q.id === OPT_Q.id ? { ...q, options: [q.options[0], q.options[0], q.options[2], q.options[3]] } : q)); },
  // §1's multi-step-explanation rule.
  "explanation-single-step": (st) => { st.practice = st.practice.map((q) => (q.id === EXPL_Q.id ? { ...q, explanation: "Only one line, so no steps are shown." } : q)); },
  // §1's unique-question-id rule.
  "duplicate-ids": (st) => { st.practice = st.practice.map((q) => (q.id === ID_Q.id ? { ...q, id: ID_KEEP.id } : q)); },
  // §3's mirror comparison — a real one-byte drift, not a Buffer.concat tautology.
  "mirror-drift": (st) => {
    const m = st.mirrors.find((x) => x.file === MIRROR_FILES[0]);
    const drifted = Buffer.from(m.public);
    drifted[0] = drifted[0] ^ 0xff;
    m.public = drifted;
  },
};

// ---------------------------------------------------------------------------------------------
// What each control must be caught BY. A control that synthesises state usually trips more than
// one assertion, so "some failure appeared" proves nothing: if the assertion a control exists for
// were deleted, the control would still report caught because a different one fired. The run
// passes only when every message listed here is among the failures, and a control with no entry
// fails outright — so a later edit cannot add a control and leave it unpinned.
export const RED_EXPECT = {
  // §1's orphan rule, on the question it re-pointed.
  "orphan-topic": [`${byId("p1").id}: orphan topic gone-lesson names no lesson`],
  // §1's duplicate-text rule — inside the topic the copy now sits in, derived from the bank.
  "duplicate-text": [`${byId("p2").id}: duplicate question text inside ${byId("p1").topic}`],
  // §1's answer rule, on the question it broke.
  "answer-not-an-option": [`${byId("p3").id}: the answer is not one of its options`],
  // §2's per-lesson rule — derived: the module, how many it asks, how many lessons that is on.
  "kc-two-on-one-lesson": [`module ${KC_PAIR.mod} asks ${KC_PAIR.held} questions on ${KC_PAIR.held - 1} lessons`],
  // §2's per-module count — derived. NOT the size assertion, which is the side-effect.
  "kc-one-short": [`module ${KC_DROP_MOD} holds ${KC_DROP_HELD - 1}, want ${BASE_PLAN.wantPerModule.get(KC_DROP_MOD)}`],
  // §2's named gap — NOT the size assertion, which is the side-effect.
  "named-gap-emptied": [`the named gap ${GAP[0]} holds 0 questions, want 1`],
  // §1b's every-lesson-drilled rule, naming the lesson the control stripped.
  "lesson-undrilled": [`lessons have no practice question: ${RICHEST_LESSON}`],
  // §1b's fallback rule, reached through bankProblems rather than the helper's return value.
  "single-question-fallback-gone": ["no lesson carries exactly one question, so the single-question fallback is not real"],
  // §1's practice size — the assertion no control reached before.
  "practice-size": [`practice holds ${PRACTICE - 1}, want ${PRACTICE}`],
  // §2's knowledge-check size.
  "kc-size": [`knowledge check holds ${KC - 1}, want ${KC}`],
  // §1's key shape.
  "key-shape": [`${KEY_Q.id}: keys ${SHAPE.filter((k) => k !== "explanation").join(",")}`],
  // §1's distinct-options rule.
  "options-not-distinct": [`${OPT_Q.id}: options are not distinct`],
  // §1's multi-step-explanation rule.
  "explanation-single-step": [`${EXPL_Q.id}: explanation is not multi-step`],
  // §1's unique-id rule.
  "duplicate-ids": ["duplicate question ids"],
  // §3's mirror comparison.
  "mirror-drift": [`${MIRROR_FILES[0]}: the two mirrors differ`],
};

// ---------------------------------------------------------------------------------------------
/** Run one control against a fresh load. ok = it was caught, and caught by the assertion it names. */
function runControl(name) {
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name] || [];
  if (!expect.length) return { ok: false, real, why: "NO PINNED EXPECTATION — this control is not aimed at any assertion" };
  const missing = expect.filter((e) => !real.some((f) => f.includes(e)));
  if (missing.length) return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${missing[0]}"` };
  return { ok: true, real: real.filter((f) => expect.some((e) => f.includes(e))) };
}

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
// --red-control <name> is hoisted ABOVE the real check: a control run reports on its control only.
const only = argv.includes("--red-control") ? argv[argv.indexOf("--red-control") + 1] : null;

if (only) {
  if (!RED_CONTROLS[only]) { console.log(`unknown red control: ${only}`); process.exit(2); }
  let r;
  try { r = runControl(only); } catch (e) { console.log(`RED CONTROL "${only}" BROKE — ${e.message}`); process.exit(1); }
  if (!r.ok) { console.log(`RED CONTROL "${only}" ${r.why}`); r.real.slice(0, 3).forEach((f) => console.log("   " + f)); process.exit(1); }
  console.log(`red control "${only}": caught — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}

const st = loadState();
const { pass, failures, info } = runChecks(st);
for (const line of info) console.log(line);
for (const f of failures) console.log("FAIL: " + f);
console.log(`\ncheck-mathematics-bank-balance: ${pass}/${pass + failures.length} green${failures.length ? ` (${failures.length} FAILED)` : ""}`);

// --no-red-control is the ONLY opt-out, and it still honours the real check's exit code.
if (argv.includes("--no-red-control")) process.exit(failures.length ? 1 : 0);

// Red controls run by DEFAULT — the suite passes no arguments, so this is the path it takes.
let bad = 0;
// Both directions, on the default path: a control with no pin, or a pin with no control, is red.
for (const name of Object.keys(RED_CONTROLS))
  if (!RED_EXPECT[name]?.length) { bad++; console.log(`UNPINNED CONTROL: ${name} — it has no RED_EXPECT entry`); }
for (const name of Object.keys(RED_EXPECT))
  if (!RED_CONTROLS[name]) { bad++; console.log(`STALE PIN: ${name} — RED_EXPECT names a control that does not exist`); }
for (const name of Object.keys(RED_CONTROLS)) {
  let r;
  try { r = runControl(name); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
  if (!r.ok) { bad++; console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`); }
  else console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
}
console.log(`${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
// ONE exit code for both halves: a failing real check and an uncaught control are both red.
process.exit(failures.length || bad ? 1 : 0);
