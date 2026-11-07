// Verification harness: the ACCOUNT-IDENTITY declaration (owner instruction
// 2026-11-05).
//   node tools/check-account-identity.mjs
//
// The owner's three asks, in his words:
//
//   1. "When you create an account, the person must identify I am a student, I
//      am a Teacher, I am a Parent just as when you purchase a subject or
//      bundle, you must identify." — because "when school admin enters an email
//      address to grant access, if it is a Teacher's identity email address, they
//      will instantly have access to the Teacher Dashboard ... If it is a
//      student identity email, they will not have access to the Teacher's
//      Dashboard or the Parent Dashboard."
//   2. "Parent Dashboard needs to display at the Top of Homepage just as
//      Teacher's Dashboard."
//   3. "Parent need to be able to access the Parent's Dashboard by using the
//      Student's account ... the parent can sign-in as the student and view the
//      Parent's Dashboard. The Parent Dashboard should have the same information
//      as the Teacher's Dashboard."
//
// THE ASSERTION THIS HARNESS EXISTS FOR is the separation the owner's own
// wording implies: a DECLARATION is not an AUTHORISATION. Picking "Teacher" at
// signup must not by itself open the Teacher Dashboard, or any student could
// pick it and read the whole class. Section 3 proves that twice over — once by
// scanning every api/ file for any read of the declaration, and once by driving
// the REAL summary handler with a caller whose ONLY credential is a declared
// role of "teacher".
import { readFileSync, readdirSync, statSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register("./school-loader.mjs", import.meta.url);

// A dummy owner, never a real address (owner instruction 2026-11-05).
const OWNER = "owner@csec-compass.test";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.STRIPE_SECRET_KEY = "sk_test_offline";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_offline";
process.env.OWNER_EMAILS = OWNER;
// NO teacher allowlist and NO roster: a self-declared teacher must qualify on
// nothing at all in section 3, and be refused.
process.env.TEACHER_EMAIL = "";
process.env.TEACHER_EMAILS = "";

const stub = await import("./teacher-stub.mjs");
const { state, reset, setTable, rows } = stub;
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
async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}
const authHeader = { authorization: "Bearer identity-token" };
const summaryHandler = (await import("../api/analytics/summary.js")).default;
const adminHandler = (await import("../api/admin/grant-access.js")).default;

// The REAL module under test, driven directly (it is plain JS, no JSX).
const roles = await import("../src/data/accountRoles.js");
const buyerRoles = await import("../src/data/buyerRoles.js");

// ===========================================================================
section("1. the three identities live in ONE place, and the order is the owner's");

check(
  "accountRoles offers exactly student / teacher / parent",
  JSON.stringify(roles.ACCOUNT_ROLE_IDS) === JSON.stringify(["student", "teacher", "parent"]),
  JSON.stringify(roles.ACCOUNT_ROLE_IDS)
);
check(
  "…the owner's own order, student first",
  roles.ACCOUNT_ROLE_IDS[0] === "student",
  JSON.stringify(roles.ACCOUNT_ROLE_IDS)
);
check(
  "the account list covers exactly the checkout list — no fourth role in one place only",
  roles.ACCOUNT_ROLE_IDS.length === buyerRoles.BUYER_ROLE_IDS.length &&
    roles.ACCOUNT_ROLE_IDS.every((id) => buyerRoles.BUYER_ROLE_IDS.includes(id)),
  JSON.stringify({ account: roles.ACCOUNT_ROLE_IDS, checkout: buyerRoles.BUYER_ROLE_IDS })
);
check(
  "every identity has a label",
  roles.ACCOUNT_ROLE_IDS.every((id) => typeof roles.ACCOUNT_ROLE_LABELS[id] === "string" && roles.ACCOUNT_ROLE_LABELS[id].length > 2),
  JSON.stringify(roles.ACCOUNT_ROLE_LABELS)
);
check("the question is asked in the owner's words", /I am/i.test(roles.ACCOUNT_ROLE_QUESTION), roles.ACCOUNT_ROLE_QUESTION);
check(
  "an unanswered form has something to say, naming all three",
  /student/i.test(roles.ACCOUNT_ROLE_REQUIRED_MESSAGE) &&
    /teacher/i.test(roles.ACCOUNT_ROLE_REQUIRED_MESSAGE) &&
    /parent/i.test(roles.ACCOUNT_ROLE_REQUIRED_MESSAGE),
  roles.ACCOUNT_ROLE_REQUIRED_MESSAGE
);
check(
  "the hint says out loud that the choice grants nothing on its own",
  /does not give you access/i.test(roles.ACCOUNT_ROLE_HINT),
  roles.ACCOUNT_ROLE_HINT
);
check(
  "the hint names the school admin and the purchase as the real gates",
  /school/i.test(roles.ACCOUNT_ROLE_HINT) && /purchase/i.test(roles.ACCOUNT_ROLE_HINT)
);
check("cleanAccountRole accepts a role, whatever its case/spacing", roles.cleanAccountRole("  Teacher ") === "teacher");
check("cleanAccountRole refuses anything else", roles.cleanAccountRole("principal") === "" && roles.cleanAccountRole(null) === "");
check("accountRoleLabel gives the label back", roles.accountRoleLabel("parent") === "Parent");

