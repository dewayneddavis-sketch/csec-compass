import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import "./AdminPage.css";

const SUBJECT_IDS = [
  "mathematics",
  "english-a",
  "biology",
  "chemistry",
  "physics",
  "principles-of-accounts",
  "information-technology",
  "social-studies",
  "human-social-biology",
  "spanish",
];

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

export default function AdminPage() {
  const { user, session } = useAuth();
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

  async function handleAction(action) {
    if (!email.trim()) {
      setError("Please enter a user email");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const accessToken = await getAccessToken(session);
      if (!accessToken) {
        setError("Not authenticated. Please sign in first.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/grant-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({ email: email.trim(), purchaseType, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Surface the server error verbatim so a 403 owner-gate failure names
        // the required owner email instead of a generic "Request failed".
        setError(data.error || "Request failed (" + res.status + ")");
      } else {
        setResult(data.message || (action === "grant" ? "Access granted!" : "Access revoked!"));
      }
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
      const accessToken = await getAccessToken(session);
      if (!accessToken) {
        setBulkError("Not authenticated. Please sign in first.");
        setBulkLoading(false);
        return;
      }

      const res = await fetch("/api/admin/grant-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({ emails, purchaseType: "bundle", action: "grant" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBulkError(data.error || "Request failed (" + res.status + ")");
      } else {
        let msg = data.message;
        if (data.notFound?.length) msg += ` — not found: ${data.notFound.join(", ")}`;
        if (data.already?.length) msg += ` — already had access: ${data.already.join(", ")}`;
        setBulkResult(msg);
      }
    } catch (err) {
      setBulkError(err.message || "Network error");
    }
    setBulkLoading(false);
  }

  const bulkCount = [...new Set(bulkEmails.split("\n").map((e) => e.trim()).filter(Boolean))].length;

  return (
    <div className="admin-page">
      <h2>🛡️ Admin Panel</h2>
      <p className="admin-subtitle">Grant or revoke purchase access for users.</p>

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
          <label htmlFor="admin-type">Purchase Type</label>
          <select
            id="admin-type"
            value={purchaseType}
            onChange={(e) => setPurchaseType(e.target.value)}
            disabled={loading}
          >
            <option value="bundle">📦 Full Bundle</option>
            <option disabled>──────────</option>
            {SUBJECT_IDS.map((id) => (
              <option key={id} value={id}>
                📚 {id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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

      <div className="admin-form" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 .25rem", fontSize: "1.05rem", color: "#111827" }}>Bulk Grant — Pilot Class</h3>
        <p className="admin-subtitle" style={{ marginBottom: "1rem" }}>
          Grant all-10-subjects (bundle) access to a whole class at once — paste one email per line.
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
    </div>
  );
}
