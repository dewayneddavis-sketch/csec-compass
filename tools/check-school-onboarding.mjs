// Verification harness: school self-service onboarding.
//   node tools/check-school-onboarding.mjs
//
// A school licence used to need the platform owner twice: once to create the
// school and name its admin, then again for every seat. Owner direction
// 2026-09-20 is that the school names ITSELF and its OWN admin at purchase:
//
//   1. src/pages/PricingPage.jsx asks for the school name and the email of the
//      person who will run its console, and will not start a school-tier
//      checkout without them.
//   2. api/checkout/create-session.js validates both and carries them in the
//      Stripe checkout metadata (school_name, admin_email).
//   3. api/stripe/webhook.js provisions public.schools / school_admins /
//      school_members from that metadata — idempotently, because Stripe
//      re-delivers events — and never lets a provisioning problem cost the
//      buyer the licence they paid for.
//   4. The owner keeps the global view: api/admin/grant-access.js
//      { action: "school-list" } lists every school, self-provisioned ones
//      included, with its admin, roster and licence — and stays the correction
//      path.
//   5. Access is UNCHANGED: which school a console sees still comes only from
//      the caller's own school_admins row, never from the request body.
//
// Everything below drives the real handlers offline against the fake Supabase
// and Stripe doubles (tools/school-loader.mjs).

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
const adminHandler = (await import("../api/admin/grant-access.js")).default;

async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}

const authHeader = { authorization: "Bearer owner-token" };

function checkoutReq(body) {
  return { method: "POST", headers: { "content-type": "application/json" }, body };
}

function webhookReq(event, { signature = "t=1,v1=test" } = {}) {
  const raw = Buffer.from(JSON.stringify(event));
  return {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    async *[Symbol.asyncIterator]() {
      yield raw;
    },
  };
}

// The event Stripe would send for a checkout the real handler just created —
// fed from the recorded metadata rather than hand-written, so a key the code
// stops emitting fails the harness instead of the live webhook.
function eventFromCheckout(metadata, { id = "cs_school_1", userId = "buyer-1" } = {}) {
  return { type: "checkout.session.completed", data: { object: { id, metadata, client_reference_id: userId } } };
}

const ADMIN_A = "principal@wolmers.edu.jm";
const ADMIN_B = "head@otherhigh.edu.jm";
const SCHOOL_ONE = "Wolmer's Boys' School";
const SCHOOL_TWO = "Other High School";

function seedTwoSchools() {
  setTable("schools", [
    { id: "school-1", name: SCHOOL_ONE, created_at: "2026-09-01T00:00:00Z" },
    { id: "school-2", name: SCHOOL_TWO, created_at: "2026-09-02T00:00:00Z" },
  ]);
  setTable("school_admins", [
    { id: "sa-1", school_id: "school-1", email: ADMIN_A },
    { id: "sa-2", school_id: "school-2", email: ADMIN_B },
  ]);
  setTable("school_members", [
    { id: "m1", school_id: "school-1", email: ADMIN_A, role: "teacher" },
    { id: "m2", school_id: "school-1", email: "ana@wolmers.edu.jm", role: "student" },
    { id: "m3", school_id: "school-2", email: ADMIN_B, role: "teacher" },
    { id: "m4", school_id: "school-2", email: "ben@otherhigh.edu.jm", role: "student" },
  ]);
  setTable("teacher_students", [
    { id: "l1", teacher_email: ADMIN_A, student_email: "ana@wolmers.edu.jm", school_id: "school-1" },
    { id: "l2", teacher_email: ADMIN_B, student_email: "ben@otherhigh.edu.jm", school_id: "school-2" },
  ]);
}

function seedEmptyDb() {
  reset();
  stripeStub.reset();
  state.user = { id: "owner-1", email: OWNER };
  setTable("schools", []);
  setTable("school_admins", []);
  setTable("school_members", []);
  setTable("teacher_students", []);
  setTable("purchases", []);
}

