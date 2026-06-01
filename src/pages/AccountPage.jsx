import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./Account.css";

export default function AccountPage() {
  const { user, session, signOut, loading } = useAuth();

  if (loading) {
    return <div className="acct-loading">Loading your account...</div>;
  }

  if (!user) {
    return (
      <div className="acct-guest">
        <div className="acct-card">
          <h2>Welcome to CSEC Compass</h2>
          <p>Sign in or create an account to track your progress, save your lessons, and pick up where you left off.</p>
          <div className="acct-actions">
            <Link to="/auth" className="acct-btn acct-btn-primary">Sign In</Link>
            <Link to="/auth/signup" className="acct-btn acct-btn-secondary">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="acct-page">
      <div className="acct-header">
        <div className="acct-avatar">{user.email?.charAt(0).toUpperCase() || "U"}</div>
        <div>
          <h1>My Account</h1>
          <p className="acct-email">{user.email}</p>
        </div>
      </div>

      <div className="acct-grid">
        <div className="acct-card">
          <h3>Profile</h3>
          <div className="acct-field"><span>Email</span><span>{user.email}</span></div>
          <div className="acct-field"><span>User ID</span><span className="acct-mono">{user.id?.substring(0, 12)}...</span></div>
          <div className="acct-field"><span>Joined</span><span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</span></div>
        </div>

        <div className="acct-card">
          <h3>Subscription</h3>
          <p className="acct-plan">Free Plan</p>
          <p className="acct-plan-desc">Access all subjects with interactive experiments and knowledge checks.</p>
          <p className="acct-upgrade">Premium features coming soon — bundle pricing for multiple subjects!</p>
        </div>

        <div className="acct-card">
          <h3>Quick Links</h3>
          <Link to="/" className="acct-link">Browse All Subjects →</Link>
          <Link to="/auth" className="acct-link">Account Settings →</Link>
        </div>

        <div className="acct-card">
          <h3>Session</h3>
          <p className="acct-session-info">Signed in since {session?.created_at ? new Date(session.created_at).toLocaleTimeString() : "this session"}</p>
          <button className="acct-btn acct-btn-danger" onClick={signOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}