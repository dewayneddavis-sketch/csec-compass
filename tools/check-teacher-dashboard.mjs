// Verification harness for the teacher progress dashboard + lab tracking.
//   node tools/check-teacher-dashboard.mjs
//
// Covers, without a browser:
//   1. api/analytics/record.js  — the lab path: one row per (student, subject,
//      lesson), opens incremented, completion sticky, failures fail OPEN
//      (telemetry must never break a student's lab).
//   2. api/analytics/summary.js — ?scope=class: fails closed for non-teachers,
//      a teacher sees ONLY their linked students, the owner may inspect any
//      class, and the aggregation (attempts, best/last %, pass counts, labs,
//      lessons) is correct.
//   3. api/admin/grant-access.js — the owner's global teacher-link actions
//      (teacher-link / teacher-unlink / teacher-links / teacher-link-bulk),
//      with lower-cased emails and honest reporting of students who have no
//      account yet.
//   3d. api/admin/grant-access.js — a teacher's OWN class list: the
//      teacher-self-link / teacher-self-unlink / teacher-self-links actions.
//      Identity is always the CALLER (never a teacherEmail in the body), a
//      teacher on their school's roster writes school-stamped links, an
//      allowlisted teacher writes platform-level ones, re-linking is
//      idempotent, and anyone who is not a teacher gets 403 with zero data.
//   3b. api/admin/grant-access.js — school-admin self-service: the owner creates
//      a school and designates ONE admin; that admin keeps their own school's
//      roster and links, and can never see, name or write another school's
//      (school_id is never read from the request body of a school admin), never
//      the platform-wide links the owner created, and never anything about a
//      student's work. Owner override works, but only for a named school.
//   3c. api/analytics/summary.js — access rule: owner, the teacher allowlist
//      (TEACHER_EMAIL, or the older TEACHER_EMAILS), being a teacher on a
//      school's roster, or being named as a teacher in teacher_students.
//   4. src/data/labActivity.js   — localStorage recording + sync payload.
//   5. Wiring: the sandbox records opens, the lab reports completion, the route
//      and the schema (tables + deny-all RLS) exist, the owner-only Admin
//      linking card is GONE, and the teacher dashboard carries its own
//      link/unlink card.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { register } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register("./teacher-loader.mjs", import.meta.url);

const stub = await import("./teacher-stub.mjs");
const { state, reset, setTable, rows } = stub;

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title) {
  console.log(`\n== ${title}`);
}

// --- request/response doubles ----------------------------------------------
function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

const recordHandler = (await import("../api/analytics/record.js")).default;
const summaryHandler = (await import("../api/analytics/summary.js")).default;
const adminHandler = (await import("../api/admin/grant-access.js")).default;

async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}

const TEACHER = "ms.brown@school.edu";
const OWNER = "dewayneddavis@gmail.com";
const STUDENT_A = "student1@school.edu";
const STUDENT_B = "student2@school.edu";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.OWNER_EMAILS = OWNER;
// BOTH labels are set, because the gate must accept either: the live Vercel
// variable is TEACHER_EMAIL (singular), older deployments used TEACHER_EMAILS.
// The singular-only and plural-only cases are asserted in their own section.
process.env.TEACHER_EMAIL = TEACHER;
process.env.TEACHER_EMAILS = TEACHER;

const authHeader = { authorization: "Bearer test-token" };

// =========================================================================
section("api/analytics/record.js — lab activity");

{
  reset();
  state.user = { id: "student-1", email: STUDENT_A };
  setTable("lab_activity", []);

  let res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { kind: "lab", subjectId: "mathematics", lessonId: "math-l1-1", experimentType: "interactive-quiz" },
  });
  check("first lab open returns 200 and is stored", res.statusCode === 200 && res.body.stored === true, JSON.stringify(res.body));
  check("first open records opens = 1", res.body.opens === 1, `opens=${res.body.opens}`);
  let stored = rows("lab_activity")[0];
  check(
    "row keys are the (user, subject, lesson) contract",
    stored.user_id === "student-1" && stored.subject_id === "mathematics" && stored.lesson_id === "math-l1-1",
    JSON.stringify(stored)
  );
  check("row carries the experiment type", stored.experiment_type === "interactive-quiz");
  check("first open is not marked complete", stored.completed === false);
  check("upsert used the (user,subject,lesson) conflict key", state.upserts[0]?.conflict === "user_id,subject_id,lesson_id", state.upserts[0]?.conflict);

  res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { kind: "lab", subjectId: "mathematics", lessonId: "math-l1-1", experimentType: "interactive-quiz" },
  });
  check("second open increments opens to 2", res.body.opens === 2, `opens=${res.body.opens}`);
  check("re-opening does not create a second row", rows("lab_activity").length === 1, `rows=${rows("lab_activity").length}`);

  res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { kind: "lab", subjectId: "mathematics", lessonId: "math-l1-1", completed: true },
  });
  check("completion is recorded", res.body.completed === true);
  check("completed survives later opens (sticky)", rows("lab_activity")[0].completed === true);

  res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { kind: "lab", subjectId: "mathematics", lessonId: "math-l1-1" },
  });
  check("a later open does not un-complete the lab", rows("lab_activity")[0].completed === true && res.body.opens === 4, `opens=${res.body.opens}`);

  res = await call(recordHandler, { method: "POST", headers: authHeader, body: { kind: "lab", subjectId: "mathematics" } });
  check("missing lessonId is a 400", res.statusCode === 400, `${res.statusCode}`);

  res = await call(recordHandler, { method: "POST", headers: {}, body: { kind: "lab", subjectId: "x", lessonId: "y" } });
  check("no auth header is a 401", res.statusCode === 401, `${res.statusCode}`);

  res = await call(recordHandler, { method: "GET", headers: authHeader, body: {} });
  check("GET is a 405", res.statusCode === 405, `${res.statusCode}`);

  // Table not applied yet → telemetry must not break the student's lab.
  reset();
  state.user = { id: "student-1", email: STUDENT_A };
  state.selectErrors.lab_activity = { message: 'relation "public.lab_activity" does not exist' };
  res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { kind: "lab", subjectId: "mathematics", lessonId: "math-l1-2" },
  });
  check("missing lab_activity table fails OPEN (200, stored:false)", res.statusCode === 200 && res.body.stored === false, JSON.stringify(res.body));
  check("the reason names the schema fix", /schema\.sql/.test(res.body.reason || ""), res.body.reason);

  reset();
  state.user = { id: "student-1", email: STUDENT_A };
  state.user = { id: "student-1", email: STUDENT_A };
  setTable("lab_activity", []);
  state.writeErrors.lab_activity = { message: "connection reset" };
  res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { kind: "lab", subjectId: "mathematics", lessonId: "math-l1-3" },
  });
  check("a failed lab write also fails open", res.statusCode === 200 && res.body.stored === false);

  // Quiz recording must still fail closed (unchanged behaviour).
  reset();
  state.user = { id: "student-1", email: STUDENT_A };
  state.writeErrors.quiz_results = { message: "boom" };
  res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { kind: "quiz", subjectId: "mathematics", quizType: "practice", attemptId: "a1", results: [{ questionId: "q1", correct: true }] },
  });
  check("quiz rows still fail CLOSED (500) on a write error", res.statusCode === 500, `${res.statusCode}`);
  res = await call(recordHandler, {
    method: "POST",
    headers: authHeader,
    body: { subjectId: "mathematics", quizType: "nonsense", attemptId: "a1", results: [{ questionId: "q1", correct: true }] },
  });
  check("unknown quizType is still rejected", res.statusCode === 400, `${res.statusCode}`);
}

// =========================================================================
section("api/analytics/summary.js — teacher class scope");

function seedClass() {
  reset();
  setTable("teacher_students", [
    { id: "l1", teacher_email: TEACHER, student_email: STUDENT_A, created_at: "2026-09-17T00:00:00Z" },
    { id: "l2", teacher_email: TEACHER, student_email: STUDENT_B, created_at: "2026-09-17T00:00:00Z" },
    { id: "l3", teacher_email: "other.teacher@school.edu", student_email: "someone.else@school.edu", created_at: "2026-09-17T00:00:00Z" },
  ]);
  setTable("quiz_results", [
    // student A, knowledge check attempt 1: 3 of 4 correct = 75% pass
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-1", question_id: "q1", correct: true, created_at: "2026-09-18T09:00:00Z" },
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-1", question_id: "q2", correct: true, created_at: "2026-09-18T09:00:00Z" },
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-1", question_id: "q3", correct: true, created_at: "2026-09-18T09:00:00Z" },
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-1", question_id: "q4", correct: false, created_at: "2026-09-18T09:00:00Z" },
    // student A, knowledge check attempt 2: 1 of 4 = 25% fail → best stays 75
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-2", question_id: "q1", correct: true, created_at: "2026-09-18T10:00:00Z" },
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-2", question_id: "q2", correct: false, created_at: "2026-09-18T10:00:00Z" },
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-2", question_id: "q3", correct: false, created_at: "2026-09-18T10:00:00Z" },
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "att-2", question_id: "q4", correct: false, created_at: "2026-09-18T10:00:00Z" },
    // student B, mock: 2 of 2 = 100%
    { user_id: "student-2", subject_id: "biology", quiz_type: "mock", attempt_id: "att-3", question_id: "b1", correct: true, created_at: "2026-09-18T11:00:00Z" },
    { user_id: "student-2", subject_id: "biology", quiz_type: "mock", attempt_id: "att-3", question_id: "b2", correct: true, created_at: "2026-09-18T11:00:00Z" },
    // another teacher's student — must never appear
    { user_id: "student-9", subject_id: "biology", quiz_type: "mock", attempt_id: "att-9", question_id: "z1", correct: true, created_at: "2026-09-18T12:00:00Z" },
  ]);
  setTable("user_progress", [
    { user_id: "student-1", subject_id: "mathematics", completed_lessons: ["l1", "l2", "l3"], quiz_completed: true, updated_at: "2026-09-18T10:05:00Z" },
    { user_id: "student-2", subject_id: "biology", completed_lessons: ["b1"], quiz_completed: false, updated_at: "2026-09-18T11:05:00Z" },
  ]);
  setTable("lab_activity", [
    { user_id: "student-1", subject_id: "mathematics", lesson_id: "math-l1-1", experiment_type: "interactive-quiz", opens: 3, completed: true, last_activity_at: "2026-09-18T09:30:00Z" },
    { user_id: "student-1", subject_id: "mathematics", lesson_id: "math-l1-2", experiment_type: "graphing", opens: 1, completed: false, last_activity_at: "2026-09-18T09:40:00Z" },
    { user_id: "student-9", subject_id: "biology", lesson_id: "bio-l1-1", experiment_type: "flashcard", opens: 9, completed: true, last_activity_at: "2026-09-18T12:30:00Z" },
  ]);
  state.users = [
    { id: "student-1", email: STUDENT_A },
    { id: "student-2", email: STUDENT_B },
    { id: "student-9", email: "someone.else@school.edu" },
    { id: "teacher-1", email: TEACHER },
    { id: "owner-1", email: OWNER },
  ];
}

