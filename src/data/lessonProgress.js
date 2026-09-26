// Which lessons a student has completed — the ONE source of truth.
//
// Two paths write this: the manual tick on the subject page, and a lab that
// reports a finish (see labActivity.recordLabComplete). Both go through the
// reducers here so the two paths cannot drift, and the subject page re-reads
// through subscribeLessonProgress() so a lab solved on a lesson page updates
// the checkmarks and progress bar without a reload.
//
// Storage: localStorage["csec-<subjectId>-progress"] = { lessons: [], quizCompleted: false }
// — the shape existing students already have, so their ticks survive.
// Everything is best-effort: private mode, a quota error or corrupt JSON must
// never break a page or interrupt a lab session.
//
// The teacher's view is written from here too. The dashboard reads
// user_progress (api/analytics/summary.js), and localStorage is only the
// student's own copy — so a tick that never leaves the device is invisible to
// their teacher. Because every path funnels through saveLessonProgress, that is
// the one place the push happens (see queueProgressSync below), never the pages.

const PREFIX = "csec-";
const SUFFIX = "-progress";

const listeners = new Set();

export function progressKey(subjectId) {
  return `${PREFIX}${subjectId}${SUFFIX}`;
}

export function emptyProgress() {
  return { lessons: [], quizCompleted: false };
}

/** Coerce anything into the stored shape: unique lesson ids + a boolean. */
export function normalizeProgress(raw) {
  const seen = new Set();
  const lessons = [];
  for (const id of Array.isArray(raw?.lessons) ? raw.lessons : []) {
    if (id === null || id === undefined) continue;
    const key = String(id);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    lessons.push(key);
  }
  return { lessons, quizCompleted: !!raw?.quizCompleted };
}

function storage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** Read a student's progress for one subject. Never throws, never returns null. */
export function loadLessonProgress(subjectId) {
  const store = storage();
  if (!store || !subjectId) return emptyProgress();
  try {
    const raw = store.getItem(progressKey(subjectId));
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function sameProgress(a, b) {
  const x = normalizeProgress(a);
  const y = normalizeProgress(b);
  return (
    x.quizCompleted === y.quizCompleted &&
    x.lessons.length === y.lessons.length &&
    x.lessons.every((id, i) => id === y.lessons[i])
  );
}

export function sameLessonIds(a, b) {
  return sameProgress({ lessons: a }, { lessons: b });
}

export function isLessonComplete(progress, lessonId) {
  return normalizeProgress(progress).lessons.includes(String(lessonId));
}

/** Pure: mark (or un-mark) one lesson. Returns a NEW progress object. */
export function setLessonComplete(progress, lessonId, done) {
  const current = normalizeProgress(progress);
  if (lessonId === null || lessonId === undefined || String(lessonId) === "") return current;
  const id = String(lessonId);
  const has = current.lessons.includes(id);
  if (done && has) return current;
  if (!done && !has) return current;
  return {
    ...current,
    lessons: done ? [...current.lessons, id] : current.lessons.filter((x) => x !== id),
  };
}

function notify(subjectId, progress) {
  for (const entry of [...listeners]) {
    if (entry.subjectId !== subjectId) continue;
    try {
      entry.listener(progress, subjectId);
    } catch {
      // A broken listener must never break the write that triggered it.
    }
  }
}

// ---------------------------------------------------------------------------
// Pushing progress to the teacher's view (POST /api/progress/sync → user_progress)
// ---------------------------------------------------------------------------
//
// Rules this has to keep, all learned from the bug it fixes:
//   - Signed out (or no token yet) means localStorage only. Never a network call.
//   - ONE request per burst of ticks per subject: a student ticking ten lessons
//     sends the final list once, not ten times (debounced; the payload is always
//     the current full state, so a coalesced request cannot lose a tick).
//   - FAIL OPEN. A tick is the student's own record of work; a failed push, a
//     missing fetch or a dead network must never throw, retry-spin or block it.
//   - An un-tick is reported too, otherwise the teacher keeps seeing work the
//     student removed.

const SYNC_ENDPOINT = "/api/progress/sync";
const SYNC_DEBOUNCE_MS = 1200;
let syncSession = null;
const pendingSyncs = new Map(); // subjectId -> latest progress, not yet sent
const syncTimers = new Map(); // subjectId -> debounce timer

/**
 * Point the store at the signed-in session (called by AuthContext on every auth
 * change, so signing out stops the pushes immediately). Anything without an
 * access token counts as signed out.
 */
export function setSyncSession(session) {
  syncSession = session && session.access_token ? session : null;
}

/** The exact body the progress sync handler expects (api/_lib/sync-progress.js,
 * served at /api/progress/sync through api/sync.js). Exported so it can be asserted. */
export function progressSyncPayload(subjectId, progress) {
  const value = normalizeProgress(progress);
  return {
    subjectId,
    completedLessons: [...value.lessons],
    quizCompleted: !!value.quizCompleted,
  };
}

function sendProgressSync(subjectId, progress) {
  let res;
  try {
    res = fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + syncSession.access_token,
      },
      body: JSON.stringify(progressSyncPayload(subjectId, progress)),
    });
  } catch {
    return; // fetch missing/blocked — the tick still stands
  }
  // Never awaited by the caller, and a rejection is swallowed: a failed push is
  // a missing teacher update, never a broken lesson page.
  Promise.resolve(res).catch(() => {});
}

