// GET /api/subjects/list — Returns all subjects
// Auth optional: anon users get preview, logged-in users get full data
// Requires Authorization: Bearer <token> header (optional)

import { getSupabaseAdmin } from "../_lib/supabase";

// Hardcoded subject preview for anonymous users
const previewSubjects = [
  { id: "mathematics", name: "Mathematics", description: "Master CSEC Mathematics with interactive lessons.", icon: "📐", color: "#2563eb" },
  { id: "english-a", name: "English A", description: "Excel in CSEC English A with comprehension and grammar.", icon: "📝", color: "#7c3aed" },
  { id: "biology", name: "Biology", description: "Explore the living world through cells and genetics.", icon: "🧬", color: "#059669" },
  { id: "chemistry", name: "Chemistry", description: "Learn atomic structure, bonding, and reactions.", icon: "⚗️", color: "#dc2626" },
  { id: "physics", name: "Physics", description: "Understand motion, forces, energy, and electricity.", icon: "⚡", color: "#f59e0b" },
  { id: "information-technology", name: "Information Technology", description: "Programming, databases, networking, and web tech.", icon: "💻", color: "#0891b2" },
  { id: "principles-of-accounts", name: "Principles of Accounts", description: "Double-entry bookkeeping and financial statements.", icon: "📊", color: "#d97706" },
  { id: "principles-of-business", name: "Principles of Business", description: "Entrepreneurship, marketing, and production.", icon: "🏢", color: "#0d9488" },
  { id: "social-studies", name: "Social Studies", description: "Caribbean society, governance, and development.", icon: "🌍", color: "#16a34a" },
  { id: "history", name: "History", description: "Caribbean history from indigenous to independence.", icon: "📜", color: "#b91c1c" },
  { id: "geography", name: "Geography", description: "Physical and human geography, map reading.", icon: "🗺️", color: "#65a30d" },
  { id: "human-social-biology", name: "Human & Social Biology", description: "Body systems, health, nutrition, and disease.", icon: "🫀", color: "#e11d48" },
  { id: "spanish", name: "Spanish", description: "Vocabulary, grammar, reading, and oral communication.", icon: "🇪🇸", color: "#c2410c" },
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    let isAuthenticated = false;
    let userId = null;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const supabase = getSupabaseAdmin();
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          isAuthenticated = true;
          userId = user.id;
        }
      } catch {
        // Auth failed — serve preview anyway
      }
    }

    if (isAuthenticated && userId) {
      // Full data: return subjects with progress for authenticated user
      const supabase = getSupabaseAdmin();
      const { data: progress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId);

      const progressMap = {};
      if (progress) {
        progress.forEach((p) => {
          progressMap[p.subject_id] = {
            completedLessons: p.completed_lessons || [],
            quizCompleted: p.quiz_completed || false,
          };
        });
      }

      const subjects = previewSubjects.map((s) => ({
        ...s,
        progress: progressMap[s.id] || null,
      }));

      return res.status(200).json({
        authenticated: true,
        subjects,
      });
    }

    // Preview for anonymous users
    return res.status(200).json({
      authenticated: false,
      subjects: previewSubjects,
    });
  } catch (err) {
    console.error("Subjects list error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}