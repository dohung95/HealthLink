export function InfoLine({ icon, label, value }) {
  return (
    <div className="pharmacy-info-line">
      <span className="material-symbols-outlined">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
