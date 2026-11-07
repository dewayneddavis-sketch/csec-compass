import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StudentProgressDashboard from "../components/StudentProgressDashboard";

// Parent progress dashboard.
//
// Shows the SAME per-student progress a teacher sees — lessons marked complete,
// interactive labs opened and completed, Practice Paper / Mock Exam / Knowledge
// Check attempts with best and latest scores, and when the child was last active
// — scoped to the children linked to this parent. The rendering is the shared
// src/components/StudentProgressDashboard.jsx and the stylesheet is the
// teacher dashboard's (TeacherPage.css, imported by that component), so the two
// views cannot drift apart.
//
// WHERE THE LINK COMES FROM (owner decision 2026-09-22): a parent↔child link is
// created at PURCHASE and nowhere else. A parent buying a single subject or the
// all-subjects bundle names their child's email at checkout; the Stripe webhook
// writes the link (api/stripe/webhook.js). There is no roster, no approval and
// no admin step — which is also why there is deliberately NO link box on this
// page: this page only ever displays what a purchase created.
//
// Access is decided entirely by the server (GET /api/analytics/summary?scope=parent).
// The server never refuses a signed-in caller here: a parent named in
// `parent_students` gets their own children (`view: "family"`), and ANY other
// signed-in account — a student, or an adult with no family link yet — gets the
// same dashboard scoped to ITSELF (`view: "self"`, rendered above). So there is
// no 403 branch on this page: the only failure states left are 500 (the lookup
// itself failed, which fails closed) and 0 (the server could not be reached).
// Nothing on this page changes a student's access.
export default function ParentPage() {
  const { session, user } = useAuth();
  const [state, setState] = useState({ key: null, data: null });
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const token = session?.access_token;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/analytics/summary?scope=parent", {
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
        <h1>Parent dashboard</h1>
        <p className="tp-lead">
          Sign in with the account you bought your child’s course with. The link to your child is
          made when you buy — you add their email at checkout.
        </p>
        <p className="tp-lead">
          A student can sign in here too: with the student’s own account this page shows that
          student’s progress — the same view their parent sees — and nothing else.
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
        <h1>Parent dashboard</h1>
        <p>Loading progress…</p>
      </div>
    );
  }

  // THE STUDENT'S OWN VIEW (owner instruction 2026-11-05): "if you are a
  // student, the parent can sign-in as the student and view the Parent's
  // Dashboard". The server resolves this view from the caller's own session, so
  // it can only ever hold the caller's own record. The copy says whose progress
  // it is rather than calling it a child.
  if (data?.view === "self") {
    return (
      <div className="tp-page">
        <div className="tp-head">
          <div>
            <h1>Parent dashboard</h1>
            <p className="tp-lead">
              Your own progress, shown exactly as a parent or teacher sees it. Signed in as{" "}
              <strong>{user.email}</strong>.
            </p>
            <p className="tp-muted">
              {data.linkedAsChild
                ? "A parent is linked to this account, so they see this same page for you."
                : "No parent is linked to this account yet. A parent is linked when a course is bought and the student's email is given at checkout — until then this page is just yours."}
            </p>
          </div>
          <Link to="/" className="tp-btn tp-btn-ghost">← All subjects</Link>
        </div>

        <StudentProgressDashboard
          data={data}
          personNoun="student"
          emptyTitle="Nothing recorded yet"
          emptyCopy={
            <>
              Your lessons, labs and quiz attempts appear here as you work. Finish a lesson, open a
              Play-tab lab or sit a knowledge check and this page fills in.
            </>
          }
          footnote="These are your own records only — no other student's work appears on this page. 60% is the pass mark on the knowledge check."
        />
      </div>
    );
  }

  if (status && status >= 500) {
    return (
      <div className="tp-page">
        <h1>Parent dashboard</h1>
        <div className="tp-notice tp-notice-warn">
          <h2>Progress data is not available yet</h2>
          <p>{error}</p>
          <p className="tp-muted">
            This dashboard reads your child’s lessons, labs and quiz results from the platform
            database. Until that is enabled, nothing can be shown — this page deliberately fails
            closed rather than showing partial or invented numbers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-page">
      <div className="tp-head">
        <div>
          <h1>Parent dashboard</h1>
          <p className="tp-lead">
            Progress for the children linked to <strong>{user.email}</strong>. These are the same
            records your child sees in their own Progress tab.
          </p>
        </div>
        <Link to="/" className="tp-btn tp-btn-ghost">← All subjects</Link>
      </div>

      <StudentProgressDashboard
        data={data}
        personNoun="child"
        emptyTitle="No children linked yet"
        emptyCopy={
          <>
            A child is linked at checkout: buy a single subject or the all-subjects bundle and enter
            their email there. Once they sign up and start working, their lessons, labs and quiz
            scores appear here.
          </>
        }
        footnote="Scores are your child’s own knowledge-check, practice and mock results (60% is the pass mark on the knowledge check). Linking a child shows you their progress — they practise on their own account, and nothing on this page changes it."
      />
    </div>
  );
}
