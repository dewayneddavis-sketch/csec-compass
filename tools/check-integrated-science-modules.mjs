#!/usr/bin/env node
// Harness: Integrated Science modules — the owner's 24-module / 3-section shape is really in the tree, the
// 18 existing lessons are re-homed into it without moving, and the banks and figures did not move at all.
//
// Owner directive 2026-11-17 (in chat): "we re-home the 18 existing lessons into the new 24-module shape,
// which is cleaner for students but changes module ids … do this." The brief this ships against is
// /home/team/shared/integrated-science-rehome-brief.md; the shape itself is the owner's own chapter list,
// recorded verbatim in /home/team/shared/integrated-science-chapters.md.
//
// THIS FILE IS THE ONE PLACE THE CHAPTER LIST IS RESTATED. The chapters file is a markdown note that
// anyone can edit; a harness cannot silently lose a module. MODULE_TARGET below was produced by parsing
// that file — the bold module headings and the bullets under each — and its per-module chapter counts
// were cross-checked against the count each heading declares in brackets (all 24 agreed). If the owner's
// list changes, this table changes with it, deliberately, in a diff somebody reads.
//
// What it proves
//   1. metadata.estimatedModules is 24 AND equals modules.length — both, so the number can never drift
//      from the tree in either direction (the Chemistry `estimatedModules` bug, parked, is that drift);
//   2. the tree holds exactly the 24 modules, in the owner's order, with the owner's titles verbatim;
//   3. the id prefixes carry the three sections — is-a* 7, is-b* 9, is-c* 8 — and no module id matches
//      ^is-mod- (the 6 generic modules are gone, and their ids are not reused for the new shape);
//   4. the chapter counts per module, and the per-section totals 28 / 37 / 31 = 96, come out of that
//      table — the numbers are DERIVED from it, never quoted;
//   5. the 18 re-homed lesson ids are all present and none is in two modules; every module carries a
//      `lessons` array, empty where the chapter build has not reached it yet. A chapter build adds lessons
//      to these modules, so the old "exactly 18 lessons, flattening in the pinned order" rule is gone: the
//      real failure it caught — a re-homed lesson that left its module — is now caught by rule 6, and an
//      unknown lesson appearing from nowhere is caught by NEW_LESSONS below, which every slice must extend
//      deliberately, in a diff somebody reads;
//   6. every re-homed lesson sits in the module whose chapters it teaches, as pinned in PLACEMENT below,
//      in its pinned order, and every lesson this build added sits in the module that declares it;
//   7. the four bank files and every figures[].src (and the SVG files they point at) are BYTE-UNCHANGED
//      against origin/main — read out of git, never a hardcoded copy — so a structural PR cannot quietly
//      move a question or a picture;
//   8. the 18 lessons' own copy (content, concepts, objectives, experiment, figures) is unchanged against
//      origin/main: re-homing moves a lesson between modules, it does not rewrite it. Their TITLES are
//      unchanged too, except for the three pinned in SHARPENED_TITLES, which the chapter build retitled so
//      that the chapter each already taught is findable by name; a retitle to anything but the pinned
//      wording reds the run;
//   9. content/ and public/content/ are byte-identical for every file this harness reads.
//
// What it CANNOT prove: that a lesson belongs under the module it was put in — that is a reading judgement
// about which chapters a lesson teaches, made once and pinned here. Nor can it prove the science is true.
//
// Red controls run BY DEFAULT, with no arguments, because the suite invokes every harness that way — a
// control behind a flag is a control the suite never runs (measured 2026-11-19). `--no-red-control` skips
// them; `--red-control <name>` runs one. Every control is PINNED to the assertion it exists for: a control
// caught by some other failure reds the run, because "something failed" is not proof that the assertion
// the control is FOR still checks anything.
//
// Usage
//   node tools/check-integrated-science-modules.mjs                  # the real check + all 15 red controls
//   node tools/check-integrated-science-modules.mjs --no-red-control # the real check only
//   node tools/check-integrated-science-modules.mjs --red-control lesson-dropped
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const clone = (v) => JSON.parse(JSON.stringify(v));

