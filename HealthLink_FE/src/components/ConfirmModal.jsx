import React, { useState } from 'react';

const VARIANTS = {
  primary: { iconBg: 'var(--doctor-primary-soft, #ecfdf5)', iconColor: 'var(--doctor-primary, #0f766e)', btnBg: 'var(--doctor-primary, #0f766e)' },
  danger: { iconBg: 'var(--doctor-danger-soft, #fef2f2)', iconColor: 'var(--doctor-danger, #dc2626)', btnBg: 'var(--doctor-danger, #dc2626)' },
  warning: { iconBg: '#fffbeb', iconColor: '#d97706', btnBg: '#d97706' },
  success: { iconBg: '#ecfdf5', iconColor: '#059669', btnBg: '#059669' },
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  iconClass = 'bi-shield-lock-fill',
  variant = 'primary',
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const colors = VARIANTS[variant] || VARIANTS.primary;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .cm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          animation: cmFadeIn 0.2s ease-out;
          backdrop-filter: blur(2px);
        }
        .cm-modal {
          background: var(--doctor-surface, #fff);
          border-radius: 1rem;
          max-width: 420px; width: 92%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: cmSlideUp 0.25s ease-out;
          overflow: hidden;
        }
        .cm-body { padding: 2rem 2rem 1.25rem; text-align: center; }
        .cm-icon-ring {
          width: 56px; height: 56px;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.375rem;
        }
        .cm-title { font-size: 1.125rem; font-weight: 700; color: var(--doctor-text, #0f172a); margin: 0 0 0.375rem; }
        .cm-message { font-size: 0.875rem; color: var(--doctor-text-secondary, #475569); margin: 0; line-height: 1.5; }
        .cm-footer { display: flex; gap: 0.75rem; padding: 0.5rem 2rem 2rem; }
        .cm-btn {
          flex: 1; padding: 0.625rem 1rem; border: none; border-radius: 0.5rem;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem;
        }
        .cm-btn-cancel { background: var(--doctor-surface-hover, #f1f5f9); color: var(--doctor-text, #0f172a); }
        .cm-btn-cancel:hover { background: #e2e8f0; }
        .cm-btn-confirm { color: #fff; }
        .cm-btn-confirm:hover { opacity: 0.9; }
        .cm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes cmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="cm-overlay" onClick={onClose}>
        <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cm-body">
            <div className="cm-icon-ring" style={{ backgroundColor: colors.iconBg, color: colors.iconColor }}>
              <i className={`bi ${iconClass}`}></i>
            </div>
            <h4 className="cm-title">{title}</h4>
            <p className="cm-message">{message}</p>
          </div>
          <div className="cm-footer">
            <button type="button" className="cm-btn cm-btn-cancel" onClick={onClose} disabled={loading}>
              {cancelText}
            </button>
            <button type="button" className="cm-btn cm-btn-confirm" style={{ backgroundColor: colors.btnBg }} onClick={handleConfirm} disabled={loading}>
              {loading && <span className="spinner-border spinner-border-sm" role="status" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmModal;
