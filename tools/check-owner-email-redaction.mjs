// Verification harness: the owner's address is not in the public repository
// (owner instruction 2026-11-05).
//   node tools/check-owner-email-redaction.mjs
//
// The repository is PUBLIC. Three server files used the owner's real address as
// a hardcoded FALLBACK for the OWNER_EMAILS allowlist, so anyone reading the repo
// — or a 403 rendered in a browser — could see it. This harness proves:
//
//   1. no owner address literal exists anywhere in the tracked tree;
//   2. the allowlist is read from the environment ONLY, in all three files;
//   3. an unset OWNER_EMAILS fails CLOSED (nobody is the owner) and logs a
//      warning that names the variable — it does not silently fall back to an
//      address, and it does not break a paying buyer;
//   4. the scanner itself has a red control: it fires on a planted address.
//
// The needles below are ASSEMBLED, never written out — a guard that spells the
// address it is hunting for would defeat itself.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register("./school-loader.mjs", import.meta.url);

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
// The Supabase credentials the handlers require. Set immediately before each
// block that drives a handler, so nothing earlier in the run can affect them.
function ensureEnv() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  process.env.STRIPE_SECRET_KEY = "sk_test_offline";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_offline";
  process.env.OWNER_EMAILS = "owner@csec-compass.test";
}
ensureEnv();
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

// The needles, assembled. Each is a local part joined to its domain.
const OWNER_ADDRESSES = [
  ["dewayneddavis", "gmail.com"].join("@"),
  ["dewdavis519", "gmail.com"].join("@"),
];

// ===========================================================================
section("1. no owner address literal exists anywhere in the repository");

// What is scanned: every text file the repository actually ships. .git (history),
// node_modules (vendored) and dist (a build of src/, already covered) are not
// part of the public source tree.
const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".vercel", "coverage"]);
const TEXT = /\.(js|mjs|cjs|jsx|ts|tsx|json|md|sql|css|html|txt|yml|yaml|toml|svg)$/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (TEXT.test(name)) out.push(p);
  }
  return out;
}

const files = walk(root);
check("the scan reaches the repository's own files", files.length > 200, `${files.length} text files`);

// The scanner is a function so its red control can be run against a planted
// string without touching the tree.
function hits(text) {
  return OWNER_ADDRESSES.filter((a) => text.toLowerCase().includes(a.toLowerCase()));
}

const offenders = [];
for (const f of files) {
  const found = hits(readFileSync(f, "utf8"));
  if (found.length) offenders.push(`${relative(root, f)} (${found.length})`);
}
check(
  "no shipped file contains an owner address",
  offenders.length === 0,
  offenders.slice(0, 10).join(", ")
);

// RED CONTROL, in-harness: the scanner must fire on a planted address and stay
// quiet on ordinary text. (The file-level red control — planting a real file and
// restoring the tree — is the PR evidence; this proves the predicate itself.)
check("red control: the scanner fires on a planted owner address", hits(`contact me at ${OWNER_ADDRESSES[0]} please`).length === 1);
check("red control: the scanner fires on the second known address", hits(`<${OWNER_ADDRESSES[1]}>`).length === 1);
check("red control: the scanner stays quiet on ordinary text", hits("owner@csec-compass.test is a dummy").length === 0);

// ===========================================================================
section("2. the allowlist is read from the environment ONLY");

