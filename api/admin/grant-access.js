// POST /api/admin/grant-access
// Admin endpoint to grant / revoke / list purchase access. OWNER-ONLY.
// Requires authentication. Only the owner (OWNER_EMAILS) can use this.
//
// Request shapes (one endpoint — keeps the Vercel 12-function cap intact):
//   list:   { action: "list" }
//           -> every grant in the system: all purchases rows joined to the
//              account email, newest first, plus expiry/active state.
//   grant:  { action, email, purchaseType }                  (single)
//           { action, emails: [email, ...], purchaseType }    (bulk pilot class)
//   revoke: { action, purchaseType, email | emails: [...] }   (by account)
//           { action, id | ids: [...] }                       (by grant row —
//                       this is what the "All Grants" table uses, because a
//                       row is unambiguous even when an account holds several
//                       grants of the same type)
//   If both a row id and an email are supplied, the row id wins (the caller
//   selected a specific row).
//
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

// Same access window as api/purchases/list.js — one place, one rule: a grant
// is live for 365 days from the row's created_at.
const ACCESS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

// Page through auth users. supabase.auth.admin.listUsers() defaults to
// perPage 50, which silently truncated the email -> account map once the
// pilot class pushed past 50 accounts; a missing account made grants report
// "User not found" for real students.
async function fetchAllUsers(supabase) {
  const perPage = 1000;
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
  }
  return users;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const { email, emails, purchaseType, action, id, ids } = req.body || {};

  if (!action || !["grant", "revoke", "list", "teacher-link", "teacher-unlink", "teacher-links"].includes(action)) {
    return res.status(400).json({
      error: "action must be 'grant', 'revoke', 'list', 'teacher-link', 'teacher-unlink' or 'teacher-links'",
    });
  }

  // Row ids for a row-level revoke (single id or a selected batch).
  const idList = [
    ...new Set(
      [
        ...(Array.isArray(ids) ? ids : []),
        ...(typeof id === "string" && id.trim() ? [id.trim()] : []),
      ].map((v) => String(v).trim()).filter(Boolean)
    ),
  ];

  const hasSingle = typeof email === "string" && email.trim().length > 0;
  const emailsList = Array.isArray(emails) ? emails : [];
  // Normalize + dedupe target emails (Supabase stores auth emails lowercase).
  const targetEmails = hasSingle
    ? [email.trim().toLowerCase()]
    : [...new Set(emailsList.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  const isBulk = !hasSingle;
  const byRowIds = idList.length > 0;

  if (action === "grant" && (targetEmails.length === 0 || !purchaseType)) {
    return res.status(400).json({
      error: "Missing required fields: email (or emails array) and purchaseType",
    });
  }
  if (action === "revoke" && !byRowIds && (targetEmails.length === 0 || !purchaseType)) {
    return res.status(400).json({
      error: "Missing required fields: either id/ids (grant row), or email (or emails array) and purchaseType",
    });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabaseAdmin();

    // Verify the caller is authenticated
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) return res.status(401).json({ error: "Invalid token" });

    // Only the owner can execute — clear 403 that names the required email(s)
    // so a wrong-account sign-in is diagnosable instead of a generic failure.
    // Every action below (grant, revoke, list) runs AFTER this gate.
    const callerEmail = (caller.email || "").toLowerCase();
    if (!OWNER_EMAILS.includes(callerEmail)) {
      return res.status(403).json({
        error: `Forbidden: this action is restricted to the owner. You are signed in as ${caller.email || "unknown"}; the authorized owner email${OWNER_EMAILS.length > 1 ? "s are" : " is"} ${OWNER_EMAILS.join(", ")}.`,
      });
    }

    // ---------------------------------------------------------------- LIST
    // Every grant in the system, newest first, with the account email so the
    // owner can see who holds what and revoke any row directly.
    if (action === "list") {
      const users = await fetchAllUsers(supabase);
      const emailById = new Map(users.map((u) => [u.id, u.email || null]));

      // DELIBERATELY `select("*")` — no column is named anywhere in this query.
      // The owner's live `purchases` table was created from an older schema than
      // supabase/schema.sql and has no `stripe_session_id` column, so naming it
      // (as this query used to) failed the WHOLE list with
      //   "column purchases.stripe_session_id does not exist"
      // which left the owner unable to see the access they had granted. Asking
      // for whatever columns the live table actually has cannot raise that error,
      // so this works on the older and the current schema alike — and the rows are
      // shaped and sorted here in JS, so the list also does not depend on
      // `created_at` (or any other column name) existing.
      const { data: rows, error: listError } = await supabase
        .from("purchases")
        .select("*")
        .limit(1000);
      if (listError) throw listError;

      const now = Date.now();
      // Epoch for a missing/unparseable timestamp, so those rows sort last
      // instead of making the comparator return NaN.
      const timeOf = (value) => {
        const t = value ? Date.parse(value) : NaN;
        return Number.isFinite(t) ? t : 0;
      };
      const grants = (rows || [])
        .map((r) => {
          // Older schema variant: the grant timestamp may be `granted_at`.
          const createdAt = r.created_at || r.granted_at || null;
          const created = timeOf(createdAt);
          // One expiry rule for the whole platform (api/purchases/list.js):
          // a grant is live for 365 days from the row's creation.
          const expiresAt = created ? new Date(created + ACCESS_WINDOW_MS).toISOString() : null;
          return {
            id: r.id,
            userId: r.user_id,
            email: emailById.has(r.user_id) ? emailById.get(r.user_id) : null,
            purchaseType: r.purchase_type || null,
            subjectId: r.subject_id || null,
            createdAt,
            expiresAt,
            active: expiresAt ? new Date(expiresAt).getTime() > now : false,
          };
        })
        .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt)); // newest first

      return res.status(200).json({
        grants,
        count: grants.length,
        activeCount: grants.filter((g) => g.active).length,
        // Rows whose account no longer exists (deleted user) — shown as
        // "(no account)" in the UI rather than silently dropped.
        missingAccounts: grants.filter((g) => !g.email).length,
      });
    }

    // ------------------------------------------------------- TEACHER LINKS
    // Who may see whose progress in the teacher dashboard. Owner-only, like
    // every other grant in the platform: a teacher can never link themselves to
    // a student, and the dashboard only ever reads links created here.
    //
    //   { action: "teacher-links" }                          -> every link
    //   { action: "teacher-link",   teacherEmail, email | emails }
    //   { action: "teacher-unlink", teacherEmail, email | emails }
    if (action === "teacher-links") {
      const { data: rows, error: linksError } = await supabase
        .from("teacher_students")
        .select("id,teacher_email,student_email,created_at")
        .order("teacher_email", { ascending: true })
        .limit(2000);
      if (linksError) {
        return res.status(500).json({
          error: "Teacher links unavailable (failing closed). Ensure the `teacher_students` table exists — see supabase/schema.sql.",
        });
      }
      const allowedTeachers = (process.env.TEACHER_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      return res.status(200).json({
        links: rows || [],
        count: (rows || []).length,
        teachers: [...new Set((rows || []).map((r) => r.teacher_email))],
        allowedTeachers, // TEACHER_EMAILS — who can actually open the dashboard
      });
    }

    if (action === "teacher-link" || action === "teacher-unlink") {
      const teacherEmail =
        typeof req.body?.teacherEmail === "string" ? req.body.teacherEmail.trim().toLowerCase() : "";
      if (!teacherEmail || targetEmails.length === 0) {
        return res.status(400).json({
          error: "Missing required fields: teacherEmail and email (or an emails array)",
        });
      }

      if (action === "teacher-unlink") {
        const { error: unlinkError } = await supabase
          .from("teacher_students")
          .delete()
          .eq("teacher_email", teacherEmail)
          .in("student_email", targetEmails);
        if (unlinkError) throw unlinkError;
        return res.status(200).json({
          message: `Unlinked ${targetEmails.length} student(s) from ${teacherEmail}`,
          removed: targetEmails,
        });
      }

      // LINK — a student may be linked before they sign up (their progress
      // simply appears once they do), but the owner is told who has no account
      // yet so an empty dashboard is never a mystery.
      const allUsers = await fetchAllUsers(supabase);
      const known = new Map(allUsers.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u.id]));
      const withoutAccount = targetEmails.filter((e) => !known.has(e));
      const allowedTeachers = (process.env.TEACHER_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      const { error: linkError } = await supabase
        .from("teacher_students")
        .upsert(
          targetEmails.map((student_email) => ({ teacher_email: teacherEmail, student_email })),
          { onConflict: "teacher_email,student_email" }
        );
      if (linkError) throw linkError;

      return res.status(200).json({
        message: `Linked ${targetEmails.length} student(s) to ${teacherEmail}`,
        linked: targetEmails,
        withoutAccount,
        teacherHasAccount: known.has(teacherEmail),
        teacherInAllowlist: allowedTeachers.includes(teacherEmail),
      });
    }

    // ---------------------------------------------------------------- GRANT
    const users = await fetchAllUsers(supabase);
    const usersByEmail = new Map(
      users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u])
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
      // REVOKE BY GRANT ROW — what the "All Grants" table sends. Each row is a
      // specific grant, so this can remove exactly the one selected.
      if (byRowIds) {
        const { data: existing, error: lookupError } = await supabase
          .from("purchases")
          .select("id")
          .in("id", idList);
        if (lookupError) throw lookupError;

        const foundIds = (existing || []).map((r) => r.id);
        const missingIds = idList.filter((i) => !foundIds.includes(i));
        if (foundIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("purchases")
            .delete()
            .in("id", foundIds);
          if (deleteError) throw deleteError;
        }

        return res.status(200).json({
          message: `Revoked ${foundIds.length} of ${idList.length} grant row(s)`,
          revoked: foundIds,
          notFound: missingIds,
        });
      }

      // REVOKE BY ACCOUNT — every grant of that purchase type for each email.
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
