import { useState } from "react";

// ---- Subject-aware content sets ------------------------------------------
// Every set's CONTENT belongs to its own subject. `kind: "diagram"` keeps the
// biology cell diagram; `kind: "match"` is a list-style matching activity;
// `kind: "sort"` lets multiple items drop into shared category zones (POA).
const subjectSets = {
  biology: {
    title: "Label the Animal Cell",
    subtitle: "Drag each label to its correct position on the diagram.",
    kind: "diagram",
    labels: [
      { id: "mitochondria", label: "Mitochondria" },
      { id: "nucleus", label: "Nucleus" },
      { id: "cell-membrane", label: "Cell Membrane" },
      { id: "cytoplasm", label: "Cytoplasm" },
      { id: "ribosomes", label: "Ribosomes" },
    ],
    targetZones: [
      { id: "mitochondria", label: "Mitochondria", x: 27, y: 55, w: 22, h: 18 },
      { id: "nucleus", label: "Nucleus", x: 38, y: 35, w: 18, h: 18 },
      { id: "cell-membrane", label: "Cell Membrane", x: 10, y: 15, w: 28, h: 12 },
      { id: "cytoplasm", label: "Cytoplasm", x: 28, y: 72, w: 24, h: 16 },
      { id: "ribosomes", label: "Ribosomes", x: 57, y: 28, w: 22, h: 14 },
    ],
  },
  "english-a": {
    title: "Match Literary Devices",
    subtitle: "Drag each literary device to its example.",
    kind: "match",
    pairs: [
      { id: "simile", target: "Uses 'like' or 'as' to compare", label: "Simile" },
      { id: "metaphor", target: "States one thing IS another", label: "Metaphor" },
      { id: "personification", target: "Gives human qualities to objects", label: "Personification" },
      { id: "hyperbole", target: "Extreme exaggeration for effect", label: "Hyperbole" },
      { id: "onomatopoeia", target: "Words that imitate sounds (buzz, hiss)", label: "Onomatopoeia" },
      { id: "alliteration", target: "Repeated initial consonant sounds", label: "Alliteration" },
    ],
  },
  mathematics: {
    title: "Match Math Terms",
    subtitle: "Drag each term to its meaning.",
    kind: "match",
    pairs: [
      { id: "mean", target: "Sum of values ÷ number of values", label: "Mean" },
      { id: "median", target: "Middle value when data is ordered", label: "Median" },
      { id: "mode", target: "Most frequently occurring value", label: "Mode" },
      { id: "gradient", target: "Rise over run — steepness of a line", label: "Gradient" },
      { id: "intercept", target: "Where a line crosses the y-axis", label: "Intercept" },
      { id: "hypotenuse", target: "Longest side of a right-angled triangle", label: "Hypotenuse" },
      { id: "prime", target: "Number with exactly two factors: 1 and itself", label: "Prime number" },
    ],
  },
  physics: {
    title: "Match Quantities to Units",
    subtitle: "Drag each quantity to its SI unit.",
    kind: "match",
    pairs: [
      { id: "force", target: "Newton (N)", label: "Force" },
      { id: "energy", target: "Joule (J)", label: "Energy" },
      { id: "power", target: "Watt (W)", label: "Power" },
      { id: "voltage", target: "Volt (V)", label: "Voltage" },
      { id: "current", target: "Ampere (A)", label: "Current" },
    ],
  },
  chemistry: {
    title: "Match Equipment to Use",
    subtitle: "Drag each piece of equipment to its use.",
    kind: "match",
    pairs: [
      { id: "beaker", target: "Holding and mixing liquids", label: "Beaker" },
      { id: "burette", target: "Measuring exact volumes in titrations", label: "Burette" },
      { id: "test-tube", target: "Heating small amounts of substances", label: "Test tube" },
      { id: "volumetric-flask", target: "Preparing precise solution volumes", label: "Volumetric flask" },
      { id: "evaporating-dish", target: "Evaporating liquids to obtain solids", label: "Evaporating dish" },
    ],
  },
  "principles-of-accounts": {
    title: "Classify Balance Sheet Items",
    subtitle: "Drag each item into Asset, Liability, or Equity.",
    kind: "sort",
    categories: [
      { id: "asset", label: "Asset" },
      { id: "liability", label: "Liability" },
      { id: "equity", label: "Equity" },
    ],
    items: [
      { id: "cash", label: "Cash", category: "asset" },
      { id: "inventory", label: "Inventory", category: "asset" },
      { id: "equipment", label: "Equipment", category: "asset" },
      { id: "land", label: "Land & Buildings", category: "asset" },
      { id: "receivables", label: "Receivables", category: "asset" },
      { id: "loan", label: "Bank Loan", category: "liability" },
      { id: "payables", label: "Payables", category: "liability" },
      { id: "mortgage", label: "Mortgage", category: "liability" },
      { id: "capital", label: "Owner's Capital", category: "equity" },
      { id: "profit", label: "Retained Profit", category: "equity" },
    ],
  },
  "information-technology": {
    title: "Match Devices to Categories",
    subtitle: "Drag each device to its correct category.",
    kind: "match",
    pairs: [
      { id: "keyboard", target: "Input device", label: "Keyboard" },
      { id: "monitor", target: "Output device", label: "Monitor" },
      { id: "ssd", target: "Storage device", label: "SSD" },
      { id: "router", target: "Networking device", label: "Router" },
    ],
  },
  "social-studies": {
    title: "Match Institutions to Functions",
    subtitle: "Drag each institution to its function in society.",
    kind: "match",
    pairs: [
      { id: "family", target: "Socialization of children", label: "Family" },
      { id: "school", target: "Education and learning", label: "School" },
      { id: "courts", target: "Justice and law enforcement", label: "Courts" },
      { id: "church", target: "Spiritual and moral guidance", label: "Church" },
    ],
  },
  spanish: {
    title: "Spanish Word Match",
    subtitle: "Drag each Spanish word to its English meaning.",
    kind: "match",
    pairs: [
      { id: "hola", target: "Hello", label: "Hola" },
      { id: "gracias", target: "Thank you", label: "Gracias" },
      { id: "casa", target: "House", label: "Casa" },
      { id: "comida", target: "Food", label: "Comida" },
    ],
  },
};

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

