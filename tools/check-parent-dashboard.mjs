// Verification harness: the parent dashboard.
//   node tools/check-parent-dashboard.mjs
//
// Owner decision 2026-09-22, clarified model: "when parents purchase a single or
// bundle, parents can link their child" — and the child's progress should be
// visible "same info as teacher dashboard so parents can track the progress of
// their child".
//
//   1. src/pages/PricingPage.jsx takes an OPTIONAL child's email on the subject
//      and bundle plans only, and will not send a malformed one to Stripe.
//   2. api/checkout/create-session.js validates it and carries it in the Stripe
//      checkout metadata (child_email) — a school licence never carries one.
//   3. api/stripe/webhook.js writes the link after payment: the PARENT is the
//      buying account (client_reference_id -> that account's email, never the
//      metadata), the child is an email because they may not have signed up yet,
//      the write is idempotent, and it FAILS OPEN — a missing table or a failed
//      insert is reported and the purchase is still granted.
//   4. api/analytics/summary.js?scope=parent serves the parent dashboard with the
//      SAME aggregation as ?scope=class, scoped to the caller's own children,
//      and fails closed (403, zero data) for anyone who is not a linked parent.
//   5. The page is /parent, reachable from the account page, and renders the
//      shared progress component the teacher dashboard uses.
//
// Everything below drives the real handlers offline against the fake Supabase and
// Stripe doubles (tools/school-loader.mjs).

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register("./school-loader.mjs", import.meta.url);

const OWNER = "owner@csec-compass.test";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.STRIPE_SECRET_KEY = "sk_test_offline";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_offline";
process.env.OWNER_EMAILS = OWNER;
// No teacher allowlist in this harness: a parent must never need it, and a
// teacher's access must never leak into the parent scope.
process.env.TEACHER_EMAIL = "";
process.env.TEACHER_EMAILS = "";

const stub = await import("./teacher-stub.mjs");
const { state, reset, setTable, rows } = stub;
const stripeStub = await import("./stripe-stub.mjs");
const stripeState = stripeStub.state;

const read = (p) => readFileSync(join(root, p), "utf8");

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title) {
  console.log(`\n== ${title}`);
}

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

const checkoutHandler = (await import("../api/checkout/create-session.js")).default;
const webhookHandler = (await import("../api/stripe/webhook.js")).default;
const summaryHandler = (await import("../api/analytics/summary.js")).default;

async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}

const authHeader = { authorization: "Bearer parent-token" };

function checkoutReq(body) {
  return { method: "POST", headers: { "content-type": "application/json" }, body };
}
function webhookReq(event) {
  const raw = Buffer.from(JSON.stringify(event));
  return {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=test" },
    async *[Symbol.asyncIterator]() {
      yield raw;
    },
  };
}
function summaryReq(query, { headers = authHeader } = {}) {
  return { method: "GET", headers, query };
}
// The event Stripe would send for the checkout the real handler just created:
// fed from the recorded metadata, so a key create-session stops emitting fails
// this harness instead of the live webhook.
function eventFromCheckout(metadata, { id = "cs_parent_1", userId = "parent-1" } = {}) {
  return { type: "checkout.session.completed", data: { object: { id, metadata, client_reference_id: userId } } };
}

const PARENT_A = "maria.lopez@example.com";
const PARENT_B = "devon.brown@example.com";
const CHILD_A = "aaliyah@school.edu";
const CHILD_B = "andre@school.edu";
const CHILD_B2 = "ben@school.edu";
const TEACHER = "ms.brown@wolmers.edu.jm";

const parentLinks = () => rows("parent_students");
const purchases = () => rows("purchases");

