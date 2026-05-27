import { useState, useEffect } from "react";

const mathWeights = [1, 2, 3, 5, "x"];
const poaItems = [
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
];

export default function BalanceScale({ experimentType }) {
  const [mode, setMode] = useState("math");
  const [leftSide, setLeftSide] = useState([]);
  const [rightSide, setRightSide] = useState([]);
  const [message, setMessage] = useState("");
  const [xValue, setXValue] = useState(null);
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    if (experimentType === "balance-scale") setMode("math");
  }, [experimentType]);

  function addLeft(item) { setLeftSide((p) => [...p, item]); setMessage(""); }
  function addRight(item) { setRightSide((p) => [...p, item]); setMessage(""); }
  function removeLeft(i) { setLeftSide((p) => p.filter((_, idx) => idx !== i)); }
  function removeRight(i) { setRightSide((p) => p.filter((_, idx) => idx !== i)); }

  // Drag handlers
  function handleDragStart(e, item, side) {
    setDragging({ item, fromSide: side, idx: null });
    e.dataTransfer.setData("text/plain", JSON.stringify({ item, fromSide: side }));
  }

  function handleDrop(e, targetSide) {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.fromSide === "left" && targetSide === "right") {
        if (data.idx !== null) {
          setRightSide((p) => [...p, leftSide[data.idx]]);
          setLeftSide((p) => p.filter((_, i) => i !== data.idx));
        }
      } else if (data.fromSide === "right" && targetSide === "left") {
        if (data.idx !== null) {
          setLeftSide((p) => [...p, rightSide[data.idx]]);
          setRightSide((p) => p.filter((_, i) => i !== data.idx));
        }
      }
    } catch {}
    setDragging(null);
  }

  function handleDragOver(e) { e.preventDefault(); }

  function handleCheckBalance() {
    if (mode === "math") {
      const leftVal = leftSide.reduce((s, item) => s + (item === "x" ? 0 : item), 0);
      const rightVal = rightSide.reduce((s, item) => s + (item === "x" ? 0 : item), 0);
      const leftX = leftSide.filter((item) => item === "x").length;
      const rightX = rightSide.filter((item) => item === "x").length;
      const netX = leftX - rightX;
      const netVal = rightVal - leftVal;
      if (netX === 0 && netVal === 0) { setXValue(0); setMessage("Balanced! Both sides are equal."); return; }
      if (netX === 0) { setMessage(`Not balanced. Left: ${leftVal}, Right: ${rightVal}. Diff: ${Math.abs(netVal)}`); setXValue(null); return; }
      setXValue(netVal / netX);
      setMessage(`Equation: ${netX}x = ${netVal}  =>  x = ${(netVal / netX).toFixed(1)}`);
    } else {
      // POA mode: check accounting equation
      const leftAssets = leftSide.filter((i) => i.category === "asset").reduce((s) => s + 1, 0);
      const rightEq = rightSide.filter((i) => i.category === "liability" || i.category === "equity").reduce((s) => s + 1, 0);
      if (leftAssets === rightEq && leftSide.length === rightSide.length) {
        setMessage("Assets = Liabilities + Equity! The accounting equation holds.");
      } else {
        setMessage(`Not balanced. Assets: ${leftAssets} items, Liab+Equity: ${rightEq} items. Keep trying!`);
      }
    }
  }

  function handleReset() {
    setLeftSide([]); setRightSide([]); setXValue(null); setMessage("");
  }

  const leftTotal = mode === "math"
    ? leftSide.reduce((s, item) => s + (item === "x" ? 0 : item), 0) + (xValue !== null ? leftSide.filter((i) => i === "x").length * xValue : 0)
    : leftSide.length;

  const rightTotal = mode === "math"
    ? rightSide.reduce((s, item) => s + (item === "x" ? 0 : item), 0) + (xValue !== null ? rightSide.filter((i) => i === "x").length * xValue : 0)
    : rightSide.length;

  const tilt = leftTotal !== rightTotal;

  function getLabel(item) {
    if (mode === "math") return item === "x" ? "x" : String(item);
    return item.label;
  }

  function getShortLabel(item) {
    if (mode === "math") return item === "x" ? "x" : String(item);
    return item.label.substring(0, 4);
  }

  return (
    <div className="balance-scale">
      <div className="bs-header">
        <h4>{mode === "math" ? "Equation Balance Scale" : "Accounting Equation Balance"}</h4>
        <div className="bs-mode-tabs">
          <button className={`bs-mode-tab ${mode === "math" ? "active" : ""}`} onClick={() => { setMode("math"); handleReset(); }}>Math (Algebra)</button>
          <button className={`bs-mode-tab ${mode === "poa" ? "active" : ""}`} onClick={() => { setMode("poa"); handleReset(); }}>POA (Accounting)</button>
        </div>
      </div>

      <div className="bs-weights">
        {mode === "math"
          ? mathWeights.map((w, i) => (
              <div key={i} className="bs-weight" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ item: w, fromSide: "toolbar", idx: null })); }}>
                <div className="bs-wpreview">{getLabel(w)}</div>
                <div className="bs-wactions">
                  <button className="bs-btn-sm" onClick={() => addLeft(w)}>L</button>
                  <button className="bs-btn-sm" onClick={() => addRight(w)}>R</button>
                </div>
              </div>
            ))
          : poaItems.map((item, i) => (
              <div key={i} className={`bs-weight bs-cat-${item.category}`} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ item, fromSide: "toolbar" })); }}>
                <div className="bs-wpreview" title={item.category}>{item.label}</div>
                <div className="bs-wactions">
                  <button className="bs-btn-sm" onClick={() => addLeft(item)}>Assets</button>
                  <button className="bs-btn-sm" onClick={() => addRight(item)}>Liab/Eq</button>
                </div>
              </div>
            ))}
        <button className="bs-btn bs-btn-reset" onClick={handleReset}>Reset</button>
      </div>

      <div className="bs-scale-area">
        <div className={`bs-beam ${!tilt ? "balanced" : leftTotal > rightTotal ? "tilt-left" : "tilt-right"}`}>
          <div className="bs-pan bs-left" onDrop={(e) => handleDrop(e, "left")} onDragOver={handleDragOver}>
            <h4>{mode === "math" ? "Left Side" : "Assets"}</h4>
            {leftSide.length === 0 ? <p className="bs-empty">Drop items here</p> : (
              <div className="bs-items">
                {leftSide.map((item, i) => (
                  <div key={i} className="bs-item" draggable onDragStart={(e) => handleDragStart(e, item, "left")} onClick={() => removeLeft(i)} title="Click to remove, drag to move">
                    {getShortLabel(item)}
                  </div>
                ))}
              </div>
            )}
            <p className="bs-total">Total: {leftTotal}</p>
          </div>
          <div className="bs-pivot"><div className="bs-pdot">&#9660;</div></div>
          <div className="bs-pan bs-right" onDrop={(e) => handleDrop(e, "right")} onDragOver={handleDragOver}>
            <h4>{mode === "math" ? "Right Side" : "Liabilities + Equity"}</h4>
            {rightSide.length === 0 ? <p className="bs-empty">Drop items here</p> : (
              <div className="bs-items">
                {rightSide.map((item, i) => (
                  <div key={i} className="bs-item" draggable onDragStart={(e) => handleDragStart(e, item, "right")} onClick={() => removeRight(i)} title="Click to remove, drag to move">
                    {getShortLabel(item)}
                  </div>
                ))}
              </div>
            )}
            <p className="bs-total">Total: {rightTotal}</p>
          </div>
        </div>
      </div>

      <button className="bs-btn bs-btn-check" onClick={handleCheckBalance}>
        {mode === "math" ? "Check Balance" : "Verify Equation"}
      </button>

      {message && <div className={`bs-message ${message.startsWith("Balanced") || message.startsWith("Equation") || message.startsWith("Assets") ? "success" : "error"}`}>{message}</div>}
    </div>
  );
}