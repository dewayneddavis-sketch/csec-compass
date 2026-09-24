// The Timed Mock Exam's paper-drawing contract.
//
//   node tools/check-mock-paper.mjs
//
// WHY THIS FILE EXISTS (task 0be0e0f2, 2026-09-24)
//
// The mock used to build its 40 questions with `qs.slice(0, MAX_QUESTIONS)` — the
// first 40 rows of content/<subject>/practice.json. Because content only ever
// gets appended, "the first 40" meant "the 40 oldest": when PR #87 shipped the
// Consumer Arithmetic and Sets gap lessons, their 12 practice questions landed at
// the end of the mathematics bank (ids p101–p112) and the head-slice made them
// permanently unreachable in the mock. Nothing failed, because nothing asserted
// anything about WHICH questions the paper used.
//
// So this harness asserts exactly that, against the real banks of all 23
// subjects:
//
//   1. the paper is drawn from the WHOLE bank — 40 questions, no duplicates, all
//      of them real bank rows, and every topic in the bank present in the paper
//      (all 23 subjects currently have 8–39 topics, so one of each fits in 40;
//      that precondition is asserted, not assumed);
//   2. nothing in the bank is structurally unreachable — over many seeds the
//      union of the papers is the entire bank;
//   3. the specific questions this fix exists for (mathematics p101–p112, the
//      Consumer Arithmetic + Sets topics) are ABSENT from the old head-slice and
//      present in every sampled paper — the regression and the fix, both proven
//      from the shipped data;
//   4. the exam is still the exam: 40 questions, 90 seconds each (60 minutes),
//      60% to pass, review + retake, one question at a time, auto-submit, and no
//      api/ function (the Vercel 12-function cap).
//
// Run it with the rest before any PR that touches the mock exam:
//   for f in tools/check-*.mjs; do node "$f"; done
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  console.log(`\n${title}`);
}

const examRules = await import("../src/data/mockExamRules.js");
const paper = await import("../src/data/mockPaper.js");
const { MAX_QUESTIONS, SECONDS_PER_QUESTION, PASS_PERCENTAGE } = examRules;
const { buildMockPaper, countGroups, mulberry32, seededShuffle, questionGroup } = paper;

const readBank = (subject) => {
  const data = JSON.parse(read(join("content", subject, "practice.json")));
  return Array.isArray(data) ? data : data.exercises || data.questions || [];
};

const SUBJECTS = readdirSync(join(root, "content"))
  .filter((name) => statSync(join(root, "content", name)).isDirectory())
  .filter((name) => existsSync(join(root, "content", name, "practice.json")))
  .sort();

const BANKS = new Map(SUBJECTS.map((subject) => [subject, readBank(subject)]));
const topicsOf = (questions) => new Set(questions.map((question) => questionGroup(question)));
const idsOf = (questions) => questions.map((question) => String(question.id));
const mockSrc = read("src/components/MockExam.jsx");
const paperSrc = read("src/data/mockPaper.js");

// ===========================================================================
section("1. the paper is drawn from the whole bank (every real subject)");

check(`all ${SUBJECTS.length} subjects have a practice bank`, SUBJECTS.length === 23, `${SUBJECTS.length}`);
check(
  "no bank is smaller than a paper (so sampling is always the live path)",
  SUBJECTS.every((s) => BANKS.get(s).length > MAX_QUESTIONS),
  SUBJECTS.filter((s) => BANKS.get(s).length <= MAX_QUESTIONS).join(", ")
);
check(
  `every bank covers fewer topics than a paper holds (≤ ${MAX_QUESTIONS})`,
  SUBJECTS.every((s) => countGroups(BANKS.get(s)) <= MAX_QUESTIONS),
  SUBJECTS.filter((s) => countGroups(BANKS.get(s)) > MAX_QUESTIONS)
    .map((s) => `${s}: ${countGroups(BANKS.get(s))}`)
    .join(", ")
);

