#!/usr/bin/env node
// Harness: Biology coverage — the owner's 71 chapters are taught, BY NAME, in the 30 shipped lessons.
//
// Owner's instruction (2026-11-19): "Once Slice 8 is merged, turn the 71-chapter check I ran today into
// check-biology-coverage.mjs so the by-name coverage is asserted by the suite, not by a script I ran by
// hand."
//
// It replaces two hand-run scripts (/home/team/shared/verify-biology-71.py and verify-biology-byname.py)
// that printed the numbers the plan quotes. Those scripts read the audit's disposition table at run time;
// this harness holds its own target, because a markdown note can be edited by anyone while the harness
// cannot silently lose a chapter.
//
// What it proves
//   1. the target is exactly the owner's 71 chapters, verbatim and in their order, 13 / 45 / 13 by
//      section — the numbers are the owner's list, printed, not quoted from a doc;
//   2. no chapter number and no chapter title is used twice;
//   3. every chapter names a lesson id that exists in content/biology/modules.json;
//   4. every chapter's terms appear in that lesson's own copy (title + content + concepts + objectives),
//      matched as WHOLE WORDS with plural tolerance — so "group" does not match "grouping" and "canal"
//      does not match inside another word. EVERY listed term must hit: that is the by-name guarantee, a
//      student searching the chapter's own word finds the lesson that teaches it;
//   5. the tree holds 30 lessons in 9 modules and metadata.estimatedModules agrees — so the chapter
//      target cannot be met by an empty or half-built subject;
//   6. every one of the 30 lesson ids has its own entry in src/components/lessonSets.js — a lesson with
//      no Play tab is a coverage hole the chapter check would otherwise pass;
//   7. content/biology/modules.json and public/content/biology/modules.json are byte-identical.
//
// What it CANNOT prove: that the science is true. It proves the chapter's words are present in the right
// lesson. A lesson can state a term and state it wrongly, and this harness is blind to that — an
// independent re-derivation of the content, or a human reading it, is what catches a false fact.
//
// Red controls run BY DEFAULT, with no arguments, because the suite invokes every harness that way — a
// control behind a flag is a control the suite never runs (measured 2026-11-19: 8 of 16 harnesses were in
// that state). `--no-red-control` skips them; `--red-control <name>` runs one.
//
// Usage
//   node tools/check-biology-coverage.mjs                  # the real check + all 9 red controls
//   node tools/check-biology-coverage.mjs --no-red-control # the real check only
//   node tools/check-biology-coverage.mjs --red-control term-stripped
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const clone = (v) => JSON.parse(JSON.stringify(v));

const SUBJECT = "biology";
const MODULES = `content/${SUBJECT}/modules.json`;
const MIRROR = `public/${MODULES}`;
const METADATA = `content/${SUBJECT}/metadata.json`;

// ---------------------------------------------------------------------------------------------
// The target. The owner's 71 chapter titles, verbatim and in their order (their list, as pasted).
export const OWNER_LIST = `Grouping Living Organisms
Taxonomic Classification
Ecological Study Methods
Ecological Definitions
Impact of Abiotic Factors
Food Chains and Trophic Levels
Food Webs and Energy Flow
Role of Decomposers
Special Relationships Among Organisms
Material Cycling and Recycling
Negative Human Impact on Resources
Marine Pollution and Climate Change
Conservation and Population Dynamics
Generalised Cells and Microbes
Organelle Structure and Function
Cell Specialisation and Levels of Organisation
Diffusion and Osmosis
Importance of Membrane Transport
Types of Nutrition
Process of Photosynthesis
Leaf Structure and Photosynthesis
Environmental Factors and Photosynthesis
Mineral Nutrition in Plants
Food Tests
Human Alimentary Canal
Enzyme Action and Digestion
Digestion Products and Assimilation
Balanced Diet
Aerobic and Anaerobic Respiration
Gaseous Exchange Mechanisms
Gaseous Exchange Surfaces
Effects of Smoking
Need for Transport
Human Circulatory System
Blood Structure and Immunity
Xylem and Transpiration
Phloem and Translocation
Food Storage in Organisms
Egestion and Excretion
Kidney Function
Plant and Animal Movement and Support
Stimulus and Response
Nervous System and Reflexes
Drug Abuse Effects
Human Eye and Vision
Human Skin and Regulation
Growth in Organisms
Dicotyledonous Seed Structure and Germination
Sexual and Asexual Reproduction
Human Reproductive Systems
Menstrual Cycle and Embryo Development
Birth Control and STIs
Flower Structure and Pollination
Fruit and Seed Formation and Dispersal
Types of Diseases
Mosquito Life Cycle and Vector Role
Disease Treatment and Control
Disease Implications
DNA, Chromosomes, Genes and Alleles
Mitosis and Asexual Reproduction
Meiosis and Genetic Variation
Genetic Terminology
Monohybrid Crosses and Pedigrees
Sex Determination and Sex-Linked Diseases
Sources and Importance of Genetic Variation
Continuous and Discontinuous Variation
Species and Speciation
Natural Selection and Evolution
Natural and Artificial Selection
Genetic Engineering Applications
Genetic Engineering Implications`.split("\n").map((s) => s.trim());

