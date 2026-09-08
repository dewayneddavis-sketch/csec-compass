import { useState, useEffect, useRef } from "react";
import "./ExtraPractice.css";
import "./MockExam.css";

const SECONDS_PER_QUESTION = 90; // ~1.5 min per question
const MAX_QUESTIONS = 40; // CSEC Paper 1-style fixed length
const PASS_PERCENTAGE = 60;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MockExam({ subjectId }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [timeTaken, setTimeTaken] = useState(null);
  const totalSeconds = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setQuestions(null);
    setStarted(false);
    setCurrent(0);
    setAnswers({});
    setSubmitted(false);
    setTimeTaken(null);
    fetch(`/content/${subjectId}/practice.json`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        const qs = data?.exercises || data;
        if (Array.isArray(qs) && qs.length > 0) {
          const examQuestions = qs.length > MAX_QUESTIONS ? qs.slice(0, MAX_QUESTIONS) : qs;
          setQuestions(examQuestions);
        } else {
          setQuestions(null);
        }
      })
      .catch(() => setQuestions(null))
      .finally(() => setLoading(false));
  }, [subjectId]);

  // Countdown timer — auto-submits when it reaches zero.
  useEffect(() => {
    if (!started || submitted) return undefined;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setSubmitted(true);
          setTimeTaken(totalSeconds.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [started, submitted]);

  useEffect(() => {
    if (submitted && intervalRef.current) clearInterval(intervalRef.current);
  }, [submitted]);

  if (loading) {
    return (
      <div className="ep-container">
        <div className="ep-empty"><p>Loading mock exam questions...</p></div>
      </div>
    );
  }
  if (!questions || questions.length === 0) {
    return (
      <div className="ep-container">
        <div className="ep-empty">
          <div className="ep-empty-icon">🎓</div>
          <h3>Mock Exam Coming Soon</h3>
          <p>There are no practice questions available for this subject yet, so a timed mock exam can't be built.</p>
          <p className="ep-note">Check back soon, or visit{" "}
            <a href="https://www.cxc.org/students-and-parents/past-papers/" target="_blank" rel="noopener noreferrer">
              CXC Official Past Papers
            </a>{" "}for downloadable PDFs.
          </p>
        </div>
      </div>
    );
  }

  const total = questions.length;
  const examSeconds = total * SECONDS_PER_QUESTION;
  const q = questions[current];
  const chosen = answers[current];

  function handleStart() {
    totalSeconds.current = examSeconds;
    setTimeLeft(examSeconds);
    setStarted(true);
  }
  function handleSelect(value) {
    // No feedback during the exam — answers are simply recorded.
    setAnswers((prev) => ({ ...prev, [current]: value }));
  }
  function handleNext() {
    if (current < total - 1) setCurrent((c) => c + 1);
  }
  function handlePrev() {
    if (current > 0) setCurrent((c) => c - 1);
  }
  function handleSubmit() {
    setSubmitted(true);
    setTimeTaken(totalSeconds.current - timeLeft);
  }

  if (!started) {
    return (
      <div className="ep-container">
        <div className="ep-start-card">
          <div className="ep-icon-large">🎓</div>
          <h3>Mock Exam: {subjectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
          <p>Simulate the real CSEC Paper 1 with <strong>{total} multiple-choice questions</strong> in{" "}
            <strong>{formatTime(examSeconds)}</strong> ({SECONDS_PER_QUESTION} seconds each).</p>
          <p>Exam conditions: questions appear one at a time, there is <strong>no feedback until you submit</strong>, and the exam{" "}
            <strong>auto-submits when time runs out</strong>.</p>
          <p className="ep-note">You need {PASS_PERCENTAGE}% to pass. Good luck!</p>
          <button className="ep-btn ep-btn-primary" onClick={handleStart}>Start Mock Exam</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const correctCount = questions.reduce((acc, qq, i) => acc + (answers[i] === qq.answer ? 1 : 0), 0);
    const scorePct = Math.round((correctCount / total) * 100);
    const passed = scorePct >= PASS_PERCENTAGE;
    return (
      <div className="ep-container">
        <div className="ep-result-card">
          <div className="ep-icon-large">{passed ? "🎉" : "💪"}</div>
          <h3>{passed ? "You Passed!" : "Keep Practising"}</h3>
          <p className="ep-score">You scored <strong>{correctCount}</strong> out of <strong>{total}</strong> ({scorePct}%)</p>
          <p className="ep-msg">
            Time taken: <strong>{formatTime(timeTaken ?? 0)}</strong> of {formatTime(examSeconds)}.
          </p>
          {passed
            ? <p className="ep-msg">You reached the {PASS_PERCENTAGE}% pass mark — you're exam-ready!</p>
            : <p className="ep-msg">You didn't reach {PASS_PERCENTAGE}%. Review the questions below and try again.</p>}
          <div className="ep-review">
            <h4>Review Answers</h4>
            <div className="ep-review-list">
              {questions.map((qq, i) => {
                const isRight = answers[i] === qq.answer;
                return (
                  <div key={qq.id || i} className={`ep-review-item ${isRight ? "correct" : "incorrect"}`}>
                    <p className="ep-review-q">
                      <span className="ep-review-icon">{isRight ? "✅" : "❌"}</span>
                      {i + 1}. {qq.question}
                    </p>
                    <p className="ep-review-answer">
                      Your answer: <strong>{answers[i] || "—"}</strong>
                      {!isRight && <> — Correct: <strong>{qq.answer}</strong></>}
                    </p>
                    {qq.explanation && <p className="ep-review-explain">{qq.explanation}</p>}
                  </div>
                );
              })}
            </div>
          </div>
          <button className="ep-btn ep-btn-secondary" onClick={() => { setStarted(false); setSubmitted(false); setCurrent(0); setAnswers({}); setTimeTaken(null); }}>
            Retake Mock Exam
          </button>
        </div>
      </div>
    );
  }

  // Active exam — one question at a time, NO feedback.
  return (
    <div className="ep-container">
      <div className="ep-card">
        <div className="ep-header-bar me-header-bar">
          <h3>Mock Exam: {subjectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
          <span className={`me-timer ${timeLeft <= 60 ? "me-timer-warn" : ""}`}>⏱ {formatTime(timeLeft)}</span>
        </div>
        <div className="ep-progress">Question {current + 1} of {total}</div>
        <div className="ep-question-area">
          <p className="ep-question-text">{q.question}</p>
          <div className="ep-options">
            {q.options.map((opt, i) => (
              <button
                key={i}
                className={`ep-option ${chosen === opt ? "ep-selected" : ""}`}
                onClick={() => handleSelect(opt)}
              >
                <span className="ep-opt-letter">{String.fromCharCode(65 + i)}</span>
                <span className="ep-opt-text">{opt}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ep-nav">
          {current > 0 && (
            <button className="ep-btn ep-btn-secondary" onClick={handlePrev}>← Back</button>
          )}
          {current < total - 1 ? (
            <button className="ep-btn ep-btn-primary" onClick={handleNext}>Next →</button>
          ) : (
            <button className="ep-btn ep-btn-success" onClick={handleSubmit}>Submit Exam</button>
          )}
        </div>
        <div className="ep-progress-bar">
          <div className="ep-progress-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
        <p className="ep-note">Exam in progress — answers are final when you submit, or when the timer runs out.</p>
      </div>
    </div>
  );
}