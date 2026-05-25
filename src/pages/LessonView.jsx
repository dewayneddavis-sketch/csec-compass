import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getSubject, getSubjectModules, normalizeModules, getLessonExperiment } from "../data/contentLoader";
import ExperimentSandbox from "../components/ExperimentSandbox";
import "./LessonView.css";

export default function LessonView() {
  const { subjectId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const mods = await getSubjectModules(subjectId);
      const modules = normalizeModules(mods);
      const subj = await getSubject(subjectId);
      setSubject(subj);
      for (const mod of modules) {
        for (const l of mod.lessons) {
          if (l.id === lessonId) {
            setLesson({ ...l, moduleTitle: mod.title });
            break;
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [subjectId, lessonId]);

  if (loading) return <div className="lv-loading">Loading lesson...</div>;

  if (!lesson) {
    return (
      <div className="lv-not-found">
        <h2>Lesson not found</h2>
        <Link to={"/subject/" + subjectId} className="back-link">{String.fromCharCode(8592)} Back to Subject</Link>
      </div>
    );
  }

  const experimentConfig = lesson.experiment ? getLessonExperiment(lesson.experiment) : null;

  return (
    <div className="lv-page">
      <div className="lv-header">
        <Link to={"/subject/" + subjectId} className="lv-back">{String.fromCharCode(8592)} Back to {subject?.name || subjectId}</Link>
        {lesson.moduleTitle && <span className="lv-breadcrumb">{lesson.moduleTitle} /</span>}
        <h1 className="lv-title">{lesson.title}</h1>
      </div>

      <div className="lv-content">
        {lesson.objectives?.length > 0 && (
          <div className="lv-objectives">
            <h3>Learning Objectives</h3>
            <ul>{lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </div>
        )}

        {lesson.concepts?.length > 0 && (
          <div className="lv-concepts">
            <h3>Key Concepts</h3>
            <ul>{lesson.concepts.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        )}

        {lesson.experiment && (
          <div className="lv-experiment">
            <h3>Interactive Activity</h3>
            <ExperimentSandbox
              subjectId={subjectId}
              config={experimentConfig || lesson.experiment}
              lessonExperiment={lesson.experiment}
            />
          </div>
        )}
      </div>
    </div>
  );
}
