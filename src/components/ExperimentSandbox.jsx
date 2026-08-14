import { useState } from "react";
import { getExperimentConfig, getLessonExperiment, experimentTypes } from "../data/contentLoader";
import GraphingCalculator from "./GraphingCalculator";
import DragDropLabel from "./DragDropLabel";
import CircuitBuilder from "./CircuitBuilder";
import BalanceScale from "./BalanceScale";
import FlashcardSystem from "./FlashcardSystem";
import "./ExperimentSandbox.css";

// Every experiment type from content must map to one of the 5 interactive
// components. Anything not explicitly listed here falls through to
// FlashcardSystem (the universal interactive fallback) — static text is
// never shown in the Play tab.
const GRAPH_TYPES = new Set([
  "graphing", "graphing-calc", "graph-linear", "graph-plotter",
  "number-line-plotter", "function-machine", "interactive-triangle",
  "trig-circle", "vector-addition", "matrix-transformer", "data-visualizer",
  "data-explorer", "graph-sim", "decay-sim", "heat-sim", "piston-sim",
  "energy-meter", "ripple-tank", "optics-bench", "simulation",
  "interactive-equation", "calculator-tool", "slider-tool",
]);

const DRAG_TYPES = new Set([
  "drag-drop", "drag-drop-label", "cell-viewer", "body-explorer",
  "matching-game", "punctuation-drag-drop", "punnett-square-maker",
  "interactive-pathway", "molecule-builder", "bond-creator", "atom-builder",
  "interactive-table", "network-topology", "flowchart-builder",
  "schema-designer", "web-builder",
]);

const CIRCUIT_TYPES = new Set(["circuit-builder"]);

const BALANCE_TYPES = new Set([
  "balance-scale", "visual-converter", "area-builder", "volume-filler",
  "ledger-tool", "interactive-ledger", "statement-builder",
  "data-entry-sim", "workbook-tool", "titration-sim", "virtual-lab",
]);

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

export default function ExperimentSandbox({ subjectId, config, lessonExperiment }) {
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

    let tool = null;
    if (GRAPH_TYPES.has(experimentType)) {
      tool = <GraphingCalculator />;
    } else if (DRAG_TYPES.has(experimentType)) {
      tool = <DragDropLabel />;
    } else if (CIRCUIT_TYPES.has(experimentType)) {
      tool = <CircuitBuilder />;
    } else if (BALANCE_TYPES.has(experimentType)) {
      tool = <BalanceScale experimentType={experimentType} />;
    } else {
      // Universal interactive fallback — never static text.
      tool = <FlashcardSystem subjectId={subjectId} />;
    }

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
