#!/usr/bin/env node
// Harness: finishing a lab ALSO completes that lesson in the student's OWN
// progress (subject-page checkmark + progress bar), through ONE shared store so
// the manual tick and the lab path cannot drift.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) pass++; else { fail++; console.log("FAIL: " + msg); } };
const eq = (got, want, msg) => check(got === want, `${msg} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));

class MemoryStorage {
  constructor() { this.map = new Map(); this.failGet = false; this.failSet = false; }
  getItem(k) { if (this.failGet) throw new Error("storage unavailable"); return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { if (this.failSet) throw new Error("quota exceeded"); this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
}

const store = new MemoryStorage();
globalThis.localStorage = store;
const lp = await import("../src/data/lessonProgress.js");
const lab = await import("../src/data/labActivity.js");

// ---- the stored key and shape are unchanged (existing ticks survive) -----
eq(lp.progressKey("mathematics"), "csec-mathematics-progress", "progress key for a subject");
eq(lp.progressKey("agriculture-double-option"), "csec-agriculture-double-option-progress", "progress key keeps ids with dashes");
eq(lp.loadLessonProgress("mathematics").lessons.length, 0, "a subject with no ticks loads an empty list");
eq(lp.loadLessonProgress("mathematics").quizCompleted, false, "and a false quiz flag");
eq(lp.loadLessonProgress("").lessons.length, 0, "no subject loads an empty list");

// ---- tolerant reads ------------------------------------------------------
store.setItem(lp.progressKey("corrupt"), "{not json");
eq(lp.loadLessonProgress("corrupt").lessons.length, 0, "corrupt JSON reads as empty, not a crash");
store.setItem(lp.progressKey("weird"), JSON.stringify([1, 2, 3]));
eq(lp.loadLessonProgress("weird").lessons.length, 0, "a non-object payload reads as empty");
store.setItem(lp.progressKey("dupes"), JSON.stringify({ lessons: ["a", "a", null, "b", undefined, ""], quizCompleted: "yes" }));
eq(lp.loadLessonProgress("dupes").lessons.join(","), "a,b", "reads dedupe and drop empty ids");
eq(lp.loadLessonProgress("dupes").quizCompleted, true, "quizCompleted is coerced to a boolean");

// ---- the shared reducer --------------------------------------------------
eq(lp.setLessonComplete(lp.emptyProgress(), "l1", true).lessons.join(","), "l1", "marking a lesson adds it");
eq(lp.setLessonComplete({ lessons: ["l1"], quizCompleted: true }, "l1", true).lessons.join(","), "l1", "marking twice does not duplicate");
eq(lp.setLessonComplete({ lessons: ["l1", "l2"] }, "l1", false).lessons.join(","), "l2", "un-marking removes it (manual un-tick stays)");
eq(lp.setLessonComplete({ lessons: ["l2"] }, "l1", false).lessons.join(","), "l2", "un-marking an absent lesson changes nothing");
eq(lp.setLessonComplete({ lessons: ["l1"], quizCompleted: true }, "l2", true).quizCompleted, true, "the reducer preserves the quiz flag");
eq(lp.setLessonComplete({ lessons: ["l1"] }, null, true).lessons.join(","), "l1", "a null lesson id changes nothing");
eq(lp.setLessonComplete({ lessons: ["l1"] }, "", true).lessons.join(","), "l1", "an empty lesson id changes nothing");
check(lp.isLessonComplete({ lessons: ["l1"] }, "l1"), "isLessonComplete sees a marked lesson");
check(!lp.isLessonComplete({ lessons: ["l1"] }, "l2"), "isLessonComplete is false for an unmarked lesson");
check(lp.sameLessonIds(["a", "b"], ["a", "b"]), "sameLessonIds compares equal lists");
check(!lp.sameLessonIds(["a"], ["a", "b"]), "sameLessonIds sees a difference");

// ---- save / notify ------------------------------------------------------
const seenMath = [];
const seenBio = [];
const unsubMath = lp.subscribeLessonProgress("mathematics", (p) => seenMath.push(p));
lp.subscribeLessonProgress("biology", (p) => seenBio.push(p));
lp.saveLessonProgress("mathematics", { lessons: ["l1", "l2"], quizCompleted: true });
eq(seenMath.length, 1, "changing progress notifies subscribers of that subject");
eq(seenBio.length, 0, "and not subscribers of another subject");
eq(lp.loadLessonProgress("mathematics").lessons.join(","), "l1,l2", "the write is readable back");
eq(JSON.parse(store.getItem(lp.progressKey("mathematics"))).quizCompleted, true, "the write keeps the stored shape");
lp.saveLessonProgress("mathematics", { lessons: ["l1", "l2"], quizCompleted: true });
eq(seenMath.length, 1, "re-saving the same value does not notify (no write/notify spin)");
lp.saveLessonProgress("mathematics", { lessons: ["l1"], quizCompleted: true });
eq(seenMath.length, 2, "a real change notifies again");
unsubMath();
lp.saveLessonProgress("mathematics", { lessons: ["l1", "l9"], quizCompleted: true });
eq(seenMath.length, 2, "unsubscribing stops the notifications");
lp.saveLessonProgress("", { lessons: ["x"] });
lp.subscribeLessonProgress("physics", () => { throw new Error("broken listener"); });
eq(lp.markLessonComplete("physics", "p1").lessons.join(","), "p1", "a throwing listener cannot break the write");

// ---- THE FEATURE: a finished lab completes its lesson -------------------
lab.recordLabOpen("biology", "bio-l3", "interactive-quiz", null);
eq(lp.loadLessonProgress("biology").lessons.length, 0, "opening a lab does not complete the lesson");
const notified = [];
const unsubBio = lp.subscribeLessonProgress("biology", (p) => notified.push(p));
const entry = lab.recordLabComplete("biology", "bio-l3", "interactive-quiz", null);
check(Boolean(entry && entry.completed === true), "the lab still records its own completion (teacher view unchanged)");
eq(lp.loadLessonProgress("biology").lessons.join(","), "bio-l3", "finishing the lab completes that lesson in the student's own progress");
eq(notified.length, 1, "the subject page is notified, so its checkmark + progress bar update without a reload");
eq(notified[0].lessons.join(","), "bio-l3", "the notification carries the new ticks");
lab.recordLabComplete("biology", "bio-l3", "interactive-quiz", null);
eq(lp.loadLessonProgress("biology").lessons.join(","), "bio-l3", "finishing the same lab twice does not duplicate the tick");
eq(lab.loadLabActivity()["biology::bio-l3"].opens, 1, "the lab open count is untouched by completion");
lp.markLessonComplete("biology", "bio-l1");
lab.recordLabComplete("biology", "bio-l3", "interactive-quiz", null);
eq(lp.loadLessonProgress("biology").lessons.sort().join(","), "bio-l1,bio-l3", "lab ticks merge with manual ticks");
lp.unmarkLessonComplete("biology", "bio-l3");
eq(lp.loadLessonProgress("biology").lessons.join(","), "bio-l1", "the student can still un-tick a lesson a lab completed");
eq(lp.loadLessonProgress("biology").lessons.join(","), "bio-l1", "and it does not come back on its own");
eq(lab.recordLabComplete("biology", null, "interactive-quiz", null), null, "a lab completion with no lesson id is ignored");
eq(lp.loadLessonProgress("biology").lessons.join(","), "bio-l1", "and writes no progress");
unsubBio();

// signed out: completing a lab must not reach the network
let fetchCalls = 0;
const savedFetch = globalThis.fetch;
globalThis.fetch = () => { fetchCalls++; return Promise.resolve({ ok: true }); };
lab.recordLabComplete("chemistry", "chem-l1", "virtual-lab", null);
eq(fetchCalls, 0, "a signed-out lab completion makes no network call");
globalThis.fetch = savedFetch;

// ---- fail-open: storage that misbehaves ---------------------------------
store.failSet = true;
eq(lp.markLessonComplete("physics-lab", "p2").lessons.join(","), "p2", "a storage write failure still reports the lesson complete");
store.failSet = false;
store.failGet = true;
eq(lp.loadLessonProgress("physics").lessons.length, 0, "a storage read failure reads as empty instead of throwing");
runFailOpen();
store.failGet = false;
function runFailOpen() {
  try {
    lp.saveLessonProgress("physics", { lessons: ["p3"] });
    lp.unmarkLessonComplete("physics", "p3");
    lab.recordLabComplete("physics", "p4", "simulation", null);
    check(true, "no progress call throws when storage is unreadable");
  } catch (e) {
    check(false, "no progress call throws when storage is unreadable -- " + e.message);
  }
}
delete globalThis.localStorage;
eq(lp.loadLessonProgress("mathematics").lessons.length, 0, "no storage at all reads as empty");
check(lp.markLessonComplete("mathematics", "l1").lessons.join(",") === "l1", "and marking still returns the new value");
try {
  lab.recordLabComplete("mathematics", "l2", "graphing", null);
  check(true, "a lab completion with no storage available does not throw");
} catch (e) {
  check(false, "a lab completion with no storage available does not throw -- " + e.message);
}
globalThis.localStorage = store;

// ---- every real lesson id round-trips -----------------------------------
store.map.clear();
const catalog = readJson("content/subjects.json");
let subjectsChecked = 0, idProblems = 0;
for (const subject of catalog) {
  const file = `content/${subject.id}/modules.json`;
  if (!exists(file)) continue;
  const lessonId = JSON.parse(read(file))[0]?.lessons?.[0]?.id;
  if (!lessonId) continue;
  subjectsChecked++;
  const afterMark = lp.markLessonComplete(subject.id, lessonId);
  if (!afterMark.lessons.includes(String(lessonId))) idProblems++;
  if (!lp.loadLessonProgress(subject.id).lessons.includes(String(lessonId))) idProblems++;
  lp.unmarkLessonComplete(subject.id, lessonId);
  if (lp.loadLessonProgress(subject.id).lessons.includes(String(lessonId))) idProblems++;
}
check(subjectsChecked >= 20, `real lesson ids round-trip through the store (${subjectsChecked} subjects)`);
check(idProblems === 0, `real lesson ids round-trip through the store (${idProblems} problems)`);

// ---- THE FIX: the teacher's view is WRITTEN, not just read ---------------
// api/analytics/summary.js reads user_progress (lessonsCompleted/quizCompleted
// per subject) to build a student card; localStorage is only the student's own
// copy. Nothing ever wrote user_progress, so a linked teacher saw lab rows only.
const netCalls = [];
const preSyncFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => {
  netCalls.push({ url, opts, body: opts?.body ? JSON.parse(opts.body) : null });
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
};
store.map.clear();

lp.setSyncSession(null);
lp.markLessonComplete("mathematics", "m1");
eq(lp.flushProgressSync(), 0, "signed out: a tick is never pushed");
eq(netCalls.length, 0, "signed out: no network call at all");
lp.setSyncSession({}); // an auth object with no token is not signed in
lp.markLessonComplete("mathematics", "m2");
eq(lp.flushProgressSync(), 0, "a session without an access token is treated as signed out");

lp.setSyncSession({ access_token: "tok-1" });
lp.markLessonComplete("mathematics", "m3");
lp.markLessonComplete("mathematics", "m4");
lp.markLessonComplete("mathematics", "m5");
eq(netCalls.length, 0, "a burst of ticks has not reached the network yet (debounced)");
eq(lp.flushProgressSync(), 1, "flushing a burst sends exactly ONE request");
eq(netCalls.length, 1, "one request, not one per tick");
eq(netCalls[0].url, "/api/progress/sync", "the push goes to the progress sync endpoint");
eq(netCalls[0].opts.method, "POST", "as a POST");
eq(netCalls[0].opts.headers.Authorization, "Bearer tok-1", "with the signed-in token");
eq(netCalls[0].body.subjectId, "mathematics", "carrying the subject id");
eq(netCalls[0].body.completedLessons.join(","), "m1,m2,m3,m4,m5", "and the full current lesson list (no tick lost to coalescing, including the ones ticked before sign-in)");
eq(netCalls[0].body.quizCompleted, false, "and the quiz flag");

const payload = lp.progressSyncPayload("biology", { lessons: ["b1", "b2", "b1"], quizCompleted: true });
eq(Object.keys(payload).sort().join(","), "completedLessons,quizCompleted,subjectId", "the payload is exactly the contract api/progress/sync.js reads");
eq(payload.completedLessons.join(","), "b1,b2", "the payload drops duplicates");
eq(payload.quizCompleted, true, "the payload carries the knowledge-check flag");

// Two subjects are tracked (and pushed) separately.
lp.markLessonComplete("biology", "b1");
lp.markLessonComplete("physics", "p1");
eq(lp.flushProgressSync(), 2, "two subjects flush as two requests");
eq(netCalls.slice(1).map((c) => c.body.subjectId).sort().join(","), "biology,physics", "each request names its own subject");

// An un-tick is reported too, or the teacher keeps seeing removed work.
lp.unmarkLessonComplete("biology", "b1");
lp.flushProgressSync();
eq(netCalls.at(-1).body.completedLessons.length, 0, "un-ticking every lesson is pushed as an empty list (the teacher sees truth)");

// Re-saving the same value is not a tick, so it is not a request.
const beforeNoop = netCalls.length;
lp.saveLessonProgress("biology", { lessons: [], quizCompleted: false });
eq(netCalls.length, beforeNoop, "re-saving an unchanged value pushes nothing");
eq(lp.flushProgressSync(), 0, "and leaves nothing pending");

// The debounce fires on its own, without an explicit flush.
lp.markLessonComplete("chemistry", "c1");
await new Promise((r) => setTimeout(r, 1400));
eq(netCalls.filter((c) => c.body.subjectId === "chemistry").length, 1, "the debounce sends the push by itself");

// The sign-in backfill: a student who ticked while signed out is not invisible.
store.map.clear();
lp.setSyncSession(null);
lp.markLessonComplete("spanish", "s1");
lp.markLessonComplete("food-nutrition", "f1");
lp.saveLessonProgress("technical-drawing", { lessons: [], quizCompleted: false });
eq(lp.syncStoredProgress(), 0, "signed out: the backfill queues nothing");
lp.setSyncSession({ access_token: "tok-1" });
eq(lp.syncStoredProgress(), 2, "sign-in queues the subjects this device already has ticks for");
eq(lp.flushProgressSync(), 2, "and pushes them");
eq(netCalls.slice(-2).map((c) => c.body.subjectId).sort().join(","), "food-nutrition,spanish", "skipping subjects with nothing ticked");

// Fail-open: the push must never break the student's tick.
globalThis.fetch = () => Promise.reject(new Error("offline"));
try {
  eq(lp.markLessonComplete("mathematics", "m9").lessons.includes("m9"), true, "a tick stands even when the push cannot be sent");
  eq(lp.flushProgressSync(), 1, "the flush still counts the attempt");
  check(true, "a rejected push does not throw");
} catch (e) {
  check(false, "a rejected push does not throw -- " + e.message);
}
globalThis.fetch = () => { throw new Error("fetch blocked"); };
try {
  lp.markLessonComplete("mathematics", "m10");
  lp.flushProgressSync();
  check(true, "a fetch that throws synchronously does not break the tick");
} catch (e) {
  check(false, "a fetch that throws synchronously does not break the tick -- " + e.message);
}
globalThis.fetch = preSyncFetch;

// The lab path reaches the teacher too: one funnel, both writers.
const labSyncCalls = [];
globalThis.fetch = (url, opts) => { labSyncCalls.push({ url, body: JSON.parse(opts.body) }); return Promise.resolve({ ok: true }); };
lp.setSyncSession({ access_token: "tok-1" });
lab.recordLabComplete("biology", "bio-l9", "drag-drop-label", { access_token: "tok-1" });
lp.flushProgressSync();
check(labSyncCalls.some((c) => c.url === "/api/analytics/record" && c.body.kind === "lab"), "the lab still reports to the lab telemetry endpoint (unchanged)");
const labProgressCall = labSyncCalls.find((c) => c.url === "/api/progress/sync");
check(Boolean(labProgressCall), "finishing a lab ALSO updates the teacher's progress view");
eq(labProgressCall?.body.completedLessons.includes("bio-l9"), true, "the lab-completed lesson is in the pushed list");
lp.setSyncSession(null);
globalThis.fetch = preSyncFetch;

// ---- wiring guards: one store, two writers ------------------------------
const page = read("src/pages/SubjectPage.jsx");
const activity = read("src/data/labActivity.js");
check(!page.includes('localStorage.getItem("csec-'), "the subject page no longer reads progress storage directly");
check(!page.includes('localStorage.setItem("csec-'), "the subject page no longer writes progress storage directly");
check(page.includes("loadLessonProgress(subjectId)") && page.includes("saveLessonProgress(subjectId"), "the subject page reads and writes through the shared store");
check(page.includes("subscribeLessonProgress(subjectId"), "the subject page follows writes made by the lab path");
check(page.includes("setLessonComplete({ lessons: prev, quizCompleted }"), "the manual tick uses the shared reducer");
check(page.includes("Mark complete") && page.includes("toggleLesson"), "the manual tick is still offered");
check(page.includes("const completedCount = completedLessons.length;") && page.includes("<ProgressBar"), "the progress bar is driven by those same ticks");
check(/import \{ markLessonComplete \} from "\.\/lessonProgress(\.js)?";/.test(activity), "labActivity reuses the shared store");
check(/try \{\s*markLessonComplete\(subjectId, lessonId\);/.test(activity), "a finished lab ticks the lesson, fail-open");
check(/recordLabComplete[\s\S]{0,800}markLessonComplete\(subjectId, lessonId\)/.test(activity), "the tick happens on completion, not on open");
check(activity.includes("{ completed: true }"), "the teacher-view lab completion is unchanged");
check(read("src/data/lessonProgress.js").includes("subscribeLessonProgress"), "the shared module exposes the subscription the page uses");

console.log(`\ncheck-lesson-progress: ${pass}/${pass + fail} green${fail ? ` (${fail} FAILED)` : ""}`);
process.exit(fail ? 1 : 0);
