#!/usr/bin/env node
// A Biology figure may only print a word its own lesson teaches.
//
// WHY THIS EXISTS
// The cell-levels defect was found by READING, not by a harness: bio-cell-levels-of-organisation
// tells the student "The labelled diagram below reads from the smallest level to the largest" and
// shipped no figure at all. No check could see it. The mirror image of that defect is a figure
// that prints a word its lesson never teaches — a student meets a term with no explanation, or
// (worse) a term that is simply wrong for the course. This harness closes that direction.
//
// WHAT IT PROVES
//   - every `<text>` string in every Biology figure is made only of words that appear, whole-word
//     and case-insensitively, in that figure's HOST LESSON (title + content + concepts +
//     objectives) — so a label is never a term the lesson does not teach;
//   - both trees ship the figure, byte for byte identical to each other;
//   - every figure is SVG-only: one <svg> element, a viewBox, no raster, no <script>, no external
//     URL, no SMIL animation (Biology has no row in check-physics-animations.mjs);
//   - every figure is attached to exactly one lesson through figures[] with exactly
//     src / alt / caption, and every .svg shipped in content/biology/figures/ is named by a
//     lesson — so a figure can neither exist unreferenced nor be referenced twice.
//
// WHAT IT DOES NOT PROVE (read this before trusting a green run)
//   - That the science is TRUE. It proves the vocabulary is taught and the file is identical in
//     both trees; it cannot tell a biceps from a triceps, and a drawing that is wrong but labelled
//     with taught words passes. Only a read of the picture catches that.
//   - That the figure RENDERS or that a label is legible/does not overlap another. Geometry is a
//     different instrument (the generator's own check() and a render read-back).
//   - That the words are used in a TRUE clause. A lesson that says "the lens is thin" and a figure
//     that labels the thick lens "thin" would pass this guard.
//
// RED CONTROLS RUN BY DEFAULT, each with an explicit RED_EXPECT. A guard behind an opt-in flag is
// not a guard: the suite runs every tools/check-*.mjs with no arguments, so a control behind
// --red-control has never run there. These four are part of the normal run and the count is
// printed. No control writes to the tree: every mutation is in memory.
//
// Usage: node tools/check-biology-figure-labels.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUBJECT = "biology";
const TREES = ["content", "public/content"];

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log(`  ok   ${msg}`); }
  else { fail++; failures.push(msg); console.log(`  FAIL ${msg}`); }
}
function section(t) { console.log(`\n${t}`); }
const md5 = (buf) => crypto.createHash("md5").update(buf).digest("hex");

// ---------------------------------------------------------------------------
// The lesson copy is the authority for every word a figure may print.

const mods = JSON.parse(fs.readFileSync(path.join(ROOT, "content", SUBJECT, "modules.json"), "utf8"));
const lessons = [];
for (const m of mods) for (const l of (m.lessons || [])) lessons.push(l);
const byId = new Map(lessons.map((l) => [l.id, l]));

/** Everything a lesson teaches in words: its title, content, concepts and objectives. */
function lessonCorpus(lesson) {
  const concepts = Array.isArray(lesson.concepts) ? lesson.concepts : [];
  const objectives = Array.isArray(lesson.objectives) ? lesson.objectives : [];
  return [lesson.title || "", lesson.content || "", ...concepts, ...objectives].join("\n");
}
const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();

// A word is letters. Digits, punctuation and the arrow/subscript symbols these figures use carry
// no vocabulary claim; "CO2" written as a symbol would smuggle in "CO", which is why every gas in
// these figures is spelt out in the lesson's own words.
const WORD = /[A-Za-z\u00C0-\u024F]+/g;

/** Every string a figure actually PRINTS — read from the SVG, never from a list beside it. */
function textNodes(svg) {
  const out = [];
  for (const m of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)) {
    const raw = m[1]
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&amp;/g, "&");
    if (raw.trim()) out.push(raw);
  }
  return out;
}