{
  seedClass();
  state.user = { id: "student-1", email: STUDENT_A };
  let res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("a student calling the class scope gets 403", res.statusCode === 403, `${res.statusCode}`);
  check("the 403 explains how to get access", /teacher/i.test(res.body.error || ""), res.body.error);
  check("no student data is returned with the 403", res.body.students === undefined);

  res = await call(summaryHandler, { method: "GET", headers: {}, query: { scope: "class" } });
  check("no auth header is a 401", res.statusCode === 401, `${res.statusCode}`);
}

{
  seedClass();
  state.user = { id: "teacher-1", email: TEACHER };
  const res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });

  check("a teacher gets 200", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  check("only the teacher's own students are returned", res.body.students.length === 2, `${res.body.students.length}`);
  const emails = res.body.students.map((s) => s.email).sort();
  check("the roster is exactly the linked students", emails.join(",") === [STUDENT_A, STUDENT_B].join(","), emails.join(","));
  check("another teacher's student is never included", !JSON.stringify(res.body).includes("someone.else@school.edu"));
  check("roster lists the owner-created links", (res.body.roster || []).length === 2);
  check("counts report the class size", res.body.counts.students === 2 && res.body.counts.withProgress === 2, JSON.stringify(res.body.counts));

  const a = res.body.students.find((s) => s.email === STUDENT_A);
  const math = a.subjects.find((s) => s.subjectId === "mathematics");
  check("student A has the mathematics subject", !!math);
  check("knowledge-check attempts are counted once per attempt, not per question", math.attempts["knowledge-check"] === 2, `${math.attempts["knowledge-check"]}`);
  check("best knowledge-check score is the highest attempt (75)", math.bestPct["knowledge-check"] === 75, `${math.bestPct["knowledge-check"]}`);
  check("latest knowledge-check score is the most recent attempt (25)", math.lastPct["knowledge-check"] === 25, `${math.lastPct["knowledge-check"]}`);
  check("passes are counted at the 60% pass mark", math.passed["knowledge-check"] === 1, `${math.passed["knowledge-check"]}`);
  check("untouched quiz types read as 0 attempts", math.attempts.practice === 0 && math.attempts.mock === 0);
  check("completed lessons come from user_progress", math.lessonsCompleted === 3, `${math.lessonsCompleted}`);
  check("quiz_completed is surfaced", math.quizCompleted === true);
  check("lab opens are summed", math.labs.opened === 4, `${math.labs.opened}`);
  check("completed labs are counted (only the solved one)", math.labs.completed === 1, `${math.labs.completed}`);
  check("per-lesson lab detail is returned", math.labs.lessons.length === 2 && math.labs.lessons[0].lessonId === "math-l1-1");
  check("per-lesson lab detail keeps opens + completed", math.labs.lessons[0].opens === 3 && math.labs.lessons[0].completed === true);
  check("last activity is the most recent signal", a.lastActivityAt === "2026-09-18T10:05:00Z", a.lastActivityAt);
  check(
    "student totals add up",
    a.totals.subjectsStarted === 1 && a.totals.lessonsCompleted === 3 && a.totals.quizAttempts === 2 && a.totals.labsOpened === 4 && a.totals.labsCompleted === 1,
    JSON.stringify(a.totals)
  );

  const b = res.body.students.find((s) => s.email === STUDENT_B);
  const bio = b.subjects.find((s) => s.subjectId === "biology");
  check("student B's mock attempt is scored", bio.attempts.mock === 1 && bio.bestPct.mock === 100, JSON.stringify(bio.attempts));
  check("student B's lesson completion is independent", b.totals.lessonsCompleted === 1 && b.totals.subjectsStarted === 1);
}

{
  // Owner: any class, or all classes.
  seedClass();
  state.user = { id: "owner-1", email: OWNER };
  let res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class", teacher: TEACHER } });
  check("the owner can inspect a named class", res.statusCode === 200 && res.body.students.length === 2, `${res.statusCode}/${res.body.students?.length}`);
  check("the named class is echoed back", res.body.teacher === TEACHER, res.body.teacher);

  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("the owner with no teacher named sees every linked student", res.statusCode === 200 && res.body.students.length === 3, `${res.body.students?.length}`);
  check("all-classes view is labelled", res.body.teacher === "all");
}

{
  // Teacher with no links yet → empty, not an error.
  seedClass();
  setTable("teacher_students", []);
  state.user = { id: "teacher-1", email: TEACHER };
  const res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("a teacher with no links gets an empty 200", res.statusCode === 200 && res.body.students.length === 0, `${res.statusCode}`);
}

{
  // Linked student without an account yet.
  seedClass();
  setTable("teacher_students", [
    { id: "l1", teacher_email: TEACHER, student_email: STUDENT_A },
    { id: "l4", teacher_email: TEACHER, student_email: "not.signed.up@school.edu" },
  ]);
  state.user = { id: "teacher-1", email: TEACHER };
  const res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("a linked-but-unregistered student is reported, not dropped", res.body.roster.length === 2 && res.body.students.length === 1, `${res.body.roster.length}/${res.body.students.length}`);
  check("a warning explains the missing account", (res.body.warnings || []).some((w) => /account/i.test(w)), JSON.stringify(res.body.warnings));
}

{
  // Missing tables: teacher_students missing → fail closed; lab_activity missing → warn, still serve.
  seedClass();
  state.user = { id: "teacher-1", email: TEACHER };
  state.selectErrors.teacher_students = { message: 'relation "public.teacher_students" does not exist' };
  let res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("missing teacher_students fails closed (500)", res.statusCode === 500, `${res.statusCode}`);
  check("that error names the schema fix", /schema\.sql/.test(res.body.error || ""), res.body.error);
  check("no student data leaks with the failure", res.body.students === undefined);

  seedClass();
  state.user = { id: "teacher-1", email: TEACHER };
  state.selectErrors.lab_activity = { message: 'relation "public.lab_activity" does not exist' };
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("missing lab_activity still serves quiz + lesson data", res.statusCode === 200 && res.body.students.length === 2, `${res.statusCode}`);
  check("and warns that lab recording is off", (res.body.warnings || []).some((w) => /lab activity/i.test(w)), JSON.stringify(res.body.warnings));

  seedClass();
  state.user = { id: "teacher-1", email: TEACHER };
  state.selectErrors.quiz_results = { message: "connection reset" };
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("a real quiz_results failure fails closed", res.statusCode === 500, `${res.statusCode}`);

  seedClass();
  state.user = { id: "teacher-1", email: TEACHER };
  state.selectErrors.user_progress = { message: "connection reset" };
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("user_progress trouble degrades to a warning", res.statusCode === 200 && (res.body.warnings || []).some((w) => /lesson/i.test(w)), `${res.statusCode}`);
}

{
  // The per-subject student view is untouched by the teacher branch.
  seedClass();
  reset();
  state.user = { id: "student-1", email: STUDENT_A };
  setTable("quiz_results", [
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "practice", attempt_id: "att-1", question_id: "q1", topic: "math-l1-1", correct: true, created_at: "2026-09-18T09:00:00Z" },
    { user_id: "student-1", subject_id: "mathematics", quiz_type: "practice", attempt_id: "att-1", question_id: "q2", topic: "math-l1-1", correct: false, created_at: "2026-09-18T09:00:00Z" },
  ]);
  const res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { subjectId: "mathematics" } });
  check("the student's own summary still works", res.statusCode === 200 && res.body.attempts.length === 1, `${res.statusCode}`);
  check("weak topics are still ranked", res.body.topics.length === 1 && res.body.topics[0].topic === "math-l1-1");
  delete state.selectErrors.user_progress;
}

// =========================================================================
section("api/admin/grant-access.js — owner-only teacher links");

{
  reset();
  seedClass();
  state.user = { id: "teacher-1", email: TEACHER };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-links" } });
  check("a non-owner cannot list teacher links (403)", res.statusCode === 403, `${res.statusCode}`);

  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-links" } });
  check("the owner lists the links", res.statusCode === 200 && res.body.count === 3, `${res.statusCode}/${res.body.count}`);
  check("the owner sees which teachers can actually open the dashboard", res.body.allowedTeachers.includes(TEACHER), JSON.stringify(res.body.allowedTeachers));

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-link", teacherEmail: "  MS.BROWN@School.edu ", emails: ["student1@school.edu", "Student3@School.edu"] },
  });
  check("linking succeeds", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  check("emails are lower-cased in the link rows", state.upserts.at(-1).rows.every((r) => r.teacher_email === TEACHER && r.student_email === r.student_email.toLowerCase()));
  check("the upsert conflicts on the teacher/student pair", state.upserts.at(-1).conflict === "teacher_email,student_email");
  check("students without an account are reported", JSON.stringify(res.body.withoutAccount) === JSON.stringify(["student3@school.edu"]), JSON.stringify(res.body.withoutAccount));
  check("the response says whether the teacher has an account", res.body.teacherHasAccount === true);
  check("the response says whether the teacher is allow-listed", res.body.teacherInAllowlist === true);

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-link", teacherEmail: "new.teacher@school.edu", emails: ["student1@school.edu"] },
  });
  check("a teacher outside TEACHER_EMAILS is flagged as not allow-listed", res.body.teacherInAllowlist === false, JSON.stringify(res.body));

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link", emails: ["student1@school.edu"] } });
  check("linking without a teacher email is a 400", res.statusCode === 400, `${res.statusCode}`);
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link", teacherEmail: TEACHER } });
  check("linking without students is a 400", res.statusCode === 400, `${res.statusCode}`);

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-unlink", teacherEmail: TEACHER, emails: ["student2@school.edu"] },
  });
  check("unlinking succeeds", res.statusCode === 200 && res.body.removed.length === 1, `${res.statusCode}`);
  check("unlink removes exactly that pair", state.deletes.at(-1).filters.length === 2);
  check("the pair is gone from the store", !rows("teacher_students").some((r) => r.teacher_email === TEACHER && r.student_email === "student2@school.edu"));

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "nonsense" } });
  check("an unknown action is a 400", res.statusCode === 400, `${res.statusCode}`);
}