function queueProgressSync(subjectId, progress) {
  if (!subjectId || !syncSession) return;
  pendingSyncs.set(subjectId, normalizeProgress(progress));
  if (syncTimers.has(subjectId)) return; // already scheduled: the newest value wins
  const timer = setTimeout(() => {
    syncTimers.delete(subjectId);
    flushProgressSync(subjectId);
  }, SYNC_DEBOUNCE_MS);
  // Node has no unref-less timers to worry about; browsers don't care either.
  if (typeof timer?.unref === "function") timer.unref();
  syncTimers.set(subjectId, timer);
}

/**
 * Send pending pushes now, without waiting out the debounce. With no argument it
 * flushes every subject; returns how many requests it sent.
 */
export function flushProgressSync(subjectId) {
  const subjects = subjectId ? [subjectId] : [...pendingSyncs.keys()];
  let sent = 0;
  for (const subject of subjects) {
    const timer = syncTimers.get(subject);
    if (timer) {
      clearTimeout(timer);
      syncTimers.delete(subject);
    }
    if (!pendingSyncs.has(subject)) continue;
    const progress = pendingSyncs.get(subject);
    pendingSyncs.delete(subject);
    if (!syncSession) continue; // signed out mid-flight
    sendProgressSync(subject, progress);
    sent++;
  }
  return sent;
}

/**
 * Push everything this device already has for the signed-in student. Called once
 * per sign-in: a student who ticked lessons before signing in (or before this
 * existed) would otherwise stay invisible to their teacher until they tick
 * something new. Returns how many subjects it queued.
 */
export function syncStoredProgress() {
  if (!syncSession) return 0;
  const store = storage();
  if (!store || typeof store.key !== "function") return 0;
  let queued = 0;
  try {
    const count = Number(store.length) || 0;
    for (let i = 0; i < count; i++) {
      const key = store.key(i);
      if (typeof key !== "string" || !key.startsWith(PREFIX) || !key.endsWith(SUFFIX)) continue;
      const subjectId = key.slice(PREFIX.length, key.length - SUFFIX.length);
      const progress = loadLessonProgress(subjectId);
      // Nothing ticked for this subject — nothing to tell a teacher.
      if (!progress.lessons.length && !progress.quizCompleted) continue;
      queueProgressSync(subjectId, progress);
      queued++;
    }
  } catch {
    // A storage that cannot enumerate its keys is not worth breaking a sign-in over.
  }
  return queued;
}

/**
 * Persist progress for one subject. An unchanged value is not written and does
 * not notify (this is what keeps "page writes -> subscriber sets state ->
 * page writes" from spinning), and is not pushed to the teacher's view either.
 * Returns what was stored.
 */
export function saveLessonProgress(subjectId, progress) {
  const next = normalizeProgress(progress);
  if (!subjectId) return next;
  const store = storage();
  const current = loadLessonProgress(subjectId);
  if (sameProgress(current, next)) return current;
  if (store) {
    try {
      store.setItem(progressKey(subjectId), JSON.stringify(next));
    } catch {
      // Quota / private mode — keep the in-memory value for this session.
    }
  }
  notify(subjectId, next);
  // The student's own copy is saved; now let their teacher see it e.g. by
  // debounced async push. Never awaited, never gating the tick.
  queueProgressSync(subjectId, next);
  return next;
}

/** Load, mark one lesson complete, save. Used by the lab-completion path. */
export function markLessonComplete(subjectId, lessonId) {
  if (!subjectId || lessonId === null || lessonId === undefined) return loadLessonProgress(subjectId);
  return saveLessonProgress(subjectId, setLessonComplete(loadLessonProgress(subjectId), lessonId, true));
}

/** Manual un-tick stays possible (the student is the owner of their own ticks). */
export function unmarkLessonComplete(subjectId, lessonId) {
  if (!subjectId || lessonId === null || lessonId === undefined) return loadLessonProgress(subjectId);
  return saveLessonProgress(subjectId, setLessonComplete(loadLessonProgress(subjectId), lessonId, false));
}

/**
 * Follow one subject's progress (another tab, or a lab finishing on the lesson
 * page). Returns an unsubscribe function.
 */
export function subscribeLessonProgress(subjectId, listener) {
  if (!subjectId || typeof listener !== "function") return () => {};
  const entry = { subjectId, listener };
  listeners.add(entry);
  return () => listeners.delete(entry);
}
