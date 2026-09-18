// Verifies the typed-answer ("write") Paper 2 content and its UI contract.
//
//   node tools/check-paper2.mjs
//
// Checks, per subject that ships a paper2.json:
//   1. the file is an array of items, every item `type: "write"`, `paper: 2`
//   2. `topic` is a real lesson id in that subject's modules.json
//   3. `parts` (when present) is non-empty and sum(part.marks) === marks
//   4. every part / flat item has prompt, modelAnswer and a non-empty markScheme
//   5. `source` and `prompt` are present and non-empty; ids are unique
//   6. content/ and public/content/ mirrors are byte-identical
//   7. the auto-graded banks (practice.json / knowledge-check.json) contain no
//      `write` items — free writing is never auto-marked, so it must not leak
//      into a surface that scores by exact string match
//   8. the Paper 2 tab is wired in SubjectPage (import + tab + paid gate)

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;

function ok(label) {
  pass++;
  console.log(`  ✓ ${label}`);
}
function bad(label) {
  fail++;
  console.log(`  ✗ ${label}`);
}
function check(cond, label) {
  if (cond) ok(label);
  else bad(label);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");

// Subjects that ship the write type today (from the business plan / build-out).
// Every subject that ships a paper2.json is checked — discovered from disk, so a
// new subject PR only adds its own content files and never edits this tool.
const SUBJECTS = readdirSync(join(root, "content"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(root, "content", d.name, "paper2.json")))
  .map((d) => d.name)
  .sort();
// Documented totals (content/WRITE-QUESTION-FORMAT.md §Counting). Optional: a subject
// missing from this table still gets every structural check, and its totals are printed.
const EXPECTED = {
  "social-studies": { items: 10, marks: 239 },
  "english-b": { items: 9, marks: 265 },
  "agriculture-double-option": { items: 8, marks: 217 },
  // Caribbean History: 9 questions (3 per section, one answered from each),
  // 30 marks each = 270, written for the 2 h 10 min of the real Paper 02.
  "caribbean-history": { items: 9, marks: 270 },
};

const shapes = { withParts: 0, flat: 0 };

for (const subject of SUBJECTS) {
  console.log(`\n== ${subject} ==`);
  const contentPath = join(root, "content", subject, "paper2.json");
  const publicPath = join(root, "public", "content", subject, "paper2.json");

  check(existsSync(contentPath), "content/paper2.json exists");
  check(existsSync(publicPath), "public/content/paper2.json exists (mirror)");
  if (!existsSync(contentPath) || !existsSync(publicPath)) continue;

  check(md5(contentPath) === md5(publicPath), "mirror is byte-identical to content/");

  const items = readJson(contentPath);
  check(Array.isArray(items), "file is a JSON array");
  check(items.length > 0, "array is non-empty");

  const lessonIds = new Set();
  for (const mod of readJson(join(root, "content", subject, "modules.json"))) {
    for (const lesson of mod.lessons || []) lessonIds.add(lesson.id);
  }

  const ids = new Set();
  let totalMarks = 0;
  let badType = 0;
  let badPaper = 0;
  let dupIds = 0;
  let badTopic = 0;
  let badSource = 0;
  let badPrompt = 0;
  let badPartsSum = 0;
  let emptyParts = 0;
  let missingAnswer = 0;
  let badScheme = 0;

  for (const item of items) {
    if (item.type !== "write") badType++;
    if (item.paper !== 2) badPaper++;
    if (ids.has(item.id)) dupIds++;
    ids.add(item.id);
    if (!lessonIds.has(item.topic)) badTopic++;
    if (!item.source || String(item.source).trim() === "") badSource++;
    totalMarks += item.marks || 0;

    const parts = Array.isArray(item.parts) ? item.parts : null;
    if (parts) {
      shapes.withParts++;
      if (parts.length === 0) emptyParts++;
      const sum = parts.reduce((s, p) => s + (p.marks || 0), 0);
      if (sum !== item.marks) badPartsSum++;
      for (const part of parts) {
        if (!part.prompt || String(part.prompt).trim() === "") badPrompt++;
        if (!part.modelAnswer || String(part.modelAnswer).trim() === "") missingAnswer++;
        if (!Array.isArray(part.markScheme) || part.markScheme.length === 0) badScheme++;
      }
    } else {
      shapes.flat++;
      if (!item.prompt || String(item.prompt).trim() === "") badPrompt++;
      if (!item.modelAnswer || String(item.modelAnswer).trim() === "") missingAnswer++;
      if (!Array.isArray(item.markScheme) || item.markScheme.length === 0) badScheme++;
    }

    // Optional fields, when present, must be the documented shape.
    if (item.planningHints !== undefined && !Array.isArray(item.planningHints)) badScheme++;
    if (item.commandWords !== undefined && !Array.isArray(item.commandWords)) badScheme++;
  }

  check(badType === 0, `every item has type "write" (${items.length} items)`);
  check(badPaper === 0, "every item has paper: 2");
  check(dupIds === 0, "item ids are unique");
  check(badTopic === 0, "every topic matches a lesson id in modules.json");
  check(badSource === 0, "every item has a non-empty stimulus (source)");
  check(badPrompt === 0, "every part / flat item has a prompt");
  check(missingAnswer === 0, "every part / flat item has a model answer");
  check(badScheme === 0, "every markScheme is a non-empty array (and optional fields are arrays)");
  check(emptyParts === 0, "no item carries an empty parts array");
  check(badPartsSum === 0, "sum(part.marks) === item.marks for every item");

  // Counts are asserted only where they are documented; every subject always gets
  // the structural checks above.
  const expected = EXPECTED[subject];
  if (expected) {
    check(
      items.length === expected.items,
      `item count is ${expected.items} (found ${items.length})`
    );
    check(
      totalMarks === expected.marks,
      `total marks is ${expected.marks} (found ${totalMarks})`
    );
  } else {
    console.log(`  • ${items.length} items, ${totalMarks} marks (count not yet documented)`);
  }

  // Auto-graded banks must stay multiple-choice only.
  let writeLeak = 0;
  let nonMcq = 0;
  for (const bank of ["practice.json", "knowledge-check.json"]) {
    const p = join(root, "content", subject, bank);
    if (!existsSync(p)) continue;
    const questions = readJson(p);
    for (const q of questions) {
      if (q.type === "write") writeLeak++;
      const isMcq =
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        (q.answer !== undefined || q.correct !== undefined);
      if (!isMcq) nonMcq++;
    }
  }
  check(writeLeak === 0, "no write items leaked into the auto-graded banks (practice / knowledge check)");
  check(nonMcq === 0, "auto-graded banks are still all multiple-choice");
}

console.log("\n== shared renderer + tab wiring ==");
const writeQ = readFileSync(join(root, "src", "components", "WriteQuestion.jsx"), "utf8");
const section = readFileSync(join(root, "src", "components", "Paper2Section.jsx"), "utf8");
const subjPage = readFileSync(join(root, "src", "pages", "SubjectPage.jsx"), "utf8");
const css = readFileSync(join(root, "src", "components", "Paper2Section.css"), "utf8");

check(/Array\.isArray\(item\.parts\)/.test(section), "structured parts shape supported");
check(/item\.markScheme/.test(section) && /item\.modelAnswer/.test(section), "flat shape supported");
check(
  /Self-assessment/.test(writeQ) && !/correctAnswer|isCorrect|score\s*=[^=]/.test(writeQ),
  "self-assessment is labelled and nothing auto-marks the typed answer"
);
check(/csec-paper2-/.test(section), "drafts are persisted to localStorage");
check(/Array\.isArray\(markScheme\)/.test(writeQ), "mark scheme guarded before rendering");
check(/type="checkbox"/.test(writeQ), "per-line 'I made this point' checkboxes");
check(/import Paper2Section/.test(subjPage), "SubjectPage imports the Paper 2 section");
check(/id: "paper2"/.test(subjPage), "a Paper 2 tab is declared");
check(/hasPaper2/.test(subjPage) && /paper2\.json/.test(subjPage), "tab appears only when paper2.json exists");
check(
  /activeTab === "paper2" && \(paid \?/.test(subjPage),
  "Paper 2 sits behind the same paid gate as the other tabs"
);
check(/#9d174d/.test(subjPage) && /\.p2-/.test(css), "Paper 2 has its own tab colour and its own stylesheet");
check(
  /@media \(max-width: 860px\)/.test(css),
  "layout stacks on a phone-sized screen"
);

console.log(`\nshapes covered: ${shapes.withParts} items with parts, ${shapes.flat} flat items`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
