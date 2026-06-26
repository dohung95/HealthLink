import { createPortal } from 'react-dom';

export function Modal({ title, icon, children, onClose }) {
  return createPortal(
    <div className="pharmacy-wallet-modal" onClick={onClose}>
      <div className="pharmacy-wallet-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="pharmacy-wallet-modal-header">
          <h2>{icon && <span className="material-symbols-outlined">{icon}</span>}{title}</h2>
          <button onClick={onClose} type="button"><span className="material-symbols-outlined">close</span></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
