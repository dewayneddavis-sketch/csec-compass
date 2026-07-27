import { useState } from "react";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [purchaseType, setPurchaseType] = useState("bundle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleAction(action) {
    if (!email.trim()) {
      setError("Please enter a user email");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const session = JSON.parse(localStorage.getItem("sb-" + (window.__SUPABASE_URL || "").split("//")[1]?.replaceAll(".", "-") + "-auth") || "{}");
      const token = session?.access_token;
      if (!token) {
        // Try from supabase auth context directly
      }

      // Get token from supabase
      const supabaseUrls = ["qognlaemukntbqutdcjw"];
      let accessToken = null;
      for (const key of Object.keys(localStorage)) {
        if (key.includes("supabase") && key.includes("auth")) {
          try {
            const s = JSON.parse(localStorage.getItem(key));
            if (s?.access_token) {
              accessToken = s.access_token;
              break;
            }
          } catch {}
        }
      }

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
        setError(data.error || "Request failed");
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
