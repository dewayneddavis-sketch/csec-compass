import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./TeacherLinksCard.css";

// Owner-only: link a teacher to the students whose progress they may see.
//
// This is the ONLY way a teacher gets a class. The server (api/admin/grant-access.js)
// is behind the existing OWNER_EMAILS gate and everyone else gets a 403, so the
// card is safe to render for any signed-in account — but it says plainly when it
// is not allowed rather than pretending.
//
// Teacher identity comes from the TEACHER_EMAILS environment variable, which the
// owner sets in Settings → Secrets. The card lists who is allowed so a link that
// would not work is visible here instead of on the teacher's screen.

export default function TeacherLinksCard() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [links, setLinks] = useState(null);
  const [allowedTeachers, setAllowedTeachers] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const [teacherEmail, setTeacherEmail] = useState("");
  const [studentEmails, setStudentEmails] = useState("");

  // Bulk link: the owner pastes the school's roster instead of typing pairs.
  // The text goes to the server as-is — the server owns CSV parsing and row
  // validation, so the browser cannot invent a row the server did not check.
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

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

  // Refresh after a change by bumping the key the load effect depends on.
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    call({ action: "teacher-links" })
      .then((data) => {
        if (cancelled) return;
        setLinks(data.links || []);
        setAllowedTeachers(data.allowedTeachers || []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  async function submit(action) {
    setBusy(true);
    setMessage(null);
    setError(null);
    const emails = studentEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    try {
      const data = await call({ action, teacherEmail: teacherEmail.trim(), emails });
      setMessage(
        data.message +
          (data.withoutAccount?.length
            ? ` — no account yet for: ${data.withoutAccount.join(", ")} (their progress appears once they sign up).`
            : "") +
          (action === "teacher-link" && data.teacherInAllowlist === false
            ? " ⚠ This teacher is not in TEACHER_EMAILS yet, so the dashboard will still refuse them."
            : "") +
          (action === "teacher-link" && data.teacherHasAccount === false
            ? " ⚠ No account exists for that teacher email yet."
            : "")
      );
      setStudentEmails("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const teacherOptions = [...new Set([...allowedTeachers, ...(links || []).map((l) => l.teacher_email)])];

  async function linkBulk() {
    setBusy(true);
    setMessage(null);
    setError(null);
    setBulkResult(null);
    try {
      const data = await call({ action: "teacher-link-bulk", csv: bulkCsv });
      setBulkResult(data);
      setMessage(data.message);
      // The paste stays in the box on purpose: if a row needs fixing the owner
      // can correct it in place instead of going back to the spreadsheet.
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tlc-card">
      <h3 className="admin-section-title">Teacher progress dashboard — link students</h3>
      <p className="tlc-lead">
        A teacher sees the progress of the students linked here, and nothing else. Links are created
        only from this owner screen; a teacher can never link themselves to a student.
      </p>

      {allowedTeachers.length > 0 ? (
        <p className="tlc-allowed">
          Teachers allowed to open the dashboard (TEACHER_EMAILS): <strong>{allowedTeachers.join(", ")}</strong>
        </p>
      ) : (
        <p className="tlc-warn">
          No teacher email is allowed to open the dashboard yet. Add the teacher’s email to the
          <code> TEACHER_EMAILS</code> secret (comma-separated) — links made here only take effect
          for an allowed teacher.
        </p>
      )}

      <div className="tlc-grid">
        <label className="tlc-field">
          <span>Teacher email</span>
          <input
            list="tlc-teachers"
            type="email"
            value={teacherEmail}
            placeholder="teacher@school.edu"
            onChange={(e) => setTeacherEmail(e.target.value)}
          />
          <datalist id="tlc-teachers">
            {teacherOptions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>

        <label className="tlc-field">
          <span>Student emails (one per line or comma-separated)</span>
          <textarea
            rows={3}
            value={studentEmails}
            placeholder="student1@school.edu, student2@school.edu"
            onChange={(e) => setStudentEmails(e.target.value)}
          />
        </label>
      </div>

      <div className="tlc-actions">
        <button
          className="admin-btn grant-btn"
          disabled={busy || !teacherEmail.trim() || !studentEmails.trim()}
          onClick={() => submit("teacher-link")}
        >
          {busy ? "Working…" : "Link students"}
        </button>
        <button
          className="admin-btn revoke-btn"
          disabled={busy || !teacherEmail.trim() || !studentEmails.trim()}
          onClick={() => submit("teacher-unlink")}
        >
          Unlink students
        </button>
      </div>

      {message && <div className="admin-msg admin-success">{message}</div>}
      {error && <div className="admin-msg admin-error">{error}</div>}

      <div className="tlc-bulk">
        <h4 className="tlc-bulk-title">Bulk link (CSV)</h4>
        <p className="tlc-bulk-lead">
          Linking a whole school one pair at a time is not workable, so paste the roster instead: two
          columns — <strong>teacher_email, student_email</strong> — one pair per line. A copy straight
          out of Excel or Google Sheets works (tabs), and so does a comma or semicolon file. A header
          row is fine; extra columns (name, class) are ignored.
        </p>
        <pre className="tlc-bulk-sample">{`teacher_email,student_email
ms.brown@school.edu,student1@school.edu
ms.brown@school.edu,student2@school.edu`}</pre>
        <label className="tlc-field">
          <span>Paste the pairs</span>
          <textarea
            className="tlc-bulk-input"
            rows={6}
            value={bulkCsv}
            spellCheck={false}
            placeholder={"teacher_email,student_email\nms.brown@school.edu,student1@school.edu"}
            onChange={(e) => setBulkCsv(e.target.value)}
          />
        </label>
        <div className="tlc-actions">
          <button
            className="admin-btn grant-btn"
            disabled={busy || !bulkCsv.trim()}
            onClick={linkBulk}
          >
            {busy ? "Working…" : "Link all pairs"}
          </button>
        </div>

        {bulkResult && (
          <div className="tlc-bulk-result">
            <p className="tlc-bulk-counts">
              <strong className="tlc-ok">{bulkResult.linked} linked</strong>
              <span> · {bulkResult.skipped} skipped</span>
              <span className={bulkResult.invalid > 0 ? "tlc-bad" : undefined}>
                {" "}
                · {bulkResult.invalid} row{bulkResult.invalid === 1 ? "" : "s"} to fix
              </span>
              <span className="tlc-bulk-total"> (of {bulkResult.total} pasted rows)</span>
            </p>

            {bulkResult.invalidRows?.length > 0 && (
              <details className="tlc-bulk-details" open>
                <summary>Rows that were not linked ({bulkResult.invalidRows.length})</summary>
                <ul>
                  {bulkResult.invalidRows.map((r, i) => (
                    <li key={i}>
                      {r.line ? <span className="tlc-bulk-line">line {r.line}</span> : null}
                      <code>{r.text}</code> — {r.reason}
                    </li>
                  ))}
                </ul>
                <p className="tlc-bulk-fix">Fix these in the box above and click Link all pairs again — the pairs that already linked are skipped, not duplicated.</p>
              </details>
            )}

            {bulkResult.skippedRows?.length > 0 && (
              <details className="tlc-bulk-details">
                <summary>Skipped rows ({bulkResult.skippedRows.length})</summary>
                <ul>
                  {bulkResult.skippedRows.map((r, i) => (
                    <li key={i}>
                      <code>
                        {r.teacher_email} → {r.student_email}
                      </code>{" "}
                      — {r.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {bulkResult.withoutAccount?.length > 0 && (
              <p className="tlc-bulk-note">
                Linked, but no account exists yet for: {bulkResult.withoutAccount.join(", ")} — their
                progress appears once they sign up.
              </p>
            )}
            {bulkResult.teachersNotInAllowlist?.length > 0 && (
              <p className="tlc-warn">
                ⚠ {bulkResult.teachersNotInAllowlist.join(", ")} is not in the <code>TEACHER_EMAILS</code>{" "}
                secret yet, so the dashboard will still refuse them. The links are saved and start
                working as soon as that email is added.
              </p>
            )}
            {(bulkResult.warnings || []).map((w, i) => (
              <p className="tlc-warn" key={i}>
                {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {links && links.length > 0 && (
        <div className="tlc-table-wrap">
          <table className="tlc-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Student</th>
                <th>Linked</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td>{l.teacher_email}</td>
                  <td>{l.student_email}</td>
                  <td className="tlc-when">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {links && links.length === 0 && !error && (
        <p className="tlc-lead">No teacher links yet.</p>
      )}
    </div>
  );
}
