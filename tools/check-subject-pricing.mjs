// Verifies that EVERY subject on the platform can actually be bought on its own,
// at the same $9.99, end to end.
//
//   node tools/check-subject-pricing.mjs
//
// Why this exists: the owner decided (2026-09-18) that all 23 subjects —
// French and the newer subjects included — are purchasable individually at the
// same $9.99 as the existing singles. Stripe needed nothing (one generic
// "Single Subject Access" price backs every subject, and the webhook grants
// whatever subject id arrives), but src/pages/PricingPage.jsx kept its own
// hardcoded 10-subject dropdown, so 13 subjects could not be selected at all: a
// student clicking "Unlock full access" on a French lesson landed on /pricing and
// simply could not buy French. Nothing errored — that is the bug class this file
// exists to catch.
//
// What it checks:
//   1. the dropdown covers the catalog EXACTLY — both directions, same names,
//      same order — and degrades to the full list, never a short one, if the
//      catalog fetch fails (the static fallback is asserted against the catalog)
//   2. /pricing?subject=<id> — every paywall link in the app — preselects that
//      subject for ALL 23, and an unknown id preselects nothing rather than
//      preselling a subject that does not exist
//   3. the checkout is generic: create-session accepts every catalog id, charges
//      the SAME Stripe price for all of them, and stamps the id into the session
//      metadata (no new Stripe products/prices needed for the newly-sellable 13)
//   4. the whole chain, driven for real: checkout -> webhook -> purchases/list ->
//      the app's own hasSubjectAccess() -> french unlocked, mathematics not
//   5. the bundle copy states the real saving (computed, not written down once)
//   6. fail-closed: a signed-out / still-loading / errored client, and a
//      purchases call that 401s or 500s, unlock nothing
//
// Run it (with the rest) before any pricing/checkout PR:
//   for f in tools/check-*.mjs; do node "$f"; done

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register("./grants-loader.mjs", import.meta.url);

const OWNER = "dewayneddavis@gmail.com";
const STUDENT = { id: "u-2", email: "ana@school.edu" };
const STUDENT_TOKEN = "student-token";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.STRIPE_SECRET_KEY = "sk_test_offline";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_offline";
process.env.OWNER_EMAILS = OWNER;
delete process.env.STRIPE_PRICE_SUBJECT; // prove the generic price fallback is real

const { state, reset, setPurchases, rows, PURCHASES_LEGACY_COLUMNS } = await import("./grants-stub.mjs");
const stripeState = (await import("./stripe-stub.mjs")).state;

const pricing = await import("../src/data/pricingSubjects.js");
const { hasSubjectAccess } = await import("../src/data/access.js");
const createSessionHandler = (await import("../api/checkout/create-session.js")).default;
const webhookHandler = (await import("../api/stripe/webhook.js")).default;
const listHandler = (await import("../api/purchases/list.js")).default;

const catalog = JSON.parse(readFileSync(join(root, "content/subjects.json"), "utf8"));
const catalogIds = catalog.map((s) => s.id);

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
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}
async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}
function postReq(body) {
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

// --- the fake Supabase REST/auth endpoints that api/purchases/list.js calls ----
// auth and the purchases table are served from the same in-memory rows the real
// webhook writes via the supabase-js double, so the chain under test is the real
// one: checkout -> webhook -> row -> purchases/list.
let authOutage = false;
let dbOutage = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  const json = (status, payload) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });
  if (u.includes("/auth/v1/user")) {
    if (authOutage) return json(503, { error: "auth unavailable" });
    const header = (opts && opts.headers && opts.headers.Authorization) || "";
    const token = header.replace("Bearer ", "");
    if (token !== STUDENT_TOKEN) return json(401, { error: "invalid token" });
    return json(200, STUDENT);
  }
  if (u.includes("/rest/v1/purchases")) {
    if (dbOutage) return json(500, { error: "connection failure" });
    const match = /user_id=eq\.([^&]+)/.exec(u);
    const wanted = match ? decodeURIComponent(match[1]) : null;
    return json(200, rows("purchases").filter((r) => r.user_id === wanted));
  }
  return realFetch(url, opts);
};

function seedDb() {
  reset();
  state.user = { id: "owner-1", email: OWNER };
  state.users = [STUDENT];
  setPurchases([], { columns: PURCHASES_LEGACY_COLUMNS });
  authOutage = false;
  dbOutage = false;
}

