import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePurchases } from "../data/usePurchases";
import { getAllSubjects } from "../data/contentLoader";
import { Link } from "react-router-dom";
import "./Account.css";

export default function AccountPage() {
  const { user, signOut, loading } = useAuth();
  const { hasAccess, hasBundle, hasSchoolLicense, schoolLicenseSeats, purchasedSubjects } = usePurchases();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getAllSubjects()
      .then((list) => { if (!cancelled) setSubjects(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setSubjects([]); });
    return () => { cancelled = true; };
  }, []);

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

  // Real plan, read from /api/purchases/list (fail-closed: anything unknown
  // reads as the free preview, never as paid access).
  let planName = "Free preview";
  let planDesc = "Every subject is open for its 2 free lessons. Buy a subject or the bundle to unlock the full course.";
  if (hasSchoolLicense) {
    planName = "School License";
    planDesc = schoolLicenseSeats > 0
      ? `Up to ${schoolLicenseSeats} student accounts, all subjects, one year of access.`
      : "All subjects, one year of access, for your school's student accounts.";
  } else if (hasBundle) {
    planName = "All Subjects Bundle";
    planDesc = "Every CSEC subject on the platform, one year of access.";
  } else if (purchasedSubjects.length > 0) {
    planName = purchasedSubjects.length === 1 ? "Single Subject" : `${purchasedSubjects.length} Subjects`;
    planDesc = "One year of access to the subjects you bought.";
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
          <p className="acct-plan">{planName}</p>
          <p className="acct-plan-desc">{planDesc}</p>
        </div>

        <div className="acct-card acct-card-full">
          <h3>My Subjects</h3>
          <div className="acct-subjects">
            {(subjects.length > 0 ? subjects : []).map((s) => {
              const unlocked = hasAccess(s.id);
              return (
                <Link key={s.id} to={`/subject/${s.id}`} className={`acct-subject ${unlocked ? "unlocked" : "locked"}`}>
                  <span className="acct-subject-icon">{s.icon}</span>
                  <span className="acct-subject-name">{s.name}</span>
                  <span className="acct-subject-status">{unlocked ? "✓" : "🔒"}</span>
                </Link>
              );
            })}
            {subjects.length === 0 && <p className="acct-plan-desc">Loading subjects…</p>}
          </div>
        </div>

        {/* Bought a course for a child? The link is made at checkout (the
            parent dashboard explains it too); this is the way in. The page
            itself shows the "no child linked yet" state for anyone else. */}
        <div className="acct-card">
          <h3>Family</h3>
          <p className="acct-plan-desc">
            Bought a subject or the all-subjects bundle and added your child’s email at checkout?
            Track their lessons, labs and quiz scores on the parent dashboard.
          </p>
          <Link to="/parent" className="acct-btn acct-btn-secondary">Parent dashboard</Link>
        </div>

        <div className="acct-card">
          <h3>Account Actions</h3>
          <button className="acct-btn acct-btn-danger" onClick={signOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
