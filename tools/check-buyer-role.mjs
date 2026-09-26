// Verification harness: the "I am a…" checkout role selector (owner addition
// 2026-09-26).
//   node tools/check-buyer-role.mjs
//
// The owner's ask: a person buying a SINGLE SUBJECT or the BUNDLE says who they
// are (Teacher / Student / Parent) before paying; the answer rides in the
// checkout metadata; the webhook records it on the grant; and a paying
// purchaser who said "Teacher" can then link students — the teacher may buy
// independently of the school admin and pull a class. A school licence must not
// ask (there the school is the buyer).
//
// What this harness proves, driving the REAL handlers against the fake Supabase
// and Stripe doubles (tools/school-loader.mjs):
//   1. the role list exists in ONE place and the api/ mirrors equal it;
//   2. the dropdown is on the subject and bundle cards, not on the school tiers,
//      and the buyer cannot pay without answering;
//   3. create-session validates the answer and carries it as buyer_role;
//   4. the webhook records it on the grant row (and survives a table that
//      predates the column without costing the buyer their access);
//   5. the teacher gate and ?scope=class accept a paying Teacher and fail
//      closed for everyone else — student role, no row, or a lookup error.
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
// No allowlist: a paying teacher must qualify on the PURCHASE alone, and a
// non-teacher must never qualify through it.
process.env.TEACHER_EMAIL = "";
process.env.TEACHER_EMAILS = "";
const stub = await import("./teacher-stub.mjs");
const { state, reset, setTable, rows } = stub;
const stripeStub = await import("./stripe-stub.mjs");
const stripeState = stripeStub.state;
const read = (p) => readFileSync(join(root, p), "utf8");
let passed = 0;
let failed = 0;
let quiet = false;
function check(name, cond, detail) {
  if (cond) {
    passed += 1;
    if (!quiet) console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    if (!quiet) console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title) {
  console.log(`\n== ${title}`);
}
// Wiring self-test: prove the counters move both ways before trusting a green run.
{
  const p0 = passed;
  const f0 = failed;
  quiet = true;
  check("probe-false", false);
  check("probe-true", true);
  quiet = false;
  const wired = failed === f0 + 1 && passed === p0 + 1;
  passed = 0;
  failed = 0;
  check("wiring: a false condition counts as a failure and a true one as a pass", wired);
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
const summaryHandler = (await import("../api/analytics/summary.js")).default;
const roles = await import("../src/data/buyerRoles.js");

async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}
const authHeader = { authorization: "Bearer role-token" };
const checkoutReq = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });
function webhookReq(event) {
  // The stripe double answers constructEvent() with whatever event the harness
  // staged, and records the signature it was handed.
  stripeState.event = event;
  const raw = Buffer.from(JSON.stringify(event));
  return {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=test" },
    async *[Symbol.asyncIterator]() {
      yield raw;
    },
  };
}
function eventFromCheckout(metadata, { id = "cs_role_1", userId = "buyer-1" } = {}) {
  return { type: "checkout.session.completed", data: { object: { id, metadata, client_reference_id: userId } } };
}
const purchases = () => rows("purchases");

const BUYER = "teacher.buyer@example.com";
function seed({ purchasesRows = [] } = {}) {
  reset();
  stripeStub.reset();
  state.user = { id: "u-buyer", email: BUYER };
  state.users = [{ id: "u-buyer", email: BUYER }];
  setTable("purchases", purchasesRows);
  setTable("teacher_students", []);
  setTable("school_members", []);
  setTable("parent_students", []);
  setTable("quiz_results", []);
  setTable("user_progress", []);
  setTable("lab_activity", []);
}
// The buyer's own top-level checkout: exactly what the real form posts.
const CHECKOUT_BASE = {
  userId: "buyer-1",
  successUrl: "https://csec-compass.test/account",
  cancelUrl: "https://csec-compass.test/pricing",
};

// ===========================================================================
section("1. the three roles live in ONE place, and the api/ mirrors agree");

