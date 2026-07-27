// POST /api/admin/grant-access
// Admin endpoint to grant/revoke purchase access for users.
// Requires authentication. Only the owner can use this.

import { getSupabaseAdmin } from "../_lib/supabase";

const OWNER_EMAIL = "dewayneddavis@gmail.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const { email, purchaseType, action } = req.body || {};
  if (!email || !purchaseType || !action) {
    return res.status(400).json({ error: "Missing required fields: email, purchaseType, action" });
  }
  if (!["grant", "revoke"].includes(action)) {
    return res.status(400).json({ error: "action must be 'grant' or 'revoke'" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabaseAdmin();

    // Verify the caller is authenticated
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) return res.status(401).json({ error: "Invalid token" });

    // Only the owner can execute
    if (caller.email !== OWNER_EMAIL) {
      return res.status(403).json({ error: "Forbidden: owner only" });
    }

    // Resolve target user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const targetUser = userData.users.find((u) => u.email === email);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found with email: " + email });
    }

    if (action === "grant") {
      // Check if already exists
      const { data: existing } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", targetUser.id)
        .eq("purchase_type", purchaseType)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({ message: "Access already granted", alreadyExists: true });
      }

      const { error: insertError } = await supabase
        .from("purchases")
        .insert({ user_id: targetUser.id, purchase_type: purchaseType });

      if (insertError) throw insertError;

      return res.status(200).json({ message: `Granted '${purchaseType}' access to ${email}` });
    }

    if (action === "revoke") {
      const { error: deleteError } = await supabase
        .from("purchases")
        .delete()
        .eq("user_id", targetUser.id)
        .eq("purchase_type", purchaseType);

      if (deleteError) throw deleteError;

      return res.status(200).json({ message: `Revoked '${purchaseType}' access from ${email}` });
    }
  } catch (err) {
    console.error("Admin grant-access error:", err);
    return res.status(500).json({ error: err.message });
  }
}
