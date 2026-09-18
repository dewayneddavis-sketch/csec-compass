// Verification harness for the live "All Grants" bug.
//   node tools/check-admin-grants.mjs
//
// The owner's live `purchases` table predates supabase/schema.sql and has no
// `stripe_session_id` column, so:
//   1. api/admin/grant-access.js `list` named that column and the whole grant list
//      failed with "column purchases.stripe_session_id does not exist" — the owner
//      could not see who they had granted access to.
//   2. api/stripe/webhook.js wrote (and, for school licenses, read) the same column
//      on every completed checkout, so a real purchase would have 500'd and granted
//      nothing.
// Both are now column-tolerant. This harness drives the real handlers against a fake
// Supabase that KNOWS each table's columns and fails exactly like PostgREST when a
// statement names one that is missing, plus a legacy ("owner's live table") and a
// modern ("fresh schema.sql install") variant of `purchases`.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register("./grants-loader.mjs", import.meta.url);

const OWNER = "dewayneddavis@gmail.com";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.STRIPE_SECRET_KEY = "sk_test_offline";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_offline";
process.env.OWNER_EMAILS = OWNER;

const { state, reset, setTable, rows, setPurchases, PURCHASES_LEGACY_COLUMNS, PURCHASES_MODERN_COLUMNS } = await import(
  "./grants-stub.mjs"
);
const stripeState = (await import("./stripe-stub.mjs")).state;

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

const adminHandler = (await import("../api/admin/grant-access.js")).default;
const webhookHandler = (await import("../api/stripe/webhook.js")).default;

async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}