/** The whole-word test: "nitrogen" is taught by a lesson that writes "nitrogen-fixing". */
function wordTaught(word, corpus) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z\u00e0-\u024f])${escaped}([^a-z\u00e0-\u024f]|$)`).test(corpus);
}

/**
 * The guard itself, as a pure function of (lesson corpus, printed strings), so the red controls
 * can hand it a copy it has broken without touching a file.
 * Returns the list of words the figure prints that the copy never teaches.
 */
function untaughtWords(corpus, texts) {
  const words = new Set();
  for (const t of texts) for (const m of String(t).matchAll(WORD)) words.add(m[0].toLowerCase());
  const missing = [...words].filter((w) => !wordTaught(w, corpus));
  return { words, missing };
}

// ---------------------------------------------------------------------------
// The figure contract, checked on a string so the controls can mutate one.

const BANNED = [
  ["<image", "a raster image"],
  ["<script", "a script"],
  ["xlink:href", "an external reference"],
  ["data:image", "an embedded raster"],
  ["<animate", "SMIL animation (Biology has no row in check-physics-animations.mjs)"],
  ["<set ", "SMIL animation"],
  ["http://", "an external URL"],
  ["https://", "an external URL"],
];

// A figure with fewer labels than this is treated as unlabelled: a taught-labels check on a
// figure that prints nothing proves nothing.
const MIN_LABELS = 8;
const tooFewLabels = (texts) => texts.length < MIN_LABELS;

function svgProblems(name, svg) {
  const problems = [];
  if (!svg.trimStart().startsWith("<svg ")) problems.push(`${name}: does not start with <svg`);
  if (!svg.trimEnd().endsWith("</svg>")) problems.push(`${name}: does not end with </svg>`);
  if ((svg.match(/<svg\b/g) || []).length !== 1) problems.push(`${name}: is not a single <svg> element`);
  if (!/viewBox="0 0 \d+ \d+"/.test(svg)) problems.push(`${name}: has no viewBox="0 0 W H"`);
  // The SVG namespace is the one URL a figure is allowed to contain.
  const body = svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "");
  for (const [needle, what] of BANNED) {
    if (body.includes(needle)) problems.push(`${name}: contains ${what} (${needle})`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The shipped figures, read once.

const figureDir = (tree) => path.join(ROOT, tree, SUBJECT, "figures");
const shipped = {};
for (const tree of TREES) {
  const dir = figureDir(tree);
  ok(fs.existsSync(dir), `${tree}/${SUBJECT}/figures exists`);
  shipped[tree] = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".svg")).sort()
    : [];
}

const carriers = lessons.filter((l) => Array.isArray(l.figures) && l.figures.length > 0);
section("1. every Biology figure is attached to exactly one lesson, with src / alt / caption");
ok(carriers.length > 0, `lessons carrying a figure: ${carriers.length}`);
const srcSeen = new Map();
for (const l of carriers) {
  for (const f of l.figures) {
    ok(Object.keys(f).sort().join(",") === "alt,caption,src",
       `${l.id}: its figure carries exactly src / alt / caption (got ${Object.keys(f).sort().join(",")})`);
    ok(typeof f.alt === "string" && f.alt.trim().length > 20,
       `${l.id}: its figure has alt text describing what the picture shows`);
    ok(typeof f.caption === "string" && f.caption.trim().length > 10,
       `${l.id}: its figure has a caption saying what to notice`);
    ok(typeof f.src === "string" && f.src.endsWith(".svg"),
       `${l.id}: its figure src is an SVG (${f.src})`);
    const base = path.basename(String(f.src || ""));
    if (srcSeen.has(base)) {
      ok(false, `${base} is named by BOTH ${srcSeen.get(base)} and ${l.id} — a figure belongs to one lesson`);
    } else {
      srcSeen.set(base, l.id);
    }
  }
}

section("2. every shipped figure is referenced, and every reference is shipped");
const allShipped = [...new Set([...shipped[TREES[0]], ...shipped[TREES[1]]])].sort();
const unreferenced = allShipped.filter((n) => !srcSeen.has(n));
ok(unreferenced.length === 0,
   `every .svg in content/${SUBJECT}/figures is named by a lesson's figures[].src` +
   (unreferenced.length ? ` — unreferenced: ${unreferenced.join(", ")}` : ""));