const SUBJECT = "integrated-science";
const MODULES = `content/${SUBJECT}/modules.json`;
const MIRROR = `public/${MODULES}`;
const METADATA = `content/${SUBJECT}/metadata.json`;
const META_MIRROR = `public/${METADATA}`;
const BANKS = ["practice.json", "knowledge-check.json", "paper2.json", "sba.json"];
const BASELINE = "origin/main";

// The owner's 24 modules: id, title, and the number of chapters the chapters file lists under each.
// Sections are expressed by the id prefix — no module object in any subject carries a `section` field.
export const MODULE_TARGET = [
  { id: "is-a1", title: "Foundations of Life and Matter", chapters: 4 },
  { id: "is-a2", title: "Reproduction and Growth", chapters: 5 },
  { id: "is-a3", title: "Nutrition and Digestion", chapters: 5 },
  { id: "is-a4", title: "Transport and Circulation", chapters: 4 },
  { id: "is-a5", title: "Health and Body Systems", chapters: 4 },
  { id: "is-a6", title: "Excretion and Sensory Systems", chapters: 3 },
  { id: "is-a7", title: "Environmental Health and Waste Management", chapters: 3 },
  { id: "is-b1", title: "Heat and Temperature", chapters: 5 },
  { id: "is-b2", title: "Energy and Momentum", chapters: 4 },
  { id: "is-b3", title: "Electrical Circuits and Power", chapters: 6 },
  { id: "is-b4", title: "Safety and Hazard Management", chapters: 4 },
  { id: "is-b5", title: "Simple Machines", chapters: 4 },
  { id: "is-b6", title: "Material Properties and Applications", chapters: 2 },
  { id: "is-b7", title: "Metals and Corrosion", chapters: 4 },
  { id: "is-b8", title: "Household Chemicals and Mixtures", chapters: 4 },
  { id: "is-b9", title: "Cleaning Agents and Water Chemistry", chapters: 4 },
  { id: "is-c1", title: "Earth and the Universe", chapters: 5 },
  { id: "is-c2", title: "Soil Science", chapters: 4 },
  { id: "is-c3", title: "Biogeochemical Cycles", chapters: 1 },
  { id: "is-c4", title: "Atmospheric and Geological Processes", chapters: 7 },
  { id: "is-c5", title: "Water Resources", chapters: 5 },
  { id: "is-c6", title: "Maritime Activities", chapters: 4 },
  { id: "is-c7", title: "Energy Resources", chapters: 2 },
  { id: "is-c8", title: "Forces and Stability", chapters: 3 },
];

// The owner's three sections, as the chapters file states them. Every number below is checked against
// the table above (summed), not trusted: if the table and this disagree, the run reds.
export const SECTIONS = {
  a: { title: "The Organism and Its Environment", modules: 7, chapters: 28 },
  b: { title: "The Home and Workplace", modules: 9, chapters: 37 },
  c: { title: "Earth's Place in the Universe", modules: 8, chapters: 31 },
};

// The 18 lessons that existed before the re-home, and the module each one now sits under. Lesson ids are
// identity: this table is the record of where each went, and every id here must appear in the tree
// unchanged. Which module a lesson belongs to is a reading judgement about the chapters it teaches; the
// three that span two modules (is-l2-2 nutrition/transport, is-l2-3 ecology/cycles, is-l6-3 water/waste)
// are noted in the PR that landed this, and a later slice may move one with the reason written down.
export const PLACEMENT = {
  "is-a1": ["is-l1-3", "is-l2-1", "is-l3-1"],
  "is-a2": [],
  "is-a3": ["is-l2-2"],
  "is-a4": [],
  "is-a5": [],
  "is-a6": [],
  "is-a7": [],
  "is-b1": ["is-l1-2", "is-l5-3"],
  "is-b2": ["is-l4-1"],
  "is-b3": ["is-l5-1", "is-l5-2"],
  "is-b4": ["is-l1-1"],
  "is-b5": ["is-l4-3"],
  "is-b6": [],
  "is-b7": [],
  "is-b8": ["is-l3-2", "is-l3-3"],
  "is-b9": [],
  "is-c1": [],
  "is-c2": ["is-l6-1"],
  "is-c3": ["is-l2-3"],
  "is-c4": ["is-l6-2"],
  "is-c5": ["is-l6-3"],
  "is-c6": [],
  "is-c7": [],
  "is-c8": ["is-l4-2"],
};

