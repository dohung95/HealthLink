import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { doctorService } from '../api/doctorApi';

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

const Field = ({ label, value }) => (
  <div className="doctor-patient-detail-field">
    <span>{label}</span>
    <strong>{value || 'N/A'}</strong>
  </div>
);

export default function DoctorPatientDetailView({ patient, onBack, onOpenAppointmentById }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patient?.patientId) return;
    let mounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getMyDoctorPatientHistory(patient.patientId);
        if (mounted) setHistory(data);
      } catch (err) {
        console.error('Error loading patient history:', err);
        if (mounted) setError('Failed to load patient history');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [patient?.patientId]);

  const completedAppointments = useMemo(
    () => history?.appointments?.filter((appointment) => String(appointment.status || '').toLowerCase() === 'completed') || [],
    [history?.appointments],
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger m-4">{error}</div>;
  }

  const data = history || patient;

  return (
    <div className="doctor-patient-detail">
      <div className="doctor-detail-back mb-3">
        <button className="btn btn-link p-0 d-inline-flex align-items-center gap-2" onClick={onBack} type="button">
          <i className="bi bi-arrow-left"></i>
          Back to patients
        </button>
      </div>

      <section className="doctor-detail-card">
        <div className="doctor-patient-detail-hero">
          <div className="doctor-patient-avatar doctor-patient-avatar--large">
            {data.avatarUrl ? <img alt="" src={data.avatarUrl} /> : <span>{(data.fullName || 'P').charAt(0).toUpperCase()}</span>}
          </div>
          <div>
            <p className="doctor-detail-eyebrow mb-1">Patient</p>
            <h3 className="doctor-patient-detail-name">{data.fullName}</h3>
            <p className="text-muted mb-0">{data.email || data.phoneNumber || 'No contact listed'}</p>
          </div>
        </div>

        <div className="doctor-patient-detail-grid mt-4">
          <Field label="Phone" value={data.phoneNumber} />
          <Field label="Gender" value={data.gender} />
          <Field label="Blood Type" value={data.bloodType} />
          <Field label="Date of Birth" value={data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : null} />
          <Field label="Completed Visits" value={completedAppointments.length} />
          <Field label="Prescriptions" value={history?.prescriptions?.length || 0} />
        </div>
      </section>

      <section className="doctor-detail-card">
        <h3 className="doctor-detail-section-title">Medical Summary</h3>
        <div className="doctor-patient-detail-grid mt-4">
          <Field label="History" value={data.medicalHistorySummary} />
          <Field label="Allergies" value={data.allergies} />
          <Field label="Chronic Conditions" value={data.chronicConditions} />
          <Field label="Current Medications" value={data.currentMedications} />
        </div>
      </section>

      <section className="doctor-detail-card">
        <h3 className="doctor-detail-section-title">Appointment History</h3>
        <div className="doctor-management-list mt-4">
          {history?.appointments?.length ? history.appointments.map((appointment) => (
            <article className="doctor-management-list-item" key={appointment.appointmentId}>
              <div>
                <strong>{formatDateTime(appointment.appointmentTime)}</strong>
                <p>{appointment.consultationType || 'Consultation'} - {appointment.status}</p>
                {appointment.diagnosis ? <p>Diagnosis: {appointment.diagnosis}</p> : null}
              </div>
              <Button
                onClick={() => onOpenAppointmentById?.(appointment.appointmentId)}
                size="sm"
                variant="outline-primary"
              >
                Open
              </Button>
            </article>
          )) : (
            <p className="text-muted mb-0">No appointments found.</p>
          )}
        </div>
      </section>

      <section className="doctor-detail-card">
        <h3 className="doctor-detail-section-title">Prescriptions</h3>
        <div className="doctor-management-list mt-4">
          {history?.prescriptions?.length ? history.prescriptions.map((prescription) => (
            <article className="doctor-management-list-item" key={prescription.prescriptionHeaderId}>
              <div>
                <strong>{formatDateTime(prescription.issueDate)}</strong>
                <p>{prescription.diagnosis || 'No diagnosis'} - {prescription.status || 'Issued'}</p>
                <p>{prescription.medications?.length || prescription.items?.length || 0} medication(s)</p>
              </div>
              {prescription.appointmentId ? (
                <Button
                  onClick={() => onOpenAppointmentById?.(prescription.appointmentId)}
                  size="sm"
                  variant="outline-primary"
                >
                  Appointment
                </Button>
              ) : null}
            </article>
          )) : (
            <p className="text-muted mb-0">No prescriptions found.</p>
          )}
        </div>
      </section>

      <section className="doctor-detail-card">
        <h3 className="doctor-detail-section-title">Documents</h3>
        <div className="doctor-management-list mt-4">
          {history?.documentsByCategory?.length ? history.documentsByCategory.map((category) => (
            <article className="doctor-management-list-item" key={category.category}>
              <div>
                <strong>{category.category}</strong>
                <p>{category.documentCount} document(s)</p>
              </div>
            </article>
          )) : (
            <p className="text-muted mb-0">No documents found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
