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

/**
 * Persist progress for one subject. An unchanged value is not written and does
 * not notify (this is what keeps "page writes -> subscriber sets state ->
 * page writes" from spinning). Returns what was stored.
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
