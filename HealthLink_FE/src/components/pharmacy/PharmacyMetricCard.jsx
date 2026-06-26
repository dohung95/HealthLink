export function MetricCard({ label, value, hint, icon, tone = 'primary', children }) {
  return (
    <div className={`pharmacy-metric-card tone-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
        {children}
      </div>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  );
}
