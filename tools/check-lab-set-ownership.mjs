#!/usr/bin/env node
// Harness: no lab ever shows a student another subject's activity.
//
// The defect this guards (owner-visible on /subject/human-social-biology):
// DragDropLabel ended its resolution chain with
//     set = subjectSets[subjectId] || subjectSets["english-a"];
// so a subject with no set of its own — Human & Social Biology — was handed
// English A's "Match Literary Devices" activity. Every other subject either had
// its own subject-level set or was routed to a different tool, which is why the
// bug hid on one page.
//
// The check runs the SHIPPED resolution chain and the SHIPPED library literals,
// both extracted from src/components/DragDropLabel.jsx, over every subject the
// platform sells, and asserts that the set a subject resolves to is
//     (a) a set owned by that subject, or
//     (b) nothing at all (null), which the component renders as the honest
//         SubjectLabUnavailable panel.
// A subject resolving to a set owned by a DIFFERENT subject is the failure.
//
// The red control at the end re-runs the same logic against a copy of the
// source with the old `|| subjectSets["english-a"]` line restored, and against
// a copy with the honest panel removed, so the harness is proven able to fail.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lessonSets } from "../src/components/lessonSets.js";
import { FALLBACK_SUBJECT_OPTIONS } from "../src/data/pricingSubjects.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const section = (t) => console.log(`\n== ${t}`);

const DDL_PATH = "src/components/DragDropLabel.jsx";
const source = read(DDL_PATH);