const schools = () => rows("schools");
const schoolAdmins = () => rows("school_admins");
const schoolMembers = () => rows("school_members");
const purchases = () => rows("purchases");

// ===========================================================================
section("1. checkout: a school licence must name the school and its admin");

{
  seedEmptyDb();
  const base = {
    priceType: "school-license-150",
    userId: "buyer-1",
    successUrl: "https://csec-compass.test/account",
    cancelUrl: "https://csec-compass.test/pricing",
  };

  let res = await call(checkoutHandler, checkoutReq({ ...base }));
  check("a school tier with no school name is refused (400)", res.statusCode === 400, `${res.statusCode}`);
  check("and says what is missing", /school's name/i.test(res.body.error || ""), res.body.error);
  check("and never reaches Stripe", stripeState.checkoutSessions.length === 0, `${stripeState.checkoutSessions.length}`);

  res = await call(checkoutHandler, checkoutReq({ ...base, schoolName: SCHOOL_ONE }));
  check("a school tier with no admin email is refused (400)", res.statusCode === 400, `${res.statusCode}`);
  check("and says who it is asking for", /run your school's account/i.test(res.body.error || ""), res.body.error);

  res = await call(checkoutHandler, checkoutReq({ ...base, schoolName: SCHOOL_ONE, adminEmail: "principal@" }));
  check("a malformed admin email is refused (400)", res.statusCode === 400, `${res.statusCode}`);

  res = await call(checkoutHandler, checkoutReq({ ...base, schoolName: "x".repeat(121), adminEmail: ADMIN_A }));
  check("an over-long school name is refused (400)", res.statusCode === 400 && /too long/i.test(res.body.error || ""), `${res.statusCode}/${res.body.error}`);

  res = await call(checkoutHandler, checkoutReq({ ...base, schoolName: "   ", adminEmail: ADMIN_A }));
  check("a whitespace-only school name is refused (400)", res.statusCode === 400, `${res.statusCode}`);
  check("nothing was sent to Stripe through any of it", stripeState.checkoutSessions.length === 0);
}

// ===========================================================================
section("2. checkout: the school and its admin travel with the payment");

let schoolTierSession = null;
{
  seedEmptyDb();
  const res = await call(
    checkoutHandler,
    checkoutReq({
      priceType: "school-license-50",
      userId: "buyer-1",
      schoolName: "  Wolmer's   Boys'  School ",
      adminEmail: "  PRINCIPAL@Wolmers.edu.JM  ",
    })
  );
  schoolTierSession = stripeState.checkoutSessions.at(-1);
  check("a complete school checkout is created (200 + url)", res.statusCode === 200 && !!res.body.url, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("the session names the tier", schoolTierSession?.metadata.price_type === "school-license-50");
  check("and its seats, so the webhook row is self-describing", schoolTierSession?.metadata.seats === "50");
  check("and carries the school's name, tidied", schoolTierSession?.metadata.school_name === "Wolmer's Boys' School", JSON.stringify(schoolTierSession?.metadata));
  check("and the admin's email, lowercased", schoolTierSession?.metadata.admin_email === "principal@wolmers.edu.jm", JSON.stringify(schoolTierSession?.metadata));

  // A subject or bundle purchase must keep working exactly as before, whatever
  // else is in the body.
  const subjectRes = await call(
    checkoutHandler,
    checkoutReq({
      priceType: "subject",
      subjectId: "mathematics",
      userId: "buyer-1",
      schoolName: SCHOOL_ONE,
      adminEmail: ADMIN_A,
    })
  );
  const subjectSession = stripeState.checkoutSessions.at(-1);
  check("a subject purchase still works (200)", subjectRes.statusCode === 200, `${subjectRes.statusCode}`);
  check("and carries no school", subjectSession.metadata.school_name === "" && subjectSession.metadata.admin_email === "", JSON.stringify(subjectSession.metadata));

  const bundleRes = await call(checkoutHandler, checkoutReq({ priceType: "bundle", userId: "buyer-1" }));
  const bundleSession = stripeState.checkoutSessions.at(-1);
  check("a bundle purchase still works (200)", bundleRes.statusCode === 200, `${bundleRes.statusCode}`);
  check("and carries no school either", bundleSession.metadata.school_name === "" && bundleSession.metadata.seats === "");
}

// ===========================================================================
section("3. webhook: the payment provisions the school, its admin and its roster");

{
  seedEmptyDb();
  stripeState.event = eventFromCheckout(schoolTierSession.metadata, { id: "cs_selfserve_1", userId: "buyer-1" });
  const res = await call(webhookHandler, webhookReq(stripeState.event));

  check("the webhook accepts the event (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("and reports the school it provisioned", res.body.school?.status === "provisioned", JSON.stringify(res.body.school));
  check("the licence is still recorded for the buyer", purchases().some((p) => p.purchase_type === "school-license-50" && p.user_id === "buyer-1"), JSON.stringify(purchases()));

  check("exactly one school exists", schools().length === 1, JSON.stringify(schools()));
  const school = schools()[0];
  check("named what the buyer typed", school.name === "Wolmer's Boys' School", school.name);
  check("with the licence tier the owner needs to reconcile", school.license_tier === "school-license-50", JSON.stringify(school));
  check("and its seat count", school.seats === 50, JSON.stringify(school));

  check("the admin is created for that school", schoolAdmins().length === 1 && schoolAdmins()[0].school_id === school.id && schoolAdmins()[0].email === "principal@wolmers.edu.jm", JSON.stringify(schoolAdmins()));
  check("and is on the roster as a teacher, so the console reads work", schoolMembers().length === 1 && schoolMembers()[0].role === "teacher" && schoolMembers()[0].school_id === school.id, JSON.stringify(schoolMembers()));
  check("the response names the admin", res.body.school?.adminEmail === "principal@wolmers.edu.jm", JSON.stringify(res.body.school));
}

// ===========================================================================
section("4. webhook: a re-delivered event changes nothing (Stripe is at-least-once)");

{
  const before = {
    schools: schools().length,
    admins: schoolAdmins().length,
    members: schoolMembers().length,
    purchases: purchases().length,
  };
  const res = await call(webhookHandler, webhookReq(stripeState.event));
  check("the re-delivery is recognised as already granted", res.statusCode === 200 && res.body.alreadyGranted === true, JSON.stringify(res.body));
  check("no second school", schools().length === before.schools, `${schools().length}`);
  check("no second admin row", schoolAdmins().length === before.admins, `${schoolAdmins().length}`);
  check("no duplicate roster row", schoolMembers().length === before.members, `${schoolMembers().length}`);
  check("no duplicate purchase", purchases().length === before.purchases, `${purchases().length}`);
  check("it still reports the school (so a failed first attempt can be finished)", res.body.school?.status === "provisioned", JSON.stringify(res.body.school));
}

// ===========================================================================
section("5. webhook: a second licence from the same school joins the school that exists");

{
  const schoolId = schools()[0].id;
  // Same school, spelled differently, bought on another account, with the
  // school's other admin as the console owner.
  const session = await call(
    checkoutHandler,
    checkoutReq({
      priceType: "school-license-150",
      userId: "buyer-2",
      schoolName: "  wolmer's boys' school",
      adminEmail: "vice.principal@wolmers.edu.jm",
    })
  );
  check("the second checkout is created", session.statusCode === 200, `${session.statusCode}`);

  stripeState.event = eventFromCheckout(stripeState.checkoutSessions.at(-1).metadata, { id: "cs_selfserve_2", userId: "buyer-2" });
  const res = await call(webhookHandler, webhookReq(stripeState.event));

  check("the second licence is granted", res.statusCode === 200 && purchases().some((p) => p.user_id === "buyer-2" && p.purchase_type === "school-license-150"), `${res.statusCode}`);
  check("still exactly one school — the name is the identity", schools().length === 1, JSON.stringify(schools()));
  check("and it is the same school row", schools()[0].id === schoolId, `${schools()[0].id} vs ${schoolId}`);
  check("named as the first licence spelled it", schools()[0].name === "Wolmer's Boys' School", schools()[0].name);
  check("the bigger licence is what the owner's card shows", schools()[0].license_tier === "school-license-150" && schools()[0].seats === 150, JSON.stringify(schools()[0]));
  check("the second admin is attached to that same school", schoolAdmins().some((a) => a.school_id === schoolId && a.email === "vice.principal@wolmers.edu.jm"), JSON.stringify(schoolAdmins()));
  check("as is their roster row", schoolMembers().some((m) => m.school_id === schoolId && m.email === "vice.principal@wolmers.edu.jm" && m.role === "teacher"));

  // A smaller licence afterwards must not shrink the record of what the school holds.
  const small = await call(
    checkoutHandler,
    checkoutReq({ priceType: "school-license-50", userId: "buyer-3", schoolName: SCHOOL_ONE, adminEmail: "bursar@wolmers.edu.jm" })
  );
  check("the smaller licence's checkout is created", small.statusCode === 200, `${small.statusCode}`);
  stripeState.event = eventFromCheckout(stripeState.checkoutSessions.at(-1).metadata, { id: "cs_selfserve_3", userId: "buyer-3" });
  await call(webhookHandler, webhookReq(stripeState.event));
  check("a later, smaller licence does not downgrade the record", schools()[0].license_tier === "school-license-150" && schools()[0].seats === 150, JSON.stringify(schools()[0]));
  check("each sale is still its own purchase row", purchases().filter((p) => p.purchase_type.startsWith("school-license")).length === 3, JSON.stringify(purchases().map((p) => p.purchase_type)));
  check("the third admin is attached too", schoolAdmins().some((a) => a.email === "bursar@wolmers.edu.jm"), JSON.stringify(schoolAdmins()));
}

// ===========================================================================
section("6. webhook: an admin who already runs another school is never moved");

{
  const schoolCount = schools().length;
  const otherSchoolId = schools()[0].id;
  const session = await call(
    checkoutHandler,
    checkoutReq({ priceType: "school-license-100", userId: "buyer-4", schoolName: "New High School", adminEmail: ADMIN_A })
  );
  check("the checkout is created", session.statusCode === 200, `${session.statusCode}`);

  stripeState.event = eventFromCheckout(stripeState.checkoutSessions.at(-1).metadata, { id: "cs_selfserve_4", userId: "buyer-4" });
  const res = await call(webhookHandler, webhookReq(stripeState.event));

  check("the buyer still gets what they paid for", res.statusCode === 200 && purchases().some((p) => p.user_id === "buyer-4" && p.purchase_type === "school-license-100"), `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("the school they named is recorded", schools().length === schoolCount + 1 && schools().some((s) => s.name === "New High School"), JSON.stringify(schools().map((s) => s.name)));
  check("but the outcome is reported as an admin conflict", res.body.school?.status === "admin-conflict", JSON.stringify(res.body.school));
  const newSchool = schools().find((s) => s.name === "New High School");
  check("the new school has no admin of its own", !schoolAdmins().some((a) => a.school_id === newSchool.id), JSON.stringify(schoolAdmins()));
  check("nobody was moved out of the school they already run", schoolAdmins().filter((a) => a.email === ADMIN_A).length === 1 && schoolAdmins().find((a) => a.email === ADMIN_A).school_id === otherSchoolId, JSON.stringify(schoolAdmins()));
  check("and the newcomer was not put on the other school's roster", !schoolMembers().some((m) => m.school_id === newSchool.id && m.email === ADMIN_A), JSON.stringify(schoolMembers()));
}

// ===========================================================================
section("7. webhook: a school-tier payment with no school on it is still granted");

{
  seedEmptyDb();
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_owner_issued", metadata: { price_type: "school-license-50", seats: "50", school_name: "", admin_email: "" }, client_reference_id: "buyer-9" } },
  };
  const res = await call(webhookHandler, webhookReq(stripeState.event));
  check("the licence is granted (200)", res.statusCode === 200 && purchases().some((p) => p.user_id === "buyer-9"), `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("with nothing provisioned", res.body.school?.status === "skipped", JSON.stringify(res.body.school));
  check("and no school invented", schools().length === 0, JSON.stringify(schools()));
}

// ===========================================================================
section("8. webhook: a database without the licence columns still provisions");

{
  seedEmptyDb();
  const unknownRead = { code: "42703", message: "column schools.license_tier does not exist" };
  const unknownWrite = { code: "PGRST204", message: "Could not find the 'license_tier' column of 'schools' in the schema cache" };
  state.selectErrors.schools = (ctx) => (/license_tier/.test(ctx.projection || "") ? unknownRead : null);
  state.writeErrors.schools = (ctx) => ((ctx.rows || []).some((r) => "license_tier" in r || "seats" in r) ? unknownWrite : null);

  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_old_schema",
        metadata: { price_type: "school-license-100", seats: "100", school_name: "Old Schema High", admin_email: "head@oldschema.edu.jm" },
        client_reference_id: "buyer-5",
      },
    },
  };
  const res = await call(webhookHandler, webhookReq(stripeState.event));

  check("the customer is not punished for an un-applied schema (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("the licence is recorded", purchases().some((p) => p.user_id === "buyer-5"));
  check("the school is still provisioned", schools().length === 1 && schools()[0].name === "Old Schema High", JSON.stringify(schools()));
  check("just without licence details it cannot store", schools()[0].license_tier === undefined, JSON.stringify(schools()[0]));
  check("the admin and roster are created regardless", schoolAdmins().length === 1 && schoolMembers().length === 1, `${schoolAdmins().length}/${schoolMembers().length}`);
  check("and the write was retried without the missing column", state.upserts.filter((u) => u.table === "schools").length === 2, JSON.stringify(state.upserts.filter((u) => u.table === "schools").map((u) => u.rows)));

  // The owner's oversight view must survive the same database.
  state.user = { id: "owner-1", email: OWNER };
  const list = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-list" } });
  check("the owner can still list every school (200)", list.statusCode === 200, `${list.statusCode} ${JSON.stringify(list.body)}`);
  check("with the self-provisioned school on it", (list.body.schools || []).some((s) => s.name === "Old Schema High"), JSON.stringify(list.body.schools));
  check("and its admin visible", (list.body.schools || []).some((s) => (s.admins || []).includes("head@oldschema.edu.jm")), JSON.stringify(list.body.schools));
  check("the licence reads as unknown rather than wrong", (list.body.schools || []).every((s) => s.licenseTier === null && s.seats === null), JSON.stringify(list.body.schools));

  state.selectErrors.schools = null;
  state.writeErrors.schools = null;
}

// ===========================================================================
section("9. owner oversight: every school, self-provisioned ones included");

{
  seedEmptyDb();
  // A school that bought its own licence...
  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_selfserve_list",
        metadata: { price_type: "school-license-150", seats: "150", school_name: "Self Service High", admin_email: "head@selfservice.edu.jm" },
        client_reference_id: "buyer-6",
      },
    },
  };
  await call(webhookHandler, webhookReq(stripeState.event));

  state.user = { id: "owner-1", email: OWNER };
  // ...and one the owner creates by hand, as the fallback/correction path.
  let res = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "school-create", name: "Hand Made High", adminEmail: "head@handmade.edu.jm" },
  });
  check("the owner can still create a school by hand (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);

  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-list" } });
  check("the list holds both schools", res.statusCode === 200 && res.body.count === 2, `${res.statusCode}/${res.body.count}`);
  const selfServed = (res.body.schools || []).find((s) => s.name === "Self Service High");
  const handmade = (res.body.schools || []).find((s) => s.name === "Hand Made High");
  check("the self-provisioned school is listed", !!selfServed, JSON.stringify(res.body.schools));
  check("with its admin email", JSON.stringify(selfServed?.admins) === JSON.stringify(["head@selfservice.edu.jm"]), JSON.stringify(selfServed?.admins));
  check("and the licence it bought", selfServed?.licenseTier === "school-license-150" && selfServed?.seats === 150, JSON.stringify(selfServed));
  check("its own member counts", selfServed?.teachers.length === 1 && selfServed?.students.length === 0, JSON.stringify(selfServed));
  check("the hand-made school shows its admin", JSON.stringify(handmade?.admins) === JSON.stringify(["head@handmade.edu.jm"]), JSON.stringify(handmade?.admins));
  check("and an unknown licence, not a made-up one", handmade?.licenseTier === null && handmade?.seats === null, JSON.stringify(handmade));
}

