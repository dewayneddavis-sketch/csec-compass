import { useState } from "react";
import { getExperimentConfig, getLessonExperiment, experimentTypes } from "../data/contentLoader";
import GraphingCalculator from "./GraphingCalculator";
import DragDropLabel from "./DragDropLabel";
import CircuitBuilder from "./CircuitBuilder";
import BalanceScale from "./BalanceScale";
import FlashcardSystem from "./FlashcardSystem";
import "./ExperimentSandbox.css";

// ---------------------------------------------------------------------------
// Subject-aware experiment routing.
//
// Every experiment resolves to ONE of the 5 interactive components based on
// (subjectId + experimentType) — never by type alone. The UNIVERSAL RULE is:
// the fallback is ALWAYS FlashcardSystem with that subject's OWN deck. No
// component whose hardcoded content belongs to a different subject is ever
// rendered.
// ---------------------------------------------------------------------------

// Mathematics → GraphingCalculator modes (math content only)
const MATH_LINEAR_TYPES = new Set([
  "graphing", "graphing-calc", "graph-linear", "graph-sim", "coordinate-geometry",
]);
const MATH_PARABOLA_TYPES = new Set([
  "graph-plotter",
]);
const MATH_NUMBERLINE_TYPES = new Set(["number-line-plotter"]);
// Balance/area/volume builders keep their dedicated tool.
const MATH_BALANCE_TYPES = new Set([
  "balance-scale", "area-builder", "volume-filler",
]);
// Concept lessons → per-lesson DragDropLabel sets (subjectTypeSets.mathematics).
const MATH_DRAG_TYPES = new Set([
  "interactive-quiz", "visual-converter", "function-machine", "interactive-triangle",
  "trig-circle", "vector-addition", "matrix-transformer", "data-visualizer",
  "probability-sim",
]);

// Physics drag types → per-lesson DragDropLabel sets (subjectTypeSets.physics)
const PHYS_DRAG_TYPES = new Set([
  "vector-addition", "graph-sim", "heat-sim", "piston-sim", "ripple-tank",
  "optics-bench", "decay-sim",
]);

// Chemistry drag types → per-lesson DragDropLabel sets (subjectTypeSets.chemistry)
const CHEM_DRAG_TYPES = new Set([
  "simulation", "atom-builder", "interactive-table", "bond-creator", "calculator-tool",
  "virtual-lab", "titration-sim", "interactive-equation", "molecule-builder",
]);

// English A drag/match/sort/order types → DragDropLabel per-lesson set
const ENG_DRAG_TYPES = new Set([
  "matching-game", "dialogue-builder", "punctuation-drag-drop", "plot-arranger",
  "outliner", "highlight-tool", "text-trimmer", "sentence-fixer", "word-swap",
]);
// English A diction lesson → dedicated vocab deck in FlashcardSystem
const ENG_DICTION_TYPES = new Set(["vocab-flashcards", "flashcard", "interactive-quiz"]);



// Subject-level fallback used when a lesson experiment is a plain
// descriptive string (social-studies, human-social-biology,
// information-technology, spanish store experiments this way).
const SUBJECT_FALLBACK = {
  mathematics: "graphing-calc",
  "english-a": "flashcard",
  biology: "drag-drop",
  chemistry: "flashcard",
  physics: "circuit-builder",
  "information-technology": "flashcard",
  "principles-of-accounts": "balance-scale",
  "principles-of-business": "flashcard",
  "social-studies": "flashcard",
  history: "flashcard",
  geography: "flashcard",
  "human-social-biology": "drag-drop",
  spanish: "flashcard",
  french: "flashcard",
  "agricultural-science": "flashcard",
};

