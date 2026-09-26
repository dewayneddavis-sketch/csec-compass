import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StudentProgressDashboard from "../components/StudentProgressDashboard";
import TeacherMessages from "../components/TeacherMessages";
import "./TeacherPage.css";

// Teacher progress dashboard.
//
// Shows one class: every student linked to this teacher, with their progress per
// subject — lessons marked complete, interactive labs opened and completed, Extra
// Practice / Mock Exam / Knowledge Check attempts with best and latest scores,
// and when they were last active. The rendering of that progress lives in
// src/components/StudentProgressDashboard.jsx, which the parent dashboard
// (/parent) shares, so the two views of the same records cannot drift apart.
//
// A teacher also keeps their OWN class list here: the "Your students" card links
// the students they teach and unlinks one when a class changes (owner decision
// 2026-09-22 — the school admin links the teachers, and each teacher links their
// own students; students do not have to approve). No teacher email is ever sent
// by that card: the server takes the teacher's identity from the signed-in
// account, so one teacher can neither see nor edit another's class.
//
// Access is decided entirely by the server (GET /api/analytics/summary?scope=class):
// the caller must be a teacher on their school's roster, on the platform's
// teacher list, or be the owner — and only students linked to that exact teacher
// are returned. This page never asks for a roster of its own and shows nothing
// when the server says no.

// The teacher's own class list — link the students you teach, unlink one when a
// class changes.
//
// Both actions post to /api/admin/grant-access with the teacher-self-* actions.
// The teacher's identity comes from the signed-in account on the server; this
// card deliberately never sends a teacher email, and the server ignores one if it
// did, so a teacher can only ever change their own list.
function LinkStudentsCard({ roster, token, onChanged }) {
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(null); // null | "link" | the email being unlinked
  const [notice, setNotice] = useState(null);
  const [problem, setProblem] = useState(null);

  async function post(body) {
    const res = await fetch("/api/admin/grant-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function link(event) {
    event.preventDefault();
    // One box, several separators: a comma list pasted from a spreadsheet and a
    // new-line list typed by hand both work.
    const wanted = emails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (wanted.length === 0) {
      setProblem("Type at least one student email — separate several with a comma or a new line.");
      return;
    }
    setBusy("link");
    setNotice(null);
    setProblem(null);
    try {
      const result = await post({ action: "teacher-self-link", emails: wanted });
      const linked = result.linked || [];
      const parts = [`Linked ${linked.length} student${linked.length === 1 ? "" : "s"}.`];
      if (result.alreadyLinked?.length) parts.push(`${result.alreadyLinked.length} were already linked.`);
      if (result.invalid?.length) {
        parts.push(
          `${result.invalid.length} could not be linked: ${result.invalid
            .map((i) => `${i.email} (${i.reason})`)
            .join(", ")}.`
        );
      }
      if (result.withoutAccount?.length) {
        parts.push(
          `No account yet for ${result.withoutAccount.join(", ")} — their progress appears once they sign up.`
        );
      }
      if (result.warning) parts.push(result.warning);
      setNotice(parts.join(" "));
      setEmails("");
      onChanged();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function unlink(email) {
    setBusy(email);
    setNotice(null);
    setProblem(null);
    try {
      const result = await post({ action: "teacher-self-unlink", emails: [email] });
      setNotice(result.message || `${email} is no longer on your dashboard.`);
      onChanged();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setBusy(null);
    }
  }

  // One row per student, even if the server ever reported a link twice.
  const seen = new Set();
  const listed = (roster || []).filter((r) => {
    const key = (r.email || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="tp-links">
      <h2 className="tp-links-title">Your students</h2>
      <p className="tp-muted">
        Link the students you teach by typing their email in the box below. They don’t need to
        approve; progress appears once they have an account and start working.
      </p>

      <form className="tp-links-form" onSubmit={link}>
        <label className="tp-links-field">
          <span>Student emails (separate several with a comma or a new line)</span>
          <textarea
            className="tp-links-input"
            rows={2}
            value={emails}
            placeholder="aaliyah@school.edu, andre@school.edu"
            onChange={(e) => setEmails(e.target.value)}
          />
        </label>
        <button type="submit" className="tp-btn" disabled={busy !== null || !emails.trim()}>
          {busy === "link" ? "Linking…" : "Link students"}
        </button>
      </form>

      {notice && <div className="tp-links-msg tp-links-ok">{notice}</div>}
      {problem && <div className="tp-links-msg tp-links-bad">{problem}</div>}

      <h3 className="tp-links-sub">Linked students ({listed.length})</h3>
      {listed.length === 0 ? (
        <p className="tp-muted">No students linked to you yet — link the first one above.</p>
      ) : (
        <ul className="tp-roster">
          {listed.map((r) => (
            <li key={r.email} className="tp-roster-row">
              <span className="tp-roster-email">{r.email}</span>
              <span className={"tp-roster-state " + (r.userId ? "" : "tp-muted")}>
                {r.userId ? "has an account" : "no account yet"}
              </span>
              <button
                type="button"
                className="tp-btn tp-btn-ghost tp-unlink"
                disabled={busy !== null}
                onClick={() => unlink(r.email)}
              >
                {busy === r.email ? "Unlinking…" : "Unlink"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="tp-footnote">
        Unlinking only stops that student showing on your dashboard. It does not change their access
        and does not delete anything they have done.
      </p>
    </div>
  );
}

export default function TeacherPage() {
  const { session, user } = useAuth();
  const [state, setState] = useState({ key: null, data: null });
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  // Bumped after a link/unlink so the dashboard re-reads the class (the roster
  // and every student's progress) without a page reload.
  const [refresh, setRefresh] = useState(0);

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
  }, [token, refresh]);

  if (!user || !token) {
    return (
      <div className="tp-page">
        <h1>Teacher dashboard</h1>
        <p className="tp-lead">
          Sign in with the account your school (or the platform owner) set up as a teacher to see
          your class’s progress.
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
            Signed in as {user.email}. Nothing about any student is shown on this page until you are
            added as a teacher — ask your school’s admin to add your email to the school’s teacher
            roster (or the account owner to add it to the teacher list).
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

  const roster = data?.roster || [];

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

      <StudentProgressDashboard
        data={data}
        personNoun="student"
        emptyTitle="No students linked yet"
        emptyCopy="Link the students you teach by typing their email in the box above. They don’t need to approve; progress appears once they have an account and start working."
        footnote="Scores are the student’s own knowledge-check, practice and mock results (60% is the pass mark on the knowledge check). Nothing on this page changes a student’s access."
        header={
          <LinkStudentsCard roster={roster} token={token} onChanged={() => setRefresh((n) => n + 1)} />
        }
      />

      {/* The Messages panel (chat PR 2 of 3). It reads /api/messages, which
          decides on the server who this teacher may talk to, so it is shown
          only where the server has already accepted this account as a teacher
          of this class — it never widens who is listed here. */}
      <TeacherMessages token={token} me={user.email} />
    </div>
  );
}