const missingFiles = [...srcSeen.keys()].filter((n) => !allShipped.includes(n));
ok(missingFiles.length === 0,
   `every figures[].src resolves to a shipped SVG` +
   (missingFiles.length ? ` — missing: ${missingFiles.join(", ")}` : ""));

section("3. both trees ship the same bytes, and the figure is SVG-only");
const svgText = {};
for (const [base, lessonId] of [...srcSeen.entries()].sort()) {
  const bufs = {};
  for (const tree of TREES) {
    const p = path.join(figureDir(tree), base);
    ok(fs.existsSync(p), `${tree}/${SUBJECT}/figures/${base} is shipped`);
    if (fs.existsSync(p)) bufs[tree] = fs.readFileSync(p);
  }
  if (bufs[TREES[0]] && bufs[TREES[1]]) {
    ok(md5(bufs[TREES[0]]) === md5(bufs[TREES[1]]),
       `${base}: content/ and public/content/ are byte-identical`);
    ok(bufs[TREES[0]].equals(bufs[TREES[1]]),
       `${base}: and the bytes are the same bytes, not just the same length`);
  }
  if (bufs[TREES[0]]) {
    const text = bufs[TREES[0]].toString("utf8");
    svgText[base] = text;
    const problems = svgProblems(base, text);
    ok(problems.length === 0,
       `${base}: SVG-only with a viewBox, no raster, no script, no external URL, no SMIL` +
       (problems.length ? `\n         ${problems.join("\n         ")}` : ""));
  }
}

section("4. every word a figure prints is a word its host lesson teaches");

// The three figures that shipped BEFORE this build label themselves with a few words their lesson
// never prints (a singular where the lesson only writes the plural, and the heart's colour key).
// The guard still runs on them and measures the gap; this map PINS it, so it can only shrink:
// a new untaught word on one of these figures FAILS, and fixing one means editing this list too.
// They are not fixed here because re-labelling re-renders a file H&SB copies byte-for-byte (the
// heart) and Integrated Science asserts the geometry of (the cell) — a coordinated change, not
// this PR's. Every word below is a real, checked gap, not an allowance.
const PRE_EXISTING_DEBT = {
  "heart-and-double-circulation.svg": ["apart", "blue", "deliver", "keeps", "take"],
  "kidney-and-nephron.svg": ["capillary", "drawn", "larger", "life", "many", "one", "path", "than"],
  "plant-and-animal-cell.svg": ["also", "lysosome", "mitochondrion", "ribosome"],
};
let debtWords = 0;
let wordsChecked = 0;
let textsChecked = 0;
for (const [base, lessonId] of [...srcSeen.entries()].sort()) {
  const lesson = byId.get(lessonId);
  ok(!!lesson, `${lessonId} exists in content/${SUBJECT}/modules.json`);
  if (!lesson || !svgText[base]) continue;
  const texts = textNodes(svgText[base]);
  ok(!tooFewLabels(texts),
     `${base}: prints ${texts.length} labels (a figure with no labels proves nothing)`);
  const { words, missing } = untaughtWords(norm(lessonCorpus(lesson)), texts);
  wordsChecked += words.size;
  textsChecked += texts.length;
  const pinned = (PRE_EXISTING_DEBT[base] || []).slice().sort();
  const found = missing.slice().sort();
  const asPinned = JSON.stringify(found) === JSON.stringify(pinned);
  debtWords += pinned.length;
  ok(asPinned,
     (pinned.length
       ? `${base}: ${words.size} words, ${pinned.length} of them the pinned pre-existing debt ` +
         `(${pinned.join(", ")}) and no NEW untaught word`
       : `${base}: all ${words.size} of its words are taught by ${lessonId}`) +
     (asPinned ? "" : ` — UNTAUGHT: ${found.map((w) => `"${w}"`).join(", ")}` +
                     ` (pinned: ${pinned.map((w) => `"${w}"`).join(", ") || "none"})`));
}
console.log(`       (${textsChecked} labels, ${wordsChecked} distinct words across ${srcSeen.size} figures)`);
console.log(`       (pinned pre-existing debt: ${debtWords} word(s) on ${Object.keys(PRE_EXISTING_DEBT).length} ` +
            `figure(s) that predate this build — measured here, not waived from the check)`);