// The owner's sections: A = 1-13, B = 14-58, C = 59-71.
export const SECTIONS = { A: 13, B: 45, C: 13 };

// The build target the coverage audit set, and that Slice 8 finished.
export const TARGET = { chapters: 71, lessons: 30, modules: 9 };

// Chapter -> the lesson that teaches it, and the terms that lesson must state.
// `terms` are the chapter's distinctive words; every one of them must appear in that lesson's own copy.
export const CHAPTERS = [
  { n: 1, section: "A", title: "Grouping Living Organisms", lesson: "classification-of-living-things", terms: ["grouping", "organisms"] },
  { n: 2, section: "A", title: "Taxonomic Classification", lesson: "classification-of-living-things", terms: ["taxonomic", "classification", "kingdom"] },
  { n: 3, section: "A", title: "Ecological Study Methods", lesson: "bio-eco-study-methods", terms: ["ecological", "quadrat", "transect"] },
  { n: 4, section: "A", title: "Ecological Definitions", lesson: "food-chains", terms: ["ecological", "habitat", "niche"] },
  { n: 5, section: "A", title: "Impact of Abiotic Factors", lesson: "food-chains", terms: ["abiotic", "factors"] },
  { n: 6, section: "A", title: "Food Chains and Trophic Levels", lesson: "food-chains", terms: ["chains", "trophic"] },
  { n: 7, section: "A", title: "Food Webs and Energy Flow", lesson: "food-chains", terms: ["webs", "energy", "flow"] },
  { n: 8, section: "A", title: "Role of Decomposers", lesson: "food-chains", terms: ["decomposers"] },
  { n: 9, section: "A", title: "Special Relationships Among Organisms", lesson: "bio-eco-special-relationships", terms: ["symbiosis", "mutualism", "parasitism"] },
  { n: 10, section: "A", title: "Material Cycling and Recycling", lesson: "food-chains", terms: ["material", "cycling", "carbon"] },
  { n: 11, section: "A", title: "Negative Human Impact on Resources", lesson: "human-impact", terms: ["pollution", "deforestation", "resources"] },
  { n: 12, section: "A", title: "Marine Pollution and Climate Change", lesson: "human-impact", terms: ["marine", "climate", "pollution"] },
  { n: 13, section: "A", title: "Conservation and Population Dynamics", lesson: "human-impact", terms: ["conservation", "population", "dynamics"] },
  { n: 14, section: "B", title: "Generalised Cells and Microbes", lesson: "cell-structure", terms: ["generalised", "microbes"] },
  { n: 15, section: "B", title: "Organelle Structure and Function", lesson: "cell-structure", terms: ["organelle", "mitochondria"] },
  { n: 16, section: "B", title: "Cell Specialisation and Levels of Organisation", lesson: "bio-cell-levels-of-organisation", terms: ["specialisation", "organisation", "tissue"] },
  { n: 17, section: "B", title: "Diffusion and Osmosis", lesson: "osmosis-diffusion", terms: ["diffusion", "osmosis"] },
  { n: 18, section: "B", title: "Importance of Membrane Transport", lesson: "osmosis-diffusion", terms: ["membrane", "transport", "active"] },
  { n: 19, section: "B", title: "Types of Nutrition", lesson: "photosynthesis", terms: ["nutrition", "autotrophic", "heterotrophic"] },
  { n: 20, section: "B", title: "Process of Photosynthesis", lesson: "photosynthesis", terms: ["photosynthesis", "chlorophyll"] },
  { n: 21, section: "B", title: "Leaf Structure and Photosynthesis", lesson: "bio-nut-leaf-structure", terms: ["leaf", "stomata", "epidermis"] },
  { n: 22, section: "B", title: "Environmental Factors and Photosynthesis", lesson: "photosynthesis", terms: ["environmental", "factors", "limiting"] },
  { n: 23, section: "B", title: "Mineral Nutrition in Plants", lesson: "transport-and-growth-in-plants", terms: ["mineral", "nitrate", "magnesium"] },
  { n: 24, section: "B", title: "Food Tests", lesson: "bio-nut-food-tests", terms: ["tests", "benedict", "iodine"] },
  { n: 25, section: "B", title: "Human Alimentary Canal", lesson: "nutrition-and-digestion", terms: ["alimentary", "canal"] },
  { n: 26, section: "B", title: "Enzyme Action and Digestion", lesson: "nutrition-and-digestion", terms: ["enzyme", "amylase", "digestion"] },
  { n: 27, section: "B", title: "Digestion Products and Assimilation", lesson: "nutrition-and-digestion", terms: ["digestion", "assimilation"] },
  { n: 28, section: "B", title: "Balanced Diet", lesson: "nutrition-and-digestion", terms: ["balanced", "diet"] },
  { n: 29, section: "B", title: "Aerobic and Anaerobic Respiration", lesson: "respiration", terms: ["aerobic", "anaerobic", "respiration"] },
  { n: 30, section: "B", title: "Gaseous Exchange Mechanisms", lesson: "breathing-and-gas-exchange", terms: ["gaseous", "exchange", "mechanism", "ventilation"] },
  { n: 31, section: "B", title: "Gaseous Exchange Surfaces", lesson: "breathing-and-gas-exchange", terms: ["gaseous", "exchange", "alveolus"] },
  { n: 32, section: "B", title: "Effects of Smoking", lesson: "bio-resp-effects-of-smoking", terms: ["smoking", "tar", "nicotine"] },
  { n: 33, section: "B", title: "Need for Transport", lesson: "circulatory-system", terms: ["transport", "surface", "volume"] },
  { n: 34, section: "B", title: "Human Circulatory System", lesson: "circulatory-system", terms: ["circulatory", "artery", "vein"] },
  { n: 35, section: "B", title: "Blood Structure and Immunity", lesson: "body-defences-and-immunity", terms: ["blood", "immunity", "white"] },
  { n: 36, section: "B", title: "Xylem and Transpiration", lesson: "transport-and-growth-in-plants", terms: ["xylem", "transpiration"] },
  { n: 37, section: "B", title: "Phloem and Translocation", lesson: "transport-and-growth-in-plants", terms: ["phloem", "translocation"] },
  { n: 38, section: "B", title: "Food Storage in Organisms", lesson: "nutrition-and-digestion", terms: ["storage", "glycogen"] },
  { n: 39, section: "B", title: "Egestion and Excretion", lesson: "excretion-homeostasis", terms: ["egestion", "excretion"] },
  { n: 40, section: "B", title: "Kidney Function", lesson: "excretion-homeostasis", terms: ["kidney", "nephron"] },
  { n: 41, section: "B", title: "Plant and Animal Movement and Support", lesson: "bio-coord-movement-and-support", terms: ["support", "skeleton", "joint", "antagonistic"] },
  { n: 42, section: "B", title: "Stimulus and Response", lesson: "nervous-system-and-sense-organs", terms: ["stimulus", "response"] },
  { n: 43, section: "B", title: "Nervous System and Reflexes", lesson: "nervous-system-and-sense-organs", terms: ["nervous", "reflex", "neuron"] },
  { n: 44, section: "B", title: "Drug Abuse Effects", lesson: "bio-hlth-drug-abuse", terms: ["drug", "abuse", "alcohol"] },
  { n: 45, section: "B", title: "Human Eye and Vision", lesson: "nervous-system-and-sense-organs", terms: ["eye", "vision", "accommodation"] },
  { n: 46, section: "B", title: "Human Skin and Regulation", lesson: "excretion-homeostasis", terms: ["skin", "regulation", "vasodilation"] },
  { n: 47, section: "B", title: "Growth in Organisms", lesson: "dna-inheritance", terms: ["growth", "mitosis"] },
  { n: 48, section: "B", title: "Dicotyledonous Seed Structure and Germination", lesson: "bio-rep-seed-and-germination", terms: ["dicotyledonous", "seed", "germination", "cotyledon"] },
  { n: 49, section: "B", title: "Sexual and Asexual Reproduction", lesson: "reproduction-and-development", terms: ["sexual", "asexual", "reproduction"] },
  { n: 50, section: "B", title: "Human Reproductive Systems", lesson: "reproduction-and-development", terms: ["reproductive", "systems"] },
  { n: 51, section: "B", title: "Menstrual Cycle and Embryo Development", lesson: "reproduction-and-development", terms: ["menstrual", "cycle", "embryo"] },
  { n: 52, section: "B", title: "Birth Control and STIs", lesson: "bio-rep-birth-control-and-stis", terms: ["birth", "control", "stis"] },
  { n: 53, section: "B", title: "Flower Structure and Pollination", lesson: "reproduction-and-development", terms: ["flower", "pollination", "sepal"] },
  { n: 54, section: "B", title: "Fruit and Seed Formation and Dispersal", lesson: "reproduction-and-development", terms: ["fruit", "seed", "dispersal"] },
  { n: 55, section: "B", title: "Types of Diseases", lesson: "disease-and-pathogens", terms: ["diseases", "bacteria", "viruses"] },
  { n: 56, section: "B", title: "Mosquito Life Cycle and Vector Role", lesson: "disease-and-pathogens", terms: ["mosquito", "vector", "larva"] },
  { n: 57, section: "B", title: "Disease Treatment and Control", lesson: "body-defences-and-immunity", terms: ["treatment", "control", "antibiotic", "resistance"] },
  { n: 58, section: "B", title: "Disease Implications", lesson: "disease-and-pathogens", terms: ["disease", "implications", "social", "economic"] },
  { n: 59, section: "C", title: "DNA, Chromosomes, Genes and Alleles", lesson: "dna-inheritance", terms: ["dna", "chromosomes", "genes", "alleles"] },
  { n: 60, section: "C", title: "Mitosis and Asexual Reproduction", lesson: "dna-inheritance", terms: ["mitosis", "reproduction"] },
  { n: 61, section: "C", title: "Meiosis and Genetic Variation", lesson: "dna-inheritance", terms: ["meiosis", "genetic"] },
  { n: 62, section: "C", title: "Genetic Terminology", lesson: "dna-inheritance", terms: ["genetic", "genotype", "phenotype"] },
  { n: 63, section: "C", title: "Monohybrid Crosses and Pedigrees", lesson: "bio-gen-monohybrid-crosses", terms: ["monohybrid", "crosses", "pedigrees"] },
  { n: 64, section: "C", title: "Sex Determination and Sex-Linked Diseases", lesson: "dna-inheritance", terms: ["determination", "sex-linked"] },
  { n: 65, section: "C", title: "Sources and Importance of Genetic Variation", lesson: "selection-evolution", terms: ["variation", "genetic", "source"] },
  { n: 66, section: "C", title: "Continuous and Discontinuous Variation", lesson: "selection-evolution", terms: ["continuous", "discontinuous", "variation"] },
  { n: 67, section: "C", title: "Species and Speciation", lesson: "selection-evolution", terms: ["species", "speciation"] },
  { n: 68, section: "C", title: "Natural Selection and Evolution", lesson: "selection-evolution", terms: ["natural", "selection", "evolution"] },
  { n: 69, section: "C", title: "Natural and Artificial Selection", lesson: "selection-evolution", terms: ["natural", "artificial", "selection"] },
  { n: 70, section: "C", title: "Genetic Engineering Applications", lesson: "bio-gen-genetic-engineering", terms: ["genetic", "engineering", "applications"] },
  { n: 71, section: "C", title: "Genetic Engineering Implications", lesson: "bio-gen-genetic-engineering", terms: ["genetic", "engineering", "implications"] },
];

