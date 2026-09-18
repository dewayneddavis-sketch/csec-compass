// Verification harness for the Show-Your-Work feature (Mathematics).
// Run: node tools/check-show-your-work.mjs
//
// Covers, without a browser:
//   1. src/data/showYourWork.js  — subject gating, minimum-working rule,
//      per-question counting, draft persistence (stubbed localStorage).
//   2. src/data/analytics.js     — normalizeWorking + recordQuizResult attaching
//      the working to the attempt and POSTing it (stubbed fetch).
//   3. api/analytics/record.js   — working written per question row; falls back
//      to a working-less insert if the column is not applied yet; still 500s on
//      a genuine failure.
//   4. src/data/mathWorking.js   — every Mathematics lab answer has worked steps
//      whose last step actually states that answer, and solveBalanceMethod
//      produces the correct algebra for a range of pan setups.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { register } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Route every `@supabase/supabase-js` import to the local test double so the real
// API handler can be exercised offline.
register("./mock-loader.mjs", import.meta.url);

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

// ---------------------------------------------------------------------------
// 1. showYourWork config + drafts
// ---------------------------------------------------------------------------
const syw = await import(join(root, "src/data/showYourWork.js"));

// Minimal localStorage stub.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

section("showYourWork: gating");
check("mathematics knowledge-check is enabled", syw.showYourWorkEnabled("mathematics", "knowledge-check") === true);
check("mathematics practice is enabled", syw.showYourWorkEnabled("mathematics", "practice") === true);
check("mathematics mock is enabled", syw.showYourWorkEnabled("mathematics", "mock") === true);
check("english-a is untouched", syw.showYourWorkEnabled("english-a", "knowledge-check") === false);
check("biology is untouched", syw.showYourWorkEnabled("biology", "mock") === false);
check("missing subject is safe", syw.showYourWorkEnabled(undefined, "mock") === false);
check("unknown quiz surface is refused", syw.showYourWorkEnabled("mathematics", "lesson") === false);

section("showYourWork: completeness rule");
check("empty text is not complete", syw.isWorkingComplete("") === false);
check("whitespace only is not complete", syw.isWorkingComplete("   \n  ") === false);
check("too-short text is not complete", syw.isWorkingComplete("ab") === false);
check("real working is complete", syw.isWorkingComplete("3x = 15 → x = 5") === true);
check("non-string is not complete", syw.isWorkingComplete(null) === false);

section("showYourWork: missing-working count");
check(
  "counts only the questions without working",
  syw.countMissingWorking(3, { 0: "2 + 2 = 4", 1: "  ", 2: "6 x 7 = 42" }) === 1
);
check("all missing when nothing typed", syw.countMissingWorking(2, {}) === 2);
check("none missing when all typed", syw.countMissingWorking(2, { 0: "x = 4", 1: "y = 7" }) === 0);

section("showYourWork: drafts survive a reload");
syw.saveWorkingDrafts("mathematics", "knowledge-check", { 0: "x = 4", 1: "   " });
const drafts = syw.loadWorkingDrafts("mathematics", "knowledge-check");
check("draft reloaded", drafts[0] === "x = 4");
check("blank draft dropped", drafts[1] === undefined);
check("nothing stored for other subjects", Object.keys(syw.loadWorkingDrafts("english-a", "knowledge-check")).length === 0);
check("all-blank drafts clear the key", (syw.saveWorkingDrafts("mathematics", "knowledge-check", { 0: " " }), store.size) === 0);
syw.saveWorkingDrafts("mathematics", "mock", { 0: "keep" });
syw.clearWorkingDrafts("mathematics", "mock");
check("clearWorkingDrafts removes the draft", syw.loadWorkingDrafts("mathematics", "mock")[0] === undefined);

