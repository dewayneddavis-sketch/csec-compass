// GET /api/planner/load
// Returns the caller's saved revision planner state from Supabase
// `revision_plans` (single JSONB row per user).
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
    console.error("API /api/planner/load misconfigured — missing supabase server credentials");
    return res.status(500).json({ error: "Server misconfigured: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid token" });

    const { data, error } = await supabase
      .from("revision_plans")
      .select("plan, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("API /api/planner/load lookup failed:", error.message);
      return res.status(500).json({
        error: "Planner lookup failed (failing closed). Ensure the `revision_plans` table exists — see supabase/schema.sql.",
      });
    }

    // Fresh user with zero rows is fine: no saved plan, client starts empty.
    return res.status(200).json({ plan: data?.plan || null, updatedAt: data?.updated_at || null });
  } catch (err) {
    console.error("API /api/planner/load error:", err);
    return res.status(500).json({ error: "Planner lookup failed — failing closed." });
  }
}