// =========================================================================
section("api/admin/grant-access.js — bulk CSV teacher links");

{
  // A class that already has one link, and accounts for three students.
  reset();
  setTable("teacher_students", [
    { id: "l1", teacher_email: TEACHER, student_email: STUDENT_A, created_at: "2026-09-17T00:00:00Z" },
  ]);
  state.users = [
    { id: "student-1", email: STUDENT_A },
    { id: "teacher-1", email: TEACHER },
  ];

  // --- the gate comes first ------------------------------------------------
  state.user = { id: "student-1", email: STUDENT_A };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link-bulk", csv: `${TEACHER},${STUDENT_B}` } });
  check("a non-owner cannot bulk-link (403)", res.statusCode === 403, `${res.statusCode}`);
  check("the 403 names the owner requirement", /owner/i.test(res.body.error || ""), res.body.error);
  check("no rows are written for a rejected caller", rows("teacher_students").length === 1, `${rows("teacher_students").length}`);

  res = await call(adminHandler, { method: "POST", headers: {}, body: { action: "teacher-link-bulk", csv: `${TEACHER},${STUDENT_B}` } });
  check("bulk-link without an auth header is a 401", res.statusCode === 401, `${res.statusCode}`);
  check("no rows are written without a token", rows("teacher_students").length === 1);

  // --- the happy path + every skip/invalid case in one paste ---------------
  // A pasted spreadsheet: tab-separated, CRLF, header row, a duplicate row, an
  // already-linked row, two malformed emails, a single-column row, a blank line.
  state.user = { id: "owner-1", email: OWNER };
  reset();
  setTable("teacher_students", [
    { id: "l1", teacher_email: TEACHER, student_email: STUDENT_A, created_at: "2026-09-17T00:00:00Z" },
  ]);
  state.users = [
    { id: "student-1", email: STUDENT_A },
    { id: "teacher-1", email: TEACHER },
  ];
  state.user = { id: "owner-1", email: OWNER };

  const paste = [
    "teacher_email\tstudent_email",
    `${TEACHER}\t${STUDENT_A}`, // already linked → skipped
    `${TEACHER}\tnew1@school.edu`, // linked
    `${TEACHER}\tnew1@school.edu`, // duplicate in this paste → skipped
    "NEW.TEACHER@School.edu\tnew2@School.edu", // linked, normalised to lower case
    "not-an-email,new3@school.edu", // invalid teacher
    "teacher2@school.edu,also bad", // invalid student
    "", // blank line — ignored, not data
    "onlyone@school.edu", // single column → invalid
  ].join("\r\n");

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link-bulk", csv: paste } });
  check("the owner bulk-links a pasted spreadsheet (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 160)}`);
  check("two new pairs are linked", res.body.linked === 2, `linked=${res.body.linked}`);
  check("the already-linked row and the in-paste duplicate are skipped", res.body.skipped === 2, `skipped=${res.body.skipped}`);
  check("malformed + unreadable rows are reported invalid, not fatal", res.body.invalid === 3, `invalid=${res.body.invalid}`);
  check("the counts add up to the rows pasted (header and blank line excluded)", res.body.total === 7, `total=${res.body.total} ${JSON.stringify(res.body).slice(0, 120)}`);
  check("linked + skipped + invalid === total", res.body.linked + res.body.skipped + res.body.invalid === res.body.total);
  check("the skipped rows say why", (res.body.skippedRows || []).map((r) => r.reason).sort().join(" | ") === "already linked | duplicate row in this paste", JSON.stringify(res.body.skippedRows));
  check("invalid rows carry their line number in the paste", (res.body.invalidRows || []).some((r) => r.line === 6 && /not a valid email/.test(r.reason)), JSON.stringify(res.body.invalidRows));
  check("invalid rows name which column is wrong", (res.body.invalidRows || []).filter((r) => /student: not a valid email/.test(r.reason)).length === 1 && (res.body.invalidRows || []).filter((r) => /teacher: not a valid email/.test(r.reason)).length === 1, JSON.stringify(res.body.invalidRows));
  check("the single-column row explains the expected shape", (res.body.invalidRows || []).some((r) => /two columns/.test(r.reason)), JSON.stringify(res.body.invalidRows));

  const written = state.upserts.at(-1);
  check("one write carries both new rows", written?.rows.length === 2, `${written?.rows.length}`);
  check("rows are lower-cased and trimmed before writing", written?.rows.every((r) => r.teacher_email === r.teacher_email.toLowerCase() && r.student_email === r.student_email.toLowerCase()), JSON.stringify(written?.rows));
  check("the write keys on the (teacher,student) unique pair", written?.conflict === "teacher_email,student_email", written?.conflict);
  check("the write lets an existing row win (ignoreDuplicates)", written?.ignoreDuplicates === true, `${written?.ignoreDuplicates}`);
  check("only the two new pairs are written, never the skipped ones", !JSON.stringify(written?.rows).includes(STUDENT_A), JSON.stringify(written?.rows));
  check("the links exist once each in the store", rows("teacher_students").length === 3, `${rows("teacher_students").length}`);
  check("the new teacher link is stored", rows("teacher_students").some((r) => r.teacher_email === "new.teacher@school.edu" && r.student_email === "new2@school.edu"));
  check("the response lists the created pairs", (res.body.linkedPairs || []).length === 2);
  check("students with no account yet are named", (res.body.withoutAccount || []).sort().join(",") === "new1@school.edu,new2@school.edu", JSON.stringify(res.body.withoutAccount));
  check("a linked student who already has an account is not flagged", !(res.body.withoutAccount || []).includes(STUDENT_A));
  check("a teacher outside TEACHER_EMAILS is flagged, the links still stand", (res.body.teachersNotInAllowlist || []).join(",") === "new.teacher@school.edu", JSON.stringify(res.body.teachersNotInAllowlist));

  // --- a header with extra columns picks the right two ---------------------
  reset();
  setTable("teacher_students", []);
  state.users = [{ id: "student-1", email: STUDENT_A }];
  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: {
      action: "teacher-link-bulk",
      csv: [
        "student_name,teacher_email,student_email,class", // student email is NOT column 2
        "Aaliyah Brown,ms.brown@school.edu,aaliyah@school.edu,5A",
      ].join("\n"),
    },
  });
  check("a header row maps the columns by name", res.statusCode === 200 && res.body.linked === 1, `${res.statusCode}/${res.body.linked}`);
  check("the header columns are honoured, not the position", JSON.stringify(state.upserts.at(-1)?.rows) === JSON.stringify([{ teacher_email: "ms.brown@school.edu", student_email: "aaliyah@school.edu" }]), JSON.stringify(state.upserts.at(-1)?.rows));

  // --- semicolons, quotes, CRLF-only, and no header ------------------------
  reset();
  setTable("teacher_students", []);
  state.users = [];
  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-link-bulk", csv: `"${TEACHER}";"${STUDENT_B}"` },
  });
  check("a semicolon paste with quoted cells links", res.statusCode === 200 && res.body.linked === 1, `${res.statusCode}/${JSON.stringify(res.body).slice(0, 120)}`);
  check("quotes are stripped from the cells", state.upserts.at(-1)?.rows[0].student_email === STUDENT_B, JSON.stringify(state.upserts.at(-1)?.rows));

  // --- duplicates across the whole paste, and a self-link ------------------
  reset();
  setTable("teacher_students", []);
  state.users = [];
  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: {
      action: "teacher-link-bulk",
      csv: [`${TEACHER},${STUDENT_A}`, `${TEACHER},${STUDENT_A}`, `${TEACHER},${TEACHER}`].join("\n"),
    },
  });
  check("the same pair pasted three ways links once", res.body.linked === 1, `linked=${res.body.linked}`);
  check("the repeat is a skip, not a second link", res.body.skipped === 1 && rows("teacher_students").length === 1, `skipped=${res.body.skipped}/${rows("teacher_students").length}`);
  check("linking a teacher to themselves is rejected as invalid", res.body.invalid === 1 && /same email/.test(res.body.invalidRows[0].reason), JSON.stringify(res.body.invalidRows));

  // --- the pairs array shape (no paste box needed) -------------------------
  reset();
  setTable("teacher_students", []);
  state.users = [];
  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-link-bulk", pairs: [{ teacher_email: " T1@School.edu ", student_email: "S1@School.edu" }, ["t1@school.edu", "s2@school.edu"]] },
  });
  check("the pairs array shape works too", res.statusCode === 200 && res.body.linked === 2, `${res.statusCode}/${res.body.linked}`);
  check("pairs array emails are normalised", rows("teacher_students").every((r) => r.teacher_email === "t1@school.edu"), JSON.stringify(rows("teacher_students")));

  // --- empty / missing / oversized input ----------------------------------
  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link-bulk", csv: "   \n  \n" } });
  check("an empty paste is a 400", res.statusCode === 400, `${res.statusCode}`);
  check("the 400 shows the expected format", /teacher@school\.edu/.test(res.body.error || ""), res.body.error);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link-bulk" } });
  check("neither csv nor pairs is a 400", res.statusCode === 400, `${res.statusCode}`);

  const before = rows("teacher_students").length;
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-link-bulk", csv: "t@school.edu,s@school.edu\n".repeat(1001) },
  });
  check("an oversized paste is a 400 (no partial write)", res.statusCode === 400 && rows("teacher_students").length === before, `${res.statusCode}/${rows("teacher_students").length}`);
  check("the 400 tells the owner to split the list", /split/i.test(res.body.error || ""), res.body.error);

  // --- failures fail closed ------------------------------------------------
  reset();
  setTable("teacher_students", []);
  state.users = [];
  state.user = { id: "owner-1", email: OWNER };
  state.selectErrors.teacher_students = { message: 'relation "public.teacher_students" does not exist' };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link-bulk", csv: `${TEACHER},${STUDENT_A}` } });
  check("a missing teacher_students table fails closed (500)", res.statusCode === 500, `${res.statusCode}`);
  check("that error names the schema fix", /schema\.sql/.test(res.body.error || ""), res.body.error);
  check("nothing is written when the lookup fails", state.upserts.length === 0, `${state.upserts.length}`);

  reset();
  setTable("teacher_students", []);
  state.users = [];
  state.user = { id: "owner-1", email: OWNER };
  state.writeErrors.teacher_students = { message: "connection reset" };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link-bulk", csv: `${TEACHER},${STUDENT_A}` } });
  check("a failed write is reported, not swallowed", res.statusCode === 500, `${res.statusCode}`);

  // The informational account lookup must never sink a batch that linked.
  reset();
  setTable("teacher_students", []);
  state.users = [];
  state.listUsersError = { message: "auth admin unavailable" };
  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-link-bulk", csv: `${TEACHER},${STUDENT_A}` } });
  check("an unavailable account list still links and warns", res.statusCode === 200 && res.body.linked === 1 && (res.body.warnings || []).length === 1, `${res.statusCode}/${JSON.stringify(res.body).slice(0, 140)}`);
  check("the warning says which students are known to have signed up is unknown", /signed up/i.test(res.body.warnings?.[0] || ""), res.body.warnings?.[0]);
  state.listUsersError = null;

  // --- the new action must not disturb the older ones ----------------------
  seedClass();
  state.user = { id: "owner-1", email: OWNER };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-links" } });
  check("teacher-links (the list) still works after bulk linking", res.statusCode === 200 && res.body.count === 3, `${res.statusCode}/${res.body.count}`);
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-link", teacherEmail: TEACHER, emails: [STUDENT_B] },
  });
  check("the single-pair link still works after bulk linking", res.statusCode === 200, `${res.statusCode}`);
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "nonsense" } });
  check("an unknown action is still a 400", res.statusCode === 400, `${res.statusCode}`);
}

