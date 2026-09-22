#!/usr/bin/env node
// Harness: the teacher dashboard must name lab activity in the subject's own
// words — Subject -> Module -> Lesson — instead of the raw lesson id the
// platform records, and it must keep working when content cannot be loaded.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  labLessonName, labLessonPath, loadLessonNameIndex, resolveLabLesson,
  subjectName, experimentLabel,
} from "../src/data/lessonNames.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const eq = (got, want, msg) => check(got === want, `${msg} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));

const catalog = readJson("content/subjects.json");
const ids = catalog.map((s) => s.id);

// A fetch stand-in that serves the real content tree straight off disk, so the
// harness exercises the ids the platform actually records.
const diskFetch = (url) => {
  const abs = path.join(root, String(url).replace(/^\//, ""));
  if (!fs.existsSync(abs)) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(abs, "utf8")) });
};

const index = await loadLessonNameIndex(ids, { fetchImpl: diskFetch });

// ---- subject names ------------------------------------------------------
for (const s of catalog) eq(subjectName(s.id, index), s.name, `subject name for ${s.id}`);
eq(index.subjects.size, ids.length, "every catalog subject is named in the index");

// ---- every real lesson id resolves --------------------------------------
let total = 0, withModules = 0, problems = 0;
for (const s of catalog) {
  const file = `content/${s.id}/modules.json`;
  if (!exists(file)) continue;
  withModules++;
  const modules = readJson(file);
  const seen = new Map();
  for (const m of modules) for (const l of m.lessons || []) {
    seen.set(l.id, (seen.get(l.id) || 0) + 1);
  }
  let lessons = 0;
  for (const m of modules) for (const l of m.lessons || []) {
    lessons++; total++;
    const r = resolveLabLesson(s.id, l.id, index);
    if (!r.known || r.lessonTitle !== l.title) { problems++; if (problems < 4) console.log("  unresolved:", s.id, l.id, JSON.stringify(r)); continue; }
    // A lesson id reused inside one subject can only resolve to one module, so
    // the exact module is asserted only for ids that are unique in the subject.
    if (seen.get(l.id) === 1 && (r.moduleTitle !== m.title || r.subjectName !== s.name)) {
      problems++; if (problems < 4) console.log("  wrong module:", s.id, l.id, r.moduleTitle, "want", m.title);
    }
    const want = seen.get(l.id) === 1 ? `${s.name} · ${m.title} · ${l.title}` : null;
    if (want && labLessonPath(s.id, l.id, index) !== want) { problems++; if (problems < 4) console.log("  path:", s.id, l.id, labLessonPath(s.id, l.id, index)); }
    if (labLessonName(s.id, l.id, index) !== l.title) { problems++; }
    check(Boolean(labLessonPath(s.id, l.id, index).trim()), `path for ${s.id}/${l.id} is not blank`);
  }
  check(lessons > 0, `${s.id} ships lessons`);
}
check(problems === 0, `every real lesson id resolves to names (${problems} problems of ${total})`);
check(total >= 300, `the content tree is large enough for this to mean something (${total} lessons)`);
check(withModules >= 20, `most subjects ship modules.json (${withModules}/${ids.length})`);
console.log(`  resolved ${total} lesson ids across ${withModules} subjects`);

// ---- a recorded row renders the full path -------------------------------
const first = catalog.find((s) => exists(`content/${s.id}/modules.json`));
const firstModule = readJson(`content/${first.id}/modules.json`)[0];
const firstLesson = firstModule.lessons[0];
eq(
  labLessonPath(first.id, firstLesson.id, index),
  `${first.name} · ${firstModule.title} · ${firstLesson.title}`,
  "a real recorded lab row renders Subject · Module · Lesson"
);

// ---- ids we cannot resolve still show something -------------------------
const stray = resolveLabLesson("mathematics", "math-l1-1", index);
check(stray.known === false, "an id missing from the content tree is not treated as known");
eq(labLessonPath("mathematics", "math-l1-1", index), "Mathematics · math-l1-1", "an unresolvable id shows the subject and the raw id");
eq(labLessonPath("not-a-subject", "x", index), "x", "unknown subject and lesson falls back to the id");
eq(labLessonPath(null, null, index), "unknown lesson", "a fully empty row still renders a label");

