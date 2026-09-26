// POST /api/admin/grant-access
// Admin endpoint to grant / revoke / list purchase access, plus the school
// console's roster actions and a teacher's own class-list actions.
// Requires authentication — WHICH gate applies is decided by the action list
// below and never by the request body (owner, a school's own admin, or a
// teacher acting on their own account).
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
//   teacher-self-links / teacher-self-link / teacher-self-unlink
//           the signed-in TEACHER's own class list. There is deliberately no
//           teacherEmail field: the teacher is always the caller, so one
//           teacher can neither read nor write another's class. The owner's
//           teacher-link / teacher-unlink / teacher-link-bulk actions stay for
//           global oversight.
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

// ------------------------------------------------------------------ ACTIONS
// One endpoint, three gates. Which gate applies is decided ONLY by these lists
// — never by the request body — so a new action has to be written into a list
// to become reachable at all, a school action can never be reached by anything
// but the caller's own `school_admins` row, and a teacher action can never act
// for anyone but the caller.
//
//   OWNER_ACTIONS       — the platform owner (OWNER_EMAILS). Grant/revoke
//                         access, every teacher link (global oversight of who
//                         is linked to whom, on any account), and the school
//                         actions below. Schools name themselves (and their own
//                         admin) at licence purchase, so these are the owner's
//                         OVERSIGHT and correction path — a window onto every
//                         school, not the gatekeeper that creates them.
//   SCHOOL_SCOPED_ACTIONS — the school's own designated admin. Each one is
//                         locked to the single school named by the caller's
//                         school_admins row; a schoolId in the body is ignored.
//   TEACHER_SELF_ACTIONS — a teacher's own class list, always scoped to the
//                         caller's own email (see below).
const OWNER_ACTIONS = [
  "grant",
  "revoke",
  "list",
  "teacher-link",
  "teacher-unlink",
  "teacher-links",
  "teacher-link-bulk",
  "school-list",
  "school-create",
  "school-admin",
  "school-member",
];

const SCHOOL_SCOPED_ACTIONS = [
  "school-roster",
  "school-link",
  "school-unlink",
  "school-member-add",
  "school-member-remove",
];

// The teacher's OWN tools (owner decision 2026-09-22): a teacher links the
// students they teach themselves, without the owner in the loop —
//
//   "the school admin will link the teachers … the teacher can also link
//    students once linked by school admin."
//
// Every one of these is locked to the caller: `teacher_email` is ALWAYS the
// caller's own signed-in email and never read from the request body, so no
// caller can read or write another teacher's class. The gate is the teacher
// gate below (allowlist, owner, school roster as a teacher, or already linked).
const TEACHER_SELF_ACTIONS = ["teacher-self-links", "teacher-self-link", "teacher-self-unlink"];

const ALL_ACTIONS = [...OWNER_ACTIONS, ...SCHOOL_SCOPED_ACTIONS, ...TEACHER_SELF_ACTIONS];

// How many students one self-link call may carry. The same ceiling as the school
// console's own bulk link: a teacher pastes a class, not a whole school.
const MAX_SELF_LINK_STUDENTS = 500;

// Remove one person from a school's roster together with the class links that
// school created for them (either side of the link). EVERY statement is scoped
// by school_id, so another school's member or link with the same email address
// is never touched — and neither is an owner-created platform link, whose
// school_id is NULL.
async function removeSchoolMember(supabase, schoolId, email) {
  const asTeacher = await supabase
    .from("teacher_students")
    .delete()
    .eq("school_id", schoolId)
    .eq("teacher_email", email)
    .select("student_email");
  if (asTeacher.error) return { error: asTeacher.error };

  const asStudent = await supabase
    .from("teacher_students")
    .delete()
    .eq("school_id", schoolId)
    .eq("student_email", email)
    .select("teacher_email");
  if (asStudent.error) return { error: asStudent.error };

  const member = await supabase
    .from("school_members")
    .delete()
    .eq("school_id", schoolId)
    .eq("email", email);
  if (member.error) return { error: member.error };

  return { removedLinks: (asTeacher.data?.length || 0) + (asStudent.data?.length || 0) };
}

// Same column-tolerance as api/stripe/webhook.js and api/purchases/list.js: a
// statement naming a column the live table does not have is a schema that is
// older than this file, not a broken request. 42703 = undefined_column;
// PGRST204 = unknown column in the schema cache (what a write returns).
function isUnknownColumnError(err) {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const message = String(err.message || "");
  return /column .* does not exist/i.test(message) || /Could not find the '.*' column/i.test(message);
}

// Every school, oldest name-order first. One query, one shape, shared by the
// owner's school actions and the owner override below, so a school is always
// resolved the same way — by id, else by exact name (case-insensitive).
//
// The licence columns are newer than the table itself (schools now provision
// themselves at purchase — see api/stripe/webhook.js). A database that predates
// them still lists every school, with the licence unknown rather than an error:
// the owner's oversight view must never be the thing that breaks.
async function loadSchools(supabase) {
  let { data, error } = await supabase
    .from("schools")
    .select("id,name,created_at,license_tier,seats")
    .order("name", { ascending: true })
    .limit(500);
  if (error && isUnknownColumnError(error)) {
    console.warn(
      "API /api/admin/grant-access: schools has no license_tier/seats columns — listing schools without their licence. Apply supabase/schema.sql."
    );
    ({ data, error } = await supabase
      .from("schools")
      .select("id,name,created_at")
      .order("name", { ascending: true })
      .limit(500));
  }
  if (error) return { error };
  return { schools: data || [] };
}

