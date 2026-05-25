import { useState } from "react";
import { getExperimentConfig, getLessonExperiment } from "../data/contentLoader";
import GraphingCalculator from "./GraphingCalculator";
import DragDropLabel from "./DragDropLabel";
import "./ExperimentSandbox.css";

export default function ExperimentSandbox({ subjectId, config, lessonExperiment }) {
  const [activeTab, setActiveTab] = useState("play");

  // Determine experiment type
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
    
    // Map subject to experiment type for the interactive tab
    const subjectExpMap = {
      mathematics: "graphing-calc",
      biology: "drag-drop",
    };
    if (!experimentType) experimentType = subjectExpMap[subjectId] || null;
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
      default:
        return (
          <div className="exp-info">
            <h4>About this Activity</h4>
            <p>{experimentConfig?.description || "Explore this concept hands-on with our interactive tool."}</p>
            <div className="exp-tip">
              <strong>💡 Tip:</strong> Experiments help reinforce what you've learned. Try different inputs and observe the results!
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
          <button className={`exp-tab ${activeTab === "play" ? "active" : ""}`} onClick={() => setActiveTab("play")}>
            🎮 Play
          </button>
          <button className={`exp-tab ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>
            ℹ️ About
          </button>
        </div>
      </div>
      <div className="exp-body">
        {activeTab === "play" ? renderInteractive() : (
          <div className="exp-info">
            <h4>About this Activity</h4>
            <p>{experimentConfig?.description || "Explore this concept hands-on with our interactive tool."}</p>
            <div className="exp-tip">
              <strong>💡 Tip:</strong> Experiments help reinforce what you've learned. Try different inputs and observe the results!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
