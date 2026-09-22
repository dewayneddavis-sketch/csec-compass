// GET /api/analytics/summary?subjectId=<subjectId>
// Returns the caller's quiz-result history for one subject, grouped by
// attempt, so the client can aggregate weak topics (per-question `topic`
// lesson ids), compute per-attempt scores/pass rates, and trend pass rate
// over time.
// NOTE: self-contained (inlines Supabase client init) — api/_lib/* imports
// crash on Vercel with FUNCTION_INVOCATION_FAILED (see api/auth/user.js).
import { createClient } from "@supabase/supabase-js";

// Page through auth users (email -> account id). supabase.auth.admin.listUsers()
// defaults to perPage 50, which silently truncates the map — the same bug that
// broke bulk grants once the pilot class passed 50 accounts.
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

const csv = (value, fallback = "") =>
  (value || fallback)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

function roundPct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

// ---- shared per-student aggregation ----------------------------------------
// Both dashboards render the SAME per-student, per-subject summary — lessons
// marked complete, interactive labs opened and completed, Extra Practice / Mock
// Exam / Knowledge Check attempts with best and latest scores, and when the
// student was last active — so the aggregation lives here once and the teacher
// dashboard (?scope=class) and the parent dashboard (?scope=parent) cannot drift
// apart. The raw per-question rows never leave the server.
//
// `links` are the rows that say who may see whom; `ownerField` names the column
// holding the dashboard owner's email and `rosterKey` the key the route returns
// it under (teacherEmail / parentEmail), so each scope keeps its own vocabulary
// while the payload shape stays identical.
async function buildStudentSummaries(supabase, links, { rosterKey, ownerField }) {
  const warnings = [];
  const users = await fetchAllUsers(supabase);
  const idByEmail = new Map(
    users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u.id])
  );
  const emailById = new Map(
    users.filter((u) => u.email).map((u) => [u.id, u.email.toLowerCase()])
  );

  const roster = (links || []).map((l) => ({
    [rosterKey]: l[ownerField],
    email: l.student_email,
    userId: idByEmail.get(String(l.student_email).toLowerCase()) || null,
  }));
  const studentIds = [...new Set(roster.map((r) => r.userId).filter(Boolean))];
  if (roster.some((r) => !r.userId)) {
    warnings.push("Some linked students have not created an account yet — they are listed without progress.");
  }

  if (studentIds.length === 0) {
    return { students: [], roster, warnings, studentIds };
  }

  const [quizRes, progressRes, labRes] = await Promise.all([
    supabase
      .from("quiz_results")
      .select("user_id,subject_id,quiz_type,attempt_id,question_id,correct,created_at")
      .in("user_id", studentIds)
      .order("created_at", { ascending: true })
      .limit(50000),
    supabase
      .from("user_progress")
      .select("user_id,subject_id,completed_lessons,quiz_completed,updated_at")
      .in("user_id", studentIds),
    supabase
      .from("lab_activity")
      .select("user_id,subject_id,lesson_id,experiment_type,opens,completed,last_activity_at")
      .in("user_id", studentIds),
  ]);

  if (quizRes.error) {
    console.error("API /api/analytics/summary: quiz_results lookup failed:", quizRes.error.message);
    return { error: "Progress analytics lookup failed (failing closed).", roster, warnings };
  }
  if (progressRes.error) {
    // user_progress predates these dashboards; treat it as optional data.
    warnings.push("Lesson-completion records are unavailable right now — quiz and lab data is still shown.");
    console.error("API /api/analytics/summary: user_progress lookup failed:", progressRes.error.message);
  }
  if (labRes.error) {
    warnings.push("Lab activity is not being recorded yet (apply supabase/schema.sql).");
    console.error("API /api/analytics/summary: lab_activity lookup failed:", labRes.error.message);
  }

  const byStudent = new Map();
  function studentEntry(userId) {
    let s = byStudent.get(userId);
    if (!s) {
      s = {
        userId,
        email: emailById.get(userId) || null,
        subjects: new Map(),
        lastActivityAt: null,
      };
      byStudent.set(userId, s);
    }
    return s;
  }
  function subjectEntry(student, subjectId) {
    let subj = student.subjects.get(subjectId);
    if (!subj) {
      subj = {
        subjectId,
        lessonsCompleted: 0,
        quizCompleted: false,
        attempts: { "knowledge-check": 0, practice: 0, mock: 0 },
        lastPct: { "knowledge-check": null, practice: null, mock: null },
        bestPct: { "knowledge-check": null, practice: null, mock: null },
        passed: { "knowledge-check": 0, practice: 0, mock: 0 },
        labs: { opened: 0, completed: 0, tracked: 0, lessons: [] },
        lastActivityAt: null,
      };
      student.subjects.set(subjectId, subj);
    }
    return subj;
  }
  function touch(student, subj, at) {
    if (!at) return;
    if (!student.lastActivityAt || at > student.lastActivityAt) student.lastActivityAt = at;
    if (!subj.lastActivityAt || at > subj.lastActivityAt) subj.lastActivityAt = at;
  }

  // Quiz attempts: one attempt = many question rows; score it then count it once.
  const attempts = new Map();
  for (const row of quizRes.data || []) {
    const key = row.attempt_id || `${row.user_id}|${row.subject_id}|${row.quiz_type}|${row.created_at}`;
    let attempt = attempts.get(key);
    if (!attempt) {
      attempt = {
        userId: row.user_id,
        subjectId: row.subject_id,
        quizType: row.quiz_type,
        correct: 0,
        total: 0,
        createdAt: row.created_at,
      };
      attempts.set(key, attempt);
    }
    attempt.total += 1;
    if (row.correct) attempt.correct += 1;
  }
  for (const attempt of attempts.values()) {
    const student = studentEntry(attempt.userId);
    const subj = subjectEntry(student, attempt.subjectId);
    const type = attempt.quizType;
    const pct = roundPct(attempt.correct, attempt.total);
    if (subj.attempts[type] === undefined) {
      subj.attempts[type] = 0;
      subj.lastPct[type] = null;
      subj.bestPct[type] = null;
      subj.passed[type] = 0;
    }
    subj.attempts[type] += 1;
    subj.lastPct[type] = pct;
    subj.bestPct[type] = subj.bestPct[type] === null ? pct : Math.max(subj.bestPct[type], pct);
    if (pct >= 60) subj.passed[type] += 1;
    touch(student, subj, attempt.createdAt);
  }

  for (const row of progressRes.data || []) {
    const student = studentEntry(row.user_id);
    const subj = subjectEntry(student, row.subject_id);
    subj.lessonsCompleted = Array.isArray(row.completed_lessons) ? row.completed_lessons.length : 0;
    subj.quizCompleted = !!row.quiz_completed;
    touch(student, subj, row.updated_at);
  }

  for (const row of labRes.data || []) {
    const student = studentEntry(row.user_id);
    const subj = subjectEntry(student, row.subject_id);
    subj.labs.opened += row.opens || 0;
    subj.labs.tracked += 1;
    if (row.completed) subj.labs.completed += 1;
    subj.labs.lessons.push({
      lessonId: row.lesson_id,
      experimentType: row.experiment_type || null,
      opens: row.opens || 0,
      completed: !!row.completed,
      lastActivityAt: row.last_activity_at || null,
    });
    touch(student, subj, row.last_activity_at);
  }

  const students = studentIds.map((id) => {
    const s = byStudent.get(id) || studentEntry(id);
    const subjects = [...s.subjects.values()]
      .map((subj) => ({
        ...subj,
        labs: {
          ...subj.labs,
          lessons: subj.labs.lessons.sort((a, b) => String(a.lessonId).localeCompare(String(b.lessonId))),
        },
      }))
      .sort((a, b) => a.subjectId.localeCompare(b.subjectId));
    return {
      userId: s.userId,
      email: s.email,
      lastActivityAt: s.lastActivityAt,
      subjects,
      totals: {
        subjectsStarted: subjects.length,
        lessonsCompleted: subjects.reduce((n, x) => n + x.lessonsCompleted, 0),
        labsOpened: subjects.reduce((n, x) => n + x.labs.opened, 0),
        labsCompleted: subjects.reduce((n, x) => n + x.labs.completed, 0),
        quizAttempts: subjects.reduce(
          (n, x) => n + x.attempts["knowledge-check"] + x.attempts.practice + x.attempts.mock,
          0
        ),
      },
    };
  });

  const inactive = students.filter((s) => !s.lastActivityAt).map((s) => s.email);
  if (inactive.length > 0) warnings.push(`${inactive.length} linked student(s) have no recorded activity yet.`);

  return { students, roster, warnings, studentIds };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("API /api/analytics/summary misconfigured — missing supabase server credentials");
    return res.status(500).json({ error: "Server misconfigured: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify token and resolve the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid token" });

    // ------------------------------------------------------------- TEACHER
    // GET /api/analytics/summary?scope=class — the teacher dashboard.
    //
    // Access, in this order (any one is enough):
    //   1. the caller is the owner (OWNER_EMAILS) — may open any class;
    //   2. the caller is in the teacher allowlist (TEACHER_EMAIL, or the older
    //      TEACHER_EMAILS — both are read so nothing has to be renamed in
    //      Vercel);
    //   3. the caller is a TEACHER ON A SCHOOL'S ROSTER (`school_members.role =
    //      'teacher'`). This is the owner's model for a school that bought a
    //      licence: its own admin adds the school's teachers at /school, and
    //      every one of them may open their dashboard without the owner editing
    //      an env var;
    //   4. the caller is NAMED AS A TEACHER in `teacher_students` — a row only
    //      exists because the owner made it, a designated school admin made it
    //      inside their own school, or the teacher linked their own students.
    //      Being linked IS an authorization step. This rule also keeps the
    //      teachers who were verified live before schools existed working.
    //
    // Anyone else gets 403 and ZERO student data — this fails closed, like every
    // other access check in the platform.
    //
    // Scope: a teacher sees exactly the students linked to them — never the whole
    // platform, never another teacher's class. The owner may pass ?teacher=<email>
    // to open any single class, and gets every class when no teacher is named.
    //
    // Data is aggregated server-side into a compact per-student, per-subject
    // summary; the raw per-question rows never leave the server.
    if (req.query.scope === "class") {
      const callerEmail = (user.email || "").toLowerCase();
      const teacherEmails = csv(process.env.TEACHER_EMAIL || process.env.TEACHER_EMAILS);
      const ownerEmails = csv(process.env.OWNER_EMAILS, "dewayneddavis@gmail.com");
      const isOwner = ownerEmails.includes(callerEmail);

      let access = isOwner ? "owner" : teacherEmails.includes(callerEmail) ? "allowlist" : null;

      if (!access) {
        // Rule 3 — is this email a teacher on a school's roster? The roster is
        // written by the school's own admin (or the owner) at /school. Read-only,
        // and only the role on the caller's own row matters.
        //
        // A missing `school_members` table is not an error here: it is a database
        // that predates the schooling tables, and rules 1, 2 and 4 must keep
        // working on it — so it is logged and treated as "not a school teacher"
        // rather than failing the dashboard closed for everyone.
        const { data: rosterRows, error: rosterError } = await supabase
          .from("school_members")
          .select("role")
          .eq("email", callerEmail)
          .limit(50);
        if (rosterError) {
          console.warn(
            "API /api/analytics/summary: school_members lookup failed — treating the caller as not school-designated:",
            rosterError.message
          );
        } else if ((rosterRows || []).some((m) => String(m.role || "").toLowerCase() === "teacher")) {
          access = "school";
        }
      }

      if (!access) {
        // Rule 4 — are they a teacher on anyone's link? Read-only, and only the
        // row's existence matters, so this leaks nothing to the caller.
        const { data: linkedRows, error: linkedError } = await supabase
          .from("teacher_students")
          .select("teacher_email")
          .eq("teacher_email", callerEmail)
          .limit(1);
        if (linkedError) {
          console.error("API /api/analytics/summary: teacher_students lookup failed:", linkedError.message);
          return res.status(500).json({
            error:
              "Class lookup failed (failing closed). Ensure the `teacher_students` table exists — see supabase/schema.sql.",
          });
        }
        if ((linkedRows || []).length > 0) access = "linked";
      }

      if (!access) {
        return res.status(403).json({
          error:
            "Forbidden: teacher access required. Ask your school's admin to add your email to your school's teacher roster (or the account owner to add it to the teacher list), and sign in again.",
        });
      }

      const teacherFilter = isOwner
        ? req.query.teacher
          ? String(req.query.teacher).toLowerCase()
          : null
        : callerEmail;

      let linkQuery = supabase.from("teacher_students").select("teacher_email,student_email");
      if (teacherFilter) linkQuery = linkQuery.eq("teacher_email", teacherFilter);
      const { data: links, error: linkError } = await linkQuery;
      if (linkError) {
        console.error("API /api/analytics/summary: teacher_students lookup failed:", linkError.message);
        return res.status(500).json({
          error:
            "Class lookup failed (failing closed). Ensure the `teacher_students` table exists — see supabase/schema.sql.",
        });
      }

      const built = await buildStudentSummaries(supabase, links || [], {
        rosterKey: "teacherEmail",
        ownerField: "teacher_email",
      });
      if (built.error) {
        console.error("API /api/analytics/summary: class analytics failed:", built.error);
        return res.status(500).json({ error: built.error });
      }

      const { students, roster, warnings } = built;
      return res.status(200).json({
        scope: "class",
        teacher: teacherFilter || "all",
        students,
        roster,
        warnings,
        counts: {
          students: roster.length,
          withProgress: students.filter((s) => s.totals.quizAttempts > 0 || s.totals.lessonsCompleted > 0).length,
        },
      });
    }

    // ---------------------------------------------------------------- PARENT
    // GET /api/analytics/summary?scope=parent — the parent dashboard.
    //
    // A parent↔child link exists ONLY because a parent bought a single subject
    // or the all-subjects bundle and named their child's email at checkout; the
    // Stripe webhook writes that row (api/stripe/webhook.js). There is no roster,
    // no approval step and no owner action — so the only question here is: is the
    // caller named as a parent in `parent_students`?
    //
    // Anyone else gets 403 and ZERO student data (fails closed, like every other
    // access check in the platform). Scope: a parent sees exactly the children
    // linked to them — never another family. The owner may pass ?parent=<email>
    // to open one family, and sees every family when no parent is named,
    // mirroring ?scope=class.
    //
    // The payload is deliberately the SAME shape as ?scope=class (same
    // aggregation, same per-student/per-subject fields) so the parent dashboard
    // shows a parent exactly what a teacher sees, under its own vocabulary.
    if (req.query.scope === "parent") {
      const callerEmail = (user.email || "").toLowerCase();
      const ownerEmails = csv(process.env.OWNER_EMAILS, "dewayneddavis@gmail.com");
      const isOwner = ownerEmails.includes(callerEmail);

      let access = isOwner ? "owner" : null;

      if (!access) {
        // Read-only, and only the existence of the caller's OWN row matters.
        const { data: linkRows, error: linkLookupError } = await supabase
          .from("parent_students")
          .select("parent_email")
          .eq("parent_email", callerEmail)
          .limit(1);
        if (linkLookupError) {
          console.error("API /api/analytics/summary: parent_students lookup failed:", linkLookupError.message);
          return res.status(500).json({
            error:
              "Family lookup failed (failing closed). Ensure the `parent_students` table exists — see supabase/schema.sql.",
          });
        }
        if ((linkRows || []).length > 0) access = "parent";
      }

      if (!access) {
        return res.status(403).json({
          error:
            "Forbidden: this dashboard is for a parent who linked a child when they bought a course. Buy a subject or the all-subjects bundle and add your child's email at checkout.",
        });
      }

      const parentFilter = isOwner
        ? req.query.parent
          ? String(req.query.parent).toLowerCase()
          : null
        : callerEmail;

      let linkQuery = supabase.from("parent_students").select("parent_email,student_email");
      if (parentFilter) linkQuery = linkQuery.eq("parent_email", parentFilter);
      const { data: links, error: linkError } = await linkQuery;
      if (linkError) {
        console.error("API /api/analytics/summary: parent_students lookup failed:", linkError.message);
        return res.status(500).json({
          error:
            "Family lookup failed (failing closed). Ensure the `parent_students` table exists — see supabase/schema.sql.",
        });
      }

      const built = await buildStudentSummaries(supabase, links || [], {
        rosterKey: "parentEmail",
        ownerField: "parent_email",
      });
      if (built.error) {
        console.error("API /api/analytics/summary: family analytics failed:", built.error);
        return res.status(500).json({ error: built.error });
      }

      return res.status(200).json({
        scope: "parent",
        parent: parentFilter || "all",
        students: built.students,
        roster: built.roster,
        warnings: built.warnings,
        counts: {
          students: built.roster.length,
          withProgress: built.students.filter((s) => s.totals.quizAttempts > 0 || s.totals.lessonsCompleted > 0).length,
        },
      });
    }

    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: "subjectId query param required" });

    const { data: rows, error: dbError } = await supabase
      .from("quiz_results")
      .select("attempt_id, quiz_type, question_id, topic, correct, created_at")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: true });

    if (dbError) {
      console.error("API /api/analytics/summary: quiz_results lookup failed:", dbError.message);
      return res.status(500).json({
        error: "Analytics lookup failed (failing closed). Ensure the `quiz_results` table exists — see supabase/schema.sql.",
      });
    }

    // Group rows by attempt (created_at of the attempt = first row's time)
    const attempts = [];
    const byAttempt = new Map();
    for (const row of rows || []) {
      let entry = byAttempt.get(row.attempt_id);
      if (!entry) {
        entry = { attemptId: row.attempt_id, quizType: row.quiz_type, createdAt: row.created_at, results: [] };
        byAttempt.set(row.attempt_id, entry);
        attempts.push(entry);
      }
      entry.results.push({
        questionId: row.question_id,
        topic: row.topic,
        correct: row.correct,
      });
    }

    // Basic attempt metadata (score/total/pass) — client computes trend UI
    const enriched = attempts.map((a) => {
      const total = a.results.length;
      const score = a.results.filter((r) => r.correct).length;
      return {
        attemptId: a.attemptId,
        quizType: a.quizType,
        createdAt: a.createdAt,
        score,
        total,
        pct: total > 0 ? Math.round((score / total) * 100) : 0,
        passed: total > 0 && (score / total) >= 0.6,
        results: a.results,
      };
    });

    // Weak-topic aggregation across ALL attempts for this subject:
    // per-question rows carry the lesson id in `topic`; count correct/wrong
    // per topic. Client maps topic -> lesson title for the revision path.
    const topicAgg = new Map();
    for (const row of rows || []) {
      if (!row.topic) continue;
      let t = topicAgg.get(row.topic);
      if (!t) { t = { topic: row.topic, correct: 0, wrong: 0 }; topicAgg.set(row.topic, t); }
      if (row.correct) t.correct += 1; else t.wrong += 1;
    }
    const topics = Array.from(topicAgg.values())
      .map((t) => ({
        topic: t.topic,
        correct: t.correct,
        wrong: t.wrong,
        total: t.correct + t.wrong,
        accuracy: t.correct + t.wrong > 0 ? Math.round((t.correct / (t.correct + t.wrong)) * 100) : 0,
      }))
      // Weakest first: lowest accuracy, then most wrong attempts
      .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong);

    return res.status(200).json({ attempts: enriched, topics });
  } catch (err) {
    console.error("API /api/analytics/summary error:", err);
    return res.status(500).json({ error: "Analytics lookup failed — failing closed." });
  }
}