import { Link } from "react-router-dom";
import { useQuizAnalytics, useLessonLookup } from "../data/useQuizAnalytics";
import "./WeakTopicsPanel.css";

// After-quiz results panel: aggregates per-question topic results across all
// attempts for the subject, ranked weakest-first (lowest accuracy), and shows
// a targeted revision path linking each weak topic to its lesson.
export default function WeakTopicsPanel({ subjectId, latestAttemptId, compact }) {
  // Refresh after the new attempt lands (latestAttemptId changes).
  const { topics, loading } = useQuizAnalytics(subjectId, latestAttemptId || "initial");
  const lessonLookup = useLessonLookup(subjectId);

  if (loading) {
    return (
      <div className="wtp">
        <p className="wtp-note">Crunching your results…</p>
      </div>
    );
  }

  // Topics with any wrong answer are "need attention". Perfect-skill topics
  // are listed separately as mastered.
  const weak = topics.filter((t) => t.wrong > 0);
  const mastered = topics.filter((t) => t.wrong === 0 && t.total > 0);

  if (topics.length === 0) {
    return (
      <div className="wtp">
        <div className="wtp-empty">
          <span className="wtp-icon">🧭</span>
          <p>Complete a knowledge check, extra practice, or mock exam and your weak topics will appear here with a revision plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wtp">
      <div className="wtp-head">
        <span className="wtp-icon">🎯</span>
        <h4>Weak Topic Radar</h4>
        <span className="wtp-sub">Ranked weakest-first across your attempts</span>
      </div>

      {weak.length === 0 ? (
        <p className="wtp-allgood">✅ No weak topics — you're nailing everything you've practised!</p>
      ) : (
        <>
          <div className="wtp-list">
            {weak.map((t) => {
              const lesson = lessonLookup[t.topic];
              const barW = Math.max(6, 100 - t.accuracy);
              return (
                <div key={t.topic} className="wtp-row">
                  <div className="wtp-row-top">
                    <span className="wtp-topic">{lesson ? lesson.title : t.topic.replace(/-/g, " ")}</span>
                    <span className="wtp-stat">
                      {t.wrong} wrong / {t.total} · {t.accuracy}% right
                    </span>
                  </div>
                  <div className="wtp-bar">
                    <div className="wtp-bar-fill" style={{ width: barW + "%" }} />
                  </div>
                  {lesson && (
                    <Link to={`/lesson/${subjectId}/${t.topic}`} className="wtp-revise">
                      📖 Revise: {lesson.title}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {!compact && (
            <div className="wtp-revision-path">
              <h5>Your Targeted Revision Path</h5>
              <ol>
                {weak.slice(0, 5).map((t, i) => {
                  const lesson = lessonLookup[t.topic];
                  return (
                    <li key={t.topic}>
                      {lesson ? (
                        <Link to={`/lesson/${subjectId}/${t.topic}`}>
                          <strong>{i + 1}. {lesson.title}</strong>
                        </Link>
                      ) : (
                        <strong>{i + 1}. {t.topic.replace(/-/g, " ")}</strong>
                      )}
                      <span className="wtp-li-sub">{lesson?.moduleTitle || ""}{lesson?.moduleTitle ? " · " : ""}revise then retake</span>
                    </li>
                  );
                })}
              </ol>
              <p className="wtp-note">Revisit these lessons, then retake the quiz to re-measure.</p>
            </div>
          )}
        </>
      )}

      {mastered.length > 0 && (
        <div className="wtp-mastered">
          <span className="wtp-mastered-label">🚀 Mastered:</span>{" "}
          {mastered.slice(0, 6).map((t) => lessonLookup[t.topic]?.title || t.topic.replace(/-/g, " ")).join(", ")}
        </div>
      )}
    </div>
  );
}