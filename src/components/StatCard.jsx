export default function StatCard({ value, label, variant = 'default' }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${variant}`}>{value}</span>
    </div>
  );
}