// Resolve (subjectId, experimentType) → interactive component element.
function resolveInteractive(subjectId, experimentType, lessonId) {
  const t = experimentType || "flashcard";
  const flash = (deckSubject) => <FlashcardSystem subjectId={deckSubject || subjectId} />;

  // ---- physics: circuit-builder keeps its dedicated tool; other lessons
  //      resolve to distinct per-lesson DragDropLabel sets.
  if (subjectId === "physics") {
    if (t === "circuit-builder") return <CircuitBuilder />;
    if (PHYS_DRAG_TYPES.has(t)) return <DragDropLabel subjectId="physics" experimentType={t} />;
    return flash("physics");
  }

  // ---- mathematics: graphs / balance / per-lesson drag sets
  if (subjectId === "mathematics") {
    if (MATH_DRAG_TYPES.has(t)) return <DragDropLabel subjectId="mathematics" experimentType={t} />;
    if (MATH_LINEAR_TYPES.has(t)) return <GraphingCalculator mode="linear" />;
    if (MATH_PARABOLA_TYPES.has(t)) return <GraphingCalculator mode="parabola" />;
    if (MATH_NUMBERLINE_TYPES.has(t)) return <GraphingCalculator mode="number-line" />;
    if (MATH_BALANCE_TYPES.has(t)) return <BalanceScale subjectId="mathematics" experimentType={t} />;
    return flash("mathematics");
  }

  // ---- chemistry: molecule/bond/atom builders → chemistry drag set
  if (subjectId === "chemistry") {
    if (CHEM_DRAG_TYPES.has(t)) return <DragDropLabel subjectId="chemistry" experimentType={t} />;
    return flash("chemistry");
  }

  // ---- biology → per-lesson sets (subjectId + experimentType + lessonId);
  //      every lesson's type resolves to its own topic-matched set. If a
  //      lessonId is absent (subject-page lab), DragDropLabel falls back to
  //      the subject-level cell-diagram set.
  if (subjectId === "biology") {
    return <DragDropLabel subjectId="biology" experimentType={t} lessonId={lessonId} />;
  }
  // ---- human-social-biology → per-lesson sets (subjectId + lessonId)
  if (subjectId === "human-social-biology") {
    return <DragDropLabel subjectId="human-social-biology" experimentType={t} lessonId={lessonId} />;
  }

  // ---- english-a: per-lesson set by type; diction → dedicated vocab deck
  if (subjectId === "english-a") {
    if (ENG_DRAG_TYPES.has(t)) return <DragDropLabel subjectId="english-a" experimentType={t} />;
    if (ENG_DICTION_TYPES.has(t)) return <FlashcardSystem subjectId="english-diction" />;
    return flash("english-a");
  }

  // ---- principles-of-accounts: ledger/balance → POA sort; drag → POA set
  if (subjectId === "principles-of-accounts") {
    if (t === "balance-scale") return <BalanceScale subjectId="principles-of-accounts" experimentType={t} />;
    return <DragDropLabel subjectId="principles-of-accounts" experimentType={t} lessonId={lessonId} />;
  }

  // ---- information-technology: topology/flowchart/etc → IT set
  if (subjectId === "information-technology") {
    return <DragDropLabel subjectId="information-technology" experimentType={t} lessonId={lessonId} />;
  }

  // ---- social-studies: matching/data/timeline/map → SS set
  if (subjectId === "social-studies") {
    return <DragDropLabel subjectId="social-studies" experimentType={t} lessonId={lessonId} />;
  }

  // ---- spanish: dialogue-builder → spanish set; else spanish deck
  if (subjectId === "spanish") {
    return <DragDropLabel subjectId="spanish" experimentType={t} lessonId={lessonId} />;
  }

  // ---- any other subject (french, history, geography, POB, ag-science):
  // NEVER a foreign-subject component — that subject's own deck.
  return flash(subjectId);
}

export default function ExperimentSandbox({ subjectId, config, lessonExperiment, lessonId }) {
  const [activeTab, setActiveTab] = useState("play");

  let experimentType = null;
  let experimentConfig = config || null;

  if (lessonExperiment) {
    if (typeof lessonExperiment === "string") {
      if (experimentTypes[lessonExperiment]) {
        // Known experiment type key (e.g. "flashcard", "graph-plotter")
        experimentConfig = getLessonExperiment(lessonExperiment);
        experimentType = lessonExperiment;
      } else {
        // Plain descriptive string — keep it as the description and use
        // the subject-appropriate interactive fallback.
        experimentConfig = { title: "Interactive Activity", description: lessonExperiment };
        experimentType = null;
      }
    } else {
      experimentConfig = lessonExperiment;
      experimentType = lessonExperiment.type || lessonExperiment.interactive || null;
    }
  } else if (subjectId) {
    const subjConfig = getExperimentConfig(subjectId);
    experimentConfig = subjConfig || null;
    experimentType = subjConfig?.interactive || SUBJECT_FALLBACK[subjectId] || "flashcard";
  }

  // If a string description left us with no type, fall back per subject.
  if (!experimentType && subjectId) {
    experimentType = SUBJECT_FALLBACK[subjectId] || "flashcard";
  }
  if (!experimentType) experimentType = "flashcard";

  function renderInteractive() {
    // Show the experiment context (title/description) above the tool so
    // students know what the activity is about.
    const context = experimentConfig?.title || experimentConfig?.description
      ? (
        <div className="exp-context">
          {experimentConfig?.title && <h4>{experimentConfig.title}</h4>}
          {experimentConfig?.description && <p>{experimentConfig.description}</p>}
        </div>
      )
      : null;

    const tool = resolveInteractive(subjectId, experimentType, lessonId);

    return (
      <div className="exp-play">
        {context}
        {tool}
      </div>
    );
  }

  return (
    <div className="exp-sandbox">
      <div className="exp-header">
        <h3><span className="exp-icon">🧪</span> {experimentConfig?.title || "Interactive Lab"}</h3>
        <div className="exp-tabs">
          <button className={`exp-tab ${activeTab === "play" ? "active" : ""}`} onClick={() => setActiveTab("play")}>Play</button>
          <button className={`exp-tab ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>About</button>
        </div>
      </div>
      <div className="exp-body">
        {activeTab === "play" ? renderInteractive() : (
          <div className="exp-info">
            <h4>About this Activity</h4>
            <p>{experimentConfig?.description || "Explore this concept hands-on with our interactive tool."}</p>
            <div className="exp-tip">
              <strong>Tip:</strong> Experiments help reinforce what you've learned. Try different inputs and observe the results!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
