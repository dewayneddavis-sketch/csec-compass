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

// Who may open the teacher dashboard. Read per request so the owner can change
// TEACHER_EMAILS in Vercel without a redeploy — a link to a teacher who is not
// listed yet is still saved, it simply does not grant access until they are.
function teacherAllowlist() {
  return (process.env.TEACHER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

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

// ---------------------------------------------------------------------------
// CSV paste parsing for bulk teacher→student linking (server-side on purpose).
//
// A school hands over a spreadsheet, not one pair at a time. The parser lives
// HERE so there is exactly one place that decides "is this row a usable pair?":
// the browser ships the pasted text as-is and can never talk the server into
// trusting rows the server itself produced.
//
// What a real paste looks like — and what is therefore accepted:
//   * a copy from Excel / Google Sheets is TAB separated
//   * a European CSV export uses semicolons
//   * a hand-written file uses commas
//   * CRLF or LF line endings, quoted fields, blank lines, and an optional
//     header row (which names the columns, so a paste carrying extra columns —
//     student name, class, … — still links the right two).
const MAX_BULK_ROWS = 1000;
const MAX_CSV_CHARS = 200000;
const MAX_EMAIL_LENGTH = 254;

// Tab beats semicolon beats comma when a line contains several of them.
const DELIMITERS = [
  ["\t", 3],
  [";", 2],
  [",", 1],
];

// Deliberately strict: local part, then a dot-separated domain, lowercase, no
// spaces. A malformed cell is reported as invalid rather than creating a link
// row that could never match a real account.
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

function countOutsideQuotes(line, ch) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') i++;
      else inQuotes = !inQuotes;
      continue;
    }
    if (c === ch && !inQuotes) count++;
  }
  return count;
}

function splitFields(line, delimiter) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (c === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  fields.push(current);
  return fields;
}