// ===========================================================================
section("1. the per-subject dropdown covers the catalog (all 23, both directions)");
{
  const fallback = pricing.FALLBACK_SUBJECT_OPTIONS;
  check(
    `the catalog has all 23 subjects (${catalogIds.length})`,
    catalogIds.length >= 23,
    String(catalogIds.length)
  );
  check(
    "the static fallback lists every catalog subject",
    catalogIds.every((id) => fallback.some((o) => o.id === id)),
    catalogIds.filter((id) => !fallback.some((o) => o.id === id)).join(", ") || "none"
  );
  check(
    "the fallback invents no subject that is not in the catalog",
    fallback.every((o) => catalogIds.includes(o.id)),
    fallback.filter((o) => !catalogIds.includes(o.id)).map((o) => o.id).join(", ") || "none"
  );
  check(
    "fallback ids are unique",
    new Set(fallback.map((o) => o.id)).size === fallback.length,
    `${new Set(fallback.map((o) => o.id)).size} vs ${fallback.length}`
  );
  check(
    "every display name matches the catalog name",
    fallback.every((o) => (catalog.find((s) => s.id === o.id) || {}).name === o.name),
    fallback
      .filter((o) => (catalog.find((s) => s.id === o.id) || {}).name !== o.name)
      .map((o) => `${o.id}: "${o.name}"`)
      .join(", ") || "none"
  );

  // The fetched catalog must render exactly like the fallback, in the same order,
  // so the dropdown does not visibly reshuffle when the fetch lands ...
  const derived = pricing.buildSubjectOptions(catalog);
  check(
    "the catalog-derived dropdown is identical to the fallback (ids, names AND order)",
    eq(derived, fallback),
    `derived ${derived.length} vs fallback ${fallback.length}`
  );
  check(
    "and it is in canonical alphabetical order",
    eq(derived, pricing.sortSubjectOptions(derived)),
    derived.map((o) => o.name).slice(0, 3).join(" | ")
  );

  // ... and a failed fetch must never shrink the sellable list.
  check(
    "a failed catalog fetch keeps the full list (null)",
    eq(pricing.buildSubjectOptions(null), fallback) && pricing.buildSubjectOptions(null).length === catalogIds.length
  );
  check("a failed catalog fetch keeps the full list (empty array)", eq(pricing.buildSubjectOptions([]), fallback));
  check("a failed catalog fetch keeps the full list (garbage)", eq(pricing.buildSubjectOptions("nope"), fallback));
  check(
    "malformed catalog rows are dropped, the rest still sells",
    eq(pricing.buildSubjectOptions([{ id: "french", name: "French" }, null, { id: "" }, { id: "x" }]), [
      { id: "french", name: "French" },
    ])
  );
}

// ===========================================================================
section("2. /pricing?subject=<id> preselects the subject the paywall link asked for");
{
  const options = pricing.FALLBACK_SUBJECT_OPTIONS;
  const unpreselected = catalogIds.filter((id) => pricing.resolvePreselectedSubject(id, options) !== id);
  check(
    `every one of the ${catalogIds.length} subjects preselects from its own id`,
    unpreselected.length === 0,
    unpreselected.join(", ") || "none"
  );
  // The 13 that the old hardcoded dropdown could not offer at all.
  const newlySellable = ["english-b", "caribbean-history", "integrated-science", "agriculture-double-option",
    "food-and-nutrition", "technical-drawing", "physical-education", "clothing-textile-and-fashion",
    "principles-of-business", "edpm", "visual-arts", "theater-arts", "french"];
  check(
    "the 13 previously bundle-only subjects now preselect and are sellable",
    newlySellable.every((id) => catalogIds.includes(id) && pricing.resolvePreselectedSubject(id, options) === id),
    newlySellable.filter((id) => pricing.resolvePreselectedSubject(id, options) !== id).join(", ") || "none"
  );
  check(
    "the link a locked French lesson produces preselects French",
    pricing.resolvePreselectedSubject("french", options) === "french"
  );
  check("a padded id still resolves", pricing.resolvePreselectedSubject("  french ", options) === "french");
  check("no ?subject= param -> nothing preselected", pricing.resolvePreselectedSubject("", options) === "");
  check("no param at all -> nothing preselected", pricing.resolvePreselectedSubject(undefined, options) === "");
  check("a null param -> nothing preselected", pricing.resolvePreselectedSubject(null, options) === "");
  check(
    "an id the platform does not sell preselects nothing (never a stray 'select a subject first' error)",
    pricing.resolvePreselectedSubject("geography", options) === "" &&
      pricing.resolvePreselectedSubject("french-2", options) === "" &&
      pricing.resolvePreselectedSubject("FRENCH", options) === ""
  );
}

