import { useState, useRef, useEffect } from "react";

export default function GraphingCalculator() {
  const canvasRef = useRef(null);
  const [m, setM] = useState(1);
  const [b, setB] = useState(0);
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

    // Plot the line y = mx + b
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= plotW; px++) {
      const x = xRange.min + (px / plotW) * (xRange.max - xRange.min);
      const y = m * x + b;
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
    ctx.fillText(`y = ${m}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}`, pad + 8, pad + 20);

    // Points on line
    for (let x = -10; x <= 10; x++) {
      const y = m * x + b;
      if (y < -10 || y > 10) continue;
      const [cx, cy] = toCanvas(x, y);
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.fill();
    }
  }, [m, b, xRange]);

  return (
    <div className="graphing-calc">
      <div className="gc-controls">
        <div className="gc-slider-group">
          <label>Slope (m) = <strong>{m.toFixed(1)}</strong></label>
          <input type="range" min="-5" max="5" step="0.1" value={m} onChange={(e) => setM(parseFloat(e.target.value))} />
        </div>
        <div className="gc-slider-group">
          <label>Y-Intercept (b) = <strong>{b.toFixed(1)}</strong></label>
          <input type="range" min="-10" max="10" step="0.1" value={b} onChange={(e) => setB(parseFloat(e.target.value))} />
        </div>
      </div>
      <div className="gc-canvas-wrap">
        <canvas ref={canvasRef} width={500} height={380} className="gc-canvas" />
      </div>
      <div className="gc-tips">
        <p>💡 <strong>Try this:</strong> Set m=2, b=3 and see the line. What happens when m is negative? When b changes?</p>
      </div>
    </div>
  );
}
