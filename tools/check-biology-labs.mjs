#!/usr/bin/env node
// Harness: Biology's Play-tab labs survive the coverage build.
//
// Replaces tools/check-biology-gap-labs.mjs, retired by Slice 0B (2026-11-17). That
// harness pinned Biology at 18 lessons (line 65) and at 17 sets (line 120), so the
// FIRST of the 12 new lessons in the coverage audit
// (/home/team/shared/biology-coverage-audit.md §C) would have reded it on at least
// two checks. Nothing was weakened: every assertion that was still true moved here,
// and the two count pins were replaced by a form that survives growth.
//
// What is NEW, and the whole point of the slice: EVERY lesson id in modules.json must
// have its OWN lessonSets.biology entry. Biology carries a subject-level fallback deck
// (DragDropLabel `subjectSets.biology` = "Label the Animal Cell"), so a new lesson
// whose slice forgets its own set silently renders that cell diagram — a labelling
// task that looks entirely plausible on a Biology lesson — and RECORDS A LAB
// COMPLETION. check-lab-set-ownership.mjs classifies it OWN and passes. That is the
// quietest failure in the repo, and the derived assertion below is the only form of it
// that cannot be gamed (§F1 of the audit).
//
// `cell-structure` was the live example: it was deliberately keyed to the fallback
// (lessonSets.js said so). Slice 0B gave it its own set built from the same diagram;
// the subject-level deck stays in place for the subject-page lab, which has no
// lessonId.
//
// Run:  node tools/check-biology-labs.mjs
//       node tools/check-biology-labs.mjs --red-control <name>
//       node tools/check-biology-labs.mjs --red-controls-all
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const clone = (v) => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------------------------
// The 18 lesson ids that existed before the coverage build, in their shipped order.
// Ids are identity: this list never grows, never shrinks, never re-orders. A slice that
// renames, splits or re-orders one of these must go red here.
const FROZEN_IDS = [
  "cell-structure", "osmosis-diffusion",
  "photosynthesis", "circulatory-system", "nutrition-and-digestion", "transport-and-growth-in-plants",
  "respiration", "excretion-homeostasis", "breathing-and-gas-exchange",
  "food-chains", "human-impact",
  "dna-inheritance", "selection-evolution",
  "nervous-system-and-sense-organs",
  "disease-and-pathogens", "body-defences-and-immunity",
  "reproduction-and-development",
  "classification-of-living-things",
];

// The size the coverage build is aiming at: 18 frozen + 12 planned (audit §C). Stated here
// so the plan is compared to something — see section 4b.
const TARGET_LESSONS = 30;

// The 12 new lessons the coverage build is planned to add (audit §C), frozen so that a
// lesson landing under an id nobody planned is a failure, not a surprise.
const PLANNED_NEW_IDS = [
  "bio-cell-levels-of-organisation",
  "bio-nut-leaf-structure", "bio-nut-food-tests",
  "bio-resp-effects-of-smoking",
  "bio-eco-study-methods", "bio-eco-special-relationships",
  "bio-gen-monohybrid-crosses", "bio-gen-genetic-engineering",
  "bio-coord-movement-and-support",
  "bio-hlth-drug-abuse",
  "bio-rep-seed-and-germination", "bio-rep-birth-control-and-stis",
];

