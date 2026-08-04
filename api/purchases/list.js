// GET /api/purchases/list
// Returns user's purchases using Supabase REST API directly (no SDK)
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    // Verify token and get user
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!userRes.ok) return res.status(401).json({ error: "Invalid token" });
    const { id: userId } = await userRes.json();

    // Query purchases
    const dbRes = await fetch(
      `${supabaseUrl}/rest/v1/purchases?user_id=eq.${userId}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const purchases = await dbRes.json();

    const hasBundle = purchases?.some((p) => p.purchase_type === "bundle");
    const purchasedSubjects = purchases?.filter((p) => p.purchase_type !== "bundle").map((p) => p.purchase_type) || [];

    res.status(200).json({ hasBundle, purchasedSubjects, purchases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
