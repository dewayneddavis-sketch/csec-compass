// The deployment contract for api/ — the two ways a change in this directory
// can break a Vercel deployment silently.
//
//   node tools/check-api-functions.mjs
//
// WHY THIS FILE EXISTS (deploy failure, 2026-09-23)
//
// A deployment does not have to fail at build time to fail. PR #83 added the
// contact route — 12 route files became 13 — and Vercel rejected the whole
// deployment: a Hobby-plan deployment may carry at most 12 Serverless
// Functions, one per non-underscore file under api/. The GitHub commit status
// said only "Deployment has failed", the previous build kept serving, and
// /api/contact simply did not exist in production. Every harness was green and
// `vite build` exited 0, because nothing was wrong with the build — see the
// evidence in the PR: 12 route files deployed successfully for months, the
// previous commit's status was "Deployment has completed", and this one went to
// "Deployment has failed" only after the 13th file appeared.
//
//   1. TOO MANY FUNCTIONS. Counted exactly the way Vercel counts them: every
//      file under api/ is one function, except files or directories whose name
//      starts with "_" (that is why api/_lib/*.js does not count). Going over
//      the cap fails the deployment, so it fails here first, with the list.
//   2. AN IMPORT THAT LEAVES api/. Vercel builds each api/ file as its own
//      bundle. A file that reaches out to ../src/ (which only the React app
//      uses) is not part of the function's own tree; api/contact.js did exactly
//      that and is now self-contained. Anything that needs wording or rules
//      from src/ must mirror them and prove they agree (see
//      tools/check-contact.mjs for the pattern).
//
// It also drives the consolidated auth function and asserts both legacy paths
// still answer exactly as the two files it replaced did — consolidating to get
// back under the cap must not quietly change a response.
//
// Run it with the rest before any PR that touches api/:
//   for f in tools/check-*.mjs; do node "$f"; done
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

// Prove the counters move before trusting a green run.
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

// --- how Vercel sees api/ ----------------------------------------------------
// Extensions Vercel's Node builder turns into a Serverless Function.
const FUNCTION_EXT = /\.(js|mjs|cjs|ts|tsx|jsx)$/;
// A file or directory starting with "_" is not routable and not a function.
const isIgnored = (relPath) => relPath.split("/").some((seg) => seg.startsWith("_") && seg !== "");

