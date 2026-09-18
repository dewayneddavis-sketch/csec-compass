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

    const { subjectId, quizType, attemptId, results, working, kind } = req.body || {};

    // ------------------------------------------------------------------ LABS
    // Interactive-lab activity for the teacher dashboard.
    // Payload: { kind: "lab", subjectId, lessonId, experimentType?, completed? }
    // One row per (student, subject, lesson): `opens` counts how many times the
    // student opened that lesson's lab, `completed` is set once the lab itself
    // reports a finish and never un-set by a later open.
    //
    // This is telemetry, not access control, so it FAILS OPEN: if the table has
    // not been applied yet (owner runs supabase/schema.sql) or the write fails,
    // the student's lab still works and the handler answers 200 with
    // `stored: false` so the client can retry later. Contrast with quiz records
    // below, which fail closed (a 500) because a lost attempt would corrupt the
    // student's own analytics.
    if (kind === "lab") {
      const labSubject = req.body?.subjectId;
      const lessonId = req.body?.lessonId;
      if (!labSubject || !lessonId) {
        return res.status(400).json({ error: "subjectId and lessonId are required for kind=lab" });
      }
      const experimentType = req.body?.experimentType || null;
      const completed = !!req.body?.completed;

      try {
        const { data: existing, error: readError } = await supabase
          .from("lab_activity")
          .select("opens, completed")
          .eq("user_id", user.id)
          .eq("subject_id", labSubject)
          .eq("lesson_id", lessonId)
          .maybeSingle();
        if (readError) throw readError;

        const row = {
          user_id: user.id,
          subject_id: labSubject,
          lesson_id: lessonId,
          experiment_type: experimentType,
          opens: (existing?.opens || 0) + 1,
          completed: completed || !!existing?.completed,
          last_activity_at: new Date().toISOString(),
        };
        const { error: writeError } = await supabase
          .from("lab_activity")
          .upsert(row, { onConflict: "user_id,subject_id,lesson_id" });
        if (writeError) throw writeError;

        return res.status(200).json({ success: true, stored: true, opens: row.opens, completed: row.completed });
      } catch (labErr) {
        console.warn("API /api/analytics/record: lab_activity write skipped:", labErr?.message || labErr);
        return res.status(200).json({
          success: true,
          stored: false,
          reason: "lab_activity not available (apply supabase/schema.sql)",
        });
      }
    }

    if (!subjectId || !quizType || !attemptId || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "subjectId, quizType, attemptId and results[] are required" });
    }
    const validQuizTypes = ["knowledge-check", "practice", "mock"];
    if (!validQuizTypes.includes(quizType)) {
      return res.status(400).json({ error: "quizType must be one of: " + validQuizTypes.join(", ") });
    }

    // Show-Your-Work: the student's typed working, one entry per question.
    // Optional — subjects without the feature simply send nothing.
    const workingByQuestion = new Map();
    if (Array.isArray(working)) {
      for (const w of working) {
        const qid = w?.questionId ?? w?.question_id;
        const text = typeof w?.text === "string" ? w.text : "";
        if (qid && text.trim() !== "") workingByQuestion.set(String(qid), text);
      }
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

    const rowsWithWorking = rows.map((row) => ({
      ...row,
      working: row.question_id ? workingByQuestion.get(String(row.question_id)) ?? null : null,
    }));

    let data;
    let error;
    if (workingByQuestion.size > 0) {
      ({ data, error } = await supabase.from("quiz_results").insert(rowsWithWorking).select("id"));
      // Progressive enhancement: if the `working` column has not been applied to
      // this database yet (owner runs supabase/schema.sql), fall back to the
      // original insert so analytics recording never regresses.
      if (error && /working/i.test(error.message) && /column|schema cache/i.test(error.message)) {
        console.warn(
          "API /api/analytics/record: quiz_results.working column missing — recording without working (apply supabase/schema.sql)"
        );
        ({ data, error } = await supabase.from("quiz_results").insert(rows).select("id"));
      }
    } else {
      ({ data, error } = await supabase.from("quiz_results").insert(rows).select("id"));
    }

    if (error) {
      // 500 is intentional (fails closed): the client falls back to
      // localStorage analytics on non-2xx rather than misreading success.
      console.error("API /api/analytics/record insert failed:", error.message);
      return res.status(500).json({ error: "Failed to record results: " + error.message });
    }

    return res.status(200).json({
      success: true,
      inserted: data ? data.length : rows.length,
      workingSaved: workingByQuestion.size,
    });
  } catch (err) {
    console.error("API /api/analytics/record error:", err);
    return res.status(500).json({ error: "Failed to record results." });
  }
}