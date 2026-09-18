import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import TeacherLinksCard from "../components/TeacherLinksCard";
import "./AdminPage.css";

// Fallback if /content/subjects.json can't be read — the 10 original subjects.
const FALLBACK_SUBJECTS = [
  { id: "mathematics", name: "Mathematics" },
  { id: "english-a", name: "English A" },
  { id: "biology", name: "Biology" },
  { id: "chemistry", name: "Chemistry" },
  { id: "physics", name: "Physics" },
  { id: "principles-of-accounts", name: "Principles of Accounts" },
  { id: "information-technology", name: "Information Technology" },
  { id: "social-studies", name: "Social Studies" },
  { id: "human-social-biology", name: "Human & Social Biology" },
  { id: "spanish", name: "Spanish" },
];

// Purchase types that aren't a single subject — kept in one place so the
// dropdown and the "All Grants" table label the same way.
const SCHOOL_LICENSE_LABELS = {
  "school-license-50": "School License — up to 50 students",
  "school-license-100": "School License — up to 100 students",
  "school-license-150": "School License — up to 150 students",
};

function prettyPurchaseType(purchaseType, subjectNames) {
  if (!purchaseType) return "Unknown";
  if (purchaseType === "bundle") return "📦 All Subjects Bundle";
  if (SCHOOL_LICENSE_LABELS[purchaseType]) return `🏫 ${SCHOOL_LICENSE_LABELS[purchaseType]}`;
  const name = subjectNames[purchaseType];
  if (name) return `📚 ${name}`;
  // Unknown/legacy type — show it raw rather than hiding a real grant.
  return `📚 ${purchaseType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`;
}