// ---------------------------------------------------------------------------------------------
export const fold = (s) => String(s == null ? "" : s).toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u2014\u2013\u2212]/g, "-")
  .replace(/\s+/g, " ").trim();

/** The lesson's own copy: title + content + concepts + objectives. */
export const corpusOf = (l) => fold([l.title, l.content, ...(l.concepts || []), ...(l.objectives || [])].join(" \n "));

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word match with plural tolerance: "chains" matches "chain"/"chains", "crosses" matches
 * "cross"/"crosses", and "group" does NOT match "grouping", nor "canal" match inside another word.
 */
export const hasTerm = (text, term) => {
  const base = fold(term);
  const variants = [...new Set([base, base.replace(/es$/, ""), base.replace(/s$/, "")])].filter(Boolean);
  return new RegExp(`\\b(?:${variants.map(escape).join("|")})(?:s|es)?\\b`).test(text);
};

// ---------------------------------------------------------------------------------------------
function loadState() {
  const modulesText = read(MODULES);
  return {
    chapters: clone(CHAPTERS),
    owner: OWNER_LIST.slice(),
    modules: JSON.parse(modulesText),
    modulesText,
    mirrorText: read(MIRROR),
    metadata: JSON.parse(read(METADATA)),
    sets: clone(lessonSets[SUBJECT] || {}),
  };
}

