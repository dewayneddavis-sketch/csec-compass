// Vercel Serverless API — Sync Progress
// POST /api/progress/sync  (served by api/sync.js via a vercel.json rewrite —
// this module is in _lib/ so it costs nothing against the 12-function cap; the
// body below is the original handler, unchanged.)
// Requires auth token in Authorization header
//
// This is the ONLY writer of user_progress, and user_progress is what a linked
// teacher sees (api/analytics/summary.js: lessonsCompleted / quizCompleted per
// subject). Two consequences shape the code below:
//   - the row's user_id comes from the verified token and NOTHING else, so a
//     student can only ever write their own row;
//   - the lesson list is normalised here, because a teacher reads it and the
//     client is untrusted input.
const MAX_LESSONS = 500; // a CSEC subject has far fewer lessons; the cap only trips on junk

function normalizeLessons(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const id of raw) {
    if (typeof id !== "string") continue;
    const key = id.trim();
    if (!key || key.length > 120 || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= MAX_LESSONS) break;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Upsert progress
    const { subjectId, completedLessons, quizCompleted } = req.body || {};
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({ error: "subjectId required" });
    }

    const { data, error } = await supabase
      .from("user_progress")
      .upsert({
        user_id: user.id,
        subject_id: subjectId,
        completed_lessons: normalizeLessons(completedLessons),
        quiz_completed: !!quizCompleted,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,subject_id" })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Sync progress error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
}