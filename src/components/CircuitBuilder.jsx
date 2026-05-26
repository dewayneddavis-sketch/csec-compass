import { useState, useRef, useEffect } from "react";

const components = [
  { id: "battery", label: "Battery", symbol: "⏧" },
  { id: "bulb", label: "Bulb", symbol: "💡" },
  { id: "resistor", label: "Resistor", symbol: "⎓" },
  { id: "switch", label: "Switch", symbol: "⚘" },
];

export default function CircuitBuilder() {
  const canvasRef = useRef(null);
  const [circuit, setCircuit] = useState([]);
  const [currentFlow, setCurrentFlow] = useState(false);
  const [dragging, setDragging] = useState(null);

  // Draw the circuit
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Draw wires (simple path connections between components)
    ctx.strokeStyle = currentFlow ? "#22c55e" : "#6b7280";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (circuit.length >= 2) {
      for (let i = 0; i < circuit.length; i++) {
        const c = circuit[i];
        if (i === 0) ctx.moveTo(c.x + 20, c.y + 20);
        else ctx.lineTo(c.x + 20, c.y + 20);
      }
      // Close the loop if it's a cycle
      if (circuit.length >= 2) {
        ctx.lineTo(circuit[0].x + 20, circuit[0].y + 20);
      }
    }
    ctx.stroke();

    // Draw components
    circuit.forEach((c) => {
      drawComponent(ctx, c);
    });

    // Current flow animation dots
    if (currentFlow && circuit.length >= 2) {
      ctx.fillStyle = "#22c55e";
      const time = Date.now() / 500;
      for (let i = 0; i < circuit.length; i++) {
        const curr = circuit[i];
        const next = circuit[(i + 1) % circuit.length];
        const t = (time % 1);
        const x = curr.x + 20 + (next.x - curr.x) * t;
        const y = curr.y + 20 + (next.y - curr.y) * t;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [circuit, currentFlow]);

  function drawComponent(ctx, c) {
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, 40, 40, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#374151";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.label, c.x + 20, c.y + 12);

    ctx.font = "16px sans-serif";
    ctx.fillText(c.symbol, c.x + 20, c.y + 30);
  }

  function handleCanvasClick(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / 30) * 30;
    const y = Math.round((e.clientY - rect.top) / 30) * 30;
    if (x < 0 || x > 440 || y < 0 || y > 260) return;

    const idx = circuit.findIndex((c) => Math.abs(c.x - x) < 20 && Math.abs(c.y - y) < 20);
    if (idx >= 0) {
      setCircuit((prev) => prev.filter((_, i) => i !== idx));
    } else if (circuit.length < 8) {
      const type = dragging || "bulb";
      setCircuit((prev) => [...prev, { id: Date.now(), x, y, type, label: components.find((c) => c.id === type).label, symbol: components.find((c) => c.id === type).symbol }]);
    }
  }

  function handleAddComponent(type) {
    setDragging(type);
    // Find a free position
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const x = col * 60 + 30;
        const y = row * 60 + 30;
        if (!circuit.some((c) => Math.abs(c.x - x) < 30 && Math.abs(c.y - y) < 30)) {
          setCircuit((prev) => [...prev, { id: Date.now(), x, y, type, label: components.find((c) => c.id === type).label, symbol: components.find((c) => c.id === type).symbol }]);
          return;
        }
      }
    }
  }

  function handleClear() {
    setCircuit([]);
    setCurrentFlow(false);
    setDragging(null);
  }

  const hasBattery = circuit.some((c) => c.type === "battery");
  const hasSwitch = circuit.some((c) => c.type === "switch");
  const canFlow = circuit.length >= 2 && hasBattery && hasSwitch;

  return (
    <div className="circuit-builder">
      <div className="cb-header">
        <h4>Circuit Builder</h4>
        <p>Add components to build a working circuit. Click a component to remove it.</p>
      </div>

      <div className="cb-toolbar">
        {components.map((comp) => (
          <button key={comp.id} className="cb-tool" onClick={() => handleAddComponent(comp.id)}>
            {comp.symbol} {comp.label}
          </button>
        ))}
        <button className="cb-tool cb-clear" onClick={handleClear}>🗑 Clear</button>
      </div>

      <div className="cb-canvas-wrap">
        <canvas ref={canvasRef} width={480} height={300} className="cb-canvas" onClick={handleCanvasClick} />
        {circuit.length === 0 && <p className="cb-placeholder">Click the toolbar buttons to add components, then click on the grid to place them.</p>}
      </div>

      <div className="cb-controls">
        <p className="cb-count">Components: {circuit.length}/8</p>
        <button className={`cb-power ${canFlow && currentFlow ? "on" : ""}`} onClick={() => { if (canFlow) setCurrentFlow(!currentFlow); }} disabled={!canFlow}>
          {currentFlow ? "⏹ Stop" : "⚡ Start"}
        </button>
        <div className="cb-status">
          {!hasBattery && <span>❌ Need a battery</span>}
          {!hasSwitch && <span>❌ Need a switch</span>}
          {canFlow && !currentFlow && <span>✅ Ready — press Start!</span>}
          {currentFlow && <span>✅ Circuit is LIVE! 💡</span>}
        </div>
      </div>

      {currentFlow && (
        <div className="cb-tips">
          <p>💡 The circuit is complete! Current flows through all components. Try adding more bulbs or resistors.</p>
        </div>
      )}
    </div>
  );
}