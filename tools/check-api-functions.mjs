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
// That consolidation itself produced the third lesson (2026-09-24):
// api/auth/[action].js never registered, because a bracketed filename is a
// Next.js feature and this is a plain Vite project — Vercel read "[action]" as a
// literal segment, so /api/auth/me fell through to the SPA rewrite and answered
// index.html. The function is now api/auth.js (non-dynamic) reached through a
// vercel.json rewrite, and this file guards that shape: no bracketed name under
// api/, the rewrite present and ordered before the SPA fallback, and the handler
// answering for both the rewritten (?action=…) and bare-URL deliveries.
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
section("the two auth lookups still answer, in one routed function");

const AUTH_FILE = "api/auth.js";
// A bracketed filename is a dynamic route in Next.js only. This project builds
// api/ with Vercel's plain Serverless Functions convention, where "[action]" is
// a literal path segment — so the old api/auth/[action].js matched nothing and
// /api/auth/me fell through to index.html. Guard the whole class of mistake.
const bracketed = apiFiles.filter((f) => /[[\]]/.test(f));
check(
  "no file under api/ uses a bracketed (dynamic) name — Vercel supports those in Next.js, not here",
  bracketed.length === 0,
  bracketed.join(", ")
);
check("api/auth.js is the one auth function", existsSync(join(root, AUTH_FILE)));
check(
  "api/auth/[action].js is gone (its dynamic name never matched a URL)",
  !existsSync(join(root, "api/auth/[action].js"))
);
check("api/auth/me.js is gone (its path is served by the consolidated function)", !existsSync(join(root, "api/auth/me.js")));
check("api/auth/user.js is gone (its path is served by the consolidated function)", !existsSync(join(root, "api/auth/user.js")));

// What replaced the dynamic filename: one rewrite that turns the path segment
// into a query parameter (Vercel's documented behaviour for a named source
// segment — their own example turns /resize/:width/:height into
// /api/sharp?width=800&height=600).
function rewriteMatches(source, path) {
  const pattern = source
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // everything is literal…
    .replace(/:([A-Za-z0-9_]+)/g, "([^/]+)"); // …except a named segment
  const m = new RegExp(`^${pattern}$`).exec(path);
  return m ? m.slice(1) : null;
}
const vercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const rewrites = Array.isArray(vercelConfig.rewrites) ? vercelConfig.rewrites : [];
const authRuleIndex = rewrites.findIndex(
  (r) => r && r.source === "/api/auth/:action" && r.destination === "/api/auth"
);
const spaIndex = rewrites.findIndex((r) => r && r.destination === "/index.html");
check(
  "vercel.json routes /api/auth/:action to the single non-dynamic auth function",
  authRuleIndex !== -1,
  JSON.stringify(rewrites)
);
check(
  "that rule is evaluated before the SPA fallback (Vercel takes the first match)",
  authRuleIndex !== -1 && spaIndex !== -1 && authRuleIndex < spaIndex,
  `auth rule at ${authRuleIndex}, SPA fallback at ${spaIndex}`
);
check(
  "the rewrite matches both live paths and hands the segment over",
  JSON.stringify(rewriteMatches("/api/auth/:action", "/api/auth/me")) === JSON.stringify(["me"]) &&
    JSON.stringify(rewriteMatches("/api/auth/:action", "/api/auth/user")) === JSON.stringify(["user"]),
  `${JSON.stringify(rewriteMatches("/api/auth/:action", "/api/auth/me"))} / ${JSON.stringify(rewriteMatches("/api/auth/:action", "/api/auth/user"))}`
);
check(
  "the rewrite does not swallow the function's own path (/api/auth stays itself)",
  rewriteMatches("/api/auth/:action", "/api/auth") === null
);
check(
  "the auth function explains why a dynamic filename cannot be used here",
  /Next\.js/.test(readFileSync(join(root, AUTH_FILE), "utf8"))
);

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
const authHandler = (await import("../api/auth.js")).default;

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
  // The delivery the vercel.json rewrite actually produces in production:
  // /api/auth/me arrives as /api/auth?action=me. This is the one that must work.
  const viaRewrite = await call(authHandler, {
    method: "GET",
    url: "/api/auth?action=me",
    query: { action: "me" },
    headers: {},
  });
  check(
    "delivered as the rewrite delivers it (?action=me) it answers the same JSON 401",
    viaRewrite.statusCode === 401 &&
      viaRewrite.body.error === "No authorization header" &&
      viaRewrite.body.user === null,
    `${viaRewrite.statusCode} ${JSON.stringify(viaRewrite.body)}`
  );
  const viaRewriteUser = await call(authHandler, {
    method: "GET",
    url: "/api/auth?action=user",
    query: { action: "user" },
    headers: {},
  });
  check(
    "the same delivery for /api/auth/user",
    viaRewriteUser.statusCode === 401 && viaRewriteUser.body.error === "No auth header",
    `${viaRewriteUser.statusCode} ${JSON.stringify(viaRewriteUser.body)}`
  );
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

