import { useState } from "react";
import { getExperimentConfig, getLessonExperiment } from "../data/contentLoader";
import GraphingCalculator from "./GraphingCalculator";
import DragDropLabel from "./DragDropLabel";
import CircuitBuilder from "./CircuitBuilder";
import BalanceScale from "./BalanceScale";
import FlashcardSystem from "./FlashcardSystem";
import "./ExperimentSandbox.css";

export default function ExperimentSandbox({ subjectId, config, lessonExperiment }) {
  const [activeTab, setActiveTab] = useState("play");

  let experimentType = null;
  let experimentConfig = config || null;

  if (lessonExperiment) {
    if (typeof lessonExperiment === "string") {
      experimentConfig = getLessonExperiment(lessonExperiment);
      experimentType = lessonExperiment;
    } else {
      experimentConfig = lessonExperiment;
      experimentType = lessonExperiment.type || null;
    }
  } else if (subjectId) {
    const subjConfig = getExperimentConfig(subjectId);
    experimentConfig = subjConfig;
    experimentType = subjConfig?.interactive || null;

    const subjectExpMap = {
      mathematics: "graphing-calc",
      biology: "drag-drop",
      physics: "circuit-builder",
      "principles-of-accounts": "balance-scale",
      chemistry: "flashcard",
      spanish: "flashcard",
      french: "flashcard",
      "human-social-biology": "flashcard",
      "agricultural-science": "flashcard",
    };
    if (!experimentType) experimentType = subjectExpMap[subjectId] || "flashcard";
  }

  if (!experimentConfig && !experimentType) {
    return <div className="exp-empty"><p>No interactive tool available for this lesson yet.</p></div>;
  }

  function renderInteractive() {
    switch (experimentType) {
      case "graphing-calc":
      case "graphing":
      case "graph-linear":
        return <GraphingCalculator />;
      case "drag-drop":
        return <DragDropLabel />;
      case "circuit-builder":
        return <CircuitBuilder />;
      case "balance-scale":
        return <BalanceScale experimentType={experimentType} />;
      case "flashcard":
      case "vocab-flashcards":
        return <FlashcardSystem subjectId={subjectId} />;
      default:
        return (
          <div className="exp-info">
            <h4>About this Activity</h4>
            <p>{experimentConfig?.description || "Explore this concept hands-on with our interactive tool."}</p>
            <div className="exp-tip">
              <strong>Tip:</strong> Experiments help reinforce what you've learned. Try different inputs and observe the results!
            </div>
          </div>
        );
    }
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