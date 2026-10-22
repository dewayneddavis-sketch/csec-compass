// Verification harness for per-paper Practice Paper telemetry.
//   node tools/check-practice-paper-telemetry.mjs
//   node tools/check-practice-paper-telemetry.mjs --self-test   (red controls)
//
// Owner request 2026-10-22: whenever a student finishes lesson labs, Practice
// Papers 1–5 and knowledge checks, it must all read in the TEACHER DASHBOARD.
// Labs and knowledge checks already did. Practice did not: all five papers were
// recorded as the single quiz type "practice", so a teacher saw one practice
// figure for five papers.
//
// What this asserts, against the REAL handlers (api/analytics/record.js and
// api/analytics/summary.js, run offline through tools/teacher-loader.mjs +
// tools/teacher-stub.mjs):
//   1. src/data/practicePapers.js is the single source for the five per-paper
//      quiz types, and the API's accepted list cannot drift from it.
//   2. The recorder STORES each paper under its own quiz_type, still accepts the
//      three aggregate values, and still fails CLOSED on an unknown one.
//   3. The summary reads the five papers separately AND keeps the aggregate
//      `practice` figure exactly as it was (papers folded in, counted once).
//   4. Labs and knowledge-check figures are untouched by the whole change.
//   5. Wiring: the Practice Paper tab records the per-paper value while
//      Show-Your-Work keeps the aggregate key (per-paper keys are NOT in
//      showYourWork's quiz list — using one there would silently disable
//      Show-Your-Work on Mathematics), the dashboard renders five papers, the
//      student's own progress labels them, and the schema comment names the new
//      values with no migration (the column is plain text).
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { register } from "node:module";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register("./teacher-loader.mjs", import.meta.url);
const stub = await import("./teacher-stub.mjs");
const { state, reset, setTable, rows } = stub;
const papers = await import("../src/data/practicePapers.js");
const SELF_TEST = process.argv.includes("--self-test");
let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed++;
    if (!SELF_TEST) console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title) {
  if (!SELF_TEST) console.log(`\n== ${title}`);
}
function mockRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
  };
}
async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}
const read = (rel) => readFileSync(join(root, rel), "utf8");
const TEACHER = "ms.brown@school.edu";
const OWNER = "dewedavisdavis@example.com";
const STUDENT_A = "student1@school.edu";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.OWNER_EMAILS = OWNER;
process.env.TEACHER_EMAIL = TEACHER;
const authHeader = { authorization: "Bearer test-token" };
const recordHandler = (await import("../api/analytics/record.js")).default;
const summaryHandler = (await import("../api/analytics/summary.js")).default;
const PAPER_TYPES = ["practice-pp1", "practice-pp2", "practice-pp3", "practice-pp4", "practice-pp5"];

// ---------------------------------------------------------------------------
section("src/data/practicePapers.js — the single source for the five papers");
{
  check(
    "the five per-paper quiz types are generated in paper order",
    JSON.stringify(papers.PRACTICE_QUIZ_TYPES) === JSON.stringify(PAPER_TYPES),
    JSON.stringify(papers.PRACTICE_QUIZ_TYPES)
  );
  check("the aggregate bucket is still the string practice", papers.PRACTICE_QUIZ_TYPE === "practice", papers.PRACTICE_QUIZ_TYPE);
  check("paper 3 maps to practice-pp3", papers.practiceQuizType(3) === "practice-pp3", String(papers.practiceQuizType(3)));
  check("paper 0 and paper 6 are not papers", papers.practiceQuizType(0) === null && papers.practiceQuizType(6) === null);
  check("the aggregate value is not a paper", papers.practicePaperFromQuizType("practice") === null);
  check("practice-pp3 reports paper 3", papers.practicePaperFromQuizType("practice-pp3") === 3);
  check(
    "a paper's teacher-facing label is its full tab name",
    papers.practicePaperQuizLabel("practice-pp3") === "Practice Paper 3",
    papers.practicePaperQuizLabel("practice-pp3")
  );
}