// --- the chat's consolidation: two sync routes now share one function ---------
// PR "teacher↔student chat — PR 1" needed a Serverless Function for
// api/messages.js and api/ was exactly at the cap, so /api/progress/sync and
// /api/planner/sync were folded into ONE non-dynamic api/sync.js (their bodies
// moved to api/_lib/, which Vercel does not count) and vercel.json keeps both
// original URLs. Same shape as the auth consolidation above, same two ways to
// get it wrong: a rule in the wrong order, or the legacy path answering HTML.
section("the two sync routes still answer, in one routed function");
const SYNC_FILE = "api/sync.js";
check("api/sync.js is the one sync function", existsSync(join(root, SYNC_FILE)));
check(
  "the two files it replaced are gone",
  !existsSync(join(root, "api/progress/sync.js")) && !existsSync(join(root, "api/planner/sync.js"))
);
check(
  "their handler bodies moved into _lib/ (which does not count against the cap) and both export a handler",
  existsSync(join(root, "api/_lib/sync-progress.js")) &&
    existsSync(join(root, "api/_lib/sync-planner.js")) &&
    /export default async function handler/.test(readFileSync(join(root, "api/_lib/sync-progress.js"), "utf8")) &&
    /export default async function handler/.test(readFileSync(join(root, "api/_lib/sync-planner.js"), "utf8"))
);
const progressRuleIndex = rewrites.findIndex((r) => r && r.source === "/api/progress/sync");
const plannerRuleIndex = rewrites.findIndex((r) => r && r.source === "/api/planner/sync");
const apiPassthroughIndex = rewrites.findIndex((r) => r && r.destination === "/api/$1");
check(
  "vercel.json routes both legacy sync URLs to the one function",
  progressRuleIndex !== -1 &&
    rewrites[progressRuleIndex].destination === "/api/sync?module=progress" &&
    plannerRuleIndex !== -1 &&
    rewrites[plannerRuleIndex].destination === "/api/sync?module=planner",
  JSON.stringify(rewrites)
);
check(
  "both rules are evaluated before the /api passthrough and the SPA fallback",
  progressRuleIndex !== -1 && plannerRuleIndex !== -1 && spaIndex !== -1 &&
    apiPassthroughIndex !== -1 && progressRuleIndex < apiPassthroughIndex && plannerRuleIndex < apiPassthroughIndex &&
    progressRuleIndex < spaIndex && plannerRuleIndex < spaIndex,
  `progress ${progressRuleIndex}, planner ${plannerRuleIndex}, api passthrough ${apiPassthroughIndex}, spa ${spaIndex}`
);
check(
  "the routed param is `module`, not `action` (the planner's own URL already uses ?action=load)",
  !rewrites.some((r) => /^\/api\/sync\?action=/.test(r.destination || "")),
  JSON.stringify(rewrites.map((r) => r.destination))
);
const syncHandler = (await import("../api/sync.js")).default;
{
  // None of these requests reaches Supabase: each is refused before a client
  // call could happen, which is what makes this safe to assert without a stub.
  const noModule = await call(syncHandler, { method: "GET", url: "/api/sync", headers: {} });
  check(
    "no module at all answers JSON 404 (never the app's HTML)",
    noModule.statusCode === 404 && noModule.body.error === "Not found",
    `${noModule.statusCode} ${JSON.stringify(noModule.body)}`
  );
  const junkModule = await call(syncHandler, { method: "GET", url: "/api/sync?module=nope", query: { module: "nope" }, headers: {} });
  check("an unknown module is the same JSON 404", junkModule.statusCode === 404 && junkModule.body.error === "Not found");
  const progressAsRewritten = await call(syncHandler, {
    method: "POST",
    url: "/api/sync?module=progress",
    query: { module: "progress" },
    headers: {},
  });
  check(
    "delivered as the rewrite delivers it, the progress handler still answers first",
    progressAsRewritten.statusCode === 401 && progressAsRewritten.body.error === "Missing authorization header",
    `${progressAsRewritten.statusCode} ${JSON.stringify(progressAsRewritten.body)}`
  );
  const plannerAsRewritten = await call(syncHandler, {
    method: "GET",
    url: "/api/sync?module=planner",
    query: { module: "planner" },
    headers: {},
  });
  check(
    "and the planner keeps its own 401 wording",
    plannerAsRewritten.statusCode === 401 && plannerAsRewritten.body.error === "No auth header",
    `${plannerAsRewritten.statusCode} ${JSON.stringify(plannerAsRewritten.body)}`
  );
  const legacyProgressPath = await call(syncHandler, { method: "GET", url: "/api/progress/sync", headers: {} });
  check(
    "the request path alone resolves the progress module (no query param needed)",
    legacyProgressPath.statusCode === 405 && legacyProgressPath.body.error === "Method not allowed",
    `${legacyProgressPath.statusCode} ${JSON.stringify(legacyProgressPath.body)}`
  );
  const legacyPlannerPath = await call(syncHandler, { method: "GET", url: "/api/planner/sync?action=load", headers: {} });
  check(
    "the planner's legacy path (and its own ?action=load) still resolves to the planner",
    legacyPlannerPath.statusCode === 401 && legacyPlannerPath.body.error === "No auth header",
    `${legacyPlannerPath.statusCode}`
  );
  const badMethod = await call(syncHandler, { method: "PUT", url: "/api/sync?module=progress", query: { module: "progress" }, headers: {} });
  check(
    "a bad method is refused by the module's own 405, not by the dispatcher",
    badMethod.statusCode === 405 && badMethod.body.error === "Method not allowed",
    `${badMethod.statusCode}`
  );
}

if (realUrl === undefined) delete process.env.VITE_SUPABASE_URL;
else process.env.VITE_SUPABASE_URL = realUrl;
if (realKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
else process.env.SUPABASE_SERVICE_ROLE_KEY = realKey;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
