import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllSubjects } from "../data/contentLoader";
import { useAuth } from "../context/AuthContext";
import { accountRoleLabel, offersDashboard } from "../data/accountRoles";
import SubjectCard from "../components/SubjectCard";
import InstagramLink from "../components/InstagramLink";
import "./Home.css";

// One dashboard entry point. Both dashboards render through this, so the Parent
// Dashboard sits at the top of the homepage with exactly the Teacher
// Dashboard's prominence (owner instruction 2026-11-05) — same card, same
// classes, same place — rather than as a smaller second-class link.
function DashboardCard({ tone, icon, title, text, sub, note, cta, secondary }) {
  return (
    <section className={`home-teacher home-dash home-dash-${tone}`}>
      <div className="home-teacher-card">
        <div>
          <h2 className="home-teacher-title">{icon} {title}</h2>
          <p className="home-teacher-text">{text}</p>
          {sub && <p className="home-teacher-text home-teacher-sub">{sub}</p>}
          {note && <p className="home-teacher-text home-teacher-sub home-dash-note">{note}</p>}
        </div>
        <div className="home-teacher-actions">
          {cta && <Link to={cta.to} className="home-cta home-teacher-cta">{cta.label}</Link>}
          {secondary && (
            <Link to={secondary.to} className="home-cta home-teacher-cta home-teacher-cta-ghost">{secondary.label}</Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, accountRole } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllSubjects();
        setSubjects(data || []);
      } catch (err) {
        console.error("Failed to load subjects:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // WHO THIS ACCOUNT IS, and therefore which entry point we put a button on.
  //
  // Being OFFERED a dashboard is not being ADMITTED to it — the server decides
  // that, from a school roster row, the teacher allowlist, or a verified
  // purchase (see src/data/accountRoles.js). Two consequences are visible here:
  //
  //   * the Parent Dashboard is safe for EVERY signed-in account: a parent sees
  //     their linked children, and a student sees their OWN progress and nobody
  //     else's, so that button can never dead-end (owner instruction
  //     2026-11-05 — "the parent can sign-in as the student");
  //   * the Teacher Dashboard can still refuse a non-teacher, so a signed-in
  //     Student or Parent gets the honest way in as a sentence instead of a
  //     button that ends at a wall. A signed-out visitor keeps the button —
  //     that is how the feature is found, and /teacher answers a signed-out
  //     visitor with a sign-in prompt, not an error.
  const signedIn = !!user;
  const roleLabel = accountRoleLabel(accountRole);
  const canUseTeacher = !signedIn || offersDashboard(accountRole, "teacher");

  const teacherNote = signedIn && !canUseTeacher
    ? `You're signed in as a ${roleLabel || "account without a declared identity"}. The Teacher Dashboard opens for a teacher your school's admin has added to your school's roster, or for an account that bought access and chose Teacher.`
    : null;

  const parentNote = signedIn
    ? accountRole === "student"
      ? "Signed in as a Student: a parent can sign in with your account and see this page. It shows your own progress — never another student's."
      : accountRole === "parent"
        ? "Signed in as a Parent: this shows the progress of the children linked to your account."
        : null
    : null;

  return (
    <div className="home">
      <section className="home-hero">
        <h1 className="home-title">Your Path to CSEC Success</h1>
        <p className="home-subtitle">Learn at your own pace with interactive lessons, experiment-driven tools, and knowledge checks. Pick a subject to get started.</p>
        <div className="home-cta-row">
          <a href="#subjects" className="home-cta">Browse All Subjects →</a>
          <Link to="/subject/english-a" className="home-cta home-cta-secondary">Try a Free Sample Lesson →</Link>
          {/* A parent landing here needs one obvious way in (owner direction
              2026-10-19, the "For parents" page). */}
          <Link to="/for-parents" className="home-cta home-cta-secondary">For parents →</Link>
        </div>
        <p className="home-cta-note">No signup needed — see how it works first</p>
      </section>
      {/* The two dashboards, side by side at the top of the homepage. */}
      <div className="home-dashboards">
        <DashboardCard
          tone="parent"
          icon="👨‍👩‍👧"
          title="Parent's Dashboard"
          text="See the progress of the children linked to your account — lessons completed, labs solved, quiz scores — in the same view a teacher gets."
          sub="A student can open this too: sign in with the student's own account and it shows their progress."
          note={parentNote}
          cta={{ to: "/parent", label: "Open Parent's Dashboard →" }}
        />
        <DashboardCard
          tone="teacher"
          icon="👩‍🏫"
          title="Teacher's Dashboard"
          text="Track your class's progress — lessons completed, labs solved, quiz scores — all in one view."
          sub="School admin? Keep your own school's teachers and class links in order in the school console."
          note={teacherNote}
          cta={canUseTeacher ? { to: "/teacher", label: "Open Teacher's Dashboard →" } : null}
          secondary={{ to: "/school", label: "School admin console →" }}
        />
      </div>
      <section id="subjects" className="home-subjects">
        <div className="home-subjects-header">
          <h2>All Subjects</h2>
          <span className="home-count">{loading ? "Loading..." : `${subjects.length} subjects`}</span>
        </div>
        <div className="home-grid">
          {loading ? (
            <p className="home-loading">Loading subjects...</p>
          ) : (
            subjects.map((s) => (<SubjectCard key={s.id} subject={s} />))
          )}
        </div>
      </section>
      {/* Instagram (owner addition 2026-09-26): one click through to the
          confirmed profile. The URL, the label and the visible copy all come
          from src/data/social.js — nothing about the handle is retyped here. */}
      <section className="home-social">
        <h2 className="home-social-title">Follow along</h2>
        <p className="home-social-text">
          Study tips, new lesson drops and exam countdowns go up on Instagram.
        </p>
        <InstagramLink className="home-social-link" />
      </section>
    </div>
  );
}