function findSchool(schools, id, name) {
  const wantedId = typeof id === "string" ? id.trim() : "";
  if (wantedId) return schools.find((s) => s.id === wantedId) || null;
  const wantedName = typeof name === "string" && name.trim() ? name.trim().toLowerCase() : "";
  if (wantedName) return schools.find((s) => String(s.name).toLowerCase() === wantedName) || null;
  return null;
}

// Who may open the teacher dashboard. Read per request so the owner can change
// the allowlist in Vercel without a redeploy — a teacher who is not listed yet
// is still linkable, they simply cannot open the dashboard until they are.
//
// TWO LABELS, on purpose. The value is set as TEACHER_EMAIL in Vercel (singular,
// no trailing S), while older code and docs used TEACHER_EMAILS. Both are read,
// and the singular wins when both are present, so the owner never has to rename
// anything in Vercel for teachers to get in.
function teacherAllowlist() {
  return (process.env.TEACHER_EMAIL || process.env.TEACHER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Is this email a TEACHER ON A SCHOOL'S ROSTER (`school_members.role =
// 'teacher'`)? That row is created by the school's own admin at /school — the
// owner's model for how a school onboards its teachers.
//
// Returns { rostered, schoolId } — schoolId is the school stamped on any link
// this teacher creates, or null for a platform-level teacher (the allowlist),
// whose links belong to no school. A missing `school_members` table is NOT an
// error here: the schooling tables are newer than teacher_students, and the
// other routes into the dashboard (allowlist, owner, an existing link) have to
// keep working on a database that predates them.
//
// The `error` flag is returned so a CALLER that must fail closed can, while the
// dashboard gate treats "no roster" as simply "not school-designated".
async function schoolTeacherRow(supabase, email) {
  const { data, error } = await supabase
    .from("school_members")
    .select("school_id,role")
    .eq("email", email)
    .limit(50);
  if (error) {
    console.warn(
      "API /api/admin/grant-access: school_members lookup failed:",
      error.message
    );
    return { rostered: false, schoolId: null, error };
  }
  const rows = (data || []).filter((m) => String(m.role || "").toLowerCase() === "teacher");
  if (rows.length === 0) return { rostered: false, schoolId: null, error: null };
  // A teacher can be on more than one school's roster. Pick one deterministically
  // (lowest school id) rather than by query order, so the school stamped on their
  // links is stable across requests.
  const schoolIds = rows.map((m) => m.school_id).filter(Boolean).sort();
  return { rostered: true, schoolId: schoolIds[0] || null, error: null };
}

// Is this account a PAYING purchaser who told us at checkout that they are a
// teacher? (owner addition 2026-09-26: "a teacher may buy independently of the
// school admin and pull a class"). The row only exists because
// api/stripe/webhook.js wrote it after a VERIFIED Stripe payment, and the
// purchases table is deny-all RLS behind the service-role key — so its
// existence IS the proof of purchase and a caller cannot manufacture it.
//
// Fails CLOSED: no user id, no row, or a table that predates the buyer_role
// column all mean "this rule does not qualify". The rules above it still stand,
// so a database without that column keeps working exactly as before.
async function purchasedTeacherRow(supabase, userId) {
  if (!userId) return { paid: false };
  const { data, error } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("buyer_role", "teacher")
    .limit(1);
  if (error) {
    console.warn(
      "API /api/admin/grant-access: purchases.buyer_role lookup failed:",
      error.message
    );
    return { paid: false, error };
  }
  return { paid: (data || []).length > 0 };
}

// The teacher gate, used by every teacher-self-* action — and mirroring the
// access rule api/analytics/summary.js applies to ?scope=class, so anyone who
// can open the dashboard can also keep their own class list in order.
//
// Any ONE of these is enough:
//   1. the caller is the owner (OWNER_EMAILS) — the global oversight path;
//   2. the caller is in the allowlist (TEACHER_EMAIL, or TEACHER_EMAILS);
//   3. the caller is a teacher on a school's roster (school_members);
//   4. the caller is already named as a teacher on a link (teacher_students) —
//      which is how the owner-verified live teachers keep working, and how a
//      school admin's link to a teacher authorises them.
//   5. the caller BOUGHT access and said they are a teacher (owner addition
//      2026-09-26) — a verified paying purchaser, recorded by the webhook.
//
// Returns { reason, schoolId } when qualified, or null. Fails CLOSED: no rule
// satisfied anywhere means no access and no data.
async function teacherSelfGate(supabase, callerEmail, isOwnerCaller, callerId) {
  const school = await schoolTeacherRow(supabase, callerEmail);
  const schoolId = school.schoolId;

  if (isOwnerCaller) return { reason: "owner", schoolId };
  if (teacherAllowlist().includes(callerEmail)) return { reason: "allowlist", schoolId };
  if (school.rostered) return { reason: "school", schoolId };

  // rule 4 — read-only, and only the row's existence matters.
  const { data: linkedRows, error: linkedError } = await supabase
    .from("teacher_students")
    .select("teacher_email")
    .eq("teacher_email", callerEmail)
    .limit(1);
  if (linkedError) {
    console.error("API /api/admin/grant-access: teacher_students lookup failed:", linkedError.message);
    return null; // fails closed
  }
  if ((linkedRows || []).length > 0) return { reason: "linked", schoolId };

  // rule 5 — a paying purchaser who self-identified as a teacher. Their links
  // belong to no school (they bought on their own), so schoolId stays null.
  const purchase = await purchasedTeacherRow(supabase, callerId);
  if (purchase.paid) return { reason: "purchase", schoolId: null };

  return null;
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

// The school roster is what gates every link, so a malformed address must never
// reach it: an unchecked roster row would silently become the source of truth for
// who may be linked. Judged by the same rule as a pasted bulk-link pair.
function rosterProblem(value) {
  return emailProblem(cleanEmail(value));
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

  const { email, emails, purchaseType, action, id, ids, csv, pairs, name, role, schoolId, schoolName, adminEmail, remove } =
    req.body || {};

  if (!action || !ALL_ACTIONS.includes(action)) {
    return res.status(400).json({
      error: `action must be one of: ${ALL_ACTIONS.join(", ")}`,
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
    //
    // The one exception is the school-scoped list: those actions are what a
    // SCHOOL's own designated admin uses, so they are gated on their
    // `school_admins` row instead. The exception is the explicit
    // SCHOOL_SCOPED_ACTIONS allowlist above — anything else falls through to
    // the owner check, which is what keeps the owner gate the default.
    const callerEmail = (caller.email || "").toLowerCase();
    const isOwnerCaller = OWNER_EMAILS.includes(callerEmail);

    let callerSchoolId = null; // set only for a school admin, only for their own school
    if (SCHOOL_SCOPED_ACTIONS.includes(action)) {
      if (isOwnerCaller) {
        // Owner override. The owner may run a school-scoped action, but ONLY by
        // naming one school explicitly — there is deliberately no "every school"
        // mode, so an override can never sweep a platform-wide change into a
        // school action. A missing school name is an error, not an implicit all.
        const wantedName =
          (typeof schoolName === "string" && schoolName.trim() ? schoolName : name) || "";
        const { schools, error: schoolsError } = await loadSchools(supabase);
        if (schoolsError) {
          console.error("API /api/admin/grant-access: schools lookup failed:", schoolsError.message);
          return res.status(500).json({
            error:
              "Schools unavailable (failing closed). Ensure the `schools`, `school_admins` and `school_members` tables exist — see supabase/schema.sql.",
          });
        }
        const target = findSchool(schools, schoolId, wantedName);
        if (!target) {
          return res.status(400).json({
            error:
              "The owner must name one existing school for this action: pass schoolId or schoolName (see action \"school-list\").",
          });
        }
        callerSchoolId = target.id;
      } else {
        const { data: adminRow, error: adminError } = await supabase
          .from("school_admins")
          .select("school_id,email")
          .eq("email", callerEmail)
          .maybeSingle();
        if (adminError) {
          console.error("API /api/admin/grant-access: school_admins lookup failed:", adminError.message);
          return res.status(500).json({
            error:
              "School admin lookup failed (failing closed). Ensure the `schools`, `school_admins` and `school_members` tables exist — see supabase/schema.sql.",
          });
        }
        if (!adminRow || !adminRow.school_id) {
          return res.status(403).json({
            error:
              "Forbidden: school admin access required. Ask the account owner to designate your email as a school admin.",
          });
        }
        // The school comes from THIS row and from nowhere else. A schoolId in the
        // request body is never read for a school admin — that is what makes it
        // impossible for one school's admin to name, read or edit another school.
        callerSchoolId = adminRow.school_id;
      }
    }

    // --------------------------------------- THE TEACHER'S OWN CLASS LIST
    // Placed BEFORE the owner-only fallback, because a teacher is neither the
    // owner nor a school admin: these three actions are theirs. Every write is
    // stamped with the caller's own signed-in email — there is no teacherEmail
    // field in this protocol at all, so no request can read or write another
    // teacher's class.
    //
    //   { action: "teacher-self-links" }                 -> the caller's links
    //   { action: "teacher-self-link",   email | emails }
    //   { action: "teacher-self-unlink", email | emails }
    if (TEACHER_SELF_ACTIONS.includes(action)) {
      const linksTablesHint =
        "Ensure the `teacher_students` table exists — see supabase/schema.sql.";

      const gate = await teacherSelfGate(supabase, callerEmail, isOwnerCaller, caller.id);
      if (!gate) {
        // Fails closed: no student data, no rows, no hint about anyone else.
        return res.status(403).json({
          error: `Forbidden: teacher access required. You are signed in as ${caller.email || "unknown"}. A teacher account is one the account owner has listed, one your school's admin added to the school roster as a teacher, or an account that bought access and chose "Teacher" at checkout — ask the owner to add ${callerEmail || "your email"} and sign in again.`,
        });
      }

      const teacherEmail = callerEmail; // ALWAYS the caller — never req.body

      if (action === "teacher-self-links") {
        const { data: rows, error: linksError } = await supabase
          .from("teacher_students")
          .select("id,student_email,school_id,created_at")
          .eq("teacher_email", teacherEmail)
          .limit(2000);
        if (linksError) {
          console.error("API /api/admin/grant-access: teacher self links lookup failed:", linksError.message);
          return res.status(500).json({ error: `Your class list is unavailable (failing closed). ${linksTablesHint}` });
        }
        const links = (rows || []).map((r) => ({
          id: r.id,
          studentEmail: cleanEmail(r.student_email),
          schoolId: r.school_id || null,
          createdAt: r.created_at || null,
        }));
        return res.status(200).json({ teacherEmail, access: gate.reason, links, count: links.length });
      }

      const students = targetEmails; // normalised + de-duplicated above
      if (students.length === 0) {
        return res.status(400).json({
          error: "Missing required field: email (or an emails array) — the student email(s).",
        });
      }
      if (students.length > MAX_SELF_LINK_STUDENTS) {
        return res.status(400).json({
          error: `Too many students in one call (${students.length}) — link up to ${MAX_SELF_LINK_STUDENTS} at a time.`,
        });
      }

      if (action === "teacher-self-unlink") {
        // Only the caller's own rows: teacher_email is the caller, so this can
        // never touch a link belonging to anyone else — and a school admin's
        // link to a different teacher is out of reach.
        const { data: removedRows, error: unlinkError } = await supabase
          .from("teacher_students")
          .delete()
          .eq("teacher_email", teacherEmail)
          .in("student_email", students)
          .select("student_email");
        if (unlinkError) {
          console.error("API /api/admin/grant-access: teacher self unlink failed:", unlinkError.message);
          return res.status(500).json({ error: `Unlinking failed (failing closed). ${linksTablesHint}` });
        }
        const removed = (removedRows || []).map((r) => cleanEmail(r.student_email));
        return res.status(200).json({
          message: removed.length
            ? `Unlinked ${removed.length} student(s) — they no longer appear on your dashboard.`
            : `Nothing to unlink: you have no link to those student(s).`,
          teacherEmail,
          removed,
          notRemoved: students.filter((e) => !removed.includes(e)),
        });
      }

      // teacher-self-link — link ANY student email the teacher knows. There is
      // no student approval step: a student can be linked before they sign up,
      // and their progress appears the moment they do.
      const invalid = [];
      const valid = [];
      for (const em of students) {
        const problem = emailProblem(em);
        if (problem) {
          invalid.push({ email: em, reason: problem });
          continue;
        }
        if (em === teacherEmail) {
          invalid.push({ email: em, reason: "that is your own email — a teacher is not their own student" });
          continue;
        }
        valid.push(em);
      }

      let alreadyLinked = [];
      if (valid.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from("teacher_students")
          .select("student_email")
          .eq("teacher_email", teacherEmail)
          .in("student_email", valid);
        if (existingError) {
          console.error("API /api/admin/grant-access: teacher self link lookup failed:", existingError.message);
          return res.status(500).json({ error: `Linking failed (failing closed). ${linksTablesHint}` });
        }
        alreadyLinked = (existingRows || []).map((r) => cleanEmail(r.student_email));
      }
      const skip = new Set(alreadyLinked);
      const toInsert = valid.filter((e) => !skip.has(e));

      if (toInsert.length > 0) {
        // school_id comes from the CALLER's own roster row (never the body):
        // a teacher the school added writes their links into that school, so
        // the school admin can see and manage them; a teacher who is only on
        // the platform allowlist writes a platform-level link, like the
        // owner's. ignoreDuplicates keeps the unique (teacher, student) index
        // in charge — re-linking is a no-op, not a duplicate.
        const { error: linkError } = await supabase
          .from("teacher_students")
          .upsert(
            toInsert.map((student_email) => ({
              teacher_email: teacherEmail,
              student_email,
              ...(gate.schoolId ? { school_id: gate.schoolId } : {}),
            })),
            { onConflict: "teacher_email,student_email", ignoreDuplicates: true }
          );
        if (linkError) {
          console.error("API /api/admin/grant-access: teacher self link failed:", linkError.message);
          return res.status(500).json({ error: `Linking failed (failing closed). ${linksTablesHint}` });
        }
      }

      // Informational only — never a reason to fail a link that worked.
      let withoutAccount = [];
      let warning = null;
      try {
        const allUsers = await fetchAllUsers(supabase);
        const known = new Set(allUsers.filter((u) => u.email).map((u) => u.email.toLowerCase()));
        withoutAccount = toInsert.filter((e) => !known.has(e));
      } catch {
        warning =
          "Linked, but the account list could not be read — so which of these students have signed up yet is unknown.";
      }

      const parts = [`Linked ${toInsert.length} student(s) to ${teacherEmail}.`];
      if (alreadyLinked.length > 0) parts.push(`${alreadyLinked.length} were already linked.`);
      if (invalid.length > 0) parts.push(`${invalid.length} could not be linked.`);

      return res.status(200).json({
        message: parts.join(" "),
        teacherEmail,
        access: gate.reason,
        linked: toInsert,
        alreadyLinked,
        invalid,
        withoutAccount,
        schoolId: gate.schoolId || null,
        warning,
      });
    }

    if (!callerSchoolId && !isOwnerCaller) {
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
    // The owner's global view of who is linked to whom — every link in the
    // platform, for any teacher, on any account. A teacher keeps their OWN
    // class list with the teacher-self-* actions above (identity always taken
    // from the caller); these three are the oversight and correction path, and
    // the place to fix a link for a school that has asked for help.
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

    // ---------------------------------------------------------------- SCHOOLS
    // Owner side: create a school, designate ONE admin for it, and seed or fix
    // its roster. A school normally creates ITSELF and names its own admin when
    // it buys a licence (api/stripe/webhook.js provisions public.schools /
    // school_admins / school_members from the checkout metadata) — so these
    // actions are the owner's global oversight and correction path, and they
    // list every school, self-provisioned ones included. The school's own admin
    // does not call these — they use the school-scoped actions further down,
    // which are locked to their own school.
    //
    //   { action: "school-list" }                        -> schools + admins + roster
    //   { action: "school-create", name, adminEmail? }    -> new school (idempotent by name)
    //   { action: "school-admin",  email, schoolId | schoolName, remove? }
    //   { action: "school-member", schoolId | schoolName, email, role, remove? }
    if (
      action === "school-list" ||
      action === "school-create" ||
      action === "school-admin" ||
      action === "school-member"
    ) {
      const schoolTablesHint =
        "Ensure the `schools`, `school_admins` and `school_members` tables exist — see supabase/schema.sql.";

      const { schools: schoolList, error: schoolError } = await loadSchools(supabase);
      if (schoolError) {
        console.error("API /api/admin/grant-access: schools lookup failed:", schoolError.message);
        return res.status(500).json({ error: `Schools unavailable (failing closed). ${schoolTablesHint}` });
      }

      // A school is named either by id or by name (the owner types a name in
      // the admin card). Ambiguity is resolved here, once, for every action.
      const pickSchool = () =>
        findSchool(
          schoolList,
          schoolId,
          typeof schoolName === "string" && schoolName.trim() ? schoolName : name
        );

      if (action === "school-list") {
        const [adminRows, memberRows, linkRows] = await Promise.all([
          supabase.from("school_admins").select("school_id,email").limit(1000),
          supabase.from("school_members").select("school_id,email,role").limit(5000),
          supabase.from("teacher_students").select("school_id").limit(10000),
        ]);
        if (adminRows.error || memberRows.error || linkRows.error) {
          const message =
            adminRows.error?.message || memberRows.error?.message || linkRows.error?.message || "";
          console.error("API /api/admin/grant-access: school lists lookup failed:", message);
          return res.status(500).json({ error: `Schools unavailable (failing closed). ${schoolTablesHint}` });
        }

        const admins = adminRows.data || [];
        const members = memberRows.data || [];
        const links = linkRows.data || [];
        const ofSchool = (schoolRef, role) =>
          (members || [])
            .filter((m) => m.school_id === schoolRef && (!role || m.role === role))
            .map((m) => m.email)
            .sort();

        const schools = schoolList.map((s) => ({
          id: s.id,
          name: s.name,
          createdAt: s.created_at || null,
          admins: (admins || [])
            .filter((a) => a.school_id === s.id)
            .map((a) => a.email)
            .sort(),
          teachers: ofSchool(s.id, "teacher"),
          students: ofSchool(s.id, "student"),
          linkCount: (links || []).filter((l) => l.school_id === s.id).length,
          // What this school bought, as recorded by the webhook that sold it
          // (schools name themselves at purchase — api/stripe/webhook.js). Null
          // for a school created here by hand, or on a database that predates the
          // columns: the card shows that as unknown rather than guessing.
          licenseTier: s.license_tier || null,
          seats:
            s.seats === null || s.seats === undefined || !Number.isFinite(Number(s.seats))
              ? null
              : Number(s.seats),
        }));

        return res.status(200).json({
          schools,
          count: schools.length,
          // The owner's own platform-wide links belong to no school, so no
          // school admin can see or remove them. Counted here so the owner can
          // see how many exist.
          platformLinks: (links || []).filter((l) => !l.school_id).length,
        });
      }

      if (action === "school-create") {
        const cleanName = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
        if (!cleanName) {
          return res.status(400).json({ error: "Missing required field: name (the school's name)" });
        }

        const lower = cleanName.toLowerCase();
        let school = schoolList.find((s) => String(s.name).toLowerCase() === lower) || null;
        let created = false;
        if (!school) {
          const { error: createError } = await supabase.from("schools").insert({ name: cleanName });
          if (createError) {
            console.error("API /api/admin/grant-access: school insert failed:", createError.message);
            return res
              .status(500)
              .json({ error: `Could not create the school (failing closed). ${schoolTablesHint}` });
          }
          // Re-read rather than trusting the insert's echo, so the id is the
          // one the database actually assigned.
          const { data: reread } = await supabase
            .from("schools")
            .select("id,name,created_at")
            .eq("name", cleanName)
            .maybeSingle();
          school = reread || { id: null, name: cleanName, created_at: null };
          created = true;
        }

        const newAdmin = cleanEmail(adminEmail);
        if (newAdmin) {
          const problem = emailProblem(newAdmin);
          if (problem) {
            return res.status(400).json({ error: `School admin email: ${problem} (${newAdmin})` });
          }
        }
        if (newAdmin && school.id) {
          const { error: adminError } = await supabase
            .from("school_admins")
            .upsert([{ school_id: school.id, email: newAdmin }], { onConflict: "email" });
          if (adminError) {
            console.error("API /api/admin/grant-access: school admin upsert failed:", adminError.message);
            return res
              .status(500)
              .json({ error: `School saved, but its admin could not be set (failing closed). ${schoolTablesHint}` });
          }
        }

        return res.status(200).json({
          message: created
            ? `Created ${school.name}${newAdmin ? ` — ${newAdmin} is its school admin` : ""}.`
            : `${school.name} already existed${newAdmin ? ` — ${newAdmin} is now its school admin` : ""}.`,
          school: { id: school.id, name: school.name },
          created,
          admin: newAdmin || null,
        });
      }

      if (action === "school-admin") {
        const target = pickSchool();
        if (!target) {
          return res.status(400).json({
            error: "Unknown school: pass schoolId or schoolName (create it first with school-create).",
          });
        }
        const adminTarget = cleanEmail(email) || cleanEmail(adminEmail);
        if (!adminTarget) {
          return res.status(400).json({ error: "Missing required field: email (the school admin's email)" });
        }
        const invalidAdmin = emailProblem(adminTarget);
        if (invalidAdmin) {
          return res.status(400).json({ error: `School admin email: ${invalidAdmin} (${adminTarget})` });
        }

        if (remove) {
          const { data: removedRows, error: removeError } = await supabase
            .from("school_admins")
            .delete()
            .eq("school_id", target.id)
            .eq("email", adminTarget)
            .select("email");
          if (removeError) {
            console.error("API /api/admin/grant-access: school admin delete failed:", removeError.message);
            return res
              .status(500)
              .json({ error: `Could not remove the school admin (failing closed). ${schoolTablesHint}` });
          }
          return res.status(200).json({
            message: `${adminTarget} no longer administers ${target.name}.`,
            removed: (removedRows || []).map((r) => r.email),
          });
        }

        const { error: adminError } = await supabase
          .from("school_admins")
          .upsert([{ school_id: target.id, email: adminTarget }], { onConflict: "email" });
        if (adminError) {
          console.error("API /api/admin/grant-access: school admin upsert failed:", adminError.message);
          return res
            .status(500)
            .json({ error: `Could not set the school admin (failing closed). ${schoolTablesHint}` });
        }
        return res.status(200).json({
          message: `${adminTarget} now administers ${target.name}.`,
          school: { id: target.id, name: target.name },
          email: adminTarget,
        });
      }

      // action === "school-member" — add, re-role, or remove one person.
      const target = pickSchool();
      if (!target) {
        return res.status(400).json({
          error: "Unknown school: pass schoolId or schoolName (create it first with school-create).",
        });
      }
      const memberEmail = cleanEmail(email);
      if (!memberEmail) {
        return res.status(400).json({ error: "Missing required field: email" });
      }
      const memberProblem = rosterProblem(memberEmail);
      if (memberProblem) {
        return res.status(400).json({ error: `Roster email: ${memberProblem} (${memberEmail})` });
      }

      const wantedRole =
        typeof role === "string" && role.trim() ? role.trim().toLowerCase() : "student";
      if (wantedRole !== "teacher" && wantedRole !== "student") {
        return res.status(400).json({ error: 'role must be "teacher" or "student"' });
      }

      if (remove) {
        const { data: memberRow, error: memberError } = await supabase
          .from("school_members")
          .select("email,role")
          .eq("school_id", target.id)
          .eq("email", memberEmail)
          .maybeSingle();
        if (memberError) {
          console.error("API /api/admin/grant-access: school member lookup failed:", memberError.message);
          return res.status(500).json({ error: `Schools unavailable (failing closed). ${schoolTablesHint}` });
        }
        if (!memberRow) {
          return res.status(400).json({ error: `${memberEmail} is not on ${target.name}'s roster.` });
        }

        const result = await removeSchoolMember(supabase, target.id, memberEmail);
        if (result.error) {
          console.error("API /api/admin/grant-access: school member removal failed:", result.error.message);
          return res
            .status(500)
            .json({ error: `Could not remove the member (failing closed). ${schoolTablesHint}` });
        }
        return res.status(200).json({
          message: `Removed ${memberEmail} from ${target.name}${
            result.removedLinks ? ` and unlinked ${result.removedLinks} class link(s)` : ""
          }.`,
          removedLinks: result.removedLinks,
          role: memberRow.role,
        });
      }

      const { error: memberUpsertError } = await supabase
        .from("school_members")
        .upsert([{ school_id: target.id, email: memberEmail, role: wantedRole }], {
          onConflict: "school_id,email",
        });
      if (memberUpsertError) {
        console.error("API /api/admin/grant-access: school member upsert failed:", memberUpsertError.message);
        return res
          .status(500)
          .json({ error: `Could not add the member (failing closed). ${schoolTablesHint}` });
      }
      return res.status(200).json({
        message: `Added ${memberEmail} to ${target.name} as a ${wantedRole}.`,
        school: { id: target.id, name: target.name },
        member: { email: memberEmail, role: wantedRole },
      });
    }

    // ------------------------------------------- SCHOOL ADMIN (own school only)
    // What the school's own designated admin can do — and the whole of it.
    // `callerSchoolId` was taken from their school_admins row above; nothing in
    // the body is consulted. So: no other school's roster, members or links are
    // reachable, and owner-created platform links (school_id NULL) can neither
    // be seen nor removed.
    //
    // Deliberately absent: any student progress. A school admin manages WHO is
    // linked, never what anyone did. Progress stays behind
    // api/analytics/summary.js and its TEACHER_EMAILS gate.
    //
    //   { action: "school-roster" }        -> school + roster + own links
    //   { action: "school-link",   teacherEmail, email | emails }
    //   { action: "school-unlink", teacherEmail, email | emails }
    //   { action: "school-member-add",    email, role: "teacher" | "student" }
    //   { action: "school-member-remove", email }
    if (callerSchoolId) {
      const schoolTablesHint =
        "Ensure the `schools`, `school_admins` and `school_members` tables exist — see supabase/schema.sql.";

      const { data: schoolRow, error: schoolReadError } = await supabase
        .from("schools")
        .select("id,name")
        .eq("id", callerSchoolId)
        .maybeSingle();
      if (schoolReadError || !schoolRow) {
        console.error(
          "API /api/admin/grant-access: school read failed:",
          schoolReadError?.message || "no school row"
        );
        return res.status(500).json({ error: `School lookup failed (failing closed). ${schoolTablesHint}` });
      }
      const school = { id: schoolRow.id, name: schoolRow.name };

      if (action === "school-roster") {
        const { data: memberRows, error: memberError } = await supabase
          .from("school_members")
          .select("email,role")
          .eq("school_id", callerSchoolId)
          .limit(2000);
        if (memberError) {
          console.error("API /api/admin/grant-access: school roster lookup failed:", memberError.message);
          return res.status(500).json({ error: `School roster unavailable (failing closed). ${schoolTablesHint}` });
        }

        const members = memberRows;
        const teachers = members
          .filter((m) => m.role === "teacher")
          .map((m) => cleanEmail(m.email))
          .sort();
        const students = members
          .filter((m) => m.role === "student")
          .map((m) => cleanEmail(m.email))
          .sort();

        // Only links that involve one of THIS school's own teachers are ever
        // read — the query itself is scoped, so another school's rows are not
        // fetched even to be discarded. Each row is then split by who created
        // it: this school's own, the owner's platform-wide ones (school_id
        // NULL), and any that belong to a different school. Only the first
        // group is listed — and only that group can be unlinked from here.
        let linkRows = [];
        if (teachers.length > 0) {
          const { data: linkData, error: linkError } = await supabase
            .from("teacher_students")
            .select("id,teacher_email,student_email,created_at,school_id")
            .in("teacher_email", teachers)
            .limit(5000);
          if (linkError) {
            console.error("API /api/admin/grant-access: school link lookup failed:", linkError.message);
            return res.status(500).json({ error: `School roster unavailable (failing closed). ${schoolTablesHint}` });
          }
          linkRows = linkData || [];
        }

        const own = linkRows.filter((l) => l.school_id === callerSchoolId);
        const platform = linkRows.filter((l) => !l.school_id);
        const elsewhere = linkRows.filter((l) => l.school_id && l.school_id !== callerSchoolId);

        return res.status(200).json({
          school,
          schoolAdmin: callerEmail,
          teachers,
          students,
          links: own.map((l) => ({
            id: l.id,
            teacherEmail: cleanEmail(l.teacher_email),
            studentEmail: cleanEmail(l.student_email),
            createdAt: l.created_at || null,
          })),
          linkCount: own.length,
          platformLinkCount: platform.length,
          otherSchoolLinkCount: elsewhere.length,
          note:
            platform.length > 0 || elsewhere.length > 0
              ? "Only the links your school created are listed and can be removed here. Links created by CSEC Compass itself, or by another school, show as counts only — ask the platform owner if one of those needs to change."
              : null,
        });
      }

      if (action === "school-link" || action === "school-unlink") {
        const teacherEmail = cleanEmail(req.body?.teacherEmail ?? req.body?.teacher_email);
        const students = targetEmails;
        if (!teacherEmail || students.length === 0) {
          return res.status(400).json({
            error: "Missing required fields: teacherEmail and email (or an emails array)",
          });
        }
        if (students.length > 500) {
          return res.status(400).json({ error: "Too many students in one call — link up to 500 at a time." });
        }

        if (action === "school-unlink") {
          const { data: removedRows, error: unlinkError } = await supabase
            .from("teacher_students")
            .delete()
            .eq("school_id", callerSchoolId)
            .eq("teacher_email", teacherEmail)
            .in("student_email", students)
            .select("student_email");
          if (unlinkError) {
            console.error("API /api/admin/grant-access: school unlink failed:", unlinkError.message);
            return res.status(500).json({ error: `Unlinking failed (failing closed). ${schoolTablesHint}` });
          }
          const removed = (removedRows || []).map((r) => cleanEmail(r.student_email));
          return res.status(200).json({
            message: removed.length
              ? `Unlinked ${removed.length} student(s) from ${teacherEmail} in ${school.name}.`
              : `Nothing to unlink: ${teacherEmail} has no ${school.name} link to those student(s).`,
            school: school.name,
            removed,
            notRemoved: students.filter((e) => !removed.includes(e)),
            note:
              "Only links this school created can be removed here. A link created by CSEC Compass itself stays until the platform owner removes it.",
          });
        }

        // school-link — both sides must be on THIS school's roster.
        const { data: memberRows, error: memberError } = await supabase
          .from("school_members")
          .select("email,role")
          .eq("school_id", callerSchoolId)
          .limit(2000);
        if (memberError) {
          console.error("API /api/admin/grant-access: roster lookup failed:", memberError.message);
          return res.status(500).json({ error: `School roster unavailable (failing closed). ${schoolTablesHint}` });
        }
        const roleByEmail = new Map((memberRows || []).map((m) => [cleanEmail(m.email), m.role]));

        if (roleByEmail.get(teacherEmail) !== "teacher") {
          return res.status(400).json({
            error: `${teacherEmail} is not one of ${school.name}'s teachers. Add them to the roster as a teacher first — a link can only join two people in your own school.`,
          });
        }

        const notInSchool = students.filter((e) => !roleByEmail.has(e));
        const inSchool = students.filter((e) => roleByEmail.has(e));
        if (inSchool.length === 0) {
          return res.status(400).json({
            error: `None of those students are on ${school.name}'s roster, so nothing was linked.`,
            notInSchool,
          });
        }

        // The same pair can exist only once (unique index on teacher + student),
        // so say honestly what is already there — including links the school did
        // not create.
        const { data: existingRows, error: existingError } = await supabase
          .from("teacher_students")
          .select("student_email,school_id")
          .eq("teacher_email", teacherEmail)
          .in("student_email", inSchool);
        if (existingError) {
          console.error("API /api/admin/grant-access: existing links lookup failed:", existingError.message);
          return res.status(500).json({ error: `Linking failed (failing closed). ${schoolTablesHint}` });
        }
        const alreadyOwn = [];
        const alreadyPlatform = [];
        const alreadyElsewhere = [];
        for (const row of existingRows || []) {
          const student = cleanEmail(row.student_email);
          if (!row.school_id) alreadyPlatform.push(student);
          else if (row.school_id === callerSchoolId) alreadyOwn.push(student);
          else alreadyElsewhere.push(student);
        }
        const skip = new Set([...alreadyOwn, ...alreadyPlatform, ...alreadyElsewhere]);
        const toInsert = inSchool.filter((e) => !skip.has(e));

        if (toInsert.length > 0) {
          // school_id is stamped here and only here — never from the request.
          const { error: insertError } = await supabase
            .from("teacher_students")
            .upsert(
              toInsert.map((student_email) => ({
                teacher_email: teacherEmail,
                student_email,
                school_id: callerSchoolId,
              })),
              { onConflict: "teacher_email,student_email", ignoreDuplicates: true }
            );
          if (insertError) {
            console.error("API /api/admin/grant-access: school link failed:", insertError.message);
            return res.status(500).json({ error: `Linking failed (failing closed). ${schoolTablesHint}` });
          }
        }

        // Informational only — a student may be linked before they sign up.
        let withoutAccount = [];
        let warning = null;
        try {
          const allUsers = await fetchAllUsers(supabase);
          const known = new Set(allUsers.filter((u) => u.email).map((u) => u.email.toLowerCase()));
          withoutAccount = inSchool.filter((e) => !known.has(e));
        } catch {
          warning =
            "Linked, but the account list could not be read — so which of these students have signed up yet is unknown.";
        }

        const parts = [`Linked ${toInsert.length} student(s) to ${teacherEmail} in ${school.name}.`];
        if (alreadyOwn.length) parts.push(`${alreadyOwn.length} were already linked by this school.`);
        if (alreadyPlatform.length) {
          parts.push(`${alreadyPlatform.length} were already linked by CSEC Compass itself.`);
        }
        if (alreadyElsewhere.length) parts.push(`${alreadyElsewhere.length} are linked under another school.`);
        if (notInSchool.length) parts.push(`${notInSchool.length} are not on the roster.`);

        return res.status(200).json({
          message: parts.join(" "),
          school: { id: school.id, name: school.name },
          linked: toInsert,
          alreadyLinked: alreadyOwn,
          alreadyLinkedPlatform: alreadyPlatform,
          linkedElsewhere: alreadyElsewhere,
          notInSchool,
          withoutAccount,
          warning,
        });
      }

      if (action === "school-member-add") {
        const memberEmail = cleanEmail(email);
        if (!memberEmail) {
          return res.status(400).json({ error: "Missing required field: email" });
        }
        const memberProblem = rosterProblem(memberEmail);
        if (memberProblem) {
          return res.status(400).json({ error: `Roster email: ${memberProblem} (${memberEmail})` });
        }
        const wantedRole =
          typeof role === "string" && role.trim() ? role.trim().toLowerCase() : "student";
        if (wantedRole !== "teacher" && wantedRole !== "student") {
          return res.status(400).json({ error: 'role must be "teacher" or "student"' });
        }

        const { error: upsertError } = await supabase
          .from("school_members")
          .upsert([{ school_id: callerSchoolId, email: memberEmail, role: wantedRole }], {
            onConflict: "school_id,email",
          });
        if (upsertError) {
          console.error("API /api/admin/grant-access: roster upsert failed:", upsertError.message);
          return res.status(500).json({ error: `Could not update the roster (failing closed). ${schoolTablesHint}` });
        }
        return res.status(200).json({
          message: `Added ${memberEmail} to ${school.name} as a ${wantedRole}.`,
          school: { id: school.id, name: school.name },
          member: { email: memberEmail, role: wantedRole },
        });
      }

      if (action === "school-member-remove") {
        const memberEmail = cleanEmail(email);
        if (!memberEmail) {
          return res.status(400).json({ error: "Missing required field: email" });
        }
        const { data: memberRow, error: memberError } = await supabase
          .from("school_members")
          .select("email,role")
          .eq("school_id", callerSchoolId)
          .eq("email", memberEmail)
          .maybeSingle();
        if (memberError) {
          console.error("API /api/admin/grant-access: roster lookup failed:", memberError.message);
          return res.status(500).json({ error: `School roster unavailable (failing closed). ${schoolTablesHint}` });
        }
        if (!memberRow) {
          return res.status(400).json({ error: `${memberEmail} is not on ${school.name}'s roster.` });
        }

        const result = await removeSchoolMember(supabase, callerSchoolId, memberEmail);
        if (result.error) {
          console.error("API /api/admin/grant-access: roster removal failed:", result.error.message);
          return res.status(500).json({ error: `Could not update the roster (failing closed). ${schoolTablesHint}` });
        }
        return res.status(200).json({
          message: `Removed ${memberEmail} from ${school.name}${
            result.removedLinks ? ` and unlinked ${result.removedLinks} class link(s)` : ""
          }.`,
          school: { id: school.id, name: school.name },
          removedLinks: result.removedLinks,
          role: memberRow.role,
        });
      }

      // Every school-scoped action is handled above, so reaching here means a
      // new one was added to SCHOOL_SCOPED_ACTIONS without a branch. Fail
      // closed rather than fall through to the owner actions below.
      return res.status(400).json({ error: `Unhandled school action: ${action}` });
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
