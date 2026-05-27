import { useState, useRef, useEffect, useCallback } from "react";

const compDefs = [
  { id: "battery", label: "Battery", symbol: "⏧", color: "#f59e0b" },
  { id: "bulb", label: "Bulb", symbol: "💡", color: "#fef3c7" },
  { id: "resistor", label: "Resistor", symbol: "⎓", color: "#fce7f3" },
  { id: "switch", label: "Switch", symbol: "⚘", color: "#dbeafe" },
];

function drawWire(ctx, x1, y1, x2, y2, color, dashed) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  if (dashed) ctx.setLineDash([5, 5]);
  else ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1 + 20, y1 + 20);
  ctx.lineTo(x2 + 20, y2 + 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

export default function CircuitBuilder() {
  const canvasRef = useRef(null);
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [currentFlow, setCurrentFlow] = useState(false);
  const [activePlace, setActivePlace] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [dragComp, setDragComp] = useState(null);
  const animRef = useRef(null);

  const GRID = 30;

  const placeComponent = useCallback((type) => {
    const def = compDefs.find((d) => d.id === type);
    if (!def) return;
    let x = 60, y = 60, attempts = 0;
    do {
      x = (Math.floor(Math.random() * 10) + 1) * GRID;
      y = (Math.floor(Math.random() * 6) + 1) * GRID;
      attempts++;
    } while (attempts < 50 && components.some((c) => Math.abs(c.x - x) < 40 && Math.abs(c.y - y) < 40));
    setComponents((prev) => [...prev, { id: Date.now() + "_" + type, type, x, y, label: def.label, symbol: def.symbol, color: def.color }]);
  }, [components]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Draw connections as wires
    connections.forEach((conn) => {
      const c1 = components.find((c) => c.id === conn.from);
      const c2 = components.find((c) => c.id === conn.to);
      if (c1 && c2) drawWire(ctx, c1.x, c1.y, c2.x, c2.y, currentFlow ? "#22c55e" : "#6b7280", false);
    });

    // Current animation
    if (currentFlow && connections.length > 0) {
      const time = Date.now() / 400;
      connections.forEach((conn, idx) => {
        const c1 = components.find((c) => c.id === conn.from);
        const c2 = components.find((c) => c.id === conn.to);
        if (!c1 || !c2) return;
        const t = ((time + idx * 0.3) % 1);
        const x = c1.x + 20 + (c2.x - c1.x) * t;
        const y = c1.y + 20 + (c2.y - c1.y) * t;
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(animate);
    }

    // Draw components
    components.forEach((c) => {
      // Socket pads
      for (let dx = -1; dx <= 1; dx += 2) {
        for (let dy = -1; dy <= 1; dy += 2) {
          const sx = c.x + 20 + dx * 20;
          const sy = c.y + 20 + dy * 20;
          ctx.fillStyle = "#e5e7eb";
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, 40, 40, 6);
      ctx.fill();
      ctx.stroke();

      if (showLabels) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(c.type === "battery" ? "9V" : c.type === "resistor" ? "100Ω" : c.type === "bulb" ? "6V 0.5A" : "", c.x + 20, c.y + 6);
      }

      ctx.fillStyle = "#374151";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.label, c.x + 20, c.y + 12);
      ctx.font = "14px sans-serif";
      ctx.fillText(c.symbol, c.x + 20, c.y + 30);
    });
  }, [components, connections, currentFlow, showLabels]);

  useEffect(() => {
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [animate]);

  function handleCanvasClick(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / GRID) * GRID;
    const y = Math.round((e.clientY - rect.top) / GRID) * GRID;
    if (x < 0 || x > 440 || y < 0 || y > 260) return;

    const clicked = components.findIndex((c) => Math.abs(c.x - x) < 25 && Math.abs(c.y - y) < 25);
    if (clicked >= 0) {
      if (activePlace === null) {
        setActivePlace(components[clicked].id);
      } else {
        const fromId = activePlace;
        const toId = components[clicked].id;
        if (fromId !== toId) {
          const exists = connections.some((conn) =>
            (conn.from === fromId && conn.to === toId) || (conn.from === toId && conn.to === fromId)
          );
          if (!exists) setConnections((prev) => [...prev, { from: fromId, to: toId }]);
        }
        setActivePlace(null);
      }
      return;
    }

    if (activePlace !== null) {
      const fromComp = components.find((c) => c.id === activePlace);
      if (fromComp) {
        const dist = Math.sqrt((x - fromComp.x) ** 2 + (y - fromComp.y) ** 2);
        if (dist < 100) {
          setComponents((prev) => prev.map((c) => c.id === fromComp.id ? { ...c, x, y } : c));
        }
      }
      setActivePlace(null);
    }
  }

  function handleRightClick(e) {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = components.findIndex((c) => Math.abs(c.x + 20 - x) < 25 && Math.abs(c.y + 20 - y) < 25);
    if (idx >= 0) {
      const removed = components[idx];
      setComponents((prev) => prev.filter((_, i) => i !== idx));
      setConnections((prev) => prev.filter((conn) => conn.from !== removed.id && conn.to !== removed.id));
    }
  }

  function handleClear() {
    setComponents([]);
    setConnections([]);
    setCurrentFlow(false);
    setActivePlace(null);
  }

  const hasBattery = components.some((c) => c.type === "battery");
  const hasSwitch = components.some((c) => c.type === "switch");
  const canFlow = components.length >= 2 && hasBattery && hasSwitch && connections.length > 0;

  return (
    <div className="circuit-builder">
      <div className="cb-header">
        <h4>Circuit Builder</h4>
        <p>Add components, click to select (first component), then click another to connect wires. Right-click to remove.</p>
      </div>

      <div className="cb-toolbar">
        {compDefs.map((def) => (
          <button key={def.id} className="cb-tool" onClick={() => placeComponent(def.id)}>
            {def.symbol} {def.label}
          </button>
        ))}
        <button className="cb-tool cb-clear" onClick={handleClear}>Clear</button>
        <button className={`cb-tool ${showLabels ? "cb-active" : ""}`} onClick={() => setShowLabels(!showLabels)}>
          {showLabels ? "Hide" : "Show"} Labels
        </button>
      </div>

      <div className="cb-canvas-wrap">
        <canvas ref={canvasRef} width={480} height={300} className="cb-canvas" onClick={handleCanvasClick} onContextMenu={handleRightClick} />
        {components.length === 0 && <p className="cb-placeholder">Click toolbar buttons to add components, then click and connect them.</p>}
        {activePlace && <p className="cb-hint">Click another component to connect wires, or click empty space to cancel.</p>}
      </div>

      <div className="cb-controls">
        <p className="cb-count">Parts: {components.length} | Connections: {connections.length}</p>
        <button className={`cb-power ${currentFlow ? "on" : ""}`} onClick={() => setCurrentFlow(!currentFlow)} disabled={!canFlow}>
          {currentFlow ? "Stop" : "Start Current"}
        </button>
        <div className="cb-status">
          {!hasBattery && <span>Need a battery</span>}
          {!hasSwitch && <span>Need a switch</span>}
          {connections.length === 0 && <span>Connect components with wires</span>}
          {canFlow && !currentFlow && <span>Ready to start!</span>}
          {currentFlow && <span>Current is flowing!</span>}
        </div>
      </div>

      {currentFlow && (
        <div className="cb-tips">
          <p>Circuit is complete! Current: I = V/R. With a 9V battery and wires, current flows through all connected components.</p>
        </div>
      )}
    </div>
  );
}