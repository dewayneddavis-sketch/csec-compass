import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAllSubjects, getSubjectModules, normalizeModules } from "../data/contentLoader";
import { useQuizAnalytics } from "../data/useQuizAnalytics";
import {
  loadPlanner, savePlanner, generatePlan, countdownToFirstExam,
  toggleItem, computeStreak, weekProgress,
} from "../data/planner";
import "./PlannerPage.css";

const DEFAULT_EXAM_DATE = "2027-05-10"; // typical CSEC May/June sitting

// Per-subject hook holder (Rules of Hooks: hooks can't run in a loop).
function WeakTopicsFor({ subjectId, onWeak }) {
  const { topics } = useQuizAnalytics(subjectId);
  useEffect(() => {
    onWeak(subjectId, topics.filter((t) => t.wrong > 0).map((t) => t.topic));
  }, [subjectId, topics, onWeak]);
  return null;
}

export default function PlannerPage() {
  const { user, session } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState({}); // subjectId -> examDate
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weakBySubject, setWeakBySubject] = useState({});
  const weakBySubjectRef = useRef(weakBySubject);
  weakBySubjectRef.current = weakBySubject;

  // Load subjects + saved plan once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getAllSubjects();
      if (cancelled) return;
      setSubjects(all || []);
      const saved = await loadPlanner(session);
      if (!cancelled && saved) setPlan(saved);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Lesson list per subject for plan generation (loaded lazily).
  const modulesBySubject = useRef({});
  const [modulesReady, setModulesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const s of Object.keys(selected)) {
        if (modulesBySubject.current[s]) continue;
        const mods = await getSubjectModules(s);
        modulesBySubject.current[s] = normalizeModules(mods).flatMap((m) =>
          m.lessons.map((l) => ({ id: l.id, title: l.title, moduleTitle: m.title }))
        );
      }
      setModulesReady(true);
      if (cancelled) return;
      // Regenerate live if the plan exists but modules changed scope (avoid
      // clobbering an existing plan on first load — generation only happens
      // through the Generate button).
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const countdown = countdownToFirstExam(plan);
  const streak = computeStreak(plan?.completionDates);

  function toggleSubject(subjectId) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[subjectId]) delete next[subjectId];
      else next[subjectId] = DEFAULT_EXAM_DATE;
      return next;
    });
  }

  function setExamDate(subjectId, date) {
    setSelected((prev) => ({ ...prev, [subjectId]: date }));
  }

  async function handleGenerate() {
    const entries = {};
    for (const [sid, date] of Object.entries(selected)) {
      const s = subjects.find((x) => x.id === sid);
      entries[sid] = { title: s?.name || sid, examDate: date || DEFAULT_EXAM_DATE };
    }
    const generated = generatePlan(entries, modulesBySubject.current, weakBySubjectRef.current);
    setPlan(generated);
    setSaving(true);
    await savePlanner(generated, session);
    setSaving(false);
  }

  async function handleToggle(weekIndex, itemId, done) {
    if (!plan) return;
    const next = toggleItem(plan, weekIndex, itemId, done);
    setPlan(next);
    setSaving(true);
    await savePlanner(next, session);
    setSaving(false);
  }

  async function handleReset() {
    setPlan(null);
    setSelected({});
    await savePlanner(null, session);
  }

  if (loading) {
    return <div className="pl-loading">Loading your revision planner…</div>;
  }

  const selectedIds = Object.keys(selected);
  const selectedSubjects = subjects.filter((s) => selected[s.id]);
  const totalItems = plan?.weeks?.reduce((a, w) => a + (w.items?.length || 0), 0) || 0;
  const doneItems = plan?.weeks?.reduce((a, w) => a + (w.items?.filter((i) => i.done).length || 0), 0) || 0;

  return (
    <div className="pl">
      {/* Per-subject analytics hooks (must be unconditional) */}
      {selectedIds.map((sid) => (
        <WeakTopicsFor key={sid} subjectId={sid} onWeak={(sid2, weak) => {
          setWeakBySubject((prev) => {
            if (JSON.stringify(prev[sid2]) === JSON.stringify(weak)) return prev;
            return { ...prev, [sid2]: weak };
          });
        }} />
      ))}

      <div className="pl-header">
        <h1 className="pl-title">🗓️ Revision Planner</h1>
        <p className="pl-sub">
          Set your exam dates and get a week-by-week plan that prioritises your weak topics.
          {user ? "" : " Sign in to save your plan across devices — it also works offline."}
        </p>
      </div>

      {!plan && (
        <div className="pl-setup">
          <h3>1. Pick your subjects (and exam dates)</h3>
          <div className="pl-subject-grid">
            {subjects.map((s) => {
              const isOn = !!selected[s.id];
              return (
                <button
                  key={s.id}
                  className={`pl-subject-chip ${isOn ? "on" : ""}`}
                  onClick={() => toggleSubject(s.id)}
                >
                  <span className="pl-chip-icon">{s.icon}</span>
                  <span className="pl-chip-name">{s.name}</span>
                </button>
              );
            })}
          </div>

          {selectedSubjects.length > 0 && (
            <>
              <h3 className="pl-step2">2. Set exam dates</h3>
              <div className="pl-date-list">
                {selectedSubjects.map((s) => (
                  <div key={s.id} className="pl-date-row">
                    <span className="pl-date-subject">{s.icon} {s.name}</span>
                    <input
                      type="date"
                      className="pl-date-input"
                      value={selected[s.id] || DEFAULT_EXAM_DATE}
                      min="2026-01-01"
                      onChange={(e) => setExamDate(s.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button className="pl-generate" onClick={handleGenerate} disabled={!modulesReady}>
                Generate My Revision Plan →
              </button>
            </>
          )}
        </div>
      )}

      {plan && (
        <div className="pl-active">
          <div className="pl-dashboard">
            <div className="pl-dash-card">
              <span className="pl-dash-num">{countdown ? countdown.days : "—"}</span>
              <span className="pl-dash-label">days to first exam {countdown ? `(${new Date(countdown.examDate).toLocaleDateString()})` : ""}</span>
            </div>
            <div className="pl-dash-card">
              <span className="pl-dash-num">{streak}</span>
              <span className="pl-dash-label">day streak 🔥</span>
            </div>
            <div className="pl-dash-card">
              <span className="pl-dash-num">{doneItems}/{totalItems}</span>
              <span className="pl-dash-label">tasks done</span>
            </div>
            <div className="pl-dash-card">
              <span className="pl-dash-num">{Object.keys(plan.subjects).length}</span>
              <span className="pl-dash-label">subjects</span>
            </div>
          </div>

          <div className="pl-subjects-row">
            {Object.entries(plan.subjects).map(([sid, meta]) => (
              <span key={sid} className="pl-subject-tag">
                {meta.title} — exam {new Date(meta.examDate).toLocaleDateString()}
              </span>
            ))}
          </div>

          <div className="pl-weeks">
            {plan.weeks.map((week, wi) => {
              const progress = weekProgress(week);
              const items = week.items || [];
              return (
                <details key={week.label} className="pl-week" open={wi === 0}>
                  <summary className="pl-week-head">
                    <span className="pl-week-label">{week.label}</span>
                    <span className="pl-week-range">{week.start} → {week.end}</span>
                    <div className="pl-week-bar"><div className="pl-week-fill" style={{ width: progress + "%" }} /></div>
                    <span className="pl-week-pct">{progress}%</span>
                  </summary>
                  <div className="pl-week-items">
                    {items.length === 0 && <p className="pl-week-empty">Nothing scheduled — done early! 🎉</p>}
                    {items.map((item) => (
                      <label key={item.id} className={`pl-item ${item.done ? "done" : ""} ${item.weak ? "weak" : ""}`}>
                        <input
                          type="checkbox"
                          checked={!!item.done}
                          onChange={(e) => handleToggle(wi, item.id, e.target.checked)}
                        />
                        <span className="pl-item-body">
                          <span className="pl-item-title">
                            {item.title}
                            {item.weak && <span className="pl-item-badge">weak topic</span>}
                          </span>
                          <span className="pl-item-sub">{item.subjectId.replace(/-/g, " ")}</span>
                        </span>
                        <Link to={`/lesson/${item.subjectId}/${item.lessonId}`} className="pl-item-link" onClick={(e) => e.stopPropagation()}>Open lesson →</Link>
                      </label>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>

          <div className="pl-actions">
            <button className="pl-reset" onClick={handleReset}>Start over</button>
            <Link to="/" className="pl-back">← All subjects</Link>
            {saving && <span className="pl-saving">Saving…</span>}
          </div>
        </div>
      )}
    </div>
  );
}