export default function DragDropLabel({ subjectId }) {
  const set = subjectSets[subjectId] || subjectSets["english-a"];
  const [placed, setPlaced] = useState({});
  const [dragging, setDragging] = useState(null);
  const shuffled = useState(() => shuffle(
    set.kind === "diagram" ? set.labels : set.kind === "sort" ? set.items : set.pairs
  ))[0];
  const [feedback, setFeedback] = useState("");

  function handleDragStart(e, itemId) {
    setDragging(itemId);
    e.dataTransfer.setData("text/plain", itemId);
  }

  function isCorrect(itemId, zoneId) {
    if (set.kind === "diagram") return itemId === zoneId;
    if (set.kind === "sort") {
      const item = set.items.find((i) => i.id === itemId);
      return item && item.category === zoneId;
    }
    const pair = set.pairs.find((p) => p.id === itemId);
    return pair && pair.id === zoneId;
  }

  function displayLabel(itemId) {
    if (set.kind === "diagram") return set.labels.find((l) => l.id === itemId)?.label;
    if (set.kind === "sort") return set.items.find((i) => i.id === itemId)?.label;
    return set.pairs.find((p) => p.id === itemId)?.label;
  }

  function handleDrop(e, zoneId) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    if (isCorrect(itemId, zoneId)) {
      setPlaced((prev) => {
        const next = { ...prev };
        if (set.kind === "sort") {
          const current = next[zoneId] || [];
          if (!current.includes(itemId)) next[zoneId] = [...current, itemId];
        } else {
          next[zoneId] = itemId;
        }
        return next;
      });
      setDragging(null);
      setFeedback(`✅ Correct! "${displayLabel(itemId)}" is right!`);
    } else {
      setFeedback(`❌ Not quite. "${displayLabel(itemId)}" doesn't go there. Try again!`);
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

  const totalItems = set.kind === "sort" ? set.items.length : set.kind === "diagram" ? set.labels.length : set.pairs.length;
  const placedCount = set.kind === "sort"
    ? Object.values(placed).reduce((s, arr) => s + arr.length, 0)
    : Object.keys(placed).length;
  const allPlaced = placedCount === totalItems;

  // ---- Render ------------------------------------------------------------
  const header = (
    <div className="dd-header">
      <h4>{set.title}</h4>
      <p>{set.subtitle}</p>
    </div>
  );

  const feedbackEl = feedback && (
    <div className={`dd-feedback ${feedback.startsWith("✅") ? "correct" : "incorrect"}`}>{feedback}</div>
  );

  const actionsEl = (
    <div className="dd-actions">
      <button className="quiz-btn quiz-btn-ghost" onClick={handleReset}>🔄 Reset</button>
      {allPlaced && <span className="dd-success">🎉 Great job! {placedCount}/{totalItems} matched!</span>}
    </div>
  );

  // Biology diagram (SVG) layout
  if (set.kind === "diagram") {
    return (
      <div className="drag-drop">
        {header}
        <div className="dd-main">
          <div className="dd-diagram">
            <svg viewBox="0 0 100 100" className="dd-svg">
              <ellipse cx="50" cy="50" rx="45" ry="42" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
              <circle cx="48" cy="42" r="12" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2" />
              <circle cx="48" cy="42" r="5" fill="#93c5fd" />
              <ellipse cx="32" cy="58" rx="10" ry="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
              <circle cx="60" cy="32" r="3" fill="#fce7f3" stroke="#ec4899" strokeWidth="0.8" />
              <circle cx="65" cy="35" r="3" fill="#fce7f3" stroke="#ec4899" strokeWidth="0.8" />
              {set.targetZones.map((z) => (
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
              {set.targetZones.map((z) => (
                <text
                  key={`label-${z.id}`}
                  x={z.x + z.w / 2} y={z.y + z.h / 2 + 1}
                  textAnchor="middle"
                  fontSize="3"
                  fill={placed[z.id] ? "#16a34a" : "#6b7280"}
                  fontWeight="bold"
                >
                  {placed[z.id] ? displayLabel(z.id) : "?"}
                </text>
              ))}
            </svg>
          </div>
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
            {allPlaced && <p className="dd-done">✅ All placed!</p>}
          </div>
        </div>
        {feedbackEl}
        {actionsEl}
      </div>
    );
  }

  // List-style match / sort layout
  const zones = set.kind === "sort" ? set.categories : set.pairs.map((p) => ({ id: p.id, label: p.target }));
  return (
    <div className="drag-drop">
      {header}
      <div className="dd-main dd-main-list">
        <div className="dd-labels">
          <h4>Drag items</h4>
          {shuffled.map((item, i) => {
            const itemId = set.kind === "sort" ? item.id : item.id;
            if (set.kind === "sort" ? (placed[item.category] || []).includes(itemId) : placed[itemId]) return null;
            return (
              <div
                key={itemId}
                className="dd-label"
                draggable
                onDragStart={(e) => handleDragStart(e, itemId)}
                style={{ opacity: dragging === itemId ? 0.5 : 1 }}
              >
                {set.kind === "sort" ? item.label : item.label}
              </div>
            );
          })}
          {allPlaced && <p className="dd-done">✅ All placed!</p>}
        </div>
        <div className="dd-zones">
          <h4>Drop zones</h4>
          {zones.map((z) => {
            const placedHere = set.kind === "sort"
              ? (placed[z.id] || []).map(displayLabel)
              : placed[z.id] ? [displayLabel(z.id)] : [];
            return (
              <div
                key={z.id}
                className={`dd-zone ${placedHere.length ? "filled" : ""}`}
                onDrop={(e) => handleDrop(e, z.id)}
                onDragOver={handleDragOver}
              >
                <span className="dd-zone-label">{z.label}</span>
                <span className="dd-zone-value">
                  {placedHere.length ? placedHere.join(", ") : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {feedbackEl}
      {actionsEl}
    </div>
  );
}