const shapeProblems = [];
for (const subject of SUBJECTS) {
  const bank = BANKS.get(subject);
  const bankIds = new Set(idsOf(bank));
  for (const seed of [1, 7, 424242]) {
    const exam = buildMockPaper(bank, { seed });
    const ids = idsOf(exam);
    if (exam.length !== MAX_QUESTIONS) shapeProblems.push(`${subject}/${seed}: ${exam.length} questions`);
    if (new Set(ids).size !== ids.length) shapeProblems.push(`${subject}/${seed}: duplicate question`);
    if (!ids.every((id) => bankIds.has(id))) shapeProblems.push(`${subject}/${seed}: question not in the bank`);
    // Coverage: one question per topic, so a mock always samples the whole syllabus.
    const missing = [...topicsOf(bank)].filter((topic) => !topicsOf(exam).has(topic));
    if (missing.length) shapeProblems.push(`${subject}/${seed}: topics missing ${missing.join(",")}`);
  }
}
check(
  "every paper is 40 bank questions, no duplicates, one from every topic in the bank",
  shapeProblems.length === 0,
  shapeProblems.slice(0, 4).join(" | ")
);

const determinismProblems = [];
for (const subject of SUBJECTS) {
  const bank = BANKS.get(subject);
  const a = idsOf(buildMockPaper(bank, { seed: 99 })).join(",");
  const b = idsOf(buildMockPaper(bank, { seed: 99 })).join(",");
  const c = idsOf(buildMockPaper(bank, { seed: 100 })).join(",");
  if (a !== b) determinismProblems.push(`${subject}: same seed, different paper`);
  if (a === c) determinismProblems.push(`${subject}: two seeds, same paper`);
  if (idsOf(bank).join(",") === a) determinismProblems.push(`${subject}: paper is the bank in file order`);
}
check(
  "the sampler is deterministic, seed-varying, and not the bank in file order",
  determinismProblems.length === 0,
  determinismProblems.slice(0, 3).join(" | ")
);

// Nothing in the bank may be structurally unreachable: union over many seeds.
const unreachable = [];
for (const subject of SUBJECTS) {
  const bank = BANKS.get(subject);
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed += 1) {
    for (const id of idsOf(buildMockPaper(bank, { seed }))) seen.add(id);
  }
  const never = idsOf(bank).filter((id) => !seen.has(id));
  if (never.length) unreachable.push(`${subject}: ${never.slice(0, 5).join(",")} (${never.length})`);
}
check(
  "over 200 seeds every question in every bank can appear (nothing is stranded)",
  unreachable.length === 0,
  unreachable.slice(0, 3).join(" | ")
);
check(
  "papers differ from each other across seeds (a retake is a new paper)",
  (() => {
    const bank = BANKS.get("mathematics");
    const papers = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => idsOf(buildMockPaper(bank, { seed })));
    const unique = new Set(papers.map((ids) => ids.join(",")));
    return unique.size === papers.length;
  })()
);
check(
  "and two papers share plenty of questions — it is a sample of one syllabus, not a different exam",
  (() => {
    const bank = BANKS.get("mathematics");
    const a = new Set(idsOf(buildMockPaper(bank, { seed: 11 })));
    const overlap = idsOf(buildMockPaper(bank, { seed: 12 })).filter((id) => a.has(id)).length;
    return overlap > 0 && overlap < MAX_QUESTIONS;
  })()
);

// ===========================================================================
section("2. the questions this fix exists for (PR #87: Consumer Arithmetic + Sets)");

// The 12 topics the content developer's gap lessons added to mathematics. They
// are the reason the head-slice had to go: every one of them is at the END of
// the bank.
const NEW_LESSON_TOPICS = [
  "profit-loss-and-discounts",
  "simple-and-compound-interest",
  "hire-purchase-and-instalments",
  "taxes-and-utility-bills",
  "exchange-rates-and-currency",
  "insurance-and-budgeting",
  "set-notation",
  "subsets-and-cardinality",
  "venn-diagrams",
  "union-intersection-complement",
  "shading-venn-regions",
  "set-word-problems",
];
const mathBank = BANKS.get("mathematics");
const newLessonQuestions = mathBank.filter((q) => NEW_LESSON_TOPICS.includes(q.topic));
const newLessonIds = idsOf(newLessonQuestions);

