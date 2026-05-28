import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function AuthPage({ mode: initialMode }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState(initialMode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
        else setMessage("Signed in successfully!");
      } else if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) setError(error.message);
        else setMessage("Check your email for confirmation link!");
      } else if (mode === "reset") {
        const { error } = await resetPassword(email);
        if (error) setError(error.message);
        else setMessage("Check your email for reset link!");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password";
  const altText = mode === "signin" ? "Need an account?" : mode === "signup" ? "Already have an account?" : "";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">{title}</h2>
        {message && <div className="auth-message success">{message}</div>}
        {error && <div className="auth-message error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          {mode !== "reset" && (
            <div className="auth-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
            </div>
          )}
          <button className="auth-btn" disabled={busy}>{busy ? "Please wait..." : title}</button>
        </form>
        <div className="auth-links">
          {altText && (
            <button className="auth-link" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
              {altText} {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          )}
          {mode === "signin" && (
            <button className="auth-link" onClick={() => { setMode("reset"); setError(""); setMessage(""); }}>
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <button className="auth-link" onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}