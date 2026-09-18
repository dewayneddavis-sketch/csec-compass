// POST /api/admin/grant-access
// Admin endpoint to grant/revoke purchase access for users.
// Requires authentication. Only the owner can use this.
// Supports:
//   single: { email, purchaseType, action }            (existing behavior)
//   bulk:   { emails: [email, ...], purchaseType, action }  (pilot-class grant;
//           one email per entry, deduped server-side)
// NOTE: self-contained (inlines Supabase client) — api/_lib/* imports crash
// on Vercel with FUNCTION_INVOCATION_FAILED, so every function keeps its
// own client init. See api/auth/user.js (same pattern, works live).
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase server credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Owner allowlist — env-driven so the owner can authorize their actual
// signed-in account (e.g. dddavis519@gmail.com) via Vercel's OWNER_EMAILS
// without a code deploy. Defaults to the known owner email.
const OWNER_EMAILS = (process.env.OWNER_EMAILS || "dewayneddavis@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const { email, emails, purchaseType, action } = req.body || {};
  const hasSingle = typeof email === "string" && email.trim().length > 0;
  const emailsList = Array.isArray(emails) ? emails : [];
  if ((!hasSingle && emailsList.length === 0) || !purchaseType || !action) {
    return res.status(400).json({
      error: "Missing required fields: email (or emails array), purchaseType, action",
    });
  }
  if (!["grant", "revoke"].includes(action)) {
    return res.status(400).json({ error: "action must be 'grant' or 'revoke'" });
  }

  // Normalize + dedupe target emails (Supabase stores auth emails lowercase).
  const targetEmails = hasSingle
    ? [email.trim().toLowerCase()]
    : [...new Set(emailsList.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  if (targetEmails.length === 0) {
    return res.status(400).json({ error: "No valid emails provided" });
  }
  const isBulk = !hasSingle;

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabaseAdmin();

    // Verify the caller is authenticated
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) return res.status(401).json({ error: "Invalid token" });

    // Only the owner can execute — clear 403 that names the required email(s)
    // so a wrong-account sign-in is diagnosable instead of a generic failure.
    const callerEmail = (caller.email || "").toLowerCase();
    if (!OWNER_EMAILS.includes(callerEmail)) {
      return res.status(403).json({
        error: `Forbidden: this action is restricted to the owner. You are signed in as ${caller.email || "unknown"}; the authorized owner email${OWNER_EMAILS.length > 1 ? "s are" : " is"} ${OWNER_EMAILS.join(", ")}.`,
      });
    }

    // Resolve target users by email (single listUsers call for any batch size)
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const usersByEmail = new Map(
      (userData.users || []).map((u) => [u.email.toLowerCase(), u])
    );

    if (action === "grant") {
      const pending = []; // { user_id, email }
      const summary = { granted: [], already: [], notFound: [] };

      for (const em of targetEmails) {
        const target = usersByEmail.get(em);
        if (!target) {
          summary.notFound.push(em);
          continue;
        }
        const { data: existing } = await supabase
          .from("purchases")
          .select("id")
          .eq("user_id", target.id)
          .eq("purchase_type", purchaseType)
          .maybeSingle();
        if (existing) {
          summary.already.push(em);
          continue;
        }
        pending.push({ user_id: target.id, email: em });
      }

      if (pending.length > 0) {
        const { error: insertError } = await supabase
          .from("purchases")
          .insert(pending.map((p) => ({ user_id: p.user_id, purchase_type: purchaseType })));
        if (insertError) throw insertError;
        summary.granted = pending.map((p) => p.email);
      }

      // Single-email path keeps its historical responses (404 / alreadyExists).
      if (!isBulk) {
        if (summary.notFound.length === 1) {
          return res.status(404).json({ error: "User not found with email: " + targetEmails[0] });
        }
        if (summary.already.length === 1) {
          return res.status(200).json({ message: "Access already granted", alreadyExists: true });
        }
        return res.status(200).json({ message: `Granted '${purchaseType}' access to ${targetEmails[0]}` });
      }

      return res.status(200).json({
        message: `Granted '${purchaseType}' access to ${summary.granted.length} of ${targetEmails.length} email(s)`,
        ...summary,
      });
    }

    if (action === "revoke") {
      const summary = { revoked: [], notFound: [] };

      for (const em of targetEmails) {
        const target = usersByEmail.get(em);
        if (!target) {
          summary.notFound.push(em);
          continue;
        }
        const { error: deleteError } = await supabase
          .from("purchases")
          .delete()
          .eq("user_id", target.id)
          .eq("purchase_type", purchaseType);
        if (deleteError) throw deleteError;
        summary.revoked.push(em);
      }

      if (!isBulk) {
        return res.status(200).json({ message: `Revoked '${purchaseType}' access from ${targetEmails[0]}` });
      }

      return res.status(200).json({
        message: `Revoked '${purchaseType}' access from ${summary.revoked.length} of ${targetEmails.length} email(s)`,
        ...summary,
      });
    }
  } catch (err) {
    console.error("Admin grant-access error:", err);
    return res.status(500).json({ error: err.message });
  }
}
