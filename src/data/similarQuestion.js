// "Practice a similar question" — picking the follow-up question.
//
// After a wrong answer the student can immediately practise that topic again.
// The picker takes the bank the screen already loaded (practice.json for Extra
// Practice and the Mock Exam, knowledge-check.json for the Knowledge Check) and
// returns a DIFFERENT question from it, preferring the one just missed's topic:
//
//   1. another question with the same `topic`   — a fresh variant of the topic
//   2. failing that, any other question          — still useful practice
//   3. nothing else, or a one-question bank      — null, and the button hides
//
// Pure and side-effect free on purpose: it never records an attempt, and
// tools/check-math-review-loop.mjs drives it directly.

// Questions carry a stable `id` in every bank (p1…p100, q1…q25). Fall back to
// the question object itself so a bank without ids still de-duplicates.
export function questionKey(question) {
  if (!question) return null;
  return question.id !== undefined && question.id !== null ? `id:${question.id}` : question;
}

function sameTopic(a, b) {
  return !!a && !!b && a.topic !== undefined && a.topic !== null && a.topic === b.topic;
}

/**
 * @param {Array} bank      the question bank the screen loaded
 * @param {Object} missed   the question the student just got wrong
 * @param {Object} [opts]
 * @param {Array}  [opts.excludeKeys]  keys already practised in this loop
 * @param {Function} [opts.random]     random source (injectable for tests)
 * @returns {Object|null} a different question, or null when none is available
 */
export function pickSimilarQuestion(bank, missed, opts = {}) {
  const { excludeKeys = [], random = Math.random } = opts || {};
  if (!Array.isArray(bank) || !missed) return null;

  const missedKey = questionKey(missed);
  const excluded = new Set([missedKey, ...excludeKeys.map(questionKey)]);
  const allOthers = bank.filter((q) => !excluded.has(questionKey(q)));
  // "Practice another" must never dead-end: if everything else has been seen,
  // fall back to the bank minus only the question just missed.
  const candidates = allOthers.length > 0
    ? allOthers
    : bank.filter((q) => questionKey(q) !== missedKey);

  if (candidates.length === 0) return null;

  const sameTopicHits = candidates.filter((q) => sameTopic(q, missed));
  const pool = sameTopicHits.length > 0 ? sameTopicHits : candidates;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index] || null;
}

// Whether the review list should offer the button at all: the bank must hold at
// least one question other than the one just missed.
export function canPractice(bank, missed) {
  if (!Array.isArray(bank) || !missed) return false;
  const missedKey = questionKey(missed);
  return bank.some((q) => questionKey(q) !== missedKey);
}
