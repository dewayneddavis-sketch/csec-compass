// Revision Planner data layer.
// Persistence: localStorage always (works logged-out); when signed in the
// plan is also synced to Supabase `revision_plans` via /api/planner/sync
// (fail-closed — localStorage stands if the request fails).
//
// Plan shape:
// {
//   subjects: { [subjectId]: { examDate: "YYYY-MM-DD", title: "..." } },
//   weeks: [
//     {
//       week: 1, start: "YYYY-MM-DD", end: "YYYY-MM-DD",
//       items: [
//         { id, subjectId, lessonId, title, weak: bool, done: bool, doneAt }
//       ]
//     }, ...
//   ],
//   completionDates: ["YYYY-MM-DD", ...],   // for streak tracking
//   generatedAt: "ISO"
// }

const LS_KEY = "csec-revision-planner";

export function getLocalPlanner() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalPlanner(plan) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(plan));
  } catch {
    // Quota / private mode — planner gracefully degrades to in-memory.
  }
}

export async function loadPlanner(session) {
  // Local copy is the source of truth for instant render; server freshens it.
  const local = getLocalPlanner();
  if (session?.access_token) {
    try {
      const res = await fetch("/api/planner/load", {
        headers: { Authorization: "Bearer " + session.access_token },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.plan) return data.plan;
      }
    } catch {
      // Server unavailable — local copy stands.
    }
  }
  return local;
}

export async function savePlanner(plan, session) {
  if (plan === null) {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
    if (session?.access_token) {
      try {
        await fetch("/api/planner/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + session.access_token,
          },
          body: JSON.stringify({ plan: null }),
        });
      } catch {
        // Local cleared; server row may linger until next save — acceptable.
      }
    }
    return;
  }
  saveLocalPlanner(plan);
  if (session?.access_token) {
    try {
      await fetch("/api/planner/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({ plan }),
      });
    } catch {
      // Local copy already saved; server sync can retry next time.
    }
  }
}

// Build the plan for the given subjects (id -> { title, examDate }).
// Lessons come pre-loaded via the provided modules map:
//   modulesBySubject = { subjectId: [{ id, title, moduleTitle }, ...] }
// Weak topics (lesson ids, from analytics) are scheduled FIRST so the plan
// prioritises what the student is worst at; remaining lessons follow.
export function generatePlan(subjectEntries, modulesBySubject, weakTopicsBySubject) {
  const today = startOfDay(new Date());
  const subjects = {};
  const queues = {};
  let firstExam = null;

  for (const [subjectId, meta] of Object.entries(subjectEntries || {})) {
    subjects[subjectId] = { examDate: meta.examDate, title: meta.title };
    const lessons = modulesBySubject[subjectId] || [];
    const weakSet = new Set(weakTopicsBySubject?.[subjectId] || []);
    const weak = lessons.filter((l) => weakSet.has(l.id));
    const rest = lessons.filter((l) => !weakSet.has(l.id));
    queues[subjectId] = [...weak, ...rest];

    const exam = new Date(meta.examDate + "T00:00:00");
    if (!isNaN(exam) && (!firstExam || exam < firstExam)) firstExam = exam;
  }

  // Weeks from today until the first exam (minimum 1 week, cap at 26).
  let weekCount = 1;
  if (firstExam) {
    const days = Math.ceil((firstExam - today) / 86400000);
    weekCount = Math.max(1, Math.min(26, Math.ceil(days / 7)));
  }

  const weeks = [];
  const queuePos = {}; // current position into each subject's queue
  for (const s of Object.keys(queues)) queuePos[s] = 0;
  const totalItems = Object.values(queues).reduce((a, q) => a + q.length, 0);
  // Round-robin across subjects so each week is balanced.
  const order = [];
  for (let i = 0; i < totalItems; i++) {
    const available = Object.keys(queues).filter((s) => queuePos[s] < queues[s].length);
    if (available.length === 0) break;
    const s = available[i % available.length];
    order.push(s);
    queuePos[s] += 1;
  }

  let pos = 0;
  let itemId = 1;
  for (let w = 0; w < weekCount; w++) {
    const start = addDays(today, w * 7);
    const end = addDays(start, 6);
    const daysNeeded = firstExam ? Math.ceil((firstExam - start) / 86400000) : 7;
    const items = [];
    const perWeek = Math.max(1, Math.ceil((totalItems - pos) / (weekCount - w)));
    let taken = 0;
    while (pos < order.length && taken < perWeek) {
      const s = order[pos];
      const q = queues[s];
      const qIdx = order.slice(0, pos).filter((x) => x === s).length; // which item of s
      const lesson = q[qIdx];
      if (!lesson) { pos += 1; continue; }
      items.push({
        id: "item-" + (itemId++),
        subjectId: s,
        lessonId: lesson.id,
        title: lesson.title,
        weak: (weakTopicsBySubject?.[s] || []).includes(lesson.id),
        done: false,
        doneAt: null,
      });
      pos += 1;
      taken += 1;
    }
    weeks.push({
      week: w + 1,
      start: toISODate(start),
      end: toISODate(end),
      label: `Week ${w + 1}`,
      daysLeft: daysNeeded > 0 ? daysNeeded : 0,
      items,
    });
  }

  const plan = {
    subjects,
    weeks,
    completionDates: [],
    generatedAt: new Date().toISOString(),
  };
  return plan;
}

export function countdownToFirstExam(plan) {
  if (!plan || !plan.subjects) return null;
  let firstExam = null;
  for (const meta of Object.values(plan.subjects)) {
    if (!meta?.examDate) continue;
    const d = new Date(meta.examDate + "T00:00:00");
    if (!isNaN(d) && (!firstExam || d < firstExam)) firstExam = d;
  }
  if (!firstExam) return null;
  const days = Math.ceil((firstExam - startOfDay(new Date())) / 86400000);
  return { examDate: firstExam, days: Math.max(0, days) };
}

export function toggleItem(plan, weekIndex, itemId, done) {
  const next = structuredCloneSafe(plan);
  const week = next.weeks?.[weekIndex];
  if (!week) return next;
  const item = week.items.find((i) => i.id === itemId);
  if (!item) return next;
  item.done = done;
  item.doneAt = done ? new Date().toISOString() : null;

  // Streak tracking: track which days had at least one completion.
  const today = toISODate(new Date());
  next.completionDates = next.completionDates || [];
  if (done && !next.completionDates.includes(today)) {
    next.completionDates.push(today);
  }
  if (!done) {
    // Only remove the day if no other completed item falls on it.
    const stillDoneOther = week.items.some((i) => i.id !== itemId && i.done && i.doneAt && toISODate(new Date(i.doneAt)) === today);
    if (!stillDoneOther && next.completionDates.includes(today)) {
      next.completionDates = next.completionDates.filter((d) => d !== today);
    }
  }
  return next;
}

export function computeStreak(completionDates) {
  if (!completionDates || completionDates.length === 0) return 0;
  const days = new Set(completionDates.map((d) => String(d)));
  let streak = 0;
  // Count backwards from today; if today isn't done yet, start from yesterday
  // (the streak is still alive until the day ends).
  let cursor = startOfDay(new Date());
  if (!days.has(toISODate(cursor))) cursor = addDays(cursor, -1);
  while (days.has(toISODate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function weekProgress(week) {
  if (!week?.items?.length) return 0;
  return Math.round((week.items.filter((i) => i.done).length / week.items.length) * 100);
}

// ---- helpers ---------------------------------------------------------------
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function structuredCloneSafe(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}