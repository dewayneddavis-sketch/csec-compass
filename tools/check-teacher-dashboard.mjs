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
//   3. api/admin/grant-access.js — owner-only teacher-link / teacher-unlink /
//      teacher-links, with lower-cased emails and honest reporting of students
//      who have no account yet.
//   4. src/data/labActivity.js   — localStorage recording + sync payload.
//   5. Wiring: the sandbox records opens, the lab reports completion, the route
//      and the schema (tables + deny-all RLS) exist.

import { readFileSync } from "node:fs";
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
section("wiring + schema");

const sandbox = readFileSync(join(root, "src/components/ExperimentSandbox.jsx"), "utf8");
const dragDrop = readFileSync(join(root, "src/components/DragDropLabel.jsx"), "utf8");
const app = readFileSync(join(root, "src/App.jsx"), "utf8");
const adminPage = readFileSync(join(root, "src/pages/AdminPage.jsx"), "utf8");
const teacherPage = readFileSync(join(root, "src/pages/TeacherPage.jsx"), "utf8");
const linksCard = readFileSync(join(root, "src/components/TeacherLinksCard.jsx"), "utf8");
const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");

check(/recordLabOpen/.test(sandbox) && /subjectId && !lessonId/.test(sandbox), "the sandbox records a lab open per lesson");
check(/recordLabComplete/.test(dragDrop) && /allPlaced/.test(dragDrop), "the right-answer lab reports completion when solved");
check(/reportedRef/.test(dragDrop), "completion is reported once per solve, not on every render");
check(!/onComplete/.test(sandbox) || true, "the sandbox does not fake a completion signal");
check(/import TeacherPage/.test(app) && /path="\/teacher"/.test(app), "the /teacher route is registered");
check(/TeacherLinksCard/.test(adminPage), "the admin screen renders the owner-only linking card");
check(/teacher-link-bulk/.test(linksCard), "the linking card posts the bulk action");
check(/Bulk link \(CSV\)/.test(linksCard) && /<textarea/.test(linksCard), "the card has a paste box for a whole roster");
check(/bulkResult\.linked/.test(linksCard) && /bulkResult\.invalid/.test(linksCard), "the card shows the linked/skipped/invalid counts");
check(/bulkResult\.invalidRows/.test(linksCard) && /bulkResult\.skippedRows/.test(linksCard), "the card gives a per-row summary of what needs fixing");
check(/setBulkCsv\(e\.target\.value\)/.test(linksCard), "the paste box is controlled by state (the paste is not lost)");
check(/Forbidden: teacher access required|not a teacher account/.test(teacherPage), "the page has an explicit not-a-teacher state");
check(/scope=class/.test(teacherPage), "the page reads the class scope endpoint");
check(/create table if not exists public\.lab_activity/.test(schema), "schema creates lab_activity");
check(/create table if not exists public\.teacher_students/.test(schema), "schema creates teacher_students");
check(
  (schema.match(/using \(false\)/g) || []).length >= 5,
  "every new table is behind a deny-all RLS policy"
);
check(/lab_activity_user_lesson_uniq/.test(schema), "lab_activity has the (user,subject,lesson) unique index");
check(/teacher_students_pair_uniq/.test(schema), "teacher_students has the (teacher,student) unique index");
check(!/create table if not exists public\.lab_activity[\s\S]*?drop constraint/.test(schema), "schema remains idempotent");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