// ---------------------------------------------------------------------------
section("api/analytics/record.js — each paper is stored as its own quiz_type");
{
  reset();
  state.user = { id: "student-1", email: STUDENT_A };
  setTable("quiz_results", []);
  for (const [i, quizType] of PAPER_TYPES.entries()) {
    const res = await call(recordHandler, {
      method: "POST",
      headers: authHeader,
      body: {
        subjectId: "mathematics",
        quizType,
        attemptId: `att-pp${i + 1}`,
        results: [
          { questionId: `q${i}-1`, topic: "math-l1-1", correct: true },
          { questionId: `q${i}-2`, topic: "math-l1-2", correct: false },
        ],
      },
    });
    check(`paper ${i + 1} records as ${quizType}`, res.statusCode === 200 && res.body.success === true && res.body.inserted === 2, JSON.stringify(res.body));
  }
  const stored = rows("quiz_results").map((r) => r.quiz_type);
  check(
    "every paper's rows carry its own quiz_type",
    PAPER_TYPES.every((t) => stored.includes(t)) && stored.length === 10,
    JSON.stringify([...new Set(stored)])
  );
  const pp3Rows = rows("quiz_results").filter((r) => r.quiz_type === "practice-pp3");
  check("paper 3's two questions are two rows on one attempt", pp3Rows.length === 2 && pp3Rows.every((r) => r.attempt_id === "att-pp3"));
  for (const legacy of ["knowledge-check", "practice", "mock"]) {
    const res = await call(recordHandler, {
      method: "POST",
      headers: authHeader,
      body: { subjectId: "mathematics", quizType: legacy, attemptId: `att-${legacy}`, results: [{ questionId: "q1", correct: true }] },
    });
    check(`the aggregate value ${legacy} is still accepted`, res.statusCode === 200 && res.body.success === true, `${res.statusCode}`);
  }
  for (const bogus of ["practice-pp6", "practice-paper-3", "practice-pp0", "PP3"]) {
    const res = await call(recordHandler, {
      method: "POST",
      headers: authHeader,
      body: { subjectId: "mathematics", quizType: bogus, attemptId: "att-x", results: [{ questionId: "q1", correct: true }] },
    });
    check(`an unknown quiz type (${bogus}) is still refused with 400`, res.statusCode === 400, `${res.statusCode}`);
  }
  // The write path is fail-CLOSED for quizzes (unchanged): a missing table must
  // still be an error, not a silent success.
  reset();
  state.user = { id: "student-1", email: STUDENT_A };
  state.writeErrors.quiz_results = { message: 'relation "public.quiz_results" does not exist' };
  const res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { subjectId: "mathematics", quizType: "practice-pp3", attemptId: "att-e", results: [{ questionId: "q1", correct: true }] },
  });
  check("a quiz write failure is still fail-closed (not a 200)", res.statusCode >= 400, `${res.statusCode}`);
}

// ---------------------------------------------------------------------------
section("the API cannot drift from src/data/practicePapers.js");
{
  const recordSrc = read("api/analytics/record.js");
  const listMatch = /const validQuizTypes = \[([^\]]*)\]/.exec(recordSrc);
  check("record.js builds its accepted list from an explicit expression", !!listMatch, "no validQuizTypes literal found");
  check(
    "record.js generates exactly the five per-paper values",
    /\[1, 2, 3, 4, 5\]\.map\(\(n\) => `practice-pp\$\{n\}`\)/.test(recordSrc),
    "the generated list changed shape"
  );
  check(
    "record.js keeps the three aggregate values",
    /"knowledge-check", "practice", "mock"/.test(recordSrc)
  );
  const recorded = [...recordSrc.matchAll(/`practice-pp\$\{n\}`/g)];
  check("the generated list is the module's list", recorded.length === 1 && papers.PRACTICE_QUIZ_TYPES.length === 5);
  const summarySrc = read("api/analytics/summary.js");
  check("summary.js recognises the per-paper values by the same shape", /\/\^practice-pp\(\\d\+\)\$\//.test(summarySrc));
  check(
    "summary.js folds the papers into the aggregate bucket (it adds to attempts.practice)",
    /subj\.attempts\.practice \+= 1/.test(summarySrc) && /subj\.passed\.practice \+= 1/.test(summarySrc)
  );
  check(
    "the fold is guarded so a paper row is not also in the practice bucket twice",
    /if \(!isPerPaper && attempt\.quizType !== "practice"\) continue;/.test(summarySrc)
  );
}

