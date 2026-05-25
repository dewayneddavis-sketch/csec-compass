import "./ProgressBar.css";

export default function ProgressBar({ completed, total, label }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <span className="progress-bar-label">{label || "Progress"}</span>
        <span className="progress-bar-count">{completed}/{total} ({percentage}%)</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
