import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./SignupPage.css";

export default function SignupPage() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Consent to the Terms and the Privacy Policy, taken BEFORE the account is
  // created. This is the second account-creation form on the site (/signup
  // alongside /auth/signup), so it carries the same requirement: a consent step
  // that one of the two forms skips would not be consent (owner legal review
  // 2026-09-22).
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    // Enter inside a field can submit a form whose button is disabled in some
    // browsers, so the rule is enforced here as well as on the button.
    if (!agreed) {
      setError("Please agree to the Terms of Service and the Privacy Policy to create an account.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setMessage("Account created! Check your email for a confirmation link.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sp-page">
      <div className="sp-card">
        <h2>Create Account</h2>
        <p className="sp-subtitle">Start your CSEC journey today.</p>
        {message && <div className="sp-message success">{message}</div>}
        {error && <div className="sp-message error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="sp-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="sp-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
          </div>
          <div className="sp-field">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat your password" />
          </div>
          <div className="sp-consent">
            <label className="sp-consent-label">
              <input
                type="checkbox"
                className="sp-consent-box"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="sp-consent-link">Terms of Service</Link> and the{" "}
                <Link to="/privacy" className="sp-consent-link">Privacy Policy</Link>.
              </span>
            </label>
          </div>
          <button className="sp-btn sp-btn-primary" disabled={busy || !agreed}>{busy ? "Creating account..." : "Create Account"}</button>
        </form>
        <div className="sp-links">
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
        <Link to="/" className="sp-back">Back to Home</Link>
      </div>
    </div>
  );
}