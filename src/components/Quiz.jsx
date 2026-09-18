import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { recordQuizResult } from "../data/analytics";
import {
  showYourWorkEnabled,
  isWorkingComplete,
  countMissingWorking,
  loadWorkingDrafts,
  saveWorkingDrafts,
  clearWorkingDrafts,
} from "../data/showYourWork";
import ShowYourWork from "./ShowYourWork";
import WeakTopicsPanel from "./WeakTopicsPanel";
import "./Quiz.css";

const QUIZ_TYPE = "knowledge-check";

export default function Quiz({ questions, subjectTitle, subjectId, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [working, setWorking] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [started, setStarted] = useState(false);
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const { session } = useAuth();
  const showWork = showYourWorkEnabled(subjectId, QUIZ_TYPE);

  useEffect(() => {
    setCurrent(0); setAnswers({}); setShowResult(false); setStarted(false);
    setWorking(showYourWorkEnabled(subjectId, QUIZ_TYPE) ? loadWorkingDrafts(subjectId, QUIZ_TYPE) : {});
  }, [questions, subjectId]);

  if (!questions || questions.length === 0) {
    return <div className="quiz-empty"><p>No knowledge check questions available for this subject yet.</p></div>;
  }

  const q = questions[current];
  const selected = answers[current];
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  // Show-Your-Work: the student must type their working before moving on, and
  // every question needs working before the attempt can be submitted.
  const currentWorking = working[current] || "";
  const workingOk = !showWork || isWorkingComplete(currentWorking);
  const missingWorking = showWork ? countMissingWorking(total, working) : 0;

  const correctCount = showResult
    ? questions.reduce((acc, q, i) => {
        const correctAnswer = q.answer !== undefined ? q.answer : q.correctAnswer;
        return acc + (answers[i] === correctAnswer ? 1 : 0);
      }, 0)
    : 0;

  const passPercentage = 60;
  const passed = (correctCount / total) * 100 >= passPercentage;

  function handleSelect(value) { setAnswers((prev) => ({ ...prev, [current]: value })); }
  function handleWorking(value) {
    setWorking((prev) => {
      const next = { ...prev, [current]: value };
      saveWorkingDrafts(subjectId, QUIZ_TYPE, next);
      return next;
    });
  }
  function handleNext() { if (current < total - 1 && workingOk) setCurrent((c) => c + 1); }
  function handlePrev() { if (current > 0) setCurrent((c) => c - 1); }
  async function handleSubmit() {
    setShowResult(true);
    if (subjectId) {
      const attempt = await recordQuizResult({
        subjectId,
        quizType: QUIZ_TYPE,
        questions,
        answers,
        working,
        session,
      });
      setLatestAttemptId(attempt?.attemptId || null);
    }
    if (onComplete) onComplete();
  }
  function handleRestart() {
    setCurrent(0); setAnswers({}); setWorking({}); setShowResult(false); setStarted(false);
    setLatestAttemptId(null);
    clearWorkingDrafts(subjectId, QUIZ_TYPE);
  }

  if (!started) {
    return (
      <div className="quiz-start-card">
        <div className="quiz-icon-large">🎯</div>
        <h3>Knowledge Check: {subjectTitle}</h3>
        <p>Test your understanding with {total} questions. You need at least {passPercentage}% to pass.</p>
        {showWork && (
          <p className="quiz-syw-notice">
            ✍️ <strong>Show your work:</strong> this knowledge check has a working box under every
            question. You type the steps you used to reach each answer, and your working is saved with
            the attempt — that is how your teacher knows you solved it yourself.
          </p>
        )}
        <p className="quiz-note">Don't worry — you can retake it as many times as you like!</p>
        <button className="quiz-btn quiz-btn-primary" onClick={() => setStarted(true)}>Start Knowledge Check</button>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="quiz-result-card">
        <div className="quiz-icon-large">{passed ? "🎉" : "💪"}</div>
        <h3>{passed ? "Congratulations!" : "Almost There!"}</h3>
        <p className="quiz-score">You scored <strong>{correctCount}</strong> out of <strong>{total}</strong> ({Math.round((correctCount / total) * 100)}%)</p>
        {passed
          ? <p className="quiz-msg">You've passed! You're ready to move forward.</p>
          : <p className="quiz-msg">You didn't reach the {passPercentage}% pass mark. Review the material and try again.</p>}
        <div className="quiz-review">
          <h4>Review Answers</h4>
          {questions.map((q, i) => {
            const correctAnswer = q.answer !== undefined ? q.answer : q.correctAnswer;
            const isCorrect = answers[i] === correctAnswer;
            return (
              <div key={q.id} className={`quiz-review-item ${isCorrect ? "correct" : "incorrect"}`}>
                <p className="quiz-review-q"><span className="qr-icon">{isCorrect ? "✅" : "❌"}</span>{q.question || q.question}</p>
                <p className="quiz-review-answer">Your answer: <strong>{answers[i]}</strong>{!isCorrect && <> — Correct: <strong>{correctAnswer}</strong></>}</p>
                {showWork && working[i] && String(working[i]).trim() !== "" && (
                  <div className="quiz-review-working">
                    <span className="quiz-review-working-label">Your working</span>
                    {working[i]}
                  </div>
                )}
                {q.explanation && <p className="quiz-review-explain">{q.explanation}</p>}
              </div>
            );
          })}
        </div>
        <button className="quiz-btn quiz-btn-secondary" onClick={handleRestart}>Retake Knowledge Check</button>
        {subjectId && <WeakTopicsPanel subjectId={subjectId} latestAttemptId={latestAttemptId} />}
      </div>
    );
  }

  return (
    <div className="quiz-card">
      <div className="quiz-header">
        <h3>Knowledge Check: {subjectTitle}</h3>
        <span className="quiz-progress">Question {current + 1} of {total}</span>
      </div>
      <div className="quiz-question-area">
        <p className="quiz-question-text">{q.question || q.question}</p>
        <div className="quiz-options">
          {q.options.map((opt, i) => {
            const isSelected = selected === opt;
            return (
              <button key={i} className={`quiz-option ${isSelected ? "selected" : ""}`} onClick={() => handleSelect(opt)}>
                <span className="quiz-opt-letter">{String.fromCharCode(65 + i)}</span>
                <span className="quiz-opt-text">{opt}</span>
                {isSelected && <span className="quiz-opt-check">✓</span>}
              </button>
            );
          })}
        </div>
        <ShowYourWork
          subjectId={subjectId}
          quizType={QUIZ_TYPE}
          questionNumber={current + 1}
          value={currentWorking}
          onChange={handleWorking}
        />
      </div>
      {showWork && answeredCount > 0 && missingWorking > 0 && (
        <p className="quiz-syw-progress">
          {missingWorking} question{missingWorking === 1 ? "" : "s"} still need your working before you can submit.
        </p>
      )}
      <div className="quiz-nav">
        <button className="quiz-btn quiz-btn-ghost" onClick={handlePrev} disabled={current === 0}>← Previous</button>
        {current < total - 1
          ? <button className="quiz-btn quiz-btn-primary" onClick={handleNext} disabled={selected === undefined || !workingOk}>Next →</button>
          : <button className="quiz-btn quiz-btn-success" onClick={handleSubmit} disabled={!allAnswered || missingWorking > 0}>Submit All Answers</button>}
      </div>
      <div className="quiz-dots">
        {questions.map((_, i) => (
          <span key={i} className={`quiz-dot ${i === current ? "active" : answers[i] !== undefined ? "answered" : ""}`} onClick={() => setCurrent(i)} />
        ))}
      </div>
    </div>
  );
}
