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

export default function AdminPage() {
  const { user, session } = useAuth();
  const [email, setEmail] = useState("");
  const [purchaseType, setPurchaseType] = useState("bundle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // FIX (live bug): the old version scanned localStorage for keys containing
  // "supabase" — but supabase-js stores its session under `sb-<ref>-auth-token`,
  // which never contains "supabase", so the scan found nothing and admin grant
  // always failed with "Not authenticated. Please sign in first." even when
  // signed in. Get the token from the AuthContext session (same source
  // /api/purchases/list consumers use), with a live getSession() fallback.
  async function getAccessToken() {
    if (session?.access_token) return session.access_token;
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
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
      const accessToken = await getAccessToken();
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
        // the required email instead of showing a generic "Request failed".
        setError(data.error || "Request failed (" + res.status + ")");
      } else {
        setResult(data.message || (action === "grant" ? "Access granted!" : "Access revoked!"));
      }
    } catch (err) {
      setError(err.message || "Network error");
    }
    setLoading(false);
  }

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
    </div>
  );
}