function walk(dir, out = []) {
  for (const entry of readdirSync(join(root, dir))) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const rel = `${dir}/${entry}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const FUNCTIONS_PER_DEPLOYMENT = 12; // Vercel Hobby cap (the plan this project is on)

const apiFiles = walk("api");
const routeFiles = apiFiles.filter((f) => FUNCTION_EXT.test(f) && !isIgnored(relative("api", f)));
const ignoredFiles = apiFiles.filter((f) => FUNCTION_EXT.test(f) && isIgnored(relative("api", f)));

section("api/ fits in the deployment's function budget");

check(
  `api/ has at most ${FUNCTIONS_PER_DEPLOYMENT} Serverless Functions (Vercel rejects the deployment above this)`,
  routeFiles.length <= FUNCTIONS_PER_DEPLOYMENT,
  `${routeFiles.length} route files: ${routeFiles.sort().join(", ")}`
);
check(
  "_-prefixed files and folders are excluded from the count (that is the escape hatch Vercel gives us)",
  ignoredFiles.length > 0 && ignoredFiles.every((f) => !routeFiles.includes(f)),
  `ignored: ${ignoredFiles.sort().join(", ")}`
);
check(
  "no route file is a stray non-function (every one exports a default handler)",
  routeFiles.every((f) => /export\s+default\s+(async\s+)?(function|\(|\w+)/.test(readFileSync(join(root, f), "utf8"))),
  routeFiles.filter((f) => !/export\s+default\s+(async\s+)?(function|\(|\w+)/.test(readFileSync(join(root, f), "utf8"))).join(", ")
);
check("the project is configured to build api/**/*.js as functions", (() => {
  const cfg = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  return Boolean(cfg.functions && cfg.functions["api/**/*.js"]);
})());

section("no api/ file imports anything from outside api/");

const escaping = [];
for (const file of apiFiles) {
  if (!FUNCTION_EXT.test(file)) continue;
  const src = readFileSync(join(root, file), "utf8");
  const specifiers = [...src.matchAll(/(?:^|\n)\s*(?:import|export)[^"'`\n]*?from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const dynamic = [...src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
  for (const spec of [...specifiers, ...dynamic]) {
    if (!spec.startsWith(".")) continue; // npm packages are fine
    const target = resolve(join(root, dirname(file)), spec);
    if (relative(join(root, "api"), target).startsWith("..")) {
      escaping.push(`${file} → ${spec}`);
    }
  }
}
check(
  "every relative import an api/ file makes resolves inside api/ (a bundle cannot reach into src/)",
  escaping.length === 0,
  escaping.join("; ")
);
check(
  "api/contact.js is self-contained (the file that failed the deploy imports nothing at all)",
  !/(?:^|\n)\s*(?:import|export)[^"'`\n]*?from\s*["']/.test(readFileSync(join(root, "api/contact.js"), "utf8")),
  "api/contact.js still imports something"
);

// --- the consolidation that made room for the contact route -----------------
section("the two auth lookups still answer, in one function");

const AUTH_FILE = "api/auth/[action].js";
check("api/auth/[action].js is the one auth function", existsSync(join(root, AUTH_FILE)));
check("api/auth/me.js is gone (its path is served by the consolidated function)", !existsSync(join(root, "api/auth/me.js")));
check("api/auth/user.js is gone (its path is served by the consolidated function)", !existsSync(join(root, "api/auth/user.js")));

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
// The consolidated file imports the Supabase client, so it is imported the same
// way Vercel would load it. No request below reaches the network: each one is
// answered before any client call can happen.
const authHandler = (await import("../api/auth/[action].js")).default;

const realUrl = process.env.VITE_SUPABASE_URL;
const realKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// With Supabase unconfigured. The two files disagreed about the ORDER of their
// checks — me.js refused a bad method first, user.js refused a missing config
// first — and that order is preserved.
delete process.env.VITE_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
{
  const me = await call(authHandler, { method: "PUT", url: "/api/auth/me", headers: {} });
  check(
    "/api/auth/me refuses a bad method before anything else (as api/auth/me.js did)",
    me.statusCode === 405 && me.body.error === "Method not allowed",
    `${me.statusCode} ${JSON.stringify(me.body)}`
  );
  const user = await call(authHandler, { method: "PUT", url: "/api/auth/user", headers: {} });
  check(
    "/api/auth/user reports its missing config before it looks at the method (as api/auth/user.js did)",
    user.statusCode === 500 && user.body.error === "Supabase not configured",
    `${user.statusCode} ${JSON.stringify(user.body)}`
  );
}

// With Supabase configured (dummy values — a bare client is created, no request
// is made because every case below is refused before it could be).
process.env.VITE_SUPABASE_URL = "https://check-api-functions.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-for-checks-only";
{
  const me = await call(authHandler, { method: "GET", url: "/api/auth/me", headers: {} });
  check(
    "/api/auth/me with no token → 401 with the same message and a null user",
    me.statusCode === 401 && me.body.error === "No authorization header" && me.body.user === null,
    `${me.statusCode} ${JSON.stringify(me.body)}`
  );
  const user = await call(authHandler, { method: "GET", url: "/api/auth/user", headers: {} });
  check(
    "/api/auth/user with no token → 401 with its own message and no user key",
    user.statusCode === 401 && user.body.error === "No auth header" && !("user" in user.body),
    `${user.statusCode} ${JSON.stringify(user.body)}`
  );
  const post = await call(authHandler, { method: "POST", url: "/api/auth/user", headers: {}, body: {} });
  check(
    "/api/auth/user POST without email or password → 400",
    post.statusCode === 400 && post.body.error === "Email and password required",
    `${post.statusCode} ${JSON.stringify(post.body)}`
  );
  // Vercel hands the segment over as req.query.action; the handler also reads
  // the URL, so it cannot depend on how the param arrives.
  const viaQuery = await call(authHandler, { method: "GET", url: "/api/auth/me", query: { action: "me" }, headers: {} });
  check("the action is taken from the routed param when it is present", viaQuery.statusCode === 401 && viaQuery.body.user === null);
  const viaArrayQuery = await call(authHandler, { method: "GET", url: "/api/auth/user", query: { action: ["user"] }, headers: {} });
  check("a catch-all-style array param resolves to the same place", viaArrayQuery.statusCode === 401 && viaArrayQuery.body.error === "No auth header");
}
{
  const unknown = await call(authHandler, { method: "GET", url: "/api/auth/register", headers: {} });
  check(
    "a path under /api/auth/ that was never a route answers JSON 404 (not the app's HTML)",
    unknown.statusCode === 404 && unknown.body.error === "Not found",
    `${unknown.statusCode} ${JSON.stringify(unknown.body)}`
  );
  const bare = await call(authHandler, { method: "GET", url: "/api/auth", headers: {} });
  check("a request with no action at all answers the same 404", bare.statusCode === 404);
}

if (realUrl === undefined) delete process.env.VITE_SUPABASE_URL;
else process.env.VITE_SUPABASE_URL = realUrl;
if (realKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
else process.env.SUPABASE_SERVICE_ROLE_KEY = realKey;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
