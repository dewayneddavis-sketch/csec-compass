import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
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
          <Link
            to="/"
            className={`navbar-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Subjects
          </Link>
          {(isSubjectPage || isLessonPage) && (
            <span className="navbar-breadcrumb">
              / {location.pathname.split("/").pop().replace(/-/g, " ")}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