function adminReq(body, { token = "owner-token" } = {}) {
  return { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body };
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

const DAY = 24 * 60 * 60 * 1000;
const ACCESS_WINDOW_MS = 365 * DAY;

// The owner's live grants: a subject purchase, a bundle, an expired school license,
// and one row whose account no longer exists.
const LEGACY_ROWS = [
  { id: "g-1", user_id: "u-1", subject_id: "mathematics", purchase_type: "mathematics", created_at: "2026-09-18T10:00:00.000Z" },
  { id: "g-2", user_id: "u-2", subject_id: null, purchase_type: "bundle", created_at: "2026-09-01T10:00:00.000Z" },
  { id: "g-3", user_id: "u-3", subject_id: null, purchase_type: "school-license-50", created_at: "2025-01-01T10:00:00.000Z" },
  { id: "g-4", user_id: "ghost-9", subject_id: "biology", purchase_type: "biology", created_at: "2026-09-10T10:00:00.000Z" },
];

function seedUsers(extra = []) {
  state.users = [
    { id: "u-1", email: "ana@school.edu" },
    { id: "u-2", email: "ben@school.edu" },
    { id: "u-3", email: "office@highschool.edu" },
    ...extra,
  ];
}

function seedOwnerLegacyDb() {
  reset();
  state.user = { id: "owner-1", email: OWNER };
  seedUsers();
  setPurchases(LEGACY_ROWS, { columns: PURCHASES_LEGACY_COLUMNS });
}

// ===========================================================================
section("owner's live purchases table has no stripe_session_id");
check(
  "the legacy column list really lacks the column",
  !PURCHASES_LEGACY_COLUMNS.includes("stripe_session_id"),
  PURCHASES_LEGACY_COLUMNS.join(",")
);
check(
  "the schema.sql column list has it",
  PURCHASES_MODERN_COLUMNS.includes("stripe_session_id"),
  PURCHASES_MODERN_COLUMNS.join(",")
);

// ===========================================================================
section("1. All Grants list on the owner's live (legacy) table");
{
  seedOwnerLegacyDb();
  const res = await call(adminHandler, adminReq({ action: "list" }));

  check("list returns 200 instead of the column error", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("every grant row is returned (4)", res.body.count === 4 && res.body.grants.length === 4, `count=${res.body.count}`);
  check(
    "the rows are the owner's real grants",
    res.body.grants.map((g) => g.id).join(",") === "g-1,g-4,g-2,g-3",
    res.body.grants.map((g) => g.id).join(",")
  );
  check("newest first", res.body.grants[0].id === "g-1" && res.body.grants[1].id === "g-4", res.body.grants.map((g) => g.createdAt).join(" | "));
  check("emails are resolved from the account list", res.body.grants[0].email === "ana@school.edu", res.body.grants[0].email);
  check(
    "a grant for a deleted account is still shown, flagged by missingAccounts",
    res.body.grants.some((g) => g.id === "g-4" && g.email === null) && res.body.missingAccounts === 1,
    `missingAccounts=${res.body.missingAccounts}`
  );
  check(
    "purchase type and subject survive the round trip",
    res.body.grants[0].purchaseType === "mathematics" && res.body.grants[0].subjectId === "mathematics",
    JSON.stringify(res.body.grants[0])
  );
  check("a live grant is active", res.body.grants[0].active === true);
  check("an out-of-window grant is expired", res.body.grants.find((g) => g.id === "g-3").active === false);
  check("activeCount counts the live ones (3)", res.body.activeCount === 3, `activeCount=${res.body.activeCount}`);
  check(
    "expiry follows the platform's 365-day rule",
    res.body.grants[0].expiresAt === new Date(Date.parse("2026-09-18T10:00:00.000Z") + ACCESS_WINDOW_MS).toISOString(),
    res.body.grants[0].expiresAt
  );

  const purchasesStatements = state.statements.filter((s) => s.table === "purchases");
  check("the list issued exactly one purchases statement", purchasesStatements.length === 1, `n=${purchasesStatements.length}`);
  check("it reads '*' — no column is named", purchasesStatements[0].projection === "*", String(purchasesStatements[0].projection));
  check(
    "no statement on the list path names stripe_session_id",
    !state.statements.some((s) => String(s.projection || "").includes("stripe_session_id")),
    JSON.stringify(state.statements.map((s) => s.projection))
  );
}

// ===========================================================================
section("2. 'still can not view all persons I have granted access to'");
{
  // 60 grantees — past the 50-per-page default of auth.admin.listUsers, which used
  // to silently drop accounts (and their grants) from the table.
  reset();
  state.user = { id: "owner-1", email: OWNER };
  const many = Array.from({ length: 60 }, (_, i) => ({
    id: `u-${i}`,
    email: `student${i}@school.edu`,
  }));
  state.users = many;
  setPurchases(
    many.map((u, i) => ({
      id: `g-${i}`,
      user_id: u.id,
      subject_id: "mathematics",
      purchase_type: "mathematics",
      created_at: new Date(Date.parse("2026-09-18T00:00:00.000Z") - i * 1000).toISOString(),
    })),
    { columns: PURCHASES_LEGACY_COLUMNS }
  );

  const res = await call(adminHandler, adminReq({ action: "list" }));
  check("all 60 grants are listed", res.body.count === 60, `count=${res.body.count}`);
  check("every grant has its email", res.body.grants.every((g) => g.email), JSON.stringify(res.body.grants.find((g) => !g.email)));
  check("none are reported as missing accounts", res.body.missingAccounts === 0, `missingAccounts=${res.body.missingAccounts}`);
}

// ===========================================================================
section("3. a table that timestamps rows as granted_at (no created_at)");
{
  reset();
  state.user = { id: "owner-1", email: OWNER };
  seedUsers();
  setTable(
    "purchases",
    [
      { id: "old-1", user_id: "u-1", subject_id: "biology", purchase_type: "biology", granted_at: "2026-09-02T00:00:00.000Z" },
      { id: "old-2", user_id: "u-2", subject_id: null, purchase_type: "bundle", granted_at: "2026-09-15T00:00:00.000Z" },
    ],
    ["id", "user_id", "subject_id", "purchase_type", "granted_at"]
  );
  const res = await call(adminHandler, adminReq({ action: "list" }));
  check("list still returns 200", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("rows come back even with no created_at column", res.body.count === 2, `count=${res.body.count}`);
  check(
    "the timestamp falls back to granted_at and is still sorted newest first",
    res.body.grants[0].id === "old-2" && res.body.grants[0].createdAt === "2026-09-15T00:00:00.000Z",
    JSON.stringify(res.body.grants.map((g) => [g.id, g.createdAt]))
  );
}

// ===========================================================================
section("4. the modern table (schema.sql applied) is unchanged");
{
  reset();
  state.user = { id: "owner-1", email: OWNER };
  seedUsers();
  setPurchases(
    [
      {
        id: "m-1",
        user_id: "u-1",
        subject_id: null,
        purchase_type: "bundle",
        stripe_session_id: "cs_live_1",
        created_at: "2026-09-18T10:00:00.000Z",
      },
    ],
    { modern: true }
  );
  const res = await call(adminHandler, adminReq({ action: "list" }));
  check("list works on the modern schema too", res.statusCode === 200 && res.body.count === 1, `${res.statusCode} count=${res.body.count}`);
  check("response shape is identical", res.body.grants[0].purchaseType === "bundle" && res.body.grants[0].active === true);
  check(
    "the list does not read stripe_session_id even when it exists",
    state.statements.filter((s) => s.table === "purchases")[0].projection === "*",
    String(state.statements.filter((s) => s.table === "purchases")[0].projection)
  );
}

// ===========================================================================
section("5. the owner-only gate is untouched");
{
  seedOwnerLegacyDb();
  let res = await call(adminHandler, adminReq({ action: "list" }, { token: null }));
  check("no token is a 401", res.statusCode === 401, `${res.statusCode}`);

  reset();
  state.user = { id: "student-1", email: "ana@school.edu" };
  seedUsers();
  setPurchases(LEGACY_ROWS, { columns: PURCHASES_LEGACY_COLUMNS });
  res = await call(adminHandler, adminReq({ action: "list" }));
  check("a signed-in non-owner is a 403", res.statusCode === 403, `${res.statusCode}`);
  check("the 403 names the authorized owner", String(res.body.error).includes(OWNER), res.body.error);
  check("a refused list leaks no grants", res.body.grants === undefined);

  reset();
  state.user = { id: "owner-1", email: OWNER };
  seedUsers();
  setPurchases(LEGACY_ROWS, { columns: PURCHASES_LEGACY_COLUMNS });
  state.authError = { message: "invalid JWT" };
  res = await call(adminHandler, adminReq({ action: "list" }));
  check("an invalid token is a 401", res.statusCode === 401, `${res.statusCode}`);
}

// ===========================================================================
section("6. grant + revoke still work against the legacy table");
{
  seedOwnerLegacyDb();
  let res = await call(adminHandler, adminReq({ action: "grant", email: "new.student@school.edu", purchaseType: "bundle" }));
  check("granting to a new account is a 404 (not found), as before", res.statusCode === 404, `${res.statusCode}`);

  state.users.push({ id: "u-9", email: "new.student@school.edu" });
  res = await call(adminHandler, adminReq({ action: "grant", email: "new.student@school.edu", purchaseType: "bundle" }));
  check("grant succeeds on the legacy table", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  const grantInsert = state.inserts.filter((i) => i.table === "purchases").pop();
  check(
    "the grant insert names no column the live table lacks",
    Object.keys(grantInsert.rows[0]).every((k) => PURCHASES_LEGACY_COLUMNS.includes(k)),
    JSON.stringify(grantInsert.rows[0])
  );
  check("the granted row is stored", rows("purchases").some((r) => r.user_id === "u-9"));

  res = await call(adminHandler, adminReq({ action: "revoke", ids: ["g-1"] }));
  check("revoke by row id works", res.statusCode === 200 && res.body.revoked.length === 1, JSON.stringify(res.body));
  check("the revoked row is gone", !rows("purchases").some((r) => r.id === "g-1"));

  res = await call(adminHandler, adminReq({ action: "revoke", email: "ben@school.edu", purchaseType: "bundle" }));
  check(
    "revoke by account still works",
    res.statusCode === 200 && /Revoked 'bundle' access from ben@school\.edu/.test(res.body.message || ""),
    JSON.stringify(res.body)
  );
  check("and the account's grant row is gone", !rows("purchases").some((r) => r.user_id === "u-2" && r.purchase_type === "bundle"));

  // Re-listing the owner's grants must survive a revoke (the table is re-read).
  res = await call(adminHandler, adminReq({ action: "list" }));
  check("the list still renders after a revoke", res.statusCode === 200 && res.body.count === 3, `count=${res.body.count}`);
}

// ===========================================================================
section("7. Stripe webhook records a purchase on the legacy table");
{
  seedOwnerLegacyDb();
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_bundle", metadata: { price_type: "bundle" }, client_reference_id: "u-1" } },
  };
  let res = await call(webhookHandler, webhookReq(stripeState.event));
  check("a bundle purchase returns 200 (was a 500)", res.statusCode === 200, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("and is recorded", res.body.received === true && !res.body.alreadyGranted, JSON.stringify(res.body));

  const attempts = state.inserts.filter((i) => i.table === "purchases");
  check(
    "the session id is attempted first, then dropped for the retry",
    attempts.length === 2 && "stripe_session_id" in attempts[0].rows[0] && !("stripe_session_id" in attempts[1].rows[0]),
    JSON.stringify(attempts.map((a) => Object.keys(a.rows[0])))
  );
  const storedBundle = rows("purchases").find((r) => r.purchase_type === "bundle" && r.user_id === "u-1");
  check("the grant row exists for the buyer", !!storedBundle, JSON.stringify(rows("purchases")));
  check("without the missing column on the row", storedBundle && !("stripe_session_id" in storedBundle), JSON.stringify(storedBundle));

  // Stripe re-delivers the same event (at-least-once) — must not double-grant.
  stripeState.inserts = [];
  const before = rows("purchases").length;
  res = await call(webhookHandler, webhookReq(stripeState.event));
  check("a re-delivered bundle event is idempotent", res.statusCode === 200 && res.body.alreadyGranted === true, JSON.stringify(res.body));
  check("and adds no row", rows("purchases").length === before, `${rows("purchases").length} vs ${before}`);
}

// ===========================================================================
section("8. the subject and school-license purchases also survive");
{
  // subject purchase
  seedOwnerLegacyDb();
  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: { id: "cs_test_subject", metadata: { price_type: "subject", subject_id: "mathematics" }, client_reference_id: "u-2" },
    },
  };
  let res = await call(webhookHandler, webhookReq(stripeState.event));
  let stored = rows("purchases").find((r) => r.purchase_type === "mathematics" && r.user_id === "u-2");
  check("a one-off subject purchase is recorded", res.statusCode === 200 && !!stored, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("with the subject id and no missing column", stored && stored.subject_id === "mathematics" && !("stripe_session_id" in stored));

  // school license (its dedupe lookup used the missing column too) — a fresh
  // account, so this really is a new sale rather than a re-delivery
  seedOwnerLegacyDb();
  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_license_50",
        metadata: { price_type: "school-license-50" },
        client_reference_id: "u-2",
      },
    },
  };
  res = await call(webhookHandler, webhookReq(stripeState.event));
  stored = rows("purchases").find((r) => r.purchase_type === "school-license-50" && r.user_id === "u-2");
  check("a school license purchase is recorded", res.statusCode === 200 && !!stored, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check(
    "the sale is not lost to the dedupe lookup either",
    res.body.received === true && !res.body.alreadyGranted,
    JSON.stringify(res.body)
  );

  // Re-delivery of the same license event → the fallback dedupe still catches it.
  const before = rows("purchases").length;
  res = await call(webhookHandler, webhookReq(stripeState.event));
  check("a re-delivered school-license event is idempotent on the fallback", res.body.alreadyGranted === true, JSON.stringify(res.body));
  check("and adds no row", rows("purchases").length === before, `${rows("purchases").length} vs ${before}`);

  // A different school buying the same tier is a separate row (distinct account).
  state.users.push({ id: "u-4", email: "other@school.edu" });
  stripeState.event = {
    type: "checkout.session.completed",
    data: {
      object: { id: "cs_test_license_50b", metadata: { price_type: "school-license-50" }, client_reference_id: "u-4" },
    },
  };
  res = await call(webhookHandler, webhookReq(stripeState.event));
  check("another school's identical tier is granted too", res.statusCode === 200 && !res.body.alreadyGranted, JSON.stringify(res.body));
}

// ===========================================================================
section("9. modern table: the webhook still stores the session id");
{
  reset();
  state.user = { id: "owner-1", email: OWNER };
  setPurchases([], { modern: true });
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_live_bundle", metadata: { price_type: "bundle" }, client_reference_id: "u-1" } },
  };
  const res = await call(webhookHandler, webhookReq(stripeState.event));
  const attempts = state.inserts.filter((i) => i.table === "purchases");
  check("bundle purchase on the modern schema is recorded once", res.statusCode === 200 && attempts.length === 1, `attempts=${attempts.length}`);
  check(
    "and keeps storing stripe_session_id (dedupe integrity on fresh installs)",
    attempts[0].rows[0].stripe_session_id === "cs_live_bundle",
    JSON.stringify(attempts[0].rows[0])
  );

  // School license: the session-id lookup path runs normally there.
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_live_lic", metadata: { price_type: "school-license-150" }, client_reference_id: "u-2" } },
  };
  const res2 = await call(webhookHandler, webhookReq(stripeState.event));
  check("school license on the modern schema is recorded", res2.statusCode === 200 && !res2.body.alreadyGranted, JSON.stringify(res2.body));
  check(
    "and its dedupe lookup really used the session id",
    state.statements.some(
      (s) => s.table === "purchases" && s.op === "select" && s.filters.some((f) => f[0] === "stripe_session_id" && f[1] === "cs_live_lic")
    ),
    JSON.stringify(state.statements.filter((s) => s.op === "select").map((s) => s.filters))
  );
}

