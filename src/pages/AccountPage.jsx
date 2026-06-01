import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "./Account.css";

const subjectList = [
  { id: "mathematics", name: "Mathematics", icon: "📐", purchased: true },
  { id: "english-a", name: "English A", icon: "📝", purchased: true },
  { id: "biology", name: "Biology", icon: "🧬", purchased: true },
  { id: "chemistry", name: "Chemistry", icon: "⚗️", purchased: true },
  { id: "physics", name: "Physics", icon: "⚡", purchased: true },
  { id: "information-technology", name: "Information Technology", icon: "💻", purchased: true },
  { id: "principles-of-accounts", name: "Principles of Accounts", icon: "📊", purchased: true },
  { id: "principles-of-business", name: "Principles of Business", icon: "🏢", purchased: true },
  { id: "social-studies", name: "Social Studies", icon: "🌍", purchased: true },
  { id: "history", name: "History", icon: "📜", purchased: true },
  { id: "geography", name: "Geography", icon: "🗺️", purchased: true },
  { id: "human-social-biology", name: "Human & Social Biology", icon: "🫀", purchased: true },
  { id: "spanish", name: "Spanish", icon: "🇪🇸", purchased: true },
  { id: "french", name: "French", icon: "🇫🇷", purchased: false },
  { id: "agricultural-science", name: "Agricultural Science", icon: "🌱", purchased: false },
];

export default function AccountPage() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return <div className="acct-loading">Loading your account...</div>;
  }

  if (!user) {
    return (
      <div className="acct-guest">
        <div className="acct-card">
          <h2>Please Log In</h2>
          <p>Sign in to view your account, track progress, and manage your subjects.</p>
          <div className="acct-actions">
            <Link to="/login" className="acct-btn acct-btn-primary">Sign In</Link>
            <Link to="/signup" className="acct-btn acct-btn-secondary">Create Account</Link>
          </div>
          <Link to="/" className="acct-back-home">Back to Home</Link>
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
          <div className="acct-field"><span>Member since</span><span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</span></div>
        </div>

        <div className="acct-card">
          <h3>Subscription</h3>
          <p className="acct-plan">Free Plan</p>
          <p className="acct-plan-desc">All core subjects are available. Premium bundles coming soon!</p>
        </div>

        <div className="acct-card acct-card-full">
          <h3>My Subjects</h3>
          <div className="acct-subjects">
            {subjectList.map((s) => (
              <Link key={s.id} to={`/subject/${s.id}`} className={`acct-subject ${s.purchased ? "unlocked" : "locked"}`}>
                <span className="acct-subject-icon">{s.icon}</span>
                <span className="acct-subject-name">{s.name}</span>
                <span className="acct-subject-status">{s.purchased ? "✓" : "🔒"}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="acct-card">
          <h3>Account Actions</h3>
          <button className="acct-btn acct-btn-danger" onClick={signOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}