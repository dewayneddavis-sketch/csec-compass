// GET /api/purchases/list
// Returns user's purchases. Requires auth header.
import { getSupabaseAdmin } from "../_lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid token" });

    const { data: purchases, error } = await supabase
      .from("purchases")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;

    const hasBundle = purchases?.some((p) => p.purchase_type === "bundle");
    const purchasedSubjects = purchases
      ?.filter((p) => p.subject_id)
      .map((p) => p.subject_id) || [];

    res.status(200).json({
      hasBundle,
      purchasedSubjects,
      purchases,
    });
  } catch (err) {
    console.error("Purchases list error:", err);
    res.status(500).json({ error: err.message });
  }
}