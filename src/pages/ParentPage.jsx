import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StudentProgressDashboard from "../components/StudentProgressDashboard";

// Parent progress dashboard.
//
// Shows the SAME per-student progress a teacher sees — lessons marked complete,
// interactive labs opened and completed, Extra Practice / Mock Exam / Knowledge
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
// Access is decided entirely by the server (GET /api/analytics/summary?scope=parent):
// the caller must be named as a parent in `parent_students`, or be the owner —
// and only that parent's own children are returned. Anyone else gets 403 and
// zero data. Nothing on this page changes a student's access.
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
        <p>Loading your child’s progress…</p>
      </div>
    );
  }

  if (status === 403) {
    return (
      <div className="tp-page">
        <h1>Parent dashboard</h1>
        <div className="tp-notice tp-notice-warn">
          <h2>No child is linked to this account yet</h2>
          <p>{error}</p>
          <p className="tp-muted">
            Signed in as {user.email}. A child is linked when you buy a subject or the all-subjects
            bundle and type their email at checkout — the link is made by that purchase, so nothing
            can be entered here on its own.
          </p>
          <p className="tp-muted">
            Buy with your child’s email and their lessons, labs and quiz scores appear on this page.
          </p>
        </div>
        <Link to="/pricing" className="tp-btn">See the plans</Link>
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
