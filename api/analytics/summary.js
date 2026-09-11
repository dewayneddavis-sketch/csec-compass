// GET /api/analytics/summary?subjectId=<subjectId>
// Returns the caller's quiz-result history for one subject, grouped by
// attempt, so the client can aggregate weak topics (per-question `topic`
// lesson ids), compute per-attempt scores/pass rates, and trend pass rate
// over time.
// NOTE: self-contained (inlines Supabase client init) — api/_lib/* imports
// crash on Vercel with FUNCTION_INVOCATION_FAILED (see api/auth/user.js).
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("API /api/analytics/summary misconfigured — missing supabase server credentials");
    return res.status(500).json({ error: "Server misconfigured: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify token and resolve the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid token" });

    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: "subjectId query param required" });

    const { data: rows, error: dbError } = await supabase
      .from("quiz_results")
      .select("attempt_id, quiz_type, question_id, topic, correct, created_at")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: true });

    if (dbError) {
      console.error("API /api/analytics/summary: quiz_results lookup failed:", dbError.message);
      return res.status(500).json({
        error: "Analytics lookup failed (failing closed). Ensure the `quiz_results` table exists — see supabase/schema.sql.",
      });
    }

    // Group rows by attempt (created_at of the attempt = first row's time)
    const attempts = [];
    const byAttempt = new Map();
    for (const row of rows || []) {
      let entry = byAttempt.get(row.attempt_id);
      if (!entry) {
        entry = { attemptId: row.attempt_id, quizType: row.quiz_type, createdAt: row.created_at, results: [] };
        byAttempt.set(row.attempt_id, entry);
        attempts.push(entry);
      }
      entry.results.push({
        questionId: row.question_id,
        topic: row.topic,
        correct: row.correct,
      });
    }

    // Basic attempt metadata (score/total/pass) — client computes trend UI
    const enriched = attempts.map((a) => {
      const total = a.results.length;
      const score = a.results.filter((r) => r.correct).length;
      return {
        attemptId: a.attemptId,
        quizType: a.quizType,
        createdAt: a.createdAt,
        score,
        total,
        pct: total > 0 ? Math.round((score / total) * 100) : 0,
        passed: total > 0 && (score / total) >= 0.6,
        results: a.results,
      };
    });

    // Weak-topic aggregation across ALL attempts for this subject:
    // per-question rows carry the lesson id in `topic`; count correct/wrong
    // per topic. Client maps topic -> lesson title for the revision path.
    const topicAgg = new Map();
    for (const row of rows || []) {
      if (!row.topic) continue;
      let t = topicAgg.get(row.topic);
      if (!t) { t = { topic: row.topic, correct: 0, wrong: 0 }; topicAgg.set(row.topic, t); }
      if (row.correct) t.correct += 1; else t.wrong += 1;
    }
    const topics = Array.from(topicAgg.values())
      .map((t) => ({
        topic: t.topic,
        correct: t.correct,
        wrong: t.wrong,
        total: t.correct + t.wrong,
        accuracy: t.correct + t.wrong > 0 ? Math.round((t.correct / (t.correct + t.wrong)) * 100) : 0,
      }))
      // Weakest first: lowest accuracy, then most wrong attempts
      .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong);

    return res.status(200).json({ attempts: enriched, topics });
  } catch (err) {
    console.error("API /api/analytics/summary error:", err);
    return res.status(500).json({ error: "Analytics lookup failed — failing closed." });
  }
}