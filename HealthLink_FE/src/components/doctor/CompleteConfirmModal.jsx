import React, { useEffect, useRef } from 'react';

const CompleteConfirmModal = ({
  show,
  completingAppointment,
  copyPrescription,
  onCopyPrescriptionChange,
  hasPendingFollowUp,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  useEffect(() => {
    if (show && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [show]);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes dialogOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialogSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dialogStaggerIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dialogSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1060,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'dialogOverlayIn 0.2s ease',
        }}
      >
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />

        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Complete consultation"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '420px',
            margin: '1rem',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            animation: 'dialogSlideIn 0.35s var(--doctor-ease)',
            outline: 'none',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '2rem',
              paddingBottom: '0.25rem',
              animation: 'dialogStaggerIn 0.3s var(--doctor-ease) 0.1s both',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'breathe 3s ease-in-out infinite',
              }}
            >
              <i
                className="bi bi-check-circle-fill"
                style={{ fontSize: '1.75rem', color: 'var(--success)' }}
              />
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '0 1.5rem',
              animation: 'dialogStaggerIn 0.3s var(--doctor-ease) 0.15s both',
            }}
          >
            <h5
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Complete consultation
            </h5>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                margin: '0.375rem 0 0',
                lineHeight: 1.5,
              }}
            >
              Mark this appointment as completed? The patient will be notified.
            </p>
          </div>

          {hasPendingFollowUp && (
            <div
              style={{
                padding: '1rem 1.5rem 0',
                animation: 'dialogStaggerIn 0.3s var(--doctor-ease) 0.2s both',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-light)',
                  cursor: completingAppointment ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s var(--doctor-ease)',
                  opacity: completingAppointment ? 0.6 : 1,
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={copyPrescription}
                  onChange={(e) => onCopyPrescriptionChange(e.target.checked)}
                  disabled={completingAppointment}
                  style={{
                    marginTop: '0.125rem',
                    width: '1rem',
                    height: '1rem',
                    accentColor: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'block',
                      marginBottom: '0.125rem',
                    }}
                  >
                    <i className="bi bi-copy me-1" />
                    Copy prescription
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'block',
                      lineHeight: 1.4,
                    }}
                  >
                    Copy latest prescription to the follow-up appointment
                  </span>
                </div>
              </label>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '1.5rem',
              animation: 'dialogStaggerIn 0.3s var(--doctor-ease) 0.25s both',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={completingAppointment}
              style={{
                flex: 1,
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: completingAppointment ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s var(--doctor-ease)',
                opacity: completingAppointment ? 0.5 : 1,
              }}
              onMouseDown={(e) => {
                if (!completingAppointment) e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={completingAppointment}
              style={{
                flex: 1,
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--success)',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: completingAppointment ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s var(--doctor-ease)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: completingAppointment ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
              onMouseDown={(e) => {
                if (!completingAppointment) e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >
              {completingAppointment ? (
                <>
                  <span
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'dialogSpin 0.6s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Completing...
                </>
              ) : (
                <>
                  <i className="bi bi-check2" style={{ fontSize: '1rem' }} />
                  Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CompleteConfirmModal;