check(
  "the 12 new lessons' questions are in the shipped mathematics bank",
  newLessonQuestions.length === 12 &&
    NEW_LESSON_TOPICS.every((topic) => mathBank.some((q) => q.topic === topic)),
  `${newLessonQuestions.length} questions: ${newLessonIds.join(",")}`
);
check(
  "the OLD head-slice could never show one of them (this is the bug)",
  mathBank.slice(0, MAX_QUESTIONS).every((q) => !NEW_LESSON_TOPICS.includes(q.topic)),
  `head-slice contained ${mathBank.slice(0, MAX_QUESTIONS).filter((q) => NEW_LESSON_TOPICS.includes(q.topic)).length}`
);
check(
  "the new sampler puts all 12 in EVERY paper",
  [1, 2, 3, 5, 8, 13, 21, 34, 55, 89].every((seed) => {
    const topics = topicsOf(buildMockPaper(mathBank, { seed }));
    return NEW_LESSON_TOPICS.every((topic) => topics.has(topic));
  })
);
check(
  "each of those questions is reachable in practice, seed by seed",
  (() => {
    const seen = new Set();
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const id of idsOf(buildMockPaper(mathBank, { seed }))) seen.add(id);
    }
    return newLessonIds.every((id) => seen.has(id));
  })(),
  newLessonIds.join(",")
);
check(
  "a maths paper shows 12 new-lesson questions and 28 others",
  (() => {
    const exam = buildMockPaper(mathBank, { seed: 3 });
    const fresh = exam.filter((q) => NEW_LESSON_TOPICS.includes(q.topic)).length;
    return fresh >= 12 && fresh <= 14 && exam.length === MAX_QUESTIONS;
  })()
);

// ===========================================================================
section("3. the exam itself is unchanged");

