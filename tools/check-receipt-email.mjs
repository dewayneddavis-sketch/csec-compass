// Verification harness: the buyer's receipt address on the Checkout Session
// (owner decision 2026-10-07 — every purchaser must receive Stripe's automatic
// receipt).
//   node tools/check-receipt-email.mjs
//
// The owner's report: after the live City & Guilds purchase no receipt email
// arrived, while the charge was real and the subject unlocked. That is a
// delivery gap, not a payment gap — Stripe emails the receipt to the address on
// the Checkout Session, and the session carried none, so delivery depended
// entirely on what the payment form happened to capture. create-session now
// resolves the paying ACCOUNT's address server-side and pins it.
//
// What this harness proves, driving the REAL api/checkout/create-session.js
// against the fake Supabase and Stripe doubles (tools/school-loader.mjs):
//   1. the pinned address is the account's, lowercased, for a subject, the
//      bundle and a school-licence tier alike — never the school console
//      admin's address, and never anything from the request body;
//   2. a receipt lookup can never cost a sale: lookup error, lookup throw, a
//      hang past the budget, no Supabase credentials, no user, no email and a
//      malformed address each still return 200 with a session url and no
//      customer_email (and the failure is logged, not silent);
//   3. a rejected purchase (400) costs no Supabase round-trip at all;
//   4. nothing else on the session moved (metadata keys, price, mode, and no
//      `customer`/`customer_creation` — Stripe rejects customer_email
//      alongside a customer).
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Reuses the doubles the school-onboarding harness registers: @supabase/supabase-js
// -> teacher-stub.mjs (auth.admin.getUserById) and stripe -> stripe-stub.mjs
// (records every sessions.create payload).
register("./school-loader.mjs", import.meta.url);
process.env.STRIPE_SECRET_KEY = "sk_test_offline";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
// Pinned before the handler is imported, so the price ids it reads at module
// load are the harness's own — which is what makes "the price did not move" a
// real assertion rather than a restatement of the fallback.
process.env.STRIPE_PRICE_SUBJECT = "price_test_subject";
process.env.STRIPE_PRICE_BUNDLE = "price_test_bundle";
process.env.STRIPE_PRICE_SCHOOL_50 = "price_test_school_50";
const stub = await import("./teacher-stub.mjs");
const state = stub.state;
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
const buy = async (body) => {
  const res = mockRes();
  await checkoutHandler(
    { method: "POST", headers: { "content-type": "application/json" }, body },
    res
  );
  return res;
};
const last = () => stripeState.checkoutSessions.at(-1);
const BUYER = "buyer-account-1";
const BUYER_EMAIL = "Buyer.One+Form4@Example.com";
const buyer = { id: BUYER, email: BUYER_EMAIL };
// Each case starts from a clean double: users are the ACCOUNTS Supabase would
// answer getUserById with, tables are irrelevant here.
function fresh(users = []) {
  stub.reset();
  stripeStub.reset();
  state.users = users;
}
// Some cases must prove the failure was LOGGED (a silent "sold without a
// receipt address" is how this bug would hide again). Warnings are captured
// rather than printed so a deliberate failure path does not shout in the log.
const realWarn = console.warn;
const warns = [];
async function withCapturedWarnings(fn) {
  warns.length = 0;
  console.warn = (...args) => warns.push(args.map(String).join(" "));
  try {
    return await fn();
  } finally {
    console.warn = realWarn;
  }
}
const warned = (needle) => warns.some((w) => w.includes(needle));

