// POST /api/planner/sync
// Saves the caller's revision planner state (one JSONB row per user) to
// Supabase `revision_plans`. The client always keeps a localStorage copy —
// this is the server-side persistence layer for signed-in users.
// NOTE: self-contained (inlines Supabase client init) — api/_lib/* imports
// crash on Vercel with FUNCTION_INVOCATION_FAILED (see api/auth/user.js).
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("API /api/planner/sync misconfigured — missing supabase server credentials");
    return res.status(500).json({ error: "Server misconfigured: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid token" });

    const { plan } = req.body || {};

    // plan === null means "reset": delete the user's saved row so a fresh
    // device starts empty instead of resurrecting the old plan.
    if (plan === null) {
      const { error: delError } = await supabase
        .from("revision_plans")
        .delete()
        .eq("user_id", user.id);
      if (delError) {
        console.error("API /api/planner/sync delete failed:", delError.message);
        return res.status(500).json({ error: "Failed to reset planner: " + delError.message });
      }
      return res.status(200).json({ success: true, reset: true });
    }

    if (!plan || typeof plan !== "object") {
      return res.status(400).json({ error: "plan object required" });
    }

    const { error } = await supabase.from("revision_plans").upsert(
      { user_id: user.id, plan, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("API /api/planner/sync upsert failed:", error.message);
      // 500 is intentional (fails closed): the client keeps its local copy.
      return res.status(500).json({ error: "Failed to sync planner: " + error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("API /api/planner/sync error:", err);
    return res.status(500).json({ error: "Failed to sync planner." });
  }
}