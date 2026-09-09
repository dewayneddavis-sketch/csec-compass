// GET /api/purchases/list
// Returns the caller's purchases. FAILS CLOSED by design:
//   - no/invalid auth  -> 401 (no access)
//   - missing Supabase server credentials -> loud 500 naming the vars
//   - purchases table missing/unreadable -> loud 500 (never an empty
//     success that a client could misread; see supabase/schema.sql)
//   - fresh user with zero rows -> 200 { hasBundle: false, purchasedSubjects: [] }
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    const missing = [
      !supabaseUrl ? "SUPABASE_URL (or VITE_SUPABASE_URL)" : null,
      !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter(Boolean).join(", ");
    console.error("API /api/purchases/list misconfigured — missing: " + missing);
    return res.status(500).json({
      error: "Server misconfigured: missing " + missing + ". Access denied — failing closed.",
    });
  }

  try {
    const token = authHeader.replace("Bearer ", "");

    // Verify token and resolve the user
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!userRes.ok) return res.status(401).json({ error: "Invalid token" });
    const userJson = await userRes.json();
    const userId = userJson.id;
    const userEmail = userJson.email;
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    // OWNER ALLOWLIST: only the owner email gets automatic full access.
    const ownerEmails = (process.env.OWNER_EMAILS || "dewayneddavis@gmail.com")
      .split(",").map((e) => e.trim().toLowerCase());
    if (userEmail && ownerEmails.includes(userEmail.toLowerCase())) {
      return res.status(200).json({ hasBundle: true, purchasedSubjects: [] });
    }

    // Query purchases
    const dbRes = await fetch(
      `${supabaseUrl}/rest/v1/purchases?user_id=eq.${userId}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!dbRes.ok) {
      const detail = await dbRes.text();
      console.error("API /api/purchases/list: purchases lookup failed:", dbRes.status, detail);
      return res.status(500).json({
        error: "Purchase lookup failed (failing closed). Ensure the `purchases` table exists — see supabase/schema.sql.",
      });
    }
    const rows = await dbRes.json();
    const list = Array.isArray(rows) ? rows : [];

    const hasBundle = list.some((p) => p && p.purchase_type === "bundle");
    const purchasedSubjects = list
      .filter((p) => p && p.purchase_type && p.purchase_type !== "bundle")
      .map((p) => p.purchase_type);

    return res.status(200).json({ hasBundle, purchasedSubjects });
  } catch (err) {
    console.error("API /api/purchases/list error:", err);
    return res.status(500).json({ error: "Purchase lookup failed — failing closed." });
  }
}
