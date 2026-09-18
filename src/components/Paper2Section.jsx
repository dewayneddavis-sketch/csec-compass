import { useEffect, useMemo, useState } from "react";
import WriteQuestion from "./WriteQuestion";
import "./Paper2Section.css";

// CSEC Paper 2 — typed-answer questions (self-assessed).
//
// Loads public/content/<subject>/paper2.json (mirror of content/<subject>/) and
// renders it with the shared `write` renderer. Format:
// content/WRITE-QUESTION-FORMAT.md.
//
// Both item shapes are supported:
//   - Social Studies: structured items with `parts` ((a)(b)(c), each with its own
//     marks, model answer and mark scheme) plus a scenario in `source`.
//   - English B: flat items — one essay prompt per item with a single model
//     answer and mark scheme.
//
// Nothing here is auto-graded: the student writes, reveals the model answer,
// ticks the mark-scheme points they made, and the only number shown is their own
// tick count. Drafts live in localStorage so a refresh never loses writing.

const LS_PREFIX = "csec-paper2-";

const EMPTY_DRAFT = { answers: {}, ticks: {} };

function draftKey(subjectId, itemId) {
  return `${LS_PREFIX}${subjectId}-${itemId}`;
}

function loadDraft(subjectId, itemId) {
  try {
    const raw = localStorage.getItem(draftKey(subjectId, itemId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      return { answers: parsed.answers || {}, ticks: parsed.ticks || {} };
    }
  } catch {
    // Private mode / quota — the section still works for this sitting.
  }
  return EMPTY_DRAFT;
}

function persistDraft(subjectId, itemId, draft) {
  try {
    localStorage.setItem(draftKey(subjectId, itemId), JSON.stringify(draft));
  } catch {
    // Ignore — drafting is best-effort.
  }
}

function discardDraft(subjectId, itemId) {
  try {
    localStorage.removeItem(draftKey(subjectId, itemId));
  } catch {
    // Nothing to clear.
  }
}

// Group items by `section`, preserving the file's order.
function groupBySection(items) {
  const groups = [];
  for (const item of items) {
    const name = item.section || "Questions";
    let group = groups.find((g) => g.name === name);
    if (!group) {
      group = { name, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
}

export default function Paper2Section({ subjectId }) {
  // `loaded` is keyed by subject so switching subjects re-enters the loading
  // state without a synchronous setState inside the effect.
  const [loaded, setLoaded] = useState({ key: null, items: null });
  const [selected, setSelected] = useState({ key: null, id: null });
  const [draftState, setDraftState] = useState({ key: null, draft: EMPTY_DRAFT });

  useEffect(() => {
    let cancelled = false;
    fetch(`/content/${subjectId}/paper2.json`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data.filter((i) => i && i.id) : [];
        setLoaded({ key: subjectId, items: list.length > 0 ? list : null });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: subjectId, items: null });
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const loading = loaded.key !== subjectId;
  const items = loading ? null : loaded.items;

  // The chosen question, or the first one in the file.
  const item =
    items && items.length > 0
      ? items.find((i) => selected.key === subjectId && i.id === selected.id) || items[0]
      : null;
  const itemId = item ? item.id : null;

  // The saved draft is derived, not copied into state by an effect: while the
  // student types, `draftState` wins; otherwise the localStorage draft is shown.
  const stateKey = `${subjectId}|${itemId}`;
  const storedDraft = useMemo(
    () => (itemId ? loadDraft(subjectId, itemId) : EMPTY_DRAFT),
    [subjectId, itemId]
  );
  const draft = draftState.key === stateKey ? draftState.draft : storedDraft;

  if (loading) {
    return (
      <div className="p2-container">
        <div className="p2-empty"><p>Loading Paper 2 questions...</p></div>
      </div>
    );
  }

  if (!items || items.length === 0 || !item) {
    return (
      <div className="p2-container">
        <div className="p2-empty">
          <div className="p2-empty-icon">📄</div>
          <h3>Paper 2 is coming soon for this subject</h3>
          <p>Typed-answer Paper 2 questions are not available for this subject yet.</p>
          <p className="p2-note">
            In the meantime, the Extra Practice tab has 100 multiple-choice questions and the
            Knowledge Check tests the whole course.
          </p>
        </div>
      </div>
    );
  }

  const groups = groupBySection(items);
  const hasParts = Array.isArray(item.parts) && item.parts.length > 0;
  const totalMarks = items.reduce((s, i) => s + (i.marks || 0), 0);

  // Self-assessment tally for the current question (ticks the student set).
  const tickedCount = Object.values(draft.ticks || {}).reduce(
    (s, arr) => s + (Array.isArray(arr) ? arr.filter(Boolean).length : 0),
    0
  );
  const answeredParts = Object.values(draft.answers || {}).filter(
    (t) => String(t || "").trim() !== ""
  ).length;

  function commit(next) {
    persistDraft(subjectId, item.id, next);
    setDraftState({ key: stateKey, draft: next });
  }

  function updateAnswer(key, text) {
    commit({ answers: { ...draft.answers, [key]: text }, ticks: draft.ticks || {} });
  }

  function toggleTick(key, index) {
    const current = Array.isArray(draft.ticks?.[key]) ? draft.ticks[key] : [];
    const nextTicks = [...current];
    nextTicks[index] = !nextTicks[index];
    commit({ answers: draft.answers || {}, ticks: { ...draft.ticks, [key]: nextTicks } });
  }

  function resetOne() {
    discardDraft(subjectId, item.id);
    setDraftState({ key: stateKey, draft: EMPTY_DRAFT });
  }

  return (
    <div className="p2-container">
      <div className="p2-intro">
        <h3>CSEC Paper 2 — typed answers, self-assessed</h3>
        <p>
          Paper 2 questions cannot be multiple-choice: you have to write. Type your answer to each
          part, then reveal the model answer and mark scheme and tick the points you made.
          <strong> Nothing here is auto-marked</strong> — your tick count is a study aid, not a grade.
        </p>
        <p className="p2-intro-stat">
          {items.length} question{items.length === 1 ? "" : "s"} · {totalMarks} marks in total · each
          question shows its own time budget.
        </p>
      </div>

      <div className="p2-layout">
        <nav className="p2-picker" aria-label="Paper 2 questions">
          {groups.map((group) => (
            <div key={group.name} className="p2-picker-group">
              <h4 className="p2-picker-section">{group.name}</h4>
              <ul>
                {group.items.map((it) => (
                  <li key={it.id}>
                    <button
                      className={"p2-picker-item " + (it.id === item.id ? "active" : "")}
                      aria-pressed={it.id === item.id}
                      onClick={() => setSelected({ key: subjectId, id: it.id })}
                    >
                      <span className="p2-picker-title">{it.title || it.id}</span>
                      <span className="p2-picker-meta">{it.marks} marks</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p2-question">
          <header className="p2-question-head">
            <div className="p2-question-tags">
              <span className="p2-tag">{item.section || "Question"}</span>
              <span className="p2-tag p2-tag-marks">{item.marks} marks</span>
              {item.suggestedMinutes && (
                <span className="p2-tag p2-tag-time">⏱ {item.suggestedMinutes} minutes suggested</span>
              )}
            </div>
            <h4 className="p2-question-title">{item.title || item.id}</h4>
          </header>

          {splitParagraphs(item.source).length > 0 && (
            <div className="p2-source">
              <h5 className="p2-source-h">Source / scenario</h5>
              {splitParagraphs(item.source).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {item.prompt && <p className="p2-item-prompt">{item.prompt}</p>}

          {Array.isArray(item.planningHints) && item.planningHints.length > 0 && (
            <div className="p2-hints">
              <h5>Plan before you write</h5>
              <ul>
                {item.planningHints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          {hasParts ? (
            item.parts.map((part, i) => {
              const key = `p${i}`;
              return (
                <WriteQuestion
                  key={key}
                  id={`${item.id}-${key}`}
                  label={part.label}
                  prompt={part.prompt}
                  marks={part.marks}
                  commandWords={part.commandWords || item.commandWords}
                  modelAnswer={part.modelAnswer}
                  markScheme={part.markScheme}
                  answer={(draft.answers || {})[key] || ""}
                  onAnswer={(text) => updateAnswer(key, text)}
                  ticks={(draft.ticks || {})[key] || []}
                  onToggleTick={(index) => toggleTick(key, index)}
                  rows={7}
                />
              );
            })
          ) : (
            <WriteQuestion
              id={item.id}
              prompt={item.prompt || "Answer the question."}
              marks={item.marks}
              commandWords={item.commandWords}
              modelAnswer={item.modelAnswer}
              markScheme={item.markScheme}
              answer={(draft.answers || {}).main || ""}
              onAnswer={(text) => updateAnswer("main", text)}
              ticks={(draft.ticks || {}).main || []}
              onToggleTick={(index) => toggleTick("main", index)}
              rows={14}
              modelExtras={
                item.examinerTips ? (
                  <div className="p2-tips">
                    <h5>Examiner tips</h5>
                    <p>{item.examinerTips}</p>
                  </div>
                ) : null
              }
            />
          )}

          <div className="p2-status">
            <span>
              {answeredParts > 0
                ? `${answeredParts} answer${answeredParts === 1 ? "" : "s"} typed · ${tickedCount} mark-scheme point${tickedCount === 1 ? "" : "s"} ticked`
                : "Nothing typed for this question yet"}
            </span>
            <button className="p2-btn p2-btn-ghost" onClick={resetOne}>↺ Clear my answers for this question</button>
          </div>

          <p className="p2-footnote">
            Your answers are saved on this device so a refresh never loses them. Model answers and
            mark schemes are provided for self-assessment — CSEC Compass does not award grades for
            Paper 2.
          </p>
        </div>
      </div>
    </div>
  );
}
