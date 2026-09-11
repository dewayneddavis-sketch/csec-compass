// POST /api/analytics/record
// Records per-question quiz results for the caller (weak-topic analytics).
// One row per question answered, grouped by attempt_id so per-attempt
// scores and pass-rate trends can be reconstructed later.
// NOTE: self-contained (inlines Supabase client init) — api/_lib/* imports
// crash on Vercel with FUNCTION_INVOCATION_FAILED, so every function keeps
// its own client init (see api/auth/user.js, same pattern, works live).
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("API /api/analytics/record misconfigured — missing supabase server credentials");
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

    const { subjectId, quizType, attemptId, results } = req.body || {};
    if (!subjectId || !quizType || !attemptId || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "subjectId, quizType, attemptId and results[] are required" });
    }
    const validQuizTypes = ["knowledge-check", "practice", "mock"];
    if (!validQuizTypes.includes(quizType)) {
      return res.status(400).json({ error: "quizType must be one of: " + validQuizTypes.join(", ") });
    }

    const rows = results.map((r) => ({
      user_id: user.id,
      subject_id: subjectId,
      quiz_type: quizType,
      attempt_id: attemptId,
      question_id: r.questionId || r.question_id || null,
      topic: r.topic || null,
      correct: !!r.correct,
    }));

    const { data, error } = await supabase.from("quiz_results").insert(rows).select("id");
    if (error) {
      // 500 is intentional (fails closed): the client falls back to
      // localStorage analytics on non-2xx rather than misreading success.
      console.error("API /api/analytics/record insert failed:", error.message);
      return res.status(500).json({ error: "Failed to record results: " + error.message });
    }

    return res.status(200).json({ success: true, inserted: data ? data.length : rows.length });
  } catch (err) {
    console.error("API /api/analytics/record error:", err);
    return res.status(500).json({ error: "Failed to record results." });
  }
}