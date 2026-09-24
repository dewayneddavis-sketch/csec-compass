import { useState, useEffect, useRef } from "react";
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
import ReviewSolution from "./ReviewSolution";
import SimilarQuestionPractice from "./SimilarQuestionPractice";
import { canPractice, questionKey } from "../data/similarQuestion";
import { SECONDS_PER_QUESTION, PASS_PERCENTAGE } from "../data/mockExamRules";
import { buildMockPaper, newMockSeed } from "../data/mockPaper";
import "./ExtraPractice.css";
import "./MockExam.css";

// SECONDS_PER_QUESTION / PASS_PERCENTAGE are imported from src/data/mockExamRules.js
// (and the paper size, MAX_QUESTIONS, by src/data/mockPaper.js), so the Compass
// Guide quotes the same pass mark and
// question timing this component enforces.
//
// The paper itself is drawn by src/data/mockPaper.js from the subject's WHOLE
// practice bank — see that file for why (head-slicing the first 40 made every
// newly authored question mock-invisible for good). One seed per attempt: the
// paper stays fixed while you sit it, and a retake draws a fresh one.
const QUIZ_TYPE = "mock";

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
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [working, setWorking] = useState({});
  // Which wrong answer (if any) has the "Practice a similar question" card open
  // in the review. Outside the exam: it never touches the timer or the score.
  const [practiceKey, setPracticeKey] = useState(null);
  const totalSeconds = useRef(0);
  // The unsampled bank for this subject (kept so a retake can draw a new paper)
  // and the seed for the paper currently loaded.
  const bankRef = useRef(null);
  const seedRef = useRef(newMockSeed());
  const { session } = useAuth();
  const showWork = showYourWorkEnabled(subjectId, QUIZ_TYPE);

  // Record the completed exam once, when it flips to submitted.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const recordedRef = useRef(false);
  useEffect(() => {
    if (submitted && questions && questions.length > 0 && !recordedRef.current) {
      recordedRef.current = true;
      recordQuizResult({
        subjectId,
        quizType: QUIZ_TYPE,
        questions,
        answers: answersRef.current,
        working,
        session,
      }).then((attempt) => setLatestAttemptId(attempt?.attemptId || null));
    }
  }, [submitted, questions, subjectId, session, working]);

  useEffect(() => {
    setLoading(true);
    setQuestions(null);
    setStarted(false);
    setCurrent(0);
    setAnswers({});
    setWorking(showYourWorkEnabled(subjectId, QUIZ_TYPE) ? loadWorkingDrafts(subjectId, QUIZ_TYPE) : {});
    setSubmitted(false);
    setTimeTaken(null);
    setLatestAttemptId(null);
    setPracticeKey(null);
    recordedRef.current = false;
    // A different subject is a different bank and a new paper.
    bankRef.current = null;
    seedRef.current = newMockSeed();
    fetch(`/content/${subjectId}/practice.json`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        const qs = data?.exercises || data;
        if (Array.isArray(qs) && qs.length > 0) {
          // Sample the whole bank instead of taking its first MAX_QUESTIONS.
          bankRef.current = qs;
          setQuestions(buildMockPaper(qs, { seed: seedRef.current }));
        } else {
          setQuestions(null);
        }
      })
      .catch(() => setQuestions(null))
      .finally(() => setLoading(false));
  }, [subjectId]);

  // Countdown timer — pure decrement; submission happens in the zero-effect below.
  useEffect(() => {
    if (!started || submitted) return undefined;
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [started, submitted]);

  // Auto-submit when the timer reaches zero.
  useEffect(() => {
    if (started && !submitted && timeLeft === 0) {
      setSubmitted(true);
      setTimeTaken(totalSeconds.current);
    }
  }, [timeLeft, started, submitted]);

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

  // Show-Your-Work: nothing is graded during the exam, but the working must be
  // typed as the student goes so the paper can be marked as solved-by-hand.
  const currentWorking = working[current] || "";
  const workingOk = !showWork || isWorkingComplete(currentWorking);
  const missingWorking = showWork ? countMissingWorking(total, working) : 0;

  function handleWorking(value) {
    setWorking((prev) => {
      const next = { ...prev, [current]: value };
      saveWorkingDrafts(subjectId, QUIZ_TYPE, next);
      return next;
    });
  }

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
    if (current < total - 1 && workingOk) setCurrent((c) => c + 1);
  }
  function handlePrev() {
    if (current > 0) setCurrent((c) => c - 1);
  }
  function handleSubmit() {
    if (missingWorking > 0) return; // every answer needs its working
    setSubmitted(true);
    setTimeTaken(totalSeconds.current - timeLeft);
  }
  function handleRetake() {
    setStarted(false); setSubmitted(false); setCurrent(0); setAnswers({});
    setWorking({}); setTimeTaken(null); setLatestAttemptId(null);
    setPracticeKey(null);
    recordedRef.current = false;
    clearWorkingDrafts(subjectId, QUIZ_TYPE);
    // A retake is a fresh paper over the same bank (not the same 40 again).
    if (bankRef.current && bankRef.current.length > 0) {
      seedRef.current = newMockSeed();
      setQuestions(buildMockPaper(bankRef.current, { seed: seedRef.current }));
    }
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
          {showWork && (
            <p className="ep-syw-notice">
              ✍️ <strong>Show your work:</strong> this paper has a working box under every question.
              Type your steps before moving on. Your working is saved with the attempt — if the timer
              runs out, whatever you have written is submitted with your answers.
            </p>
          )}
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
            {timeLeft === 0
              ? <>⏱ Time expired — your exam was submitted automatically after {formatTime(examSeconds)}.</>
              : <>Time taken: <strong>{formatTime(timeTaken ?? 0)}</strong> of {formatTime(examSeconds)}.</>}
          </p>
          {passed
            ? <p className="ep-msg">You reached the {PASS_PERCENTAGE}% pass mark — you're exam-ready!</p>
            : <p className="ep-msg">You didn't reach {PASS_PERCENTAGE}%. Review the questions below and try again.</p>}
          <div className="ep-review">
            <h4>Review Answers</h4>
            <div className="ep-review-list">
              {questions.map((qq, i) => {
                const isRight = answers[i] === qq.answer;
                const qKey = questionKey(qq);
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
                    {showWork && working[i] && String(working[i]).trim() !== "" && (
                      <div className="ep-review-working">
                        <span className="ep-review-working-label">Your working</span>
                        {working[i]}
                      </div>
                    )}
                    {/* Exam review is where the teacher-absent loop pays off: the
                        worked solution plus a fresh question on the topic missed.
                        The practice card sits outside the exam — no timer, no score. */}
                    <ReviewSolution
                      explanation={qq.explanation}
                      isCorrect={isRight}
                      textClass="me-review-explain"
                      buttonClass="ep-btn ep-btn-ghost"
                      canPractice={canPractice(questions, qq)}
                      onPractice={() => setPracticeKey(qKey)}
                    />
                    {practiceKey === qKey && (
                      <SimilarQuestionPractice
                        bank={questions}
                        missed={qq}
                        onClose={() => setPracticeKey(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button className="ep-btn ep-btn-secondary" onClick={handleRetake}>
            Retake Mock Exam
          </button>
          <WeakTopicsPanel subjectId={subjectId} latestAttemptId={latestAttemptId} />
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
          <ShowYourWork
            subjectId={subjectId}
            quizType={QUIZ_TYPE}
            questionNumber={current + 1}
            value={currentWorking}
            onChange={handleWorking}
          />
        </div>
        {showWork && missingWorking > 0 && Object.keys(answers).length > 0 && (
          <p className="ep-syw-progress">
            {missingWorking} question{missingWorking === 1 ? "" : "s"} still need your working before the
            paper can be submitted. You can move back with ← Back.
          </p>
        )}
        <div className="ep-nav">
          {current > 0 && (
            <button className="ep-btn ep-btn-secondary" onClick={handlePrev}>← Back</button>
          )}
          {current < total - 1 ? (
            <button className="ep-btn ep-btn-primary" onClick={handleNext} disabled={!workingOk}>Next →</button>
          ) : (
            <button className="ep-btn ep-btn-success" onClick={handleSubmit} disabled={missingWorking > 0}>Submit Exam</button>
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