import { MAX_QUESTIONS } from "./mockExamRules.js";

// How a Timed Mock Exam paper is drawn from a subject's practice bank.
//
// WHY THIS MODULE EXISTS (task 0be0e0f2, 2026-09-24)
//
// The mock used to take the FIRST 40 questions of content/<subject>/practice.json
// (`qs.slice(0, MAX_QUESTIONS)`). Content is authored and appended, so "the first
// 40" meant "the oldest 40": when the content team shipped the Consumer
// Arithmetic and Sets gap lessons (PR #87) their 12 practice questions landed at
// the END of the bank (ids p101–p112), and the head-slice meant none of them
// could EVER appear in the Timed Mock Exam — the new lessons were mock-invisible
// even though the bank carried them. Any later authoring would have the same
// fate, silently.
//
// So the paper is now SAMPLED from the whole bank, and the sample guarantees one
// question from every topic the bank covers (all 23 subjects currently have
// between 8 and 39 topics, so a 40-question paper can always hold one of each —
// the harness asserts that precondition and fails loudly if it ever stops being
// true). The rest of the paper is filled from a deterministic shuffle, so a
// retake is a different paper over the same syllabus.
//
// DETERMINISTIC means: the same (bank, seed) always yields the same paper, so the
// whole thing is provable in tools/check-mock-paper.mjs without a browser. The
// component passes a random seed per attempt; nothing here calls Math.random
// itself, so the harness can pin a seed and assert exactly what a student sees.

/** Small, fast, well-distributed 32-bit PRNG (mulberry32). */
export function mulberry32(seed) {
  let a = (Number(seed) || 0) >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates over a copy, driven by the seeded PRNG (never mutates its input). */
export function seededShuffle(items, seed) {
  const out = [...items];
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** The syllabus unit a question belongs to — topic if tagged, else the id. */
export function questionGroup(question) {
  const topic = question && question.topic;
  if (typeof topic === "string" && topic.trim()) return topic.trim();
  const lesson = question && question.lesson;
  if (typeof lesson === "string" && lesson.trim()) return lesson.trim();
  return `id:${question && question.id}`;
}

/**
 * Build one mock paper.
 *
 * @param {Array} bank          the subject's whole practice bank (file order)
 * @param {object} [options]
 * @param {number} [options.max]  paper size (default MAX_QUESTIONS = 40)
 * @param {number} [options.seed] any integer; the same seed ⇒ the same paper
 * @returns {Array} the questions for this paper, in paper order
 */
export function buildMockPaper(bank, { max = MAX_QUESTIONS, seed = 1 } = {}) {
  const size = Math.max(0, Math.floor(Number(max) || 0));
  // Drop anything that is not a question and de-duplicate on id, so a malformed
  // entry can never inflate the paper or repeat inside it.
  const byId = new Map();
  for (const question of Array.isArray(bank) ? bank : []) {
    if (!question || question.id === undefined || question.id === null) continue;
    const key = String(question.id);
    if (!byId.has(key)) byId.set(key, question);
  }
  const pool = [...byId.values()];
  // A bank smaller than a paper is used whole — same as before, no sampling.
  if (pool.length <= size) return pool;

  const shuffled = seededShuffle(pool, seed);
  const picked = new Set();
  const covered = new Set();

  // Coverage pass: the first question of each group, in shuffled order. With
  // groups ≤ size this guarantees every topic in the bank reaches the paper.
  for (const question of shuffled) {
    if (picked.size >= size) break;
    const group = questionGroup(question);
    if (covered.has(group)) continue;
    covered.add(group);
    picked.add(String(question.id));
  }

  // Fill pass: the remainder in shuffled order — a plain random sample.
  for (const question of shuffled) {
    if (picked.size >= size) break;
    picked.add(String(question.id));
  }

  // Returned in shuffled order, so coverage picks are not clustered at the front.
  return shuffled.filter((question) => picked.has(String(question.id)));
}

/** How many distinct syllabus units the bank covers. */
export function countGroups(bank) {
  const groups = new Set();
  for (const question of Array.isArray(bank) ? bank : []) {
    if (question && question.id !== undefined) groups.add(questionGroup(question));
  }
  return groups.size;
}

/**
 * A fresh seed for one real attempt. Kept here (not in the component) so the
 * "randomness" lives next to the sampler it feeds, and so the harness can prove
 * the sampler itself is deterministic while attempts still vary.
 */
export function newMockSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}
