import { useState } from "react";

const labels = [
  { id: "mitochondria", label: "Mitochondria", x: 70, y: 55 },
  { id: "nucleus", label: "Nucleus", x: 35, y: 35 },
  { id: "cell-membrane", label: "Cell Membrane", x: 50, y: 15 },
  { id: "cytoplasm", label: "Cytoplasm", x: 50, y: 75 },
  { id: "ribosomes", label: "Ribosomes", x: 80, y: 30 },
];

const targetZones = [
  { id: "mitochondria", label: "Mitochondria", x: 27, y: 55, w: 22, h: 18 },
  { id: "nucleus", label: "Nucleus", x: 38, y: 35, w: 18, h: 18 },
  { id: "cell-membrane", label: "Cell Membrane", x: 10, y: 15, w: 28, h: 12 },
  { id: "cytoplasm", label: "Cytoplasm", x: 28, y: 72, w: 24, h: 16 },
  { id: "ribosomes", label: "Ribosomes", x: 57, y: 28, w: 22, h: 14 },
];

// Shuffled starting positions
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const startPositions = [
  { x: 10, y: 10 }, { x: 10, y: 25 }, { x: 10, y: 40 },
  { x: 10, y: 55 }, { x: 10, y: 70 },
];

export default function DragDropLabel() {
  const [placed, setPlaced] = useState({});
  const [dragging, setDragging] = useState(null);
  const shuffled = useState(() => shuffle(labels))[0];
  const [feedback, setFeedback] = useState("");

  function handleDragStart(e, labelId) {
    setDragging(labelId);
    e.dataTransfer.setData("text/plain", labelId);
  }

  function handleDrop(e, zoneId) {
    e.preventDefault();
    const labelId = e.dataTransfer.getData("text/plain");
    if (labelId === zoneId) {
      setPlaced((prev) => ({ ...prev, [zoneId]: true }));
      setDragging(null);
      setFeedback(`✅ Correct! "${labels.find((l) => l.id === zoneId).label}" is right!`);
    } else {
      setFeedback(`❌ Not quite. "${labels.find((l) => l.id === labelId)?.label}" doesn't go there. Try again!`);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleReset() {
    setPlaced({});
    setDragging(null);
    setFeedback("");
  }

  const allPlaced = Object.keys(placed).length === labels.length;

  return (
    <div className="drag-drop">
      <div className="dd-header">
        <h4>Label the Animal Cell</h4>
        <p>Drag each label to its correct position on the diagram.</p>
      </div>

      <div className="dd-main">
        {/* Diagram area */}
        <div className="dd-diagram">
          <svg viewBox="0 0 100 100" className="dd-svg">
            {/* Cell outline */}
            <ellipse cx="50" cy="50" rx="45" ry="42" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
            {/* Nucleus */}
            <circle cx="48" cy="42" r="12" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2" />
            <circle cx="48" cy="42" r="5" fill="#93c5fd" />
            {/* Mitochondria */}
            <ellipse cx="32" cy="58" rx="10" ry="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
            {/* Ribosomes */}
            <circle cx="60" cy="32" r="3" fill="#fce7f3" stroke="#ec4899" strokeWidth="0.8" />
            <circle cx="65" cy="35" r="3" fill="#fce7f3" stroke="#ec4899" strokeWidth="0.8" />
            {/* Cytoplasm area - the rest */}
            {/* Target zones */}
            {targetZones.map((z) => (
              <rect
                key={z.id}
                x={z.x} y={z.y} width={z.w} height={z.h}
                fill={placed[z.id] ? "rgba(34,197,94,0.15)" : "rgba(37,99,235,0.08)"}
                stroke={placed[z.id] ? "#22c55e" : "#93c5fd"}
                strokeWidth="0.8"
                strokeDasharray={placed[z.id] ? "none" : "3,2"}
                rx="3"
                onDrop={(e) => handleDrop(e, z.id)}
                onDragOver={handleDragOver}
                style={{ cursor: "pointer" }}
              />
            ))}
            {targetZones.map((z) => (
              <text
                key={`label-${z.id}`}
                x={z.x + z.w / 2} y={z.y + z.h / 2 + 1}
                textAnchor="middle"
                fontSize="3"
                fill={placed[z.id] ? "#16a34a" : "#6b7280"}
                fontWeight="bold"
              >
                {placed[z.id] ? labels.find((l) => l.id === z.id)?.label : "?"}
              </text>
            ))}
          </svg>
        </div>

        {/* Labels to drag */}
        <div className="dd-labels">
          <h4>Labels</h4>
          {shuffled.map((l, i) => {
            if (placed[l.id]) return null;
            return (
              <div
                key={l.id}
                className="dd-label"
                draggable
                onDragStart={(e) => handleDragStart(e, l.id)}
                style={{ opacity: dragging === l.id ? 0.5 : 1 }}
              >
                {l.label}
              </div>
            );
          })}
          {Object.keys(placed).length === labels.length && <p className="dd-done">✅ All placed!</p>}
        </div>
      </div>

      {feedback && <div className={`dd-feedback ${feedback.startsWith("✅") ? "correct" : "incorrect"}`}>{feedback}</div>}

      <div className="dd-actions">
        <button className="quiz-btn quiz-btn-ghost" onClick={handleReset}>🔄 Reset</button>
        {allPlaced && <span className="dd-success">🎉 Great job! You labeled the cell correctly!</span>}
      </div>
    </div>
  );
}