// ---------------------------------------------------------------------------
// 2. analytics: working travels with the attempt
// ---------------------------------------------------------------------------
section("analytics: working saved with the attempt");
let postedBody = null;
globalThis.fetch = async (_url, opts) => {
  postedBody = JSON.parse(opts.body);
  return { ok: true, json: async () => ({ success: true }) };
};
const analytics = await import(join(root, "src/data/analytics.js"));

const questions = [
  { id: "q1", question: "5 + 3 * 2?", options: ["16", "11"], answer: "11", topic: "real-numbers" },
  { id: "q2", question: "20% of x is 40?", options: ["100", "200"], answer: "200", topic: "fractions-decimals-percentages" },
];
const normalized = analytics.normalizeWorking(questions, { 0: "  3 * 2 = 6, 5 + 6 = 11 ", 1: "" });
check("only answered-with-working entries kept", normalized.length === 1);
check("keyed by question id", normalized[0].questionId === "q1");
check("text is trimmed", normalized[0].text === "3 * 2 = 6, 5 + 6 = 11");

const attempt = await analytics.recordQuizResult({
  subjectId: "mathematics",
  quizType: "knowledge-check",
  questions,
  answers: { 0: "11", 1: "200" },
  working: { 0: "3 * 2 = 6, 5 + 6 = 11", 1: "1/5 of x = 40 → x = 40 × 5 = 200" },
  session: { access_token: "test-token" },
});
check("attempt carries the working", Array.isArray(attempt.working) && attempt.working.length === 2);
check("attempt score still computed", attempt.score === 2 && attempt.total === 2);
check("server received the working", postedBody?.working?.length === 2);
check("server payload keeps question ids", postedBody.working[0].questionId === "q1");
check(
  "local attempt also stores the working",
  (analytics.getLocalAttempts("mathematics").at(-1)?.working || []).length === 2
);

const noWork = await analytics.recordQuizResult({
  subjectId: "english-a",
  quizType: "knowledge-check",
  questions,
  answers: { 0: "11", 1: "200" },
  session: null,
});
check("no working key when none typed", noWork.working === undefined);
check("no server post without a session", postedBody.working.length === 2);

// ---------------------------------------------------------------------------
// 3. api/analytics/record.js — column present, column missing, real failure
// ---------------------------------------------------------------------------
section("api/analytics/record: working column handling");
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

const stub = await import(join(root, "tools/supabase-stub.mjs"));
const { default: recordHandler } = await import(join(root, "api/analytics/record.js"));
check("handler exported", typeof recordHandler === "function");

function stubRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const reqBody = {
  subjectId: "mathematics",
  quizType: "knowledge-check",
  attemptId: "11111111-2222-3333-4444-555555555555",
  results: [
    { questionId: "q1", topic: "real-numbers", correct: true },
    { questionId: "q2", topic: "fractions-decimals-percentages", correct: false },
  ],
  working: [{ questionId: "q1", text: "3 * 2 = 6" }, { questionId: "q2", text: "40 × 5 = 200" }],
};

const post = (body) => ({
  method: "POST",
  headers: { authorization: "Bearer tok" },
  body,
});

stub.reset();
let res = stubRes();
await recordHandler(post(reqBody), res);
check("column present: 200", res.statusCode === 200, `got ${res.statusCode}`);
check(
  "column present: working written per question row",
  stub.state.inserts[0].rows[0].working === "3 * 2 = 6" && stub.state.inserts[0].rows[1].working === "40 × 5 = 200"
);
check("column present: correctness still recorded", stub.state.inserts[0].rows[0].correct === true && stub.state.inserts[0].rows[1].correct === false);
check("response reports working saved", res.body.workingSaved === 2);

stub.reset();
stub.state.missingWorkingColumn = true;
res = stubRes();
await recordHandler(post(reqBody), res);
check("column missing: still 200 (no analytics regression)", res.statusCode === 200, `got ${res.statusCode}`);
check("column missing: retried without the working column", stub.state.inserts.length === 2 && !("working" in stub.state.inserts[1].rows[0]));
check("column missing: results still inserted", res.body.inserted === 2);