const allLessons = (st) => st.modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
const byIdOf = (st) => Object.fromEntries(allLessons(st).map((l) => [l.id, l]));

// ---------------------------------------------------------------------------------------------
export function runChecks(st) {
  let pass = 0;
  const failures = [];
  const check = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const section = (t) => failures.push(`\u0000== ${t}`);

  const lessons = allLessons(st);
  const byId = byIdOf(st);
  const chapters = st.chapters;

  // ---------------------------------------------------------------- 1. the target is the owner's list
  section("1. the target is exactly the owner's 71 chapters, verbatim, 13 / 45 / 13");
  check(chapters.length === TARGET.chapters, `the target holds ${TARGET.chapters} chapters (found ${chapters.length})`);
  check(st.owner.length === TARGET.chapters, `the owner's list holds ${TARGET.chapters} titles (found ${st.owner.length})`);
  chapters.forEach((c, i) => {
    check(c.n === i + 1, `chapter ${i + 1} carries number ${i + 1} (found #${c.n})`);
    const want = st.owner[c.n - 1];
    check(want !== undefined && fold(c.title) === fold(want),
      `chapter ${c.n} is the owner's title "${want}" (target says "${c.title}")`);
  });
  for (const [s, n] of Object.entries(SECTIONS))
    check(chapters.filter((c) => c.section === s).length === n,
      `section ${s} holds ${n} chapters (found ${chapters.filter((c) => c.section === s).length})`);
  check(chapters.every((c) => Object.keys(SECTIONS).includes(c.section)), "every chapter sits in a real section");

  // ---------------------------------------------------------------- 2. no duplicate number or title
  section("2. no chapter number and no chapter title is used twice");
  check(new Set(chapters.map((c) => c.n)).size === chapters.length, "no chapter number appears twice");
  check(new Set(chapters.map((c) => fold(c.title))).size === chapters.length, "no chapter title appears twice");

  // ---------------------------------------------------------------- 3. every chapter names a real lesson
  section("3. every chapter names a lesson id that exists");
  for (const c of chapters) {
    check(!!byId[c.lesson], `chapter ${c.n} "${c.title}" is hosted by a real lesson id (${c.lesson})`);
  }

  // ---------------------------------------------------------------- 4. the by-name guarantee
  section("4. every chapter's terms are in its lesson's own copy, as whole words");
  for (const c of chapters) {
    check(c.terms.length >= 1, `chapter ${c.n} lists at least one term to find`);
    const l = byId[c.lesson];
    if (!l) continue;
    const corpus = corpusOf(l);
    for (const t of c.terms)
      check(hasTerm(corpus, t),
        `chapter ${c.n} "${c.title}": the word "${t}" is in ${c.lesson}'s own copy`);
  }

  // ---------------------------------------------------------------- 5. the subject is built out
  section("5. the tree holds the built subject: 30 lessons, 9 modules");
  check(lessons.length === TARGET.lessons, `modules.json holds ${TARGET.lessons} lessons (found ${lessons.length})`);
  check(st.modules.length === TARGET.modules, `modules.json holds ${TARGET.modules} modules (found ${st.modules.length})`);
  check(st.metadata.estimatedModules === TARGET.modules,
    `metadata.estimatedModules is ${TARGET.modules} (found ${st.metadata.estimatedModules})`);
  check(st.modules.every((m) => (m.lessons || []).length >= 1), "no module is empty");

  // ---------------------------------------------------------------- 6. every lesson has its Play tab
  section("6. every lesson has its own Play-tab set");
  const ids = lessons.map((l) => l.id);
  check(new Set(ids).size === ids.length, "no lesson id appears twice in modules.json");
  const noSet = ids.filter((id) => !st.sets[id]);
  check(noSet.length === 0, `every lesson has its own lessonSets.biology entry (missing: ${noSet.join(", ") || "none"})`);

  // ---------------------------------------------------------------- 7. the two trees are byte-identical
  section("7. content/ and public/content/ carry the same bytes");
  check(st.modulesText === st.mirrorText, `${MIRROR} is byte-identical to ${MODULES}`);

  return { pass, failures, chapters: chapters.length, lessons: lessons.length, modules: st.modules.length };
}

