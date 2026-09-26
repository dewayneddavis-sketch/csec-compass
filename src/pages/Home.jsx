import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllSubjects } from "../data/contentLoader";
import SubjectCard from "../components/SubjectCard";
import InstagramLink from "../components/InstagramLink";
import "./Home.css";

export default function Home() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="home">
      <section className="home-hero">
        <h1 className="home-title">Your Path to CSEC Success</h1>
        <p className="home-subtitle">Learn at your own pace with interactive lessons, experiment-driven tools, and knowledge checks. Pick a subject to get started.</p>
        <div className="home-cta-row">
          <a href="#subjects" className="home-cta">Browse All Subjects →</a>
          <Link to="/subject/english-a" className="home-cta home-cta-secondary">Try a Free Sample Lesson →</Link>
        </div>
        <p className="home-cta-note">No signup needed — see how it works first</p>
      </section>
      <section className="home-teacher">
        <div className="home-teacher-card">
          <div>
            <h2 className="home-teacher-title">👩‍🏫 Teacher's Dashboard</h2>
            <p className="home-teacher-text">
              Track your class's progress — lessons completed, labs solved, quiz scores — all in one view.
            </p>
            <p className="home-teacher-text home-teacher-sub">
              School admin? Keep your own school's teachers and class links in order in the school console.
            </p>
          </div>
          <div className="home-teacher-actions">
            <Link to="/teacher" className="home-cta home-teacher-cta">Open Teacher's Dashboard →</Link>
            <Link to="/school" className="home-cta home-teacher-cta home-teacher-cta-ghost">School admin console →</Link>
          </div>
        </div>
      </section>
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