// ---- a missing / malformed index never blanks or throws -----------------
for (const bad of [null, undefined, {}, "nope", 42, []]) {
  eq(labLessonPath("mathematics", "real-numbers", bad), "real-numbers", `no usable index (${String(bad)}) falls back to the raw id`);
  eq(subjectName("mathematics", bad), null, `no usable index (${String(bad)}) yields no subject name`);
  check(labLessonName("mathematics", "real-numbers", bad) === "real-numbers", "name falls back to the raw id");
}

// ---- content unreachable: rows keep rendering ---------------------------
const broken = await loadLessonNameIndex(ids, { fetchImpl: () => { throw new Error("network down"); } });
check(broken.subjects.size === 0 && broken.lessons.size === 0, "a failing content fetch yields an empty index, not an exception");
eq(labLessonPath("mathematics", "real-numbers", broken), "real-numbers", "unreachable content still shows the raw lesson id");

const catalogOnly = await loadLessonNameIndex(["mathematics"], {
  fetchImpl: async (url) => (url === "/content/subjects.json" ? { ok: true, status: 200, json: async () => catalog } : { ok: false, status: 404, json: async () => ({}) }),
});
eq(labLessonPath("mathematics", "real-numbers", catalogOnly), "Mathematics · real-numbers", "a modules.json failure still keeps the subject name");

let calls = 0;
const none = await loadLessonNameIndex([], { fetchImpl: async () => { calls++; return { ok: false, status: 404, json: async () => ({}) }; } });
check(calls === 0 && none.lessons.size === 0, "no subject ids means no requests are made");

const savedFetch = globalThis.fetch;
try {
  delete globalThis.fetch;
  const noFetch = await loadLessonNameIndex(["mathematics"]);
  check(noFetch.lessons.size === 0, "an environment without fetch returns an empty index instead of throwing");
} finally {
  if (savedFetch) globalThis.fetch = savedFetch;
}

// ---- experiment type naming ---------------------------------------------
let typeMap = null;
try { typeMap = (await import("../src/data/contentLoader.js")).experimentTypes; } catch (e) { console.log("  note: contentLoader not importable in node:", e.message); }
if (typeMap) {
  check(Object.keys(typeMap).length > 50, `the experiment map covers the shipped labs (${Object.keys(typeMap).length} types)`);
  eq(experimentLabel("vocab-flashcards", typeMap), "Flashcard Trainer", "a lab shows the friendly experiment name");
  eq(experimentLabel("circuit-builder", typeMap), "Circuit Builder", "another shipped experiment resolves");
}
eq(experimentLabel(null, typeMap), null, "no experiment type renders nothing");
eq(experimentLabel("mystery-lab", typeMap || {}), "mystery-lab", "an unknown experiment type shows its slug, never a blank");

// ---- wiring guards ------------------------------------------------------
// The Subject -> Module -> Lesson rendering moved into the component the teacher
// AND parent dashboards share (src/components/StudentProgressDashboard.jsx), so
// that is where the resolution must live — both pages import it.
const page = read("src/pages/TeacherPage.jsx");
const sharedView = read("src/components/StudentProgressDashboard.jsx");
check(page.includes("StudentProgressDashboard"), "the teacher dashboard renders the shared progress view");
check(read("src/pages/ParentPage.jsx").includes("StudentProgressDashboard"), "the parent dashboard renders the same shared progress view");
const api = read("api/analytics/summary.js");
check(sharedView.includes("labLessonPath(subject.subjectId, l.lessonId, nameIndex)"), "lab rows render the resolved Subject - Module - Lesson path");
check(!sharedView.includes("</span> {l.lessonId}"), "lab rows no longer print the bare lesson id");
check(sharedView.includes("experimentLabel(l.experimentType, experimentTypes)"), "lab rows show the experiment name");
check(sharedView.includes("loadLessonNameIndex("), "the dashboard builds the name index from the content tree");
check(sharedView.includes("subjectName(subject.subjectId, nameIndex)"), "the subject card heading shows the subject name, not the id");
check(sharedView.includes("no completion recorded"), "the opens-vs-completed explanation is kept");
check(api.includes("lessonId: row.lesson_id"), "the API still returns the recorded lesson id to resolve");
check(api.includes("experiment_type") && api.includes("last_activity_at"), "the API still returns the experiment type and timestamp");
check(api.includes("subject_id") && api.includes("lab_activity"), "the API still returns lab rows keyed by subject");

console.log(`\ncheck-teacher-lab-names: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}`);
process.exit(fail ? 1 : 0);