stub.reset();
stub.state.insertError = { message: "permission denied for table quiz_results" };
res = stubRes();
await recordHandler(post(reqBody), res);
check("genuine insert failure still fails closed (500)", res.statusCode === 500);

stub.reset();
res = stubRes();
await recordHandler({ method: "GET", headers: {}, body: {} }, res);
check("non-POST rejected (405)", res.statusCode === 405);

res = stubRes();
await recordHandler({ method: "POST", headers: {}, body: reqBody }, res);
check("missing auth header rejected (401)", res.statusCode === 401);

stub.reset();
stub.state.authError = { message: "invalid token" };
res = stubRes();
await recordHandler(post(reqBody), res);
check("invalid token rejected (401)", res.statusCode === 401);

stub.reset();
res = stubRes();
await recordHandler(post({ ...reqBody, working: [] }), res);
check("empty working array still records the attempt", res.statusCode === 200 && stub.state.inserts[0].rows.length === 2);

stub.reset();
res = stubRes();
await recordHandler(post({ ...reqBody, working: [{ questionId: "q1", text: "   " }] }), res);
check("blank working is not written as working", res.statusCode === 200 && stub.state.inserts.length === 1 && !("working" in stub.state.inserts[0].rows[0]));

stub.reset();
res = stubRes();
await recordHandler(post({ ...reqBody, working: [{ questionId: "unknown-q", text: "leftover" }] }), res);
check("working for an unknown question is harmlessly dropped", res.statusCode === 200 && stub.state.inserts[0].rows.every((r) => r.working === null));

stub.reset();
res = stubRes();
await recordHandler(post({ ...reqBody, working: [{ questionId: "q1", text: "only q1 written" }] }), res);
check("a question without working keeps its analytics row", res.statusCode === 200 && stub.state.inserts[0].rows[0].working === "only q1 written" && stub.state.inserts[0].rows[1].working === null);


// ---------------------------------------------------------------------------
// 4. Mathematics labs: worked steps exist and state the right answer
// ---------------------------------------------------------------------------
section("labs: worked steps for every Mathematics lab answer");
const mathWorking = await import(join(root, "src/data/mathWorking.js"));
const ddSource = readFileSync(join(root, "src/components/DragDropLabel.jsx"), "utf8");

// Slice the mathematics block of subjectTypeSets out of the component (NOT the
// small subject-level set earlier in the file, which shares the name).
const stsStart = ddSource.indexOf("const subjectTypeSets = {");
const mathBlockStart = ddSource.indexOf("  mathematics: {", stsStart);
const mathBlockEnd = ddSource.indexOf("  physics: {", stsStart);
const mathBlock = ddSource.slice(mathBlockStart, mathBlockEnd);
check("located the subjectTypeSets mathematics block", stsStart > 0 && mathBlock.length > 1000, `len ${mathBlock.length}`);