// Exactly the planned ids that have NOT landed yet. A slice that lands a lesson must
// strike its id off in the same commit (else "landed but still listed" reds); a slice
// that strikes an id off without landing it reds as a lost lesson.
// Biology Slice 1 (2026-11-17) struck off "bio-cell-levels-of-organisation": it landed
// at the end of module 1, with its own set. Biology Slice 2a (2026-11-17) struck off
// "bio-nut-leaf-structure" and "bio-nut-food-tests": both landed at the end of module 2
// (nutrition-transport), each with its own set. Biology Slice 3 (2026-11-18) struck off
// "bio-resp-effects-of-smoking": it landed at the end of module 3 (respiration-excretion),
// with its own match-the-pairs set. Biology Slice 4 (2026-11-18) struck off
// "bio-eco-study-methods" and "bio-eco-special-relationships": both landed at the end of
// module 4 (ecology-environment), each with its own match-the-pairs set. Biology Slice 5
// (2026-11-19) struck off "bio-gen-monohybrid-crosses" and "bio-gen-genetic-engineering":
// both landed at the end of module 5 (genetics-variation), each with its own match set.
// Biology Slice 6 (2026-11-19) struck off "bio-coord-movement-and-support": it landed at the end
// of module 6 (coordination-response), after nervous-system-and-sense-organs, with its own
// match-the-pairs set. Biology Slice 7 (2026-11-19) struck off "bio-hlth-drug-abuse": it landed at
// the end of module 7 (health-and-disease), after body-defences-and-immunity, with its own match set.
// Biology Slice 8 (2026-11-19) struck off the last two, "bio-rep-seed-and-germination" and
// "bio-rep-birth-control-and-stis": both landed at the end of module 8 (reproduction-development),
// each with its own match set. The list is now EMPTY — every planned new lesson has landed — so the
// three controls that used to read st.pending[0] now synthesise their own pending state (see
// RED_CONTROLS): with an empty list a control that reads the pointer tests nothing at all.
const PENDING_IDS = [];

const NEW_ID_RE = /^bio-(cell|nut|resp|eco|gen|coord|hlth|rep)-[a-z-]+$/;
const KINDS = ["match", "sort", "order", "diagram"];
const MIRRORS = ["modules.json", "practice.json", "knowledge-check.json", "metadata.json"];

// ---------------------------------------------------------------------------------------------
/** Everything the checks read, in a form a red control can mutate without touching the tree. */
function loadState() {
  const raw = {};
  for (const f of MIRRORS) raw[f] = { c: read(`content/biology/${f}`), p: read(`public/content/biology/${f}`) };
  return {
    modules: JSON.parse(raw["modules.json"].c),
    meta: JSON.parse(raw["metadata.json"].c),
    practice: JSON.parse(raw["practice.json"].c),
    kc: JSON.parse(raw["knowledge-check.json"].c),
    sets: clone(lessonSets.biology || {}),
    planned: [...PLANNED_NEW_IDS],
    pending: [...PENDING_IDS],
    raw,
    sandbox: read("src/components/ExperimentSandbox.jsx"),
    drag: read("src/components/DragDropLabel.jsx"),
  };
}