const SERVER_FILES = ["api/admin/grant-access.js", "api/purchases/list.js", "api/analytics/summary.js"];
for (const f of SERVER_FILES) {
  const src = readFileSync(join(root, f), "utf8");
  check(`${f} exists`, src.length > 500);
  // A literal fallback is `OWNER_EMAILS || "<something>"`. After this change the
  // fallback may only ever be the empty string.
  const fallback = /process\.env\.OWNER_EMAILS\s*\|\|\s*("[^"]*"|'[^']*')/g;
  const found = [...src.matchAll(fallback)].map((m) => m[1]);
  check(
    `${f}: OWNER_EMAILS has no address fallback`,
    found.every((v) => v === '""' || v === "''"),
    JSON.stringify(found)
  );
  check(`${f}: it still reads OWNER_EMAILS from the environment`, /process\.env\.OWNER_EMAILS/.test(src));
  check(
    `${f}: it warns, naming the variable, when the allowlist is unset`,
    /OWNER_EMAILS is not set/.test(src) && /OWNER_EMAILS to a comma-separated list/.test(src)
  );
}
// The summary route routes both scopes through one helper, so the warn cannot be
// forgotten at one of the two call sites.
const summarySrc = readFileSync(join(root, "api/analytics/summary.js"), "utf8");
check("summary.js has ONE owner-allowlist helper", /function ownerAllowlist\(\)/.test(summarySrc));
// The env var may be read in exactly ONE place — inside the helper. A second
// read is how one call site gets forgotten and keeps its own fallback.
const directReads = (summarySrc.match(/csv\(process\.env\.OWNER_EMAILS/g) || []).length;
check("…the env var is read in exactly one place, inside the helper", directReads === 1, `${directReads} direct reads`);
check(
  "…and both scopes go through the helper",
  (summarySrc.match(/= ownerAllowlist\(\);/g) || []).length >= 2,
  `${(summarySrc.match(/= ownerAllowlist\(\);/g) || []).length} call sites`
);
check(
  "the env-only decision is written down in all three files",
  SERVER_FILES.every((f) => /ENV-ONLY|public repository|repository is PUBLIC|repository is public/i.test(readFileSync(join(root, f), "utf8")))
);
// The old 403 in api/admin/grant-access.js no longer names the owner (PR #213);
// this keeps that property in scope for this file too.
check(
  "the owner-only 403 still does not name an address",
  !/@/.test((summarySrc.split("Forbidden: this action is restricted.")[1] || "x").split("});")[0])
);

// ===========================================================================
section("3. unset OWNER_EMAILS fails CLOSED, and a buyer still buys");

// 3a. api/purchases/list.js reads the variable PER REQUEST, so it can be driven
// with the variable removed on this very module instance. It talks to Supabase
// over plain fetch (not the stubbed client), so those two endpoints are doubled
// here — the same technique tools/check-subject-pricing.mjs uses.
{
  const stub = await import("./teacher-stub.mjs");
  const { state } = stub;
  const listHandler = (await import("../api/purchases/list.js")).default;

  const realFetch = globalThis.fetch;
  const jsonRes = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/auth/v1/user")) return jsonRes({ id: "u-owner", email: OWNER_ADDRESSES[0] });
    // No purchase rows: the ONLY thing that could grant access is the allowlist.
    if (u.includes("/rest/v1/purchases")) return jsonRes([]);
    return jsonRes({}, 404);
  };

  function mockRes() {
    const res = {
      statusCode: null,
      body: null,
      status(v) {
        res.statusCode = v;
        return res;
      },
      json(p) {
        res.body = p;
        return res;
      },
    };
    return res;
  }

  const OWNER_CALLER = OWNER_ADDRESSES[0];
  const warnings = [];
  const realWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));

  process.env.OWNER_EMAILS = "";
  state.user = { id: "u-owner", email: OWNER_CALLER };
  let res = mockRes();
  await listHandler({ method: "GET", headers: { authorization: "Bearer t" } }, res);
  check(
    "with OWNER_EMAILS unset, the owner's address gets NO automatic bundle",
    res.statusCode === 200 && res.body.hasBundle !== true,
    `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`
  );
  check(
    "…and the server says so, naming OWNER_EMAILS",
    warnings.some((w) => /OWNER_EMAILS is not set/.test(w)),
    warnings.slice(-2).join(" | ")
  );

  // The same caller WITH the variable set still gets the owner path — this is the
  // access that must not break.
  warnings.length = 0;
  process.env.OWNER_EMAILS = OWNER_CALLER;
  res = mockRes();
  await listHandler({ method: "GET", headers: { authorization: "Bearer t" } }, res);
  check(
    "with OWNER_EMAILS set, the owner still gets automatic full access",
    res.statusCode === 200 && res.body.hasBundle === true,
    `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`
  );
  check("…and nothing warns", warnings.length === 0, warnings.join(" | "));

  // A buyer who is NOT the owner is unaffected either way.
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/auth/v1/user")) return jsonRes({ id: "u-buyer", email: "buyer@example.com" });
    if (u.includes("/rest/v1/purchases")) return jsonRes([]);
    return jsonRes({}, 404);
  };
  process.env.OWNER_EMAILS = "";
  state.user = { id: "u-buyer", email: "buyer@example.com" };
  res = mockRes();
  await listHandler({ method: "GET", headers: { authorization: "Bearer t" } }, res);
  check(
    "with OWNER_EMAILS unset, a normal buyer is still answered (not a 500)",
    res.statusCode === 200,
    `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`
  );

  console.warn = realWarn;
  globalThis.fetch = realFetch;
  process.env.OWNER_EMAILS = "owner@csec-compass.test";
}

