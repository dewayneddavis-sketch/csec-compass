import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePurchases } from "../data/usePurchases";
import { FREE_PREVIEW_LESSONS } from "../data/access";
import { getSubject, getSubjectModules, getSubjectQuiz, normalizeModules } from "../data/contentLoader";
import ProgressBar from "../components/ProgressBar";
import Quiz from "../components/Quiz";
import ExperimentSandbox from "../components/ExperimentSandbox";
import ExtraPractice from "../components/ExtraPractice";
import MockExam from "../components/MockExam";
import SBASection from "../components/SBASection";
import { SBA_TAB_LABEL, sbaGuideLabel, sbaTabLabel, sbaTabNoun } from "../data/sbaTabs";
import Paper2Section from "../components/Paper2Section";
import ProgressTab from "../components/ProgressTab";
import {
  practicePaperTabs,
  practicePaperNumber,
  isPracticeTabId,
  resolveTabParam,
} from "../data/practicePapers";
import { sameLessonIds, loadLessonProgress, saveLessonProgress, setLessonComplete, subscribeLessonProgress } from "../data/lessonProgress";
import "./SubjectPage.css";

// One distinct colour per tab so students can tell them apart at a glance
// (owner feedback, school visit 2026-09-18: "It is hard to distinguish between
// tabs"). Each colour is a dark, accessible shade used as the tab's text on a
// pale tint, and as the active tab's background carrying white text — every
// text/background pair is at or above a 4.5:1 contrast ratio.
const TABS = [
  { id: "lessons", label: "Lessons", color: "#1d4ed8", tint: "#eff6ff" },              // blue
  { id: "experiment", label: "Interactive Lab", color: "#047857", tint: "#ecfdf5" },  // green
  { id: "quiz", label: "Knowledge Check", color: "#b45309", tint: "#fffbeb" },         // amber
  // The old single "Extra Practice" tab is gone: the subject's one 100-question
  // bank is presented as five Practice Paper tabs of 20 questions each, in bank
  // order (owner directive 2026-10-21). The five entries — ids, labels, short
  // labels and colours — come from src/data/practicePapers.js, so there are not
  // five hardcoded strings to drift apart, and the split itself is that module's
  // job too. A link to the old practice view opens Practice Paper 1 (see
  // resolveTabParam below).
  ...practicePaperTabs(),
  { id: "mock", label: "Mock Exam", color: "#b91c1c", tint: "#fef2f2" },               // red
  // Paper 2 only appears for subjects that actually ship paper2.json (Social
  // Studies and English B today) — see the availability probe in load().
  { id: "paper2", label: "Paper 2", color: "#9d174d", tint: "#fdf2f8" },              // pink
  { id: "progress", label: "Progress", color: "#0e7490", tint: "#ecfeff" },            // cyan
  { id: "sba", label: SBA_TAB_LABEL, color: "#0f766e", tint: "#f0fdfa" },                 // teal
];
// The tabs that are NOT practice papers — what a `?tab=` value may name besides
// Practice Paper 1–5.
const BASE_TAB_IDS = TABS.filter((tab) => !tab.shortLabel).map((tab) => tab.id);

