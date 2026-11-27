#!/usr/bin/env node
// Harness: Integrated Science, SECTION A — every chapter of the owner's list that belongs to modules
// is-a1..is-a7 is TAUGHT, and FINDABLE BY NAME, by a lesson inside its own module.
//
// The owner's chapter list (in chat, 2026-11-17) is recorded verbatim in
// /home/team/shared/integrated-science-chapters.md and restated in the repo by
// tools/check-integrated-science-modules.mjs (MODULE_TARGET, which also carries the per-module chapter
// COUNT). This file restates the 28 chapter NAMES for the seven Section A modules, and asserts:
//
//   1. the chapter table is 28 chapters over is-a1..is-a7, and its per-module counts equal the counts
//      MODULE_TARGET declares — the two tables are cross-checked, so neither can drift alone;
//   2. every chapter is named in the TITLE of exactly one lesson, and that lesson sits in the module the
//      chapter belongs to. The title is the surface a student scans in the lesson list, so "findable by
//      name" means the chapter's own words are in it — a mention buried in another lesson's prose is not
//      coverage, and would let one lesson "cover" chapters it never teaches;
//   3. no chapter is claimed twice anywhere in the subject, and no chapter is named by a lesson outside
//      its own module. This is the rule that caught is-l2-2 in is-a3 naming "Respiration", a chapter of
//      is-a5, when this harness widened from part 1's four modules to the whole section: the lesson does
//      teach cellular respiration, but a chapter of is-a5 cannot be owned from inside is-a3, so its title
//      was changed to name what it teaches and no more (pinned in check-integrated-science-modules.mjs);
//   4. every lesson in those seven modules either names a chapter of its module in its title, or is
//      declared chapterless in NO_CHAPTER with a written reason (is-l1-3, whose id is identity and whose
//      chapter does not exist in the owner's 96 — the owner ruled on 2026-11-27 that it stays in is-a1
//      as a foundation call and is not counted as a chapter);
//   5. each of those lessons is a real lesson, not filler: content, at least three objectives, at least
//      six concepts, an experiment with a type and a description, and content long enough to teach;
//   6. each has its OWN Play-tab lab set in src/components/lessonSets.js — a set with a title, a subtitle
//      and at least six gradable items — so the lab belongs to that lesson's topic and cannot silently
//      fall back to another lesson's activity;
//   7. content/ and public/content/ carry the same bytes for the tree this reads.
//
// What it CANNOT prove: that the science in a lesson is true. That is a reading judgement, made by the
// gate, and no harness can make it.
//
// Red controls run BY DEFAULT, with no arguments, because the suite invokes every harness that way — a
// control behind a flag is a control the suite never runs (measured 2026-11-19). `--no-red-control` skips
// them; `--red-control <name>` runs one. Every control is PINNED to the failure it exists for: a control
// caught by some other assertion reds the run, because "something failed" is not proof that the
// assertion the control is FOR still checks anything. A mutation that does not apply reports BROKEN.
//
// Usage
//   node tools/check-integrated-science-coverage.mjs                  # the real check + all red controls
//   node tools/check-integrated-science-coverage.mjs --no-red-control # the real check only
//   node tools/check-integrated-science-coverage.mjs --red-control chapter-not-named
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const clone = (v) => JSON.parse(JSON.stringify(v));

const SUBJECT = "integrated-science";
const MODULES = `content/${SUBJECT}/modules.json`;
const MIRROR = `public/${MODULES}`;

// The seven Section A modules, and the owner's chapters for each, verbatim from the chapter list.
export const SECTION_MODULES = ["is-a1", "is-a2", "is-a3", "is-a4", "is-a5", "is-a6", "is-a7"];
export const CHAPTERS = {
  "is-a1": [
    "Properties of States of Matter",
    "Cell Structure and Function",
    "Microbes and Their Impact",
    "Cell Transport",
  ],
  "is-a2": [
    "Asexual and Sexual Reproduction",
    "Sexual Reproduction in Plants and Humans",
    "Human Reproductive Cycles and Development",
    "Reproductive Health and STIs",
    "Growth Patterns and Population",
  ],
  "is-a3": [
    "Photosynthesis",
    "Crop Production and Food Chains",
    "Importance of Food and Diet",
    "Microorganisms, Food Contamination and Preservation",
    "Human Digestion",
  ],
  "is-a4": [
    "Need for Transport Systems",
    "Structure and Function of Transport Systems",
    "Blood Groups",
    "Cardiovascular Health",
  ],
  "is-a5": [
    "Effects of Drug Use and Exercise",
    "Human Skeletal System",
    "Respiration",
    "Air Quality and Respiratory Health",
  ],
  "is-a6": [
    "Excretion",
    "Sense Organs and Sight",
    "Hearing and Control Systems",
  ],
  "is-a7": [
    "Personal and Community Hygiene",
    "Pest and Food Contamination Control",
    "Waste Management and Environmental Impact",
  ],
};

