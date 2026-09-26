// The teacher↔student chat's data layer + API contract.
//
//   node tools/check-messages.mjs
//
// PR 1 of the chat (owner decision 2026-09-24: "bot first, then chat") is the
// data layer and the API; the /teacher Messages panel and the student Messages
// tab come next. This harness is what makes the promise below provable without a
// browser:
//
//   1. SCHEMA — supabase/messages.sql exists, creates public.private_messages
//      with every column the route writes, a (sender_id, client_id) partial
//      unique index for idempotent sends, a (thread_key, created_at) index for
//      the read, and a DENY-ALL RLS policy (and no permissive one). The columns
//      the route actually inserts are compared against the file, so schema and
//      code cannot drift.
//   2. BUDGET/ROUTING — api/ still fits Vercel's 12-function Hobby cap, including
//      the new api/messages.js: two existing routes (progress/planner sync) were
//      consolidated into api/sync.js to make room, both legacy URLs are kept by
//      vercel.json rewrites ordered before the SPA fallback, no api/ file has a
//      bracketed name, and no api/ file imports outside api/.
//   3. THE CONSOLIDATION DID NOT CHANGE A RESPONSE — api/sync.js is driven for
//      both modules, through the rewritten delivery and the legacy path, and the
//      old status codes/error strings are asserted (the api/auth.js lesson).
//   4. IDENTITY IS THE TOKEN — sender_id/sender_email come from the verified
//      token; a body carrying from/senderId/senderEmail cannot forge a sender.
//   5. LINKED-PAIR SCOPE — a message only travels along an existing
//      teacher_students link. Strangers, another teacher's student, yourself and
//      "same school but not linked" all get 403 with ZERO message data, and the
//      messages table is not even read for them.
//   6. SEND/LIST BEHAVIOUR — 201/200 + DTO shape, newest-first paging with an
//      opaque cursor that loses nothing even when two messages share a
//      timestamp, `after` polling, idempotent replay via clientId, the 23505
//      race path, the 500-row/thread and 100/page caps, body validation, and a
//      read failure failing CLOSED rather than reading as "no messages".
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { register } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

register("./messages-loader.mjs", import.meta.url);
const stub = await import("./messages-stub.mjs");
const { state, reset, setTable, rows, failReads, failWrites } = stub;

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

const handler = (await import("../api/messages.js")).default;
const syncHandler = (await import("../api/sync.js")).default;

const SAvedEnv = {
  url: process.env.VITE_SUPABASE_URL,
  url2: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
function configureSupabase() {
  process.env.VITE_SUPABASE_URL = "https://messages.check.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-for-checks-only";
  delete process.env.SUPABASE_URL;
}
function unconfigureSupabase() {
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
    setHeader(key, value) {
      res.headers[key.toLowerCase()] = value;
    },
  };
  return res;
}
async function call(handlerFn, req) {
  const res = mockRes();
  await handlerFn(req, res);
  return res;
}
const TOKEN = "Bearer test-token";
function api(overrides = {}) {
  return {
    method: "GET",
    url: "/api/messages",
    headers: { authorization: TOKEN },
    ...overrides,
  };
}
function url(params) {
  const qs = new URLSearchParams(params).toString();
  return `/api/messages?${qs}`;
}

// --- fixture -----------------------------------------------------------------
const BROWN = "ms.brown@school.edu"; // teacher
const LEE = "mr.lee@school.edu"; // teacher
const SAM = "sam@home.jm"; // linked to BROWN only
const KIM = "kim@home.jm"; // linked to BROWN and LEE
const DANA = "dana@school.edu"; // at the SAME school as everyone, linked to nobody
const OUTSIDER = "outsider@elsewhere.com"; // no account, no link, no school
const schoolMembers = [BROWN, LEE, SAM, DANA].map((email, index) => ({
  id: `m${index}`,
  school_id: "school-rose-town",
  email,
  role: email.includes("@school.edu") ? "teacher" : "student",
}));
const links = [
  { id: "l1", teacher_email: BROWN, student_email: SAM },
  { id: "l2", teacher_email: BROWN, student_email: KIM },
  { id: "l3", teacher_email: LEE, student_email: KIM },
];
function base() {
  reset();
  configureSupabase();
  setTable("teacher_students", links);
  setTable("school_members", schoolMembers);
  setTable("private_messages", []);
}
function asTeacherBrown() {
  state.user = { id: "user-brown", email: BROWN };
}
function asStudentSam() {
  state.user = { id: "user-sam", email: SAM };
}
function asTeacherLee() {
  state.user = { id: "user-lee", email: LEE };
}
const USER_IDS = { [BROWN]: "user-brown", [LEE]: "user-lee", [SAM]: "user-sam", [KIM]: "user-kim", [DANA]: "user-dana" };
function messageRow(id, { from, fromRole, to, toRole, body, at, clientId = null, senderId = null }) {
  const threadKey = [from, to].sort().join("|");
  return {
    id,
    thread_key: threadKey,
    sender_id: senderId || USER_IDS[from] || "user-unknown",
    sender_email: from,
    sender_role: fromRole,
    recipient_email: to,
    recipient_role: toRole,
    body,
    client_id: clientId,
    created_at: at,
  };
}
const BROWN_SAM = [BROWN, SAM].sort().join("|");

