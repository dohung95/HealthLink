import React, { useEffect, useRef } from 'react';

const ChecklistItem = ({ icon, label, done, optional }) => {
  const colors = done
    ? { bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.2)', icon: 'var(--success)', text: 'var(--success)', label: 'Ready' }
    : optional
      ? { bg: 'rgba(251, 191, 36, 0.06)', border: 'rgba(251, 191, 36, 0.2)', icon: 'var(--warning)', text: 'var(--warning)', label: 'Optional' }
      : { bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.2)', icon: 'var(--error)', text: 'var(--error)', label: 'Not ready' };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      padding: '0.5rem 0.75rem',
      borderRadius: 'var(--radius-sm)',
      background: colors.bg,
      border: `1px solid ${colors.border}`,
    }}>
      <i className={`bi ${icon}`} style={{
        fontSize: '1rem',
        color: colors.icon,
      }} />
      <span style={{
        flex: 1, fontSize: '0.8125rem',
        fontWeight: 500, color: 'var(--text-primary)',
      }}>{label}</span>
      <span style={{
        fontSize: '0.75rem', fontWeight: 600,
        color: colors.text,
      }}>
        {done ? 'Ready' : colors.label}
      </span>
    </div>
  );
};

const CompleteConfirmModal = ({
  show,
  completingAppointment,
  copyPrescription,
  onCopyPrescriptionChange,
  onClose,
  onConfirm,
  notesSaved,
  prescriptionReady,
  prescriptionIncompleteItems = [],
  followUpConfigured,
  followUpInfo,
  followUpPaymentStatus,
}) => {
  const dialogRef = useRef(null);
  const canComplete = notesSaved && prescriptionReady
    && (!followUpPaymentStatus || followUpPaymentStatus === 'PAID' || followUpPaymentStatus === 'NONE');

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
                background: canComplete
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'breathe 3s ease-in-out infinite',
              }}
            >
              <i
                className={canComplete ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'}
                style={{
                  fontSize: '1.75rem',
                  color: canComplete ? 'var(--success)' : 'var(--error)',
                }}
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
              {canComplete ? 'Complete consultation' : 'Cannot complete yet'}
            </h5>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                margin: '0.375rem 0 0',
                lineHeight: 1.5,
              }}
            >
              {canComplete
                ? 'Mark this appointment as completed? The patient will be notified.'
                : 'Please complete all required fields below before confirming.'}
            </p>
          </div>

          {/* Readiness checklist */}
          <div style={{
            padding: '1rem 1.5rem 0',
            animation: 'dialogStaggerIn 0.3s var(--doctor-ease) 0.18s both',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <ChecklistItem icon="bi-journal-text" label="Consultation Notes" done={notesSaved} />
              <ChecklistItem icon="bi-capsule-pill" label="Prescription" done={prescriptionReady} />
              {!prescriptionReady && prescriptionIncompleteItems.length > 0 && (
                <div style={{
                  marginTop: '0.125rem', marginLeft: '1.625rem',
                  display: 'flex', flexDirection: 'column', gap: '0.25rem',
                }}>
                  <div style={{
                    fontSize: '0.6875rem', fontWeight: 600,
                    color: 'var(--error)', textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    Incomplete items ({prescriptionIncompleteItems.length}) — fill dosage info
                  </div>
                  {prescriptionIncompleteItems.map((item) => (
                    <div key={item.index} style={{
                      display: 'flex', alignItems: 'center',
                      gap: '0.5rem', padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.04)',
                      fontSize: '0.75rem', color: 'var(--text-secondary)',
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.125rem', height: '1.125rem', borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.1)',
                        fontSize: '0.625rem', fontWeight: 700, color: 'var(--error)',
                        flexShrink: 0,
                      }}>
                        {item.index}
                      </span>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {item.name}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Missing info
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <ChecklistItem icon="bi-calendar-check" label="Follow-up" done={followUpConfigured} optional />
              {followUpInfo && (
                <div style={{
                  marginTop: '0.125rem', marginLeft: '1.625rem',
                  display: 'flex', flexDirection: 'column', gap: '0.25rem',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.375rem 0.5rem', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.04)',
                    fontSize: '0.75rem', color: 'var(--text-secondary)',
                  }}>
                    <i className="bi bi-calendar-check" style={{
                      fontSize: '0.8125rem', color: 'var(--success)',
                    }} />
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {followUpInfo.scheduleLabel}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                  }}>
                    <i className="bi bi-diagram-3" style={{ fontSize: '0.75rem' }} />
                    <span>{followUpInfo.consultationType}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {followUpPaymentStatus === 'PENDING_PAYMENT' && (
            <div style={{
              padding: '0.75rem 1rem', margin: '0.75rem 1.5rem 0',
              borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              fontSize: '0.8rem', color: 'var(--text-secondary)',
            }}>
              <i className="bi bi-exclamation-triangle me-1" style={{ color: 'var(--warning)' }} />
              Follow-up payment pending. Waiting for patient to pay.
            </div>
          )}
          {followUpConfigured && followUpInfo && (
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
              disabled={completingAppointment || !canComplete}
              style={{
                flex: 1,
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: completingAppointment || !canComplete
                  ? 'var(--border)'
                  : 'var(--success)',
                color: completingAppointment || !canComplete
                  ? 'var(--text-muted)'
                  : '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: completingAppointment || !canComplete ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s var(--doctor-ease)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: completingAppointment || !canComplete ? 0.5 : 1,
                boxShadow: completingAppointment || !canComplete
                  ? 'none'
                  : '0 4px 12px rgba(16, 185, 129, 0.3)',
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
