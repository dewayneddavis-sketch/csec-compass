// GET /api/debug — diagnostic endpoint
import { getSupabaseAdmin } from "./_lib/supabase";

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("purchases").select("count", { count: "exact", head: true });
    if (error) return res.status(500).json({ step: "query", error: error.message });
    res.status(200).json({ 
      ok: true,
      hasUrl: !!process.env.VITE_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      count: data?.count ?? null 
    });
  } catch (err) {
    res.status(500).json({ step: "init", error: err.message, stack: err.stack?.split("\n").slice(0, 3) });
  }
}