// ===========================================================================
section("3. checkout is generic over subject — one Stripe price, any subject");
{
  seedDb();
  stripeState.checkoutSessions = [];
  const priceIds = new Set();
  const wrongMetadata = [];
  for (const id of catalogIds) {
    stripeState.checkoutSessions = [];
    const res = await call(createSessionHandler, postReq({ priceType: "subject", subjectId: id, userId: STUDENT.id }));
    const session = stripeState.checkoutSessions[0];
    if (res.statusCode !== 200 || !session) {
      wrongMetadata.push(`${id}: status ${res.statusCode}`);
      continue;
    }
    if (typeof res.body.url !== "string" || !res.body.url.startsWith("https://")) {
      wrongMetadata.push(`${id}: no checkout url`);
    }
    if (session.metadata.subject_id !== id || session.metadata.price_type !== "subject") {
      wrongMetadata.push(`${id}: ${JSON.stringify(session.metadata)}`);
    }
    if (session.client_reference_id !== STUDENT.id) wrongMetadata.push(`${id}: client_reference_id`);
    if ((session.line_items || []).length !== 1) wrongMetadata.push(`${id}: line_items`);
    priceIds.add(session.line_items[0].price);
  }
  check(
    `create-session sells all ${catalogIds.length} subjects (200 + usable checkout URL)`,
    wrongMetadata.length === 0,
    wrongMetadata.join(" | ")
  );
  check(
    "every subject is charged through the SAME Stripe price id (no per-subject product needed)",
    priceIds.size === 1,
    [...priceIds].join(", ")
  );
  // The one price is the "Single Subject Access" price create-session resolves
  // (env-overridable in Vercel); assert against the source rather than a literal so
  // a live/test switchover does not read as a failure.
  const subjectPriceFallback = /STRIPE_PRICE_SUBJECT \|\| "([^"]+)"/.exec(
    readFileSync(join(root, "api/checkout/create-session.js"), "utf8")
  );
  check(
    "and every subject is charged the app's single subject price",
    !!subjectPriceFallback && [...priceIds][0] === subjectPriceFallback[1],
    `${[...priceIds].join(", ")} vs ${subjectPriceFallback && subjectPriceFallback[1]}`
  );

  let res = await call(createSessionHandler, postReq({ priceType: "subject", subjectId: "french", userId: undefined }));
  check("checkout without a signed-in user is refused", res.statusCode === 400, `${res.statusCode}`);
  res = await call(createSessionHandler, postReq({ priceType: "not-a-product", subjectId: "french", userId: STUDENT.id }));
  check("an unknown priceType is still refused", res.statusCode === 400, `${res.statusCode}`);
  res = await call(createSessionHandler, { method: "GET", headers: {} });
  check("a GET is still a 405", res.statusCode === 405, `${res.statusCode}`);
}

