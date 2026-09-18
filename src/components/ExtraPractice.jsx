import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { recordQuizResult } from "../data/analytics";
import {
  showYourWorkEnabled,
  isWorkingComplete,
  loadWorkingDrafts,
  saveWorkingDrafts,
  clearWorkingDrafts,
} from "../data/showYourWork";
import ShowYourWork from "./ShowYourWork";
import WeakTopicsPanel from "./WeakTopicsPanel";
import "./ExtraPractice.css";

const QUIZ_TYPE = "practice";

export default function ExtraPractice({ subjectId }) {
  const [exercises, setExercises] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [working, setWorking] = useState({});
  const { session } = useAuth();
  const showWork = showYourWorkEnabled(subjectId, QUIZ_TYPE);

  useEffect(() => {
    setLoading(true);
    setExercises(null);
    setCurrent(0);
    setSelected(null);
    setAnswers({});
    setStarted(false);
    setShowResult(false);
    setWorking(showYourWorkEnabled(subjectId, QUIZ_TYPE) ? loadWorkingDrafts(subjectId, QUIZ_TYPE) : {});

    fetch(`/content/${subjectId}/practice.json`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        const ex = data?.exercises || data;
        if (Array.isArray(ex) && ex.length > 0) {
          setExercises(ex);
        }
      })
      .catch(() => setExercises(null))
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return (
      <div className="ep-container">
        <div className="ep-empty"><p>Loading practice exercises...</p></div>
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="ep-container">
        <div className="ep-empty">
          <div className="ep-empty-icon">📝</div>
          <h3>Practice Exercises Coming Soon</h3>
          <p>Interactive practice questions for this subject are being prepared.</p>
          <p className="ep-note">Check back soon, or visit{" "}
            <a href="https://www.cxc.org/students-and-parents/past-papers/" target="_blank" rel="noopener noreferrer">
              CXC Official Past Papers
            </a>{" "}for downloadable PDFs.
          </p>
        </div>
      </div>
    );
  }

  const total = exercises.length;
  const q = exercises[current];
  const chosen = selected !== null ? selected : answers[current];
  const isAnswered = chosen !== undefined;
  const correctAnswer = q.answer;
  const isCorrect = chosen === correctAnswer;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  // Show-Your-Work: working must be typed before the answer is banked/moved on.
  // Extra Practice moves forwards only, so the gate is per question rather than
  // over the whole attempt (a whole-attempt gate could strand a student on the
  // last question with no way back to an earlier one).
  const currentWorking = working[current] || "";
  const workingOk = !showWork || isWorkingComplete(currentWorking);

  const correctCount = showResult
    ? exercises.reduce((acc, ex, i) => acc + (answers[i] === ex.answer ? 1 : 0), 0)
    : 0;
  const scorePct = Math.round((correctCount / total) * 100);
  const passed = scorePct >= 60;

  function handleWorking(value) {
    setWorking((prev) => {
      const next = { ...prev, [current]: value };
      saveWorkingDrafts(subjectId, QUIZ_TYPE, next);
      return next;
    });
  }

  function handleSelect(value) {
    if (answers[current] !== undefined) return; // already answered
    setSelected(value);
  }

  function handleNext() {
    if (!workingOk) return; // show your work first
    // Save answer and move on
    setAnswers((prev) => ({ ...prev, [current]: chosen }));
    setSelected(null);
    if (current < total - 1) {
      setCurrent((c) => c + 1);
    } else {
      // Last question — auto-submit
      setShowResult(true);
      recordAttempt(chosen);
    }
  }

  async function recordAttempt(finalChosen) {
    const finalAnswers = { ...answers };
    if (finalChosen !== undefined && finalAnswers[current] === undefined) {
      finalAnswers[current] = finalChosen;
    }
    const attempt = await recordQuizResult({
      subjectId,
      quizType: QUIZ_TYPE,
      questions: exercises,
      answers: finalAnswers,
      working,
      session,
    });
    setLatestAttemptId(attempt?.attemptId || null);
  }

  function handleShowResult() {
    if (!workingOk) return; // show your work first
    setAnswers((prev) => ({ ...prev, [current]: chosen }));
    setShowResult(true);
    recordAttempt(chosen);
  }

  function handleRetry() {
    setCurrent(0);
    setSelected(null);
    setAnswers({});
    setWorking({});
    setStarted(false);
    setShowResult(false);
    setLatestAttemptId(null);
    clearWorkingDrafts(subjectId, QUIZ_TYPE);
  }

  // Start screen
  if (!started) {
    return (
      <div className="ep-container">
        <div className="ep-start-card">
          <div className="ep-icon-large">📝</div>
          <h3>Practice: {subjectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
          <p>Test your skills with {total} practice questions. Get{" "}<strong>immediate feedback</strong>{" "}on each answer.</p>
          {showWork && (
            <p className="ep-syw-notice">
              ✍️ <strong>Show your work:</strong> every question has a working box below the answer
              choices. Type the steps you used, then move on — your working is saved with the attempt.
            </p>
          )}
          <p className="ep-note">You need 60% to pass. Retry as many times as you like!</p>
          <button className="ep-btn ep-btn-primary" onClick={() => setStarted(true)}>Start Practice</button>
        </div>
        <div className="ep-footer-link">
          <a href="https://www.cxc.org/students-and-parents/past-papers/" target="_blank" rel="noopener noreferrer">📄 CXC Official Past Papers</a>
        </div>
      </div>
    );
  }

  // Result screen
  if (showResult) {
    return (
      <div className="ep-container">
        <div className="ep-result-card">
          <div className="ep-icon-large">{passed ? "🎉" : "💪"}</div>
          <h3>{passed ? "Great Job!" : "Keep Practicing!"}</h3>
          <p className="ep-score">You scored <strong>{correctCount}</strong> out of <strong>{total}</strong> ({scorePct}%)</p>
          <p className="ep-msg">
            {passed ? "You've passed! Ready for the knowledge check." : "Review the material and give it another try."}
          </p>
          <div className="ep-review">
            <h4>Question Summary</h4>
            <div className="ep-review-grid">
              {exercises.map((_, i) => (
                <button
                  key={i}
                  className={`ep-jump-btn ${answers[i] === exercises[i].answer ? "correct" : "incorrect"}`}
                  onClick={() => {
                    // Jump back to re-attempt this question — clear its
                    // previous answer so it can be answered again.
                    setCurrent(i);
                    setSelected(null);
                    setShowResult(false);
                    setAnswers((prev) => {
                      const next = { ...prev };
                      delete next[i];
                      return next;
                    });
                    // Clear that question's working too, so it is re-done rather
                    // than carried over from the previous attempt.
                    setWorking((prev) => {
                      const next = { ...prev };
                      delete next[i];
                      saveWorkingDrafts(subjectId, QUIZ_TYPE, next);
                      return next;
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  title={`Question ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="ep-review-list">
              {exercises.map((ex, i) => {
                const isRight = answers[i] === ex.answer;
                return (
                  <div key={ex.id || i} className={`ep-review-item ${isRight ? "correct" : "incorrect"}`}>
                    <p className="ep-review-q">
                      <span className="ep-review-icon">{isRight ? "✅" : "❌"}</span>
                      {i + 1}. {ex.question}
                    </p>
                    <p className="ep-review-answer">
                      Your answer: <strong>{answers[i] || "—"}</strong>
                      {!isRight && <> — Correct: <strong>{ex.answer}</strong></>}
                    </p>
                    {showWork && working[i] && String(working[i]).trim() !== "" && (
                      <div className="ep-review-working">
                        <span className="ep-review-working-label">Your working</span>
                        {working[i]}
                      </div>
                    )}
                    {ex.explanation && <p className="ep-review-explain">{ex.explanation}</p>}
                  </div>
                );
              })}
            </div>
          </div>
          <button className="ep-btn ep-btn-secondary" onClick={handleRetry}>Retry Practice</button>
          <WeakTopicsPanel subjectId={subjectId} latestAttemptId={latestAttemptId} />
        </div>
        <div className="ep-footer-link">
          <a href="https://www.cxc.org/students-and-parents/past-papers/" target="_blank" rel="noopener noreferrer">📄 CXC Official Past Papers</a>
        </div>
      </div>
    );
  }

  // Active quiz — immediate feedback per question
  return (
    <div className="ep-container">
      <div className="ep-card">
        <div className="ep-header-bar">
          <h3>Practice: {subjectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
          <span className="ep-progress">Question {current + 1} of {total}</span>
        </div>

        <div className="ep-question-area">
          <p className="ep-question-text">{q.question}</p>
          <div className="ep-options">
            {q.options.map((opt, i) => {
              let cls = "ep-option";
              if (isAnswered && chosen !== undefined) {
                if (opt === correctAnswer) cls += " ep-correct";
                else if (opt === chosen) cls += " ep-wrong";
                else cls += " ep-dimmed";
              } else if (chosen === opt) {
                cls += " ep-selected";
              }
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => handleSelect(opt)}
                  disabled={isAnswered}
                >
                  <span className="ep-opt-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="ep-opt-text">{opt}</span>
                  {isAnswered && opt === correctAnswer && <span className="ep-opt-check">✓</span>}
                  {isAnswered && opt === chosen && opt !== correctAnswer && <span className="ep-opt-x">✗</span>}
                </button>
              );
            })}
          </div>
        </div>

        {isAnswered && (
          <div className={`ep-feedback ${isCorrect ? "ep-fb-correct" : "ep-fb-incorrect"}`}>
            <strong>{isCorrect ? "✅ Correct!" : "❌ Incorrect"}</strong>
            {q.explanation && <p>{q.explanation}</p>}
          </div>
        )}

        <ShowYourWork
          subjectId={subjectId}
          quizType={QUIZ_TYPE}
          questionNumber={current + 1}
          value={currentWorking}
          onChange={handleWorking}
          disabled={isAnswered}
        />

        {showWork && isAnswered && !workingOk && (
          <p className="ep-syw-progress">
            Type your working in the box above to continue.
          </p>
        )}

        <div className="ep-nav">
          {isAnswered && current < total - 1 && (
            <button className="ep-btn ep-btn-primary" onClick={handleNext} disabled={!workingOk}>Next →</button>
          )}
          {isAnswered && current === total - 1 && (
            <button className="ep-btn ep-btn-success" onClick={handleShowResult} disabled={!workingOk}>
              {allAnswered ? "View Results" : "Finish & View Results"}
            </button>
          )}
        </div>

        <div className="ep-progress-bar">
          <div className="ep-progress-fill" style={{ width: `${((current + (isAnswered ? 1 : 0)) / total) * 100}%` }} />
        </div>
      </div>
      <div className="ep-footer-link">
        <a href="https://www.cxc.org/students-and-parents/past-papers/" target="_blank" rel="noopener noreferrer">📄 CXC Official Past Papers</a>
      </div>
    </div>
  );
}
