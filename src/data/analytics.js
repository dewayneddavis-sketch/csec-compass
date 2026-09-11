// Analytics data layer — weak-topic tracking for quiz results.
//
// Every quiz attempt (knowledge check, extra practice, mock exam) is
// recorded per-question with its `topic` (lesson id) and correctness.
// Storage strategy:
//   - Always written to localStorage (works logged-out, gives the results
//     panel instant data, survives server hiccups).
//   - When the user is signed in, the attempt is also POSTed to
//     /api/analytics/record (Supabase `quiz_results`). A non-2xx response is
//     tolerated — localStorage remains the fallback so the feature never
//     breaks a user's session.
// Reads merge local + server attempts (deduped by attemptId).

const LS_PREFIX = "csec-analytics-";

function lsKey(subjectId) {
  return LS_PREFIX + subjectId;
}

export function getLocalAttempts(subjectId) {
  try {
    const raw = localStorage.getItem(lsKey(subjectId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAttempts(subjectId, attempts) {
  try {
    // Keep the newest 60 attempts per subject so localStorage stays small.
    const sorted = [...attempts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    localStorage.setItem(lsKey(subjectId), JSON.stringify(sorted.slice(0, 60)));
  } catch {
    // Quota exceeded / private mode — analytics gracefully degrade.
  }
}

// Compute per-question results from a quiz's questions and the answers map
// (index -> selected answer string).
export function computeResults(questions, answers) {
  return (questions || []).map((q, i) => {
    const correctAnswer = q.answer !== undefined ? q.answer : q.correctAnswer;
    return {
      questionId: q.id || String(i),
      topic: q.topic || null,
      correct: answers[i] === correctAnswer,
    };
  });
}

export function makeAttemptId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "att-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

// Record one completed quiz attempt. Returns the attempt object.
export async function recordQuizResult({ subjectId, quizType, questions, answers, session }) {
  const results = computeResults(questions, answers);
  const total = results.length;
  const score = results.filter((r) => r.correct).length;
  const attempt = {
    attemptId: makeAttemptId(),
    quizType,
    createdAt: new Date().toISOString(),
    score,
    total,
    pct: total > 0 ? Math.round((score / total) * 100) : 0,
    passed: total > 0 && score / total >= 0.6,
    results,
  };

  // 1) Always persist locally (synchronous, works logged-out).
  const local = getLocalAttempts(subjectId);
  local.push(attempt);
  saveLocalAttempts(subjectId, local);

  // 2) Server-side when signed in (fire-and-forget; failures tolerated).
  if (session?.access_token) {
    try {
      await fetch("/api/analytics/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({
          subjectId,
          quizType,
          attemptId: attempt.attemptId,
          results: results.map((r) => ({
            questionId: r.questionId,
            topic: r.topic,
            correct: r.correct,
          })),
        }),
      });
    } catch {
      // Network/server unavailable — local record still stands.
    }
  }

  return attempt;
}

// Fetch the server-side summary for one subject (null on any failure).
export async function fetchServerSummary(subjectId, session) {
  if (!session?.access_token) return null;
  try {
    const res = await fetch("/api/analytics/summary?subjectId=" + encodeURIComponent(subjectId), {
      headers: { Authorization: "Bearer " + session.access_token },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Merge local + server attempts, deduped by attemptId, newest-first.
export function mergeAttempts(localAttempts, serverAttempts) {
  const map = new Map();
  for (const a of localAttempts || []) if (a?.attemptId) map.set(a.attemptId, a);
  for (const a of serverAttempts || []) if (a?.attemptId && !map.has(a.attemptId)) map.set(a.attemptId, a);
  return Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Aggregate per-topic stats from attempts, ranked weakest-first
// (lowest accuracy first, then most wrong attempts).
export function aggregateWeakTopics(attempts) {
  const agg = new Map();
  for (const attempt of attempts || []) {
    for (const r of attempt.results || []) {
      if (!r.topic) continue;
      let t = agg.get(r.topic);
      if (!t) { t = { topic: r.topic, correct: 0, wrong: 0 }; agg.set(r.topic, t); }
      if (r.correct) t.correct += 1; else t.wrong += 1;
    }
  }
  return Array.from(agg.values())
    .map((t) => ({
      topic: t.topic,
      correct: t.correct,
      wrong: t.wrong,
      total: t.correct + t.wrong,
      accuracy: t.correct + t.wrong > 0 ? Math.round((t.correct / (t.correct + t.wrong)) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong);
}

// Pass-rate trend: per attempt in chronological order.
export function passRateTrend(attempts) {
  return [...(attempts || [])]
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((a) => ({ attemptId: a.attemptId, quizType: a.quizType, createdAt: a.createdAt, pct: a.pct, passed: a.passed }));
}