// A database with two families, one teacher's class, and the accounts behind
// them: enough for the isolation checks to have something to leak.
function seedFamilies() {
  reset();
  stripeStub.reset();
  state.user = { id: "account-a", email: PARENT_A };
  setTable("parent_students", [
    { id: "ps-1", parent_email: PARENT_A, student_email: CHILD_A, created_at: "2026-09-20T00:00:00Z" },
    { id: "ps-2", parent_email: PARENT_A, student_email: CHILD_B, created_at: "2026-09-21T00:00:00Z" },
    { id: "ps-3", parent_email: PARENT_B, student_email: CHILD_B2, created_at: "2026-09-21T00:00:00Z" },
  ]);
  setTable("teacher_students", [
    { id: "l1", teacher_email: TEACHER, student_email: CHILD_A },
    { id: "l2", teacher_email: TEACHER, student_email: CHILD_B2 },
  ]);
  setTable("parent_students_untouched", []);
  setTable("purchases", []);
  setTable("quiz_results", []);
  setTable("user_progress", []);
  setTable("lab_activity", []);
  state.users = [
    { id: "u-child-a", email: CHILD_A },
    { id: "u-child-b", email: CHILD_B },
    { id: "u-child-b2", email: CHILD_B2 },
    { id: "u-parent-a", email: PARENT_A },
    { id: "u-parent-b", email: PARENT_B },
    { id: "u-teacher", email: TEACHER },
  ];
}

// One child with real progress in two subjects — the fixture both scopes are
// asked to describe, so their answers can be compared word for word.
function seedChildActivity() {
  setTable("quiz_results", [
    { user_id: "u-child-a", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "a1", question_id: "q1", correct: true, created_at: "2026-09-19T10:00:00Z" },
    { user_id: "u-child-a", subject_id: "mathematics", quiz_type: "knowledge-check", attempt_id: "a1", question_id: "q2", correct: false, created_at: "2026-09-19T10:00:01Z" },
    { user_id: "u-child-a", subject_id: "mathematics", quiz_type: "mock", attempt_id: "a2", question_id: "q1", correct: true, created_at: "2026-09-19T12:00:00Z" },
    { user_id: "u-child-a", subject_id: "mathematics", quiz_type: "mock", attempt_id: "a2", question_id: "q2", correct: true, created_at: "2026-09-19T12:00:01Z" },
    { user_id: "u-child-a", subject_id: "english-a", quiz_type: "practice", attempt_id: "a3", question_id: "q1", correct: false, created_at: "2026-09-20T09:00:00Z" },
  ]);
  setTable("user_progress", [
    { user_id: "u-child-a", subject_id: "mathematics", completed_lessons: ["m1", "m2", "m3"], quiz_completed: true, updated_at: "2026-09-19T12:05:00Z" },
    { user_id: "u-child-a", subject_id: "english-a", completed_lessons: ["e1"], quiz_completed: false, updated_at: "2026-09-20T09:05:00Z" },
  ]);
  setTable("lab_activity", [
    { user_id: "u-child-a", subject_id: "mathematics", lesson_id: "m1", experiment_type: "drag-drop-label", opens: 3, completed: true, last_activity_at: "2026-09-19T11:00:00Z" },
    { user_id: "u-child-a", subject_id: "english-a", lesson_id: "e1", experiment_type: "flashcard", opens: 2, completed: false, last_activity_at: "2026-09-20T09:10:00Z" },
  ]);
}

// ===========================================================================
section("1. checkout: the child rides with a subject or bundle only");