// =========================================================================
// SCHOOL-ADMIN SELF-SERVICE
// A school licence used to leave every roster change with the platform owner.
// A designated school admin (created by the owner) now keeps their OWN school's
// roster and links — inside one hard boundary: never another school, never the
// platform, and never anything about a student's work.
// =========================================================================

const ADMIN_A = "principal@wolmers.edu.jm";
const ADMIN_B = "principal@other.edu.jm";
const T_A = "ms.brown@wolmers.edu.jm";
const T_B = "mr.jones@other.edu.jm";
const S_A1 = "aaliyah@wolmers.edu.jm";
const S_A2 = "andre@wolmers.edu.jm";
const S_A3 = "asha@wolmers.edu.jm";
const S_B1 = "bob@other.edu.jm";

function seedSchools() {
  reset();
  setTable("schools", [
    { id: "school-1", name: "Wolmer's Boys' School", created_at: "2026-09-01T00:00:00Z" },
    { id: "school-2", name: "Other High School", created_at: "2026-09-02T00:00:00Z" },
  ]);
  setTable("school_admins", [
    { id: "sa-1", school_id: "school-1", email: ADMIN_A, created_at: "2026-09-01T00:00:00Z" },
    { id: "sa-2", school_id: "school-2", email: ADMIN_B, created_at: "2026-09-02T00:00:00Z" },
  ]);
  setTable("school_members", [
    { id: "m1", school_id: "school-1", email: T_A, role: "teacher" },
    { id: "m2", school_id: "school-1", email: S_A1, role: "student" },
    { id: "m3", school_id: "school-1", email: S_A2, role: "student" },
    { id: "m4", school_id: "school-2", email: T_B, role: "teacher" },
    { id: "m5", school_id: "school-2", email: S_B1, role: "student" },
  ]);
  setTable("teacher_students", [
    // This school's own link, an owner-created platform link, and another
    // school's link — the three cases the boundary has to tell apart.
    { id: "l1", teacher_email: T_A, student_email: S_A1, school_id: "school-1", created_at: "2026-09-10T00:00:00Z" },
    { id: "l2", teacher_email: T_A, student_email: S_A2, school_id: null, created_at: "2026-09-11T00:00:00Z" },
    { id: "l3", teacher_email: T_B, student_email: S_B1, school_id: "school-2", created_at: "2026-09-12T00:00:00Z" },
  ]);
  state.users = [
    { id: "u-a1", email: S_A1 },
    { id: "u-a2", email: S_A2 },
    // S_A3 deliberately has no account yet — the honest "signed up?" reporting
    // (and its "unknown" fallback) is asserted against them.
    { id: "u-b1", email: S_B1 },
    { id: "u-ta", email: T_A },
    { id: "u-tb", email: T_B },
    { id: "u-admina", email: ADMIN_A },
    { id: "u-adminb", email: ADMIN_B },
  ];
}

// Add one person to a school's roster (used to set up a link that does not exist yet).
function addToRoster(schoolId, email, role) {
  setTable("school_members", [
    ...rows("school_members"),
    { id: `m-${email}`, school_id: schoolId, email, role },
  ]);
}

section("api/admin/grant-access.js — school admin gate");

{
  seedSchools();

  // A teacher is not a school admin: a link gives them a dashboard, not a roster.
  state.user = { id: "u-ta", email: T_A };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster" } });
  check("a teacher cannot open a school console (403)", res.statusCode === 403, `${res.statusCode}`);
  check("the 403 names the school-admin requirement", /school admin/i.test(res.body.error || ""), res.body.error);
  check("no school data comes back with that 403", res.body.school === undefined);

  res = await call(adminHandler, { method: "POST", headers: {}, body: { action: "school-roster" } });
  check("no auth header is a 401", res.statusCode === 401, `${res.statusCode}`);

  // A school admin runs their school, and NOTHING platform-wide.
  state.user = { id: "u-admina", email: ADMIN_A };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-list" } });
  check("a school admin cannot list every school (403)", res.statusCode === 403, `${res.statusCode}`);
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-links" } });
  check("a school admin cannot list every teacher link (403)", res.statusCode === 403, `${res.statusCode}`);
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-link", teacherEmail: T_A, emails: [S_A1] },
  });
  check("a school admin cannot create a platform-wide link (403)", res.statusCode === 403, `${res.statusCode}`);
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "list" } });
  check("a school admin cannot read the purchase grants (403)", res.statusCode === 403, `${res.statusCode}`);
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-create", name: "Rogue School" } });
  check("a school admin cannot create another school (403)", res.statusCode === 403, `${res.statusCode}`);
  check("nothing was written by any of those attempts", rows("schools").length === 2, `${rows("schools").length}`);
}

section("api/admin/grant-access.js — the school admin's own roster");

{
  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };
  const res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster" } });

  check("a designated admin gets their school (200)", res.statusCode === 200 && res.body.school?.id === "school-1", `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`);
  check("the school's name is returned", res.body.school.name === "Wolmer's Boys' School", res.body.school?.name);
  check("the console names the signed-in admin", res.body.schoolAdmin === ADMIN_A, res.body.schoolAdmin);
  check("the roster lists exactly this school's teachers", JSON.stringify(res.body.teachers) === JSON.stringify([T_A]), JSON.stringify(res.body.teachers));
  check("the roster lists exactly this school's students", JSON.stringify(res.body.students) === JSON.stringify([S_A1, S_A2]), JSON.stringify(res.body.students));
  check("only the school's own links are listed", res.body.links.length === 1 && res.body.links[0].studentEmail === S_A1, JSON.stringify(res.body.links));
  check("linkCount matches the links that are listed", res.body.linkCount === 1, `${res.body.linkCount}`);
  check("platform-wide links are counted, not listed", res.body.platformLinkCount === 1, `${res.body.platformLinkCount}`);
  check("another school's links are not even fetched to be counted", res.body.otherSchoolLinkCount === 0, `${res.body.otherSchoolLinkCount}`);
  check("nothing about the other school leaks into the payload", !JSON.stringify(res.body).includes("other.edu.jm"), JSON.stringify(res.body).slice(0, 200));
  check("the note explains what cannot be changed from here", /platform owner/i.test(res.body.note || ""), res.body.note);
  check("the roster read is scoped by the caller's own teachers", (state.selects.filter((s) => s.table === "teacher_students").at(-1)?.filters || []).some((f) => f[0] === "teacher_email"), JSON.stringify(state.selects.filter((s) => s.table === "teacher_students").at(-1)));
}

section("api/admin/grant-access.js — linking inside the school");

{
  seedSchools();
  addToRoster("school-1", S_A3, "student");
  state.user = { id: "u-admina", email: ADMIN_A };

  const res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", teacherEmail: T_A, emails: [S_A1, S_A2, S_A3] },
  });

  check("linking students inside the school works (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`);
  check("only the student with no link is written", JSON.stringify(res.body.linked) === JSON.stringify([S_A3]), JSON.stringify(res.body.linked));
  check("the school's own existing link is reported, not duplicated", JSON.stringify(res.body.alreadyLinked) === JSON.stringify([S_A1]), JSON.stringify(res.body.alreadyLinked));
  check("a platform link is reported separately from the school's", JSON.stringify(res.body.alreadyLinkedPlatform) === JSON.stringify([S_A2]), JSON.stringify(res.body.alreadyLinkedPlatform));
  check("students without an account yet are named, not dropped", JSON.stringify(res.body.withoutAccount) === JSON.stringify([S_A3]), JSON.stringify(res.body.withoutAccount));

  const written = state.upserts.at(-1);
  check("exactly one write carries the new link", written?.rows.length === 1, `${written?.rows?.length}`);
  check("the link is stamped with the caller's school by the server", written?.rows.every((r) => r.school_id === "school-1"), JSON.stringify(written?.rows));
  check("the link row is lower-cased and trimmed", written?.rows[0].teacher_email === T_A && written?.rows[0].student_email === S_A3, JSON.stringify(written?.rows));
  check("the write keys on the (teacher,student) unique pair", written?.conflict === "teacher_email,student_email", written?.conflict);
  check("the write lets an existing row win (ignoreDuplicates)", written?.ignoreDuplicates === true, `${written?.ignoreDuplicates}`);
  check("the response labels the school it wrote into", res.body.school?.name === "Wolmer's Boys' School", JSON.stringify(res.body.school));
}

section("api/admin/grant-access.js — the school boundary");