// A lesson that teaches no chapter of the owner's list. Declared, with the reason, so the rule still
// binds every other lesson in these seven modules.
export const NO_CHAPTER = {
  "is-l1-3": "The Scientific Method and Data has no chapter in the owner's 96. OWNER RULING 2026-11-27: it stays in is-a1 as a foundation call — not retired, not moved, and not counted as a chapter by this harness",
};

// Lessons in the seven modules that the chapter build added (the coverage harness checks the whole
// module, so a lesson added later is checked too — this list only records which ones are new).
export const NEW_LESSON_IDS = [
  "is-l7-1",
  "is-l8-1", "is-l8-2", "is-l8-3", "is-l8-4", "is-l8-5",
  "is-l9-1", "is-l9-2", "is-l9-3",
  "is-l10-1", "is-l10-2", "is-l10-3", "is-l10-4",
  "is-l11-1", "is-l11-2", "is-l11-3", "is-l11-4",
  "is-l12-1", "is-l12-2", "is-l12-3",
  "is-l13-1", "is-l13-2", "is-l13-3",
];

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

// The per-module chapter counts are READ OUT OF the other harness's table rather than imported: that
// file is a script, and importing it would run its checks and exit the process. tools/
// check-integrated-science-modules.mjs is the one place the owner's list is restated, so parsing it here
// is what makes the two tables a cross-check instead of two copies that can drift apart.
export function moduleChapterCounts() {
  const src = read("tools/check-integrated-science-modules.mjs");
  const table = {};
  for (const m of src.matchAll(/\{ id: "(is-[abc]\d+)", title: "[^"]*", chapters: (\d+) \}/g)) table[m[1]] = Number(m[2]);
  return table;
}

// ---------------------------------------------------------------------------------------------
function loadState() {
  const modulesText = read(MODULES);
  return {
    chapters: clone(CHAPTERS),
    section: [...SECTION_MODULES],
    noChapter: clone(NO_CHAPTER),
    target: moduleChapterCounts(),
    modules: JSON.parse(modulesText),
    modulesText,
    mirrorText: read(MIRROR),
    sets: clone(lessonSets[SUBJECT] || {}),
  };
}

const lessonsOf = (st, mid) => {
  const mod = st.modules.find((m) => m.id === mid);
  return mod ? mod.lessons || [] : [];
};

/** Every (chapter, module, lesson) claim in the tree: a lesson title that names a chapter of its module. */
function claims(st) {
  const out = [];
  for (const mod of st.modules) {
    for (const l of mod.lessons || []) {
      const title = norm(l.title);
      for (const [mid, chapters] of Object.entries(st.chapters)) {
        for (const c of chapters) if (title.includes(norm(c))) out.push({ chapter: c, chapterModule: mid, lesson: l.id, module: mod.id });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
export function runChecks(st) {
  let pass = 0;
  const failures = [];
  const check = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const section = (t) => failures.push(`\u0000== ${t}`);

  const allChapters = Object.values(st.chapters).flat();

  // ---------------------------------------------------------------- 1. the table itself
  section("1. the chapter table is 28 chapters over the seven Section A modules, and agrees with MODULE_TARGET");
  check(Object.keys(st.chapters).join(",") === st.section.join(","),
    `the chapter table names the seven Section A modules (${st.section.join(", ")})`);
  check(Object.keys(st.target).length === 24,
    `the other harness's module table was found and parsed (${Object.keys(st.target).length} modules read)`);
  for (const mid of st.section) {
    const want = st.target[mid];
    const got = (st.chapters[mid] || []).length;
    check(got === want, `${mid} declares ${want} chapters (the table says ${got})`);
  }
  check(allChapters.length === 28, `Section A declares 28 chapters (the table says ${allChapters.length})`);
  check(new Set(allChapters.map(norm)).size === allChapters.length, "no chapter name is listed twice in the table");
  for (const mid of st.section) check(lessonsOf(st, mid).length > 0, `${mid} ships at least one lesson`);

  // ---------------------------------------------------------------- 2. each chapter is named in its module
  section("2. every chapter is named in the title of exactly one lesson inside its own module");
  const all = claims(st);
  for (const mid of st.section) {
    for (const c of st.chapters[mid]) {
      const here = all.filter((x) => x.chapter === c && x.module === mid);
      check(here.length > 0, `${c} is named by no lesson title in ${mid}`);
      check(here.length <= 1, `${c} is named by ${here.length} lesson titles in ${mid} (${here.map((x) => x.lesson).join(", ")}) — one chapter, one lesson`);
    }
  }

  // ---------------------------------------------------------------- 3. no chapter claimed twice or abroad
  section("3. no chapter is claimed twice in the subject, and none outside its own module");
  for (const c of allChapters) {
    const owners = all.filter((x) => x.chapter === c);
    check(owners.length <= 1, `${c} is claimed by ${owners.length} lessons across the subject (${owners.map((x) => `${x.module}/${x.lesson}`).join(", ")})`);
    const abroad = owners.filter((x) => x.module !== x.chapterModule);
    check(abroad.length === 0, `${c} is named by a lesson outside ${x0(abroad)} (found: ${abroad.map((x) => `${x.module}/${x.lesson}`).join(", ") || "none"})`);
  }

  // ---------------------------------------------------------------- 4. every lesson earns its place
  section("4. every lesson in the seven modules names a chapter, or is declared chapterless with a reason");
  for (const mid of st.section) {
    for (const l of lessonsOf(st, mid)) {
      const named = (st.chapters[mid] || []).filter((c) => norm(l.title).includes(norm(c)));
      if (st.noChapter[l.id]) {
        check(named.length === 0, `declared chapterless lesson ${l.id} names no chapter of ${mid} (found ${named.join(", ")})`);
      } else {
        check(named.length > 0, `${l.id} ("${l.title}") names no chapter of ${mid} and is not declared chapterless`);
      }
    }
  }
  for (const id of Object.keys(st.noChapter)) {
    const host = st.modules.find((m) => (m.lessons || []).some((l) => l.id === id));
    check(!!host, `declared chapterless lesson ${id} is still in the tree`);
  }

  // ---------------------------------------------------------------- 5. real content, not filler
  section("5. every lesson in the seven modules is a real lesson: content, objectives, concepts, a lab");
  for (const mid of st.section) {
    for (const l of lessonsOf(st, mid)) {
      check(typeof l.content === "string" && l.content.length >= 900, `${l.id}'s content teaches (${typeof l.content === "string" ? l.content.length : 0} characters, need 900)`);
      check(Array.isArray(l.objectives) && l.objectives.length >= 3, `${l.id} states at least three objectives`);
      check(Array.isArray(l.concepts) && l.concepts.length >= 6, `${l.id} names at least six concepts`);
      const ex = l.experiment;
      check(!!ex && typeof ex === "object" && typeof ex.type === "string" && ex.type.trim() !== "" && typeof ex.description === "string" && ex.description.trim() !== "",
        `${l.id} carries an experiment with a type and a description`);
      if (Array.isArray(l.objectives)) check(l.objectives.every((o) => typeof o === "string" && o.trim().length > 10), `${l.id}'s objectives are real sentences`);
      if (Array.isArray(l.concepts)) check(l.concepts.every((c) => typeof c === "string" && c.trim() !== ""), `${l.id}'s concepts are named`);
    }
  }

  // ---------------------------------------------------------------- 6. a lab of its own
  section("6. every lesson in the seven modules has its own Play-tab lab set");
  for (const mid of st.section) {
    for (const l of lessonsOf(st, mid)) {
      const set = st.sets[l.id];
      check(!!set, `${l.id} has a Play-tab lab set of its own (none in lessonSets)`);
      if (!set) continue;
      check(typeof set.title === "string" && set.title.trim() !== "", `${l.id}'s lab set is titled`);
      check(typeof set.subtitle === "string" && set.subtitle.trim() !== "", `${l.id}'s lab set says what to do`);
      const items = set.kind === "match" ? set.pairs : set.items;
      check(Array.isArray(items) && items.length >= 6, `${l.id}'s lab set has at least six gradable items (${Array.isArray(items) ? items.length : "none"})`);
      if (Array.isArray(items)) {
        if (set.kind === "match") {
          check(items.every((p) => p && typeof p.target === "string" && p.target.trim() && typeof p.label === "string" && p.label.trim()),
            `${l.id}'s matching pairs are complete`);
          check(new Set(items.map((p) => p.target)).size === items.length, `${l.id}'s lab targets are distinct`);
        } else {
          check(items.every((i) => i && typeof i.label === "string" && i.label.trim()), `${l.id}'s lab items are labelled`);
          if (set.kind === "sort") check(items.every((i) => (set.categories || []).some((c) => c.id === i.category)), `${l.id}'s sorted items all carry a category`);
          if (set.kind === "order") {
            check(items.every((i) => Number.isInteger(i.order)), `${l.id}'s ordered items all carry an order`);
            check(new Set(items.map((i) => i.order)).size === items.length, `${l.id}'s order positions are distinct`);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------- 7. the two trees
  section("7. content/ and public/content/ carry the same bytes");
  check(st.modulesText === st.mirrorText, `${MIRROR} is byte-identical to ${MODULES}`);

  return { pass, failures, chapters: allChapters.length, modules: st.section.length, lessons: st.section.reduce((n, m) => n + lessonsOf(st, m).length, 0) };
}

function x0(abroad) {
  return abroad.length ? abroad[0].chapterModule : "(its own module)";
}

// ---------------------------------------------------------------------------------------------
/** A lesson by id, found by the module that holds it — never by array index. */
const lessonOf = (st, id) => {
  for (const m of st.modules) {
    const l = (m.lessons || []).find((x) => x.id === id);
    if (l) return { mod: m, lesson: l };
  }
  throw new Error(`no lesson ${id} in the tree`);
};

// Each control mutates the loaded state in memory and MUST be caught, by the assertion it names.
export const RED_CONTROLS = {
  // a chapter stops being named: the lesson that owned it is retitled away
  "chapter-not-named": (st) => {
    lessonOf(st, "is-l10-3").lesson.title = "Blood Types";
  },
  // two lessons claim the same chapter inside one module
  "chapter-named-twice": (st) => {
    lessonOf(st, "is-l10-4").lesson.title = "Cardiovascular Health and Blood Groups";
  },
  // a chapter is named only by a lesson in a different module
  "chapter-in-wrong-module": (st) => {
    const { mod, lesson } = lessonOf(st, "is-l10-1");
    mod.lessons = mod.lessons.filter((l) => l.id !== lesson.id);
    st.modules.find((m) => m.id === "is-a3").lessons.push(lesson);
  },
  // the chapter table loses a chapter, so the per-module count no longer matches MODULE_TARGET
  "chapter-dropped": (st) => {
    st.chapters["is-a2"] = st.chapters["is-a2"].slice(1);
  },
  // a chapter of the newest modules stops being named — the widened table must reach is-a6 too
  "new-module-chapter-unnamed": (st) => {
    lessonOf(st, "is-l12-2").lesson.title = "The Eye and How We See";
  },
  // the exact defect widening this harness exposed: is-l2-2 in is-a3 names "Respiration", a chapter of
  // is-a5, so one chapter of Section A is claimed from outside its own module
  "respiration-claimed-from-a3": (st) => {
    lessonOf(st, "is-l2-2").lesson.title = "Photosynthesis, the Importance of Food and Diet, Respiration and Transport";
  },
  // a chapter name in the table is rewritten so the tree no longer names it
  "chapter-renamed": (st) => {
    st.chapters["is-a4"][3] = "Heart Disease and Stroke";
  },
  // a lesson appears in a Section A module with no chapter and no declaration
  "lesson-with-no-chapter": (st) => {
    st.modules.find((m) => m.id === "is-a2").lessons.push({ id: "is-l8-99", title: "An Extra Lesson", content: "x", objectives: ["a"], concepts: ["b"], experiment: { type: "drag-drop", description: "d" } });
  },
  // a lesson's lab set is deleted, so its Play tab falls back
  "lab-set-missing": (st) => {
    if (!st.sets["is-l9-3"]) throw new Error("is-l9-3 has no lab set to delete");
    delete st.sets["is-l9-3"];
  },
  // a lesson that names its chapter and teaches nothing
  "filler-lesson": (st) => {
    lessonOf(st, "is-l8-5").lesson.content = "Growth is when things grow.";
  },
  // the declared chapterless lesson is quietly removed
  "chapterless-lesson-removed": (st) => {
    const { mod, lesson } = lessonOf(st, "is-l1-3");
    mod.lessons = mod.lessons.filter((l) => l.id !== lesson.id);
  },
  // one byte of the public mirror moves
  "mirror-perturbed": (st) => { st.mirrorText = st.mirrorText.replace("{", "{ "); },
};

// What each control must be caught BY. A missing pin, or a pin no failure contains, reds the run.
export const RED_EXPECT = {
  "chapter-not-named": ["Blood Groups is named by no lesson title in is-a4"],
  "chapter-named-twice": ["Blood Groups is named by 2 lesson titles in is-a4 (is-l10-3, is-l10-4) — one chapter, one lesson"],
  "chapter-in-wrong-module": [
    "Need for Transport Systems is named by no lesson title in is-a4",
    "Need for Transport Systems is named by a lesson outside is-a4 (found: is-a3/is-l10-1)",
  ],
  "chapter-dropped": ["is-a2 declares 5 chapters (the table says 4)", "Section A declares 28 chapters (the table says 27)"],
  "new-module-chapter-unnamed": ["Sense Organs and Sight is named by no lesson title in is-a6"],
  "respiration-claimed-from-a3": [
    "Respiration is claimed by 2 lessons across the subject (is-a3/is-l2-2, is-a5/is-l11-3)",
    "Respiration is named by a lesson outside is-a5 (found: is-a3/is-l2-2)",
  ],
  "chapter-renamed": ["Heart Disease and Stroke is named by no lesson title in is-a4"],
  "lesson-with-no-chapter": ['is-l8-99 ("An Extra Lesson") names no chapter of is-a2 and is not declared chapterless'],
  "lab-set-missing": ["is-l9-3 has a Play-tab lab set of its own (none in lessonSets)"],
  "filler-lesson": ["is-l8-5's content teaches"],
  "chapterless-lesson-removed": ["declared chapterless lesson is-l1-3 is still in the tree"],
  "mirror-perturbed": ["public/content/integrated-science/modules.json is byte-identical to content/integrated-science/modules.json"],
};

function runControl(name) {
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name] || [];
  if (!expect.length) return { ok: false, real, why: "HAS NO PINNED EXPECTATION — a control that names no failure proves nothing" };
  const missing = expect.filter((e) => !real.some((f) => f.includes(e)));
  if (missing.length) return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${missing[0]}"` };
  return { ok: true, real: real.filter((f) => expect.some((e) => f.includes(e))) };
}

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const only = argv.includes("--red-control") ? argv[argv.indexOf("--red-control") + 1] : null;

if (only) {
  if (!RED_CONTROLS[only]) { console.log(`unknown red control: ${only}`); process.exit(2); }
  let r;
  try { r = runControl(only); } catch (e) { console.log(`RED CONTROL "${only}" BROKE — ${e.message}`); process.exit(1); }
  if (!r.ok) { console.log(`RED CONTROL "${only}" ${r.why}`); r.real.slice(0, 3).forEach((f) => console.log("   " + f)); process.exit(1); }
  console.log(`red control "${only}": caught — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}

const st = loadState();
const { pass, failures, chapters, modules, lessons } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const realFailures = failures.filter((f) => !f.startsWith("\u0000")).length;
const perModule = SECTION_MODULES.map((m) => `${m} ${(CHAPTERS[m] || []).length}`).join(" · ");
console.log(`\ncheck-integrated-science-coverage: ${pass} checks passed, ${realFailures} failed · ${chapters} chapters (${perModule}) · ${lessons} lessons in ${modules} modules`);

if (argv.includes("--no-red-control")) process.exit(realFailures ? 1 : 0);

// Red controls run by DEFAULT — the suite passes no arguments.
let bad = 0;
for (const name of Object.keys(RED_CONTROLS)) {
  let r;
  try { r = runControl(name); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
  if (!r.ok) { bad++; console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`); }
  else console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
}
console.log(`${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
process.exit(realFailures || bad ? 1 : 0);
