import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./SchoolAdminCard.css";

// Owner-only: create a school, designate ONE admin for it, and keep its roster.
//
// This is the switchboard for school-admin self-service. The owner does the two
// things only the owner may do — name the school and name the person at that
// school who runs it — and from then on that person keeps their own roster at
// /school without the owner touching anything per teacher.
//
// The server (api/admin/grant-access.js) keeps the OWNER_EMAILS gate on every
// action this card calls ("school-list", "school-create", "school-admin",
// "school-member"), so the card is safe to render for any signed-in account: it
// says plainly when it is not allowed rather than pretending.
//
// Exactly one admin email maps to one school (a unique index on the email), so
// "which school does this person run?" is never ambiguous.

export default function SchoolAdminCard() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [schools, setSchools] = useState(null);
  const [platformLinks, setPlatformLinks] = useState(0);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // New school
  const [newName, setNewName] = useState("");
  const [newAdmin, setNewAdmin] = useState("");

  // Per-school inputs, keyed by school id so two schools never share a box.
  const [adminDraft, setAdminDraft] = useState({});
  const [memberDraft, setMemberDraft] = useState({});
  const [memberRole, setMemberRole] = useState({});

  const call = useCallback(
    async (body) => {
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
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    call({ action: "school-list" })
      .then((data) => {
        if (cancelled) return;
        setSchools(data.schools || []);
        setPlatformLinks(data.platformLinks || 0);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setSchools([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, call]);

  async function run(body) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const data = await call(body);
      setMessage(data.message || "Done.");
      setReloadKey((k) => k + 1);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const createSchool = async () => {
    if (!newName.trim()) {
      setError("Enter the school's name first.");
      return;
    }
    const ok = await run({
      action: "school-create",
      name: newName.trim(),
      adminEmail: newAdmin.trim() || undefined,
    });
    // Kept in the box on failure so the owner can correct it in place.
    if (ok) {
      setNewName("");
      setNewAdmin("");
    }
  };

  return (
    <div className="sac-card">
      <h3 className="admin-section-title">Schools — designate an admin</h3>
      <p className="sac-lead">
        A school's own admin keeps that school's teacher → student links in order, so you are not the
        bottleneck for every roster. They sign in at <code>/school</code> (their own account, the same
        sign-up as anyone) and can only ever see and change their own school — never another school,
        never the platform. You create the school and name its admin here.
      </p>

      <div className="sac-grid">
        <label className="sac-field">
          <span>School name</span>
          <input
            type="text"
            value={newName}
            placeholder="e.g. Wolmer's Boys' School"
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <label className="sac-field">
          <span>School admin email (optional — can be set later)</span>
          <input
            type="email"
            value={newAdmin}
            placeholder="principal@school.edu.jm"
            onChange={(e) => setNewAdmin(e.target.value)}
          />
        </label>
      </div>

      <div className="sac-actions">
        <button className="admin-btn grant-btn" disabled={busy || !newName.trim()} onClick={createSchool}>
          {busy ? "Working…" : "Create school"}
        </button>
      </div>

      {message && <div className="admin-msg admin-success">{message}</div>}
      {error && <div className="admin-msg admin-error">{error}</div>}

      {schools && schools.length === 0 && !error && (
        <p className="sac-lead">No schools yet. Create the first one above.</p>
      )}

      {(schools || []).map((school) => {
        const role = memberRole[school.id] || "teacher";
        return (
          <div className="sac-school" key={school.id}>
            <div className="sac-school-head">
              <strong>{school.name}</strong>
              <span className="sac-muted">
                {school.teachers.length} teacher{school.teachers.length === 1 ? "" : "s"} ·{" "}
                {school.students.length} student{school.students.length === 1 ? "" : "s"} ·{" "}
                {school.linkCount} link{school.linkCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="sac-row">
              <span className="sac-label">Admin</span>
              {school.admins.length === 0 ? (
                <span className="sac-muted">no admin yet — the school cannot manage itself</span>
              ) : (
                school.admins.map((a) => (
                  <span className="sac-chip" key={a}>
                    👤 {a}
                    <button
                      className="sac-chip-x"
                      title={`Remove ${a} as admin`}
                      aria-label={`Remove ${a} as the admin of ${school.name}`}
                      disabled={busy}
                      onClick={() =>
                        run({ action: "school-admin", schoolId: school.id, email: a, remove: true })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="sac-grid">
              <label className="sac-field">
                <span>Designate an admin</span>
                <input
                  type="email"
                  value={adminDraft[school.id] || ""}
                  placeholder="principal@school.edu.jm"
                  onChange={(e) => setAdminDraft((d) => ({ ...d, [school.id]: e.target.value }))}
                />
              </label>
              <div className="sac-actions sac-actions-inline">
                <button
                  className="admin-btn"
                  disabled={busy || !(adminDraft[school.id] || "").trim()}
                  onClick={async () => {
                    const email = (adminDraft[school.id] || "").trim();
                    const ok = await run({ action: "school-admin", schoolId: school.id, email });
                    if (ok) setAdminDraft((d) => ({ ...d, [school.id]: "" }));
                  }}
                >
                  Make admin
                </button>
              </div>
            </div>

            <div className="sac-grid">
              <label className="sac-field">
                <span>Add to the school roster</span>
                <input
                  type="email"
                  value={memberDraft[school.id] || ""}
                  placeholder="ms.brown@school.edu.jm"
                  onChange={(e) => setMemberDraft((d) => ({ ...d, [school.id]: e.target.value }))}
                />
              </label>
              <label className="sac-field">
                <span>Role</span>
                <select
                  value={role}
                  onChange={(e) => setMemberRole((d) => ({ ...d, [school.id]: e.target.value }))}
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </label>
              <div className="sac-actions sac-actions-inline">
                <button
                  className="admin-btn"
                  disabled={busy || !(memberDraft[school.id] || "").trim()}
                  onClick={async () => {
                    const email = (memberDraft[school.id] || "").trim();
                    const ok = await run({ action: "school-member", schoolId: school.id, email, role });
                    if (ok) setMemberDraft((d) => ({ ...d, [school.id]: "" }));
                  }}
                >
                  Add to roster
                </button>
              </div>
            </div>

            {school.teachers.length + school.students.length > 0 && (
              <div className="sac-row sac-row-wrap">
                <span className="sac-label">Roster</span>
                {school.teachers.map((t) => (
                  <span className="sac-chip" key={`t-${t}`}>
                    🧑‍🏫 {t}
                    <button
                      className="sac-chip-x"
                      title={`Remove ${t} from ${school.name}`}
                      aria-label={`Remove ${t} from ${school.name}`}
                      disabled={busy}
                      onClick={() => run({ action: "school-member", schoolId: school.id, email: t, remove: true })}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {school.students.map((s) => (
                  <span className="sac-chip" key={`s-${s}`}>
                    🎒 {s}
                    <button
                      className="sac-chip-x"
                      title={`Remove ${s} from ${school.name}`}
                      aria-label={`Remove ${s} from ${school.name}`}
                      disabled={busy}
                      onClick={() => run({ action: "school-member", schoolId: school.id, email: s, remove: true })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {platformLinks > 0 && (
        <p className="sac-note">
          {platformLinks} link{platformLinks === 1 ? "" : "s"} were created here at platform level and
          belong to no school — no school admin can see or remove them.
        </p>
      )}

      {schools && schools.length > 0 && (
        <p className="sac-note">
          Send each school admin the address <code>/school</code>. They sign in with their own account
          and manage only their own school's teachers and students.
        </p>
      )}
    </div>
  );
}