{
  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };

  let res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", teacherEmail: T_A, emails: [S_B1] },
  });
  check("linking a student from another school is refused (400)", res.statusCode === 400, `${res.statusCode}`);
  check("the refusal says the student is not on this roster", /roster/i.test(res.body.error || ""), res.body.error);
  check("the refused student is named back", JSON.stringify(res.body.notInSchool) === JSON.stringify([S_B1]), JSON.stringify(res.body.notInSchool));
  check("nothing is written for an outside student", state.upserts.length === 0, `${state.upserts.length}`);

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", teacherEmail: T_B, emails: [S_A1] },
  });
  check("linking another school's teacher is refused (400)", res.statusCode === 400, `${res.statusCode}`);
  check("the refusal says that teacher is not one of this school's", /not one of .*teachers|roster as a teacher/i.test(res.body.error || ""), res.body.error);
  check("still nothing is written", state.upserts.length === 0, `${state.upserts.length}`);

  // The decisive one: a schoolId in the body must never move the scope.
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", schoolId: "school-2", teacherEmail: T_B, emails: [S_B1] },
  });
  check("a schoolId in the body cannot move the scope", res.statusCode === 400, `${res.statusCode}`);
  check("naming the other school writes nothing", state.upserts.length === 0, `${state.upserts.length}`);

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-unlink", schoolId: "school-2", teacherEmail: T_B, emails: [S_B1] },
  });
  check("unlinking with a spoofed schoolId removes nothing", res.statusCode === 200 && res.body.removed.length === 0, `${res.statusCode}/${JSON.stringify(res.body.removed)}`);
  check("the other school's link is untouched", rows("teacher_students").some((r) => r.id === "l3"));

  // A mixed batch: only the in-school students link, and the rest are named.
  addToRoster("school-1", S_A3, "student");
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", teacherEmail: T_A, emails: [S_A3, S_B1] },
  });
  check("a mixed batch links the in-school student only", res.statusCode === 200 && JSON.stringify(res.body.linked) === JSON.stringify([S_A3]), `${res.statusCode}/${JSON.stringify(res.body.linked)}`);
  check("and names the student it left alone", JSON.stringify(res.body.notInSchool) === JSON.stringify([S_B1]), JSON.stringify(res.body.notInSchool));
  check("the written row is still stamped with the caller's school", state.upserts.at(-1).rows.every((r) => r.school_id === "school-1"), JSON.stringify(state.upserts.at(-1).rows));
}

section("api/admin/grant-access.js — unlinking stays inside the school");

{
  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };

  let res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-unlink", teacherEmail: T_A, emails: [S_A2] },
  });
  check("unlinking a platform link removes nothing (200)", res.statusCode === 200 && res.body.removed.length === 0, `${res.statusCode}/${JSON.stringify(res.body.removed)}`);
  check("the platform link survives", rows("teacher_students").some((r) => r.id === "l2"));
  check("the response explains why nothing was removed", /platform owner/i.test(res.body.note || ""), res.body.note);

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-unlink", teacherEmail: T_A, emails: [S_A1] },
  });
  check("unlinking the school's own link works", res.statusCode === 200 && JSON.stringify(res.body.removed) === JSON.stringify([S_A1]), `${res.statusCode}/${JSON.stringify(res.body.removed)}`);
  check("the delete is scoped to the caller's school", state.deletes.at(-1).filters.some((f) => f[0] === "school_id" && f[1] === "school-1"), JSON.stringify(state.deletes.at(-1).filters));
  check("the school's row is gone", !rows("teacher_students").some((r) => r.id === "l1"));
  check("the other school's row is still there", rows("teacher_students").some((r) => r.id === "l3"));

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-unlink", teacherEmail: T_A, emails: [S_A1, S_A3] },
  });
  check("unlinking students with no link says so instead of inventing one", res.body.removed.length === 0 && JSON.stringify(res.body.notRemoved) === JSON.stringify([S_A1, S_A3]), JSON.stringify(res.body.notRemoved));
}

section("api/admin/grant-access.js — the school admin's roster");

{
  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };

  let res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-member-add", email: "  NEW.Teacher@Wolmers.edu.jm ", role: "teacher" },
  });
  check("adding a teacher to the roster works (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  check("the roster email is lower-cased and trimmed", res.body.member?.email === "new.teacher@wolmers.edu.jm", res.body.member?.email);
  check("the roster row is scoped to the caller's school", state.upserts.at(-1)?.rows[0].school_id === "school-1", JSON.stringify(state.upserts.at(-1)?.rows));
  check("the roster row carries the role", state.upserts.at(-1)?.rows[0].role === "teacher");
  check("the roster write conflicts on (school,email)", state.upserts.at(-1)?.conflict === "school_id,email", state.upserts.at(-1)?.conflict);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-member-add", email: "not-an-email", role: "teacher" } });
  check("a malformed roster email is a 400", res.statusCode === 400 && /valid email/i.test(res.body.error || ""), `${res.statusCode}/${res.body.error}`);
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-member-add", email: "ok@wolmers.edu.jm", role: "principal" } });
  check("a role other than teacher/student is a 400", res.statusCode === 400 && /role must be/i.test(res.body.error || ""), `${res.statusCode}/${res.body.error}`);

  // The new teacher is now linkable — that is the point of the roster.
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", teacherEmail: "new.teacher@wolmers.edu.jm", emails: [S_A1] },
  });
  check("a teacher just added to the roster can be linked", res.statusCode === 200 && JSON.stringify(res.body.linked) === JSON.stringify([S_A1]), `${res.statusCode}/${JSON.stringify(res.body.linked)}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-member-remove", email: T_A } });
  check("removing a member works (200)", res.statusCode === 200, `${res.statusCode}`);
  check("their roster row is gone", !rows("school_members").some((m) => m.email === T_A));
  check("the links this school created for them go too", !rows("teacher_students").some((r) => r.id === "l1"));
  check("the platform link for the same teacher is left alone", rows("teacher_students").some((r) => r.id === "l2"));
  check("the removal reports how many links went with them", res.body.removedLinks === 1, `${res.body.removedLinks}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-member-remove", email: S_B1 } });
  check("removing another school's member is refused (400)", res.statusCode === 400 && /roster/i.test(res.body.error || ""), `${res.statusCode}/${res.body.error}`);
  check("the other school's member is still there", rows("school_members").some((m) => m.email === S_B1));
}

section("api/admin/grant-access.js — owner override + school administration");

