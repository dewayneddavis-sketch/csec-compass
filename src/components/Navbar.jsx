import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const isSubjectPage = location.pathname.startsWith("/subject/");
  const isLessonPage = location.pathname.startsWith("/lesson/");

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo">🧭</span>
          <span className="navbar-title">CSEC Compass</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className={`navbar-link ${location.pathname === "/" ? "active" : ""}`}>
            Subjects
          </Link>
          {(isSubjectPage || isLessonPage) && (
            <span className="navbar-breadcrumb">
              / {location.pathname.split("/").pop().replace(/-/g, " ")}
            </span>
          )}
        </div>

        <div className="navbar-auth">
          {loading ? null : user ? (
            <Link to="/account" className={`navbar-link ${location.pathname === "/account" ? "active" : ""}`}>
              My Account
            </Link>
          ) : (
            <Link to="/auth" className={`navbar-link ${location.pathname.startsWith("/auth") ? "active" : ""}`}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}