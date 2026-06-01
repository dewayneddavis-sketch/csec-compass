import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/account", { replace: true });
  }, [user, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/account");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp-page">
      <div className="lp-card">
        <h2>Welcome Back</h2>
        <p className="lp-subtitle">Sign in to continue your CSEC prep.</p>
        {error && <div className="lp-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="lp-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="lp-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
          </div>
          <button className="lp-btn lp-btn-primary" disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
        </form>
        <div className="lp-links">
          <Link to="/signup">Need an account? Sign up</Link>
          <Link to="/auth/reset-password">Forgot password?</Link>
        </div>
        <Link to="/" className="lp-back">Back to Home</Link>
      </div>
    </div>
  );
}