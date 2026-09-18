// Interactive-lab activity tracking (teacher dashboard).
//
// Students' lab use is recorded per (subject, lesson):
//   - `opens`     — how many times that lesson's lab was opened
//   - `completed` — set once a lab that HAS a right answer reports a finish
//                   (e.g. a DragDropLabel set fully matched). Exploratory labs
//                   (graphing, flashcards, balance pans) never claim completion,
//                   so a teacher sees "opened 3 times" instead of a false "done".
//
// localStorage always (works signed out); when signed in the same event is
// POSTed to api/analytics/record.js with kind:"lab". That write FAILS OPEN
// server-side: lab tracking is telemetry, so a missing table or a failed write
// must never interrupt a student's lab session.

const LS_PREFIX = "csec-lab-activity-";

export function loadLabActivity() {
  try {
    const raw = localStorage.getItem(LS_PREFIX + "all");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLabActivity(all) {
  try {
    localStorage.setItem(LS_PREFIX + "all", JSON.stringify(all));
  } catch {
    // Private mode / quota — tracking is best-effort.
  }
}

function keyOf(subjectId, lessonId) {
  return `${subjectId}::${lessonId}`;
}

// Records one lab open for (subject, lesson). Returns the updated entry.
export function recordLabOpen(subjectId, lessonId, experimentType, session) {
  if (!subjectId || !lessonId) return null;
  const all = loadLabActivity();
  const key = keyOf(subjectId, lessonId);
  const prev = all[key] || { opens: 0, completed: false, experimentType: null };
  const now = new Date().toISOString();
  const entry = {
    opens: prev.opens + 1,
    completed: !!prev.completed,
    experimentType: experimentType || prev.experimentType || null,
    lastActivityAt: now,
  };
  all[key] = entry;
  saveLabActivity(all);
  syncLab(subjectId, lessonId, entry, { completed: false }, session);
  return entry;
}

// Records that the student finished the lab's activity (labs with a right
// answer only — called from the lab component when it is solved).
export function recordLabComplete(subjectId, lessonId, experimentType, session) {
  if (!subjectId || !lessonId) return null;
  const all = loadLabActivity();
  const key = keyOf(subjectId, lessonId);
  const prev = all[key] || { opens: 0, completed: false, experimentType: null };
  const entry = {
    opens: prev.opens,
    completed: true,
    experimentType: experimentType || prev.experimentType || null,
    lastActivityAt: new Date().toISOString(),
  };
  all[key] = entry;
  saveLabActivity(all);
  syncLab(subjectId, lessonId, entry, { completed: true }, session);
  return entry;
}

function syncLab(subjectId, lessonId, entry, extra, session) {
  if (!session?.access_token) return;
  const payload = {
    kind: "lab",
    subjectId,
    lessonId,
    experimentType: entry.experimentType,
    ...extra,
  };
  // Fire-and-notify: the student's lab never waits on (or breaks because of) this.
  fetch("/api/analytics/record", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