let subjectSession = null;
{
  seedFamilies();
  const base = {
    userId: "parent-1",
    successUrl: "https://csec-compass.test/account",
    cancelUrl: "https://csec-compass.test/pricing",
  };

  // The plain subject purchase must be unchanged when no child is named — but
  // the key must still be present, so the webhook can tell "no child" from
  // "key missing".
  let res = await call(checkoutHandler, checkoutReq({ ...base, priceType: "subject", subjectId: "mathematics" }));
  check("a subject purchase without a child still works (200)", res.statusCode === 200, `${res.statusCode}`);
  subjectSession = stripeState.checkoutSessions.at(-1);
  check("and carries an empty child_email", subjectSession.metadata.child_email === "", JSON.stringify(subjectSession.metadata));

  res = await call(
    checkoutHandler,
    checkoutReq({ ...base, priceType: "subject", subjectId: "mathematics", childEmail: "  Aaliyah@School.EDU " })
  );
  check("a subject purchase with a child is accepted (200)", res.statusCode === 200, `${res.statusCode}`);
  check(
    "the child email is normalised into the metadata",
    stripeState.checkoutSessions.at(-1).metadata.child_email === "aaliyah@school.edu",
    JSON.stringify(stripeState.checkoutSessions.at(-1).metadata)
  );
  check("the subject purchase still names its subject", stripeState.checkoutSessions.at(-1).metadata.subject_id === "mathematics");

  res = await call(checkoutHandler, checkoutReq({ ...base, priceType: "bundle", childEmail: CHILD_B }));
  check("a bundle purchase with a child is accepted (200)", res.statusCode === 200, `${res.statusCode}`);
  check("the bundle carries the child too", stripeState.checkoutSessions.at(-1).metadata.child_email === CHILD_B);

  res = await call(checkoutHandler, checkoutReq({ ...base, priceType: "bundle" }));
  check("a bundle purchase without a child works (200)", res.statusCode === 200);
  check("and carries an empty child_email", stripeState.checkoutSessions.at(-1).metadata.child_email === "");

  // A school licence is not a family purchase.
  const beforeSchool = stripeState.checkoutSessions.length;
  res = await call(
    checkoutHandler,
    checkoutReq({
      ...base,
      priceType: "school-license-50",
      schoolName: "Wolmer's Boys' School",
      adminEmail: "principal@wolmers.edu.jm",
      childEmail: "aaliyah@school.edu",
    })
  );
  check("a school licence ignores a child email (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("no child_email is carried on a school licence", stripeState.checkoutSessions.at(-1).metadata.child_email === "", JSON.stringify(stripeState.checkoutSessions.at(-1).metadata));
  check("that was a real Stripe session", stripeState.checkoutSessions.length === beforeSchool + 1);
}

// ===========================================================================
section("2. checkout: a typo is caught before the buyer pays");

{
  seedFamilies();
  const before = stripeState.checkoutSessions.length;
  const base = { userId: "parent-1", priceType: "subject", subjectId: "mathematics" };

  let res = await call(checkoutHandler, checkoutReq({ ...base, childEmail: "aaliyah@" }));
  check("a malformed child email is refused (400)", res.statusCode === 400, `${res.statusCode}`);
  check("and says so plainly", /email/i.test(res.body.error || ""), res.body.error);
  check("and never reaches Stripe", stripeState.checkoutSessions.length === before);

  res = await call(checkoutHandler, checkoutReq({ ...base, childEmail: "not-an-email" }));
  check("a non-address is refused too (400)", res.statusCode === 400, `${res.statusCode}`);

  res = await call(checkoutHandler, checkoutReq({ ...base, childEmail: `${"x".repeat(250)}@school.edu` }));
  check("an over-long address is refused (400)", res.statusCode === 400, `${res.statusCode}`);

  res = await call(checkoutHandler, checkoutReq({ ...base, childEmail: "" }));
  check("an empty child email is fine (buy without linking)", res.statusCode === 200, `${res.statusCode}`);
  check("and stores an empty child_email", stripeState.checkoutSessions.at(-1).metadata.child_email === "");
}

// ===========================================================================
section("3. webhook: the link comes from the payment and the buyer's own account");

{
  seedFamilies();
  // The buyer's account is what names the PARENT, so seed that account.
  state.users = [{ id: "buyer-1", email: "  Maria.Lopez@Example.COM " }, ...state.users];

  await call(checkoutHandler, checkoutReq({ priceType: "subject", subjectId: "physics", userId: "buyer-1", childEmail: CHILD_A }));
  stripeState.event = eventFromCheckout(stripeState.checkoutSessions.at(-1).metadata, { id: "cs_parent_ok", userId: "buyer-1" });
  const res = await call(webhookHandler, webhookReq(stripeState.event));

  check("the webhook accepts the event (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("and reports the link it made", res.body.parent?.status === "linked", JSON.stringify(res.body.parent));
  const link = parentLinks().find((l) => l.parent_email === "maria.lopez@example.com");
  check("the parent is the BUYER's email, lowercased", !!link, JSON.stringify(parentLinks()));
  check("the child is the email typed at checkout", link?.student_email === CHILD_A, JSON.stringify(link));
  check("the purchase is still recorded", purchases().some((p) => p.purchase_type === "physics" && p.user_id === "buyer-1"), JSON.stringify(purchases()));

  // metadata can never name the parent: a decoy key is ignored.
  state.users = [{ id: "buyer-2", email: "devon.brown@example.com" }, ...state.users];
  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_parent_decoy",
        metadata: { price_type: "bundle", child_email: "kid@school.edu", parent_email: "attacker@example.com" },
        client_reference_id: "buyer-2",
      },
    },
  };
  await call(webhookHandler, webhookReq(stripeState.event));
  check(
    "a parent email in the metadata cannot name the parent",
    !parentLinks().some((l) => l.parent_email === "attacker@example.com"),
    JSON.stringify(parentLinks())
  );
  check(
    "the buyer's own account is still the parent",
    parentLinks().some((l) => l.parent_email === "devon.brown@example.com" && l.student_email === "kid@school.edu"),
    JSON.stringify(parentLinks())
  );
}