// ---- extract a top-level object literal by brace matching -------------------
function extractObjectLiteral(src, header) {
  const at = src.indexOf(header);
  if (at === -1) return null;
  const start = src.indexOf("{", at + header.length - 1);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

// ---- extract the shipped resolution chain ----------------------------------
function extractResolver(src) {
  const start = src.indexOf("let set;");
  const end = src.indexOf("const [placed");
  if (start === -1 || end === -1 || end < start) return null;
  const body = src.slice(start, end);
  return new Function(
    "lessonSets", "englishSets", "subjectTypeSets", "subjectSets",
    "subjectId", "experimentType", "lessonId",
    `${body}\nreturn set;`
  );
}

function loadShipped(src) {
  const subjectSets = eval(`(${extractObjectLiteral(src, "const subjectSets = {")})`);
  const englishSets = eval(`(${extractObjectLiteral(src, "const englishSets = {")})`);
  const subjectTypeSets = eval(`(${extractObjectLiteral(src, "const subjectTypeSets = {")})`);
  return { subjectSets, englishSets, subjectTypeSets, resolve: extractResolver(src) };
}

const shipped = loadShipped(source);
check(!!shipped.resolve, "the shipped resolution chain was extracted from DragDropLabel.jsx");
check(Object.keys(shipped.subjectSets).length > 0, `subjectSets extracted (${Object.keys(shipped.subjectSets).length} sets)`);
check(Object.keys(shipped.englishSets).length > 0, `englishSets extracted (${Object.keys(shipped.englishSets).length} sets)`);
check(Object.keys(shipped.subjectTypeSets).length > 0, `subjectTypeSets extracted (${Object.keys(shipped.subjectTypeSets).length} libraries)`);

// ---- who owns which set? ---------------------------------------------------
// Ownership is structural: a set reached through lessonSets[s] / subjectSets[s]
// / subjectTypeSets[s][*] belongs to subject s; englishSets belongs to english-a.
function ownerIndex() {
  return ownerIndexFor(shipped);
}
function ownerIndexFor(libs) {
  const map = new Map();
  const claim = (set, owner) => { if (set && typeof set === "object" && !map.has(set)) map.set(set, owner); };
  for (const [s, set] of Object.entries(libs.subjectSets)) claim(set, s);
  for (const set of Object.values(libs.englishSets)) claim(set, "english-a");
  for (const [s, lib] of Object.entries(libs.subjectTypeSets)) {
    for (const set of Object.values(lib)) claim(set, s);
  }
  for (const [s, lessons] of Object.entries(lessonSets)) {
    for (const set of Object.values(lessons)) claim(set, s);
  }
  return map;
}
const OWNER = ownerIndex();
const ownerOf = (set) => (set === null || set === undefined ? null : OWNER.get(set) || "UNKNOWN");

// ---- every subject the platform sells, with its lessons ---------------------
const SUBJECTS = FALLBACK_SUBJECT_OPTIONS.map((s) => s.id);
check(SUBJECTS.length === 25, `the platform's subject list was walked (${SUBJECTS.length} subjects)`);

function lessonIdsOf(subject) {
  const p = `content/${subject}/modules.json`;
  if (!fs.existsSync(path.join(root, p))) return [];
  return readJson(p).flatMap((m) => (m.lessons || []).map((l) => l.id));
}
function lessonTypesOf(subject) {
  const p = `content/${subject}/modules.json`;
  if (!fs.existsSync(path.join(root, p))) return [];
  const types = [];
  for (const m of readJson(p)) {
    for (const l of m.lessons || []) {
      const e = l.experiment;
      if (typeof e === "string") types.push(e);
      else if (e && typeof e === "object") types.push(e.type || e.interactive);
    }
  }
  return types.filter(Boolean);
}

section("1. no subject resolves to another subject's set");
const FOREIGN = [];
const HONEST = [];
const OWN = [];
for (const subject of SUBJECTS) {
  const lessonIds = lessonIdsOf(subject);
  // Every experiment type this subject's own lessons declare, plus the type the
  // subject-level tab asks for, plus the generic fallback — resolution must be
  // safe for ANY of them, not just the one path the app happens to take today.
  const types = [...new Set([...lessonTypesOf(subject), "flashcard", "drag-drop", undefined])];
  const calls = [];
  for (const t of types) calls.push({ t, lessonId: undefined });
  for (const lessonId of lessonIds) calls.push({ t: undefined, lessonId });

  for (const { t, lessonId } of calls) {
    const set = shipped.resolve(
      lessonSets, shipped.englishSets, shipped.subjectTypeSets, shipped.subjectSets,
      subject, t, lessonId
    );
    const owner = ownerOf(set);
    const where = `${subject}${lessonId ? `/${lessonId}` : ""}${t ? ` (type ${t})` : ""}`;
    if (owner === subject) OWN.push(where);
    else if (owner === null) HONEST.push(where);
    else FOREIGN.push(`${where} → ${owner}'s "${set && set.title}"`);
  }
}
check(FOREIGN.length === 0,
  `no subject falls through to another subject's activity (${FOREIGN.length} foreign resolutions${FOREIGN.length ? ": " + FOREIGN.slice(0, 6).join("; ") : ""})`);
check(OWN.length > 0, `subjects with their own set still resolve to it (${OWN.length} resolutions)`);
check(HONEST.length > 0, `subjects with no set of their own resolve to nothing at all (${HONEST.length} resolutions, e.g. ${HONEST[0]})`);
console.log(`   ${SUBJECTS.length} subjects, ${OWN.length + HONEST.length} resolutions checked`
  + ` — own set: ${OWN.length}, honest panel: ${HONEST.length}, foreign: ${FOREIGN.length}`);

section("2. the Human & Social Biology subject page (the reported defect)");
const hsbSets = shipped.subjectSets["human-social-biology"];
check(hsbSets === undefined, "Human & Social Biology has no subject-level set of its own (so it must show the honest panel)");
const hsbLessonIds = lessonIdsOf("human-social-biology");
check(hsbLessonIds.length > 0, `Human & Social Biology has lessons to check (${hsbLessonIds.length})`);
const hsbUncovered = hsbLessonIds.filter((id) => {
  const set = shipped.resolve(lessonSets, shipped.englishSets, shipped.subjectTypeSets, shipped.subjectSets,
    "human-social-biology", undefined, id);
  return ownerOf(set) !== "human-social-biology";
});
check(hsbUncovered.length === 0,
  `every Human & Social Biology lesson resolves to a Human & Social Biology set or the honest panel (uncovered: ${hsbUncovered.join(", ") || "none"})`);
const hsbOwn = hsbLessonIds.filter((id) => {
  const set = shipped.resolve(lessonSets, shipped.englishSets, shipped.subjectTypeSets, shipped.subjectSets,
    "human-social-biology", undefined, id);
  return ownerOf(set) === "human-social-biology";
});
console.log(`   Human & Social Biology: ${hsbLessonIds.length} lessons — ${hsbOwn.length} resolve to their own set,`
  + ` ${hsbLessonIds.length - hsbOwn.length} to the honest panel, 0 to another subject`);
for (const etype of ["flashcard", "drag-drop", "body-explorer", undefined]) {
  const set = shipped.resolve(lessonSets, shipped.englishSets, shipped.subjectTypeSets, shipped.subjectSets,
    "human-social-biology", etype, undefined);
  check(ownerOf(set) === null,
    `the Human & Social Biology subject-level lab yields no foreign set (type ${etype}) — resolves to ${ownerOf(set) || "the honest panel"}`);
}
const englishSetTitles = Object.values(shipped.subjectSets).filter((s) => s.title === "Match Literary Devices").length;
check(englishSetTitles === 1, "English A's \"Match Literary Devices\" exists exactly once, in subjectSets[\"english-a\"]");

section("3. a subject with no set of its own renders the honest panel, not a foreign lab");
check(source.includes("|| subjectSets[\"english-a\"]") === false,
  "DragDropLabel no longer borrows subjectSets[\"english-a\"] for another subject");
check(/subjectSets\[subjectId\] \|\| null/.test(source),
  "the subject-level layer yields null for a subject with no set of its own");
check(/if \(!set\) return <SubjectLabUnavailable/.test(source),
  "the component returns the honest SubjectLabUnavailable panel when no set resolved");
check(source.includes("function SubjectLabUnavailable("),
  "the SubjectLabUnavailable panel exists");
check(/FALLBACK_SUBJECT_OPTIONS\.find\(\(s\) => s\.id === subjectId\)/.test(source),
  "the panel names the subject from the platform's own subject list (no invented names)");
check(source.includes("useState(() => (set ? shuffle("),
  "the shuffle initialiser tolerates a null set (the component can render with no set)");
const hookCount = (source.slice(source.indexOf("export default function DragDropLabel"), source.indexOf("if (!set) return")).match(/use(State|Effect|Ref)\(/g) || []).length;
check(hookCount >= 6,
  `every hook runs before the honest-panel return, so the hook order never changes (${hookCount} hooks above the return)`);

section("4. red control — the harness fails on the code as it was, and on a missing panel");
const BUGGY = source.replace("set = subjectSets[subjectId] || null;", "set = subjectSets[subjectId] || subjectSets[\"english-a\"];");
check(BUGGY !== source, "the red-control source really is different from the shipped source");
const buggy = loadShipped(BUGGY);
const buggyHsb = buggy.resolve(lessonSets, buggy.englishSets, buggy.subjectTypeSets, buggy.subjectSets,
  "human-social-biology", undefined, undefined);
const buggyOwner = (buggyHsb === null ? null : ownerIndexFor(buggy).get(buggyHsb) || "UNKNOWN");
check(buggyOwner === "english-a",
  `RED CONTROL: with the old fallback restored the Human & Social Biology lab resolves to English A's "${buggyHsb && buggyHsb.title}" — i.e. the ownership check above would fail`);
check(buggyHsb && buggyHsb.title === "Match Literary Devices",
  "RED CONTROL: the foreign activity is exactly the one seen on the live page");
// The whole walk, re-run against the pre-fix resolver: it must find the defect.
const buggyOwnerIdx = ownerIndexFor(buggy);
const buggyForeign = [];
for (const subject of SUBJECTS) {
  const calls = [{ t: undefined, lessonId: undefined }, ...lessonIdsOf(subject).map((lessonId) => ({ t: undefined, lessonId }))];
  for (const { t, lessonId } of calls) {
    const set = buggy.resolve(lessonSets, buggy.englishSets, buggy.subjectTypeSets, buggy.subjectSets, subject, t, lessonId);
    const owner = set === null || set === undefined ? null : buggyOwnerIdx.get(set) || "UNKNOWN";
    if (owner && owner !== subject) buggyForeign.push(`${subject}${lessonId ? "/" + lessonId : ""} → ${owner}`);
  }
}
check(buggyForeign.length > 0,
  `RED CONTROL: the pre-fix resolver is caught by the walk (${buggyForeign.length} foreign resolutions, e.g. ${buggyForeign.slice(0, 4).join("; ")})`);
check(buggyForeign.some((f) => f.startsWith("human-social-biology")),
  "RED CONTROL: the caught defect includes the Human & Social Biology subject page");
const noPanel = source.replace(/if \(!set\) return <SubjectLabUnavailable subjectId=\{subjectId\} \/>;/, "");
check(noPanel !== source, "the second red control really removes the panel");
check(/if \(!set\) return <SubjectLabUnavailable/.test(noPanel) === false,
  "RED CONTROL: without the panel the honest-state assertion fails");

console.log(`\ncheck-lab-set-ownership: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