function runChecks(st) {
  const failures = [];
  let pass = 0;
  const check = (cond, msg) => { if (cond) pass++; else failures.push(msg); };
  const sec = (t) => failures.push("\u0000== " + t);

  const lessons = st.modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, module: m.id })));
  const lessonIds = lessons.map((l) => l.id);
  const lessonIdSet = new Set(lessonIds);
  const newIds = lessonIds.filter((id) => !FROZEN_IDS.includes(id));

  // ---- 1 ------------------------------------------------------------------------------------
  sec("1. the 18 frozen lesson ids survive, in their original order");
  const missing = FROZEN_IDS.filter((id) => !lessonIdSet.has(id));
  check(missing.length === 0,
    `all 18 frozen lesson ids are still present in modules.json (missing: ${missing.join(", ") || "none"})`);
  const frozenNow = lessonIds.filter((id) => FROZEN_IDS.includes(id));
  check(frozenNow.join() === FROZEN_IDS.join(),
    `the 18 frozen lesson ids keep their original relative order (found: ${frozenNow.join(", ")})`);

  // ---- 2 ------------------------------------------------------------------------------------
  sec("2. every lesson has its own Play-tab set — no exception, no fallback");
  const noSet = lessonIds.filter((id) => !st.sets[id]);
  check(noSet.length === 0,
    `every lesson in modules.json has its own lessonSets.biology set (missing: ${noSet.join(", ") || "none"}) — `
    + `a lesson without one silently renders the subject-level "Label the Animal Cell" deck and records a lab completion`);
  const stray = Object.keys(st.sets).filter((id) => !lessonIdSet.has(id));
  check(stray.length === 0,
    `no stray biology sets: every lessonSets.biology key is a real lesson id (stray: ${stray.join(", ") || "none"})`);

  // ---- 3 ------------------------------------------------------------------------------------
  sec("3. new ids follow bio-<module>-<topic> and cannot collide with the frozen 18");
  const badScheme = newIds.filter((id) => !NEW_ID_RE.test(id));
  check(badScheme.length === 0,
    `every new lesson id follows bio-<module>-<topic> (offenders: ${badScheme.join(", ") || "none"})`);
  const frozenMatchingScheme = FROZEN_IDS.filter((id) => NEW_ID_RE.test(id));
  check(frozenMatchingScheme.length === 0,
    `no frozen id matches the new-id scheme, so the two namespaces cannot collide (matches: ${frozenMatchingScheme.join(", ") || "none"})`);
  const colliding = newIds.filter((id) => FROZEN_IDS.includes(id));
  check(colliding.length === 0,
    `no new lesson reuses one of the 18 frozen ids (colliding: ${colliding.join(", ") || "none"})`);
  const unplanned = newIds.filter((id) => !PLANNED_NEW_IDS.includes(id));
  check(unplanned.length === 0,
    `every landed new lesson id is one of the 12 planned ids (unplanned: ${unplanned.join(", ") || "none"})`);

  // ---- 4 ------------------------------------------------------------------------------------
  sec("4. PENDING_IDS is exactly the set of planned ids that have not landed");
  const landedPending = st.pending.filter((id) => lessonIdSet.has(id));
  check(landedPending.length === 0,
    `every id still listed in PENDING_IDS has not landed yet (landed: ${landedPending.join(", ") || "none"}) — `
    + `a slice that lands a lesson must shrink the list in the same commit`);
  const unknownPending = st.pending.filter((id) => !PLANNED_NEW_IDS.includes(id));
  check(unknownPending.length === 0,
    `every PENDING_IDS entry is one of the 12 planned new lessons (unknown: ${unknownPending.join(", ") || "none"})`);
  const lost = PLANNED_NEW_IDS.filter((id) => !st.pending.includes(id) && !lessonIdSet.has(id));
  check(lost.length === 0,
    `every planned new lesson struck off PENDING_IDS has actually landed in modules.json (lost: ${lost.join(", ") || "none"})`);

  // ---- 4b -----------------------------------------------------------------------------------
  // The plan's OWN size. PLANNED_NEW_IDS and PENDING_IDS are two hand-written literals of the
  // same ids, so before this section deleting one id from BOTH in the same commit left every
  // check green and shipped a 29-lesson build against a 30-lesson target. A target the plan
  // never compares itself to is not a target.
  sec("4b. the plan still holds its size — 12 planned ids, and no duplicates");
  const plannedTarget = TARGET_LESSONS - FROZEN_IDS.length;
  check(st.planned.length === plannedTarget,
    `the plan still holds every one of its planned new lessons (TARGET_LESSONS ${TARGET_LESSONS} `
    + `minus ${FROZEN_IDS.length} frozen = ${plannedTarget}; PLANNED_NEW_IDS has ${st.planned.length})`);
  const dupPlanned = [...new Set(st.planned.filter((id, i) => st.planned.indexOf(id) !== i))];
  check(dupPlanned.length === 0,
    `PLANNED_NEW_IDS has no duplicate ids (duplicates: ${dupPlanned.join(", ") || "none"}) — `
    + `a duplicate masks a lost lesson from the length check above`);

  // ---- 5 ------------------------------------------------------------------------------------
  sec("5. appending is safe, inserting is not");
  for (const m of st.modules) {
    const ids = (m.lessons || []).map((l) => l.id);
    const frozenHere = ids.filter((id) => FROZEN_IDS.includes(id));
    const expectedHere = FROZEN_IDS.filter((id) => frozenHere.includes(id));
    check(frozenHere.join() === expectedHere.join(),
      `module ${m.id} keeps its existing lessons in their original order (found: ${frozenHere.join(", ")})`);
    const lastFrozen = ids.reduce((acc, id, i) => (FROZEN_IDS.includes(id) ? i : acc), -1);
    const newBeforeExisting = ids.findIndex((id, i) => i < lastFrozen && !FROZEN_IDS.includes(id));
    check(newBeforeExisting === -1,
      `module ${m.id}: every new lesson sits after the existing ones `
      + `(${newBeforeExisting === -1 ? "" : `${ids[newBeforeExisting]} sits before ${ids[lastFrozen]}`})`);
  }

  // ---- 6 ------------------------------------------------------------------------------------
  sec("6. every set is well-formed for its kind");
  for (const [id, set] of Object.entries(st.sets)) {
    const where = `lessonSets.biology.${id}`;
    check(typeof set.title === "string" && set.title.trim().length > 3, `${where}: has a title`);
    check(typeof set.subtitle === "string" && set.subtitle.trim().length > 3, `${where}: has a subtitle`);
    check(KINDS.includes(set.kind), `${where}: kind is supported (${set.kind})`);
    if (set.kind === "match") {
      const pairs = set.pairs || [];
      check(pairs.length >= 4, `${where}: at least 4 pairs (has ${pairs.length})`);
      check(pairs.every((p) => p.id && p.target && p.label), `${where}: every pair has id/target/label`);
      check(new Set(pairs.map((p) => p.id)).size === pairs.length, `${where}: pair ids are unique`);
      check(new Set(pairs.map((p) => p.target)).size === pairs.length, `${where}: targets are unique (unambiguous drops)`);
    } else if (set.kind === "sort") {
      const cats = set.categories || [], items = set.items || [];
      check(cats.length >= 2, `${where}: at least 2 categories`);
      check(items.length >= 4, `${where}: at least 4 items (has ${items.length})`);
      check(items.every((i) => i.id && i.label && cats.some((c) => c.id === i.category)),
        `${where}: every item id/label/known category`);
      check(new Set(items.map((i) => i.id)).size === items.length, `${where}: item ids are unique`);
    } else if (set.kind === "order") {
      const items = set.items || [];
      check(items.length >= 4, `${where}: at least 4 items (has ${items.length})`);
      const orders = items.map((i) => i.order);
      check(orders.every((o) => Number.isInteger(o) && o >= 1 && o <= items.length), `${where}: orders are 1..n`);
      check(new Set(orders).size === items.length, `${where}: orders are unique`);
    } else if (set.kind === "diagram") {
      const labels = set.labels || [], zones = set.targetZones || [];
      check(labels.length >= 4, `${where}: at least 4 labels (has ${labels.length})`);
      check(labels.every((l) => l.id && l.label), `${where}: every label has id/label`);
      check(zones.length === labels.length, `${where}: one drop zone per label (${zones.length} vs ${labels.length})`);
      check(labels.every((l) => zones.some((z) => z.id === l.id)),
        `${where}: every label has a matching drop zone`);
    }
  }

  // ---- 7 ------------------------------------------------------------------------------------
  sec("7. metadata.estimatedModules tracks the module count");
  check(st.meta.estimatedModules === st.modules.length,
    `metadata.estimatedModules tracks the module count (${st.meta.estimatedModules} vs ${st.modules.length})`);

  // ---- 8 ------------------------------------------------------------------------------------
  // The banks are FROZEN while the build runs: the re-balance slice owns them (audit §D-2).
  // Deliberately NOT asserted here: "no lesson has zero practice items". A new lesson lands
  // with no bank item by design until the re-balance, so that assertion would red the first
  // lesson of every slice — the same trap this harness exists to remove.
  sec("8. the banks stay frozen until the re-balance slice owns them");
  check(st.practice.length === 100, `practice bank is exactly 100 (is ${st.practice.length})`);
  check(st.kc.length === 25, `knowledge check is exactly 25 (is ${st.kc.length})`);
  const practiceIds = st.practice.map((q) => q.id);
  const kcIds = st.kc.map((q) => q.id);
  check(new Set(practiceIds).size === practiceIds.length, "practice ids are unique");
  check(new Set(kcIds).size === kcIds.length, "knowledge-check ids are unique");
  const badPractice = st.practice.filter((q) => !lessonIdSet.has(q.topic));
  check(badPractice.length === 0,
    `every practice topic is a real lesson id (${badPractice.map((q) => q.id + "->" + q.topic).join(", ") || "none"})`);
  const badKc = st.kc.filter((q) => !lessonIdSet.has(q.topic));
  check(badKc.length === 0,
    `every knowledge-check topic is a real lesson id (${badKc.map((q) => q.id + "->" + q.topic).join(", ") || "none"})`);
  check(practiceIds.includes("p101") && practiceIds.includes("p102"),
    "the two new selection-evolution items replaced the retired duplicates");
  check(!practiceIds.includes("p28") && !practiceIds.includes("p36"),
    "the two retired duplicate items are gone");
  check(kcIds.includes("q26") && !kcIds.includes("q23"),
    "the untaught joint question was replaced by the immunity item");

  // ---- 9 ------------------------------------------------------------------------------------
  sec("9. content/ and public/content/ mirrors are byte-identical");
  for (const f of MIRRORS) check(st.raw[f].c === st.raw[f].p, `content/biology/${f} matches its public/ mirror`);

  // ---- 10 -----------------------------------------------------------------------------------
  sec("10. routing: biology passes lessonId, resolves it first, and keeps its subject deck");
  const i0 = st.sandbox.indexOf('if (subjectId === "biology")');
  const i1 = st.sandbox.indexOf('if (subjectId === "human-social-biology")');
  const bioBranch = i0 === -1 || i1 === -1 ? "" : st.sandbox.slice(i0, i1);
  check(/DragDropLabel subjectId="biology"/.test(bioBranch), "the biology branch renders DragDropLabel");
  check(/lessonId=\{lessonId\}/.test(bioBranch), "the biology branch passes lessonId through");
  const perLesson = st.drag.indexOf("lessonSets[subjectId] && lessonSets[subjectId][lessonId]");
  const byType = st.drag.indexOf("subjectTypeSets[subjectId]");
  const subjectWide = st.drag.indexOf("subjectSets[subjectId] || null");
  const borrowed = st.drag.indexOf('subjectSets[subjectId] || subjectSets["english-a"]');
  check(perLesson !== -1, "DragDropLabel consults lessonSets[subjectId][lessonId]");
  check(byType !== -1 && subjectWide !== -1, "DragDropLabel still has its type and subject-wide layers");
  check(borrowed === -1,
    "the subject-wide layer yields NOTHING for a subject with no set of its own — it never borrows English A's set");
  check(perLesson !== -1 && perLesson < byType && perLesson < subjectWide,
    "the per-lesson set resolves BEFORE the type and subject-wide layers");
  // The subject-page lab has no lessonId, so it still needs the subject-level deck even
  // though every lesson now owns a set of its own.
  const deckStart = st.drag.indexOf("const subjectSets = {");
  const deckEnd = st.drag.indexOf("const subjectTypeSets");
  const deck = deckStart === -1 || deckEnd === -1 ? "" : st.drag.slice(deckStart, deckEnd);
  check(/biology:\s*\{/.test(deck) && /Label the Animal Cell/.test(deck),
    "the subject-level biology deck is still defined for the subject-page lab (no lessonId)");

  return { pass, failures };
}