// ===========================================================================
section("10. access is unchanged: the console comes only from the caller's own row");

{
  seedTwoSchools();
  // A signed-in account that administers nothing.
  state.user = { id: "nobody-1", email: "nobody@example.com" };
  let res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster", schoolId: "school-1" } });
  check("a caller with no school_admins row gets 403", res.statusCode === 403, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("and no roster at all", !res.body.teachers && !res.body.students && !/ana@wolmers/.test(JSON.stringify(res.body)), JSON.stringify(res.body));

  // ...and one that administers school-2, asking for school-1 by id.
  state.user = { id: "admin-b", email: ADMIN_B };
  res = await call(adminHandler, { method: "POST", headers: authHeader, body: { action: "school-roster", schoolId: "school-1" } });
  check("a school admin's own row decides the school (200)", res.statusCode === 200, `${res.statusCode}`);
  check("the body's schoolId is ignored", res.body.school?.id === "school-2" && res.body.school?.name === SCHOOL_TWO, JSON.stringify(res.body.school));
  check("so they see their own roster, not the other school's", res.body.students.join(",") === "ben@otherhigh.edu.jm", JSON.stringify(res.body.students));
  check("and never the other school's", !/ana@wolmers/.test(JSON.stringify(res.body)));
}

// ===========================================================================
section("11. wiring: the pricing page asks, and the pieces agree");

{
  const pricing = read("src/pages/PricingPage.jsx");
  check("the pricing page collects the school's name", /School name/.test(pricing));
  check("and asks who should run its account, in plain words", /Who should run this school/.test(pricing));
  check("it will not start a school checkout without the name", /Enter your school's name/.test(pricing));
  check("nor without a usable admin email", /EMAIL_RE\.test\(admin\)/.test(pricing));
  check("and both are sent to the checkout endpoint", /schoolName: school \? school\.name : null/.test(pricing) && /adminEmail: school \? school\.adminEmail : null/.test(pricing));
  check("the fields are only asked for a school tier", /SCHOOL_LICENSES\.some\(\(tier\) => tier\.priceType === planId\)/.test(pricing));

  const webhook = read("api/stripe/webhook.js");
  check("the webhook reads exactly the keys the checkout writes", /session\.metadata\?\.school_name/.test(webhook) && /session\.metadata\?\.admin_email/.test(webhook));
  check("provisioning failures cannot cost the buyer the licence", /school provisioning threw \(the licence is still granted\)/.test(webhook));
  check("and it never hijacks another school's admin", /status: "admin-conflict"/.test(webhook));

  const schema = read("supabase/schema.sql");
  check("the schema declares the licence columns", /alter table public\.schools add column if not exists license_tier text;/.test(schema) && /add column if not exists seats integer;/.test(schema));
  check("idempotently, so it can be applied to the live database", (schema.match(/alter table public\.schools add column if not exists/g) || []).length === 2);

  const card = read("src/components/SchoolAdminCard.jsx");
  check("the owner's card shows the licence", /licenseLabel\(school\.licenseTier\)/.test(card));
  check("and says it is the oversight view, not the gatekeeper", /sets itself up when it buys a licence/.test(card));
}

console.log(`\ncheck-school-onboarding: ${passed}/${passed + failed} green${failed ? ` (${failed} FAILED)` : ""}`);
process.exit(failed ? 1 : 0);