// ===========================================================================
section("4. webhook: idempotent, and never in the way of a purchase");

{
  seedFamilies();
  state.users = [{ id: "buyer-1", email: PARENT_A }, ...state.users];
  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_parent_twice",
        metadata: { price_type: "subject", subject_id: "physics", child_email: CHILD_A },
        client_reference_id: "buyer-1",
      },
    },
  };
  stripeState.event = event;

  await call(webhookHandler, webhookReq(event));
  const afterFirst = parentLinks().length;
  const res = await call(webhookHandler, webhookReq(event));
  check("a re-delivered event is still accepted (200)", res.statusCode === 200, `${res.statusCode}`);
  check("and writes no second link", parentLinks().length === afterFirst, `${parentLinks().length}/${afterFirst}`);
  check("the pair is unique in the store", parentLinks().filter((l) => l.parent_email === PARENT_A && l.student_email === CHILD_A).length === 1);
  check("the write asks the database to ignore a duplicate", state.upserts.some((u) => u.table === "parent_students" && u.ignoreDuplicates === true), JSON.stringify(state.upserts.at(-1)));

  // No child named: nothing to do, and nothing to fail.
  state.upserts.length = 0;
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_parent_none", metadata: { price_type: "bundle", child_email: "" }, client_reference_id: "buyer-1" } },
  };
  let res2 = await call(webhookHandler, webhookReq(stripeState.event));
  check("a purchase with no child is accepted (200)", res2.statusCode === 200, `${res2.statusCode}`);
  check("and writes no link at all", state.upserts.filter((u) => u.table === "parent_students").length === 0);
  check("and reports that it skipped", res2.body.parent?.status === "skipped", JSON.stringify(res2.body.parent));

  // A parent cannot link themselves as their own child.
  const beforeSelf = parentLinks().length;
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_parent_self", metadata: { price_type: "bundle", child_email: PARENT_A }, client_reference_id: "buyer-1" } },
  };
  res2 = await call(webhookHandler, webhookReq(stripeState.event));
  check("linking your own account as your child is refused", res2.body.parent?.status === "invalid", JSON.stringify(res2.body.parent));
  check("and writes no link", parentLinks().length === beforeSelf);

  // A school licence never creates a family link, even if the metadata has one.
  const beforeLicence = parentLinks().length;
  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_parent_licence",
        metadata: { price_type: "school-license-50", child_email: "kid@school.edu", school_name: "Test School", admin_email: "head@school.edu" },
        client_reference_id: "buyer-1",
      },
    },
  };
  res2 = await call(webhookHandler, webhookReq(stripeState.event));
  check("a school licence is accepted (200)", res2.statusCode === 200, `${res2.statusCode}`);
  check("and creates no parent link", parentLinks().length === beforeLicence);
  check("and reports no parent link", res2.body.parent === undefined, JSON.stringify(res2.body.parent));
}

// ===========================================================================
section("5. webhook: a failed link never costs the buyer their purchase");

{
  seedFamilies();
  state.users = [{ id: "buyer-1", email: PARENT_A }, ...state.users];
  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_parent_failopen",
        metadata: { price_type: "subject", subject_id: "biology", child_email: CHILD_A },
        client_reference_id: "buyer-1",
      },
    },
  };
  stripeState.event = event;

  // The table does not exist yet (the owner has not applied the SQL).
  state.writeErrors.parent_students = { message: 'relation "public.parent_students" does not exist' };
  let res = await call(webhookHandler, webhookReq(event));
  check("a missing parent_students table does not fail the purchase (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("the purchase is still granted", purchases().some((p) => p.purchase_type === "biology" && p.user_id === "buyer-1"), JSON.stringify(purchases()));
  check("and the link problem is reported, not swallowed", res.body.parent?.status === "error", JSON.stringify(res.body.parent));
  state.writeErrors.parent_students = null;

  // The buyer lookup fails.
  seedFamilies();
  state.users = [{ id: "buyer-1", email: PARENT_A }, ...state.users];
  state.getUserByIdError = { message: "auth admin unavailable" };
  stripeState.event = event;
  res = await call(webhookHandler, webhookReq(event));
  check("an unavailable buyer lookup does not fail the purchase (200)", res.statusCode === 200, `${res.statusCode}`);
  check("and is reported as an error", res.body.parent?.status === "error", JSON.stringify(res.body.parent));
  state.getUserByIdError = null;

  // The buyer account has no email at all.
  seedFamilies();
  state.users = [];
  stripeState.event = event;
  res = await call(webhookHandler, webhookReq(event));
  check("a buyer account with no email does not fail the purchase (200)", res.statusCode === 200, `${res.statusCode}`);
  check("and is reported as an error", res.body.parent?.status === "error", JSON.stringify(res.body.parent));
}