// ---------------------------------------------------------------------------------------------
// Red controls. Each synthesises one defect on a fresh load and must be caught BY the
// assertion it is aimed at — "something failed" is not proof, because one mutation can trip
// several assertions at once. Examples are DERIVED from the loaded tree, never hand-typed:
// a lesson id typed in here becomes real in a later slice and the control silently stops
// testing anything (mat-geo-bearings did that three times).
const ghostLesson = (id) => ({ id, title: "A Ghost Lesson", content: "x\n\ny", objectives: ["x"], concepts: ["x"], experiment: { type: "drag-drop-label", description: "x" } });

const RED_CONTROLS = {
  // blank one lesson's set — the fallback-deck bug in its simplest form
  "set-blanked": (st) => { delete st.sets[st.modules[0].lessons[0].id]; },
  // a lesson that forgot its set entirely (the shape a new slice ships if it forgets)
  "lesson-forgets-set": (st) => { st.modules[0].lessons.push(ghostLesson("bio-cell-forgot-its-set")); },
  "stray-set": (st) => { st.sets["bio-cell-ghost-set"] = clone(st.sets[st.modules[0].lessons[0].id]); },
  // pending bookkeeping, both directions.
  // PENDING_IDS is empty now that every planned lesson has landed, so a control that read
  // st.pending[0] would push ghostLesson(undefined) or shift nothing and test nothing. Each of the
  // three synthesises the pending state it needs first: a fixture id goes into the in-memory
  // st.pending, and the tree is shaped so the defect it names is the one that exists.
  "pending-id-lands": (st) => {
    // a slice lands a lesson and forgets to strike its id off PENDING_IDS
    const id = st.planned[0];
    st.pending.push(id);
  },
  "pending-struck-early": (st) => {
    // a slice strikes an id off PENDING_IDS without landing the lesson
    const id = st.planned[0];
    for (const m of st.modules) m.lessons = (m.lessons || []).filter((l) => l.id !== id);
    delete st.sets[id];
    st.pending.push(id);
    st.pending.shift();
  },
  "pending-unknown-id": (st) => { st.pending.push("bio-cell-nobody-planned-this"); },
  // the plan's own size — the two ways it can silently shrink
  "plan-shrunk": (st) => { st.planned.pop(); },
  "plan-duplicate": (st) => { st.planned.push(st.planned[0]); },
  "unplanned-new-lesson": (st) => {
    const id = "bio-cell-nobody-planned-this";
    st.modules[0].lessons.push(ghostLesson(id));
    st.sets[id] = clone(st.sets[st.modules[0].lessons[0].id]);
  },
  // appending vs inserting
  "new-lesson-inserted": (st) => {
    // a pending lesson is inserted among the existing ones instead of appended after them
    const id = st.planned[0];
    for (const m of st.modules) m.lessons = (m.lessons || []).filter((l) => l.id !== id);
    delete st.sets[id];
    st.pending.push(id);
    st.modules[0].lessons.unshift(ghostLesson(id));
    st.sets[id] = clone(st.sets[st.modules[0].lessons[1].id]);
  },
  "frozen-reordered": (st) => {
    const l = st.modules[0].lessons;
    [l[0], l[1]] = [l[1], l[0]];
  },
  "frozen-lost": (st) => {
    const gone = st.modules[0].lessons.shift();
    delete st.sets[gone.id];
  },
  // id scheme
  "new-id-off-scheme": (st) => {
    const id = "bio-zzz-nothing-matches";
    st.modules[0].lessons.push(ghostLesson(id));
    st.sets[id] = clone(st.sets[st.modules[0].lessons[0].id]);
  },
  // shape of a set
  "set-kind-unsupported": (st) => { st.sets[st.modules[0].lessons[0].id].kind = "video"; },
  // module count
  "estimated-modules-drift": (st) => { st.meta.estimatedModules = st.modules.length + 1; },
  // frozen banks
  "practice-grown": (st) => { st.practice.push(clone(st.practice[0])); },
  "kc-grown": (st) => { st.kc.push(clone(st.kc[0])); },
  "practice-topic-ghost": (st) => { st.practice[0].topic = "no-such-lesson"; },
  // mirrors
  "mirror-drift": (st) => { st.raw["practice.json"].p += " "; },
  // routing
  "route-drops-lessonid": (st) => {
    const a = st.sandbox.indexOf('if (subjectId === "biology")');
    const b = st.sandbox.indexOf('if (subjectId === "human-social-biology")');
    st.sandbox = st.sandbox.slice(0, a) + st.sandbox.slice(a, b).replace(/lessonId=\{lessonId\}/, "") + st.sandbox.slice(b);
  },
  "subject-deck-deleted": (st) => { st.drag = st.drag.replace('title: "Label the Animal Cell"', 'title: "Label the Plant Cell"'); },
  "borrows-english-a": (st) => {
    st.drag = st.drag.replace("subjectSets[subjectId] || null", 'subjectSets[subjectId] || subjectSets["english-a"]');
  },
  "per-lesson-lookup-removed": (st) => {
    st.drag = st.drag.replace("lessonSets[subjectId] && lessonSets[subjectId][lessonId]", "false");
  },
};

