import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuizAnalytics, useLessonLookup } from "../data/useQuizAnalytics";
import WeakTopicsPanel from "./WeakTopicsPanel";
import "./ProgressTab.css";

const QUIZ_LABELS = {
  "knowledge-check": "Knowledge Check",
  practice: "Extra Practice",
  mock: "Mock Exam",
};

// Per-subject Progress tab: attempt history, pass-rate trend, and the weak
// topic radar with a targeted revision path (over all recorded attempts).
export default function ProgressTab({ subjectId }) {
  const { attempts, topics, trend, loading } = useQuizAnalytics(subjectId);
  const lessonLookup = useLessonLookup(subjectId);
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return <div className="pt-loading">Loading your progress…</div>;
  }

  if (attempts.length === 0) {
    return (
      <div className="pt-empty">
        <div className="pt-empty-icon">📈</div>
        <h3>No progress yet</h3>
        <p>Your quiz attempts will appear here once you complete a Knowledge Check, Extra Practice round, or Mock Exam.</p>
        {topics.length === 0 && (
          <p className="pt-note">This tab tracks your weak topics and pass-rate trend so you know exactly what to revise.</p>
        )}
      </div>
    );
  }

  const visible = showAll ? attempts : attempts.slice(0, 8);
  const avgPct = attempts.length > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.pct || 0), 0) / attempts.length)
    : 0;
  const passedCount = attempts.filter((a) => a.passed).length;

  return (
    <div className="pt">
      <div className="pt-stats">
        <div className="pt-stat">
          <span className="pt-stat-num">{attempts.length}</span>
          <span className="pt-stat-label">Attempts</span>
        </div>
        <div className="pt-stat">
          <span className="pt-stat-num">{avgPct}%</span>
          <span className="pt-stat-label">Avg score</span>
        </div>
        <div className="pt-stat">
          <span className="pt-stat-num">{passedCount}</span>
          <span className="pt-stat-label">Passed</span>
        </div>
        <div className="pt-stat">
          <span className="pt-stat-num">{topics.length}</span>
          <span className="pt-stat-label">Topics tracked</span>
        </div>
      </div>

      {trend.length > 0 && (
        <div className="pt-section">
          <h4>Pass-Rate Trend</h4>
          <div className="pt-trend">
            {trend.map((t) => {
              const label = t.passed ? "Pass" : "Below pass";
              return (
                <div className="pt-trend-col" key={t.attemptId + t.createdAt} title={`${new Date(t.createdAt).toLocaleDateString()} — ${t.pct}% (${label})`}>
                  <span className="pt-trend-pct">{t.pct}%</span>
                  <div className={`pt-trend-bar ${t.passed ? "pass" : "fail"}`} style={{ height: `${Math.max(10, t.pct)}%` }} />
                  <span className="pt-trend-date">{new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-section">
        <h4>Attempt History</h4>
        <div className="pt-history">
          {visible.map((a) => (
            <div className={`pt-attempt ${a.passed ? "pass" : "fail"}`} key={a.attemptId + a.createdAt}>
              <span className="pt-attempt-name">{QUIZ_LABELS[a.quizType] || a.quizType}</span>
              <span className="pt-attempt-date">{new Date(a.createdAt).toLocaleString()}</span>
              <span className="pt-attempt-score">{a.score}/{a.total} ({a.pct}%)</span>
              <span className="pt-attempt-badge">{a.passed ? "✅ Pass" : "❌ Below 60%"}</span>
            </div>
          ))}
        </div>
        {attempts.length > 8 && (
          <button className="pt-toggle" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show fewer" : `Show all ${attempts.length} attempts`}
          </button>
        )}
      </div>

      <WeakTopicsPanel subjectId={subjectId} />

      {topics.length > 0 && (
        <p className="pt-note">
          Weak topics are ranked by accuracy across every attempt.{" "}
          {lessonLookup ? "Click a topic to open its lesson." : ""}
        </p>
      )}
      <div className="pt-reset-note">
        <Link to={`/subject/${subjectId}`}>← Back to {subjectId.replace(/-/g, " ")}</Link>
      </div>
    </div>
  );
}