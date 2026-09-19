import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./SchoolConsolePage.css";

// The school's own console (route /school).
//
// Signed in as the email the platform owner designated as a school admin, this
// person keeps their school's roster and class links in order. That is the whole
// of it: they can see and change who is linked to whom INSIDE THEIR OWN SCHOOL,
// and nothing else — never another school's roster or links, never a student's
// progress, never a purchase.
//
// Nothing here is trusted from the browser. Every action posts to
// api/admin/grant-access.js, which resolves the school from the caller's own
// `school_admins` row (a schoolId in the body is ignored for a school admin) and
// scopes every read and write to that one school. Signed out, not designated, or
// the tables not applied yet, the page shows that honestly instead of guessing.

function parseEmails(text) {
  return [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export default function SchoolConsolePage() {
  const { session, user } = useAuth();
  const token = session?.access_token;

  const [state, setState] = useState({ key: null, data: null });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("teacher");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [studentEmails, setStudentEmails] = useState("");

  async function call(body) {
    const res = await fetch("/api/admin/grant-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/grant-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ action: "school-roster" }),
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus(res.status);
          setError(body.error || `The console could not be loaded (${res.status}).`);
          setState({ key: token, data: null });
          return;
        }
        setStatus(200);
        setError(null);
        setState({ key: token, data: body });
        setTeacherEmail((prev) => prev || (body.teachers || [])[0] || "");
      } catch {
        if (cancelled) return;
        setStatus(0);
        setError("Could not reach the server. Check your connection and try again.");
        setState({ key: token, data: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  async function run(body, clear) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await call(body);
      setMessage(data.message || "Done.");
      setReloadKey((k) => k + 1);
      if (clear) clear();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!user || !token) {
    return (
      <div className="sc-page">
        <h1>School console</h1>
        <p className="sc-lead">
          Sign in with the school account the platform owner designated as a school admin to manage
          your school's teachers and students.
        </p>
        <Link to="/login" className="sc-btn">Sign in</Link>
      </div>
    );
  }

  if (state.key !== token) {
    return (
      <div className="sc-page">
        <h1>School console</h1>
        <p>Loading your school…</p>
      </div>
    );
  }

  if (status === 403) {
    return (
      <div className="sc-page">
        <h1>School console</h1>
        <div className="sc-notice sc-notice-warn">
          <h2>This account does not administer a school</h2>
          <p>{error}</p>
          <p className="sc-muted">
            Signed in as {user.email}. Nothing about any school is shown until the platform owner
            designates this email as a school admin.
          </p>
          <p className="sc-muted">
            A teacher's own class progress is at <Link to="/teacher">the teacher dashboard</Link>.
          </p>
        </div>
      </div>
    );
  }

  if (status && status !== 200) {
    return (
      <div className="sc-page">
        <h1>School console</h1>
        <div className="sc-notice sc-notice-warn">
          <h2>School data is not available yet</h2>
          <p>{error}</p>
          <p className="sc-muted">
            The console reads the roster and class links from the platform database. Until that is
            enabled by the owner, nothing is shown — this page deliberately fails closed rather than
            showing partial or invented lists.
          </p>
        </div>
      </div>
    );
  }

  const data = state.data || {};
  const teachers = data.teachers || [];
  const students = data.students || [];
  const links = data.links || [];
  const selectedTeacher = teacherEmail || teachers[0] || "";
  const selectedLinks = links.filter((l) => l.teacherEmail === selectedTeacher);

  return (
    <div className="sc-page">
      <div className="sc-head">
        <div>
          <h1>{data.school?.name || "School console"}</h1>
          <p className="sc-lead">
            Managing as <strong>{data.schoolAdmin || user.email}</strong>. You can link and unlink the
            teachers and students of this school only.
          </p>
        </div>
        <Link to="/teacher" className="sc-btn sc-btn-ghost">Teacher dashboard →</Link>
      </div>

      <div className="sc-summary">
        <span><strong>{teachers.length}</strong> teacher{teachers.length === 1 ? "" : "s"}</span>
        <span><strong>{students.length}</strong> student{students.length === 1 ? "" : "s"}</span>
        <span><strong>{data.linkCount || 0}</strong> class link{(data.linkCount || 0) === 1 ? "" : "s"}</span>
      </div>

      {data.note && <div className="sc-notice">{data.note}</div>}
      {message && <div className="sc-notice sc-notice-ok">{message}</div>}
      {error && <div className="sc-notice sc-notice-warn">{error}</div>}

      {/* ------------------------------------------------------- ROSTER */}
      <section className="sc-card">
        <h2>Roster</h2>
        <p className="sc-lead">
          Everyone the school manages. A link can only join two people on this roster, so adding a
          teacher or a student here is what makes them linkable.
        </p>

        <div className="sc-grid">
          <label className="sc-field">
            <span>Person's email</span>
            <input
              type="email"
              value={newEmail}
              placeholder="ms.brown@school.edu.jm"
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </label>
          <label className="sc-field">
            <span>Role</span>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </label>
          <div className="sc-actions sc-actions-inline">
            <button
              className="sc-btn"
              disabled={busy || !newEmail.trim()}
              onClick={async () => {
                const ok = await run(
                  { action: "school-member-add", email: newEmail.trim(), role: newRole },
                  () => setNewEmail("")
                );
                return ok;
              }}
            >
              Add to roster
            </button>
          </div>
        </div>

        {teachers.length + students.length === 0 ? (
          <p className="sc-muted">The roster is empty. Add the teachers and students above.</p>
        ) : (
          <>
            <div className="sc-row">
              <span className="sc-label">Teachers</span>
              {teachers.length === 0 ? (
                <span className="sc-muted">none yet</span>
              ) : (
                teachers.map((t) => (
                  <span className="sc-chip" key={t}>
                    🧑‍🏫 {t}
                    <button
                      className="sc-chip-x"
                      disabled={busy}
                      aria-label={`Remove ${t} from the roster`}
                      title={`Remove ${t} from the roster (also removes this school's links to them)`}
                      onClick={() => run({ action: "school-member-remove", email: t })}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="sc-row sc-row-wrap">
              <span className="sc-label">Students</span>
              {students.length === 0 ? (
                <span className="sc-muted">none yet</span>
              ) : (
                students.map((s) => (
                  <span className="sc-chip" key={s}>
                    🎒 {s}
                    <button
                      className="sc-chip-x"
                      disabled={busy}
                      aria-label={`Remove ${s} from the roster`}
                      title={`Remove ${s} from the roster (also removes this school's links to them)`}
                      onClick={() => run({ action: "school-member-remove", email: s })}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </>
        )}
      </section>

      {/* --------------------------------------------------------- LINKS */}
      <section className="sc-card">
        <h2>Class links</h2>
        <p className="sc-lead">
          A teacher sees the progress of the students linked to them, and nothing else. A student must
          be on the roster first — the link is refused otherwise, because a link can never join
          someone from another school.
        </p>

        {teachers.length === 0 ? (
          <p className="sc-muted">Add a teacher to the roster to start linking students.</p>
        ) : (
          <>
            <div className="sc-grid">
              <label className="sc-field">
                <span>Teacher</span>
                <select value={selectedTeacher} onChange={(e) => setTeacherEmail(e.target.value)}>
                  {teachers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="sc-field sc-field-wide">
                <span>Student emails (one per line or comma-separated)</span>
                <textarea
                  rows={3}
                  value={studentEmails}
                  placeholder="student1@school.edu.jm, student2@school.edu.jm"
                  onChange={(e) => setStudentEmails(e.target.value)}
                />
              </label>
            </div>

            <div className="sc-actions">
              <button
                className="sc-btn"
                disabled={busy || !selectedTeacher || parseEmails(studentEmails).length === 0}
                onClick={() =>
                  run(
                    {
                      action: "school-link",
                      teacherEmail: selectedTeacher,
                      emails: parseEmails(studentEmails),
                    },
                    () => setStudentEmails("")
                  )
                }
              >
                Link students
              </button>
              <button
                className="sc-btn sc-btn-ghost"
                disabled={busy || !selectedTeacher || parseEmails(studentEmails).length === 0}
                onClick={() =>
                  run({
                    action: "school-unlink",
                    teacherEmail: selectedTeacher,
                    emails: parseEmails(studentEmails),
                  })
                }
              >
                Unlink students
              </button>
            </div>

            {selectedLinks.length === 0 ? (
              <p className="sc-muted">No students are linked to {selectedTeacher} by this school yet.</p>
            ) : (
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead>
                    <tr>
                      <th>Teacher</th>
                      <th>Student</th>
                      <th>Linked</th>
                      <th className="sc-col-action" />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLinks.map((l) => (
                      <tr key={l.id}>
                        <td>{l.teacherEmail}</td>
                        <td>{l.studentEmail}</td>
                        <td className="sc-when">
                          {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="sc-col-action">
                          <button
                            className="sc-btn sc-btn-small sc-btn-ghost"
                            disabled={busy}
                            onClick={() =>
                              run({
                                action: "school-unlink",
                                teacherEmail: l.teacherEmail,
                                emails: [l.studentEmail],
                              })
                            }
                          >
                            Unlink
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <p className="sc-footnote">
        Scores and progress are the students' own records. Nothing on this page changes a student's
        access, and no school admin can see another school's roster or links.
      </p>
    </div>
  );
}