// ===========================================================================
section("2. BOTH account-creation forms capture the identity, and require it");

const signupSrc = read("src/pages/SignupPage.jsx");
const authSrc = read("src/pages/AuthPage.jsx");
const pickerSrc = read("src/components/AccountRolePicker.jsx");
const contextSrc = read("src/context/AuthContext.jsx");

check("the picker is one shared component", /export default function AccountRolePicker/.test(pickerSrc));
check(
  "/signup renders the picker",
  /import AccountRolePicker from "\.\.\/components\/AccountRolePicker"/.test(signupSrc) && /<AccountRolePicker/.test(signupSrc)
);
check(
  "/auth/signup renders the same picker",
  /import AccountRolePicker from "\.\.\/components\/AccountRolePicker"/.test(authSrc) && /<AccountRolePicker/.test(authSrc)
);
check(
  "/auth/signup renders it in SIGNUP mode only, never on sign-in or reset",
  /\{mode === "signup" && \(\s*<AccountRolePicker/.test(authSrc)
);
check(
  "the picker draws the three options from the data module, not from retyped copy",
  /ACCOUNT_ROLE_IDS\.map\(\(id\) =>/.test(pickerSrc) && /ACCOUNT_ROLE_LABELS\[id\]/.test(pickerSrc)
);
check(
  "no identity copy is retyped in either form",
  !/["\'>]I am a/.test(signupSrc) && !/["\'>]I am a/.test(authSrc),
  "the question must come from src/data/accountRoles.js"
);
check(
  "/signup refuses an unanswered form before it posts",
  /if \(!cleanAccountRole\(role\)\) \{/.test(signupSrc) && /setError\(ACCOUNT_ROLE_REQUIRED_MESSAGE\)/.test(signupSrc)
);
check(
  "/auth/signup refuses an unanswered form before it posts",
  /if \(mode === "signup" && !cleanAccountRole\(role\)\) \{/.test(authSrc) && /setError\(ACCOUNT_ROLE_REQUIRED_MESSAGE\)/.test(authSrc)
);
check(
  "/signup's button is disabled without an answer",
  /disabled=\{busy \|\| !agreed \|\| !cleanAccountRole\(role\)\}/.test(signupSrc)
);
check(
  "/auth/signup's button is disabled without an answer",
  /disabled=\{busy \|\| \(mode === "signup" && \(!agreed \|\| !cleanAccountRole\(role\)\)\)\}/.test(authSrc)
);
check("the answer is sent with the account", /signUp\(email, password, role\)/.test(signupSrc) && /signUp\(email, password, role\)/.test(authSrc));
check(
  "AuthContext stores it in the account's own metadata (no schema migration)",
  /\[ACCOUNT_ROLE_METADATA_KEY\]: declared/.test(contextSrc) && /data: \{ \[ACCOUNT_ROLE_METADATA_KEY\]: declared \}/.test(contextSrc)
);
check("the metadata key is one constant", roles.ACCOUNT_ROLE_METADATA_KEY === "account_role", roles.ACCOUNT_ROLE_METADATA_KEY);

// An account created BEFORE this shipped has no key. It must read as "we do not
// know", not as "student" — the UI must never claim an identity nobody declared.
check("an existing account with no role reads as empty, not as 'student'", roles.accountRoleFromUser({ user_metadata: {} }) === "");
check("a user object with no metadata at all does not throw", roles.accountRoleFromUser({}) === "" && roles.accountRoleFromUser(null) === "");
check("a stored role is read back", roles.accountRoleFromUser({ user_metadata: { account_role: "Teacher" } }) === "teacher");
check("a junk stored role is ignored", roles.accountRoleFromUser({ user_metadata: { account_role: "principal" } }) === "");

// ===========================================================================
section("3. A DECLARATION IS NOT AN AUTHORISATION");

// 3a. No server file may read the declaration. This is the static half of the
// guard: if any api/ file so much as mentions the metadata key, the value could
// start granting access, and this fails before it ships.
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}
const apiFiles = walk(join(root, "api"));
check("the api/ scan found the handlers", apiFiles.length >= 10, `${apiFiles.length} files`);
const apiReadsDeclaration = apiFiles.filter((f) => {
  const src = readFileSync(f, "utf8");
  return /user_metadata/.test(src) || /account_role/.test(src);
});
check(
  "NO api/ handler reads the signup declaration (user_metadata / account_role)",
  apiReadsDeclaration.length === 0,
  apiReadsDeclaration.map((f) => f.replace(root + "/", "")).join(", ")
);
// RED CONTROL for the scan itself: the pattern must fire on a planted read.
{
  const planted = 'const role = user.user_metadata?.account_role;';
  const wouldFire = /user_metadata/.test(planted) || /account_role/.test(planted);
  check("red control: the scan fires on a planted read of the declaration", wouldFire);
  const clean = 'const callerEmail = (user.email || "").toLowerCase();';
  check("red control: the scan does not fire on an ordinary read", !(/user_metadata/.test(clean) || /account_role/.test(clean)));
}

// 3b. The behavioural half: a caller whose ONLY credential is a self-declared
// role of "teacher" is refused the Teacher Dashboard. No roster row, no
// allowlist, no purchase, no link.
function summaryReq(query, headers = authHeader) {
  return { method: "GET", headers, query };
}
{
  reset();
  setTable("school_members", []);
  setTable("teacher_students", []);
  setTable("purchases", []);
  state.user = {
    id: "u-declared-teacher",
    email: "declared.teacher@example.com",
    user_metadata: { account_role: "teacher" },
  };
  const res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check(
    "a self-declared Teacher with no roster row is REFUSED the Teacher Dashboard (403)",
    res.statusCode === 403,
    `${res.statusCode} ${JSON.stringify(res.body).slice(0, 140)}`
  );
  check("…and gets zero student data with it", res.body.students === undefined && res.body.roster === undefined);
  check("…and the refusal tells them the real way in", /roster|admin/i.test(res.body.error || ""), res.body.error);

  // The same declaration must not unlock the admin surface either.
  const adminRes = await call(adminHandler, {
    method: "POST",
    headers: authHeader,
    body: { action: "teacher-self-links" },
  });
  check(
    "a self-declared Teacher cannot read a class list through the admin route (403)",
    adminRes.statusCode === 403,
    `${adminRes.statusCode} ${JSON.stringify(adminRes.body).slice(0, 140)}`
  );
}

// 3c. The declaration DOES decide which dashboard we offer — the honest half.
check(
  "a declared Teacher is offered the Teacher Dashboard",
  JSON.stringify(roles.dashboardsForRole("teacher")) === JSON.stringify(["teacher"])
);
check(
  "a declared Parent is offered the Parent Dashboard",
  JSON.stringify(roles.dashboardsForRole("parent")) === JSON.stringify(["parent"])
);
check(
  "a declared Student is offered the Parent Dashboard (their own progress, per the owner)",
  JSON.stringify(roles.dashboardsForRole("student")) === JSON.stringify(["parent"])
);
check(
  "an account with no declaration is offered BOTH — we do not pretend to know",
  JSON.stringify(roles.dashboardsForRole("")) === JSON.stringify(["teacher", "parent"]),
  JSON.stringify(roles.dashboardsForRole(""))
);
check("offersDashboard agrees with dashboardsForRole", roles.offersDashboard("student", "parent") && !roles.offersDashboard("student", "teacher"));

// ===========================================================================
section("4. the Parent Dashboard is at the TOP of the homepage, as the Teacher's is");

const homeSrc = read("src/pages/Home.jsx");
const homeCss = read("src/pages/Home.css");

check("the homepage reads the identity from the data module", /from "\.\.\/data\/accountRoles"/.test(homeSrc));
check(
  "the parent card is rendered before the teacher card (top of the page)",
  homeSrc.indexOf('tone="parent"') > 0 && homeSrc.indexOf('tone="parent"') < homeSrc.indexOf('tone="teacher"'),
  `${homeSrc.indexOf('tone="parent"')} vs ${homeSrc.indexOf('tone="teacher"')}`
);
check("both dashboards render through ONE card component", /function DashboardCard\(/.test(homeSrc) && /<DashboardCard/.test(homeSrc));
check(
  "…so the two cannot drift into different prominence",
  /className=\{`home-teacher home-dash home-dash-\$\{tone\}`\}/.test(homeSrc)
);
check("the parent card links to /parent", /cta=\{\{ to: "\/parent"/.test(homeSrc));
check("the section sits above the subject grid", homeSrc.indexOf("home-dashboards") < homeSrc.indexOf('id="subjects"'));
check("the two sit side by side on a wide screen", /\.home-dashboards\s*\{[^}]*grid/.test(homeCss) && /grid-template-columns:\s*1fr 1fr/.test(homeCss));
check("the parent card is styled as its own card", /\.home-dash-parent \.home-teacher-card\s*\{/.test(homeCss));
// "do not render a button that dead-ends in a 403 for everyone else"
check(
  "the Teacher Dashboard button is withheld from a signed-in account that cannot use it",
  /cta=\{canUseTeacher \? \{ to: "\/teacher"/.test(homeSrc) && /const canUseTeacher = !signedIn \|\| offersDashboard\(accountRole, "teacher"\)/.test(homeSrc)
);
check(
  "…and it says the honest way in instead",
  /Teacher Dashboard opens for a teacher your school's admin has added/.test(homeSrc)
);
check(
  "the Parent Dashboard button is always rendered for a signed-in account (it can never 403 after the self view)",
  /cta=\{\{ to: "\/parent"/.test(homeSrc)
);
check("a student is told the page shows their own progress", /never another student's/.test(homeSrc));

// ===========================================================================
section("5. a student's own session opens the parent view of ITSELF");

const parentPageSrc = read("src/pages/ParentPage.jsx");
const summarySrc = read("api/analytics/summary.js");

check("the page reads the view the server resolved", /data\?\.view === "self"/.test(parentPageSrc));
check(
  "it says the progress is the caller's own",
  /Your own progress, shown exactly as a parent or teacher sees it/.test(parentPageSrc)
);
check("it promises no other student's work", /no other student's work appears on this page/.test(parentPageSrc));
check(
  "it says whether a parent is linked, rather than claiming one is",
  /data\.linkedAsChild/.test(parentPageSrc) && /No parent is linked to this account yet/.test(parentPageSrc)
);
check("the signed-out state mentions the student route in too", /A student can sign in here too/.test(parentPageSrc));
check(
  "the server marks the caller's own rows as self",
  /for \(const r of built\.roster\) r\.relationship = "self"/.test(summarySrc) &&
    /for \(const s of built\.students\) s\.relationship = "self"/.test(summarySrc)
);
check(
  "the self view is built from the caller's OWN email on both sides",
  /links = \[\{ parent_email: callerEmail, student_email: callerEmail \}\]/.test(summarySrc)
);
check(
  "the parent dashboard still shares the teacher dashboard's aggregation",
  /buildStudentSummaries\(supabase, links, \{\s*rosterKey: "parentEmail"/.test(summarySrc)
);

// ===========================================================================
section("6. every path that worked before still works");

{
  // The OWNER still opens the class dashboard.
  reset();
  setTable("school_members", []);
  setTable("teacher_students", [{ id: "l1", teacher_email: "aaliyah@school.edu", student_email: "aaliyah@school.edu" }]);
  setTable("purchases", []);
  state.user = { id: "u-owner", email: OWNER };
  let res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check("the OWNER still opens the class dashboard (200)", res.statusCode === 200, `${res.statusCode}`);

  // A SCHOOL ROSTER teacher still opens it.
  reset();
  setTable("school_members", [{ id: "m1", email: "roster.teacher@school.edu", role: "teacher", school_id: "s1" }]);
  setTable("teacher_students", []);
  setTable("purchases", []);
  state.user = { id: "u-roster", email: "roster.teacher@school.edu" };
  res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check("a school-roster teacher still opens the class dashboard (200)", res.statusCode === 200, `${res.statusCode}`);

  // A PAYING teacher (buyer_role=teacher on their own purchase) still opens it.
  reset();
  setTable("school_members", []);
  setTable("teacher_students", []);
  setTable("purchases", [{ id: "p1", user_id: "u-paying", purchase_type: "bundle", buyer_role: "teacher" }]);
  state.user = { id: "u-paying", email: "paying.teacher@example.com" };
  res = await call(summaryHandler, summaryReq({ scope: "class" }));
  check("a paying Teacher still opens the class dashboard (200)", res.statusCode === 200, `${res.statusCode}`);

  // The OWNER still opens the parent dashboard across families.
  reset();
  setTable("parent_students", [{ id: "pl1", parent_email: "parent@example.com", student_email: "child@example.com" }]);
  setTable("purchases", []);
  state.users = [
    { id: "u-parent", email: "parent@example.com" },
    { id: "u-child", email: "child@example.com" },
  ];
  state.user = { id: "u-owner", email: OWNER };
  res = await call(summaryHandler, summaryReq({ scope: "parent" }));
  check("the OWNER still opens the parent dashboard (200)", res.statusCode === 200, `${res.statusCode}`);
  check("…as the unfiltered oversight view", res.body.view === "all", String(res.body.view));

  // A linked parent still sees their own child, and still only theirs.
  state.user = { id: "u-parent", email: "parent@example.com" };
  res = await call(summaryHandler, summaryReq({ scope: "parent" }));
  check("a purchasing parent still opens their dashboard (200)", res.statusCode === 200, `${res.statusCode}`);
  check("…as the family view", res.body.view === "family", String(res.body.view));
  check(
    "…with exactly their own child",
    JSON.stringify(res.body.roster.map((r) => r.email)) === JSON.stringify(["child@example.com"]),
    JSON.stringify(res.body.roster)
  );
}

// ===========================================================================
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