check(
  "src/data/buyerRoles.js lists exactly teacher/student/parent",
  JSON.stringify(roles.BUYER_ROLE_IDS) === JSON.stringify(["teacher", "student", "parent"]),
  JSON.stringify(roles.BUYER_ROLE_IDS)
);
check(
  "every role has a dropdown label",
  roles.BUYER_ROLE_IDS.every((id) => typeof roles.BUYER_ROLE_LABELS[id] === "string" && roles.BUYER_ROLE_LABELS[id].length > 2),
  JSON.stringify(roles.BUYER_ROLE_LABELS)
);
check("the dropdown asks its question", roles.BUYER_ROLE_QUESTION.includes("I am"), roles.BUYER_ROLE_QUESTION);
check(
  "an unanswered purchase has something to say about it",
  roles.BUYER_ROLE_REQUIRED_MESSAGE.length > 20 && /teacher/i.test(roles.BUYER_ROLE_REQUIRED_MESSAGE)
);
check("cleanBuyerRole accepts a role, whatever its case/spacing", roles.cleanBuyerRole(" Teacher ") === "teacher");
check("cleanBuyerRole refuses anything else", roles.cleanBuyerRole("principal") === "" && roles.cleanBuyerRole(null) === "");

// The mirrors: every api/*.js file is self-contained, so the list is repeated
// there on purpose — and asserted equal here so a 4th role cannot be added in
// one place only.
const checkoutSrc = read("api/checkout/create-session.js");
const webhookSrc = read("api/stripe/webhook.js");
const mirrorOf = (src, file) => {
  const m = src.match(/const BUYER_ROLE_IDS = (\[[^\]]*\]);/);
  return m ? JSON.parse(m[1]) : `no BUYER_ROLE_IDS in ${file}`;
};
check(
  "create-session mirrors the role list exactly",
  JSON.stringify(mirrorOf(checkoutSrc, "create-session")) === JSON.stringify(roles.BUYER_ROLE_IDS),
  String(mirrorOf(checkoutSrc, "create-session"))
);
check(
  "the webhook mirrors the role list exactly",
  JSON.stringify(mirrorOf(webhookSrc, "webhook")) === JSON.stringify(roles.BUYER_ROLE_IDS),
  String(mirrorOf(webhookSrc, "webhook"))
);
check(
  "…and says in both places that it is a mirror",
  /MIRROR of src\/data\/buyerRoles\.js/.test(checkoutSrc) && /MIRROR of src\/data\/buyerRoles\.js/.test(webhookSrc)
);

// ===========================================================================
section("2. the dropdown is on the two personal plans, and only there");

