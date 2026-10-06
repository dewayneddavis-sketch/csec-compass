#!/usr/bin/env node
// Harness: the exam-support tab must be named per subject.
//
// Three families of label now live in src/data/sbaTabs.js:
//   - CSEC subjects with an SBA portfolio        -> "CSEC SBA"
//   - French/Spanish, whose Paper 03 IS the oral  -> "Oral Exam / Paper 03"
//   - City & Guilds (no SBA portfolio at all)     -> per-subject override
// This harness drives the real src/data/sbaTabs.js the app renders with, and guards
// the components against re-hardcoding any of it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORAL_EXAM_SUBJECTS, SBA_TAB_LABEL, ORAL_EXAM_TAB_LABEL,
  CITY_GUILDS_SUBJECTS,
  isOralExamSubject, isCityGuildsSubject,
  sbaTabLabel, sbaGuideLabel, sbaTabNoun,
  sbaSectionHeading, sbaComingSoonCopy, sbaSampleHeading, sbaSampleColumnLabel,
} from "../src/data/sbaTabs.js";

// The City & Guilds labels, written here as the literal expectation: a rename in
// sbaTabs.js must fail this harness rather than silently change the live tab.
const EXPECTED_CG_TABS = {
  "city-guilds-mathematics": "Assessment Guide",
  "city-guilds-english": "Speaking & Listening Guide",
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const eq = (got, want, msg) => ok(got === want, `${msg} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

// --- catalog: every subject the site sells must get a label -------------
const raw = JSON.parse(read("content/subjects.json"));
const list = Array.isArray(raw) ? raw : raw.subjects || [];
const ids = list.map((s) => s.id).filter(Boolean);
ok(ids.length >= 23, `catalog lists all subjects (got ${ids.length})`);
for (const s of ["french", "spanish", "mathematics", "english-a", "theater-arts"]) ok(ids.includes(s), `catalog includes ${s}`);

// --- which subjects are oral-exam subjects ------------------------------
eq(ORAL_EXAM_SUBJECTS.length, 2, "exactly two subjects are modern languages");
eq([...ORAL_EXAM_SUBJECTS].sort().join(","), "french,spanish", "the oral-exam subjects are french and spanish");
for (const s of ORAL_EXAM_SUBJECTS) ok(ids.includes(s), `${s} is in the catalog`);

// --- the City & Guilds family -------------------------------------------
eq(CITY_GUILDS_SUBJECTS.length, 2, "exactly two subjects are City & Guilds");
eq([...CITY_GUILDS_SUBJECTS].sort().join(","), "city-guilds-english,city-guilds-mathematics",
  "the City & Guilds subjects are english and mathematics");
for (const id of CITY_GUILDS_SUBJECTS) {
  ok(isCityGuildsSubject(id) === true, `${id} is a City & Guilds subject`);
  ok(isOralExamSubject(id) === false, `${id} is not an oral-exam subject`);
  eq(sbaTabLabel(id), EXPECTED_CG_TABS[id], `City & Guilds tab label for ${id}`);
  ok(!/CSEC/.test(sbaTabLabel(id)), `${id} tab label never says CSEC (got ${sbaTabLabel(id)})`);
  ok(!/SBA/.test(sbaTabLabel(id)), `${id} tab label never says SBA (got ${sbaTabLabel(id)})`);
  ok(!/CSEC/.test(sbaSectionHeading(id)), `${id} heading never says CSEC (got ${sbaSectionHeading(id)})`);
  ok(!/SBA/.test(sbaSectionHeading(id)), `${id} heading never says SBA (got ${sbaSectionHeading(id)})`);
  ok(sbaSectionHeading(id).includes("City & Guilds"), `${id} heading names the qualification`);
  ok(!/School-Based Assessment guide/.test(sbaComingSoonCopy(id)),
    `${id} empty-state copy does not promise an SBA guide`);
}
// Every other subject is untouched by the C&G family.
for (const id of ids.filter((x) => !CITY_GUILDS_SUBJECTS.includes(x))) {
  ok(isCityGuildsSubject(id) === false, `${id} is not a City & Guilds subject`);
}
// The typed-answer (Paper 2) heading is subject-aware too: City & Guilds English is
// the only City & Guilds subject with such a tab, so it gets its own heading.
const paper2 = read("src/components/Paper2Section.jsx");
ok(paper2.includes('CSEC Paper 2 — typed answers, self-assessed'), "the CSEC typed-answer heading is unchanged");
ok(paper2.includes('"City & Guilds English — typed answers, self-assessed"') &&
  paper2.includes("isCityGuildsSubject(subjectId)"),
  "the typed-answer heading switches to the City & Guilds wording");

// --- the label itself, for every catalog subject ------------------------
for (const id of ids) {
  const want = isOralExamSubject(id) ? ORAL_EXAM_TAB_LABEL
    : isCityGuildsSubject(id) ? EXPECTED_CG_TABS[id]
    : SBA_TAB_LABEL;
  eq(sbaTabLabel(id), want, `tab label for ${id}`);
}
eq(ORAL_EXAM_TAB_LABEL, "Oral Exam / Paper 03", "modern-language tab label");
eq(SBA_TAB_LABEL, "CSEC SBA", "default tab label is unchanged");
for (const id of ids) {
  const l = sbaTabLabel(id);
  ok(l.length > 0, `label for ${id} is non-empty`);
  if (isOralExamSubject(id) || isCityGuildsSubject(id)) ok(!/SBA/.test(l), `${id} label never says SBA (got ${l})`);
}

// --- banner / heading wording -------------------------------------------
eq(sbaGuideLabel("french"), "Oral Exam Guide", "French locked-banner guide name");
eq(sbaGuideLabel("spanish"), "Oral Exam Guide", "Spanish locked-banner guide name");
eq(sbaGuideLabel("biology"), "SBA Guide", "other subjects keep the SBA guide name");
eq(sbaTabNoun("french"), "Oral Exam", "French tab noun");
eq(sbaTabNoun("physics"), "SBA", "other subjects keep the SBA tab noun");
eq(sbaGuideLabel("city-guilds-mathematics"), "Assessment Guide", "C&G Mathematics guide name");
eq(sbaGuideLabel("city-guilds-english"), "Speaking & Listening Guide", "C&G English guide name");
eq(sbaTabNoun("city-guilds-mathematics"), "assessment guide", "C&G Mathematics tab noun");
eq(sbaTabNoun("city-guilds-english"), "Speaking & Listening guide", "C&G English tab noun");
eq(sbaSampleHeading("french"), "How this dossier was marked, part by part", "oral sample heading");
eq(sbaSampleHeading("biology"), "How this sample earns each SBA category", "SBA sample heading");
eq(sbaSampleColumnLabel("spanish"), "What the examiner hears", "oral sample column");
eq(sbaSampleColumnLabel("biology"), "What the examiner sees", "SBA sample column");
ok(!/SBA/.test(sbaSampleHeading("city-guilds-english")) && !/CSEC/.test(sbaSampleHeading("city-guilds-english")),
  "the C&G sample heading claims no SBA and no CSEC");
ok(!/CSEC/.test(sbaComingSoonCopy("city-guilds-english")) && !/SBA/.test(sbaComingSoonCopy("city-guilds-english")),
  "the C&G empty-state copy claims no CSEC guide and no SBA guide");

// --- defensive: odd/absent input must never break the page --------------
for (const bad of [undefined, null, "", 0, 42, {}, [], "  ", "FRENCH-ISH", "CITY-GUILDS-SPANISH"]) {
  eq(sbaTabLabel(bad), SBA_TAB_LABEL, `unknown subject input ${JSON.stringify(bad)} falls back to the default label`);
  ok(isOralExamSubject(bad) === false, `unknown subject input ${JSON.stringify(bad)} is not an oral-exam subject`);
  ok(isCityGuildsSubject(bad) === false, `unknown subject input ${JSON.stringify(bad)} is not a City & Guilds subject`);
}
for (const word of ["city-guilds-mathematics", "CITY-GUILDS-MATHEMATICS", " City-Guilds-Mathematics "]) {
  eq(sbaTabLabel(word), EXPECTED_CG_TABS["city-guilds-mathematics"], `"${word}" is recognised as City & Guilds Mathematics`);
}
for (const word of ["city-guilds-english", "City-Guilds-English"]) {
  eq(sbaTabLabel(word), EXPECTED_CG_TABS["city-guilds-english"], `"${word}" is recognised as City & Guilds English`);
}
for (const word of ["french", "FRENCH", "French", "  french  ", "spanish", " Spanish "]) {
  eq(sbaTabLabel(word), ORAL_EXAM_TAB_LABEL, `"${word}" is recognised as a modern language`);
}

// --- content: both subjects ship the guide the tab renders --------------
for (const s of ["french", "spanish"]) {
  for (const dir of ["content", "public/content"]) {
    ok(exists(`${dir}/${s}/sba.json`), `${dir}/${s}/sba.json exists`);
  }
  const guide = JSON.parse(read(`content/${s}/sba.json`));
  ok(typeof guide.introduction === "string" && guide.introduction.length > 40, `${s} guide has an introduction`);
  ok(/oral|paper 03/i.test(guide.introduction), `${s} guide introduction talks about the oral examination`);
}

// --- source guards: nothing re-hardcodes the label ----------------------
const sp = read("src/pages/SubjectPage.jsx");
const sba = read("src/components/SBASection.jsx");
ok(!sp.includes('label: "CSEC SBA"'), "SubjectPage tab list no longer hardcodes the SBA label");
ok(sp.includes("label: SBA_TAB_LABEL"), "SubjectPage tab list uses the shared default label");
ok(sp.includes("sbaTabLabel(subjectId)"), "SubjectPage derives the SBA tab label from the subject");
ok(sp.includes("sbaGuideLabel(subjectId)") && sp.includes("sbaTabNoun(subjectId)"), "locked-banner copy is subject-aware");
ok(!/to view the SBA tab\./.test(sp), "locked banner no longer hardcodes 'SBA tab'");
ok(sba.includes("sbaGuideLabel(subjectId)") && sba.includes("sbaTabNoun(subjectId)"), "SBASection headings are subject-aware");
ok(sba.includes("Loading {guide}..."), "loading copy uses the subject-aware guide name");
ok(sba.includes("Sample {noun}"), "sample heading uses the subject-aware name");
ok(!sba.includes("SBA Guide Coming Soon") && !sba.includes("<h4>Sample SBA</h4>"), "no hardcoded SBA headings remain");
// The oral-exam heading now lives in the shared module, and the component must READ
// it: these four guards are what stop the next subject re-introducing a CSEC-only
// sentence into the JSX.
const tabs = read("src/data/sbaTabs.js");
ok(tabs.includes("CSEC Paper 03"), "the oral-exam heading names Paper 03 (in the shared module)");
ok(sba.includes("sbaSectionHeading(subjectId)"), "SBASection renders the heading from the shared module");
ok(sba.includes("sbaComingSoonCopy(subjectId)"), "SBASection renders the empty-state copy from the shared module");
ok(!/isOral/.test(sba), "no local isOral branching (both wordings moved to the shared module)");
ok(!/CSEC School-Based Assessment"/.test(sba), "no hardcoded CSEC heading remains in SBASection");
ok(!/School-Based Assessment guide for this subject/.test(sba), "no hardcoded SBA empty-state copy remains");

console.log(`\ncheck-sba-tab-labels: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}`);
process.exit(fail ? 1 : 0);
