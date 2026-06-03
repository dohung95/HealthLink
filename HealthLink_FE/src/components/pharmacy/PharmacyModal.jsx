export function Modal({ title, children, onClose }) {
  return (
    <div className="pharmacy-modal">
      <button className="pharmacy-modal-backdrop" onClick={onClose} type="button" />
      <div className="pharmacy-modal-card">
        <div className="pharmacy-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} type="button"><span className="material-symbols-outlined">close</span></button>
        </div>
        {children}
      </div>
    </div>
  );
}
