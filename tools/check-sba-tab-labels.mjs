#!/usr/bin/env node
// Harness: the exam-support tab must be named per subject.
//
// French and Spanish have NO School-Based Assessment portfolio -- their Paper 03
// IS the oral examination (content/<subject>/sba.json teaches exactly that), so
// their tab must read "Oral Exam / Paper 03" while every other subject keeps
// "CSEC SBA". This harness drives the real src/data/sbaTabs.js the app renders
// with, and guards the two components against re-hardcoding the label.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORAL_EXAM_SUBJECTS, SBA_TAB_LABEL, ORAL_EXAM_TAB_LABEL,
  isOralExamSubject, sbaTabLabel, sbaGuideLabel, sbaTabNoun,
} from "../src/data/sbaTabs.js";

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

// --- the label itself, for every catalog subject ------------------------
for (const id of ids) {
  const want = ORAL_EXAM_SUBJECTS.includes(id) ? ORAL_EXAM_TAB_LABEL : SBA_TAB_LABEL;
  eq(sbaTabLabel(id), want, `tab label for ${id}`);
}
eq(ORAL_EXAM_TAB_LABEL, "Oral Exam / Paper 03", "modern-language tab label");
eq(SBA_TAB_LABEL, "CSEC SBA", "default tab label is unchanged");
for (const id of ids) {
  const l = sbaTabLabel(id);
  ok(l.length > 0, `label for ${id} is non-empty`);
  if (ORAL_EXAM_SUBJECTS.includes(id)) ok(!/SBA/.test(l), `${id} label never says SBA (got ${l})`);
}

// --- banner / heading wording -------------------------------------------
eq(sbaGuideLabel("french"), "Oral Exam Guide", "French locked-banner guide name");
eq(sbaGuideLabel("spanish"), "Oral Exam Guide", "Spanish locked-banner guide name");
eq(sbaGuideLabel("biology"), "SBA Guide", "other subjects keep the SBA guide name");
eq(sbaTabNoun("french"), "Oral Exam", "French tab noun");
eq(sbaTabNoun("physics"), "SBA", "other subjects keep the SBA tab noun");

// --- defensive: odd/absent input must never break the page --------------
for (const bad of [undefined, null, "", 0, 42, {}, [], "  ", "FRENCH-ISH"]) {
  eq(sbaTabLabel(bad), SBA_TAB_LABEL, `unknown subject input ${JSON.stringify(bad)} falls back to the default label`);
  ok(isOralExamSubject(bad) === false, `unknown subject input ${JSON.stringify(bad)} is not an oral-exam subject`);
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
ok(sba.includes('"CSEC Paper 03') , "the oral-exam heading names Paper 03");

console.log(`\ncheck-sba-tab-labels: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}`);
process.exit(fail ? 1 : 0);