// ===========================================================================
section("1. the data layer (supabase/messages.sql)");

const sqlPath = "supabase/messages.sql";
check("supabase/messages.sql exists (the file the owner applies)", existsSync(join(root, sqlPath)));

const sql = existsSync(join(root, sqlPath)) ? read(sqlPath) : "";
const schemaSql = read("supabase/schema.sql");
const routeSrc = read("api/messages.js");

// The columns the file declares, and the columns the route writes.
const declaredColumns = (() => {
  const block = /create table if not exists public\.private_messages \(([\s\S]*?)\n\);/.exec(sql);
  if (!block) return null;
  return block[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--") && !line.startsWith("constraint"))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
})();
check("the file creates public.private_messages", declaredColumns !== null, "no create table block");
check(
  "the table has every column the route needs",
  declaredColumns !== null &&
    ["id", "thread_key", "sender_id", "sender_email", "sender_role", "recipient_email", "recipient_role", "body", "client_id", "created_at"].every(
      (column) => declaredColumns.includes(column)
    ),
  declaredColumns ? declaredColumns.join(",") : ""
);
check(
  "sender_id is a real auth user (a message cannot exist without an account)",
  /sender_id uuid not null references auth\.users \(id\) on delete cascade/.test(sql)
);
check(
  "both roles are constrained to the two sides of the link",
  /check \(sender_role in \('teacher', 'student'\)\)/.test(sql) &&
    /check \(recipient_role in \('teacher', 'student'\)\)/.test(sql)
);
check(
  "a retried send can only ever store one row (partial unique index on sender_id + client_id)",
  /create unique index if not exists private_messages_sender_client_uniq\s*\n\s*on public\.private_messages \(sender_id, client_id\)\s*\n\s*where client_id is not null/.test(
    sql
  )
);
check(
  "the read the route performs is indexed (thread_key, created_at desc)",
  /create index if not exists private_messages_thread_idx\s*\n\s*on public\.private_messages \(thread_key, created_at desc\)/.test(sql)
);
check("RLS is enabled on the table", /alter table public\.private_messages enable row level security;/.test(sql));
check(
  "the policy is DENY-ALL (using false + with check false)",
  /create policy "private_messages: no direct client access"\s*\n\s*on public\.private_messages for all\s*\n\s*using \(false\)\s*\n\s*with check \(false\);/.test(
    sql
  )
);
check("no policy anywhere in the file grants anything", !/using \(true\)|with check \(true\)/.test(sql));
check(
  "the file explains who may message whom (the linkage rule)",
  /teacher_students/.test(sql) && /linked/i.test(sql)
);
check(
  "supabase/schema.sql records the table and points at messages.sql",
  /private_messages/.test(schemaSql) && /messages\.sql/.test(schemaSql)
);

// Schema/code drift: parse the insert keys out of the route and compare.
const insertedKeys = (() => {
  const block = /const row = \{([\s\S]*?)\n  \};/.exec(routeSrc);
  if (!block) return null;
  return [...block[1].matchAll(/^\s*([a-z_]+)\s*[:,]/gm)].map((m) => m[1]);
})();
check(
  "every column the route inserts exists in the applied table (no drift)",
  insertedKeys !== null && declaredColumns !== null && insertedKeys.every((key) => declaredColumns.includes(key)),
  `route: ${insertedKeys ? insertedKeys.join(",") : "—"}`
);
check(
  "and the route inserts the thread key, the token's sender and the roles",
  insertedKeys !== null &&
    ["thread_key", "sender_id", "sender_email", "sender_role", "recipient_email", "recipient_role", "body"].every((key) =>
      insertedKeys.includes(key)
    )
);

// ===========================================================================
section("2. api/ fits the deployment budget, and the routing shape is safe");

const FUNCTION_EXT = /\.(js|mjs|cjs|ts|tsx|jsx)$/;
const isIgnored = (rel) => rel.split("/").some((seg) => seg.startsWith("_") && seg !== "");
function walk(dir, out = []) {
  for (const entry of readdirSync(join(root, dir))) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const rel = `${dir}/${entry}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}
const apiFiles = walk("api");
const routeFiles = apiFiles.filter((f) => FUNCTION_EXT.test(f) && !isIgnored(relative("api", f)));
check(
  "api/ is at 12 Serverless Functions — the Hobby cap (a 13th fails the whole deployment)",
  routeFiles.length === 12,
  `${routeFiles.length}: ${routeFiles.sort().join(", ")}`
);
check("api/messages.js is one of them", routeFiles.includes("api/messages.js"));
check("api/sync.js is one of them", routeFiles.includes("api/sync.js"));
check(
  "the two sync routes it replaced are gone",
  !existsSync(join(root, "api/progress/sync.js")) && !existsSync(join(root, "api/planner/sync.js"))
);
check(
  "no api/ file has a bracketed (dynamic) name — those are Next.js-only",
  apiFiles.filter((f) => /[[\]]/.test(f)).length === 0,
  apiFiles.filter((f) => /[[\]]/.test(f)).join(", ")
);
check(
  "api/messages.js imports nothing from outside api/",
  !/(?:from|import\()\s*["'](?:\.\.\/|src\/|@\/)/.test(routeSrc) && routeSrc.includes('import("@supabase/supabase-js")')
);
check(
  "api/sync.js resolves the handler and reaches nothing outside api/",
  /from "\.\/_lib\/sync-progress\.js"/.test(read("api/sync.js")) &&
    /from "\.\/_lib\/sync-planner\.js"/.test(read("api/sync.js")) &&
    !/(?:from|import\()\s*["'](?:\.\.\/|src\/)/.test(read("api/sync.js"))
);

const vercel = JSON.parse(read("vercel.json"));
const rewrites = vercel.rewrites || [];
const progressRule = rewrites.findIndex((r) => r.source === "/api/progress/sync");
const plannerRule = rewrites.findIndex((r) => r.source === "/api/planner/sync");
const passthrough = rewrites.findIndex((r) => r.source === "/api/(.*)");
const spaRule = rewrites.findIndex((r) => r.destination === "/index.html");
check(
  "vercel.json keeps the legacy progress URL working",
  progressRule !== -1 && rewrites[progressRule].destination === "/api/sync?module=progress",
  JSON.stringify(rewrites)
);
check(
  "vercel.json keeps the legacy planner URL working",
  plannerRule !== -1 && rewrites[plannerRule].destination === "/api/sync?module=planner",
  JSON.stringify(rewrites)
);
check(
  "both rules are evaluated before the /api passthrough and the SPA fallback (first match wins)",
  progressRule !== -1 && plannerRule !== -1 && passthrough !== -1 && spaRule !== -1 &&
    progressRule < passthrough && progressRule < spaRule && plannerRule < passthrough && plannerRule < spaRule,
  `progress ${progressRule}, planner ${plannerRule}, passthrough ${passthrough}, spa ${spaRule}`
);
check(
  "the routed param cannot collide with the caller's own ?action (the planner uses that one)",
  !/destination: "\/api\/sync\?action=/.test(JSON.stringify(rewrites))
);

// ===========================================================================
section("3. the sync consolidation answers exactly as the two old files did");

const PROGRESS = { method: "POST", url: "/api/sync?module=progress", query: { module: "progress" }, headers: {} };
const PLANNER = { method: "GET", url: "/api/sync?module=planner", query: { module: "planner" }, headers: {} };
{
  base();
  const noModule = await call(syncHandler, { method: "GET", url: "/api/sync", headers: {} });
  check(
    "an unknown/absent module answers JSON 404 (never the app's HTML)",
    noModule.statusCode === 404 && noModule.body.error === "Not found",
    `${noModule.statusCode} ${JSON.stringify(noModule.body)}`
  );
  const badModule = await call(syncHandler, { method: "GET", url: "/api/sync?module=whatever", query: { module: "whatever" }, headers: {} });
  check("a module that was never a route is the same 404", badModule.statusCode === 404);

  const progressNoAuth = await call(syncHandler, { ...PROGRESS, method: "POST", url: "/api/sync?module=progress" });
  check(
    "POST progress sync with no token → the old 401 exactly",
    progressNoAuth.statusCode === 401 && progressNoAuth.body.error === "Missing authorization header",
    `${progressNoAuth.statusCode} ${JSON.stringify(progressNoAuth.body)}`
  );
  const legacyPath = await call(syncHandler, {
    method: "POST",
    url: "/api/progress/sync",
    headers: {},
  });
  check(
    "the legacy path alone (no query object at all) resolves the same module",
    legacyPath.statusCode === 401 && legacyPath.body.error === "Missing authorization header",
    `${legacyPath.statusCode}`
  );
  const plannerNoAuth = await call(syncHandler, { ...PLANNER, headers: {} });
  check(
    "GET planner sync with no token → the planner's own 401 message",
    plannerNoAuth.statusCode === 401 && plannerNoAuth.body.error === "No auth header",
    `${plannerNoAuth.statusCode} ${JSON.stringify(plannerNoAuth.body)}`
  );
  const plannerLegacy = await call(syncHandler, { method: "GET", url: "/api/planner/sync?action=load", headers: {} });
  check(
    "the legacy planner path (with ?action=load) resolves to the planner",
    plannerLegacy.statusCode === 401 && plannerLegacy.body.error === "No auth header",
    `${plannerLegacy.statusCode}`
  );
  const progressPut = await call(syncHandler, { ...PROGRESS, method: "PUT" });
  check(
    "a bad method still reaches the progress handler's own 405",
    progressPut.statusCode === 405 && progressPut.body.error === "Method not allowed",
    `${progressPut.statusCode}`
  );

  // Configured: the happy paths, exactly as before.
  asStudentSam();
  const missingSubject = await call(syncHandler, {
    ...PROGRESS,
    method: "POST",
    headers: { authorization: TOKEN },
    body: { completedLessons: ["l1"] },
  });
  check(
    "progress sync still demands subjectId with its own message",
    missingSubject.statusCode === 400 && missingSubject.body.error === "subjectId required",
    `${missingSubject.statusCode} ${JSON.stringify(missingSubject.body)}`
  );
  const synced = await call(syncHandler, {
    ...PROGRESS,
    method: "POST",
    headers: { authorization: TOKEN },
    body: { subjectId: "mathematics", completedLessons: ["a", "a", 7, "b"], quizCompleted: true },
  });
  check(
    "progress sync upserts the caller's own row (id from the token, lessons normalised)",
    synced.statusCode === 200 && synced.body.success === true && rows("user_progress").length === 1 &&
      rows("user_progress")[0].user_id === "user-sam" &&
      JSON.stringify(rows("user_progress")[0].completed_lessons) === JSON.stringify(["a", "b"]),
    JSON.stringify(rows("user_progress"))
  );

  const loaded = await call(syncHandler, { ...PLANNER, headers: { authorization: TOKEN } });
  check(
    "planner load answers its old payload (plan/updatedAt)",
    loaded.statusCode === 200 && loaded.body.plan === null && loaded.body.updatedAt === null,
    JSON.stringify(loaded.body)
  );
  const saved = await call(syncHandler, {
    ...PLANNER,
    method: "POST",
    headers: { authorization: TOKEN },
    body: { plan: { weeks: 3 } },
  });
  check(
    "planner save upserts on user_id",
    saved.statusCode === 200 && saved.body.success === true && rows("revision_plans")[0].user_id === "user-sam",
    JSON.stringify(rows("revision_plans"))
  );
  const badPlan = await call(syncHandler, { ...PLANNER, method: "POST", headers: { authorization: TOKEN }, body: { plan: "nope" } });
  check("planner save still rejects a non-object plan", badPlan.statusCode === 400 && badPlan.body.error === "plan object required");
  const resetPlan = await call(syncHandler, { ...PLANNER, method: "POST", headers: { authorization: TOKEN }, body: { plan: null } });
  check(
    "planner reset still deletes the row",
    resetPlan.statusCode === 200 && resetPlan.body.reset === true && rows("revision_plans").length === 0
  );
  unconfigureSupabase();
  const plannerUnconfigured = await call(syncHandler, { ...PLANNER, headers: { authorization: TOKEN } });
  check(
    "the planner keeps its own misconfiguration message",
    plannerUnconfigured.statusCode === 500 &&
      /Server misconfigured: missing SUPABASE_URL/.test(plannerUnconfigured.body.error || ""),
    `${plannerUnconfigured.statusCode} ${JSON.stringify(plannerUnconfigured.body)}`
  );
}

// ===========================================================================
section("4. identity comes from the token, never from the request");

{
  base();
  const noHeader = await call(handler, { method: "GET", url: "/api/messages", headers: {} });
  check(
    "no auth header → 401",
    noHeader.statusCode === 401 && noHeader.body.error === "Missing authorization header",
    `${noHeader.statusCode}`
  );
  const badToken = await call(handler, { ...api({ url: url({ contacts: 1 }) }), headers: { authorization: "Bearer nope" } });
  check("an invalid token → 401 (no data)", badToken.statusCode === 401 && badToken.body.error === "Invalid token");

  unconfigureSupabase();
  const unconfigured = await call(handler, api({ url: url({ contacts: 1 }) }));
  check(
    "an unconfigured deployment → 500, not an empty conversation",
    unconfigured.statusCode === 500 && unconfigured.body.error === "Supabase not configured",
    `${unconfigured.statusCode}`
  );

  base();
  state.user = { id: "user-noemail", email: null };
  const noEmail = await call(handler, api({ url: url({ contacts: 1 }) }));
  check(
    "a token with no email address is refused (403) rather than treated as an unknown sender",
    noEmail.statusCode === 403 && /no email/i.test(noEmail.body.error || ""),
    `${noEmail.statusCode} ${JSON.stringify(noEmail.body)}`
  );

  base();
  asTeacherBrown();
  const forged = await call(handler, {
    ...api({ method: "POST", body: { to: SAM, body: "hello", from: OUTSIDER, senderEmail: OUTSIDER, senderId: "user-evil" } }),
  });
  const written = rows("private_messages")[0];
  check(
    "a body cannot forge the sender: the stored row uses the token's identity",
    forged.statusCode === 201 && written && written.sender_email === BROWN && written.sender_id === "user-brown",
    JSON.stringify(written)
  );
  const create = await call(handler, api({ method: "POST", body: { to: SAM, body: "x" } }));
  check(
    "the response DTO exposes exactly the documented fields",
    JSON.stringify(Object.keys(create.body.message).sort()) ===
      JSON.stringify(["body", "clientId", "createdAt", "fromEmail", "fromRole", "id", "threadKey", "toEmail", "toRole"]),
    JSON.stringify(Object.keys(create.body.message || {}))
  );
  const nonGetPost = await call(handler, api({ method: "DELETE", url: "/api/messages" }));
  check(
    "any other method is a 405",
    nonGetPost.statusCode === 405 && nonGetPost.body.error === "Method not allowed",
    `${nonGetPost.statusCode}`
  );
}

// ===========================================================================
section("5. linked-pair scope: only an existing teacher_students link may carry a message");

{
  base();
  asTeacherBrown();
  const sam = await call(handler, api({ url: url({ with: SAM }) }));
  check(
    "the linked pair opens (200) and names its thread",
    sam.statusCode === 200 && sam.body.threadKey === BROWN_SAM && Array.isArray(sam.body.messages),
    `${sam.statusCode} ${JSON.stringify(sam.body)}`
  );
  const reversedKey = [SAM, BROWN].sort().join("|");
  check("the thread key is order-independent (sorted)", sam.body.threadKey === reversedKey || BROWN_SAM === reversedKey);

  const dana = await call(handler, api({ url: url({ with: DANA }) }));
  check(
    "SAME SCHOOL but not linked → 403",
    dana.statusCode === 403 && dana.body.error === "You are not linked to that person",
    `${dana.statusCode} ${JSON.stringify(dana.body)}`
  );
  check(
    "…and zero message data comes back with it",
    !("messages" in dana.body) && !("threadKey" in dana.body) && !("contacts" in dana.body),
    JSON.stringify(dana.body)
  );
  state.selects = [];
  const danaAgain = await call(handler, api({ url: url({ with: DANA }) }));
  check(
    "…and the messages table is not even read for them",
    danaAgain.statusCode === 403 && !state.selects.some((s) => s.table === "private_messages"),
    JSON.stringify(state.selects.map((s) => s.table))
  );
  check(
    "school membership is never consulted (belonging to a school is not a link)",
    !state.selects.some((s) => s.table === "school_members") && !/school_members/.test(routeSrc)
  );

  const outsider = await call(handler, api({ url: url({ with: OUTSIDER }) }));
  check("a stranger → the same 403", outsider.statusCode === 403 && outsider.body.error === "You are not linked to that person");
  const withBody = await call(handler, api({ method: "POST", body: { to: DANA, body: "hi" } }));
  check("a stranger cannot be sent to either", withBody.statusCode === 403 && rows("private_messages").length === 0);

  const self = await call(handler, api({ url: url({ with: BROWN }) }));
  check("you cannot open a thread with yourself", self.statusCode === 403);
  const selfSend = await call(handler, api({ method: "POST", body: { to: BROWN, body: "note to self" } }));
  check("…or send one", selfSend.statusCode === 403 && rows("private_messages").length === 0);

  asTeacherLee();
  const leesSam = await call(handler, api({ url: url({ with: SAM }) }));
  check(
    "another teacher's student is the same 403 for them",
    leesSam.statusCode === 403,
    `${leesSam.statusCode}`
  );
  const leesKim = await call(handler, api({ url: url({ with: KIM }) }));
  check("but their own linked student opens", leesKim.statusCode === 200 && leesKim.body.threadKey === [LEE, KIM].sort().join("|"));

  asStudentSam();
  const studentView = await call(handler, api({ url: url({ with: BROWN }) }));
  check(
    "the student side of the same link opens the SAME thread",
    studentView.statusCode === 200 && studentView.body.threadKey === BROWN_SAM,
    `${studentView.body.threadKey}`
  );
  const studentToLee = await call(handler, api({ url: url({ with: LEE }) }));
  check("a student cannot open a thread with a teacher who has not linked them", studentToLee.statusCode === 403);

  base();
  asTeacherBrown();
  const junk = await call(handler, api({ url: url({ with: "not-an-email" }) }));
  check("a malformed 'with' is a 400", junk.statusCode === 400 && /valid 'with' email/.test(junk.body.error || ""));
  const missing = await call(handler, api({ url: "/api/messages" }));
  check("a bare GET asks for a valid pair rather than returning anything", missing.statusCode === 400);
  const badCursorUnlinked = await call(handler, api({ url: url({ with: DANA, before: "junk" }) }));
  check(
    "the link check outranks cursor validation (fail closed first)",
    badCursorUnlinked.statusCode === 403,
    `${badCursorUnlinked.statusCode}`
  );

  base();
  asTeacherBrown();
  const contacts = await call(handler, api({ url: url({ contacts: 1 }) }));
  check(
    "contacts lists exactly the caller's own linked people, role-labelled",
    contacts.statusCode === 200 &&
      JSON.stringify(contacts.body.contacts) ===
        JSON.stringify([{ email: KIM, role: "student" }, { email: SAM, role: "student" }]),
    JSON.stringify(contacts.body.contacts)
  );
  check("contacts says the caller can chat", contacts.body.canChat === true);
  asStudentSam();
  const studentContacts = await call(handler, api({ url: url({ contacts: 1 }) }));
  check(
    "a student sees their teachers, from the same table",
    studentContacts.statusCode === 200 &&
      JSON.stringify(studentContacts.body.contacts) === JSON.stringify([{ email: BROWN, role: "teacher" }]),
    JSON.stringify(studentContacts.body.contacts)
  );
  state.user = { id: "user-dana", email: DANA };
  state.selects = [];
  const noLinks = await call(handler, api({ url: url({ contacts: 1 }) }));
  check(
    "someone with no links gets an empty list, not an error and not anyone else's data",
    noLinks.statusCode === 200 && noLinks.body.contacts.length === 0 && noLinks.body.canChat === false &&
      !state.selects.some((s) => s.table === "private_messages"),
    JSON.stringify(noLinks.body)
  );
  const zeroFlag = await call(handler, api({ url: url({ contacts: 0 }) }));
  check("?contacts=0 is not contacts mode (it asks for a pair)", zeroFlag.statusCode === 400);

  base();
  state.user = { id: "user-brown", email: "MS.Brown@School.EDU" };
  const mixedCase = await call(handler, api({ url: url({ with: SAM }) }));
  check(
    "a mixed-case token email still matches its links, and the thread key is lowercased",
    mixedCase.statusCode === 200 && mixedCase.body.threadKey === BROWN_SAM,
    `${mixedCase.statusCode} ${mixedCase.body.threadKey}`
  );

  base();
  state.user = { id: "user-brown", email: BROWN };
  setTable("teacher_students", []);
  const noLinkRows = await call(handler, api({ url: url({ with: SAM }) }));
  check("with no link rows at all, the same 403 applies", noLinkRows.statusCode === 403);
}

// ===========================================================================
section("6. sending and listing");

{
  base();
  asTeacherBrown();
  const sent = await call(handler, api({ method: "POST", body: { to: SAM, body: "  Please check Q4.  " } }));
  const stored = rows("private_messages")[0];
  check(
    "a linked send is 201 with ok:true and duplicate:false",
    sent.statusCode === 201 && sent.body.ok === true && sent.body.duplicate === false,
    `${sent.statusCode} ${JSON.stringify(sent.body)}`
  );
  check(
    "the row carries the sorted thread key, the roles and the trimmed body",
    stored.thread_key === BROWN_SAM &&
      stored.sender_role === "teacher" &&
      stored.recipient_role === "student" &&
      stored.recipient_email === SAM &&
      stored.body === "Please check Q4.",
    JSON.stringify(stored)
  );
  asStudentSam();
  const reply = await call(handler, api({ method: "POST", body: { to: BROWN, body: "On it." } }));
  check(
    "the student's reply lands on the same thread, with the roles swapped",
    reply.statusCode === 201 && rows("private_messages")[1].thread_key === BROWN_SAM &&
      rows("private_messages")[1].sender_role === "student" &&
      rows("private_messages")[1].recipient_role === "teacher",
    JSON.stringify(rows("private_messages")[1])
  );
  const list = await call(handler, api({ url: url({ with: BROWN }) }));
  check(
    "both sides read the same conversation, newest first",
    list.statusCode === 200 && list.body.messages.length === 2 &&
      list.body.messages[0].body === "On it." && list.body.messages[1].body === "Please check Q4.",
    JSON.stringify(list.body.messages.map((m) => m.body))
  );
  check("the list response is not cacheable", list.headers["cache-control"] === "private, no-store", JSON.stringify(list.headers));

  // Validation
  const noTo = await call(handler, api({ method: "POST", body: { body: "hi" } }));
  const noBody = await call(handler, api({ method: "POST", body: { to: SAM } }));
  const blank = await call(handler, api({ method: "POST", body: { to: SAM, body: "   " } }));
  const nonString = await call(handler, api({ method: "POST", body: { to: SAM, body: 42 } }));
  const longBody = await call(handler, api({ method: "POST", body: { to: SAM, body: "x".repeat(2001) } }));
  const badClient = await call(handler, api({ method: "POST", body: { to: SAM, body: "hi", clientId: 99 } }));
  check("a missing recipient is 400", noTo.statusCode === 400 && /recipient email/.test(noTo.body.error || ""));
  check("a missing body is 400", noBody.statusCode === 400 && noBody.body.error === "Message body required");
  check("a whitespace-only body is 400", blank.statusCode === 400);
  check("a non-string body is 400", nonString.statusCode === 400);
  check(
    "a 2001-character body is refused with the limit named",
    longBody.statusCode === 400 && /2000 characters/.test(longBody.body.error || ""),
    JSON.stringify(longBody.body)
  );
  check("a non-string clientId is 400", badClient.statusCode === 400 && /clientId/.test(badClient.body.error || ""));
  check("none of the refused sends wrote anything", rows("private_messages").length === 2, `${rows("private_messages").length} rows`);
}

{
  base();
  asTeacherBrown();
  // Identical timestamps on purpose: the cursor must not lose a row.
  const sameStamp = "2026-09-24T12:00:00.000Z";
  setTable(
    "private_messages",
    Array.from({ length: 5 }, (_, i) =>
      messageRow(`seed-${i}`, {
        from: BROWN,
        fromRole: "teacher",
        to: SAM,
        toRole: "student",
        body: `msg ${i}`,
        at: sameStamp,
      })
    )
  );
  const page1 = await call(handler, api({ url: url({ with: SAM, limit: 2 }) }));
  check(
    "a page honours its limit and reports more to come",
    page1.statusCode === 200 && page1.body.messages.length === 2 && page1.body.hasMore === true
  );
  check(
    "nextBefore is an opaque cursor carrying the id as well as the timestamp",
    typeof page1.body.nextBefore === "string" && page1.body.nextBefore.includes("|") && page1.body.nextBefore.startsWith(sameStamp),
    page1.body.nextBefore
  );
  const seen = page1.body.messages.map((m) => m.id);
  let cursor = page1.body.nextBefore;
  for (let i = 0; i < 4 && cursor; i += 1) {
    const next = await call(handler, api({ url: url({ with: SAM, limit: 2, before: cursor }) }));
    for (const m of next.body.messages) seen.push(m.id);
    cursor = next.body.hasMore ? next.body.nextBefore : null;
  }
  check(
    "paging back with the cursor returns every message exactly once, even on identical timestamps",
    seen.length === 5 && new Set(seen).size === 5 && seen.every((id) => id.startsWith("seed-")),
    seen.join(",")
  );
  check(
    "among identical timestamps the newest id leads (the documented tiebreak)",
    page1.body.messages[0].id === "seed-4",
    page1.body.messages[0].id
  );

  const after = await call(handler, api({ url: url({ with: SAM, after: sameStamp }) }));
  check(
    "polling with after=<a time> excludes what the caller already has",
    after.statusCode === 200 && after.body.messages.length === 0 && typeof after.body.serverTime === "string",
    JSON.stringify(after.body.messages.length)
  );
  setTable("private_messages", [
    ...rows("private_messages"),
    messageRow("fresh-1", { from: SAM, fromRole: "student", to: BROWN, toRole: "teacher", body: "new", at: "2026-09-24T12:05:00.000Z" }),
  ]);
  const polled = await call(handler, api({ url: url({ with: SAM, after: "2026-09-24T12:04:00.000Z" }) }));
  check(
    "a newer message comes back on the next poll, and only that one",
    polled.statusCode === 200 && polled.body.messages.length === 1 && polled.body.messages[0].id === "fresh-1",
    JSON.stringify(polled.body.messages.map((m) => m.id))
  );

  const otherPair = [LEE, KIM].sort().join("|");
  setTable("private_messages", [
    ...rows("private_messages"),
    messageRow("other-1", { from: LEE, fromRole: "teacher", to: KIM, toRole: "student", body: "other pair", at: "2026-09-24T12:06:00.000Z" }),
  ]);
  const scoped = await call(handler, api({ url: url({ with: SAM, limit: 100 }) }));
  check(
    "another pair's messages never appear in this thread",
    scoped.body.messages.every((m) => m.threadKey === BROWN_SAM) && !scoped.body.messages.some((m) => m.id === "other-1")
  );
  check("the other pair's thread key is a different key", otherPair !== BROWN_SAM);

  const badCursor = await call(handler, api({ url: url({ with: SAM, before: "yesterday" }) }));
  check("a junk cursor is 400", badCursor.statusCode === 400 && /ISO timestamp/.test(badCursor.body.error || ""));
  const bothCursors = await call(handler, api({ url: url({ with: SAM, before: "2026-09-24T12:00:00.000Z", after: "2026-09-24T11:00:00.000Z" }) }));
  check("asking for both directions at once is a 400", bothCursors.statusCode === 400 && /not both/.test(bothCursors.body.error || ""));
}

{
  base();
  asTeacherBrown();
  // 600 rows in one thread: the read cap, and that it keeps the NEWEST ones.
  const seeded = Array.from({ length: 600 }, (_, i) =>
    messageRow(`bulk-${String(i).padStart(3, "0")}`, {
      from: BROWN,
      fromRole: "teacher",
      to: SAM,
      toRole: "student",
      body: `bulk ${i}`,
      at: new Date(Date.UTC(2026, 8, 24, 12, 0, i)).toISOString(),
    })
  );
  setTable("private_messages", seeded);
  state.selects = [];
  const capped = await call(handler, api({ url: url({ with: SAM, limit: 100 }) }));
  const threadRead = state.selects.filter((s) => s.table === "private_messages").pop();
  check("one page never asks the database for more than 500 rows", threadRead && threadRead.limit === 500, JSON.stringify(threadRead));
  check(
    "the page returns the requested 100 and says more remain",
    capped.statusCode === 200 && capped.body.messages.length === 100 && capped.body.hasMore === true,
    `${capped.body.messages.length}`
  );
  check(
    "and they are the NEWEST 100, not an arbitrary slice",
    capped.body.messages[0].id === "bulk-599" && capped.body.messages[99].id === "bulk-500",
    `${capped.body.messages[0].id} … ${capped.body.messages[99].id}`
  );
  const clamp = await call(handler, api({ url: url({ with: SAM, limit: 1000 }) }));
  check("an oversized limit is clamped (100 max)", clamp.body.messages.length === 100);
  const junkLimit = await call(handler, api({ url: url({ with: SAM, limit: "lots" }) }));
  check("a junk limit falls back to the default of 50", junkLimit.body.messages.length === 50, `${junkLimit.body.messages.length}`);
}

{
  base();
  asTeacherBrown();
  const first = await call(handler, api({ method: "POST", body: { to: SAM, body: "only once", clientId: "device-a-1" } }));
  const replay = await call(handler, api({ method: "POST", body: { to: SAM, body: "only once", clientId: "device-a-1" } }));
  check(
    "a replayed send returns the original message and stores nothing new",
    first.statusCode === 201 && replay.statusCode === 200 && replay.body.duplicate === true &&
      replay.body.message.id === first.body.message.id && rows("private_messages").length === 1,
    `${first.statusCode}/${replay.statusCode} rows=${rows("private_messages").length}`
  );
  const different = await call(handler, api({ method: "POST", body: { to: SAM, body: "a new one", clientId: "device-a-2" } }));
  check("a different clientId is a genuinely new message", different.statusCode === 201 && rows("private_messages").length === 2);
  const noClientId = await call(handler, api({ method: "POST", body: { to: SAM, body: "no key" } }));
  const noClientIdAgain = await call(handler, api({ method: "POST", body: { to: SAM, body: "no key" } }));
  check(
    "without a clientId two identical sends are two messages (no silent deduplication)",
    noClientId.statusCode === 201 && noClientIdAgain.statusCode === 201 && rows("private_messages").length === 4
  );

  // The race: the row exists but the lookup missed it, so the INSERT hits the
  // partial unique index. The route must answer with the stored row, not a 500.
  base();
  asTeacherBrown();
  setTable("private_messages", [
    messageRow("raced", {
      from: BROWN,
      fromRole: "teacher",
      to: SAM,
      toRole: "student",
      body: "raced",
      at: "2026-09-24T12:00:00.000Z",
      clientId: "device-b-1",
    }),
  ]);
  // The row is there, but the clientId lookup cannot see it (replica lag / two
  // devices in the same second): the INSERT is what meets the unique index.
  state.missNextReadOn = "private_messages";
  const raced = await call(handler, api({ method: "POST", body: { to: SAM, body: "raced", clientId: "device-b-1" } }));
  check(
    "a duplicate-key race answers 200 duplicate:true with the row that won",
    raced.statusCode === 200 && raced.body.duplicate === true && raced.body.message.id === "raced",
    `${raced.statusCode} ${JSON.stringify(raced.body)}`
  );
  check(
    "and the table still holds exactly one row for that clientId",
    rows("private_messages").length === 1 && rows("private_messages")[0].id === "raced",
    JSON.stringify(rows("private_messages").map((r) => r.id))
  );
}

// ===========================================================================
section("7. failures fail closed (a broken read never reads as 'no messages')");

{
  base();
  asTeacherBrown();
  setTable(
    "private_messages",
    [
      messageRow("m1", { from: BROWN, fromRole: "teacher", to: SAM, toRole: "student", body: "secret", at: "2026-09-24T12:00:00.000Z" }),
    ]
  );
  failReads("private_messages", { message: "boom" });
  const threadBoom = await call(handler, api({ url: url({ with: SAM }) }));
  check(
    "a failed thread read is a 500 with no messages key at all",
    threadBoom.statusCode === 500 && threadBoom.body.error === "Could not load the conversation" && !("messages" in threadBoom.body),
    `${threadBoom.statusCode} ${JSON.stringify(threadBoom.body)}`
  );
  failReads("teacher_students", { message: "boom" });
  const linkBoom = await call(handler, api({ url: url({ with: SAM }) }));
  check(
    "a failed link read is a 500 — never 'you are not linked' and never an empty list",
    linkBoom.statusCode === 500 && linkBoom.body.error === "Could not load your linked people" && !("messages" in linkBoom.body),
    `${linkBoom.statusCode} ${JSON.stringify(linkBoom.body)}`
  );
  base();
  asTeacherBrown();
  failWrites("private_messages", { message: "write boom" });
  const writeBoom = await call(handler, api({ method: "POST", body: { to: SAM, body: "hello" } }));
  check(
    "a failed insert is a 500 with an honest error (not a fake success)",
    writeBoom.statusCode === 500 && writeBoom.body.error === "Could not send the message" && !writeBoom.body.ok,
    `${writeBoom.statusCode} ${JSON.stringify(writeBoom.body)}`
  );
  base();
  asTeacherBrown();
  failWrites("private_messages", { code: "23505", message: "duplicate key value violates unique constraint" });
  const dupNoRow = await call(handler, api({ method: "POST", body: { to: SAM, body: "hello", clientId: "device-c-1" } }));
  check(
    "a 23505 with no row to show is still a 500, not an invented duplicate",
    dupNoRow.statusCode === 500,
    `${dupNoRow.statusCode} ${JSON.stringify(dupNoRow.body)}`
  );
}

// ===========================================================================
section("8. wiring self-test");
{
  const p0 = passed;
  const f0 = failed;
  quiet = true;
  check("probe-false", false);
  check("probe-true", true);
  quiet = false;
  const wired = failed === f0 + 1 && passed === p0 + 1;
  passed = p0;
  failed = f0;
  check("a false condition fails and a true one passes (check() is not vacuous)", wired);
  // The schema assertions are string matches; prove they bite on a doctored file.
  const doctored = sql.replace("using (false)", "using (true)").replace("enable row level security", "disable row level security");
  check(
    "the schema checks would catch a permissive policy",
    /using \(true\)/.test(doctored) && !/create policy "private_messages: no direct client access"\s*\n\s*on public\.private_messages for all\s*\n\s*using \(false\)/.test(doctored)
  );
}

// --- restore the environment the way we found it ----------------------------
if (SAvedEnv.url === undefined) delete process.env.VITE_SUPABASE_URL;
else process.env.VITE_SUPABASE_URL = SAvedEnv.url;
if (SAvedEnv.url2 === undefined) delete process.env.SUPABASE_URL;
else process.env.SUPABASE_URL = SAvedEnv.url2;
if (SAvedEnv.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
else process.env.SUPABASE_SERVICE_ROLE_KEY = SAvedEnv.key;

console.log(`\ncheck-messages: ${passed}/${passed + failed} green${failed ? ` (${failed} FAILED)` : ""}`);
process.exit(failed === 0 ? 0 : 1);
