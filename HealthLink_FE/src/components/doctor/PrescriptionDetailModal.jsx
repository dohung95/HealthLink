import React, { useEffect, useRef, useMemo } from 'react';
import AdminFormSection from '@pages/doctor/appointment/appointmentDetail/tabs/PrescriptionTab/AdminFormSection';

const FieldSection = ({ title, content }) => (
  <div className="pd-modal__field">
    <span className="pd-modal__field-label">{title}</span>
    <div
      className="pd-modal__field-content"
      dangerouslySetInnerHTML={{ __html: content || '<em>Not provided</em>' }}
    />
  </div>
);

export default function PrescriptionDetailModal({
  show,
  prescription,
  appointments,
  patientName,
  onClose,
}) {
  const dialogRef = useRef(null);

  const consultation = useMemo(() => {
    if (!prescription || !appointments?.length) return null;
    const match = appointments.find(
      (a) => String(a.appointmentID) === String(prescription.appointmentId)
    );
    return match || null;
  }, [prescription, appointments]);

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    if (dialogRef.current) dialogRef.current.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [show, onClose]);

  if (!show || !prescription) return null;

  return (
    <>
      <style>{`
        .pd-modal-overlay {
          position: fixed; inset: 0; z-index: 1060;
          display: flex; align-items: center; justify-content: center;
          animation: dialogOverlayIn 0.2s ease;
        }
        .pd-modal-backdrop {
          position: absolute; inset: 0;
          background: rgba(15,23,42,0.5); backdrop-filter: blur(4px);
        }
        .pd-modal {
          position: relative; width: 100%; max-width: 900px;
          margin: 1rem; background: var(--surface);
          border-radius: var(--radius-xl);
          box-shadow: 0 25px 50px -12px rgba(15,23,42,0.25);
          animation: dialogSlideIn 0.35s var(--doctor-ease);
          outline: none; overflow: hidden;
          max-height: 85vh; display: flex; flex-direction: column;
        }
        .pd-modal__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--doctor-border-light);
        }
        .pd-modal__header h3 {
          margin: 0; font-size: 1.125rem; font-weight: 700;
        }
        .pd-modal__close {
          background: none; border: none; cursor: pointer;
          font-size: 1.25rem; color: var(--text-muted);
          padding: 0.25rem; line-height: 1;
        }
        .pd-modal__body {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0; overflow-y: auto; flex: 1;
        }
        .pd-modal__left {
          padding: 1.5rem; border-right: 1px solid var(--doctor-border-light);
          display: flex; flex-direction: column; gap: 1.25rem;
        }
        .pd-modal__right {
          padding: 1.5rem; overflow-y: auto;
        }
        .pd-modal__field-label {
          display: block; font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--text-muted); margin-bottom: 0.5rem;
        }
        .pd-modal__field-content {
          font-size: 0.875rem; color: var(--text-primary);
          line-height: 1.6;
        }
        .pd-modal__field-content em {
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .pd-modal__body { grid-template-columns: 1fr; }
          .pd-modal__left { border-right: none; border-bottom: 1px solid var(--doctor-border-light); }
        }
        @keyframes dialogOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialogSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="pd-modal-overlay">
        <div className="pd-modal-backdrop" onClick={onClose} />
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Prescription details" onClick={(e) => e.stopPropagation()} className="pd-modal">
          <div className="pd-modal__header">
            <h3>Prescription Details</h3>
            <button type="button" className="pd-modal__close" onClick={onClose} aria-label="Close">&times;</button>
          </div>
          <div className="pd-modal__body">
            <div className="pd-modal__left">
              <FieldSection title="Diagnosis" content={consultation?.diagnosis || prescription?.diagnosis} />
              <FieldSection title="Doctor Notes" content={consultation?.doctorNotes} />
              <FieldSection title="Treatment Plan" content={consultation?.treatmentPlan} />
            </div>
            <div className="pd-modal__right">
              <AdminFormSection prescription={prescription} patientName={patientName} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
