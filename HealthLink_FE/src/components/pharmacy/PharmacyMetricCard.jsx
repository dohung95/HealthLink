export function MetricCard({ label, value, hint, icon, tone = 'primary' }) {
  return (
    <div className={`pharmacy-metric-card tone-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  );
}
