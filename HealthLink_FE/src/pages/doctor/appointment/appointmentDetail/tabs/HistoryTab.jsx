import React from 'react';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';

const MedicalHistoryTab = ({
  loadingHistory,
  completedHistory,
  selectedHistoryAppointment,
  loadingHistorySnapshot,
  selectedHistoryConsultation,
  onViewAppointmentDetail,
  renderEmptyState,
  formatCompactDate,
  formatTime,
  formatDate,
  getStatusClassName,
  getTypeIcon,
}) => {
  if (loadingHistory) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (completedHistory.length === 0) {
    return renderEmptyState(
      'No completed appointments found',
      'Completed visits for this patient will appear here once they become available.',
    );
  }

  return (
    <div className="doctor-history-workspace">
      <div className="doctor-history-workspace__grid">
        <aside className="doctor-history-list-panel">
          <div className="doctor-history-list-panel__header">
            <p className="doctor-detail-eyebrow mb-1">Past Encounters</p>
            <h3>Completed visits</h3>
          </div>
          <div className="doctor-history-encounter-list">
            {completedHistory.map((historyItem) => {
              const historyId = historyItem.appointmentID || historyItem.appointmentId;
              const isActive =
                selectedHistoryAppointment?.appointmentID === historyId ||
                selectedHistoryAppointment?.appointmentId === historyId;

              return (
                <button
                  className={`doctor-history-encounter ${isActive ? 'doctor-history-encounter--active' : ''}`}
                  key={historyId}
                  onClick={() => onViewAppointmentDetail(historyId)}
                  type="button"
                >
                  <span className="doctor-history-encounter__date">
                    {formatCompactDate(historyItem.appointmentTime)}
                  </span>
                  <span className="doctor-history-encounter__title">
                    {historyItem.symptoms || historyItem.reason || 'Completed appointment'}
                  </span>
                  <span className="doctor-history-encounter__meta">
                    <i className="bi bi-clock"></i>
                    {formatTime(historyItem.appointmentTime)}
                  </span>
                  {historyItem.diagnosis ? (
                    <span className="doctor-history-encounter__diagnosis">
                      {historyItem.diagnosis}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="doctor-history-snapshot">
          {loadingHistorySnapshot ? (
            <div className="doctor-detail-followup__slot-skeleton">
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Loading snapshot...
            </div>
          ) : selectedHistoryAppointment ? (
            <>
              <div className="doctor-history-snapshot__header">
                <div>
                  <p className="doctor-detail-eyebrow mb-1">Medical Record</p>
                  <h3>{formatDate(selectedHistoryAppointment.appointmentTime)}</h3>
                </div>
                <span className={getStatusClassName(selectedHistoryAppointment.status)}>
                  {selectedHistoryAppointment.status || 'Completed'}
                </span>
              </div>

              <div className="doctor-history-snapshot__meta">
                <span>
                  <i className="bi bi-person-badge"></i>
                  {selectedHistoryAppointment.doctorName || 'Doctor N/A'}
                </span>
                <span>
                  <i className={`bi ${getTypeIcon(selectedHistoryAppointment.consultationType)}`}></i>
                  {selectedHistoryAppointment.consultationType || 'Consultation'}
                </span>
                <span>
                  <i className="bi bi-clock"></i>
                  {formatTime(selectedHistoryAppointment.appointmentTime)}
                </span>
              </div>

              <div className="doctor-history-snapshot__sections">
                <section>
                  <p className="doctor-detail-note-card__label">Diagnosis</p>
                  <p className="doctor-history-snapshot__text">
                    {selectedHistoryConsultation.diagnosis || selectedHistoryAppointment.diagnosis || 'No diagnosis recorded.'}
                  </p>
                </section>
                <section>
                  <p className="doctor-detail-note-card__label">Clinical Notes</p>
                  <p className="doctor-history-snapshot__text">
                    {selectedHistoryConsultation.doctorNotes || selectedHistoryAppointment.doctorNotes || 'No clinical notes recorded.'}
                  </p>
                </section>
                <section>
                  <p className="doctor-detail-note-card__label">Treatment Plan</p>
                  <p className="doctor-history-snapshot__text">
                    {selectedHistoryConsultation.treatmentPlan || selectedHistoryAppointment.treatmentPlan || 'No treatment plan recorded.'}
                  </p>
                </section>
              </div>

              {selectedHistoryAppointment?.prescription?.medications?.length ? (
                <div className="doctor-history-medications">
                  <p className="doctor-detail-note-card__label">Prescribed Medications</p>
                  <div className="doctor-history-medications__list">
                    {selectedHistoryAppointment.prescription.medications.map((medication, index) => (
                      <div className="doctor-history-medications__item" key={`${medication.medicationName || 'medication'}-${index}`}>
                        <strong>{medication.medicationName || medication.brandName || `Medication ${index + 1}`}</strong>
                        <span>{medication.dosage || medication.strength || 'Dose N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            renderEmptyState(
              'Select a completed visit',
              'Choose an encounter from the left to review diagnosis, notes, treatment plan, and prescriptions.',
            )
          )}
        </section>
      </div>
    </div>
  );
};

export default MedicalHistoryTab;