// ---------------------------------------------------------------- the fix
section("The paying account's address is pinned on the session");
{
  fresh([buyer]);
  const res = await buy({
    priceType: "subject",
    subjectId: "mathematics",
    userId: BUYER,
    buyerRole: "parent",
  });
  check("a subject purchase still succeeds", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("the session pins the account's address", last().customer_email === "buyer.one+form4@example.com", String(last().customer_email));
  const pinned = last().customer_email || "";
  check("the pinned address carries no stray case or whitespace", pinned === pinned.toLowerCase() && !/\s/.test(pinned) && pinned.includes("@"), `"${pinned}"`);
  check("the lookup asked for the buyer's own account id", JSON.stringify(state.getUserByIdCalls) === JSON.stringify([BUYER]), JSON.stringify(state.getUserByIdCalls));

  fresh([buyer]);
  const bundle = await buy({ priceType: "bundle", userId: BUYER, buyerRole: "student" });
  check("the bundle pins it too", bundle.statusCode === 200 && last().customer_email === "buyer.one+form4@example.com", String(last().customer_email));

  fresh([buyer]);
  const licence = await buy({
    priceType: "school-license-50",
    userId: BUYER,
    schoolName: "Alpha High",
    adminEmail: "principal@alpha.edu.jm",
  });
  check("a school licence still succeeds", licence.statusCode === 200 && typeof licence.body.url === "string", JSON.stringify(licence.body));
  check("a school licence pins the paying account's address", last().customer_email === "buyer.one+form4@example.com", String(last().customer_email));
  check(
    "the school console admin's address is NOT used as the receipt address",
    last().customer_email !== "principal@alpha.edu.jm"
  );
}
{
  section("The address comes from the account, never from the request body");
  fresh([buyer]);
  const res = await buy({
    priceType: "subject",
    subjectId: "mathematics",
    userId: BUYER,
    buyerRole: "parent",
    // Anyone can put these in a request; neither may become the receipt address.
    email: "attacker@evil.test",
    customer_email: "attacker2@evil.test",
    receiptEmail: "attacker3@evil.test",
  });
  check("the purchase still succeeds", res.statusCode === 200);
  check("a body-supplied address is ignored", last().customer_email === "buyer.one+form4@example.com", String(last().customer_email));
  check("the buyer's own address is what was pinned", !JSON.stringify(last()).includes("evil.test"));
}

// ------------------------------------------------- never costs a sale
section("A receipt lookup can never cost a sale");
{
  fresh([]);
  state.getUserByIdError = { message: "profile lookup blew up" };
  const res = await withCapturedWarnings(() => buy({ priceType: "subject", userId: BUYER, buyerRole: "parent" }));
  check("a Supabase error still sells", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("and pins nothing", !("customer_email" in last()));
  check("and says so in the log", warned("without a pinned address"));
}
{
  fresh([]);
  state.getUserByIdThrows = true;
  const res = await withCapturedWarnings(() => buy({ priceType: "bundle", userId: BUYER, buyerRole: "student" }));
  check("a thrown lookup still sells", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("and pins nothing", !("customer_email" in last()));
  check("and says so in the log", warned("without a pinned address"));
}
{
  fresh([]);
  state.getUserByIdHangs = true;
  const started = Date.now();
  const res = await withCapturedWarnings(() => buy({ priceType: "subject", userId: BUYER, buyerRole: "parent" }));
  const elapsed = Date.now() - started;
  check("a hung lookup still sells", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("and pins nothing", !("customer_email" in last()));
  check(`and gives up inside the budget (took ${elapsed}ms)`, elapsed >= 2500 && elapsed <= 6000, `${elapsed}ms`);
  check("and says so in the log", warned("without a pinned address"));
}
{
  fresh([buyer]);
  const savedUrl = process.env.SUPABASE_URL;
  const savedViteUrl = process.env.VITE_SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await withCapturedWarnings(() => buy({ priceType: "subject", userId: BUYER, buyerRole: "parent" }));
  process.env.SUPABASE_URL = savedUrl;
  if (savedViteUrl === undefined) delete process.env.VITE_SUPABASE_URL;
  else process.env.VITE_SUPABASE_URL = savedViteUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
  check("no Supabase credentials still sells", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("and pins nothing", !("customer_email" in last()));
  check("and never reaches for a client it cannot build", state.getUserByIdCalls.length === 0, JSON.stringify(state.getUserByIdCalls));
}
{
  fresh([]);
  const res = await buy({ priceType: "subject", userId: BUYER, buyerRole: "parent" });
  check("an account Supabase cannot find still sells", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("and pins nothing", !("customer_email" in last()));
}
{
  fresh([{ id: BUYER, email: "" }]);
  const res = await buy({ priceType: "subject", userId: BUYER, buyerRole: "parent" });
  check("an account with no email still sells", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("and pins nothing", !("customer_email" in last()));
}
{
  fresh([{ id: BUYER, email: "not an email" }]);
  const res = await buy({ priceType: "subject", userId: BUYER, buyerRole: "parent" });
  check("a malformed account address still sells", res.statusCode === 200 && typeof res.body.url === "string", JSON.stringify(res.body));
  check("and is not handed to Stripe as a receipt address", !("customer_email" in last()));
}
{
  fresh([
    { id: BUYER, email: "  Spaced.Out@Example.com  " },
    { id: BUYER, email: "Mixed.Case@Example.COM" },
  ]);
  // The second row is never reachable (the first match wins) — this case exists
  // to prove a padded address is trimmed rather than pinned with whitespace.
  const res = await buy({ priceType: "subject", userId: BUYER, buyerRole: "parent" });
  check("a padded address is trimmed before it is pinned", res.statusCode === 200 && last().customer_email === "spaced.out@example.com", String(last().customer_email));
}

// ------------------------------------------------- no lookup on rejects
section("A rejected purchase costs no Supabase round-trip");
{
  fresh([buyer]);
  const cases = [
    ["an unknown price type", { priceType: "nonsense", userId: BUYER }],
    ["a missing user id", { priceType: "subject" }],
    ["a malformed child email", { priceType: "subject", userId: BUYER, childEmail: "nope", buyerRole: "parent" }],
    ["an unrecognised buyer role", { priceType: "subject", userId: BUYER, buyerRole: "wizard" }],
    ["a school licence with no school name", { priceType: "school-license-50", userId: BUYER, adminEmail: "a@b.jm" }],
  ];
  let allRejected = true;
  let noLookups = true;
  let noSessions = true;
  for (const [label, body] of cases) {
    const before = stripeState.checkoutSessions.length;
    const res = await buy(body);
    if (res.statusCode !== 400) allRejected = false;
    if (stripeState.checkoutSessions.length !== before) noSessions = false;
    if (state.getUserByIdCalls.length !== 0) noLookups = false;
    check(`${label} is still refused with 400`, res.statusCode === 400, `${label}: ${res.statusCode}`);
  }
  check("every rejected request stopped before Stripe", allRejected && noSessions);
  check("and none of them paid for a receipt lookup", noLookups, JSON.stringify(state.getUserByIdCalls));
}

// ------------------------------------------------- nothing else moved
section("Nothing else on the session moved");
{
  fresh([buyer]);
  const res = await buy({
    priceType: "bundle",
    userId: BUYER,
    buyerRole: "parent",
    childEmail: "Child.Learner@Example.com",
    successUrl: "https://csec-compass.example/account",
    cancelUrl: "https://csec-compass.example/pricing",
  });
  const params = last();
  const metadataKeys = Object.keys(params.metadata).sort();
  check(
    "the metadata still carries exactly the keys the webhook reads",
    JSON.stringify(metadataKeys) ===
      JSON.stringify(["admin_email", "buyer_role", "child_email", "price_type", "school_name", "seats", "subject_id"]),
    JSON.stringify(metadataKeys)
  );
  check("the child link still rides along", params.metadata.child_email === "child.learner@example.com", String(params.metadata.child_email));
  check("no `customer` is set next to customer_email (Stripe rejects the pair)", !("customer" in params));
  check("customer_creation is left alone — receipts need no Customer object", !("customer_creation" in params));
  check("the price is the bundle price", params.line_items[0].price === "price_test_bundle", String(params.line_items[0].price));
  check("the quantity is still one", params.line_items[0].quantity === 1);
  check("card-only payment is unmoved", params.payment_method_types.length === 1 && params.payment_method_types[0] === "card");
  check("the payment mode is unmoved", params.mode === "payment");
  check("the buyer still rides in client_reference_id", params.client_reference_id === BUYER);
  check("the redirect urls are passed through", params.success_url.endsWith("/account") && params.cancel_url.endsWith("/pricing"));
  check("the purchase still succeeded", res.statusCode === 200 && typeof res.body.url === "string");
}

// ------------------------------------------------- source-level guards
section("The pin can only come from the account");
{
  const src = read("api/checkout/create-session.js");
  check("create-session pins customer_email from the resolved receipt address", /customer_email:\s*receiptEmail/.test(src));
  check("the resolved address is the only source of the pin", /const receiptEmail = await receiptEmailFor\(userId\)/.test(src));
  check("the lookup is keyed on the authenticated user id", /receiptEmailFor\(userId\)/.test(src) && /supabase\.auth\.admin\.getUserById\(userId\)/.test(src));
  check("the request body is never a receipt source", !/\breceiptEmail\s*=[^;]*\bbody\b/.test(src) && !/body[^\n]*customer_email/.test(src));
  check("no api/_lib import was added (every function keeps its own client init)", !/from\s+["'][^"']*_lib/.test(src));
  check("the receipt lookup is bounded by a budget", /RECEIPT_LOOKUP_TIMEOUT_MS\s*=\s*\d+/.test(src));
  check("the budget is cleared once the lookup settles", /clearTimeout\(timer\)/.test(src));
  const apiFiles = read("tools/check-api-functions.mjs");
  check("the harness suite still guards the api/ function cap", /12/.test(apiFiles));
}

console.log(`\n${failed === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