{
  seedSchools();
  state.user = { id: "owner-1", email: OWNER };

  // Owner override: works, but only for a school named explicitly.
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster" } });
  check("the owner must name a school for a school action (400)", res.statusCode === 400 && /name one existing school/i.test(res.body.error || ""), `${res.statusCode}/${res.body.error}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster", schoolId: "school-2" } });
  check("the owner sees the named school (200)", res.statusCode === 200 && res.body.school?.id === "school-2", `${res.statusCode}`);
  check("the named school's roster is the right one", res.body.teachers.join(",") === T_B && res.body.students.join(",") === S_B1, JSON.stringify(res.body.teachers));

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster", schoolName: "other high school" } });
  check("a school can be named by name, case-insensitively", res.statusCode === 200 && res.body.school?.id === "school-2", `${res.statusCode}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster", schoolId: "nope" } });
  check("an unknown school is a 400, not a sweep of every school", res.statusCode === 400, `${res.statusCode}`);

  // The owner's own school-management actions, before the override writes anything.
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-list" } });
  check("the owner lists the schools (200)", res.statusCode === 200 && res.body.count === 2, `${res.statusCode}/${res.body.count}`);
  const one = res.body.schools.find((s) => s.id === "school-1");
  check("each school shows its admin", JSON.stringify(one.admins) === JSON.stringify([ADMIN_A]), JSON.stringify(one.admins));
  check("each school shows its roster", one.teachers.join(",") === T_A && one.students.join(",") === [S_A1, S_A2].join(","), JSON.stringify(one));
  check("each school shows only its own link count", one.linkCount === 1, `${one.linkCount}`);
  check("platform-wide links are counted separately", res.body.platformLinks === 1, `${res.body.platformLinks}`);

  // Owner override: the existing pair is reported rather than duplicated...
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", schoolName: "Wolmer's Boys' School", teacherEmail: T_A, emails: [S_A1] },
  });
  check("the owner can work inside a named school (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  check("an existing link is reported, not written twice by the override", JSON.stringify(res.body.alreadyLinked) === JSON.stringify([S_A1]) && res.body.linked.length === 0, JSON.stringify(res.body).slice(0, 160));

  // ...and a new pair is stamped with the named school, never platform-wide.
  addToRoster("school-1", S_A3, "student");
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", schoolName: "Wolmer's Boys' School", teacherEmail: T_A, emails: [S_A3] },
  });
  check("the override links a new pair (200)", res.statusCode === 200 && JSON.stringify(res.body.linked) === JSON.stringify([S_A3]), `${res.statusCode}/${JSON.stringify(res.body.linked)}`);
  check("the owner's school link is stamped with that school, not platform-wide", state.upserts.at(-1)?.rows.every((r) => r.school_id === "school-1"), JSON.stringify(state.upserts.at(-1)?.rows));

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-create", name: "  Excelsior   High  ", adminEmail: "Principal@Excelsior.edu.jm" },
  });
  check("the owner creates a school (200)", res.statusCode === 200 && res.body.created === true, `${res.statusCode}/${JSON.stringify(res.body).slice(0, 120)}`);
  check("the school name is tidied", res.body.school?.name === "Excelsior High", res.body.school?.name);
  check("its admin is designated in the same call", res.body.admin === "principal@excelsior.edu.jm", res.body.admin);
  check("the school is stored once", rows("schools").filter((s) => s.name === "Excelsior High").length === 1);

  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-create", name: "Excelsior High", adminEmail: "Principal@Excelsior.edu.jm" },
  });
  check("creating the same school twice is not a duplicate", res.body.created === false && rows("schools").length === 3, `${res.body.created}/${rows("schools").length}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-create", name: "   " } });
  check("creating a school without a name is a 400", res.statusCode === 400, `${res.statusCode}`);
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-create", name: "Bad Admin School", adminEmail: "nope" } });
  check("a malformed school-admin email is a 400", res.statusCode === 400 && /valid email/i.test(res.body.error || ""), `${res.statusCode}/${res.body.error}`);

  const excelsiorId = rows("schools").find((s) => s.name === "Excelsior High").id;
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-admin", schoolName: "Excelsior High", email: "head@excelsior.edu.jm" } });
  check("the owner sets a school admin (200)", res.statusCode === 200, `${res.statusCode}`);
  check("the admin row points at the named school", rows("school_admins").find((a) => a.email === "head@excelsior.edu.jm")?.school_id === excelsiorId);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-admin", schoolName: "Excelsior High", email: "head@excelsior.edu.jm", remove: true } });
  check("the owner can remove that admin", res.statusCode === 200 && !rows("school_admins").some((a) => a.email === "head@excelsior.edu.jm"), `${res.statusCode}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-admin", schoolName: "No Such School", email: "x@y.edu" } });
  check("setting an admin on an unknown school is a 400", res.statusCode === 400, `${res.statusCode}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-member", schoolId: excelsiorId, email: "teacher@excelsior.edu.jm", role: "teacher" } });
  check("the owner can seed a school's roster", res.statusCode === 200 && rows("school_members").some((m) => m.school_id === excelsiorId && m.email === "teacher@excelsior.edu.jm"), `${res.statusCode}`);
}

section("api/admin/grant-access.js — school tables missing (fails closed)");

{
  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };
  state.selectErrors.school_admins = { message: 'relation "public.school_admins" does not exist' };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster" } });
  check("a missing school_admins table fails closed (500)", res.statusCode === 500, `${res.statusCode}`);
  check("that error names the schema fix", /schema\.sql/.test(res.body.error || ""), res.body.error);
  check("no school data leaks with that failure", res.body.school === undefined && res.body.teachers === undefined);

  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };
  state.selectErrors.school_members = { message: 'relation "public.school_members" does not exist' };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster" } });
  check("a missing school_members table fails closed (500)", res.statusCode === 500, `${res.statusCode}`);

  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };
  state.selectErrors.teacher_students = { message: 'relation "public.teacher_students" does not exist' };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster" } });
  check("a missing teacher_students table fails closed (500)", res.statusCode === 500, `${res.statusCode}`);

  seedSchools();
  state.user = { id: "owner-1", email: OWNER };
  state.selectErrors.schools = { message: 'relation "public.schools" does not exist' };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-list" } });
  check("the owner's school list fails closed (500)", res.statusCode === 500, `${res.statusCode}`);
  check("that error names the schema fix too", /schema\.sql/.test(res.body.error || ""), res.body.error);

  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };
  state.writeErrors.school_members = { message: "connection reset" };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-member-add", email: "someone@wolmers.edu.jm" } });
  check("a failed roster write is reported, not swallowed (500)", res.statusCode === 500, `${res.statusCode}`);

  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };
  addToRoster("school-1", S_A3, "student");
  state.writeErrors.teacher_students = { message: "connection reset" };
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", teacherEmail: T_A, emails: [S_A3] },
  });
  check("a failed link write is reported, not swallowed (500)", res.statusCode === 500, `${res.statusCode}`);

  // The informational account lookup must never sink a link that worked.
  seedSchools();
  state.user = { id: "u-admina", email: ADMIN_A };
  addToRoster("school-1", S_A3, "student");
  state.listUsersError = { message: "auth admin unavailable" };
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-link", teacherEmail: T_A, emails: [S_A3] },
  });
  check("an unavailable account list still links, and warns", res.statusCode === 200 && JSON.stringify(res.body.linked) === JSON.stringify([S_A3]) && (res.body.warning || "").length > 0, `${res.statusCode}/${JSON.stringify(res.body).slice(0, 140)}`);
  check("the warning says whether they have signed up is unknown", /signed up/i.test(res.body.warning || ""), res.body.warning);
}

section("api/analytics/summary.js — being linked is what grants a teacher their class");

{
  seedClass();
  setTable("teacher_students", [
    { id: "l1", teacher_email: "linked.teacher@school.edu", student_email: STUDENT_A, created_at: "2026-09-18T00:00:00Z" },
    { id: "l2", teacher_email: TEACHER, student_email: STUDENT_B, created_at: "2026-09-18T00:00:00Z" },
  ]);

  state.user = { id: "teacher-2", email: "linked.teacher@school.edu" };
  let res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("a teacher who is linked but not in TEACHER_EMAILS gets in (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  check("and sees exactly their own linked student", res.body.students?.length === 1 && res.body.students[0].email === STUDENT_A, JSON.stringify(res.body.students?.map((s) => s.email)));
  check("another teacher's student is not included", !JSON.stringify(res.body).includes(STUDENT_B));

  setTable("teacher_students", [{ id: "l2", teacher_email: TEACHER, student_email: STUDENT_B }]);
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("once unlinked, the same account is refused again (403)", res.statusCode === 403, `${res.statusCode}`);

  seedClass();
  state.user = { id: "student-1", email: STUDENT_A };
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("a student linked as a STUDENT is still refused (403)", res.statusCode === 403, `${res.statusCode}`);
}

// =========================================================================
// A TEACHER'S OWN CLASS LIST
//
// Owner decision 2026-09-22: "the school admin will link the teachers … the
// teacher can also link students once linked by school admin", and the
// owner-only Admin linking card was to be removed. So a teacher keeps their own
// class list from the dashboard — and the one thing that must never vary is
// whose list it is: the teacher is ALWAYS the caller (there is no teacherEmail
// in this action's request shape at all).
// =========================================================================
section("api/admin/grant-access.js — a teacher's own class list (gate)");

{
  seedSchools();

  // A student is on a roster, but not as a teacher: no class list, ever.
  state.user = { id: "u-a1", email: S_A1 };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("a student cannot read a class list (403)", res.statusCode === 403, `${res.statusCode}`);
  check("the 403 names the teacher requirement", /teacher access required/i.test(res.body.error || ""), res.body.error);
  check("no links come back with that 403", res.body.links === undefined);
  check("the 403 says how to get access", /roster|owner/i.test(res.body.error || ""), res.body.error);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", emails: [S_A2] } });
  check("a student cannot link anyone (403)", res.statusCode === 403, `${res.statusCode}`);
  check("nothing is written for a rejected caller", state.upserts.length === 0 && rows("teacher_students").length === 3, `${state.upserts.length}/${rows("teacher_students").length}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-unlink", emails: [S_A1] } });
  check("a student cannot unlink anyone either (403)", res.statusCode === 403, `${res.statusCode}`);
  check("no delete was attempted", state.deletes.length === 0, `${state.deletes.length}`);

  res = await call(adminHandler, { method: "POST", headers: {}, body: { action: "teacher-self-link", emails: [S_A2] } });
  check("no auth header is a 401", res.statusCode === 401, `${res.statusCode}`);
}

section("api/admin/grant-access.js — a school-designated teacher links students");

{
  seedSchools();
  // T_A is on school-1's roster with role 'teacher' — added there by the school's
  // OWN admin. That row alone is what opens this teacher's class list.
  state.user = { id: "u-ta", email: T_A };

  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("a school-designated teacher reads their own class list (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`);
  check("the list is exactly their own links", JSON.stringify((res.body.links || []).map((l) => l.studentEmail)) === JSON.stringify([S_A1, S_A2]), JSON.stringify(res.body.links));
  check("the response names the caller as the teacher", res.body.teacherEmail === T_A, res.body.teacherEmail);
  check("another school's student is not listed", !JSON.stringify(res.body).includes(S_B1));
  check("the list query is scoped to the caller", (state.selects.filter((s) => s.table === "teacher_students").at(-1)?.filters || []).some((f) => f[0] === "teacher_email" && f[1] === T_A), JSON.stringify(state.selects.filter((s) => s.table === "teacher_students").at(-1)));

  // S_A3 is NOT on the school's roster at all: the owner's rule is that a
  // teacher links ANY student email they know, with no approval step.
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", emails: [S_A3] } });
  check("a school-designated teacher links a student (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`);
  check("the new link is reported", JSON.stringify(res.body.linked) === JSON.stringify([S_A3]), JSON.stringify(res.body.linked));
  check("a student who is not on the school roster still links (no roster step)", rows("teacher_students").some((r) => r.teacher_email === T_A && r.student_email === S_A3));
  const written = state.upserts.at(-1);
  check("the teacher in the new row is the CALLER", written?.rows.every((r) => r.teacher_email === T_A), JSON.stringify(written?.rows));
  check("the link is stamped with the caller's own school", written?.rows.every((r) => r.school_id === "school-1"), JSON.stringify(written?.rows));
  check("the write keys on the (teacher,student) unique pair", written?.conflict === "teacher_email,student_email", written?.conflict);
  check("the write lets an existing row win (ignoreDuplicates)", written?.ignoreDuplicates === true, `${written?.ignoreDuplicates}`);
  check("students who have no account yet are named", JSON.stringify(res.body.withoutAccount) === JSON.stringify([S_A3]), JSON.stringify(res.body.withoutAccount));
  check("the response says which rule let the caller in", res.body.access === "school", res.body.access);
}

section("api/admin/grant-access.js — an allowlisted teacher links platform-level");

{
  seedSchools();
  // On the allowlist, on NO school roster: their links belong to the platform,
  // exactly like the owner's.
  state.user = { id: "teacher-1", email: TEACHER };
  const res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", emails: [STUDENT_A] } });
  check("an allowlisted teacher can self-link (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`);
  check("a platform-level teacher's link carries no school", state.upserts.at(-1)?.rows.every((r) => !("school_id" in r)), JSON.stringify(state.upserts.at(-1)?.rows));
  check("the response says how the caller qualified", res.body.access === "allowlist", res.body.access);
  check("the row is stored against the caller", rows("teacher_students").some((r) => r.teacher_email === TEACHER && r.student_email === STUDENT_A));
  check("the school's own link count is unchanged", rows("teacher_students").filter((r) => r.school_id === "school-1").length === 1, JSON.stringify(rows("teacher_students")));
}

section("api/admin/grant-access.js — a teacher can only ever touch their own list");

{
  seedSchools();
  state.user = { id: "u-ta", email: T_A };

  // The identity is the caller. Anything the body claims about the teacher is
  // ignored — there is nothing to trust and nothing to spoof.
  let res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-self-link", teacherEmail: T_B, teacher_email: T_B, emails: [S_A3] },
  });
  check("a teacherEmail in the body is ignored", state.upserts.at(-1)?.rows.every((r) => r.teacher_email === T_A), JSON.stringify(state.upserts.at(-1)?.rows));
  check("the response names the caller, not the body", res.body.teacherEmail === T_A, res.body.teacherEmail);
  check("no link is written for the named teacher", !rows("teacher_students").some((r) => r.teacher_email === T_B && r.student_email === S_A3));
  check("the other teacher's list is untouched", JSON.stringify(rows("teacher_students").filter((r) => r.teacher_email === T_B).map((r) => r.student_email)) === JSON.stringify([S_B1]));

  // Another teacher's class is neither readable nor editable.
  state.user = { id: "u-tb", email: T_B };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("a different teacher sees only their own links", JSON.stringify((res.body.links || []).map((l) => l.studentEmail)) === JSON.stringify([S_B1]), JSON.stringify(res.body.links));
  check("another school's class is not in the payload", !JSON.stringify(res.body).includes(S_A1));

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-unlink", emails: [S_A1] } });
  check("unlinking a student who belongs to another teacher removes nothing", res.statusCode === 200 && res.body.removed.length === 0, `${res.statusCode}/${JSON.stringify(res.body.removed)}`);
  check("that student's real link survives", rows("teacher_students").some((r) => r.teacher_email === T_A && r.student_email === S_A1));
  const del = state.deletes.at(-1);
  check("the delete is scoped to the caller's email", (del?.filters || []).some((f) => f[0] === "teacher_email" && f[1] === T_B), JSON.stringify(del?.filters));
  check("the delete never names the other teacher", !(del?.filters || []).some((f) => f[0] === "teacher_email" && f[1] === T_A), JSON.stringify(del?.filters));
}

section("api/admin/grant-access.js — a teacher unlinking their own students");

{
  seedSchools();
  state.user = { id: "u-ta", email: T_A };

  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-unlink", emails: [S_A2] } });
  check("unlinking your own student works (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`);
  check("the removed student is reported", JSON.stringify(res.body.removed) === JSON.stringify([S_A2]), JSON.stringify(res.body.removed));
  check("the link is gone from the store", !rows("teacher_students").some((r) => r.id === "l2"));
  check("their other link is untouched", rows("teacher_students").some((r) => r.id === "l1"));
  check("another school's student is untouched", rows("teacher_students").some((r) => r.id === "l3"));

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-unlink", emails: [S_A2] } });
  check("unlinking again says there was nothing to unlink", res.body.removed.length === 0 && /nothing to unlink/i.test(res.body.message || ""), res.body.message);
  check("and names what was not removed", JSON.stringify(res.body.notRemoved) === JSON.stringify([S_A2]), JSON.stringify(res.body.notRemoved));
}

section("api/admin/grant-access.js — re-linking is idempotent");

{
  seedSchools();
  state.user = { id: "u-ta", email: T_A };

  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", emails: [S_A2, S_A3] } });
  check("only the student with no link is written", JSON.stringify(res.body.linked) === JSON.stringify([S_A3]), JSON.stringify(res.body.linked));
  check("the existing link is reported, not duplicated", JSON.stringify(res.body.alreadyLinked) === JSON.stringify([S_A2]), JSON.stringify(res.body.alreadyLinked));
  check("the write carries only the new pair", state.upserts.at(-1)?.rows.length === 1, `${state.upserts.at(-1)?.rows.length}`);
  check("a student who already signed up is not flagged", !(res.body.withoutAccount || []).includes(S_A2), JSON.stringify(res.body.withoutAccount));
  const before = rows("teacher_students").length;

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", emails: [S_A2, S_A3] } });
  check("re-linking the same students links nothing new", res.body.linked.length === 0 && res.body.alreadyLinked.length === 2, JSON.stringify(res.body).slice(0, 160));
  check("no row is added by the repeat", rows("teacher_students").length === before, `${rows("teacher_students").length}/${before}`);
}

section("api/admin/grant-access.js — what a teacher cannot link");

{
  seedSchools();
  state.user = { id: "u-ta", email: T_A };

  let res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-self-link", emails: ["not-an-email", T_A, "  New.Student@Wolmers.edu.JM  "] },
  });
  check("a malformed email is refused with a reason", (res.body.invalid || []).some((i) => /not a valid email/.test(i.reason)), JSON.stringify(res.body.invalid));
  check("a teacher cannot link themselves as a student", (res.body.invalid || []).some((i) => /your own email/.test(i.reason)), JSON.stringify(res.body.invalid));
  check("the valid student is still linked", JSON.stringify(res.body.linked) === JSON.stringify(["new.student@wolmers.edu.jm"]), JSON.stringify(res.body.linked));
  check("only the valid address is written", state.upserts.at(-1)?.rows.length === 1, `${state.upserts.at(-1)?.rows.length}`);
  check("the address is lower-cased and trimmed", state.upserts.at(-1)?.rows[0].student_email === "new.student@wolmers.edu.jm", JSON.stringify(state.upserts.at(-1)?.rows));

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", email: "single@wolmers.edu.jm" } });
  check("the single email field works too", res.statusCode === 200 && JSON.stringify(res.body.linked) === JSON.stringify(["single@wolmers.edu.jm"]), `${res.statusCode}/${JSON.stringify(res.body.linked)}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link" } });
  check("linking with no student email is a 400", res.statusCode === 400, `${res.statusCode}`);
  check("that 400 says what is missing", /email/i.test(res.body.error || ""), res.body.error);

  const beforeOversized = rows("teacher_students").length;
  res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-self-link", emails: Array.from({ length: 501 }, (_, i) => `s${i}@school.edu`) },
  });
  check("an oversized batch is a 400 (no partial write)", res.statusCode === 400 && rows("teacher_students").length === beforeOversized, `${res.statusCode}/${rows("teacher_students").length}`);
  check("the 400 says the ceiling", /500/.test(res.body.error || ""), res.body.error);
}

section("api/admin/grant-access.js — a teacher's class list fails closed");

{
  seedSchools();
  state.user = { id: "u-ta", email: T_A };
  state.selectErrors.teacher_students = { message: 'relation "public.teacher_students" does not exist' };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("a missing teacher_students table fails closed (500)", res.statusCode === 500, `${res.statusCode}`);
  check("that error names the schema fix", /schema\.sql/.test(res.body.error || ""), res.body.error);
  check("no links leak with that failure", res.body.links === undefined);

  seedSchools();
  state.user = { id: "u-ta", email: T_A };
  state.writeErrors.teacher_students = { message: "connection reset" };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", emails: [S_A3] } });
  check("a failed link write is reported, not swallowed (500)", res.statusCode === 500, `${res.statusCode}`);
  check("that 500 also names the schema hint", /schema\.sql/.test(res.body.error || ""), res.body.error);

  seedSchools();
  state.user = { id: "u-ta", email: T_A };
  state.writeErrors.teacher_students = { message: "connection reset" };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-unlink", emails: [S_A1] } });
  check("a failed unlink is reported, not swallowed (500)", res.statusCode === 500, `${res.statusCode}`);

  // The informational account lookup must never sink a link that worked.
  seedSchools();
  state.user = { id: "u-ta", email: T_A };
  state.listUsersError = { message: "auth admin unavailable" };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-link", emails: [S_A3] } });
  check("an unavailable account list still links, and warns", res.statusCode === 200 && JSON.stringify(res.body.linked) === JSON.stringify([S_A3]), `${res.statusCode}/${JSON.stringify(res.body).slice(0, 140)}`);
  check("the warning says who signed up is unknown", /signed up/i.test(res.body.warning || ""), res.body.warning);
  state.listUsersError = null;

  // The newer schools tables are NOT a prerequisite for the other routes in.
  seedSchools();
  state.selectErrors.school_members = { message: 'relation "public.school_members" does not exist' };
  state.user = { id: "teacher-1", email: TEACHER }; // allowlisted — no roster needed
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("a missing school_members table does not break an allowlisted teacher", res.statusCode === 200, `${res.statusCode}`);
  state.user = { id: "u-a1", email: S_A1 };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("and someone who is not a teacher is still refused (403)", res.statusCode === 403, `${res.statusCode}`);
  check("still no data with that 403", res.body.links === undefined);
}

// =========================================================================
section("src/data/labActivity.js — client tracking");

{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const posts = [];
  globalThis.fetch = async (url, options) => {
    posts.push({ url, body: JSON.parse(options.body), headers: options.headers });
    return { ok: true, json: async () => ({ success: true, stored: true }) };
  };

  const { recordLabOpen, recordLabComplete, loadLabActivity } = await import("../src/data/labActivity.js");

  let entry = recordLabOpen("mathematics", "math-l1-1", "interactive-quiz", null);
  check("an open is recorded in localStorage", entry.opens === 1 && !!loadLabActivity()["mathematics::math-l1-1"]);
  check("signed out, nothing is POSTed", posts.length === 0, `${posts.length}`);

  entry = recordLabOpen("mathematics", "math-l1-1", "interactive-quiz", { access_token: "tok" });
  check("a second open increments the local count", entry.opens === 2, `${entry.opens}`);
  check("signed in, the open is POSTed", posts.length === 1 && posts[0].url === "/api/analytics/record");
  check("the payload marks a lab event", posts[0].body.kind === "lab" && posts[0].body.lessonId === "math-l1-1" && posts[0].body.completed === false, JSON.stringify(posts[0].body));
  check("the sync carries the bearer token", posts[0].headers.Authorization === "Bearer tok");

  entry = recordLabComplete("mathematics", "math-l1-1", "interactive-quiz", { access_token: "tok" });
  check("completion is recorded locally and reported", entry.completed === true && posts.at(-1).body.completed === true);
  check("completion does not inflate the open count", entry.opens === 2, `${entry.opens}`);

  recordLabOpen("biology", "bio-l1-1", "flashcard", null);
  check("separate lessons are tracked separately", Object.keys(loadLabActivity()).length === 2);
  check("a different subject/lesson pair is independent", loadLabActivity()["biology::bio-l1-1"].opens === 1);

  // A failing sync must never throw into the lab.
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  let threw = false;
  try {
    recordLabOpen("biology", "bio-l1-1", "flashcard", { access_token: "tok" });
  } catch {
    threw = true;
  }
  check("a failed sync never breaks the lab", threw === false);
}

// =========================================================================
// THE ENV LABEL: TEACHER_EMAIL (as set in Vercel) OR TEACHER_EMAILS (older)
// =========================================================================
section("api/admin/grant-access.js + summary.js — either env label works");

{
  const savedSingular = process.env.TEACHER_EMAIL;
  const savedPlural = process.env.TEACHER_EMAILS;

  seedSchools();
  process.env.TEACHER_EMAIL = TEACHER; // the label the owner actually has
  delete process.env.TEACHER_EMAILS;

  state.user = { id: "teacher-1", email: TEACHER };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("the class list opens with ONLY TEACHER_EMAIL set", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("the dashboard opens with ONLY TEACHER_EMAIL set", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);

  delete process.env.TEACHER_EMAIL;
  process.env.TEACHER_EMAILS = TEACHER; // the older label — must keep working
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } });
  check("the class list still opens with only the older TEACHER_EMAILS", res.statusCode === 200, `${res.statusCode}`);
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("the dashboard still opens with only the older TEACHER_EMAILS", res.statusCode === 200, `${res.statusCode}`);

  // Both present: the singular (the label the owner uses) wins, so a stale
  // plural value can never silently keep granting access it no longer should.
  process.env.TEACHER_EMAIL = TEACHER;
  process.env.TEACHER_EMAILS = "someone.else@school.edu";
  state.user = { id: "teacher-1", email: TEACHER };
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("with both labels set, the singular one is in force", res.statusCode === 200, `${res.statusCode}`);
  state.user = { id: "nobody-1", email: "someone.else@school.edu" };
  res = await call(summaryHandler, { method: "GET", headers: authHeader, query: { scope: "class" } });
  check("and the stale plural value no longer grants access", res.statusCode === 403, `${res.statusCode}`);

  process.env.TEACHER_EMAIL = savedSingular;
  process.env.TEACHER_EMAILS = savedPlural;
}

// =========================================================================
section("wiring + schema");

const sandbox = readFileSync(join(root, "src/components/ExperimentSandbox.jsx"), "utf8");
const dragDrop = readFileSync(join(root, "src/components/DragDropLabel.jsx"), "utf8");
const app = readFileSync(join(root, "src/App.jsx"), "utf8");
const adminPage = readFileSync(join(root, "src/pages/AdminPage.jsx"), "utf8");
const teacherPage = readFileSync(join(root, "src/pages/TeacherPage.jsx"), "utf8");
const schoolConsole = readFileSync(join(root, "src/pages/SchoolConsolePage.jsx"), "utf8");
const schoolCard = readFileSync(join(root, "src/components/SchoolAdminCard.jsx"), "utf8");
const homePage = readFileSync(join(root, "src/pages/Home.jsx"), "utf8");
const adminApi = readFileSync(join(root, "api/admin/grant-access.js"), "utf8");
const summaryApi = readFileSync(join(root, "api/analytics/summary.js"), "utf8");
const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");

// NOTE on argument order: check(name, condition). These wiring assertions were
// written with the arguments swapped for a long time, which made every one of
// them print "ok   true" no matter what the file said — a whole section of green
// that asserted nothing (three of them were in fact already stale). They are in
// the right order now, and this section fails when the wiring breaks.
check("the sandbox records a lab open per lesson", /recordLabOpen/.test(sandbox) && /if \(!subjectId \|\| !lessonId\) return;/.test(sandbox));
check("the right-answer lab reports completion when solved", /recordLabComplete/.test(dragDrop) && /allPlaced/.test(dragDrop));
check("completion is reported once per solve, not on every render", /reportedRef/.test(dragDrop));
check("the /teacher route is registered", /import TeacherPage/.test(app) && /path="\/teacher"/.test(app));
// The owner-only linking card is GONE (owner decision 2026-09-22): a teacher
// keeps their own class list from the dashboard, and the owner's Admin screen no
// longer carries a linking UI. The component and its stylesheet are DELETED, not
// merely unwired — the harness reads the files to prove it.
check("the admin screen no longer renders the owner-only linking card", !/TeacherLinksCard/.test(adminPage));
check(
  "the owner-only linking card component and its stylesheet are deleted",
  !existsSync(join(root, "src/components/TeacherLinksCard.jsx")) &&
    !existsSync(join(root, "src/components/TeacherLinksCard.css"))
);
check("the admin screen still renders the owner's schools window", /SchoolAdminCard/.test(adminPage));
check(
  "the teacher dashboard links and unlinks its own students",
  /teacher-self-link/.test(teacherPage) && /teacher-self-unlink/.test(teacherPage)
);
check("the teacher card takes a list of student emails", /Link students/.test(teacherPage) && /<textarea/.test(teacherPage));
check("the teacher's email box is controlled by state (a paste is not lost)", /setEmails\(e\.target\.value\)/.test(teacherPage));
check("the teacher card is titled for the teacher", /Your students/.test(teacherPage) && /Linked students/.test(teacherPage));
check("the copy says the student does not have to approve", /don’t need to approve|don't need to approve/.test(teacherPage));
check("the teacher's card never sends a teacher email — identity comes from the session", !/teacherEmail/.test(teacherPage));
check("linking refreshes the dashboard it just changed", /refresh/.test(teacherPage) && /onChanged/.test(teacherPage));
check("each linked student can be unlinked from the card", /Unlink/.test(teacherPage));
check("the page has an explicit not-a-teacher state", /Forbidden: teacher access required|not a teacher account/.test(teacherPage));
check("the page reads the class scope endpoint", /scope=class/.test(teacherPage));
check("schema creates lab_activity", /create table if not exists public\.lab_activity/.test(schema));
check("schema creates teacher_students", /create table if not exists public\.teacher_students/.test(schema));
check(
  "every new table is behind a deny-all RLS policy",
  (schema.match(/using \(false\)/g) || []).length >= 5
);
check("lab_activity has the (user,subject,lesson) unique index", /lab_activity_user_lesson_uniq/.test(schema));
check("teacher_students has the (teacher,student) unique index", /teacher_students_pair_uniq/.test(schema));
check("schema remains idempotent", !/create table if not exists public\.lab_activity[\s\S]*?drop constraint/.test(schema));

// --- school-admin self-service: UI wiring + schema -------------------------
check("the /school route is registered", /import SchoolConsolePage/.test(app) && /path="\/school"/.test(app));
check("the home educator card links to both educator screens", /to="\/teacher"/.test(homePage) && /to="\/school"/.test(homePage));
check("the admin screen renders the owner-only schools card", /SchoolAdminCard/.test(adminPage));
check("the school console reads the scoped roster action", /school-roster/.test(schoolConsole));
check("the console can link and unlink students", /school-link/.test(schoolConsole) && /school-unlink/.test(schoolConsole));
check("the console manages its own roster", /school-member-add/.test(schoolConsole) && /school-member-remove/.test(schoolConsole));
check("the console has an explicit not-a-school-admin state", /not a school admin|does not administer a school/.test(schoolConsole));
check("the console fails closed when the data is unavailable", /fails closed rather than\s+showing partial/.test(schoolConsole));
check("the owner card creates a school and designates its admin", /school-create/.test(schoolCard) && /school-admin/.test(schoolCard));
check("the owner card seeds the roster and names the school console address", /school-member/.test(schoolCard) && /\/school/.test(schoolCard));
check("the endpoint separates owner actions from school-scoped ones", /OWNER_ACTIONS/.test(adminApi) && /SCHOOL_SCOPED_ACTIONS/.test(adminApi));
check("the allowlist reads TEACHER_EMAIL, falling back to TEACHER_EMAILS", /TEACHER_EMAIL \|\| process\.env\.TEACHER_EMAILS/.test(adminApi));
check("the dashboard gate reads both env labels too", /TEACHER_EMAIL \|\| process\.env\.TEACHER_EMAILS/.test(summaryApi));
const teacherSelfActions = (adminApi.split("const TEACHER_SELF_ACTIONS = [")[1] || "").split("]")[0];
check(
  "the three teacher self-service actions are declared together",
  /teacher-self-links/.test(teacherSelfActions) && /teacher-self-link/.test(teacherSelfActions) && /teacher-self-unlink/.test(teacherSelfActions)
);
const ownerActionsList = (adminApi.split("const OWNER_ACTIONS = [")[1] || "").split("]")[0];
check("the teacher self-service actions are not owner-only", !/teacher-self/.test(ownerActionsList));
const teacherGateAt = adminApi.indexOf("if (TEACHER_SELF_ACTIONS.includes(action))");
const ownerFallbackAt = adminApi.indexOf("Forbidden: this action is restricted to the owner");
check("the teacher gate runs before the owner-only fallback", teacherGateAt > 0 && teacherGateAt < ownerFallbackAt);
check("a teacher's link rows are always stamped with the CALLER", /const teacherEmail = callerEmail/.test(adminApi));
check("the teacher gate accepts a school-designated teacher", /from\("school_members"\)[\s\S]{0,600}?role/.test(adminApi));
check("the dashboard gate accepts a school-designated teacher too", /from\("school_members"\)[\s\S]{0,600}?role/.test(summaryApi));
check("the roster rule requires role 'teacher', not just any roster row", /=== "teacher"/.test(summaryApi));
check("the teacher's own list is always read by the caller's email", /\.eq\("teacher_email", teacherEmail\)/.test(adminApi));

check("the school comes from the caller's own school_admins row", /callerSchoolId = adminRow\.school_id/.test(adminApi));
const gateBranch = (adminApi.split("if (isOwnerCaller) {")[1] || "").split("if (!callerSchoolId")[0];
const ownerBranch = gateBranch.split("} else {")[0];
// The branch ends where the teacher self-service block begins (that block is
// not part of the school-admin gate), so nothing from it can satisfy or trip
// these assertions.
const adminBranch = (gateBranch.split("} else {")[1] || "").split("if (TEACHER_SELF_ACTIONS")[0];
check("the owner override resolves the school it was told to", /findSchool\(schools, schoolId/.test(ownerBranch));
check("a school admin's scope comes from their own row, never the request body", /callerSchoolId = adminRow\.school_id/.test(adminBranch) && !/req\.body/.test(adminBranch));

check("schema creates schools", /create table if not exists public\.schools/.test(schema));
check("schema creates school_admins", /create table if not exists public\.school_admins/.test(schema));
check("schema creates school_members", /create table if not exists public\.school_members/.test(schema));
check("teacher_students gains the school_id column", /alter table public\.teacher_students[\s\S]*?add column if not exists school_id/.test(schema));
check("one row per school name", /schools_name_uniq/.test(schema));
check("one admin email maps to exactly one school", /school_admins_email_uniq/.test(schema));
check("one roster row per (school, email)", /school_members_uniq/.test(schema));
check("a roster role is constrained to teacher/student", /role text not null default 'student' check \(role in \('teacher', 'student'\)\)/.test(schema));
check("every access table is behind a deny-all RLS policy", (schema.match(/using \(false\)/g) || []).length >= 8);
check("deleting a school does not delete the links, it un-owns them", /on delete set null/.test(schema.split("add column if not exists school_id")[1].slice(0, 120)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