// What each control must be caught BY.
const RED_EXPECT = {
  "set-blanked": "every lesson in modules.json has its own lessonSets.biology set (missing:",
  "lesson-forgets-set": "every lesson in modules.json has its own lessonSets.biology set (missing: bio-cell-forgot-its-set)",
  "stray-set": "no stray biology sets: every lessonSets.biology key is a real lesson id (stray: bio-cell-ghost-set)",
  "pending-id-lands": "every id still listed in PENDING_IDS has not landed yet (landed:",
  "pending-struck-early": "every planned new lesson struck off PENDING_IDS has actually landed in modules.json (lost:",
  "pending-unknown-id": "every PENDING_IDS entry is one of the 12 planned new lessons (unknown: bio-cell-nobody-planned-this)",
  "plan-shrunk": "the plan still holds every one of its planned new lessons",
  "plan-duplicate": "PLANNED_NEW_IDS has no duplicate ids (duplicates:",
  "unplanned-new-lesson": "every landed new lesson id is one of the 12 planned ids (unplanned: bio-cell-nobody-planned-this)",
  "new-lesson-inserted": "every new lesson sits after the existing ones",
  "frozen-reordered": "keeps its existing lessons in their original order",
  "frozen-lost": "all 18 frozen lesson ids are still present in modules.json (missing:",
  "new-id-off-scheme": "every new lesson id follows bio-<module>-<topic> (offenders: bio-zzz-nothing-matches)",
  "set-kind-unsupported": "kind is supported (video)",
  "estimated-modules-drift": "metadata.estimatedModules tracks the module count",
  "practice-grown": "practice bank is exactly 100",
  "kc-grown": "knowledge check is exactly 25",
  "practice-topic-ghost": "every practice topic is a real lesson id (p",
  "mirror-drift": "content/biology/practice.json matches its public/ mirror",
  "route-drops-lessonid": "the biology branch passes lessonId through",
  "subject-deck-deleted": "the subject-level biology deck is still defined for the subject-page lab",
  "borrows-english-a": "never borrows English A's set",
  "per-lesson-lookup-removed": "DragDropLabel consults lessonSets[subjectId][lessonId]",
};