// ===========================================================================
section("10. the webhook's other behaviour is unchanged");
{
  seedOwnerLegacyDb();
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_unknown", metadata: { price_type: "not-a-real-product" }, client_reference_id: "u-1" } },
  };
  let res = await call(webhookHandler, webhookReq(stripeState.event));
  check("an unknown price type is still a 400", res.statusCode === 400, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("and grants nothing", state.inserts.filter((i) => i.table === "purchases").length === 0);

  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_nouser", metadata: { price_type: "bundle" }, client_reference_id: undefined } },
  };
  res = await call(webhookHandler, webhookReq(stripeState.event));
  check("a session without a client_reference_id is acknowledged, not retried", res.statusCode === 200 && /client_reference_id/.test(res.body.note || ""), JSON.stringify(res.body));

  stripeState.constructError = new Error("No signatures found matching the expected signature");
  stripeState.event = { type: "checkout.session.completed", data: { object: { metadata: { price_type: "bundle" }, client_reference_id: "u-1" } } };
  res = await call(webhookHandler, webhookReq(stripeState.event));
  check("a bad signature is still a 500", res.statusCode === 500, `${res.statusCode}`);
  stripeState.constructError = null;

  res = await call(webhookHandler, webhookReq(stripeState.event, { signature: null }));
  check("a missing signature header is still a 400", res.statusCode === 400, `${res.statusCode}`);

  res = await call(webhookHandler, { method: "GET", headers: { "stripe-signature": "x" } });
  check("a GET is still a 405", res.statusCode === 405, `${res.statusCode}`);

  // A genuine (non-column) write failure must still fail loudly, not be swallowed.
  seedOwnerLegacyDb();
  stripeState.event = {
    type: "checkout.session.completed",
    data: { object: { id: "cs_boom", metadata: { price_type: "bundle" }, client_reference_id: "u-1" } },
  };
  state.selectErrors = {};
  setPurchases(LEGACY_ROWS, { columns: PURCHASES_LEGACY_COLUMNS });
  state.selectErrors.purchases = null;
  const realInsert = state.tableRows.purchases.length;
  // force the insert to fail for a reason that is NOT a missing column
  state.tableColumns.purchases = ["id", "user_id", "subject_id", "purchase_type", "created_at", "stripe_session_id"];
  state.selectErrors.purchases = { code: "08006", message: "connection failure" };
  res = await call(webhookHandler, webhookReq(stripeState.event));
  check("a real database failure is still a 500 (never silently dropped)", res.statusCode === 500, `${res.statusCode} ${JSON.stringify(res.body)}`);
  check("and no half-written grant is left behind", state.tableRows.purchases.length === realInsert);
}

// ===========================================================================
section("11. source-level guards");
{
  const admin = readFileSync(join(root, "api/admin/grant-access.js"), "utf8");
  const webhook = readFileSync(join(root, "api/stripe/webhook.js"), "utf8");
  const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");
  const listBlock = admin.slice(admin.indexOf('if (action === "list")'), admin.indexOf('if (action === "teacher-links")'));
  // Comments describe the bug that was fixed, so compare code only.
  const listCode = listBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

  check("the list action never names a purchases column", !listCode.includes("stripe_session_id"), listCode.slice(0, 200));
  check("the list action reads '*'", /\.select\("\*"\)/.test(listBlock));
  check("the owner-only gate is still in place", /OWNER_EMAILS\.includes\(callerEmail\)/.test(admin));
  check("schema.sql still declares stripe_session_id for fresh installs", /stripe_session_id text/.test(schema));
  check("the webhook still writes stripe_session_id by default", /stripe_session_id: session\.id/.test(webhook));
  check("the webhook guards the retry on an unknown-column error", /PGRST204/.test(webhook) && /insertPurchaseRow/.test(webhook));
  check("the webhook still 500s on a genuine write error", /Failed to record purchase/.test(webhook));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
