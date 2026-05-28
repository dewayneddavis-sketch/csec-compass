// Vercel Serverless API — Sync Progress
// POST /api/progress/sync
// Requires auth token in Authorization header

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
    const { subjectId, completedLessons, quizCompleted } = req.body;
    if (!subjectId) {
      return res.status(400).json({ error: "subjectId required" });
    }

    const { data, error } = await supabase
      .from("user_progress")
      .upsert({
        user_id: user.id,
        subject_id: subjectId,
        completed_lessons: completedLessons || [],
        quiz_completed: quizCompleted || false,
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