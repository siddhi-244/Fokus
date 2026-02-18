export default function ProgressBar({ value, max = 100, label, showPercentage = true }) {
  const percentage = Math.min(100, Math.round((value / max) * 100));
  
  return (
    <div className="progress-container">
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && <span className="progress-text">{percentage}%</span>}
    </div>
  );
}