check(
  `the rules are still ${MAX_QUESTIONS} questions / ${SECONDS_PER_QUESTION}s each / ${PASS_PERCENTAGE}% to pass`,
  MAX_QUESTIONS === 40 &&
    SECONDS_PER_QUESTION === 90 &&
    PASS_PERCENTAGE === 60 &&
    (MAX_QUESTIONS * SECONDS_PER_QUESTION) / 60 === 60
);
check(
  "the paper size has exactly one source (mockPaper reads it from mockExamRules)",
  /import \{ MAX_QUESTIONS \} from "\.\/mockExamRules\.js"/.test(paperSrc) &&
    !/const\s+MAX_QUESTIONS\s*=/.test(paperSrc) &&
    !/const\s+MAX_QUESTIONS\s*=/.test(mockSrc)
);
check(
  "the component no longer head-slices the bank",
  !/slice\(0,\s*MAX_QUESTIONS\)/.test(mockSrc) &&
    !/qs\.length > MAX_QUESTIONS/.test(mockSrc) &&
    /buildMockPaper\(qs, \{ seed: seedRef\.current \}\)/.test(mockSrc)
);
check(
  "the paper is fixed for the duration of an attempt (sampled once per fetch, not per render)",
  /const seedRef = useRef\(newMockSeed\(\)\)/.test(mockSrc) &&
    (mockSrc.match(/buildMockPaper\(/g) || []).length === 2,
  `${(mockSrc.match(/buildMockPaper\(/g) || []).length} call sites`
);
check(
  "a retake draws a fresh paper from the same bank",
  /seedRef\.current = newMockSeed\(\);\s*\n\s*setQuestions\(buildMockPaper\(bankRef\.current, \{ seed: seedRef\.current \}\)\);/.test(mockSrc) ||
    /if \(bankRef\.current && bankRef\.current\.length > 0\) \{[\s\S]{0,200}newMockSeed\(\)[\s\S]{0,200}buildMockPaper\(bankRef\.current/.test(mockSrc)
);
check(
  "the timed exam behaviour it must not lose is all still there",
  /setTimeLeft\(examSeconds\)/.test(mockSrc) &&
    /timeLeft === 0/.test(mockSrc) &&
    /setSubmitted\(true\)/.test(mockSrc) &&
    /<ReviewSolution/.test(mockSrc) &&
    /<SimilarQuestionPractice/.test(mockSrc) &&
    /Retake Mock Exam/.test(mockSrc) &&
    /recordQuizResult\(/.test(mockSrc) &&
    /PASS_PERCENTAGE/.test(mockSrc)
);
check(
  "the start card still tells the truth about the paper it is about to set",
  /multiple-choice questions<\/strong>/.test(mockSrc) &&
    /\{formatTime\(examSeconds\)\}/.test(mockSrc) &&
    /\{SECONDS_PER_QUESTION\} seconds each/.test(mockSrc)
);
check(
  "no api/ function was added for this (Vercel 12-function cap)",
  !/api\//.test(paperSrc) && !/from "\.\.\/api\//.test(mockSrc)
);

// ===========================================================================
section("4. degenerate banks cannot produce a broken paper");

const q = (id, topic) => ({ id, topic, question: `q${id}`, options: ["a", "b"], answer: "a" });
check("an empty bank yields an empty paper", buildMockPaper([], { seed: 1 }).length === 0);
check("a missing bank yields an empty paper (not a crash)", buildMockPaper(undefined, { seed: 1 }).length === 0);
check(
  "a bank smaller than a paper is used whole",
  (() => {
    const small = [q("a", "t1"), q("b", "t1"), q("c", "t2")];
    const exam = buildMockPaper(small, { seed: 1 });
    return exam.length === 3 && idsOf(exam).join(",") === "a,b,c";
  })()
);
check(
  "a bank exactly as large as a paper is used whole",
  buildMockPaper(Array.from({ length: MAX_QUESTIONS }, (_, i) => q(`p${i}`, `t${i}`)), { seed: 1 }).length === MAX_QUESTIONS
);
check(
  "one giant topic still yields 40 distinct questions",
  (() => {
    const bank = Array.from({ length: 45 }, (_, i) => q(`p${i}`, "only-topic"));
    const exam = buildMockPaper(bank, { seed: 4 });
    return exam.length === MAX_QUESTIONS && new Set(idsOf(exam)).size === MAX_QUESTIONS;
  })()
);
check(
  "more topics than a paper holds still yields exactly 40 unique questions",
  (() => {
    const bank = Array.from({ length: 45 }, (_, i) => q(`p${i}`, `t${i}`));
    const exam = buildMockPaper(bank, { seed: 4 });
    return exam.length === MAX_QUESTIONS && new Set(idsOf(exam)).size === MAX_QUESTIONS;
  })()
);
check(
  "malformed rows are ignored and duplicate ids are collapsed",
  (() => {
    const bank = [q("p1", "t1"), null, { topic: "t1" }, { id: "p2" }, { id: "p2", topic: "t2" }, "nonsense", q("p3", "t2")];
    const exam = buildMockPaper(bank, { seed: 2 });
    return exam.length === 3 && idsOf(exam).every((id) => ["p1", "p2", "p3"].includes(id));
  })()
);
check(
  "the bank passed in is never mutated",
  (() => {
    const bank = Array.from({ length: 50 }, (_, i) => q(`p${i}`, `t${i % 9}`));
    const before = idsOf(bank).join(",");
    buildMockPaper(bank, { seed: 5 });
    const papers = [1, 2].map((seed) => buildMockPaper(bank, { seed }));
    return idsOf(bank).join(",") === before && papers[0] !== papers[1];
  })()
);
check(
  "odd seeds (0, negative, huge, non-integer) stay deterministic and valid",
  (() => {
    const bank = Array.from({ length: 60 }, (_, i) => q(`p${i}`, `t${i % 12}`));
    return [0, -1, -12345, 2 ** 31 - 1, 7.5, Number("1e9")].every((seed) => {
      const a = idsOf(buildMockPaper(bank, { seed })).join(",");
      const b = idsOf(buildMockPaper(bank, { seed })).join(",");
      return a === b && a.split(",").length === MAX_QUESTIONS;
    });
  })()
);
check(
  "an explicit smaller max is honoured, for anything that wants a shorter paper",
  buildMockPaper(Array.from({ length: 60 }, (_, i) => q(`p${i}`, `t${i % 12}`)), { max: 10, seed: 1 }).length === 10
);
check(
  "the shuffle keeps every element and never repeats one",
  (() => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const before = items.join(",");
    const out = seededShuffle(items, 1234);
    return out.length === 50 && new Set(out).size === 50 && items.join(",") === before && out.join(",") !== before;
  })()
);
check(
  "the PRNG is the deterministic one the sampler uses (same seed, same stream)",
  (() => {
    const a = [mulberry32(7)(), mulberry32(7)()];
    const b = [mulberry32(7)(), mulberry32(7)()];
    return a[0] === b[0] && a[1] === b[1] && a[0] >= 0 && a[0] < 1;
  })()
);

// ===========================================================================
section("5. wiring self-test (a false condition must fail, a true one must pass)");
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
}

console.log(`\ncheck-mock-paper: ${passed}/${passed + failed} green${failed ? ` (${failed} FAILED)` : ""}`);
process.exit(failed === 0 ? 0 : 1);
