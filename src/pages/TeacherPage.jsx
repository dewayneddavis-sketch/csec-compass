import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { experimentTypes } from "../data/contentLoader";
import { experimentLabel, labLessonPath, loadLessonNameIndex, subjectName } from "../data/lessonNames";
import "./TeacherPage.css";

// Teacher progress dashboard.
//
// Shows one class: every student the owner linked to this teacher, with their
// progress per subject — lessons marked complete, interactive labs opened and
// completed, Extra Practice / Mock Exam / Knowledge Check attempts with best and
// latest scores, and when they were last active.
//
// Access is decided entirely by the server (GET /api/analytics/summary?scope=class):
// the caller must be in TEACHER_EMAILS (or be the owner), and only students the
// owner linked to that exact teacher are returned. This page never asks for a
// roster of its own and shows nothing when the server says no.

const QUIZ_LABELS = {
  "knowledge-check": "Knowledge Check",
  practice: "Extra Practice",
  mock: "Mock Exam",
};

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString();
}

function QuizCells({ subject }) {
  return (
    <div className="tp-quiz-grid">
      {Object.keys(QUIZ_LABELS).map((type) => {
        const attempts = subject.attempts?.[type] || 0;
        const best = subject.bestPct?.[type];
        const last = subject.lastPct?.[type];
        const passed = subject.passed?.[type] || 0;
        return (
          <div key={type} className={"tp-quiz-cell " + (attempts > 0 ? "has-data" : "")}>
            <span className="tp-quiz-name">{QUIZ_LABELS[type]}</span>
            {attempts > 0 ? (
              <>
                <span className="tp-quiz-score">
                  best <strong>{best}%</strong> · last {last}%
                </span>
                <span className={"tp-quiz-pass " + (passed > 0 ? "ok" : "warn")}>
                  {passed > 0 ? `${passed} pass${passed === 1 ? "" : "es"}` : "not passed yet"} / {attempts} attempt{attempts === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="tp-quiz-score tp-muted">not attempted</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubjectCard({ subject, nameIndex }) {
  const labs = subject.labs || { opened: 0, completed: 0, lessons: [] };
  const completedLabs = (labs.lessons || []).filter((l) => l.completed);
  const openedOnly = (labs.lessons || []).filter((l) => !l.completed);
  return (
    <div className="tp-subject">
      <div className="tp-subject-head">
        <strong>{subjectName(subject.subjectId, nameIndex) || subject.subjectId}</strong>
        <span className="tp-muted">last active {formatWhen(subject.lastActivityAt)}</span>
      </div>
      <div className="tp-subject-stats">
        <span>📘 {subject.lessonsCompleted} lesson{subject.lessonsCompleted === 1 ? "" : "s"} complete</span>
        {subject.quizCompleted && <span className="tp-badge-ok">Knowledge Check finished</span>}
        <span>
          🧪 {labs.opened} lab open{labs.opened === 1 ? "" : "s"} · {completedLabs.length} lab
          {completedLabs.length === 1 ? "" : "s"} completed
        </span>
      </div>
      <QuizCells subject={subject} />
      {(completedLabs.length > 0 || openedOnly.length > 0) && (
        <details className="tp-labs">
          <summary>Lab detail ({labs.lessons.length} lesson{labs.lessons.length === 1 ? "" : "s"} with lab activity)</summary>
          <ul>
            {completedLabs.map((l) => (
              <li key={l.lessonId}>
                <span className="tp-lab-done">✅</span> {labLessonPath(subject.subjectId, l.lessonId, nameIndex)}
                {l.experimentType && <span className="tp-lab-type"> · {experimentLabel(l.experimentType, experimentTypes)}</span>}
                <span className="tp-muted"> · {l.opens}× · completed {formatWhen(l.lastActivityAt)}</span>
              </li>
            ))}
            {openedOnly.map((l) => (
              <li key={l.lessonId}>
                <span className="tp-lab-open">◻︎</span> {labLessonPath(subject.subjectId, l.lessonId, nameIndex)}
                {l.experimentType && <span className="tp-lab-type"> · {experimentLabel(l.experimentType, experimentTypes)}</span>}
                <span className="tp-muted"> · opened {l.opens}× · last {formatWhen(l.lastActivityAt)} (no completion recorded)</span>
              </li>
            ))}
          </ul>
          <p className="tp-note">
            Labs that have a right answer (matching, sorting, ordering) record a completion when the
            set is solved. Exploratory labs — graphing, flashcards, balance pans — can only show how
            often they were opened, so they are listed as opens rather than a false “done”.
          </p>
        </details>
      )}
    </div>
  );
}

export default function TeacherPage() {
  const { session, user } = useAuth();
  const [state, setState] = useState({ key: null, data: null });
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("least-active");
  const [nameIndex, setNameIndex] = useState(null);

  // Lab rows arrive as ids (subject_id + lesson_id) because that is what the
  // lesson page records. Resolve them to the Subject -> Module -> Lesson names
  // a teacher recognises. Best-effort: when the content fetch fails the rows
  // fall back to the raw lesson id instead of showing nothing.
  useEffect(() => {
    const ids = new Set();
    for (const student of state.data?.students || []) {
      for (const subj of student.subjects || []) {
        if ((subj.labs?.lessons || []).length > 0) ids.add(subj.subjectId);
      }
    }
    if (ids.size === 0) {
      setNameIndex(null);
      return;
    }
    let cancelled = false;
    loadLessonNameIndex([...ids])
      .then((index) => { if (!cancelled) setNameIndex(index); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [state.data]);

  const token = session?.access_token;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/analytics/summary?scope=class", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus(res.status);
          setError(body.error || "The dashboard could not be loaded.");
          setState({ key: token, data: null });
          return;
        }
        setStatus(200);
        setError(null);
        setState({ key: token, data: body });
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(0);
          setError("Could not reach the server. Check your connection and try again.");
          setState({ key: token, data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!user || !token) {
    return (
      <div className="tp-page">
        <h1>Teacher dashboard</h1>
        <p className="tp-lead">
          Sign in with the school account the owner added as a teacher to see your class’s progress.
        </p>
        <Link to="/login" className="tp-btn">Sign in</Link>
      </div>
    );
  }

  const loading = state.key !== token;
  const data = loading ? null : state.data;

  if (loading) {
    return (
      <div className="tp-page">
        <h1>Teacher dashboard</h1>
        <p>Loading your class…</p>
      </div>
    );
  }

  if (status === 403) {
    return (
      <div className="tp-page">
        <h1>Teacher dashboard</h1>
        <div className="tp-notice tp-notice-warn">
          <h2>This account is not a teacher account</h2>
          <p>{error}</p>
          <p className="tp-muted">
            Signed in as {user.email}. Nothing about any student is shown on this page until the
            account owner adds you as a teacher.
          </p>
        </div>
        <Link to="/" className="tp-btn tp-btn-ghost">Back to all subjects</Link>
      </div>
    );
  }

  if (status && status >= 500) {
    return (
      <div className="tp-page">
        <h1>Teacher dashboard</h1>
        <div className="tp-notice tp-notice-warn">
          <h2>Class data is not available yet</h2>
          <p>{error}</p>
          <p className="tp-muted">
            The dashboard reads lab activity and class links from the platform database. Until that
            is enabled by the owner, no class data can be shown — this page deliberately fails
            closed rather than showing partial or invented numbers.
          </p>
        </div>
      </div>
    );
  }

  const students = data?.students || [];
  const roster = data?.roster || [];
  const warnings = data?.warnings || [];

  const filtered = students
    .filter((s) => !filter || (s.email || "").toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return String(a.email).localeCompare(String(b.email));
      const at = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bt = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      if (sort === "most-active") return bt - at;
      return at - bt; // least active first — who needs attention now
    });

  return (
    <div className="tp-page">
      <div className="tp-head">
        <div>
          <h1>Teacher dashboard</h1>
          <p className="tp-lead">
            Progress for the students linked to <strong>{user.email}</strong>. Aggregated from the
            same records the students see in their own Progress tab.
          </p>
        </div>
        <Link to="/" className="tp-btn tp-btn-ghost">← All subjects</Link>
      </div>

      <div className="tp-summary">
        <span><strong>{roster.length}</strong> linked student{roster.length === 1 ? "" : "s"}</span>
        <span><strong>{data?.counts?.withProgress ?? 0}</strong> with recorded progress</span>
        <span><strong>{students.reduce((n, s) => n + s.totals.labsCompleted, 0)}</strong> labs completed</span>
        <span><strong>{students.reduce((n, s) => n + s.totals.quizAttempts, 0)}</strong> quiz attempts</span>
      </div>

      {warnings.length > 0 && (
        <div className="tp-notice">
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="tp-controls">
        <input
          className="tp-filter"
          type="search"
          placeholder="Filter by student email"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select className="tp-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="least-active">Least active first</option>
          <option value="most-active">Most active first</option>
          <option value="name">Email (A–Z)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="tp-notice">
          <h2>{roster.length === 0 ? "No students linked yet" : "No students match that filter"}</h2>
          <p className="tp-muted">
            {roster.length === 0
              ? "The account owner links students to a teacher. Once a student is linked and starts working, their progress appears here."
              : "Clear the filter to see the whole class."}
          </p>
        </div>
      ) : (
        <ul className="tp-students">
          {filtered.map((s) => {
            const open = expanded === s.userId;
            return (
              <li key={s.userId} className="tp-student">
                <button
                  className={"tp-student-row " + (open ? "open" : "")}
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : s.userId)}
                >
                  <span className="tp-student-email">{s.email || "(no account)"}</span>
                  <span className="tp-student-totals">
                    {s.totals.subjectsStarted} subject{s.totals.subjectsStarted === 1 ? "" : "s"} ·{" "}
                    {s.totals.lessonsCompleted} lessons · {s.totals.labsOpened} lab opens ·{" "}
                    {s.totals.labsCompleted} labs done · {s.totals.quizAttempts} quizzes
                  </span>
                  <span className="tp-student-when">last active {formatWhen(s.lastActivityAt)}</span>
                </button>
                {open && (
                  <div className="tp-student-body">
                    {s.subjects.length === 0 ? (
                      <p className="tp-muted">No activity recorded for this student yet.</p>
                    ) : (
                      s.subjects.map((subj) => <SubjectCard key={subj.subjectId} subject={subj} nameIndex={nameIndex} />)
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="tp-footnote">
        Scores are the student’s own knowledge-check, practice and mock results (60% is the pass mark
        on the knowledge check). Nothing on this page changes a student’s access.
      </p>
    </div>
  );
}