// ===========================================================================
section("6. scope=parent: the caller's own children, and nobody else's");

{
  seedFamilies();
  seedChildActivity();

  let res = await call(summaryHandler, summaryReq({ scope: "parent" }, { headers: {} }));
  check("no auth header is a 401", res.statusCode === 401, `${res.statusCode}`);

  state.user = { id: "u-teacher", email: TEACHER };
  res = await call(summaryHandler, summaryReq({ scope: "parent" }));
  check("a TEACHER account cannot open the parent dashboard (403)", res.statusCode === 403, `${res.statusCode}`);
  check("and gets no student data with it", res.body.students === undefined, JSON.stringify(res.body).slice(0, 120));

  state.user = { id: "u-stranger", email: "nobody@example.com" };
  res = await call(summaryHandler, summaryReq({ scope: "parent" }));
  check("an account with no linked child is refused (403)", res.statusCode === 403, `${res.statusCode}`);
  check("and the 403 names no family data", res.body.students === undefined && res.body.roster === undefined, JSON.stringify(res.body).slice(0, 160));
  check("and says how the link is made", /checkout/i.test(res.body.error || ""), res.body.error);

  state.user = { id: "u-parent-a", email: PARENT_A };
  res = await call(summaryHandler, summaryReq({ scope: "parent" }));
  check("a linked parent opens their dashboard (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 160)}`);
  check("the response names the parent scope", res.body.scope === "parent" && res.body.parent === PARENT_A, JSON.stringify({ scope: res.body.scope, parent: res.body.parent }));
  check("and shows only their own children", JSON.stringify(res.body.roster.map((r) => r.email).sort()) === JSON.stringify([CHILD_A, CHILD_B]), JSON.stringify(res.body.roster));
  check("a roster row names the parent as parentEmail", res.body.roster.every((r) => r.parentEmail === PARENT_A && !("teacherEmail" in r)), JSON.stringify(res.body.roster[0]));
  check("another family's child is nowhere in the payload", !JSON.stringify(res.body).includes(CHILD_B2));
  check("the teacher's links are not used as parent links", res.body.roster.length === 2, `${res.body.roster.length}`);
  check("the counts describe the family", res.body.counts.students === 2, JSON.stringify(res.body.counts));
}

// ===========================================================================
section("7. scope=parent: the payload is the teacher dashboard's, verbatim");

{
  seedFamilies();
  seedChildActivity();

  state.user = { id: "u-parent-a", email: PARENT_A };
  const asParent = await call(summaryHandler, summaryReq({ scope: "parent" }));

  state.user = { id: "u-teacher", email: TEACHER };
  const asTeacher = await call(summaryHandler, summaryReq({ scope: "class" }));

  check("the teacher scope still works after the shared refactor (200)", asTeacher.statusCode === 200, `${asTeacher.statusCode} ${JSON.stringify(asTeacher.body).slice(0, 160)}`);

  const parentChild = asParent.body.students.find((s) => s.email === CHILD_A);
  const teacherChild = asTeacher.body.students.find((s) => s.email === CHILD_A);
  check("the same child appears in both scopes", !!parentChild && !!teacherChild);
  check(
    "the progress payload is byte-for-byte the same for the same child",
    JSON.stringify(parentChild) === JSON.stringify(teacherChild),
    `${JSON.stringify(parentChild)?.slice(0, 200)} vs ${JSON.stringify(teacherChild)?.slice(0, 200)}`
  );
  check("lessons completed are aggregated the same way", parentChild?.totals?.lessonsCompleted === 4, JSON.stringify(parentChild?.totals));
  check("labs as well", parentChild?.totals?.labsOpened === 5 && parentChild?.totals?.labsCompleted === 1, JSON.stringify(parentChild?.totals));
  check("and quiz attempts", parentChild?.totals?.quizAttempts === 3, JSON.stringify(parentChild?.totals));
  check(
    "per-subject best/last/pass figures survive the shared aggregation",
    parentChild?.subjects?.find((s) => s.subjectId === "mathematics")?.bestPct?.["knowledge-check"] === 50,
    JSON.stringify(parentChild?.subjects?.find((s) => s.subjectId === "mathematics"))
  );
  check(
    "the ordered lab rows the UI resolves to lesson names are present",
    JSON.stringify(parentChild?.subjects?.find((s) => s.subjectId === "mathematics")?.labs?.lessons?.map((l) => l.lessonId)) === JSON.stringify(["m1"]),
    JSON.stringify(parentChild?.subjects?.find((s) => s.subjectId === "mathematics")?.labs)
  );
  check("the same warnings reach both dashboards", typeof asParent.body.warnings?.length === "number" && asParent.body.warnings.length === asTeacher.body.warnings.length, JSON.stringify(asParent.body.warnings));
}

// ===========================================================================
section("8. scope=parent: the owner's window, and a link that is missing");

{
  seedFamilies();

  state.user = { id: "owner-1", email: OWNER };
  let res = await call(summaryHandler, summaryReq({ scope: "parent" }));
  check("the owner sees every family when none is named (200)", res.statusCode === 200, `${res.statusCode}`);
  check("with all three linked children", res.body.roster.length === 3, JSON.stringify(res.body.roster.map((r) => r.email)));
  check("and the response says so", res.body.parent === "all", res.body.parent);

  res = await call(summaryHandler, summaryReq({ scope: "parent", parent: PARENT_B.toUpperCase() }));
  check("the owner can open one family", res.statusCode === 200 && res.body.roster.length === 1, `${res.statusCode}/${JSON.stringify(res.body.roster)}`);
  check("scoped to that family only", res.body.roster[0].email === CHILD_B2, JSON.stringify(res.body.roster));

  res = await call(summaryHandler, summaryReq({ scope: "parent", parent: "nobody@example.com" }));
  check("an unknown family is an empty dashboard, not an error", res.statusCode === 200 && res.body.roster.length === 0, `${res.statusCode}`);

  // A parent cannot open a teacher's class through the parent scope, and a
  // parent's scope is never widened by their own query string.
  state.user = { id: "u-parent-a", email: PARENT_A };
  res = await call(summaryHandler, summaryReq({ scope: "parent", parent: PARENT_B }));
  check("a parent cannot name someone else's family to widen their scope", res.body.roster.every((r) => r.parentEmail === PARENT_A), JSON.stringify(res.body.roster));

  // Fail closed when the table itself is missing.
  state.selectErrors.parent_students = { message: 'relation "public.parent_students" does not exist' };
  res = await call(summaryHandler, summaryReq({ scope: "parent" }));
  check("a missing parent_students table fails closed (500)", res.statusCode === 500, `${res.statusCode}`);
  check("and names the schema fix", /schema\.sql/.test(res.body.error || ""), res.body.error);
  check("with no family data in the failure", res.body.students === undefined && res.body.roster === undefined);
  state.selectErrors.parent_students = null;

  // The teaching scope is unchanged by any of this.
  state.user = { id: "parent-token", email: PARENT_A };
  res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check("a parent still cannot open the teacher dashboard (403)", res.statusCode === 403, `${res.statusCode}`);
}

// ===========================================================================
section("9. schema: parent_students exists, is unique, and is client-proof");

{
  const schema = read("supabase/schema.sql");
  check("schema creates parent_students", /create table if not exists public\.parent_students/.test(schema));
  check("both sides are required emails", /parent_email text not null/.test(schema) && /student_email text not null/.test(schema));
  check("the (parent, child) pair is unique", /parent_students_pair_uniq[\s\S]{0,80}parent_email, student_email/.test(schema));
  check("the parent's own links are indexed", /parent_students_parent_idx[\s\S]{0,80}parent_email/.test(schema));
  check("parent_students has row level security on", /alter table public\.parent_students enable row level security/.test(schema));
  check("and a deny-all policy for direct client access", /create policy "parent_students: no direct client access"[\s\S]{0,120}using \(false\)[\s\S]{0,60}with check \(false\)/.test(schema));
  check("the schema stays re-runnable (drop before create)", /drop policy if exists "parent_students: no direct client access"/.test(schema));
  // The school tables and the teacher links are untouched by this build.
  check("teacher_students is still declared", /create table if not exists public\.teacher_students/.test(schema));
  check("the school tables are still declared", /create table if not exists public\.schools/.test(schema));
}

// ===========================================================================
section("10. wiring: routes, pages, pricing field");

{
  const app = read("src/App.jsx");
  const parentPage = read("src/pages/ParentPage.jsx");
  const teacherPage = read("src/pages/TeacherPage.jsx");
  const sharedView = read("src/components/StudentProgressDashboard.jsx");
  const accountPage = read("src/pages/AccountPage.jsx");
  const pricingPage = read("src/pages/PricingPage.jsx");
  const checkoutApi = read("api/checkout/create-session.js");
  const webhookApi = read("api/stripe/webhook.js");
  const summaryApi = read("api/analytics/summary.js");

  check("the /parent route is registered", /import ParentPage/.test(app) && /path="\/parent"/.test(app));
  check("the /teacher route is untouched", /import TeacherPage/.test(app) && /path="\/teacher"/.test(app));

  check("the account page links to the parent dashboard", /to="\/parent"/.test(accountPage));
  check("and labels it for a parent", /Parent dashboard/.test(accountPage));

  check("the parent page reads the parent scope endpoint", /scope=parent/.test(parentPage));
  check("the parent page renders the shared progress view", /StudentProgressDashboard/.test(parentPage));
  check("the parent page is titled for a parent", /<h1>Parent dashboard<\/h1>/.test(parentPage));
  check("the teacher page renders the same shared view", /import StudentProgressDashboard/.test(teacherPage));
  check(
  "there is no self-service parent linking — a link comes only from a purchase",
  !/parent-self-link|parent-self-links|parent-self-unlink/.test(parentPage) && !/parent-self/.test(summaryApi)
);
  check("the empty state is worded for a parent", /No children linked yet|no children linked yet/.test(parentPage));

  check("the shared view is a component both dashboards import", /export default function StudentProgressDashboard/.test(sharedView));
  check("the shared view takes its wording from the page", /Filter by \$\{personNoun\} email/.test(sharedView));
  check("the shared view never fetches — the page owns the one request", !/fetch\(/.test(sharedView));

  check("the pricing page asks for the child's email", /Your child/.test(pricingPage) && /childEmail/.test(pricingPage));
  check("and only for the subject and bundle plans", /planId === "subject" \|\| planId === "bundle"/.test(pricingPage));
  check("the child rides along in the checkout body", /childEmail: child \|\| null/.test(pricingPage));
  check("the field is rendered in its own block above the plans it applies to", /pricing-child/.test(pricingPage));
  check("the checkout carries the child in its metadata", /childEmail/.test(checkoutApi) && /child_email: child/.test(checkoutApi));
  check("the checkout only accepts a child for subject/bundle", /priceType === "subject" \|\| priceType === "bundle"/.test(checkoutApi));

  check("the webhook writes the link", /linkParentToChild/.test(webhookApi) && /from\("parent_students"\)/.test(webhookApi));
  check("the parent is resolved from the buying account, not the metadata", /getUserById\(userId\)/.test(webhookApi));
  check("the write is idempotent on the unique pair", /onConflict: "parent_email,student_email"/.test(webhookApi) && /ignoreDuplicates: true/.test(webhookApi));
  check("the webhook says out loud that linking fails open", /Fails open/i.test(webhookApi) || /FAILS OPEN/i.test(webhookApi));
  check("a school licence is excluded from parent linking", /!isSchoolLicense/.test(webhookApi));

  check("the summary API has a parent scope", /req\.query\.scope === "parent"/.test(summaryApi));
  check("both scopes share one aggregation", /buildStudentSummaries/.test(summaryApi));
  check("each scope keeps its own vocabulary over the same shape", /rosterKey: "parentEmail"/.test(summaryApi) && /rosterKey: "teacherEmail"/.test(summaryApi));
  check("the parent scope has its own explicit 403", /Forbidden: this dashboard is for a parent/.test(summaryApi));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