/** The 18 lesson ids, in the order the tree must flatten to: module order, then placement order. */
export const LESSON_ORDER = MODULE_TARGET.flatMap((m) => PLACEMENT[m.id] || []);

// The lessons the Section A chapter build added, by the module that declares them. This table is the
// record: a lesson in the tree that is neither one of the 18 nor one of these reds the run, so a slice
// cannot land lessons this harness has never heard of. It is extended deliberately, one slice at a time.
export const NEW_LESSONS = {
  "is-a1": ["is-l7-1"],
  "is-a2": ["is-l8-1", "is-l8-2", "is-l8-3", "is-l8-4", "is-l8-5"],
  "is-a3": ["is-l9-1", "is-l9-2", "is-l9-3"],
  "is-a4": ["is-l10-1", "is-l10-2", "is-l10-3", "is-l10-4"],
};
export const NEW_LESSON_IDS = Object.values(NEW_LESSONS).flat();

// Three of the 18 already taught a chapter of the owner's list under a title that did not name it. The
// chapter build sharpened exactly those titles to the wording below and no others: the ids are untouched,
// and every other field of every one of the 18 lessons is still byte-unchanged.
export const SHARPENED_TITLES = {
  "is-l2-1": "Cell Structure and Function, and Cell Transport",
  "is-l3-1": "Properties of States of Matter",
  "is-l2-2": "Photosynthesis, the Importance of Food and Diet, Respiration and Transport",
};

/** Read a file as it stands on origin/main. Never a copy: a hardcoded baseline proves nothing. */
function fromGit(rel) {
  return execFileSync("git", ["show", `${BASELINE}:${rel}`], {
    cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"],
  });
}

// ---------------------------------------------------------------------------------------------
function loadState() {
  const modulesText = read(MODULES);
  const st = {
    table: clone(MODULE_TARGET),
    sections: clone(SECTIONS),
    placement: clone(PLACEMENT),
    newLessons: clone(NEW_LESSONS),
    sharpened: clone(SHARPENED_TITLES),
    modules: JSON.parse(modulesText),
    modulesText,
    mirrorText: read(MIRROR),
    metadata: JSON.parse(read(METADATA)),
    metaText: read(METADATA),
    metaMirrorText: read(META_MIRROR),
    banks: {},
    baseline: { error: null, modules: null, banks: {}, figures: {} },
  };
  for (const b of BANKS) st.banks[b] = read(`content/${SUBJECT}/${b}`);

  try {
    st.baseline.modules = JSON.parse(fromGit(MODULES));
    for (const b of BANKS) st.baseline.banks[b] = fromGit(`content/${SUBJECT}/${b}`);
  } catch (e) {
    st.baseline.error = e.message.split("\n")[0];
  }
  return st;
}

const allLessons = (st) => st.modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const lessonById = (st, id) => st.modules.flatMap((m) => m.lessons || []).find((l) => l.id === id);

