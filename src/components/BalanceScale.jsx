import { useState } from "react";

export default function BalanceScale() {
  const [leftSide, setLeftSide] = useState([]);
  const [rightSide, setRightSide] = useState([]);
  const [equation, setEquation] = useState({ left: "2x + 4", right: "10" });
  const [xValue, setXValue] = useState(null);
  const [message, setMessage] = useState("");

  const weights = [1, 2, 3, 5, "x"];

  function addLeft(item) {
    setLeftSide((prev) => [...prev, item]);
    setMessage("");
  }

  function addRight(item) {
    setRightSide((prev) => [...prev, item]);
    setMessage("");
  }

  function removeLeft(idx) {
    setLeftSide((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeRight(idx) {
    setRightSide((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCheckBalance() {
    const leftVal = leftSide.reduce((sum, item) => sum + (item === "x" ? 0 : item), 0);
    const rightVal = rightSide.reduce((sum, item) => sum + (item === "x" ? 0 : item), 0);
    const leftX = leftSide.filter((item) => item === "x").length;
    const rightX = rightSide.filter((item) => item === "x").length;
    const netX = leftX - rightX;
    const netVal = rightVal - leftVal;

    if (netX === 0 && netVal === 0) {
      setXValue(0);
      setMessage("✅ The scale is balanced! Both sides are equal.");
      return;
    }

    if (netX === 0) {
      setMessage(`❌ Not balanced. Left has ${leftVal}, Right has ${rightVal}. Difference: ${Math.abs(netVal)}`);
      setXValue(null);
      return;
    }

    const solved = netVal / netX;
    setXValue(solved);
    setMessage(`⚖️ Equation: ${netX}x = ${netVal} → x = ${solved}`);
  }

  function handleReset() {
    setLeftSide([]);
    setRightSide([]);
    setXValue(null);
    setMessage("");
  }

  function getWeightLabel(item) {
    return item === "x" ? "x" : String(item);
  }

  const leftTotal = leftSide.reduce((sum, item) => {
    if (item === "x") return sum;
    if (xValue !== null) return sum + (item === "x" ? 0 : item);
    return sum + item;
  }, 0) + (xValue !== null ? leftSide.filter((i) => i === "x").length * xValue : 0);

  const rightTotal = rightSide.reduce((sum, item) => {
    if (item === "x") return sum;
    if (xValue !== null) return sum + (item === "x" ? 0 : item);
    return sum + item;
  }, 0) + (xValue !== null ? rightSide.filter((i) => i === "x").length * xValue : 0);

  const tilt = leftTotal !== rightTotal;

  return (
    <div className="balance-scale">
      <div className="bs-header">
        <h4>⚖️ Equation Balance Scale</h4>
        <p>Drag weights to each side to solve equations. Use numbers for constants, "x" for variables.</p>
      </div>

      <div className="bs-weights">
        {weights.map((w) => (
          <div key={w} className="bs-weight" onClick={() => {}}>
            <div className="bs-weight-preview">{getWeightLabel(w)}</div>
            <div className="bs-weight-actions">
              <button className="bs-btn-sm" onClick={() => addLeft(w)}>← Left</button>
              <button className="bs-btn-sm" onClick={() => addRight(w)}>Right →</button>
            </div>
          </div>
        ))}
        <button className="bs-btn bs-btn-reset" onClick={handleReset}>🔄 Reset</button>
      </div>

      <div className="bs-scale">
        {/* Scale beam */}
        <div className={`bs-beam ${tilt ? (leftTotal > rightTotal ? "tilt-left" : "tilt-right") : "balanced"}`}>
          <div className="bs-pan bs-pan-left">
            <h4>Left Side</h4>
            {leftSide.length === 0 ? <p className="bs-empty">Drop weights here</p> : (
              <div className="bs-pan-items">
                {leftSide.map((item, i) => (
                  <div key={i} className="bs-pan-item" onClick={() => removeLeft(i)} title="Click to remove">
                    {getWeightLabel(item)}
                  </div>
                ))}
              </div>
            )}
            <p className="bs-total">Total: {leftTotal}</p>
          </div>

          <div className="bs-pivot">
            <div className="bs-pivot-dot">▼</div>
          </div>

          <div className="bs-pan bs-pan-right">
            <h4>Right Side</h4>
            {rightSide.length === 0 ? <p className="bs-empty">Drop weights here</p> : (
              <div className="bs-pan-items">
                {rightSide.map((item, i) => (
                  <div key={i} className="bs-pan-item" onClick={() => removeRight(i)} title="Click to remove">
                    {getWeightLabel(item)}
                  </div>
                ))}
              </div>
            )}
            <p className="bs-total">Total: {rightTotal}</p>
          </div>
        </div>
      </div>

      <button className="bs-btn bs-btn-check" onClick={handleCheckBalance}>🔍 Check Balance</button>

      {message && (
        <div className={`bs-message ${message.startsWith("✅") || message.startsWith("⚖️") ? "success" : "error"}`}>
          {message}
        </div>
      )}
    </div>
  );
}