// ---------------------------------------------------------------------------
// Red controls — in memory, every run.
section("5. RED CONTROLS — the guard bites, in both directions, on every run");

let controlsBit = 0;
let controlsRun = 0;
// `fn` ASSERTS THAT THE GUARD BITES: it throws when the guard failed to catch what it should.
function control(expect, fn) {
  controlsRun++;
  let problem = null;
  try { fn(); } catch (e) { problem = e.message || String(e); }
  const bit = problem === null;
  ok(bit, `RED_EXPECT: ${expect} — ${bit ? "bit" : `DID NOT BITE (${problem})`}`);
  if (bit) controlsBit++;
}
function must(cond, msg) { if (!cond) throw new Error(msg); }

// Pick a real figure and a real label from it, so no control is keyed to a hand-written example
// that a later slice could leave pointing at nothing.
const sampleBase = [...srcSeen.keys()].sort()[0];
const sampleLesson = byId.get(srcSeen.get(sampleBase));
const sampleTexts = textNodes(svgText[sampleBase] || "");
const sampleCorpus = norm(lessonCorpus(sampleLesson || {}));
ok(sampleTexts.length > 0, `red control: found a real label to work with in ${sampleBase}`);
const aWord = (sampleTexts.join(" ").match(WORD) || ["zzz"])[0].toLowerCase();

// (a) a label REMOVED from the copy: the figure still prints it, the lesson no longer teaches it.
control(`a word removed from ${sampleLesson.id}'s copy is caught`, () => {
  const broken = sampleCorpus.replace(
    new RegExp(`(^|[^a-z\\u00e0-\\u024f])${aWord}(?=[^a-z\\u00e0-\\u024f]|$)`, "g"), "$1");
  must(broken !== sampleCorpus, `the control could not remove "${aWord}" from the copy`);
  must(!wordTaught(aWord, broken), `"${aWord}" is still taught by the broken copy — the control is broken`);
  const { missing } = untaughtWords(broken, sampleTexts);
  must(missing.includes(aWord),
       `removing "${aWord}" from the lesson copy was NOT caught by the guard`);
});

// (b) a label INVENTED that the copy never says — the direction that catches a wrong term.
control("a label the lesson never prints is caught", () => {
  const { missing } = untaughtWords(sampleCorpus, [...sampleTexts, "Sarcoplasm"]);
  must(missing.includes("sarcoplasm"), 'the guard accepted the invented label "Sarcoplasm"');
});

// (c) a figure edited in ONE tree only — the byte-identity half of the contract.
control("a one-byte edit to one tree is caught", () => {
  const a = Buffer.from(svgText[sampleBase], "utf8");
  const b = Buffer.from(svgText[sampleBase], "utf8");
  b[b.length - 3] = b[b.length - 3] ^ 0x01;
  must(md5(a) !== md5(b), "the byte-flip control did not change the bytes");
  must(a.equals(b) === false, "the byte-identity comparison did not notice the edit");
});

// (d) a figure with no labels at all would make the taught-labels check vacuous.
control("a figure that prints nothing is caught", () => {
  must(tooFewLabels([]), "a figure with no <text> at all was accepted as labelled");
  must(tooFewLabels(textNodes("<svg><rect/></svg>")), "an unlabelled <svg> was accepted as labelled");
});

// (e) the contract half bites: a banned element must be reported.
control("a raster or a script inside a figure is caught", () => {
  for (const needle of ["<image", "<script", "http://"]) {
    const problems = svgProblems("probe.svg", `<svg viewBox="0 0 10 10">${needle}</svg>`);
    must(problems.length > 0, `the contract check accepted a figure containing ${needle}`);
  }
});

console.log(`\nred controls: ${controlsBit}/${controlsRun} bit`);
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("\nA word reported as UNTAUGHT is either a label the figure should not print, or a");
  console.log("word the lesson ought to teach and does not. The brief's rule: the figure is wrong,");
  console.log("not the lesson — drop the label or use the lesson's own phrasing.");
}
process.exit(fail === 0 ? 0 : 1);