// ---------------------------------------------------------------------------------------------
/** The module that HOSTS `id` — found by the lesson it holds, never by its position in the array. */
const moduleOf = (st, id) => {
  const m = st.modules.find((mm) => (mm.lessons || []).some((l) => l.id === id));
  if (!m) throw new Error(`no module hosts ${id}`);
  return m;
};

// Red controls: each mutates the loaded state in memory and MUST be caught, by the assertion it names.
export const RED_CONTROLS = {
  // rename a chapter's title in the target — the owner's-list assertion must notice the drift
  "chapter-renamed": (st) => {
    st.chapters[0].title = "Grouping Living Things";
  },
  // drop a chapter — 70 != 71
  "chapter-dropped": (st) => {
    st.chapters = st.chapters.filter((c) => c.n !== 3).map((c, i) => ({ ...c, n: i + 1 }));
  },
  // the same chapter twice — the duplicate checks must fire
  "chapter-duplicated": (st) => {
    st.chapters.push(clone(st.chapters[24]));
  },
  // strip a term that currently hits, from every field of the lesson that carries it. (The real lesson
  // object, not a copy — `byIdOf` spreads each lesson, so mutating its result would change nothing.)
  "term-stripped": (st) => {
    const l = st.modules.flatMap((m) => m.lessons || []).find((x) => x.id === "nutrition-and-digestion");
    const strip = (s) => String(s).replace(/\balimentary\b/gi, "gut");
    l.title = strip(l.title);
    l.content = strip(l.content);
    l.concepts = (l.concepts || []).map(strip);
    l.objectives = (l.objectives || []).map(strip);
  },
  // point a chapter at a lesson id nobody ships
  "lesson-ghost": (st) => {
    st.chapters[2].lesson = "bio-eco-ghost-lesson";
  },
  // delete a lesson from the tree — the lesson count must fire. Resolved BY ID: `st.modules[8]` is correct
  // today and silently aimed at the wrong module the moment a module is inserted ahead of it.
  "lesson-deleted": (st) => {
    const m = moduleOf(st, "classification-of-living-things");
    m.lessons = m.lessons.filter((l) => l.id !== "classification-of-living-things");
  },
  // rename a lesson id in the tree only — chapters 1 and 2 lose their host, and the new id has no Play tab
  "lesson-renamed": (st) => {
    const l = moduleOf(st, "classification-of-living-things").lessons.find((x) => x.id === "classification-of-living-things");
    l.id = "classification-of-living-things-renamed";
  },
  // blank one lesson's Play-tab entry
  "set-blanked": (st) => {
    delete st.sets["classification-of-living-things"];
  },
  // one byte of the public mirror moves
  "mirror-perturbed": (st) => {
    st.mirrorText = st.mirrorText.replace("{", "{ ");
  },
};