const pricingSrc = read("src/pages/PricingPage.jsx");
check("the page reads the roles from the data module", /from "\.\.\/data\/buyerRoles"/.test(pricingSrc));
check(
  "no role copy is retyped in the page",
  !/I am a/.test(pricingSrc) && !/"teacher"/.test(pricingSrc),
  "the question/labels must come from src/data/buyerRoles.js"
);
check(
  "the role block is gated to the subject and bundle plans",
  /\(plan\.id === "subject" \|\| plan\.id === "bundle"\) && \(\s*<div className="pricing-role">/.test(pricingSrc)
);
check("it renders a real <select>", /<select[\s\S]{0,200}?pricing-role-select/.test(pricingSrc));
check(
  "the options are the three roles, labelled from the data module",
  /BUYER_ROLE_IDS\.map\(\(id\) => \(\s*<option key=\{id\} value=\{id\}>\{BUYER_ROLE_LABELS\[id\]\}<\/option>/.test(pricingSrc)
);
check("the select is labelled (htmlFor on the label)", /htmlFor=\{`buyer-role-\$\{plan\.id\}`\}/.test(pricingSrc));
check("the select has an id to match", /id=\{`buyer-role-\$\{plan\.id\}`\}/.test(pricingSrc));
check(
  "the buyer cannot pay without answering",
  /disabled=\{\s*busy === plan\.id \|\|[\s\S]{0,200}?cleanBuyerRole\(buyerRole\)/.test(pricingSrc)
);
check(
  "handleBuy refuses an unanswered role before it posts",
  /if \(\(planId === "subject" \|\| planId === "bundle"\) && !role\) \{/.test(pricingSrc) &&
    /setMessage\(BUYER_ROLE_REQUIRED_MESSAGE\)/.test(pricingSrc)
);
check("the chosen role is sent to the checkout", /buyerRole: role \|\| null/.test(pricingSrc));
// The school tiers: the school is the buyer, and its admin arranges its own
// teachers — the licence cards must not ask, or the answer would be a lie.
const schoolBlockAt = pricingSrc.indexOf("SCHOOL_LICENSES.map");
const roleBlockAt = pricingSrc.indexOf('className="pricing-role"');
check("the role block sits above the school-licence section, not inside it", roleBlockAt !== -1 && roleBlockAt < schoolBlockAt);
check(
  "no school-licence card renders a role dropdown",
  !/pricing-school-grid[\s\S]*?buyer-role/.test(pricingSrc)
);
check("the role styles are defined", /\.pricing-role\s*\{[^}]{5,}\}/.test(read("src/pages/Pricing.css")));

// ===========================================================================
section("2b. the schema declares the column the gate reads");

const schema = read("supabase/schema.sql");
check("schema.sql adds buyer_role (idempotently, so re-applying is safe)", /alter table public\.purchases add column if not exists buyer_role text;/.test(schema));
check("…and indexes the (user_id, buyer_role) probe the gate makes", /create index if not exists purchases_user_buyer_role_idx\s*\n?\s*on public\.purchases \(user_id, buyer_role\);/.test(schema));
check("…and explains what the value means", /I am a…/.test(schema) && /teacher/.test(schema));
check("the purchases table is still deny-all for clients", /alter table public\.purchases enable row level security;/.test(schema));

// ===========================================================================
section("3. checkout carries the answer in the metadata");

{
  seed();
  let res = await call(checkoutHandler, checkoutReq({ ...CHECKOUT_BASE, priceType: "subject", subjectId: "mathematics", buyerRole: "teacher" }));
  check("a subject purchase with a role is accepted (200)", res.statusCode === 200, `${res.statusCode}`);
  check(
    "the role rides as buyer_role",
    stripeState.checkoutSessions.at(-1).metadata.buyer_role === "teacher",
    JSON.stringify(stripeState.checkoutSessions.at(-1).metadata)
  );
  check("the subject is still named", stripeState.checkoutSessions.at(-1).metadata.subject_id === "mathematics");

  res = await call(checkoutHandler, checkoutReq({ ...CHECKOUT_BASE, priceType: "bundle", buyerRole: "parent" }));
  check("a bundle purchase carries a parent role too", stripeState.checkoutSessions.at(-1).metadata.buyer_role === "parent");

  res = await call(checkoutHandler, checkoutReq({ ...CHECKOUT_BASE, priceType: "subject", subjectId: "mathematics", buyerRole: "  Teacher " }));
  check("case and spacing are normalised", stripeState.checkoutSessions.at(-1).metadata.buyer_role === "teacher");

  const before = stripeState.checkoutSessions.length;
  res = await call(checkoutHandler, checkoutReq({ ...CHECKOUT_BASE, priceType: "subject", subjectId: "mathematics", buyerRole: "principal" }));
  check("an unknown role is refused (400)", res.statusCode === 400, `${res.statusCode}`);
  check("no session is created for it", stripeState.checkoutSessions.length === before);
  check("the 400 names the three roles", /teacher/i.test(res.body.error || "") && /parent/i.test(res.body.error || ""), res.body.error);

  // Backwards compatibility: a purchase that never answers still buys.
  res = await call(checkoutHandler, checkoutReq({ ...CHECKOUT_BASE, priceType: "subject", subjectId: "mathematics" }));
  check("a purchase without a role still works (200)", res.statusCode === 200, `${res.statusCode}`);
  check(
    "…and carries an empty buyer_role (so the webhook can tell 'not answered' from 'key missing')",
    stripeState.checkoutSessions.at(-1).metadata.buyer_role === "",
    JSON.stringify(stripeState.checkoutSessions.at(-1).metadata)
  );

  // A school licence never carries one — the school is the buyer.
  res = await call(
    checkoutHandler,
    checkoutReq({
      ...CHECKOUT_BASE,
      priceType: "school-license-50",
      schoolName: "Wolmer's Boys' School",
      adminEmail: "principal@wolmers.edu.jm",
      buyerRole: "teacher",
    })
  );
  check("a school licence is still bought (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check(
    "…and ignores the role entirely",
    stripeState.checkoutSessions.at(-1).metadata.buyer_role === "",
    JSON.stringify(stripeState.checkoutSessions.at(-1).metadata)
  );
}

// ===========================================================================
section("4. the webhook records the role on the grant");

{
  seed();
  await call(checkoutHandler, checkoutReq({ ...CHECKOUT_BASE, priceType: "subject", subjectId: "mathematics", buyerRole: "teacher" }));
  const subjectMeta = stripeState.checkoutSessions.at(-1).metadata;
  let res = await call(webhookHandler, webhookReq(eventFromCheckout(subjectMeta, { id: "cs_r1", userId: "u-buyer" })));
  check("the subject purchase is granted (200)", res.statusCode === 200, `${res.statusCode}`);
  check(
    "the grant row records the role",
    purchases().some((p) => p.user_id === "u-buyer" && p.purchase_type === "mathematics" && p.buyer_role === "teacher"),
    JSON.stringify(purchases())
  );

  seed();
  await call(checkoutHandler, checkoutReq({ ...CHECKOUT_BASE, priceType: "bundle", buyerRole: "parent" }));
  res = await call(webhookHandler, webhookReq(eventFromCheckout(stripeState.checkoutSessions.at(-1).metadata, { id: "cs_r2", userId: "u-buyer" })));
  check("the bundle purchase is granted (200)", res.statusCode === 200, `${res.statusCode}`);
  check(
    "the bundle grant records the role too",
    purchases().some((p) => p.purchase_type === "bundle" && p.buyer_role === "parent"),
    JSON.stringify(purchases())
  );

  // A role the metadata should never carry is sanitised, never fatal: the money
  // was taken, so the access is granted and the role simply is not recorded.
  seed();
  res = await call(
    webhookHandler,
    webhookReq(eventFromCheckout({ price_type: "subject", subject_id: "mathematics", buyer_role: "principal" }, { id: "cs_r3", userId: "u-buyer" }))
  );
  check("an unexpected role still grants access (200)", res.statusCode === 200, `${res.statusCode}`);
  check("…with no role recorded", purchases().every((p) => !p.buyer_role), JSON.stringify(purchases()));

  // A row written before the column exists / a table that predates it.
  seed();
  state.writeErrors.purchases = (ctx) =>
    ctx.op === "insert" && ctx.rows.some((r) => "buyer_role" in r)
      ? { code: "PGRST204", message: "Could not find the 'buyer_role' column in the schema cache" }
      : null;
  res = await call(
    webhookHandler,
    webhookReq(eventFromCheckout({ price_type: "subject", subject_id: "mathematics", buyer_role: "teacher" }, { id: "cs_r4", userId: "u-buyer" }))
  );
  check(
    "a table without the buyer_role column still grants access (200)",
    res.statusCode === 200,
    `${res.statusCode} ${JSON.stringify(res.body)}`
  );
  check("the grant really was recorded", purchases().some((p) => p.purchase_type === "mathematics"), JSON.stringify(purchases()));
  check(
    "…and the retry dropped the role rather than failing the sale",
    state.inserts.filter((i) => i.table === "purchases").length === 2 &&
      !("buyer_role" in state.inserts.at(-1).rows[0]),
    JSON.stringify(state.inserts.map((i) => i.rows))
  );
  state.writeErrors.purchases = null;
}

// ===========================================================================
section("5. a paying Teacher may link students — and nobody else may");

const selfLinksReq = { method: "POST", headers: authHeader, body: { action: "teacher-self-links" } };
const selfLinkReq = (email) => ({ method: "POST", headers: authHeader, body: { action: "teacher-self-link", email } });

{
  seed({ purchasesRows: [{ id: "p1", user_id: "u-buyer", subject_id: "mathematics", purchase_type: "mathematics", buyer_role: "teacher" }] });
  state.user = { id: "u-buyer", email: BUYER };
  let res = await call(adminHandler, selfLinksReq);
  check("a purchaser who chose Teacher may read their own class list (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  check("…and it is their own, empty list", Array.isArray(res.body.links) && res.body.links.length === 0, JSON.stringify(res.body));
  check("the response names the caller", res.body.teacherEmail === BUYER, res.body.teacherEmail);

  res = await call(adminHandler, selfLinkReq("aaliyah@school.edu"));
  check("…and they can link a student (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`);
  const link = rows("teacher_students")[0];
  check("the link is stamped with the CALLER's email", link && link.teacher_email === BUYER, JSON.stringify(rows("teacher_students")));
  check("…and belongs to no school (they bought on their own)", link && (link.school_id === null || link.school_id === undefined), JSON.stringify(link));
}

{
  // Bought access, but said Student: plain access, no linking.
  seed({ purchasesRows: [{ id: "p1", user_id: "u-buyer", purchase_type: "mathematics", buyer_role: "student" }] });
  state.user = { id: "u-buyer", email: BUYER };
  const res = await call(adminHandler, selfLinksReq);
  check("a purchaser who chose Student gets 403", res.statusCode === 403, `${res.statusCode}`);
  check("…with zero data", res.body.links === undefined);
}

{
  // No grant row at all.
  seed();
  state.user = { id: "u-buyer", email: BUYER };
  const res = await call(adminHandler, selfLinksReq);
  check("an account with no purchase gets 403", res.statusCode === 403, `${res.statusCode}`);
}

{
  // A teacher's role on SOMEBODY ELSE's purchase must not open this account.
  seed({ purchasesRows: [{ id: "p1", user_id: "u-someone-else", purchase_type: "bundle", buyer_role: "teacher" }] });
  state.user = { id: "u-buyer", email: BUYER };
  const res = await call(adminHandler, selfLinksReq);
  check("another account's Teacher purchase grants nothing", res.statusCode === 403, `${res.statusCode}`);
}

{
  // The lookup itself failing must fail CLOSED, never fall through to access.
  seed({ purchasesRows: [{ id: "p1", user_id: "u-buyer", purchase_type: "bundle", buyer_role: "teacher" }] });
  state.user = { id: "u-buyer", email: BUYER };
  state.selectErrors.purchases = { code: "42703", message: 'column "buyer_role" does not exist' };
  const res = await call(adminHandler, selfLinksReq);
  check("a database without the column fails closed (403)", res.statusCode === 403, `${res.statusCode}`);
  state.selectErrors.purchases = null;
}

// ===========================================================================
section("6. the class dashboard accepts the same paying Teacher");

function summaryReq(query, headers = authHeader) {
  return { method: "GET", headers, query };
}

{
  seed({
    purchasesRows: [{ id: "p1", user_id: "u-buyer", purchase_type: "bundle", buyer_role: "teacher" }],
  });
  state.user = { id: "u-buyer", email: BUYER };
  setTable("teacher_students", [{ id: "l1", teacher_email: BUYER, student_email: "aaliyah@school.edu" }]);
  let res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check("?scope=class opens for the paying Teacher (200)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body).slice(0, 120)}`);
  check(
    "…and the dashboard is scoped to their own links",
    JSON.stringify(res.body).includes("aaliyah@school.edu"),
    JSON.stringify(res.body).slice(0, 200)
  );

  seed({ purchasesRows: [{ id: "p1", user_id: "u-buyer", purchase_type: "bundle", buyer_role: "parent" }] });
  state.user = { id: "u-buyer", email: BUYER };
  res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check("a Parent purchase does not open the class dashboard (403)", res.statusCode === 403, `${res.statusCode}`);

  seed();
  state.user = { id: "u-buyer", email: BUYER };
  res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check("no purchase at all: still 403", res.statusCode === 403, `${res.statusCode}`);
  check("the 403 tells them the way in", /teacher/i.test(res.body.error || ""), res.body.error);
}

// ===========================================================================
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
