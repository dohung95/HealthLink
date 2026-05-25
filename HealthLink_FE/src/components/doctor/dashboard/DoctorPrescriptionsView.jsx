import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { prescriptionService } from '../../../api/prescriptionApi';

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function DoctorPrescriptionsView({ doctorId, onOpenAppointmentById }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId) return;
    let mounted = true;

    const loadPrescriptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await prescriptionService.getDoctorPrescriptions(doctorId);
        if (mounted) setPrescriptions(data);
      } catch (err) {
        console.error('Error loading prescriptions:', err);
        if (mounted) {
          setError('Failed to load prescriptions');
          setPrescriptions([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPrescriptions();
    return () => {
      mounted = false;
    };
  }, [doctorId]);

  const statuses = useMemo(() => {
    const values = new Set(prescriptions.map((item) => item.status).filter(Boolean));
    return ['all', ...values];
  }, [prescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return prescriptions.filter((prescription) => {
      if (status !== 'all' && prescription.status !== status) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return [
        prescription.patientName,
        prescription.diagnosis,
        prescription.notes,
        ...(prescription.medications || []).map((item) => item.medicationName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [prescriptions, query, status]);

  return (
    <div className="doctor-management-view">
      <div className="doctor-management-toolbar">
        <div>
          <p className="doctor-detail-eyebrow mb-1">Prescription archive</p>
          <h3 className="doctor-management-title">Prescriptions</h3>
        </div>
        <div className="doctor-management-controls">
          <div className="doctor-management-search">
            <i className="bi bi-search"></i>
            <Form.Control
              aria-label="Search prescriptions"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, diagnosis, medicine..."
              value={query}
            />
          </div>
          <Form.Select
            aria-label="Filter prescription status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All statuses' : value}
              </option>
            ))}
          </Form.Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger m-4">{error}</div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="doctor-detail-empty">
          <div className="doctor-detail-empty__icon">
            <i className="bi bi-capsule"></i>
          </div>
          <h3 className="doctor-detail-empty__title">No prescriptions found</h3>
          <p className="doctor-detail-empty__description">Issued prescriptions will appear here.</p>
        </div>
      ) : (
        <div className="doctor-prescription-dashboard">
          <div className="doctor-management-list">
            {filteredPrescriptions.map((prescription) => (
              <article
                className={`doctor-management-list-item ${selected?.prescriptionHeaderId === prescription.prescriptionHeaderId ? 'doctor-management-list-item--active' : ''}`}
                key={prescription.prescriptionHeaderId}
              >
                <div>
                  <strong>{prescription.patientName || 'Unknown Patient'}</strong>
                  <p>{formatDateTime(prescription.issueDate)}</p>
                  <p>{prescription.diagnosis || 'No diagnosis'} - {prescription.status || 'Issued'}</p>
                </div>
                <Button onClick={() => setSelected(prescription)} size="sm" variant="outline-primary">
                  View
                </Button>
              </article>
            ))}
          </div>

          <aside className="doctor-prescription-detail-panel">
            {selected ? (
              <>
                <div className="doctor-prescription-detail-panel__header">
                  <div>
                    <p className="doctor-detail-eyebrow mb-1">Prescription</p>
                    <h4>{selected.patientName || 'Unknown Patient'}</h4>
                  </div>
                  <span className="doctor-detail-status doctor-detail-status--completed">
                    {selected.status || 'Issued'}
                  </span>
                </div>

                <div className="doctor-patient-detail-grid">
                  <div className="doctor-patient-detail-field">
                    <span>Issued</span>
                    <strong>{formatDateTime(selected.issueDate)}</strong>
                  </div>
                  <div className="doctor-patient-detail-field">
                    <span>Diagnosis</span>
                    <strong>{selected.diagnosis || 'N/A'}</strong>
                  </div>
                </div>

                <div className="doctor-management-list mt-4">
                  {(selected.medications || selected.items || []).map((item, index) => (
                    <article className="doctor-management-list-item" key={`${item.medicationName || 'medicine'}-${index}`}>
                      <div>
                        <strong>{item.medicationName || `Medication ${index + 1}`}</strong>
                        <p>{[item.dosage, item.frequency, item.route].filter(Boolean).join(' - ') || 'No dosage details'}</p>
                        {item.notes ? <p>{item.notes}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>

                {selected.appointmentId ? (
                  <Button
                    className="mt-4"
                    onClick={() => onOpenAppointmentById?.(selected.appointmentId)}
                    type="button"
                    variant="primary"
                  >
                    Open Appointment
                  </Button>
                ) : null}
              </>
            ) : (
              <div className="doctor-detail-empty">
                <div className="doctor-detail-empty__icon">
                  <i className="bi bi-file-earmark-medical"></i>
                </div>
                <h3 className="doctor-detail-empty__title">Select a prescription</h3>
                <p className="doctor-detail-empty__description">Choose an issued prescription to view details.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
