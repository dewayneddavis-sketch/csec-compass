import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePurchases } from "../data/usePurchases";
import { getSubject, getSubjectModules, getSubjectQuiz, normalizeModules } from "../data/contentLoader";
import ProgressBar from "../components/ProgressBar";
import Quiz from "../components/Quiz";
import ExperimentSandbox from "../components/ExperimentSandbox";
import "./SubjectPage.css";

export default function SubjectPage() {
  const { subjectId } = useParams();
  const { user } = useAuth();
  const { hasAccess, loading: purchasesLoading } = usePurchases();
  const [subject, setSubject] = useState(null);
  const [modules, setModules] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [activeModule, setActiveModule] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [activeTab, setActiveTab] = useState("lessons");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const subj = await getSubject(subjectId);
      setSubject(subj);
      const mods = await getSubjectModules(subjectId);
      setModules(normalizeModules(mods));
      const quiz = await getSubjectQuiz(subjectId);
      if (quiz) setQuizQuestions(quiz);
      setLoading(false);
    }
    load();
  }, [subjectId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("csec-" + subjectId + "-progress");
      if (saved) {
        const d = JSON.parse(saved);
        if (d.lessons) setCompletedLessons(d.lessons);
        if (d.quizCompleted) setQuizCompleted(d.quizCompleted);
      }
    } catch {}
  }, [subjectId]);

  useEffect(() => {
    localStorage.setItem("csec-" + subjectId + "-progress", JSON.stringify({ lessons: completedLessons, quizCompleted }));
  }, [completedLessons, quizCompleted, subjectId]);

  if (loading) return <div className="s-loading">Loading subject...</div>;

  if (!subject) {
    return (
      <div className="s-not-found">
        <h2>Subject not found</h2>
        <p>The subject "{subjectId}" does not exist.</p>
        <Link to="/" className="back-link">&larr; Back to All Subjects</Link>
      </div>
    );
  }

  const paid = user ? hasAccess(subjectId) : true;
  const currentModule = modules[activeModule];
  const allLessons = modules.flatMap((m) => m.lessons);
  const visibleLessons = paid ? allLessons : allLessons.slice(0, 2);
  const lessonCount = paid ? allLessons.length : 2;
  const totalLessonCount = allLessons.length;
  const completedCount = completedLessons.length;

  function toggleLesson(lessonId) {
    setCompletedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  }

  const experimentConfig = null;

  return (
    <div className="subject-page">
      <div className="subject-header" style={{ "--subject-color": subject.color }}>
        <Link to="/" className="s-back">&larr; All Subjects</Link>
        <div className="s-header-main">
          <span className="s-header-icon">{subject.icon}</span>
          <div>
            <h1 className="s-header-title">{subject.name}</h1>
            <p className="s-header-desc">{subject.description}</p>
          </div>
        </div>
        <ProgressBar completed={completedCount} total={lessonCount} label="Lessons Completed" />
      </div>

      {!paid && user && (
        <div className="s-upgrade-banner">
          <p>You are viewing sample lessons. <Link to="/pricing">Upgrade to unlock all {totalLessonCount} lessons!</Link></p>
        </div>
      )}

      <div className="s-tabs">
        {[{ id: "lessons", label: "Lessons" }, { id: "experiment", label: "Interactive Lab" }, { id: "quiz", label: "Knowledge Check" }].map((tab) => (
          <button key={tab.id} className={"s-tab " + (activeTab === tab.id ? "active" : "")} onClick={() => setActiveTab(tab.id)}>
            {tab.label}{tab.id === "quiz" && quizCompleted && <span className="s-tab-done">&check;</span>}
          </button>
        ))}
      </div>

      <div className="s-content">
        {activeTab === "lessons" && (
          <div className="s-lessons">
            <div className="s-modules-list">
              {modules.map((mod, i) => (
                <button key={mod.id} className={"s-module-btn " + (activeModule === i ? "active" : "")} onClick={() => setActiveModule(i)}>
                  <span className="s-module-num">{i + 1}</span>
                  <div><strong>{mod.title}</strong><span className="s-module-lessons">{mod.lessons.length} lessons</span></div>
                </button>
              ))}
            </div>
            <div className="s-lesson-list">
              {currentModule ? (
                <>
                  <h3 className="s-lesson-module-title">Module {activeModule + 1}: {currentModule.title}</h3>
                  <div className="s-lesson-items">
                    {currentModule.lessons.map((lesson) => {
                      const done = completedLessons.includes(lesson.id);
                      return (
                        <div key={lesson.id} className={"s-lesson-item " + (done ? "done" : "")} onClick={() => toggleLesson(lesson.id)}>
                          <span className="s-lesson-check">{done ? "\u2705" : "\u2B1C"}</span>
                          <Link to={"/lesson/" + subjectId + "/" + lesson.id} className="s-lesson-name" onClick={(e) => e.stopPropagation()}>{lesson.title}</Link>
                          <span className="s-lesson-status">{done ? "Completed" : "Mark complete"}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : <p className="s-no-content">No modules loaded yet.</p>}
            </div>
          </div>
        )}
        {activeTab === "experiment" && <ExperimentSandbox subjectId={subjectId} />}
        {activeTab === "quiz" && <Quiz questions={quizQuestions} subjectTitle={subject.name} onComplete={() => setQuizCompleted(true)} />}
      </div>
    </div>
  );
}