import { useState, useEffect } from "react";
import { getAllSubjects } from "../data/contentLoader";
import SubjectCard from "../components/SubjectCard";
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
        <a href="#subjects" className="home-cta">Browse All Subjects →</a>
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
    </div>
  );
}