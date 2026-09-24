#!/usr/bin/env node
// Harness: the mathematics review learning loop (task 8eeaee83) — a wrong answer
// must TEACH, not just be marked.
//
//   * the labelled "How to solve it" card renders on WRONG answers only
//   * "Practice a similar question" offers a fresh question on the same topic
//   * the practice card is outside the exam: no timer, no score, no analytics
//   * the \n-separated mathematics worked solutions stay multi-line (pre-line)
//
// The rendering half is real: esbuild bundles the actual src/ components and
// react-dom/server renders them to markup here in Node, so this harness fails if
// the rule the owner asked for stops being true in the components themselves —
// not merely if a string moved. Source guards are used only for what cannot be
// rendered (the three screen files' wiring, the stylesheets).
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const src = (p) => read(`src/${p}`);

let passed = 0;
let failed = 0;
// check(NAME, condition) — name first, always a string. A swapped argument makes
// a section silently vacuous, so the name is type-checked.
function check(name, cond, detail) {
  if (typeof name !== "string") throw new Error(`check() needs the name first, got ${typeof name}`);
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const section = (title) => console.log(`\n== ${title}`);
// Source guards below ask "does this file DO this?" — prose in comments and the
// explanatory comments in these files must not answer for the code.
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ---------------------------------------------------------------------------
// 0. The instruments the rest of the harness leans on
// ---------------------------------------------------------------------------
section("instruments");

let fetchCalls = 0;
const storageWrites = [];
function instrument() {
  fetchCalls = 0;
  globalThis.fetch = async (...args) => {
    fetchCalls += 1;
    throw new Error(`no network in this harness: ${args[0]}`);
  };
  globalThis.localStorage = {
    getItem: () => null,
    setItem: (k, v) => storageWrites.push([k, String(v)]),
    removeItem: () => {},
    clear: () => {},
  };
}
instrument();

// ---------------------------------------------------------------------------
// 1. The rule module (src/data/howToSolve.js)
// ---------------------------------------------------------------------------
section("howToSolve: the wrong-answers-only rule");

const hsw = await import(join(root, "src/data/howToSolve.js"));
check("the card heading is the owner's wording", hsw.SOLUTION_HEADING === "How to solve it", hsw.SOLUTION_HEADING);
check("the toggle exists as ONE exported constant", "SHOW_ON_CORRECT_ANSWERS" in hsw);
check("the toggle ships OFF (correct answers stay clean)", hsw.SHOW_ON_CORRECT_ANSWERS === false);
check("a WRONG answer shows the solution", hsw.shouldShowSolution(false) === true);
check("a RIGHT answer does not", hsw.shouldShowSolution(true) === false);
check(
  "flipping the toggle is what decides it (no second rule hiding elsewhere)",
  hsw.shouldShowSolution(true) === hsw.SHOW_ON_CORRECT_ANSWERS
);
check("a missing/undefined flag is treated as a wrong answer (teach it, don't hide it)", hsw.shouldShowSolution(undefined) === true);

// The three screens must ask THIS rule rather than deciding themselves.
const screens = {
  "Quiz.jsx": src("components/Quiz.jsx"),
  "ExtraPractice.jsx": src("components/ExtraPractice.jsx"),
  "MockExam.jsx": src("components/MockExam.jsx"),
};
for (const [file, text] of Object.entries(screens)) {
  check(`${file} imports the shared ReviewSolution block`, /import ReviewSolution from "\.\/ReviewSolution";/.test(text));
  check(`${file} imports the shared practice card`, /import SimilarQuestionPractice from "\.\/SimilarQuestionPractice";/.test(text));
  check(
    `${file} does not decide the rule itself (no local isCorrect && card)`,
    !/isCorrect\s*&&\s*<HowToSolveIt/.test(text) && !/!isCorrect\s*&&\s*<HowToSolveIt/.test(text)
  );
}
check(
  "only HowToSolveIt reads the toggle (one place to flip)",
  Object.entries({ ...screens, "HowToSolveIt.jsx": src("components/HowToSolveIt.jsx") })
    .filter(([, text]) => /SHOW_ON_CORRECT_ANSWERS/.test(text))
    .map(([f]) => f)
    .join(",") === "HowToSolveIt.jsx"
);

// ---------------------------------------------------------------------------
// 2. The picker (src/data/similarQuestion.js)
// ---------------------------------------------------------------------------
section("similarQuestion: same topic, different question");

const sq = await import(join(root, "src/data/similarQuestion.js"));
const bank = [
  { id: "q1", topic: "algebra", question: "A" },
  { id: "q2", topic: "algebra", question: "B" },
  { id: "q3", topic: "vectors", question: "C" },
  { id: "q4", topic: "geometry", question: "D" },
];
const low = () => 0;
const high = () => 0.999999;

check("a bank with no other question yields nothing (the button hides)", sq.pickSimilarQuestion([bank[0]], bank[0]) === null);
check("canPractice says so too", sq.canPractice([bank[0]], bank[0]) === false);
check("a real bank can be practised", sq.canPractice(bank, bank[0]) === true);
check("the question just answered is never offered again", sq.pickSimilarQuestion(bank, bank[0], { random: low })?.id !== "q1");
check(
  "a same-topic sibling wins over other topics (low end of the random range)",
  sq.pickSimilarQuestion(bank, bank[0], { random: low })?.id === "q2"
);
check(
  "and still wins at the high end of the range",
  sq.pickSimilarQuestion(bank, bank[0], { random: high })?.id === "q2"
);
check(
  "a lone topic falls back to another question from the bank",
  sq.pickSimilarQuestion(bank, bank[2], { random: low })?.id === "q1"
);
check("the fallback is still not the missed question", sq.pickSimilarQuestion([bank[2], bank[3]], bank[2], { random: high })?.id === "q4");
check("with no topics at all it still returns a different question", sq.pickSimilarQuestion([{ id: "a" }, { id: "b" }], { id: "a" }, { random: low })?.id === "b");
check("questions without ids still de-duplicate (a copy of the missed one is recognised)", sq.pickSimilarQuestion([{ question: "x" }, { question: "y" }], { question: "x" })?.question === "y");
check("an id-less copy of the just-missed question is skipped by identity too", sq.pickSimilarQuestion([{ question: "x" }, { question: "y" }], { question: "x", topic: "t" }, { random: low })?.question === "y");

// "Practice another" must never dead-end.
const seen = bank.slice(1).map(sq.questionKey);
const replay = sq.pickSimilarQuestion(bank, bank[0], { excludeKeys: [...seen, "id:q5"], random: low });
check("every question already practised → 'Practice another' still finds one", !!replay && replay.id !== "q1");
check(
  "seen questions are skipped while any remain",
  sq.pickSimilarQuestion(bank, bank[0], { excludeKeys: ["id:q2"], random: low })?.id === "q3"
);
check("a null bank is survivable", sq.pickSimilarQuestion(null, bank[0]) === null && sq.canPractice(null, bank[0]) === false);
check("a missing missed-question is survivable", sq.pickSimilarQuestion(bank, null) === null);
check("the picker is pure — it records nothing", !/analytics|recordQuizResult|fetch|localStorage|supabase/i.test(code(read("src/data/similarQuestion.js"))));
check("the picker imports nothing at all", !/^\s*import\s/m.test(read("src/data/similarQuestion.js")));

// ---------------------------------------------------------------------------
// 3. Against the real Mathematics banks
// ---------------------------------------------------------------------------
section("real mathematics banks");

const kcBank = (() => {
  const kc = readJson("public/content/mathematics/knowledge-check.json");
  return Array.isArray(kc) ? kc : kc.questions;
})();
const practiceBank = (() => {
  const pr = readJson("public/content/mathematics/practice.json");
  return Array.isArray(pr) ? pr : pr.exercises;
})();

check("the knowledge check bank is the 25-question bank", kcBank.length === 25, String(kcBank.length));
// 100 is the floor of the product promise, not a ceiling: the syllabus-gap
// lessons took the Mathematics bank to 172 questions (extra practice 101-172).
check("the practice bank holds the 100-question promise", practiceBank.length >= 100, String(practiceBank.length));
check("every question carries an id", [...kcBank, ...practiceBank].every((q) => q.id !== undefined));
check("every question carries a topic", [...kcBank, ...practiceBank].every((q) => !!q.topic));
check(
  "every mathematics explanation is a multi-step worked solution (PR #73)",
  [...kcBank, ...practiceBank].every((q) => String(q.explanation || "").includes("\n") && (q.explanation.match(/\n/g) || []).length >= 2)
);

function auditBank(name, list) {
  const topicCount = list.reduce((acc, q) => acc.set(q.topic, (acc.get(q.topic) || 0) + 1), new Map());
  let wrong = 0;
  let fallbackOnly = 0;
  for (const q of list) {
    const pick = sq.pickSimilarQuestion(list, q, { random: Math.random });
    if (!pick || sq.questionKey(pick) === sq.questionKey(q)) wrong += 1;
    else if (pick.topic === q.topic) continue;
    else if ((topicCount.get(q.topic) || 0) > 1) wrong += 1; // a sibling existed and was not used
    else fallbackOnly += 1;
  }
  check(`${name}: every missed question gets a genuinely different question`, wrong === 0, `${wrong} bad picks`);
  check(`${name}: single-question topics fall back instead of dead-ending`, fallbackOnly > 0, `${fallbackOnly} fallbacks`);
}
auditBank("knowledge check", kcBank);
auditBank("extra practice", practiceBank);

// Content mirrors: this PR must not touch them.
for (const subject of ["mathematics"]) {
  for (const file of ["knowledge-check.json", "practice.json"]) {
    const a = existsSync(join(root, `content/${subject}/${file}`));
    if (!a) continue;
    check(
      `${subject}/${file} mirror is byte-identical`,
      read(`content/${subject}/${file}`) === read(`public/content/${subject}/${file}`)
    );
  }
}

// ---------------------------------------------------------------------------
// 4. The real components, rendered
// ---------------------------------------------------------------------------
section("rendered markup (react-dom/server over the real components)");

const cacheDir = join(root, "node_modules/.cache/math-review-loop");
mkdirSync(cacheDir, { recursive: true });
const entryFile = join(cacheDir, "entry.jsx");
writeFileSync(
  entryFile,
  [
    `import { createElement } from "react";`,
    `import { renderToStaticMarkup } from "react-dom/server";`,
    `import ReviewSolution from ${JSON.stringify(join(root, "src/components/ReviewSolution.jsx"))};`,
    `import HowToSolveIt from ${JSON.stringify(join(root, "src/components/HowToSolveIt.jsx"))};`,
    `import SimilarQuestionPractice from ${JSON.stringify(join(root, "src/components/SimilarQuestionPractice.jsx"))};`,
    `export const renderReview = (props) => renderToStaticMarkup(createElement(ReviewSolution, props));`,
    `export const renderCard = (props) => renderToStaticMarkup(createElement(HowToSolveIt, props));`,
    `export const renderPractice = (bank, missed) =>`,
    `  renderToStaticMarkup(createElement(SimilarQuestionPractice, { bank, missed, onClose: () => {} }));`,
    ``,
  ].join("\n")
);
const cssStub = {
  name: "css-stub",
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (a) => ({ path: a.path, namespace: "css-stub" }));
    build.onLoad({ filter: /.*/, namespace: "css-stub" }, () => ({ contents: "export default {};", loader: "js" }));
  },
};
const esbuild = await import("esbuild");
const outFile = join(cacheDir, "bundle.mjs");
await esbuild.build({
  entryPoints: [entryFile],
  outfile: outFile,
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  jsx: "automatic",
  loader: { ".js": "jsx", ".jsx": "jsx" },
  plugins: [cssStub],
  absWorkingDir: root,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
const ui = await import(pathToFileURL(outFile).href);

const STEPS = "Step 1 — multiply both sides by 4.\nStep 2 — divide by 3.\nStep 3 — the answer is 8.";
const wrongPlain = ui.renderReview({ explanation: STEPS, isCorrect: false, canPractice: false });
const wrongOpen = ui.renderReview({
  explanation: STEPS,
  isCorrect: false,
  canPractice: true,
  textClass: "quiz-review-explain",
  buttonClass: "quiz-btn quiz-btn-ghost",
});
const rightPlain = ui.renderReview({ explanation: STEPS, isCorrect: true, canPractice: true });

check("a WRONG answer renders the card", wrongPlain.includes("How to solve it"));
check("…and the whole explanation, steps and all", wrongPlain.includes("Step 1") && wrongPlain.includes("Step 3 — the answer is 8."));
check("the card carries the step classes the stylesheets pin", wrongPlain.includes('class="hsw-text'));
check("the card shows the toggle state", wrongPlain.includes('data-show-on-correct="false"'));
check("a RIGHT answer renders no card at all", !rightPlain.includes("hsw-card") && !rightPlain.includes("How to solve it"));
check("…and none of its text either", !rightPlain.includes("Step 1"));
check("a RIGHT answer offers no practice button", !rightPlain.includes("Practice a similar question"));
check("a WRONG answer with a sibling question offers the button", wrongOpen.includes("Practice a similar question"));
check("the button keeps the screen's own button styling", wrongOpen.includes("quiz-btn quiz-btn-ghost"));
check("the button is a real button, reachable by keyboard", /<button type="button"/.test(wrongOpen));
check("a WRONG answer in a one-question bank offers none (no dead end)", !wrongPlain.includes("Practice a similar question"));
check("no explanation → nothing to show", ui.renderCard({ explanation: "" }) === "" && ui.renderCard({}) === "");
check("an explanation with the card suppressed renders nothing", ui.renderCard({ explanation: STEPS, show: false }) === "");

const missed = kcBank.find((q) => kcBank.filter((s) => s.topic === q.topic).length > 1);
instrument();
const practiceMarkup = ui.renderPractice(kcBank, missed);
check("the practice card renders", practiceMarkup.includes("Practice a similar question"));
check("it says plainly that it is not graded", /not graded/i.test(practiceMarkup));
check("the practice question is NOT the one just missed", !practiceMarkup.includes(missed.question));
check("the practice question is a real question from the bank", kcBank.some((q) => q.id !== missed.id && practiceMarkup.includes(q.question)));
check("it names the topic being practised", practiceMarkup.includes(missed.topic.replace(/-/g, " ")));
check("the practice card never phones home", fetchCalls === 0, `${fetchCalls} fetch calls`);
check("…and never writes a draft", storageWrites.length === 0, JSON.stringify(storageWrites));
// Prove the instruments would have caught it (an untested check is a vacuous check).
instrument();
await globalThis.fetch("about:blank").catch(() => {});
globalThis.localStorage.setItem("probe", "1");
check("the fetch/storage instruments are live (sanity)", fetchCalls === 1 && storageWrites.length === 1);

// ---------------------------------------------------------------------------
// 5. The practice card is outside the exam
// ---------------------------------------------------------------------------
section("the practice card is outside the exam");

const practiceSrc = read("src/components/SimilarQuestionPractice.jsx");
const allowedImports = [
  'import { useState } from "react";',
  'import { pickSimilarQuestion, questionKey } from "../data/similarQuestion";',
  'import HowToSolveIt from "./HowToSolveIt";',
  'import "./SimilarQuestionPractice.css";',
];
check(
  "the card imports NOTHING that can score, time or record an attempt",
  [...practiceSrc.matchAll(/^import .*$/gm)].map((m) => m[0]).join("|") === allowedImports.join("|")
);
check("no analytics anywhere in the practice flow", !/recordQuizResult|analytics|lab_activity|quiz_results/.test(code(practiceSrc)));
check("no timer anywhere in the practice flow", !/setInterval|timeLeft|totalSeconds|Date\.now/.test(code(practiceSrc)));
check("no attempt payload: it never touches answers/score/session", !/\banswers\b|correctCount|scorePct|session|localStorage/.test(code(practiceSrc)));
check("the review card and its button are the shared block, not a local copy", !/hsw-card|white-space/.test(practiceSrc));

for (const [file, text] of Object.entries(screens)) {
  check(
    `${file} still records the attempt exactly once, from its own submit path`,
    (text.match(/recordQuizResult\(/g) || []).length === 1
  );
  check(`${file} keeps the parent attempt's own answers in that call`, /answers[,:]/.test(text));
}
check(
  "MockExam offers practice only after the paper is submitted (never mid-exam)",
  (screens["MockExam.jsx"].match(/<SimilarQuestionPractice/g) || []).length === 1 &&
    screens["MockExam.jsx"].indexOf("<SimilarQuestionPractice") > screens["MockExam.jsx"].indexOf("if (submitted)") &&
    screens["MockExam.jsx"].indexOf("<SimilarQuestionPractice") < screens["MockExam.jsx"].indexOf("Retake Mock Exam")
);
check(
  "MockExam's practice card draws from the questions the exam used",
  /<SimilarQuestionPractice\s+bank=\{questions\}\s+missed=\{qq\}/.test(screens["MockExam.jsx"])
);
check(
  "ExtraPractice offers it both the moment the answer is marked and in the review",
  (screens["ExtraPractice.jsx"].match(/<SimilarQuestionPractice/g) || []).length === 2
);
check(
  "Quiz (knowledge check) offers it in the review, from the knowledge-check bank",
  /<SimilarQuestionPractice\s+bank=\{questions\}\s+missed=\{q\}/.test(screens["Quiz.jsx"])
);
check(
  "opening the practice card replaces the review answer text rather than duplicating it",
  !/<p className="quiz-review-explain">/.test(screens["Quiz.jsx"]) &&
    !/<p className="ep-review-explain">/.test(screens["ExtraPractice.jsx"]) &&
    !/<p className="ep-review-explain">\{qq\.explanation\}/.test(screens["MockExam.jsx"])
);
check(
  "each screen resets the practice card when the attempt restarts",
  /setPracticeKey\(null\)/.test(screens["Quiz.jsx"]) &&
    /setPracticeKey\(null\)/.test(screens["ExtraPractice.jsx"]) &&
    /setPracticeKey\(null\)/.test(screens["MockExam.jsx"])
);

// ---------------------------------------------------------------------------
// 6. The stylesheets actually render the steps as steps
// ---------------------------------------------------------------------------
section("pre-line in the three review stylesheets");

const css = {
  "Quiz.css": { file: src("components/Quiz.css"), cls: "quiz-review-explain" },
  "ExtraPractice.css": { file: src("components/ExtraPractice.css"), cls: "ep-review-explain" },
  "MockExam.css": { file: src("components/MockExam.css"), cls: "me-review-explain" },
};
for (const [name, { file, cls }] of Object.entries(css)) {
  check(`${name} pins white-space: pre-line on .${cls}`, new RegExp(`\\.${cls}\\s*\\{[^}]*white-space:\\s*pre-line`).test(file), cls);
}
check(
  "the shared card sets pre-line itself, so no screen can lose the steps",
  /\.hsw-text\s*\{[^}]*white-space:\s*pre-line/s.test(src("components/HowToSolveIt.css"))
);
check(
  "the review class no longer shrinks the solution into grey italics",
  !/\.(quiz|ep)-review-explain\{[^}]*italic/.test(src("components/Quiz.css")) &&
    !/\.(quiz|ep)-review-explain\{[^}]*italic/.test(src("components/ExtraPractice.css"))
);
check(
  "the Mock Exam reviews with its own class (its stylesheet carries the pin)",
  /textClass="me-review-explain"/.test(screens["MockExam.jsx"])
);
check(
  "the card is boxed so it reads as a mini-lesson",
  /\.hsw-card\s*\{[^}]*border:/s.test(src("components/HowToSolveIt.css")) &&
    /\.hsw-card\s*\{[^}]*background:/s.test(src("components/HowToSolveIt.css"))
);

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