export default function SubjectPage() {
  const { subjectId } = useParams();
  const { user } = useAuth();
  const { hasAccess, hasBundle, loading: purchasesLoading } = usePurchases();
  const [subject, setSubject] = useState(null);
  const [modules, setModules] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [activeModule, setActiveModule] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);
  // A `?tab=` link opens that tab directly. It is how a link written against the
  // old single practice view (/subject/<id>?tab=practice) still lands on
  // Practice Paper 1 instead of nowhere, and it makes any tab shareable.
  const [searchParams] = useSearchParams();
  // Resolved from the URL once per subject: the tab a link asked for, when it is
  // one of the page's own tabs (the five practice papers included).
  const initialTab = resolveTabParam(searchParams.get("tab"), BASE_TAB_IDS);
  const [activeTab, setActiveTab] = useState(initialTab || "lessons");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [hasPaper2, setHasPaper2] = useState(false);
  // The exam-support tab is "CSEC SBA" for most subjects, but French and
  // Spanish have no SBA portfolio -- their Paper 03 IS the oral exam, so the
  // label is per-subject (see src/data/sbaTabs.js).
  const tabs = TABS.map((tab) => (tab.id === "sba" ? { ...tab, label: sbaTabLabel(subjectId) } : tab));
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
      // The Paper 2 tab is only offered when the subject actually ships
      // paper2.json — otherwise the tab would lead to an empty panel.
      let paper2 = false;
      try {
        const res = await fetch(`/content/${subjectId}/paper2.json`, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          paper2 = Array.isArray(data) && data.length > 0;
        }
      } catch {
        paper2 = false;
      }
      setHasPaper2(paper2);
      // A `?tab=paper2` link for a subject that ships no paper2.json would open
      // a tab that is not drawn: send it to the lesson list instead of an
      // orphaned panel. It can only ever apply to the tab the link asked for.
      if (!paper2 && initialTab === "paper2") setActiveTab("lessons");
      setLoading(false);
    }
    load();
  }, [subjectId, initialTab]);

  useEffect(() => {
    // Read the shared progress store, then follow it. A lab finished on the
    // lesson page ticks its lesson through src/data/lessonProgress.js, and this
    // subscription turns that into the checkmark + progress bar without a
    // reload. Comparing before setting means a write -> notify -> write cycle
    // cannot spin.
    const saved = loadLessonProgress(subjectId);
    setCompletedLessons((prev) => (sameLessonIds(prev, saved.lessons) ? prev : saved.lessons));
    setQuizCompleted((prev) => (prev === saved.quizCompleted ? prev : saved.quizCompleted));
    return subscribeLessonProgress(subjectId, (next) => {
      setCompletedLessons((prev) => (sameLessonIds(prev, next.lessons) ? prev : next.lessons));
      setQuizCompleted((prev) => (prev === next.quizCompleted ? prev : next.quizCompleted));
    });
  }, [subjectId]);

  useEffect(() => {
    saveLessonProgress(subjectId, { lessons: completedLessons, quizCompleted });
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
  const lessonCount = paid ? allLessons.length : Math.min(FREE_PREVIEW_LESSONS, allLessons.length);
  const completedCount = completedLessons.length;

  // One reducer for the manual tick and the lab path (see
  // src/data/lessonProgress.js), so the two can never disagree about what
  // "complete" means. Manual un-tick stays possible.
  function toggleLesson(lessonId) {
    setCompletedLessons((prev) => {
      const next = setLessonComplete({ lessons: prev, quizCompleted }, lessonId, !prev.includes(lessonId));
      return sameLessonIds(prev, next.lessons) ? prev : next.lessons;
    });
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
          <p><strong>Preview Mode</strong> &mdash; You are viewing {FREE_PREVIEW_LESSONS} of {totalLessonCount} lessons. <Link to={"/pricing?subject=" + subjectId}>Unlock full access to all {totalLessonCount} lessons!</Link></p>
        </div>
      )}

      <div className="s-tabs">
        {tabs.filter((tab) => tab.id !== "paper2" || hasPaper2).map((tab) => (
          <button
            key={tab.id}
            className={"s-tab " + (activeTab === tab.id ? "active" : "")}
            style={{ "--tab-color": tab.color, "--tab-tint": tab.tint }}
            aria-pressed={activeTab === tab.id}
            // The practice tabs carry the full name as the accessible name even
            // when CSS shows the short PP1…PP5 label on a narrow phone.
            aria-label={tab.shortLabel ? tab.label : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.shortLabel ? (
              <>
                <span className="s-tab-label-full">{tab.label}</span>
                <span className="s-tab-label-short" aria-hidden="true">{tab.shortLabel}</span>
              </>
            ) : tab.label}
            {tab.id === "quiz" && quizCompleted && <span className="s-tab-done">&check;</span>}
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
                      // Global position across all modules: only the first
                      // FREE_PREVIEW_LESSONS lessons overall are free preview;
                      // the rest are locked until purchase (verified via
                      // hasAccess, fail-closed).
                      const globalIdx = allLessons.findIndex((l) => l.id === lesson.id);
                      const locked = !paid && globalIdx >= FREE_PREVIEW_LESSONS;
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
        {isPracticeTabId(activeTab) && (paid ? (
          <ExtraPractice
            key={activeTab}
            subjectId={subjectId}
            paper={practicePaperNumber(activeTab)}
          />
        ) : (
          <div className="s-upgrade-banner"><p><strong>🔒 Practice Papers are locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to work through all five practice papers.</p></div>
        ))}
        {activeTab === "mock" && (paid ? <MockExam subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 Mock Exam is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to sit the timed mock.</p></div>
        ))}
        {activeTab === "paper2" && (paid ? <Paper2Section subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 Paper 2 is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to practise the typed-answer Paper 2 questions.</p></div>
        ))}
        {activeTab === "progress" && (paid ? <ProgressTab subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 Progress tracking is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to see your weak topics and pass-rate trend.</p></div>
        ))}
        {activeTab === "sba" && (paid ? <SBASection subjectId={subjectId} /> : (
          <div className="s-upgrade-banner"><p><strong>🔒 {sbaGuideLabel(subjectId)} is locked.</strong> <Link to={"/pricing?subject=" + subjectId}>Unlock full access</Link> to view the {sbaTabNoun(subjectId)} tab.</p></div>
        ))}
      </div>
    </div>
  );}
