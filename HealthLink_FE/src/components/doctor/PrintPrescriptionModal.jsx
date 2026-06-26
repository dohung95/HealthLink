import React from 'react';
import { Modal } from 'react-bootstrap';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function PrintPrescriptionModal({ show, onHide, prescription, patientProfile }) {
  const handlePrint = () => {
    window.print();
  };

  if (!prescription) return null;

  const rxId = prescription.prescriptionHeaderId
    ? `RX-${String(prescription.prescriptionHeaderId).padStart(4, '0')}`
    : '';

  const medications = prescription.medications || prescription.items || [];

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-prescription-area, .print-prescription-area * { visibility: visible; }
          .print-prescription-area { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; background: #fff; }
          .print-prescription-area .no-print { display: none !important; }
        }
      `}</style>
      <Modal
        show={show}
        onHide={onHide}
        size="xl"
        centered
        backdrop
        keyboard
        className="print-prescription-modal"
      >
        <Modal.Header closeButton className="border-0 pb-0 no-print">
          <Modal.Title className="d-flex align-items-center gap-2 fw-bold" style={{ fontSize: '1.125rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.375rem' }}>prescriptions</span>
            Print Prescription
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <div className="print-prescription-area" style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}>
            {/* Header: Hospital / Doctor Info */}
            <div className="d-flex justify-content-between align-items-start pb-3 mb-4" style={{ borderBottom: '2px solid #0f172a' }}>
              <div>
                <h4 className="fw-bold mb-1" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#0f172a' }}>HealthLink</h4>
                <p className="mb-0" style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                  {prescription.doctorName || 'Doctor'}{prescription.specialty ? `, ${prescription.specialty}` : ''}
                </p>
              </div>
              <div className="text-end">
                <p className="mb-0 fw-semibold" style={{ fontSize: '0.875rem', color: '#0f172a' }}>{rxId}</p>
                <p className="mb-0" style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(prescription.issueDate)}</p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="mb-4 pb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h6 className="fw-semibold mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Patient Information</h6>
              <div className="row g-2" style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                <div className="col-6">
                  <span style={{ color: '#64748b' }}>Name:</span> {patientProfile?.fullName || prescription.patientName || 'Unknown Patient'}
                </div>
                <div className="col-6">
                  <span style={{ color: '#64748b' }}>Patient ID:</span> {prescription.patientId || prescription.patientID || '—'}
                </div>
                {patientProfile?.email && (
                  <div className="col-6">
                    <span style={{ color: '#64748b' }}>Email:</span> {patientProfile.email}
                  </div>
                )}
                {patientProfile?.phoneNumber && (
                  <div className="col-6">
                    <span style={{ color: '#64748b' }}>Phone:</span> {patientProfile.phoneNumber}
                  </div>
                )}
                {patientProfile?.dateOfBirth && (
                  <div className="col-6">
                    <span style={{ color: '#64748b' }}>DOB:</span> {formatDate(patientProfile.dateOfBirth)}
                  </div>
                )}
                {patientProfile?.gender && (
                  <div className="col-6">
                    <span style={{ color: '#64748b' }}>Gender:</span> {patientProfile.gender}
                  </div>
                )}
              </div>
            </div>

            {/* Prescription Details */}
            {prescription.diagnosis && (
              <div className="mb-4 pb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h6 className="fw-semibold mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Diagnosis</h6>
                <p className="mb-0" style={{ fontSize: '0.875rem', color: '#0f172a' }}>{prescription.diagnosis}</p>
              </div>
            )}

            {/* Medications */}
            <div className="mb-4 pb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h6 className="fw-semibold mb-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                Prescribed Medications ({medications.length})
              </h6>
              {medications.length === 0 ? (
                <p className="mb-0" style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>No medications listed.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Medication</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dosage</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Route</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Frequency</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((med, i) => (
                      <tr key={`${med.medicationName || i}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>{med.medicationName || `Medication ${i + 1}`}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#475569' }}>{med.dosage || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#475569' }}>{med.route || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#475569' }}>{med.frequency || med.timing || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: '#475569' }}>{med.duration || med.totalSupplyDays ? `${med.duration || med.totalSupplyDays} days` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {medications.some((m) => m.notes) && (
                <div className="mt-3">
                  {medications.map((med, i) => med.notes && (
                    <p key={`note-${i}`} className="mb-1" style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      <span className="fw-semibold">{med.medicationName || `Med ${i + 1}`}:</span> {med.notes}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Doctor Notes */}
            {prescription.notes && (
              <div className="mb-4 pb-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h6 className="fw-semibold mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Doctor Notes</h6>
                <p className="mb-0" style={{ fontSize: '0.875rem', color: '#0f172a', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{prescription.notes}</p>
              </div>
            )}

            {/* Signature */}
            <div className="d-flex justify-content-between align-items-end pt-3">
              <div>
                <p className="mb-0 fw-semibold" style={{ fontSize: '0.875rem', color: '#0f172a' }}>{prescription.doctorName || 'Doctor'}</p>
                <p className="mb-0" style={{ fontSize: '0.8125rem', color: '#64748b' }}>Prescribing Doctor</p>
              </div>
              <div className="text-end">
                <div style={{ width: '160px', borderTop: '1px solid #0f172a', paddingTop: '0.375rem', fontSize: '0.75rem', color: '#64748b' }}>
                  Signature / Stamp
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 no-print d-flex gap-2">
          <button
            className="btn btn-outline-secondary rounded-pill px-4 d-inline-flex align-items-center gap-2 no-print"
            onClick={onHide}
            type="button"
            style={{ fontSize: '0.8125rem', fontWeight: 600 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
            Close
          </button>
          <button
            className="btn rounded-pill px-4 d-inline-flex align-items-center gap-2 no-print"
            onClick={handlePrint}
            type="button"
            style={{ background: '#0052cc', color: '#fff', fontWeight: 600, fontSize: '0.8125rem', border: 'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>print</span>
            Print / Save PDF
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