// What each control must be caught BY. A control can trip more than one assertion, so "something
// failed" is not proof that the assertion the control is FOR still checks anything.
export const RED_EXPECT = {
  "chapter-renamed": ['chapter 1 is the owner\'s title "Grouping Living Organisms"'],
  "chapter-dropped": ["the target holds 71 chapters (found 70)"],
  "chapter-duplicated": ["no chapter title appears twice"],
  "term-stripped": ['chapter 25 "Human Alimentary Canal": the word "alimentary" is in nutrition-and-digestion\'s own copy'],
  "lesson-ghost": ['chapter 3 "Ecological Study Methods" is hosted by a real lesson id (bio-eco-ghost-lesson)'],
  "lesson-deleted": ["modules.json holds 30 lessons (found 29)"],
  "lesson-renamed": [
    'chapter 1 "Grouping Living Organisms" is hosted by a real lesson id (classification-of-living-things)',
    "every lesson has its own lessonSets.biology entry (missing: classification-of-living-things-renamed)",
  ],
  "set-blanked": ["every lesson has its own lessonSets.biology entry (missing: classification-of-living-things)"],
  "mirror-perturbed": ["public/content/biology/modules.json is byte-identical to content/biology/modules.json"],
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
const { pass, failures, chapters, lessons, modules } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const bySec = Object.keys(SECTIONS).map((s) => CHAPTERS.filter((c) => c.section === s).length).join("/");
console.log(`\ncheck-biology-coverage: ${pass} checks passed, ${failures.filter((f) => !f.startsWith("\u0000")).length} failed · ${chapters} chapters (${bySec}) · ${lessons} lessons · ${modules} modules`);
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