/** Run one control against a fresh load. ok = it was caught, and caught by the assertion it names. */
function runControl(name) {
  const st = loadState();
  RED_CONTROLS[name](st);
  const { failures } = runChecks(st);
  const real = failures.filter((f) => !f.startsWith("\u0000"));
  if (!real.length) return { ok: false, real, why: "WAS NOT CAUGHT — the check is blind to it" };
  const expect = RED_EXPECT[name];
  if (expect && !real.some((f) => f.includes(expect)))
    return { ok: false, real, why: `CAUGHT BY THE WRONG ASSERTION — no failure containing "${expect}"` };
  const aimed = expect ? real.filter((f) => f.includes(expect)) : real;
  return { ok: true, real: aimed.length ? aimed : real };
}

const argv = process.argv.slice(2);
if (argv.includes("--red-control")) {
  const name = argv[argv.indexOf("--red-control") + 1];
  if (!RED_CONTROLS[name]) { console.log(`unknown red control: ${name}`); process.exit(2); }
  let r;
  try { r = runControl(name); } catch (e) { console.log(`RED CONTROL "${name}" BROKE — ${e.message}`); process.exit(1); }
  if (!r.ok) { console.log(`RED CONTROL "${name}" ${r.why}`); r.real.slice(0, 3).forEach((f) => console.log("   " + f)); process.exit(1); }
  console.log(`red control "${name}": caught with ${r.real.length} failure(s) — as expected`);
  r.real.slice(0, 3).forEach((f) => console.log("   " + f));
  process.exit(0);
}
if (argv.includes("--red-controls-all")) {
  let bad = 0;
  for (const name of Object.keys(RED_CONTROLS)) {
    let r;
    try { r = runControl(name); } catch (e) { bad++; console.log(`BROKEN: ${name} — ${e.message}`); continue; }
    if (!r.ok) { bad++; console.log(`${r.real.length ? "WRONG ASSERTION" : "NOT CAUGHT"}: ${name} — ${r.why}`); }
    else console.log(`caught (${r.real.length}): ${name} — ${r.real[0]}`);
  }
  console.log(`\n${Object.keys(RED_CONTROLS).length} red controls, ${bad} not caught`);
  process.exit(bad ? 1 : 0);
}

const st = loadState();
const { pass, failures } = runChecks(st);
for (const f of failures) console.log(f.startsWith("\u0000") ? `\n${f.slice(1)}` : "FAIL: " + f);
const real = failures.filter((f) => !f.startsWith("\u0000"));
console.log(`\ncheck-biology-labs: ${pass} checks passed, ${real.length} failed · ${st.pending.length} new ids still pending (${st.pending.join(", ") || "none"})`);
process.exit(real.length ? 1 : 0);
