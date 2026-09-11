import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePurchases } from "../data/usePurchases";
import { getSubject, getSubjectModules, getSubjectQuiz, normalizeModules } from "../data/contentLoader";
import ProgressBar from "../components/ProgressBar";
import Quiz from "../components/Quiz";
import ExperimentSandbox from "../components/ExperimentSandbox";
import ExtraPractice from "../components/ExtraPractice";
import MockExam from "../components/MockExam";
import SBASection from "../components/SBASection";
import ProgressTab from "../components/ProgressTab";
import "./SubjectPage.css";

export default function SubjectPage() {
  const { subjectId } = useParams();
  const { user } = useAuth();
  const { hasAccess, hasBundle, loading: purchasesLoading } = usePurchases();
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

  // FAIL CLOSED: hasAccess() returns false for logged-out users, while
  // purchases are still loading, and on API error — so everyone sees the
  // 2-lesson preview + paywall until a verified purchase unlocks them.
  const paid = hasAccess(subjectId);
  const currentModule = modules[activeModule];
  const allLessons = modules.flatMap((m) => m.lessons);
  const totalLessonCount = allLessons.length;
  const lessonCount = paid ? allLessons.length : Math.min(2, allLessons.length);
  const completedCount = completedLessons.length;

  function toggleLesson(lessonId) {
    setCompletedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  }

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

      {(purchasesLoading && user) ? (
        <div className="s-upgrade-banner">
          <p>Checking your access…</p>
        </div>
      ) : !paid && (
        <div className="s-upgrade-banner">
          <p><strong>Preview Mode</strong> &mdash; You are viewing 2 of {totalLessonCount} lessons. <Link to={"/pricing?subject=" + subjectId}>Unlock full access to all {totalLessonCount} lessons!</Link></p>
        </div>
      )}

      <div className="s-tabs">
        {[{ id: "lessons", label: "Lessons" }, { id: "experiment", label: "Interactive Lab" }, { id: "quiz", label: "Knowledge Check" }, { id: "practice", label: "Extra Practice" }, { id: "mock", label: "Mock Exam" }, { id: "progress", label: "Progress" }, { id: "sba", label: "CSEC SBA" }].map((tab) => (
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
                      // Global position across all modules: only the first 2
                      // lessons overall are free preview; the rest are locked
                      // until purchase (verified via hasAccess, fail-closed).
                      const globalIdx = allLessons.findIndex((l) => l.id === lesson.id);
                      const locked = !paid && globalIdx >= 2;
                      const done = completedLessons.includes(lesson.id);
                      if (locked) {
                        return (
                          <div key={lesson.id} className="s-lesson-item s-lesson-locked">
                            <span className="s-lesson-check">🔒</span>
                            <span className="s-lesson-name">{lesson.title}</span>
                            <Link to={"/pricing?subject=" + subjectId} className="s-lesson-buy">Purchase to access</Link>
                          </div>
                        );
                      }
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
        {activeTab === "quiz" && (paid ? <Quiz questions={quizQuestions} subjectTitle={subject.name} subjectId={subjectId} onComplete={() => setQuizCompleted(true)} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 Knowledge Check is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to test yourself on all lessons.</p></div>
        ))}
        {activeTab === "practice" && (paid ? <ExtraPractice subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 Extra Practice is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to practise all lessons.</p></div>
        ))}
        {activeTab === "mock" && (paid ? <MockExam subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 Mock Exam is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to sit the timed mock.</p></div>
        ))}
        {activeTab === "progress" && (paid ? <ProgressTab subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 Progress tracking is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to see your weak topics and pass-rate trend.</p></div>
        ))}
        {activeTab === "sba" && (paid ? <SBASection subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 SBA Guide is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to view the SBA tab.</p></div>
        ))}
      </div>
    </div>
  );}
