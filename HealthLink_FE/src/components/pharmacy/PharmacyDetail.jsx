export function Detail({ label, value, block = false }) {
  return (
    <div className={`pharmacy-detail ${block ? 'is-block' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