function detectDelimiter(line) {
  let best = null;
  let bestScore = 0;
  for (const [delimiter, weight] of DELIMITERS) {
    const count = countOutsideQuotes(line, delimiter);
    if (count === 0) continue;
    // More columns wins; on a tie the weight picks tab > semicolon > comma.
    const score = count * 10 + weight;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

function cleanEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

// Returns a human-readable problem, or null when the email is usable.
function emailProblem(email) {
  if (!email) return "email is empty";
  if (email.length > MAX_EMAIL_LENGTH) return "email is too long";
  if (!EMAIL_RE.test(email)) return "not a valid email address";
  return null;
}

function parseBulkCsv(csv) {
  const pairs = [];
  const invalid = [];
  const lines = csv.split(/\r\n|\r|\n/);
  let columns = null; // { teacher, student } — column indexes, set by a header
  let sawFirstRow = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = i + 1;
    if (!raw.trim()) continue; // blank lines are not data
    const delimiter = detectDelimiter(raw);
    if (!delimiter) {
      invalid.push({
        line,
        text: raw.trim().slice(0, 120),
        reason: "expected two columns: teacher_email, student_email",
      });
      continue;
    }
    const cells = splitFields(raw, delimiter).map((c) => c.trim());

    // The first row may be a header. Reading it tells us which column is the
    // teacher and which is the student, so an unfamiliar column order or extra
    // columns cannot silently link the wrong pairs. A column whose header says
    // "email" wins over one that merely contains the word ("student_name" is a
    // name, not the student's email).
    if (!sawFirstRow) {
      sawFirstRow = true;
      const pick = (role) => {
        const emailColumn = cells.findIndex((c) => role.test(c) && /e-?mail/i.test(c));
        return emailColumn >= 0 ? emailColumn : cells.findIndex((c) => role.test(c));
      };
      const teacher = pick(/teacher/i);
      const student = pick(/student/i);
      if (teacher >= 0 && student >= 0) {
        columns = { teacher, student };
        continue;
      }
    }

    let teacherCell;
    let studentCell;
    if (columns) {
      teacherCell = cells[columns.teacher];
      studentCell = cells[columns.student];
    } else {
      // No header: exactly two columns (a trailing empty column from a
      // spreadsheet selection is dropped first).
      const trimmed = [...cells];
      while (trimmed.length > 2 && trimmed[trimmed.length - 1] === "") trimmed.pop();
      if (trimmed.length !== 2) {
        invalid.push({
          line,
          text: raw.trim().slice(0, 120),
          reason: "expected exactly two columns: teacher_email, student_email",
        });
        continue;
      }
      [teacherCell, studentCell] = trimmed;
    }

    pairs.push({
      line,
      teacher_email: cleanEmail(teacherCell),
      student_email: cleanEmail(studentCell),
    });
  }

  return { pairs, invalid };
}

// Accept the already-split shape too ([{ teacher_email, student_email }], or
// [["teacher", "student"]] rows) so the endpoint is usable without a paste box.
function normalizePairsInput(pairs) {
  return pairs.map((p, index) => {
    const line = index + 1;
    if (Array.isArray(p)) {
      return { line, teacher_email: cleanEmail(p[0]), student_email: cleanEmail(p[1]) };
    }
    return {
      line,
      teacher_email: cleanEmail(p?.teacher_email ?? p?.teacherEmail),
      student_email: cleanEmail(p?.student_email ?? p?.studentEmail),
    };
  });
}

function pairKey(pair) {
  return `${pair.teacher_email}\u0000${pair.student_email}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const { email, emails, purchaseType, action, id, ids, csv, pairs } = req.body || {};

  if (
    !action ||
    ![
      "grant",
      "revoke",
      "list",
      "teacher-link",
      "teacher-unlink",
      "teacher-links",
      "teacher-link-bulk",
    ].includes(action)
  ) {
    return res.status(400).json({
      error:
        "action must be 'grant', 'revoke', 'list', 'teacher-link', 'teacher-link-bulk', 'teacher-unlink' or 'teacher-links'",
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
      const allowedTeachers = teacherAllowlist();
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
      const allowedTeachers = teacherAllowlist();

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

    // ------------------------------------------------- BULK TEACHER LINKS
    //   { action: "teacher-link-bulk", csv: "teacher,student\n…" }
    //   { action: "teacher-link-bulk", pairs: [{ teacher_email, student_email }] }
    //
    // A school's roster is a spreadsheet, so the owner pastes it and every row
    // becomes a link in one request. Nothing about this trusts the caller
    // beyond the owner gate above: rows the server cannot read as a usable
    // pair are reported back (with their line number) instead of failing the
    // whole batch, and a row that is already linked is counted as skipped, not
    // as an error — the existing link simply wins.
    if (action === "teacher-link-bulk") {
      if (typeof csv === "string" && csv.length > MAX_CSV_CHARS) {
        return res.status(400).json({
          error: `That paste is too large (${csv.length} characters; the limit is ${MAX_CSV_CHARS}). Split the list and link it in batches.`,
        });
      }

      let pasted = [];
      let invalidRows = [];
      // A `csv` key — even a blank paste — means the paste path, so a box the
      // owner cleared gets the "no rows" hint rather than "missing field".
      if (typeof csv === "string") {
        const parsed = parseBulkCsv(csv);
        pasted = parsed.pairs;
        invalidRows = parsed.invalid;
      } else if (Array.isArray(pairs)) {
        pasted = normalizePairsInput(pairs);
      } else {
        return res.status(400).json({
          error:
            "Missing required field: csv (the pasted spreadsheet) or pairs ([{ teacher_email, student_email }])",
        });
      }

      // Rows the parser could not read at all still count towards what was
      // pasted, so the counts always add up to the paste the owner sees.
      const unreadable = invalidRows.length;
      const totalPasted = pasted.length + unreadable;

      if (totalPasted === 0) {
        return res.status(400).json({
          error:
            "No rows found. Paste one pair per line, e.g. teacher@school.edu,student@school.edu",
        });
      }
      if (pasted.length > MAX_BULK_ROWS) {
        return res.status(400).json({
          error: `Too many rows in one paste (${pasted.length}); the limit is ${MAX_BULK_ROWS}. Split the list and link it in batches.`,
        });
      }

      // Validate, then collapse duplicates *within this paste* so the same pair
      // pasted twice is linked once and reported once.
      const valid = [];
      const skippedRows = [];
      const seen = new Set();

      for (const row of pasted) {
        const teacherProblem = emailProblem(row.teacher_email);
        const studentProblem = emailProblem(row.student_email);
        if (teacherProblem || studentProblem) {
          invalidRows.push({
            line: row.line ?? null,
            text: [row.teacher_email, row.student_email].filter(Boolean).join(",") || "(blank row)",
            reason: [
              teacherProblem && `teacher: ${teacherProblem}`,
              studentProblem && `student: ${studentProblem}`,
            ]
              .filter(Boolean)
              .join("; "),
          });
          continue;
        }
        if (row.teacher_email === row.student_email) {
          invalidRows.push({
            line: row.line ?? null,
            text: row.teacher_email,
            reason: "teacher and student are the same email",
          });
          continue;
        }
        const key = pairKey(row);
        if (seen.has(key)) {
          skippedRows.push({ ...row, reason: "duplicate row in this paste" });
          continue;
        }
        seen.add(key);
        valid.push(row);
      }

      // Look up what is already linked so the response can say so honestly
      // instead of silently re-writing existing rows.
      const teacherEmails = [...new Set(valid.map((p) => p.teacher_email))];
      let alreadyLinked = new Set();
      if (teacherEmails.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from("teacher_students")
          .select("teacher_email,student_email")
          .in("teacher_email", teacherEmails);
        if (existingError) {
          return res.status(500).json({
            error:
              "Teacher links unavailable (failing closed). Ensure the `teacher_students` table exists — see supabase/schema.sql.",
          });
        }
        alreadyLinked = new Set((existingRows || []).map((r) => pairKey({
          teacher_email: cleanEmail(r.teacher_email),
          student_email: cleanEmail(r.student_email),
        })));
      }

      const toInsert = [];
      for (const pair of valid) {
        if (alreadyLinked.has(pairKey(pair))) {
          skippedRows.push({ ...pair, reason: "already linked" });
        } else {
          toInsert.push(pair);
        }
      }

      if (toInsert.length > 0) {
        // ignoreDuplicates keeps the unique (teacher, student) index in charge:
        // if a pair was linked between the lookup above and this write, the
        // existing row wins instead of the whole batch failing.
        const { error: insertError } = await supabase
          .from("teacher_students")
          .upsert(toInsert.map(({ teacher_email, student_email }) => ({ teacher_email, student_email })), {
            onConflict: "teacher_email,student_email",
            ignoreDuplicates: true,
          });
        if (insertError) throw insertError;
      }

      // Informational only — never a reason to fail the links the owner asked
      // for. A student can be linked before they sign up (their progress shows
      // up once they do) and a teacher outside TEACHER_EMAILS cannot open the
      // dashboard yet, so both are named plainly.
      const allowedTeachers = teacherAllowlist();
      const teachersNotInAllowlist = teacherEmails.filter((e) => !allowedTeachers.includes(e));

      let withoutAccount = [];
      const warnings = [];
      try {
        const allUsers = await fetchAllUsers(supabase);
        const known = new Set(allUsers.filter((u) => u.email).map((u) => u.email.toLowerCase()));
        withoutAccount = [...new Set(valid.map((p) => p.student_email))].filter((e) => !known.has(e));
      } catch {
        warnings.push(
          "Linked, but the account list could not be read — so which students have signed up yet is unknown."
        );
      }

      return res.status(200).json({
        message: `Bulk link: ${toInsert.length} linked, ${skippedRows.length} skipped, ${invalidRows.length} row(s) to fix — out of ${totalPasted} pasted row(s).`,
        linked: toInsert.length,
        skipped: skippedRows.length,
        invalid: invalidRows.length,
        total: totalPasted,
        linkedPairs: toInsert.map(({ teacher_email, student_email }) => ({ teacher_email, student_email })),
        skippedRows,
        invalidRows,
        withoutAccount,
        teachersNotInAllowlist,
        warnings,
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
