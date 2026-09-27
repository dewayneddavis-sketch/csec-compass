import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const { user, loading } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo">🧭</span>
          <span className="navbar-title">CSEC Compass</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className={`navbar-link ${location.pathname === "/" ? "active" : ""}`}>Subjects</Link>
          <Link to="/planner" className={`navbar-link ${location.pathname === "/planner" ? "active" : ""}`}>Planner</Link>
          <Link to="/pricing" className={`navbar-link ${location.pathname === "/pricing" ? "active" : ""}`}>Pricing</Link>
          <Link to="/contact" className={`navbar-link navbar-contact ${location.pathname === "/contact" ? "active" : ""}`}>Contact</Link>
          <Link to="/teacher" className={`navbar-link navbar-teacher ${location.pathname === "/teacher" ? "active" : ""}`}>Teacher's Dashboard</Link>
          {/* Messages (owner direction 2026-09-27): a TOP-LEVEL student nav item,
              not a tab buried in /account. Shown to every signed-in account, the
              same way the ⚙️ admin link is — the destination is protected and the
              page's data is gated by the server per role, so the link cannot leak
              anything. There is no client-side teacher signal to hide it behind
              (the teacher lists are server-side secrets) and teachers have their
              own panel on Teacher's Dashboard. */}
          {!loading && user && (
            <Link to="/messages" className={`navbar-link navbar-messages ${location.pathname === "/messages" ? "active" : ""}`}>Messages</Link>
          )}
        </div>
        <div className="navbar-auth">
          {loading ? null : user ? (
            <>
              <Link to="/account" className={`navbar-link ${location.pathname === "/account" ? "active" : ""}`}>My Account</Link>
              <Link to="/admin" className={`navbar-link navbar-admin ${location.pathname === "/admin" ? "active" : ""}`}>⚙️</Link>
            </>
          ) : (
            <Link to="/auth" className={`navbar-link ${location.pathname.startsWith("/auth") ? "active" : ""}`}>Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
