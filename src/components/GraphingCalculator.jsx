import { useState, useRef, useEffect } from "react";

export default function GraphingCalculator({ mode = "linear" }) {
  const canvasRef = useRef(null);
  const [m, setM] = useState(1);
  const [b, setB] = useState(0);
  const [a, setA] = useState(1);
  const [c, setC] = useState(0);
  const [ineq, setIneq] = useState(">=");
  const [boundary, setBoundary] = useState(0);
  const [xRange, setXRange] = useState({ min: -10, max: 10 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const pad = 40;
    const plotW = W - 2 * pad;
    const plotH = H - 2 * pad;

    function toCanvas(x, y) {
      const cx = pad + ((x - xRange.min) / (xRange.max - xRange.min)) * plotW;
      const cy = pad + plotH - ((y - (-10)) / (20)) * plotH;
      return [cx, cy];
    }

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      const [cx] = toCanvas(i, 0);
      ctx.beginPath();
      ctx.moveTo(cx, pad);
      ctx.lineTo(cx, H - pad);
      ctx.stroke();
      const [, cy] = toCanvas(0, i);
      ctx.beginPath();
      ctx.moveTo(pad, cy);
      ctx.lineTo(W - pad, cy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;
    const [x0, y0] = toCanvas(0, 0);
    ctx.beginPath(); ctx.moveTo(pad, y0); ctx.lineTo(W - pad, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, pad); ctx.lineTo(x0, H - pad); ctx.stroke();

    // Labels on axes
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    for (let i = -10; i <= 10; i++) {
      if (i === 0) continue;
      const [cx, cy] = toCanvas(i, 0);
      ctx.fillText(i, cx, y0 + 18);
      ctx.fillText(i, x0 + 12, cy + 4);
    }

    if (mode === "number-line") {
      // Highlight the number line axis
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(pad, y0); ctx.lineTo(W - pad, y0); ctx.stroke();

      // Shade the inequality region
      const [bx] = toCanvas(boundary, 0);
      ctx.fillStyle = "rgba(37,99,235,0.18)";
      if (ineq.includes(">")) {
        ctx.fillRect(bx, y0 - 8, W - pad - bx, 16);
      } else {
        ctx.fillRect(pad, y0 - 8, bx - pad, 16);
      }

      // Boundary marker
      ctx.fillStyle = ineq.includes("=") ? "#2563eb" : "#ffffff";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, y0, 6, 0, Math.PI * 2);
      ctx.fill();
      if (!ineq.includes("=")) ctx.stroke();

      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`x ${ineq} ${boundary}`, pad + 8, pad + 20);
      return;
    }

    // Compute y for the active function
    function f(x) {
      if (mode === "parabola") return a * x * x + m * x + c;
      return m * x + b;
    }

    // Plot the curve
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= plotW; px++) {
      const x = xRange.min + (px / plotW) * (xRange.max - xRange.min);
      const y = f(x);
      if (y < -10 || y > 10) { first = true; continue; }
      const [cx, cy] = toCanvas(x, y);
      if (first) { ctx.moveTo(cx, cy); first = false; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Equation text
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    if (mode === "parabola") {
      const signM = m >= 0 ? "+ " + m.toFixed(1) : "- " + Math.abs(m).toFixed(1);
      const signC = c >= 0 ? "+ " + c.toFixed(1) : "- " + Math.abs(c).toFixed(1);
      ctx.fillText(`y = ${a.toFixed(1)}x² ${signM}x ${signC}`, pad + 8, pad + 20);
    } else {
      ctx.fillText(`y = ${m}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}`, pad + 8, pad + 20);
    }

    // Points on curve (integers)
    for (let x = -10; x <= 10; x++) {
      const y = f(x);
      if (y < -10 || y > 10) continue;
      const [cx, cy] = toCanvas(x, y);
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.fill();
    }
  }, [m, b, a, c, ineq, boundary, xRange, mode]);

  return (
    <div className="graphing-calc">
      <div className="gc-controls">
        {mode === "parabola" ? (
          <>
            <div className="gc-slider-group">
              <label>A (x² coeff) = <strong>{a.toFixed(1)}</strong></label>
              <input type="range" min="-3" max="3" step="0.1" value={a} onChange={(e) => setA(parseFloat(e.target.value))} />
            </div>
            <div className="gc-slider-group">
              <label>B (x coeff) = <strong>{m.toFixed(1)}</strong></label>
              <input type="range" min="-5" max="5" step="0.1" value={m} onChange={(e) => setM(parseFloat(e.target.value))} />
            </div>
            <div className="gc-slider-group">
              <label>C (constant) = <strong>{c.toFixed(1)}</strong></label>
              <input type="range" min="-10" max="10" step="0.1" value={c} onChange={(e) => setC(parseFloat(e.target.value))} />
            </div>
          </>
        ) : mode === "number-line" ? (
          <>
            <div className="gc-slider-group">
              <label>Inequality: <strong>x {ineq} {boundary}</strong></label>
              <select className="gc-select" value={ineq} onChange={(e) => setIneq(e.target.value)}>
                <option value=">=">x ≥ b (greater than or equal)</option>
                <option value="<=">x ≤ b (less than or equal)</option>
                <option value=">">x &gt; b (greater than)</option>
                <option value="<">x &lt; b (less than)</option>
              </select>
            </div>
            <div className="gc-slider-group">
              <label>Boundary (b) = <strong>{boundary}</strong></label>
              <input type="range" min="-10" max="10" step="0.5" value={boundary} onChange={(e) => setBoundary(parseFloat(e.target.value))} />
            </div>
          </>
        ) : (
          <>
            <div className="gc-slider-group">
              <label>Slope (m) = <strong>{m.toFixed(1)}</strong></label>
              <input type="range" min="-5" max="5" step="0.1" value={m} onChange={(e) => setM(parseFloat(e.target.value))} />
            </div>
            <div className="gc-slider-group">
              <label>Y-Intercept (b) = <strong>{b.toFixed(1)}</strong></label>
              <input type="range" min="-10" max="10" step="0.1" value={b} onChange={(e) => setB(parseFloat(e.target.value))} />
            </div>
          </>
        )}
      </div>
      <div className="gc-canvas-wrap">
        <canvas ref={canvasRef} width={500} height={380} className="gc-canvas" />
      </div>
      <div className="gc-tips">
        {mode === "parabola"
          ? <p>💡 <strong>Try this:</strong> Make A negative to flip the parabola. What happens when A is 0? When C changes?</p>
          : mode === "number-line"
            ? <p>💡 <strong>Try this:</strong> The blue region shows all values that satisfy the inequality. Open circles mean the boundary is NOT included.</p>
            : <p>💡 <strong>Try this:</strong> Set m=2, b=3 and see the line. What happens when m is negative? When b changes?</p>}
      </div>
    </div>
  );
}