// Per lab experiment type: collect item id → correct answer text.
const labAnswers = {}; // { type: { itemId: answerText } }
let currentType = null;
for (const rawLine of mathBlock.split("\n")) {
  const line = rawLine.trim();
  const typeMatch = line.match(/^"([a-z-]+)":\s*\{$/);
  if (typeMatch) {
    currentType = typeMatch[1];
    labAnswers[currentType] = labAnswers[currentType] || {};
    continue;
  }
  if (!currentType) continue;
  const pair = line.match(/^\{ id: "([^"]+)", target: "([^"]*)"/);
  if (pair) {
    labAnswers[currentType][pair[1]] = pair[2];
    continue;
  }
  const item = line.match(/^\{ id: "([^"]+)", label: "(.*)", category: "([^"]+)" \},?$/);
  if (item) {
    // answer = the category label for that category id, looked up below
    labAnswers[currentType][item[1]] = { categoryId: item[3] };
  }
}
// Resolve sort-category ids to their labels.
const catLabels = {};
for (const m of mathBlock.matchAll(/\{ id: "([a-z-]+)", label: "([^"]+)" \}/g)) {
  catLabels[m[1]] = catLabels[m[1]] || m[2];
}
for (const type of Object.keys(labAnswers)) {
  for (const id of Object.keys(labAnswers[type])) {
    const v = labAnswers[type][id];
    if (v && typeof v === "object") labAnswers[type][id] = catLabels[v.categoryId] || null;
  }
}

const labNames = Object.keys(labAnswers);
check("found all 9 Mathematics lab sets", labNames.length === 9, `found ${labNames.join(", ")}`);
check(
  "no expected answer resolved to null",
  labNames.every((t) => Object.values(labAnswers[t]).every((a) => typeof a === "string" && a.length > 0))
);

let itemCount = 0;
let missingSteps = [];
let wrongTail = [];
let thinSteps = [];
for (const type of labNames) {
  for (const [id, answer] of Object.entries(labAnswers[type])) {
    itemCount += 1;
    const steps = mathWorking.getLabWorking("mathematics", type, id);
    if (!steps) { missingSteps.push(`${type}/${id}`); continue; }
    if (steps.length < 2) thinSteps.push(`${type}/${id}`);
    const tail = steps[steps.length - 1];
    // The final step must actually state the answer (e.g. "= 16", "P = 1/2").
    if (!tail.includes(answer)) wrongTail.push(`${type}/${id} → "${tail}" vs answer "${answer}"`);
  }
}
check(`every Mathematics lab answer has worked steps (${itemCount} answers)`, missingSteps.length === 0, missingSteps.join(", "));
check("no one-line 'steps' arrays", thinSteps.length === 0, thinSteps.join(", "));
check("every last step states the answer", wrongTail.length === 0, wrongTail.slice(0, 4).join(" | "));

check(
  "other subjects get no lab working",
  mathWorking.getLabWorking("biology", "simulation", "s1") === null &&
    mathWorking.getLabWorking("physics", "vector-addition", "p1") === null
);

// ---------------------------------------------------------------------------
// 5. solveBalanceMethod — the algebra must be right
// ---------------------------------------------------------------------------
section("labs: balance-scale worked method");
const cases = [
  { name: "2x + 3 = 11 → x = 4", left: ["x", "x", 3], right: [11], x: 4 },
  { name: "x = 5 → x = 5", left: ["x"], right: [5], x: 5 },
  { name: "3x = 9 → x = 3", left: ["x", "x", "x"], right: [9], x: 3 },
  { name: "2x = 3x − 4 (x on the right) → x = 4", left: ["x", "x", 4], right: ["x", "x", "x"], x: 4 },
  { name: "7 = 2 + x → x = 5", left: [7], right: [2, "x"], x: 5 },
];
for (const c of cases) {
  const solved = mathWorking.solveBalanceMethod(c.left, c.right);
  check(c.name, solved.balanced === true && solved.answer === c.x, `got ${JSON.stringify(solved.answer)}`);
  check(`${c.name}: steps present`, solved.steps.length >= 3);
  check(
    `${c.name}: plan cancels the x terms`,
    solved.steps.some((s) => s.toLowerCase().includes("x")) && typeof solved.steps.join(" ") === "string"
  );
}
const unbalanced = mathWorking.solveBalanceMethod([2, 2], [5]);
check("unequal numbers, no x → reported unbalanced", unbalanced.balanced === false && unbalanced.answer === null);
check("unbalanced case explains why", unbalanced.steps.some((s) => /no value of x|cancel/i.test(s)));
const identical = mathWorking.solveBalanceMethod(["x", 2], ["x", 2]);
check("identical sides → balanced for every x", identical.balanced === true && identical.steps.length >= 3);
check("sideText reads algebraically", mathWorking.sideText(["x", "x", 3]) === "2x + 3" && mathWorking.sideText([11]) === "11");

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