// Get the Supabase access token from the AuthContext session (same source
// /api/purchases/list consumers use), with a live getSession() fallback.
// FIX (live bug): the old localStorage scan for keys containing "supabase"
// never matched supabase-js's `sb-<ref>-auth-token` key, so the token was
// always null and grant always failed "Not authenticated." even when signed in.
async function getAccessToken(session) {
  if (session?.access_token) return session.access_token;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [purchaseType, setPurchaseType] = useState("bundle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Bulk grant state (pilot class)
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState(null);

  // All-grants state
  const [subjects, setSubjects] = useState(FALLBACK_SUBJECTS);
  const [grants, setGrants] = useState(null);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsError, setGrantsError] = useState(null);
  const [grantsMeta, setGrantsMeta] = useState(null);
  const [selected, setSelected] = useState([]);
  const [revoking, setRevoking] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState(null);

  // The live subject list drives the access dropdown — new subjects appear
  // here as soon as they ship, with no code change.
  useEffect(() => {
    let cancelled = false;
    fetch("/content/subjects.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setSubjects(data.filter((s) => s && s.id).map((s) => ({ id: s.id, name: s.name || s.id })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectNames = subjects.reduce((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {});

  async function callAdmin(payload) {
    const accessToken = await getAccessToken(session);
    if (!accessToken) throw new Error("Not authenticated. Please sign in first.");
    const res = await fetch("/api/admin/grant-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Surface the server error verbatim so a 403 owner-gate failure names
      // the required owner email instead of a generic "Request failed".
      throw new Error(data.error || "Request failed (" + res.status + ")");
    }
    return data;
  }

  async function handleAction(action) {
    if (!email.trim()) {
      setError("Please enter a user email");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await callAdmin({ email: email.trim(), purchaseType, action });
      setResult(data.message || (action === "grant" ? "Access granted!" : "Access revoked!"));
    } catch (err) {
      setError(err.message || "Network error");
    }
    setLoading(false);
  }

  async function handleBulkGrant() {
    const emails = [...new Set(
      bulkEmails.split("\n").map((e) => e.trim().toLowerCase()).filter(Boolean)
    )];
    if (emails.length === 0) {
      setBulkError("Paste at least one email — one per line.");
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);
    setBulkError(null);

    try {
      const data = await callAdmin({ emails, purchaseType: "bundle", action: "grant" });
      let msg = data.message;
      if (data.notFound?.length) msg += ` — not found: ${data.notFound.join(", ")}`;
      if (data.already?.length) msg += ` — already had access: ${data.already.join(", ")}`;
      setBulkResult(msg);
    } catch (err) {
      setBulkError(err.message || "Network error");
    }
    setBulkLoading(false);
  }

  async function loadGrants() {
    setGrantsLoading(true);
    setGrantsError(null);
    setRevokeMsg(null);
    try {
      const data = await callAdmin({ action: "list" });
      setGrants(data.grants || []);
      setGrantsMeta({
        count: data.count || 0,
        activeCount: data.activeCount || 0,
        missingAccounts: data.missingAccounts || 0,
      });
      setSelected([]);
    } catch (err) {
      setGrantsError(err.message || "Network error");
      setGrants(null);
    }
    setGrantsLoading(false);
  }

  async function revokeGrants(ids) {
    if (!ids.length) return;
    const ok = window.confirm(
      `Revoke ${ids.length} grant${ids.length === 1 ? "" : "s"}? The student loses paid access immediately.`
    );
    if (!ok) return;

    setRevoking(true);
    setRevokeMsg(null);
    setGrantsError(null);
    try {
      const data = await callAdmin({ action: "revoke", ids });
      setRevokeMsg(data.message || "Revoked.");
      setGrants((prev) => (prev ? prev.filter((g) => !ids.includes(g.id)) : prev));
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
      setGrantsMeta((prev) =>
        prev
          ? {
              ...prev,
              count: Math.max(0, prev.count - ids.length),
              activeCount: prev.activeCount,
            }
          : prev
      );
    } catch (err) {
      setGrantsError(err.message || "Network error");
    }
    setRevoking(false);
  }

  const bulkCount = [...new Set(bulkEmails.split("\n").map((e) => e.trim()).filter(Boolean))].length;
  const allSelected = !!grants && grants.length > 0 && selected.length === grants.length;
  const toggleAll = () => setSelected(allSelected ? [] : (grants || []).map((g) => g.id));
  const toggleOne = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="admin-page">
      <h2>🛡️ Admin Panel</h2>
      <p className="admin-subtitle">Grant, review, or revoke purchase access for users.</p>

      <div className="admin-form">
        <div className="admin-field">
          <label htmlFor="admin-email">User Email</label>
          <input
            id="admin-email"
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="admin-field">
          <label htmlFor="admin-type">Access</label>
          <select
            id="admin-type"
            value={purchaseType}
            onChange={(e) => setPurchaseType(e.target.value)}
            disabled={loading}
          >
            <option value="bundle">📦 All Subjects Bundle</option>
            <option disabled>──────────</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                📚 {s.name}
              </option>
            ))}
            <option disabled>──────────</option>
            {Object.entries(SCHOOL_LICENSE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                🏫 {label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-actions">
          <button
            className="admin-btn grant-btn"
            onClick={() => handleAction("grant")}
            disabled={loading}
          >
            {loading ? "..." : "✅ Grant Access"}
          </button>
          <button
            className="admin-btn revoke-btn"
            onClick={() => handleAction("revoke")}
            disabled={loading}
          >
            {loading ? "..." : "❌ Revoke Access"}
          </button>
        </div>

        {result && <div className="admin-msg admin-success">{result}</div>}
        {error && <div className="admin-msg admin-error">{error}</div>}
      </div>

      <TeacherLinksCard />

      <div className="admin-form" style={{ marginTop: "1.5rem" }}>
        <h3 className="admin-section-title">Bulk Grant — Pilot Class</h3>
        <p className="admin-subtitle" style={{ marginBottom: "1rem" }}>
          Grant all-subjects (bundle) access to a whole class at once — paste one email per line.
        </p>

        <div className="admin-field">
          <label htmlFor="admin-bulk-emails">Student Emails (one per line)</label>
          <textarea
            id="admin-bulk-emails"
            rows={6}
            placeholder={"student1@school.edu.jm\nstudent2@school.edu.jm\nstudent3@school.edu.jm"}
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            disabled={bulkLoading}
          />
        </div>

        <div className="admin-actions">
          <button
            className="admin-btn grant-btn"
            onClick={handleBulkGrant}
            disabled={bulkLoading || bulkCount === 0}
          >
            {bulkLoading ? "Granting..." : `✅ Grant All Subjects (${bulkCount})`}
          </button>
        </div>

        {bulkResult && <div className="admin-msg admin-success">{bulkResult}</div>}
        {bulkError && <div className="admin-msg admin-error">{bulkError}</div>}
      </div>

      {/* ---------------------------------------------------- ALL GRANTS */}
      <div className="admin-form" style={{ marginTop: "1.5rem" }}>
        <h3 className="admin-section-title">All Grants</h3>
        <p className="admin-subtitle" style={{ marginBottom: "1rem" }}>
          Every purchase access record on the server, newest first. Expand to see who holds what
          access and revoke any single grant.
        </p>

        <div className="admin-actions">
          <button className="admin-btn" onClick={loadGrants} disabled={grantsLoading || revoking}>
            {grantsLoading ? "Loading…" : grants ? "🔄 Refresh Grants" : "📋 View All Grants"}
          </button>
          {grants && selected.length > 0 && (
            <button
              className="admin-btn revoke-btn"
              onClick={() => revokeGrants(selected)}
              disabled={revoking}
            >
              {revoking ? "Revoking…" : `❌ Revoke Selected (${selected.length})`}
            </button>
          )}
        </div>

        {grantsMeta && (
          <p className="admin-grants-meta">
            {grantsMeta.count} grant{grantsMeta.count === 1 ? "" : "s"} ·{" "}
            {grantsMeta.activeCount} active
            {grantsMeta.missingAccounts > 0
              ? ` · ${grantsMeta.missingAccounts} with no matching account`
              : ""}
          </p>
        )}

        {grantsError && <div className="admin-msg admin-error">{grantsError}</div>}
        {revokeMsg && <div className="admin-msg admin-success">{revokeMsg}</div>}

        {grants && (
          grants.length === 0 ? (
            <p className="admin-subtitle" style={{ marginTop: ".5rem" }}>
              No grants recorded on the server yet.
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-col-check">
                      <input
                        type="checkbox"
                        aria-label="Select all grants"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Email</th>
                    <th>Access</th>
                    <th>Granted</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th className="admin-col-action" />
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => (
                    <tr key={g.id}>
                      <td className="admin-col-check">
                        <input
                          type="checkbox"
                          aria-label={`Select grant for ${g.email || "unknown account"}`}
                          checked={selected.includes(g.id)}
                          onChange={() => toggleOne(g.id)}
                        />
                      </td>
                      <td className="admin-cell-email">
                        {g.email || <span className="admin-muted">(no matching account)</span>}
                      </td>
                      <td>{prettyPurchaseType(g.purchaseType, subjectNames)}</td>
                      <td>{formatDate(g.createdAt)}</td>
                      <td>{formatDate(g.expiresAt)}</td>
                      <td>
                        <span className={g.active ? "admin-pill active" : "admin-pill expired"}>
                          {g.active ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td className="admin-col-action">
                        <button
                          className="admin-btn revoke-btn admin-btn-small"
                          onClick={() => revokeGrants([g.id])}
                          disabled={revoking}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <p className="admin-grants-note">
          This list shows server-side purchase grants only. Practice activity kept in a student's
          browser (their own device storage) does not appear here.
        </p>
      </div>
    </div>
  );
}
