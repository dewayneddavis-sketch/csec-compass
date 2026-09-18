import { useState, useEffect } from "react";
import { solveBalanceMethod } from "../data/mathWorking";
import MathWorkingReveal from "./MathWorkingReveal";

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

export default function BalanceScale({ subjectId, experimentType }) {
  // Subject-aware initial mode: mathematics → algebra, POA → accounting.
  const [mode, setMode] = useState(
    subjectId === "principles-of-accounts" ? "poa" : "math"
  );
  const [leftSide, setLeftSide] = useState([]);
  const [rightSide, setRightSide] = useState([]);
  const [message, setMessage] = useState("");
  const [xValue, setXValue] = useState(null);
  const [dragging, setDragging] = useState(null);
  // Worked method for the equation on the pans: { answer, steps, tone }.
  const [method, setMethod] = useState(null);

  useEffect(() => {
    if (subjectId === "principles-of-accounts") setMode("poa");
    else setMode("math");
    handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, experimentType]);

  // Any change to the pans makes a shown solution stale.
  function clearMethod() { setMethod(null); }

  function addLeft(item) { setLeftSide((p) => [...p, item]); setMessage(""); clearMethod(); }
  function addRight(item) { setRightSide((p) => [...p, item]); setMessage(""); clearMethod(); }
  function removeLeft(i) { setLeftSide((p) => p.filter((_, idx) => idx !== i)); clearMethod(); }
  function removeRight(i) { setRightSide((p) => p.filter((_, idx) => idx !== i)); clearMethod(); }

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
    clearMethod();
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
      // The worked method is computed from the student's OWN pans, so it always
      // matches what they built. It shows whether the check passed or failed —
      // on a failed check it is the whole point: the correct answer plus the
      // step-by-step maths.
      const solved = solveBalanceMethod(leftSide, rightSide);
      if (netX === 0 && netVal === 0) {
        setXValue(0);
        setMessage("Balanced! Both sides are equal.");
        setMethod({ ...solved, tone: "info" });
        return;
      }
      if (netX === 0) {
        setMessage(`Not balanced. Left: ${leftVal}, Right: ${rightVal}. Diff: ${Math.abs(netVal)}`);
        setXValue(null);
        setMethod({ ...solved, tone: "wrong" });
        return;
      }
      setXValue(netVal / netX);
      setMessage(`Equation: ${netX}x = ${netVal}  =>  x = ${(netVal / netX).toFixed(1)}`);
      setMethod({ ...solved, tone: "info" });
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

  // "Show the method" — ask for the working instead of (or before) checking.
  function handleShowMethod() {
    setMethod({ ...solveBalanceMethod(leftSide, rightSide), tone: "info" });
  }

  function handleReset() {
    setLeftSide([]); setRightSide([]); setXValue(null); setMessage(""); setMethod(null);
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
      {mode === "math" && (
        <button className="mwr-toggle" onClick={handleShowMethod}>📘 Show the method</button>
      )}

      {message && <div className={`bs-message ${message.startsWith("Balanced") || message.startsWith("Equation") || message.startsWith("Assets") ? "success" : "error"}`}>{message}</div>}

      {mode === "math" && method && (
        <MathWorkingReveal
          tone={method.tone}
          title={method.tone === "wrong" ? "Not balanced — here's the working" : "The working for this equation"}
          answer={method.answer !== null ? `x = ${Number.isInteger(method.answer) ? method.answer : Math.round(method.answer * 100) / 100}` : null}
          steps={method.steps}
        />
      )}
    </div>
  );
}
