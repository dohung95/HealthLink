import React from 'react';
import '../../../../Css/ConsultationNotesTab.css';

const ConsultationNotesTab = ({
  loadingAppointment,
  visitReason,
  canEditClinical,
  isReadOnlyAppointment,
  savingNotes,
  notesDraft,
  onNotesChange,
  onSaveNotes,
}) => {
  if (loadingAppointment) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-notes-workspace doctor-notes-workspace--consultation">
      <div className="doctor-notes-chief-card">
        <div className="doctor-notes-chief-card__icon">
          <i className="bi bi-chat-square-text"></i>
        </div>
        <div>
          <p className="doctor-detail-eyebrow mb-1">Chief Complaint</p>
          <p className={`doctor-notes-chief-card__text ${visitReason ? '' : 'doctor-notes-chief-card__text--empty'}`}>
            {visitReason || 'The patient has not shared symptoms or a reason for this appointment yet.'}
          </p>
        </div>
      </div>

      {!canEditClinical && !isReadOnlyAppointment ? (
        <div className="doctor-detail-note-card doctor-notes-lock">
          <p className="doctor-detail-note-card__label">Locked</p>
          <p className="doctor-detail-note-card__value">
            Start the consultation when the appointment time arrives to record diagnosis, notes, and treatment plan.
          </p>
        </div>
      ) : null}

      <div className="doctor-notes-grid">
        <label className="doctor-notes-field">
          <span>Diagnosis</span>
          <textarea
            className="form-control doctor-prescription-input doctor-prescription-input--textarea"
            disabled={!canEditClinical || savingNotes}
            onChange={(event) => onNotesChange('diagnosis', event.target.value)}
            placeholder="Enter the primary diagnosis..."
            rows="2"
            value={notesDraft.diagnosis}
          />
        </label>

        <label className="doctor-notes-field">
          <span>Doctor Notes</span>
          <textarea
            className="form-control doctor-prescription-input doctor-prescription-input--textarea"
            disabled={!canEditClinical || savingNotes}
            onChange={(event) => onNotesChange('doctorNotes', event.target.value)}
            placeholder="Record observations, assessment, and consultation notes..."
            rows="3"
            value={notesDraft.doctorNotes}
          />
        </label>

        <label className="doctor-notes-field doctor-notes-field--full">
          <span>Treatment Plan</span>
          <textarea
            className="form-control doctor-prescription-input doctor-prescription-input--textarea"
            disabled={!canEditClinical || savingNotes}
            onChange={(event) => onNotesChange('treatmentPlan', event.target.value)}
            placeholder="Outline treatment plan, lifestyle guidance, and next steps..."
            rows="3"
            value={notesDraft.treatmentPlan}
          />
        </label>
      </div>

      <div className="doctor-notes-actions">
        <button
          className="btn btn-primary"
          disabled={!canEditClinical || savingNotes}
          onClick={onSaveNotes}
          type="button"
        >
          <i className="bi bi-save me-2"></i>
          {savingNotes ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
    </div>
  );
};

export default ConsultationNotesTab;
