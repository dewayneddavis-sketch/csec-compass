// GET /api/purchases/list
// Returns the caller's purchases. FAILS CLOSED by design:
//   - no/invalid auth  -> 401 (no access)
//   - missing Supabase server credentials -> loud 500 naming the vars
//   - purchases table missing/unreadable -> loud 500 (never an empty
//     success that a client could misread; see supabase/schema.sql)
//   - fresh user with zero rows -> 200
//     { hasBundle: false, hasSchoolLicense: false, schoolLicenseSeats: 0,
//       purchasedSubjects: [] }
//
// A School License (purchase_type 'school-license-50' | '-100' | '-150')
// grants every subject, exactly like the bundle — it is reported through
// hasSchoolLicense + schoolLicenseSeats so the UI can show the tier.
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
      return res.status(200).json({
        hasBundle: true,
        hasSchoolLicense: false,
        schoolLicenseSeats: 0,
        purchasedSubjects: [],
      });
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

    // 365-DAY ACCESS WINDOW: each purchase grants access for 365 days from
    // its created_at. Expiry is computed on read (no schema change), so the
    // rule applies retroactively to existing rows. Only purchases whose
    // expires_at is still in the future count toward access; expired rows are
    // still returned (with their expires_at) so the UI can show "valid until".
    const ACCESS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000; // 365 days
    const now = Date.now();
    const withExpiry = list.map((p) => {
      const created = p && p.created_at ? new Date(p.created_at).getTime() : null;
      const expiresAt = created ? new Date(created + ACCESS_WINDOW_MS).toISOString() : null;
      return { ...p, expires_at: expiresAt };
    });
    const active = withExpiry.filter((p) => {
      if (!p || !p.expires_at) return false; // never expose an unexpiring row
      return new Date(p.expires_at).getTime() > now;
    });

    const hasBundle = active.some((p) => p.purchase_type === "bundle");

    // SCHOOL LICENSE: purchase_type carries the tier ('school-license-50',
    // '-100', '-150') because a school can buy more than one license. Any
    // tier unlocks every subject (same as the bundle); seats are summed so
    // the UI/teacher view can show "up to N students" across licenses.
    // Strict allowlist (matches api/stripe/webhook.js); a bare
    // 'school-license' row from the pre-ladder build still grants access.
    const licenseMatch = (type) =>
      typeof type === "string" ? /^school-license(?:-(50|100|150))?$/.exec(type) : null;
    const licenseRows = active.filter((p) => licenseMatch(p.purchase_type));
    const hasSchoolLicense = licenseRows.length > 0;
    const schoolLicenseSeats = licenseRows.reduce((sum, p) => {
      const m = licenseMatch(p.purchase_type);
      return sum + (m && m[1] ? Number(m[1]) : 0);
    }, 0);

    // Per-subject rows only: bundle and school-license rows are full-access
    // grants, not subject ids (a license row must never leak into the
    // subject list as a bogus subject id).
    const purchasedSubjects = active
      .filter((p) => p.purchase_type && p.purchase_type !== "bundle" && !licenseMatch(p.purchase_type))
      .map((p) => p.purchase_type);

    return res.status(200).json({
      hasBundle,
      hasSchoolLicense,
      schoolLicenseSeats,
      purchasedSubjects,
      purchases: withExpiry,
    });
  } catch (err) {
    console.error("API /api/purchases/list error:", err);
    return res.status(500).json({ error: "Purchase lookup failed — failing closed." });
  }
}