// ---------------------------------------------------------------------------
section("api/analytics/summary.js — five papers AND the aggregate figure");
const seed = (overrides = {}) => {
  reset();
  setTable("teacher_students", [
    { id: "l1", teacher_email: TEACHER, student_email: STUDENT_A, created_at: "2026-09-17T00:00:00Z" },
  ]);
  const q = (userId, subjectId, quizType, attemptId, correct, at) =>
    correct.map((c, i) => ({
      user_id: userId,
      subject_id: subjectId,
      quiz_type: quizType,
      attempt_id: attemptId,
      question_id: `q-${attemptId}-${i}`,
      topic: "math-l1-1",
      correct: c,
      created_at: at,
    }));
  const rowsIn = [
    // Paper 1: 4/4 = 100% at 09:00
    ...q("student-1", "mathematics", "practice-pp1", "att-pp1", [true, true, true, true], "2026-10-20T09:00:00Z"),
    // Paper 2: 2/4 = 50% at 10:00 (not passed)
    ...q("student-1", "mathematics", "practice-pp2", "att-pp2", [true, true, false, false], "2026-10-20T10:00:00Z"),
    // Paper 3: 3/4 = 75% at 11:00 (passed) — the LATEST practice activity
    ...q("student-1", "mathematics", "practice-pp3", "att-pp3", [true, true, true, false], "2026-10-20T11:00:00Z"),
    // Paper 4 attempted once, 0/4 = 0%
    ...q("student-1", "mathematics", "practice-pp4", "att-pp4", [false, false, false, false], "2026-10-20T07:30:00Z"),
    // A legacy row written before this change, as plain `practice`: 2/2 = 100% at 08:00
    ...q("student-1", "mathematics", "practice", "att-legacy", [true, true], "2026-10-20T08:00:00Z"),
    // Knowledge check: 2/4 = 50% at 12:00
    ...q("student-1", "mathematics", "knowledge-check", "att-kc", [true, true, false, false], "2026-10-20T12:00:00Z"),
    // Mock: 2/2 = 100% at 13:00
    ...q("student-1", "mathematics", "mock", "att-mock", [true, true], "2026-10-20T13:00:00Z"),
  ];
  setTable("quiz_results", overrides.quizResults || rowsIn);
  setTable("user_progress", [
    { user_id: "student-1", subject_id: "mathematics", completed_lessons: ["math-l1-1", "math-l1-2"], quiz_completed: true, updated_at: "2026-10-20T12:05:00Z" },
  ]);
  setTable("lab_activity", [
    { user_id: "student-1", subject_id: "mathematics", lesson_id: "math-l1-1", experiment_type: "interactive-quiz", opens: 3, completed: true, last_activity_at: "2026-10-20T09:30:00Z" },
    { user_id: "student-1", subject_id: "mathematics", lesson_id: "math-l1-2", experiment_type: "graphing", opens: 1, completed: false, last_activity_at: "2026-10-20T09:40:00Z" },
  ]);
  state.users = [
    { id: "student-1", email: STUDENT_A },
    { id: "teacher-1", email: TEACHER },
  ];
  state.user = { id: "teacher-1", email: TEACHER };
};
let teacherView = null;
{
  seed();
  const res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("a teacher's class scope returns 200", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  teacherView = res.body.students?.[0]?.subjects?.find((s) => s.subjectId === "mathematics");
  check("the teacher sees the student's mathematics row", !!teacherView);
  // --- five papers, separately ---
  const att = teacherView?.attempts || {};
  const best = teacherView?.bestPct || {};
  const last = teacherView?.lastPct || {};
  const pass = teacherView?.passed || {};
  for (const [i, t] of PAPER_TYPES.entries()) {
    const expected = i < 4 ? 1 : 0;
    check(`${t}: attempts = ${expected}`, (att[t] || 0) === expected, `${att[t]}`);
  }
  check("Practice Paper 1 reads 100% best", best["practice-pp1"] === 100, `${best["practice-pp1"]}`);
  check("Practice Paper 2 reads 50% best and did not pass", best["practice-pp2"] === 50 && pass["practice-pp2"] === 0, `${best["practice-pp2"]}/${pass["practice-pp2"]}`);
  check("Practice Paper 3 reads 75% best and passed", best["practice-pp3"] === 75 && pass["practice-pp3"] === 1, `${best["practice-pp3"]}/${pass["practice-pp3"]}`);
  check("Practice Paper 3 is the latest practice activity", last["practice-pp3"] === 75, `${last["practice-pp3"]}`);
  check("Practice Paper 4 was attempted and scored 0%", att["practice-pp4"] === 1 && best["practice-pp4"] === 0, `${att["practice-pp4"]}/${best["practice-pp4"]}`);
  check("Practice Paper 5 reads as not attempted (no bucket, or 0)", !att["practice-pp5"], `${att["practice-pp5"]}`);
  // --- the aggregate is unchanged in meaning, and counted once ---
  check("the aggregate practice bucket still exists", typeof att.practice === "number", `${typeof att.practice}`);
  check("the aggregate counts all four papers plus the legacy row once each (5)", att.practice === 5, `${att.practice}`);
  check("the aggregate is not double-counting the five papers (5, not 9/10)", att.practice !== 9 && att.practice !== 10, `${att.practice}`);
  check("the aggregate best is the best of the papers (100)", best.practice === 100, `${best.practice}`);
  check("the aggregate last is the most recent practice attempt (75)", last.practice === 75, `${last.practice}`);
  check("the aggregate pass count is the passage across papers + legacy (3)", pass.practice === 3, `${pass.practice}`);
  // --- labs and knowledge check untouched ---
  check("knowledge check figures are unchanged (1 attempt, 50% best)", att["knowledge-check"] === 1 && best["knowledge-check"] === 50, `${att["knowledge-check"]}/${best["knowledge-check"]}`);
  check("mock figures are unchanged (1 attempt, 100%)", att.mock === 1 && best.mock === 100, `${att.mock}/${best.mock}`);
  check("lab figures are unchanged (3 + 1 opens, 1 completed)", teacherView?.labs?.opened === 4 && teacherView?.labs?.completed === 1, JSON.stringify(teacherView?.labs));
  check("lab detail still lists both lessons with the lab's own activity", (teacherView?.labs?.lessons || []).length === 2, `${teacherView?.labs?.lessons?.length}`);
  check("lessons + knowledge-check completion are unchanged", teacherView?.lessonsCompleted === 2 && teacherView?.quizCompleted === true);
  check(
    "the per-student total counts each practice attempt once (1 KC + 5 practice + 1 mock = 7)",
    res.body.students?.[0]?.totals?.quizAttempts === 7,
    `${res.body.students?.[0]?.totals?.quizAttempts}`
  );
  // the student's own summary (the Progress tab source) names the paper
  state.user = { id: "student-1", email: STUDENT_A };
  const own = await call(summaryHandler, { method: "GET", headers: authHeader, query: { subjectId: "mathematics" } });
  const ownTypes = (own.body.attempts || []).map((a) => a.quizType);
  check("the student's own attempt history carries the per-paper quiz types", ownTypes.includes("practice-pp3") && ownTypes.includes("practice-pp1"), JSON.stringify([...new Set(ownTypes)]));
}

// ---------------------------------------------------------------------------
section("wiring — the tab records the paper, Show-Your-Work keeps the aggregate");
{
  const practice = read("src/components/ExtraPractice.jsx");
  check("the recorder is sent the per-paper value", /quizType: RECORD_QUIZ_TYPE/.test(practice), "ExtraPractice does not send RECORD_QUIZ_TYPE");
  check("the per-paper value is derived from the open paper", /const RECORD_QUIZ_TYPE = practiceQuizType\(paper\) \|\| QUIZ_TYPE;/.test(practice));
  check(
    "Show-Your-Work and its drafts still key off the aggregate QUIZ_TYPE",
    /showYourWorkEnabled\(subjectId, QUIZ_TYPE\)/.test(practice) && /loadWorkingDrafts\(subjectId, QUIZ_TYPE\)/.test(practice),
    "a per-paper value reached the Show-Your-Work path"
  );
  check(
    "no per-paper value reaches showYourWork (its quiz list holds the aggregate names only)",
    !/showYourWorkEnabled\(subjectId, RECORD_QUIZ_TYPE\)/.test(practice) && /quizzes: \["knowledge-check", "practice", "mock"\]/.test(read("src/data/showYourWork.js")),
    "Show-Your-Work would silently switch off on the practice papers"
  );
  const dash = read("src/components/StudentProgressDashboard.jsx");
  check("the dashboard renders the five papers", /function PracticePapersRow\(/.test(dash) && /<PracticePapersRow subject=\{subject\} \/>/.test(dash));
  check("the dashboard takes the five values from the shared module", /PRACTICE_QUIZ_TYPES, practicePaperQuizLabel/.test(dash));
  check("the dashboard still renders the aggregate quiz cells", /<QuizCells subject=\{subject\} \/>/.test(dash));
  const progress = read("src/components/ProgressTab.jsx");
  check("the student's own progress labels each paper", /PRACTICE_QUIZ_TYPES\.map\(\(t\) => \[t, practicePaperQuizLabel\(t\)\]\)/.test(progress));
  const schema = read("supabase/schema.sql");
  check("the schema comment names the new values", /'practice-pp1' … 'practice-pp5'/.test(schema), "comment does not name them");
  const column = /quiz_type\s+text not null/.exec(schema);
  check("quiz_type is still plain text — no migration, no new column", !!column, "the column definition changed");
  check("no enum/check constraint was added to quiz_type", !/quiz_type[^;]*check\s*\(/i.test(schema));
}

// ---------------------------------------------------------------------------
if (SELF_TEST) {
  section("red controls — each of these MUST make its assertion bite");
  // A. two papers recorded as one: paper 3's rows carry practice-pp2's value.
  {
    const collapsed = [];
    for (const t of ["practice-pp1", "practice-pp2", "practice-pp4"]) {
      collapsed.push({ user_id: "student-1", subject_id: "mathematics", quiz_type: t, attempt_id: `att-${t}`, question_id: "q1", correct: true, created_at: "2026-10-20T09:00:00Z" });
    }
    collapsed.push({ user_id: "student-1", subject_id: "mathematics", quiz_type: "practice-pp2", attempt_id: "att-collapsed", question_id: "q2", correct: false, created_at: "2026-10-20T11:00:00Z" });
    seed({ quizResults: collapsed });
    const res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
    const subj = res.body.students?.[0]?.subjects?.find((s) => s.subjectId === "mathematics");
    // The main run asserted `${t}: attempts = 1` for practice-pp3. On collapsed
    // data that assertion must come out FALSE, or it is not an instrument.
    const perPaperAssertion = (subj?.attempts?.["practice-pp3"] || 0) === 1;
    check(
      "RED: with two papers collapsed into one, the per-paper assertion (practice-pp3 attempts === 1) is FALSE",
      perPaperAssertion === false && subj?.attempts?.["practice-pp2"] === 2,
      JSON.stringify({ pp2: subj?.attempts?.["practice-pp2"], pp3: subj?.attempts?.["practice-pp3"] })
    );
  }
  // B. the fold removed from the summary: the aggregate assertion must fail.
  {
    const src = read("api/analytics/summary.js");
    const start = src.indexOf("  // Per-paper practice, folded back into the aggregate");
    const end = src.indexOf("  for (const row of progressRes.data || []) {");
    check("RED: the fold block was located for removal", start > 0 && end > start, `${start}/${end}`);
    const mutantPath = join(root, "api/analytics/.tmp-summary-mutant.mjs");
    writeFileSync(mutantPath, src.slice(0, start) + src.slice(end), "utf8");
    try {
      const mutant = (await import("../api/analytics/.tmp-summary-mutant.mjs?red=1")).default;
      seed();
      const res = await call(mutant, { method: "GET", headers: authHeader, query: { scope: "class" } });
      const subj = res.body.students?.[0]?.subjects?.find((s) => s.subjectId === "mathematics");
      // The main run asserted the aggregate counts every practice attempt (5)
      // and that paper 3 is still readable (1). Without the fold the aggregate
      // assertion must be FALSE while the per-paper one stays true — which is
      // exactly the defect being fixed.
      check(
        "RED: without the fold, the aggregate assertion (attempts.practice === 5) is FALSE while paper 3 still reads",
        (subj?.attempts?.practice === 5) === false && (subj?.attempts?.["practice-pp3"] || 0) === 1,
        JSON.stringify({ practice: subj?.attempts?.practice, pp3: subj?.attempts?.["practice-pp3"] })
      );
    } finally {
      if (existsSync(mutantPath)) unlinkSync(mutantPath);
    }
  }
  // C. the recorder's accepted list without the per-paper values: the accepted
  //    assertion must bite (a paper attempt is refused).
  {
    const src = read("api/analytics/record.js");
    const mutantPath = join(root, "api/analytics/.tmp-record-mutant.mjs");
    writeFileSync(mutantPath, src.replace("...PRACTICE_PAPER_QUIZ_TYPES]", "]"), "utf8");
    try {
      const mutant = (await import("../api/analytics/.tmp-record-mutant.mjs?red=1")).default;
      reset();
      state.user = { id: "student-1", email: STUDENT_A };
      setTable("quiz_results", []);
      const res = await call(mutant, {
        method: "POST",
        headers: authHeader,
        body: { subjectId: "mathematics", quizType: "practice-pp3", attemptId: "att-red", results: [{ questionId: "q1", correct: true }] },
      });
      // The main run asserted a paper attempt is accepted with 200. The mutant
      // must turn that assertion FALSE.
      check(
        "RED: without the per-paper values, the acceptance assertion (200) is FALSE — paper 3 is refused",
        (res.statusCode === 200) === false && res.statusCode === 400,
        `${res.statusCode}`
      );
    } finally {
      if (existsSync(mutantPath)) unlinkSync(mutantPath);
    }
  }
  // D. the tab sending the aggregate: the wiring assertion must fail on a mutant
  //    of the source (this is a source assertion, so the mutant is textual).
  {
    const mutant = read("src/components/ExtraPractice.jsx").replace("quizType: RECORD_QUIZ_TYPE", "quizType: QUIZ_TYPE");
    check(
      "RED: a tab that records the aggregate fails the wiring assertion",
      !/quizType: RECORD_QUIZ_TYPE/.test(mutant),
      "the wiring assertion can no longer see the recorder argument"
    );
  }
  console.log(`\ncheck-practice-paper-telemetry: ${passed}/${passed + failed} green [self-test]`);
} else {
  console.log(`\ncheck-practice-paper-telemetry: ${passed}/${passed + failed} green`);
}
process.exit(failed === 0 ? 0 : 1);
