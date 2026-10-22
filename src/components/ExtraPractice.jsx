import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { recordQuizResult } from "../data/analytics";
import {
  showYourWorkEnabled,
  isWorkingComplete,
  loadWorkingDrafts,
  saveWorkingDrafts,
} from "../data/showYourWork";
import ShowYourWork from "./ShowYourWork";
import WeakTopicsPanel from "./WeakTopicsPanel";
import ReviewSolution from "./ReviewSolution";
import SimilarQuestionPractice from "./SimilarQuestionPractice";
import { canPractice, questionKey } from "../data/similarQuestion";
import { splitPracticePapers, practiceQuizType } from "../data/practicePapers";
import "./ExtraPractice.css";

const QUIZ_TYPE = "practice";

// `paper` is which Practice Paper tab is open (1-based). Every paper is a slice
// of the SAME practice bank, in bank order, 20 questions each — the split, the
// labels and the bank ranges all come from src/data/practicePapers.js.
export default function ExtraPractice({ subjectId, paper = 1 }) {
  // What this attempt is RECORDED as (owner request 2026-10-22): each paper gets
  // its own value — practice-pp1 … practice-pp5 — so the teacher dashboard reads
  // five papers instead of one. The aggregate bucket `practice` is untouched and
  // the summary folds the five back into it. Show-Your-Work and its saved drafts
  // keep keying off the aggregate QUIZ_TYPE, so nothing a student sees changes.
  const RECORD_QUIZ_TYPE = practiceQuizType(paper) || QUIZ_TYPE;
  const [exercises, setExercises] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [latestAttemptId, setLatestAttemptId] = useState(null);
  const [working, setWorking] = useState({});
  // Which wrong answer (if any) has the "Practice a similar question" card open —
  // in the per-question feedback or in the review list. One at a time.
  const [practiceKey, setPracticeKey] = useState(null);
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
    setPracticeKey(null);
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
  }, [subjectId, paper]);

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

  const papers = splitPracticePapers(exercises);
  // Clamped, so a link to a paper a short bank cannot fill still opens the last
  // real one instead of an empty screen.
  const currentPaper = papers[Math.min(Math.max(paper, 1), papers.length) - 1];
  // This paper's 20 questions, in bank order. `offset` is where the paper begins
  // in the bank: the Show-Your-Work drafts are keyed by bank position (exactly
  // as they were before the split), so type-in on paper 1 cannot appear on the
  // same-numbered question of paper 2.
  const questions = currentPaper.questions;
  const offset = currentPaper.start;
  const bankTotal = exercises.length;
  const subjectTitle = subjectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const total = questions.length;
  const q = questions[current];
  const chosen = selected !== null ? selected : answers[current];
  const isAnswered = chosen !== undefined;
  const correctAnswer = q.answer;
  const isCorrect = chosen === correctAnswer;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  // Show-Your-Work: working must be typed before the answer is banked/moved on.
  // A practice paper moves forwards only, so the gate is per question rather
  // than over the whole attempt (a whole-attempt gate could strand a student on
  // the last question with no way back to an earlier one).
  const currentWorking = working[offset + current] || "";
  const workingOk = !showWork || isWorkingComplete(currentWorking);

  const correctCount = showResult
    ? questions.reduce((acc, ex, i) => acc + (answers[i] === ex.answer ? 1 : 0), 0)
    : 0;
  const scorePct = Math.round((correctCount / total) * 100);
  const passed = scorePct >= 60;

  function handleWorking(value) {
    setWorking((prev) => {
      const next = { ...prev, [offset + current]: value };
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
    setPracticeKey(null); // leave any open practice card behind with this question
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
    // The attempt carries THIS paper's questions, and the working is re-keyed
    // from bank position to the paper's own question order so each answer keeps
    // the working that was typed beside it.
    const paperWorking = {};
    questions.forEach((_, i) => {
      const text = working[offset + i];
      if (text !== undefined) paperWorking[i] = text;
    });
    const attempt = await recordQuizResult({
      subjectId,
      quizType: RECORD_QUIZ_TYPE,
      questions,
      answers: finalAnswers,
      working: paperWorking,
      session,
    });
    setLatestAttemptId(attempt?.attemptId || null);
  }

  function handleShowResult() {
    if (!workingOk) return; // show your work first
    setAnswers((prev) => ({ ...prev, [current]: chosen }));
    setPracticeKey(null);
    setShowResult(true);
    recordAttempt(chosen);
  }

  function handleRetry() {
    setCurrent(0);
    setSelected(null);
    setAnswers({});
    setStarted(false);
    setShowResult(false);
    setLatestAttemptId(null);
    setPracticeKey(null);
    // Only this paper's drafts are cleared: unfinished working on the other
    // papers is still the student's own work.
    setWorking((prev) => {
      const next = { ...prev };
      for (let i = offset; i < offset + total; i += 1) delete next[i];
      saveWorkingDrafts(subjectId, QUIZ_TYPE, next);
      return next;
    });
  }

  // Start screen
  if (!started) {
    return (
      <div className="ep-container">
        <div className="ep-start-card">
          <div className="ep-icon-large">📝</div>
          <h3>Practice Paper {currentPaper.paper} of {papers.length}: {subjectTitle}</h3>
          <p>
            Questions <strong>{offset + 1}–{offset + total}</strong> of the{" "}
            <strong>{bankTotal}</strong> questions in this subject's practice bank —
            the same bank, in order, split into {papers.length} papers. Get{" "}
            <strong>immediate feedback</strong>{" "}on each answer.
          </p>
          {showWork && (
            <p className="ep-syw-notice">
              ✍️ <strong>Show your work:</strong> every question has a working box below the answer
              choices. Type the steps you used, then move on — your working is saved with the attempt.
            </p>
          )}
          <p className="ep-note">You need 60% to pass this paper. Retry as many times as you like — each paper keeps its own working.</p>
          <button className="ep-btn ep-btn-primary" onClick={() => setStarted(true)}>Start Practice Paper {currentPaper.paper}</button>
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
          <p className="ep-score">Practice Paper {currentPaper.paper}: you scored <strong>{correctCount}</strong> out of <strong>{total}</strong> ({scorePct}%)</p>
          <p className="ep-msg">
            {passed ? "You've passed! Ready for the knowledge check." : "Review the material and give it another try."}
          </p>
          <div className="ep-review">
            <h4>Question Summary</h4>
            <div className="ep-review-grid">
              {questions.map((_, i) => (
                <button
                  key={i}
                  className={`ep-jump-btn ${answers[i] === questions[i].answer ? "correct" : "incorrect"}`}
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
                      delete next[offset + i];
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
              {questions.map((ex, i) => {
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
                    {showWork && working[offset + i] && String(working[offset + i]).trim() !== "" && (
                      <div className="ep-review-working">
                        <span className="ep-review-working-label">Your working</span>
                        {working[offset + i]}
                      </div>
                    )}
                    <ReviewSolution
                      explanation={ex.explanation}
                      isCorrect={isRight}
                      textClass="ep-review-explain"
                      buttonClass="ep-btn ep-btn-ghost"
                      canPractice={canPractice(exercises, ex)}
                      onPractice={() => setPracticeKey(questionKey(ex))}
                    />
                    {practiceKey === questionKey(ex) && (
                      <SimilarQuestionPractice
                        bank={exercises}
                        missed={ex}
                        onClose={() => setPracticeKey(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button className="ep-btn ep-btn-secondary" onClick={handleRetry}>Retry Practice Paper {currentPaper.paper}</button>
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
          <h3>Practice Paper {currentPaper.paper}: {subjectTitle}</h3>
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
            {/* Immediate feedback is where the learning loop bites hardest: the
                student just missed this one, so teach it and offer a fresh
                question on the same topic right here. */}
            <ReviewSolution
              explanation={q.explanation}
              isCorrect={isCorrect}
              textClass="ep-review-explain"
              buttonClass="ep-btn ep-btn-ghost"
              canPractice={canPractice(exercises, q)}
              onPractice={() => setPracticeKey(questionKey(q))}
            />
            {practiceKey === questionKey(q) && (
              <SimilarQuestionPractice
                bank={exercises}
                missed={q}
                onClose={() => setPracticeKey(null)}
              />
            )}
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