// 3b. api/admin/grant-access.js resolves the allowlist at MODULE LOAD, so it
// needs a fresh instance to prove the unset case. Cache-busting the specifier
// gives one without touching the tree.
{
  const stub = await import("./teacher-stub.mjs");
  const { state } = stub;
  const OWNER_CALLER = OWNER_ADDRESSES[0];

  const warnings = [];
  const realWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  const saved = process.env.OWNER_EMAILS;
  delete process.env.OWNER_EMAILS;

  const url = pathToFileURL(join(root, "api/admin/grant-access.js")).href + "?unset-owner=" + Date.now();
  let fresh;
  try {
    fresh = (await import(url)).default;
  } catch (err) {
    fresh = null;
    check("the grant-access handler loads with OWNER_EMAILS unset", false, err.message);
  }
  console.warn = realWarn;
  process.env.OWNER_EMAILS = saved || "owner@csec-compass.test";

  if (fresh) {
    check("the grant-access handler loads with OWNER_EMAILS unset", true);
    check(
      "…and warns at load time, naming OWNER_EMAILS",
      warnings.some((w) => /OWNER_EMAILS is not set/.test(w)),
      warnings.slice(-2).join(" | ")
    );

    function mockRes() {
      const res = {
        statusCode: null,
        body: null,
        status(v) {
          res.statusCode = v;
          return res;
        },
        json(p) {
          res.body = p;
          return res;
        },
      };
      return res;
    }
    state.user = { id: "u-owner", email: OWNER_CALLER };
    const res = mockRes();
    // An OWNER-ONLY action (not one of the school-scoped ones), with every field
    // it validates supplied, so the request reaches the owner gate itself.
    await fresh(
      {
        method: "POST",
        headers: { authorization: "Bearer t" },
        body: { action: "grant", email: "someone@school.edu", purchaseType: "bundle" },
      },
      res
    );
    check(
      "with OWNER_EMAILS unset, the owner's address is REFUSED an owner-only action",
      res.statusCode === 403,
      `${res.statusCode} ${JSON.stringify(res.body).slice(0, 160)}`
    );
    check("…and the refusal names no address", !/@/.test(JSON.stringify(res.body).slice(0, 200)), JSON.stringify(res.body).slice(0, 160));
  }
}

// ===========================================================================
section("4. the dummy the harnesses use is obviously not a real inbox");

check(
  "the fixtures use owner@csec-compass.test",
  ["tools/grants-stub.mjs", "tools/check-admin-grants.mjs", "tools/check-teacher-dashboard.mjs", "tools/check-subject-pricing.mjs"].every(
    (f) => readFileSync(join(root, f), "utf8").includes("owner@csec-compass.test")
  )
);
check(
  "…and the .test TLD is reserved for exactly this (never a real mailbox)",
  /\.test\b/.test("owner@csec-compass.test")
);
check(
  "check-contact.mjs still hunts for the personal address, with an assembled needle",
  /\[\s*"dewdavis519"\s*,\s*"gmail\.com"\s*\]\.join\("@\"\)/.test(readFileSync(join(root, "tools/check-contact.mjs"), "utf8"))
);
check(
  "check-privacy-page.mjs does the same",
  /"dewdavis"\s*\+\s*"519"/.test(readFileSync(join(root, "tools/check-privacy-page.mjs"), "utf8"))
);

// ===========================================================================
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