// ===========================================================================
section("4. the whole chain: French checkout -> webhook -> purchases/list -> access");
{
  seedDb();
  // 4a. what the Pricing page's own buy button sends for a preselected French
  stripeState.checkoutSessions = [];
  let res = await call(createSessionHandler, postReq({ priceType: "subject", subjectId: "french", userId: STUDENT.id }));
  const session = stripeState.checkoutSessions[0];
  check("the French checkout session is created", res.statusCode === 200 && !!session, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check(
    "it carries price_type=subject + subject_id=french (what the webhook switches on)",
    session.metadata.price_type === "subject" && session.metadata.subject_id === "french",
    JSON.stringify(session.metadata)
  );

  // 4b. the webhook, driven by the metadata the real checkout just produced
  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: { id: "cs_fr_1", metadata: session.metadata, client_reference_id: session.client_reference_id },
    },
  };
  res = await call(webhookHandler, webhookReq(stripeState.event));
  const granted = rows("purchases").filter((r) => r.user_id === STUDENT.id);
  check("the webhook records the sale", res.statusCode === 200 && !res.body.alreadyGranted, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check(
    "the grant row stores purchase_type='french'",
    granted.length === 1 && granted[0].purchase_type === "french" && granted[0].subject_id === "french",
    JSON.stringify(granted)
  );

  // 4c. a re-delivered event must not double-charge a grant row
  res = await call(webhookHandler, webhookReq(stripeState.event));
  check("a re-delivered event is idempotent", res.body.alreadyGranted === true, JSON.stringify(res.body));
  check("and adds no row", rows("purchases").filter((r) => r.user_id === STUDENT.id).length === 1);

  // 4d. what the app's own /api/purchases/list returns to the buyer
  res = await call(listHandler, { method: "GET", headers: { authorization: `Bearer ${STUDENT_TOKEN}` } });
  check("purchases/list answers 200", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check(
    "it returns purchasedSubjects: ['french']",
    eq(res.body.purchasedSubjects, ["french"]),
    JSON.stringify(res.body.purchasedSubjects)
  );
  check("no bundle / school license is invented", res.body.hasBundle === false && res.body.hasSchoolLicense === false);
  check(
    "the row is inside the 365-day access window",
    typeof res.body.purchases[0].expires_at === "string" &&
      Date.parse(res.body.purchases[0].expires_at) > Date.now(),
    JSON.stringify(res.body.purchases[0])
  );

  // 4e. THE question: has the buyer got access — through the app's real predicate
  const client = {
    user: STUDENT,
    loading: false,
    error: false,
    hasBundle: res.body.hasBundle,
    hasSchoolLicense: res.body.hasSchoolLicense,
    purchasedSubjects: res.body.purchasedSubjects,
  };
  check("hasAccess('french') is TRUE for the French buyer", hasSubjectAccess(client, "french") === true);
  check(
    "and hasAccess('mathematics') is still FALSE (another subject was not unlocked)",
    hasSubjectAccess(client, "mathematics") === false
  );

  // A bundle buyer gets French too (the bundle still covers subjects bought
  // individually) — and a school license as well.
  const bundleClient = { ...client, hasBundle: true, purchasedSubjects: [] };
  check("a bundle buyer has access to french", hasSubjectAccess(bundleClient, "french") === true);
  const licenseClient = { ...client, hasSchoolLicense: true, purchasedSubjects: [] };
  check("a school-license account has access to french", hasSubjectAccess(licenseClient, "french") === true);
}

// ===========================================================================
section("5. fail-closed: nothing unlocks without a verified server answer");
{
  const unlocked = { user: STUDENT, loading: false, error: false, hasBundle: false, hasSchoolLicense: false, purchasedSubjects: ["french"] };
  check("signed out -> no access", hasSubjectAccess({ ...unlocked, user: null }, "french") === false);
  check("still loading -> no access", hasSubjectAccess({ ...unlocked, loading: true }, "french") === false);
  check("a purchases API error -> no access", hasSubjectAccess({ ...unlocked, error: true }, "french") === false);
  check("no subject id -> no access", hasSubjectAccess(unlocked, "") === false && hasSubjectAccess(unlocked, undefined) === false);
  check("a missing payload -> no access", hasSubjectAccess(undefined, "french") === false && hasSubjectAccess({}, "french") === false);

  seedDb();
  let res = await call(listHandler, { method: "GET", headers: { authorization: "Bearer wrong-token" } });
  check("an invalid token is a 401 (no data)", res.statusCode === 401 && res.body.purchasedSubjects === undefined, `${res.statusCode}`);
  res = await call(listHandler, { method: "GET", headers: {} });
  check("no auth header is a 401", res.statusCode === 401, `${res.statusCode}`);

  authOutage = true;
  res = await call(listHandler, { method: "GET", headers: { authorization: `Bearer ${STUDENT_TOKEN}` } });
  check("an auth outage is a 401, not an empty success", res.statusCode === 401, `${res.statusCode}`);
  authOutage = false;

  dbOutage = true;
  res = await call(listHandler, { method: "GET", headers: { authorization: `Bearer ${STUDENT_TOKEN}` } });
  check("a database failure is a loud 500, never an empty grant list", res.statusCode === 500, `${res.statusCode}`);
  dbOutage = false;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  res = await call(listHandler, { method: "GET", headers: { authorization: `Bearer ${STUDENT_TOKEN}` } });
  check("missing server credentials fail closed naming the variable", res.statusCode === 500 && /SERVICE_ROLE_KEY/.test(res.body.error || ""), `${res.statusCode} ${res.body.error}`);
  process.env.SUPABASE_SERVICE_ROLE_KEY = key;
}

// ===========================================================================
section("6. the bundle copy states a real saving");
{
  const count = catalogIds.length;
  check(`the bundle saving is computed from ${count} subjects`, pricing.bundleSavingsPct(count) === 78, String(pricing.bundleSavingsPct(count)));
  check("the label says so", /Save 78% vs buying every subject separately/.test(pricing.bundleSavingsLabel(count)), pricing.bundleSavingsLabel(count));
  check(
    "and it never overstates: the percentage rounds down",
    pricing.BUNDLE_PRICE / (count * pricing.SUBJECT_PRICE) <= 1 - pricing.bundleSavingsPct(count) / 100
  );
  check(
    "fewer subjects than the bundle is worth -> no saving is claimed",
    pricing.bundleSavingsPct(3) === null && !/save/i.test(pricing.bundleSavingsLabel(3)),
    pricing.bundleSavingsLabel(3)
  );
  check("a nonsense count claims nothing", pricing.bundleSavingsPct(0) === null && pricing.bundleSavingsPct("x") === null);

  const page = readFileSync(join(root, "src/pages/PricingPage.jsx"), "utf8");
  check("the stale 'save 50% vs buying subjects separately' claim is gone", !/save\s*50%/i.test(page));
  check(
    "the page renders the computed label",
    /bundleSavingsLabel\(subjectCount\)/.test(page) && /Bundle pricing — \$\{bundleSavingsLabel/.test(page)
  );
}

// ===========================================================================
section("7. source guards: the dropdown can no longer drift from the catalog");
{
  const page = readFileSync(join(root, "src/pages/PricingPage.jsx"), "utf8");
  const module = readFileSync(join(root, "src/data/pricingSubjects.js"), "utf8");
  const hook = readFileSync(join(root, "src/data/usePurchases.js"), "utf8");

  check("the Pricing page fetches the catalog", /fetch\("\/content\/subjects\.json"\)/.test(page));
  check("and builds the dropdown from it", /buildSubjectOptions\(/.test(page));
  check(
    "the dropdown renders from that list, not a hardcoded array",
    /subjectOptions\.map\(/.test(page) && !/const\s+SUBJECT_OPTIONS\s*=/.test(page)
  );
  check(
    "no subject id is hardcoded in the Pricing page any more",
    !/id:\s*"(biology|french|mathematics|spanish)"/.test(page),
    (page.match(/id:\s*"[a-z-]+"/g) || []).join(", ")
  );
  check("it starts from the full static list (never an empty dropdown)", /useState\(FALLBACK_SUBJECT_OPTIONS\)/.test(page));
  check("it preselects the subject from the link", /resolvePreselectedSubject\(requestedSubject, subjectOptions\)/.test(page));
  check(
    "an unmatched link gets the neutral hint, not the 'select a subject first' error",
    /unmatchedSubjectLink/.test(page) && /didn&rsquo;t match a subject on the platform/.test(page)
  );
  check(
    "the 'Please select a subject first' guard is still there for a real forgotten choice",
    /Please select a subject first\./.test(page)
  );
  check(
    "the master fallback list lives in the tested module",
    /export const FALLBACK_SUBJECT_OPTIONS/.test(module) && (module.match(/id: "/g) || []).length === catalogIds.length,
    `${(module.match(/id: "/g) || []).length} entries`
  );
  check(
    "usePurchases() delegates to the tested access predicate",
    /import \{ hasSubjectAccess \} from "\.\/access"/.test(hook) && /return hasSubjectAccess\(/.test(hook)
  );
  check(
    "api/purchases/list.js still treats purchase_type as the subject id",
    /purchasedSubjects = active[\s\S]{0,200}map\(\(p\) => p\.purchase_type\)/.test(
      readFileSync(join(root, "api/purchases/list.js"), "utf8")
    )
  );
  check(
    "the webhook has no per-subject allowlist (any subject id is granted)",
    !/ALLOWED_SUBJECTS|VALID_SUBJECTS|KNOWN_SUBJECTS/.test(readFileSync(join(root, "api/stripe/webhook.js"), "utf8"))
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