// ---------------------------------------------------------------------------------------------
export function runChecks(st) {
  let pass = 0;
  const failures = [];
  const check = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const section = (t) => failures.push(`\u0000== ${t}`);

  const table = st.table;
  const targetModules = table.length;
  const targetChapters = table.reduce((n, m) => n + m.chapters, 0);
  const tree = st.modules;

  // ---------------------------------------------------------------- 1. estimatedModules, both ways
  section("1. metadata.estimatedModules is 24 and equals the real module count");
  check(st.metadata.estimatedModules === 24,
    `metadata.estimatedModules is 24 (found ${st.metadata.estimatedModules})`);
  check(st.metadata.estimatedModules === tree.length,
    `metadata.estimatedModules equals the module count (${st.metadata.estimatedModules} vs ${tree.length})`);
  check(targetModules === 24, `the owner's list is 24 modules (the table says ${targetModules})`);

  // ---------------------------------------------------------------- 2. the 24 modules, in order
  section("2. the tree holds the owner's 24 modules, in order, with the owner's titles");
  check(tree.length === targetModules, `modules.json holds ${targetModules} modules (found ${tree.length})`);
  table.forEach((want, i) => {
    const got = tree[i];
    check(!!got, `module ${i + 1} exists in modules.json (${want.id})`);
    if (!got) return;
    check(got.id === want.id, `module ${i + 1} is ${want.id} (found ${got.id})`);
    check(got.title === want.title, `module ${i + 1} (${want.id}) is the owner's title "${want.title}" (found "${got.title}")`);
  });
  check(new Set(tree.map((m) => m.id)).size === tree.length, "no module id appears twice");
  check(new Set(tree.map((m) => m.title)).size === tree.length, "no module title appears twice");

  // ---------------------------------------------------------------- 3. the three sections by prefix
  section("3. the id prefixes carry the owner's three sections, and the generic ids are gone");
  const generic = tree.filter((m) => /^is-mod-/.test(String(m.id)));
  check(generic.length === 0, `no module id matches ^is-mod- (found: ${generic.map((m) => m.id).join(", ") || "none"})`);
  for (const [key, want] of Object.entries(st.sections)) {
    const got = tree.filter((m) => String(m.id).startsWith(`is-${key}`));
    check(got.length === want.modules, `section ${key.toUpperCase()} holds ${want.modules} modules (found ${got.length})`);
  }
  check(tree.every((m) => /^is-[abc]\d+$/.test(String(m.id))),
    `every module id is is-a*/is-b*/is-c* plus a number (found: ${tree.filter((m) => !/^is-[abc]\d+$/.test(String(m.id))).map((m) => m.id).join(", ") || "none"})`);

  // ---------------------------------------------------------------- 4. chapter counts and totals
  section("4. the chapter counts per module and the 28 / 37 / 31 = 96 totals are derived from the table");
  table.forEach((m) => check(Number.isInteger(m.chapters) && m.chapters >= 1,
    `${m.id} declares at least one chapter (found ${m.chapters})`));
  for (const [key, want] of Object.entries(st.sections)) {
    const sum = table.filter((m) => m.id.startsWith(`is-${key}`)).reduce((n, m) => n + m.chapters, 0);
    check(sum === want.chapters, `section ${key.toUpperCase()}'s chapters total ${want.chapters} (the table says ${sum})`);
  }
  check(targetChapters === 96, `the owner's list is 96 chapters (the table says ${targetChapters})`);
  const secTotal = Object.values(st.sections).reduce((n, s) => n + s.chapters, 0);
  check(secTotal === targetChapters, `the section totals add up to the chapter total (${secTotal} vs ${targetChapters})`);

  // ---------------------------------------------------------------- 5. the 18 lessons
  section("5. the 18 re-homed lesson ids are all present, none twice, and nothing undeclared has appeared");
  const lessons = allLessons(st);
  check(tree.every((m) => Array.isArray(m.lessons)), "every module carries a lessons array (empty where unbuilt)");
  const ids = lessons.map((l) => l.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  check(dupes.length === 0, `no lesson id appears twice across the 24 modules (${dupes.join(", ") || "none"})`);
  for (const id of LESSON_ORDER)
    check(ids.includes(id), `the 18 lesson ids are the ones this build re-homed (missing: ${id})`);
  const unknown = ids.filter((id) => !LESSON_ORDER.includes(id) && !NEW_LESSON_IDS.includes(id));
  check(unknown.length === 0, `no lesson appears that this harness has never heard of (unexpected: ${unknown.join(", ") || "none"})`);
  for (const id of NEW_LESSON_IDS)
    check(ids.includes(id), `the chapter-build lesson ${id} is present (missing)`);

  // ---------------------------------------------------------------- 6. each lesson under its module
  section("6. every re-homed lesson sits in its module, in order, and every new lesson in the module that declares it");
  for (const [mid, want] of Object.entries(st.placement)) {
    const mod = st.modules.find((m) => m.id === mid);
    check(!!mod, `module ${mid} exists in the tree`);
    if (!mod) continue;
    // The chapter build appends lessons to these modules, so the pinned order is asserted over the
    // RE-HOMED lessons only. A re-homed lesson that left its module drops out of this list and reds it.
    const got = (mod.lessons || []).map((l) => l.id).filter((id) => want.includes(id));
    check(got.join(",") === want.join(","), `module ${mid} holds ${want.join(", ") || "no lessons"} in this order (found ${got.join(",") || "none"})`);
    const declared = st.newLessons[mid] || [];
    const present = (mod.lessons || []).map((l) => l.id).filter((id) => declared.includes(id));
    check(present.join(",") === declared.join(","), `module ${mid} holds the lessons this build declares for it (${declared.join(", ") || "none"}; found ${present.join(", ") || "none"})`);
  }
  check(Object.keys(st.placement).join(",") === table.map((m) => m.id).join(","),
    "the placement table names every module, in the tree's order");
  check(Object.keys(st.newLessons).every((mid) => table.some((m) => m.id === mid)),
    "every module the new-lesson table names exists in the owner's list");
  // A lesson this build added may only sit in the module that declares it — a move to another module is
  // the same defect as a re-homed lesson leaving its own.
  for (const [mid, list] of Object.entries(st.newLessons)) {
    const mod = st.modules.find((m) => m.id === mid);
    const extra = (mod ? mod.lessons || [] : []).map((l) => l.id).filter((id) => NEW_LESSON_IDS.includes(id) && !list.includes(id));
    check(extra.length === 0, `module ${mid} holds no chapter-build lesson that another module declares (found: ${extra.join(", ") || "none"})`);
  }

  // ---------------------------------------------------------------- 7. banks and figures did not move
  section("7. the banks and every figures[].src are byte-unchanged against origin/main");
  check(!st.baseline.error, `origin/main is readable (git show failed: ${st.baseline.error})`);
  if (!st.baseline.error) {
    for (const b of BANKS)
      check(st.banks[b] === st.baseline.banks[b],
        `content/${SUBJECT}/${b} is byte-unchanged against ${BASELINE}`);
    const baseLessons = new Map((st.baseline.modules || []).flatMap((m) => m.lessons || []).map((l) => [l.id, l]));
    for (const id of LESSON_ORDER) {
      const now = lessonById(st, id);
      const before = baseLessons.get(id);
      if (!now || !before) continue;
      check(JSON.stringify(now.figures || []) === JSON.stringify(before.figures || []),
        `${id}'s figures[].src array is byte-unchanged against ${BASELINE}`);
    }
    // every SVG a figures[].src points at, both trees, byte-unchanged
    const srcs = [...new Set(lessons.flatMap((l) => (l.figures || []).map((f) => f.src)))];
    check(srcs.length >= 3, `the subject still ships its figures (found ${srcs.length} src values)`);
    for (const src of srcs) {
      const rel = String(src).replace(/^\//, "");
      let nowBytes = null;
      let baseBytes = null;
      try { nowBytes = read(rel); } catch { /* reported below */ }
      try { baseBytes = fromGit(rel); } catch { /* reported below */ }
      check(nowBytes !== null && baseBytes !== null && nowBytes === baseBytes,
        `${rel} is byte-unchanged against ${BASELINE}`);
    }
  }

  // ---------------------------------------------------------------- 8. lesson copy unchanged
  section("8. the 18 lessons' own copy is unchanged — re-homing moves a lesson, it does not rewrite it");
  if (!st.baseline.error) {
    const baseLessons = new Map((st.baseline.modules || []).flatMap((m) => m.lessons || []).map((l) => [l.id, l]));
    for (const id of LESSON_ORDER) {
      const now = lessonById(st, id);
      const before = baseLessons.get(id);
      check(!!before, `${id} exists on ${BASELINE}`);
      if (!now || !before) continue;
      // The science itself is frozen: the chapter build may retitle a lesson, never rewrite it.
      const fields = ["content", "concepts", "objectives", "experiment"];
      const drift = fields.filter((f) => JSON.stringify(now[f]) !== JSON.stringify(before[f]));
      check(drift.length === 0, `${id}'s ${fields.join("/")} is unchanged (drifted: ${drift.join(", ") || "none"})`);
      // A title is unchanged too, unless this build pinned a sharpened one for it.
      const pinned = st.sharpened[id];
      if (pinned) check(now.title === pinned, `${id}'s title is the pinned chapter name "${pinned}" (found "${now.title}")`);
      else check(now.title === before.title, `${id}'s title is unchanged (found "${now.title}", was "${before.title}")`);
    }
    for (const id of Object.keys(st.sharpened))
      check(LESSON_ORDER.includes(id), `the sharpened-title table names a lesson this build re-homed (${id})`);
  }

  // ---------------------------------------------------------------- 9. the two trees
  section("9. content/ and public/content/ carry the same bytes");
  check(st.modulesText === st.mirrorText, `${MIRROR} is byte-identical to ${MODULES}`);
  check(st.metaText === st.metaMirrorText, `${META_MIRROR} is byte-identical to ${METADATA}`);
  check(JSON.parse(st.metaMirrorText).estimatedModules === st.metadata.estimatedModules,
    "the mirrored metadata carries the same estimatedModules");

  return { pass, failures, modules: tree.length, lessons: lessons.length, chapters: targetChapters };
}

// ---------------------------------------------------------------------------------------------
/** The module that HOSTS `id` — found by the lesson it holds, never by its position in the array. */
const moduleOf = (st, id) => {
  const m = st.modules.find((mm) => (mm.lessons || []).some((l) => l.id === id));
  if (!m) throw new Error(`no module hosts ${id}`);
  return m;
};

// Red controls: each mutates the loaded state in memory and MUST be caught, by the assertion it names.
// Mutations resolve a module or a lesson BY ID — `st.modules[8]` is right today and silently aims at the
// wrong module the moment one is inserted ahead of it.
export const RED_CONTROLS = {
  // the count drifts back to the 6 generic modules
  "estimated-modules-wrong": (st) => { st.metadata.estimatedModules = 6; },
  // a module title is changed — the owner's list must notice
  "module-title-changed": (st) => {
    const m = st.modules.find((x) => x.id === "is-b3");
    m.title = "Electrical Circuits";
  },
  // a module moves section: is-c8 re-keyed as is-b10 leaves B with 10 and C with 7
  "section-count-wrong": (st) => {
    const m = st.modules.find((x) => x.id === "is-c8");
    m.id = "is-b10";
  },
  // a chapter disappears from the table: section A's total no longer adds up, nor does the 96
  "chapter-count-wrong": (st) => {
    const m = st.table.find((x) => x.id === "is-a2");
    m.chapters = 4;
  },
  // a lesson id is renamed in the tree
  "lesson-renamed": (st) => {
    const l = moduleOf(st, "is-l2-1").lessons.find((x) => x.id === "is-l2-1");
    l.id = "is-l2-1-renamed";
  },
  // a lesson is moved out of its module and dropped
  "lesson-dropped": (st) => {
    const m = moduleOf(st, "is-l2-2");
    m.lessons = m.lessons.filter((l) => l.id !== "is-l2-2");
  },
  // the same lesson lands in two modules
  "lesson-duplicated": (st) => {
    const l = moduleOf(st, "is-l6-1").lessons.find((x) => x.id === "is-l6-1");
    st.modules.find((x) => x.id === "is-a1").lessons.push(clone(l));
  },
  // the generic shape creeps back in
  "generic-module-id": (st) => {
    st.modules.find((x) => x.id === "is-a1").id = "is-mod-1";
  },
  // one byte of the public mirror moves
  "mirror-perturbed": (st) => { st.mirrorText = st.mirrorText.replace("{", "{ "); },
  // one byte of a bank moves — the git baseline must notice
  "bank-drift": (st) => { st.banks["practice.json"] = st.banks["practice.json"].replace("{", "{ "); },
  // a figure is re-pointed
  "figure-src-moved": (st) => {
    const l = moduleOf(st, "is-l2-1").lessons.find((x) => x.id === "is-l2-1");
    l.figures = clone(l.figures);
    l.figures[0].src = "/content/integrated-science/figures/is-other.svg";
  },
  // a sharpened title drifts away from the chapter it names
  "sharpened-title-drifted": (st) => {
    const l = moduleOf(st, "is-l3-1").lessons.find((x) => x.id === "is-l3-1");
    l.title = "States of Matter and Changes";
  },
  // a lesson this build did NOT touch is retitled
  "untouched-title-changed": (st) => {
    const l = moduleOf(st, "is-l6-1").lessons.find((x) => x.id === "is-l6-1");
    l.title = "Rocks and Soil";
  },
  // a chapter-build lesson is moved out of the module that declares it
  "new-lesson-moved": (st) => {
    const from = moduleOf(st, "is-l8-1");
    from.lessons = from.lessons.filter((l) => l.id !== "is-l8-1");
    st.modules.find((x) => x.id === "is-a1").lessons.push({ id: "is-l8-1", title: "Asexual and Sexual Reproduction" });
  },
  // a lesson appears that no slice ever declared
  "undeclared-lesson": (st) => {
    st.modules.find((x) => x.id === "is-b6").lessons.push({ id: "is-zz-1", title: "A lesson nobody declared" });
  },
};

// What each control must be caught BY.
export const RED_EXPECT = {
  "estimated-modules-wrong": ["metadata.estimatedModules is 24 (found 6)"],
  "module-title-changed": ['module 10 (is-b3) is the owner\'s title "Electrical Circuits and Power" (found "Electrical Circuits")'],
  "section-count-wrong": [
    "section B holds 9 modules (found 10)",
    "section C holds 8 modules (found 7)",
  ],
  "chapter-count-wrong": [
    "section A's chapters total 28 (the table says 27)",
    "the owner's list is 96 chapters (the table says 95)",
  ],
  "lesson-renamed": [
    "the 18 lesson ids are the ones this build re-homed (missing: is-l2-1)",
    "module is-a1 holds is-l1-3, is-l2-1, is-l3-1 in this order (found is-l1-3,is-l3-1)",
  ],
  "lesson-dropped": ["the 18 lesson ids are the ones this build re-homed (missing: is-l2-2)"],
  "lesson-duplicated": ["no lesson id appears twice across the 24 modules (is-l6-1)"],
  "generic-module-id": ["no module id matches ^is-mod- (found: is-mod-1)"],
  "mirror-perturbed": ["public/content/integrated-science/modules.json is byte-identical to content/integrated-science/modules.json"],
  "bank-drift": ["content/integrated-science/practice.json is byte-unchanged against origin/main"],
  "figure-src-moved": ["is-l2-1's figures[].src array is byte-unchanged against origin/main"],
  "sharpened-title-drifted": ['is-l3-1\'s title is the pinned chapter name "Properties of States of Matter" (found "States of Matter and Changes")'],
  "untouched-title-changed": ['is-l6-1\'s title is unchanged (found "Rocks and Soil", was "Earth Structure, Rocks and Soil")'],
  "new-lesson-moved": [
    "module is-a2 holds the lessons this build declares for it (is-l8-1, is-l8-2, is-l8-3, is-l8-4, is-l8-5; found is-l8-2, is-l8-3, is-l8-4, is-l8-5)",
    "module is-a1 holds no chapter-build lesson that another module declares (found: is-l8-1)",
  ],
  "undeclared-lesson": ["no lesson appears that this harness has never heard of (unexpected: is-zz-1)"],
};

function runControl(name) {
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name] || [];
  const missing = expect.filter((e) => !real.some((f) => f.includes(e)));
  if (missing.length)
    return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${missing[0]}"` };
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
const { pass, failures, modules, lessons, chapters } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const bySec = Object.entries(SECTIONS)
  .map(([k, s]) => `${k.toUpperCase()} ${MODULE_TARGET.filter((m) => m.id.startsWith(`is-${k}`)).length}/${s.chapters}`)
  .join(" · ");
console.log(`\ncheck-integrated-science-modules: ${pass} checks passed, ${failures.filter((f) => !f.startsWith("\u0000")).length} failed · ${modules} modules · ${chapters} chapters (${bySec}) · ${lessons} lessons`);
const realFailures = failures.filter((f) => !f.startsWith("\u0000")).length;

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
