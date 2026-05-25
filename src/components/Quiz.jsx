import { useState, useEffect } from "react";
import "./Quiz.css";

export default function Quiz({ questions, subjectTitle, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setCurrent(0); setAnswers({}); setShowResult(false); setStarted(false);
  }, [questions]);

  if (!questions || questions.length === 0) {
    return <div className="quiz-empty"><p>No knowledge check questions available for this subject yet.</p></div>;
  }

  const q = questions[current];
  const selected = answers[current];
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  const correctCount = showResult
    ? questions.reduce((acc, q, i) => {
        const correctAnswer = q.answer !== undefined ? q.answer : q.correctAnswer;
        return acc + (answers[i] === correctAnswer ? 1 : 0);
      }, 0)
    : 0;

  const passPercentage = 60;
  const passed = (correctCount / total) * 100 >= passPercentage;

  function handleSelect(value) { setAnswers((prev) => ({ ...prev, [current]: value })); }
  function handleNext() { if (current < total - 1) setCurrent((c) => c + 1); }
  function handlePrev() { if (current > 0) setCurrent((c) => c - 1); }
  function handleSubmit() { setShowResult(true); if (onComplete) onComplete(); }
  function handleRestart() { setCurrent(0); setAnswers({}); setShowResult(false); setStarted(false); }

  if (!started) {
    return (
      <div className="quiz-start-card">
        <div className="quiz-icon-large">🎯</div>
        <h3>Knowledge Check: {subjectTitle}</h3>
        <p>Test your understanding with {total} questions. You need at least {passPercentage}% to pass.</p>
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
                {q.explanation && <p className="quiz-review-explain">{q.explanation}</p>}
              </div>
            );
          })}
        </div>
        <button className="quiz-btn quiz-btn-secondary" onClick={handleRestart}>Retake Knowledge Check</button>
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
      </div>
      <div className="quiz-nav">
        <button className="quiz-btn quiz-btn-ghost" onClick={handlePrev} disabled={current === 0}>← Previous</button>
        {current < total - 1
          ? <button className="quiz-btn quiz-btn-primary" onClick={handleNext} disabled={selected === undefined}>Next →</button>
          : <button className="quiz-btn quiz-btn-success" onClick={handleSubmit} disabled={!allAnswered}>Submit All Answers</button>}
      </div>
      <div className="quiz-dots">
        {questions.map((_, i) => (
          <span key={i} className={`quiz-dot ${i === current ? "active" : answers[i] !== undefined ? "answered" : ""}`} onClick={() => setCurrent(i)} />
        ))}
      </div>
    </div>
  );
}
