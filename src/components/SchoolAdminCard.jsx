import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./SchoolAdminCard.css";

// Owner-only: the global view of every school on the platform, plus the
// create/designate/roster tools to correct one by hand.
//
// Schools normally create THEMSELVES: at licence purchase the buyer names the
// school and the person who will run its console, and the webhook provisions
// public.schools / school_admins / school_members from that (see
// api/stripe/webhook.js). Nobody has to approve a school before it can use what
// it paid for.
//
// That makes this card the owner's OVERSIGHT window, not a gatekeeper: it lists
// every school — self-provisioned ones included — with its admin, its roster and
// the licence it bought, and it can still create a school or name an admin when a
// school asks for help or something needs correcting.
//
// The server (api/admin/grant-access.js) keeps the OWNER_EMAILS gate on every
// action this card calls ("school-list", "school-create", "school-admin",
// "school-member"), so the card is safe to render for any signed-in account: it
// says plainly when it is not allowed rather than pretending.
//
// Exactly one admin email maps to one school (a unique index on the email), so
// "which school does this person run?" is never ambiguous.

// The tier a school bought, in words. The value comes straight from the Stripe
// product id the webhook recorded ('school-license-150'), which is exactly what
// the owner needs to reconcile a payment — so it is shown rather than prettified
// beyond the seat count.
function licenseLabel(tier) {
  if (typeof tier !== "string" || !tier) return null;
  const seats = /^school-license-(\d+)$/.exec(tier);
  if (seats) return `School licence — up to ${seats[1]} students`;
  if (tier === "school-license") return "School licence (single-tier)";
  return tier;
}

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
      <h3 className="admin-section-title">Schools — every school, its admin and its licence</h3>
      <p className="sac-lead">
        A school sets itself up when it buys a licence: it names itself there and names the person
        who will run its console, and that person keeps the school&rsquo;s teacher → student links in
        order at <code>/school</code> from then on. This card is your window onto all of it — every
        school, renamed or created anywhere, appears below with its admin, its roster and the
        licence it bought. Use the fields on a school to step in when a school asks for help or
        something needs correcting.
      </p>

      <h4 className="sac-subtitle">Create a school or name its admin by hand</h4>
      <p className="sac-lead">
        Only needed as a fallback — e.g. a school paid by another route, or its admin has changed.
        The school keeps managing itself from that point.
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
        <p className="sac-lead">
          No schools yet. The first school that buys a licence appears here on its own — or create
          one below.
        </p>
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
              <span className="sac-label">Licence</span>
              {licenseLabel(school.licenseTier) ? (
                <span className="sac-license">{licenseLabel(school.licenseTier)}</span>
              ) : (
                <span className="sac-muted">
                  not on record — either created here by hand or bought through a payment link
                </span>
              )}
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
          Each school admin was told the address <code>/school</code> when their school was set up.
          They sign in with their own account and manage only their own school&rsquo;s teachers and
          students. A school with no admin yet cannot manage itself — name one on that school above.
        </p>
      )}
    </div>
  );
}
