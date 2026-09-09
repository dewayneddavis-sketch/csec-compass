import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePurchases } from "../data/usePurchases";
import { getSubject, getSubjectModules, normalizeModules, getLessonExperiment } from "../data/contentLoader";
import ExperimentSandbox from "../components/ExperimentSandbox";
import "./LessonView.css";

// Direct deep-link guard: a locked lesson (beyond the 2-lesson preview)
// shows a paywall instead of content unless the user has purchased access.
export default function LessonView() {
  const { subjectId, lessonId } = useParams();
  const { user } = useAuth();
  const { hasAccess, loading: purchasesLoading } = usePurchases();
  const [lesson, setLesson] = useState(null);
  const [subject, setSubject] = useState(null);
  const [lessonIndex, setLessonIndex] = useState(-1);
  const [totalLessons, setTotalLessons] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const mods = await getSubjectModules(subjectId);
      const modules = normalizeModules(mods);
      const subj = await getSubject(subjectId);
      setSubject(subj);
      const flat = modules.flatMap((m) => m.lessons);
      setTotalLessons(flat.length);
      for (const mod of modules) {
        const found = mod.lessons.find((l) => l.id === lessonId);
        if (found) {
          setLesson({ ...found, moduleTitle: mod.title });
          break;
        }
      }
      const idx = flat.findIndex((l) => l.id === lessonId);
      setLessonIndex(idx);
      setLoading(false);
    }
    load();
  }, [subjectId, lessonId]);

  if (loading || (user && purchasesLoading))
    return <div className="lv-loading">Loading lesson...</div>;

  if (!lesson) {
    return (
      <div className="lv-not-found">
        <h2>Lesson not found</h2>
        <Link to={"/subject/" + subjectId} className="back-link">{String.fromCharCode(8592)} Back to Subject</Link>
      </div>
    );
  }

  // Fail closed: only the first 2 lessons are free. Anything beyond that
  // requires a verified purchase (or bundle). Unknown purchase state = locked.
  const isPreviewLesson = lessonIndex >= 0 && lessonIndex < 2;
  const paid = hasAccess(subjectId);
  if (!isPreviewLesson && !paid) {
    return (
      <div className="lv-not-found">
        <h2>🔒 This lesson requires full access</h2>
        <p>
          {user
            ? `You are viewing the free preview (2 of ${totalLessons} lessons). Unlock all lessons to continue.`
            : `Sign in to view the free 2-lesson preview, or unlock all ${totalLessons} lessons.`}
        </p>
        <Link to={"/pricing?subject=" + subjectId} className="back-link">Unlock full access</Link>
        <br />
        <Link to={"/subject/" + subjectId} className="back-link">{String.fromCharCode(8592)} Back to {subject?.name || subjectId}</Link>
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
        {lesson.content && (
          <div className="lv-body">
            {lesson.content.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}

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
              lessonId={lesson.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}
