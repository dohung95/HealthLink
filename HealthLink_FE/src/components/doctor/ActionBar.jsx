import React from 'react';

const ActionBar = ({
  handleChat,
  canStartConsultation,
  hasStarted,
  hasAppointmentTimeArrived,
  isCancelledAppointment,
  isReadOnlyAppointment,
  startingConsultation,
  handleStartConsultation,
  handleVideoCall,
  joinDisabled,
  actionLabel,
  getTypeIcon,
  currentAppointment,
  canEditClinical,
  completingAppointment,
  onCompleteClick,
}) => (
  <div className="doctor-detail-actionbar doctor-detail-actionbar--workspace doctor-detail-actionbar--consultation">
    <div className="doctor-detail-actionbar__group">
      <button className="btn btn-outline-primary" onClick={handleChat} type="button">
        <i className="bi bi-chat-dots me-2"></i>
        Send Message
      </button>
    </div>
    <div className="doctor-detail-actionbar__group doctor-detail-actionbar__group--primary">
      <button
        className="btn btn-outline-success"
        disabled={!canStartConsultation}
        onClick={handleStartConsultation}
        title={
          hasStarted
            ? 'Consultation already started'
            : !hasAppointmentTimeArrived
              ? 'Consultation can only be started when the appointment time arrives'
              : isCancelledAppointment || isReadOnlyAppointment
                ? 'This appointment cannot be started'
                : 'Start consultation'
        }
        type="button"
      >
        <i className="bi bi-play-circle me-2"></i>
        {startingConsultation ? 'Starting...' : hasStarted ? 'Started' : 'Start Consultation'}
      </button>
      <button
        className="btn btn-primary"
        onClick={() => {
          if (currentAppointment?.consultationType === 'Chat') {
            handleChat();
            return;
          }
          handleVideoCall();
        }}
        type="button"
        title={!hasStarted ? 'Start the consultation first' : actionLabel}
        disabled={joinDisabled}
      >
        <i className={`bi ${getTypeIcon(currentAppointment?.consultationType)} me-2`}></i>
        {actionLabel}
      </button>
      <button
        className="btn btn-success"
        onClick={onCompleteClick}
        type="button"
        disabled={!canEditClinical || completingAppointment}
      >
        <i className="bi bi-check-circle me-2"></i>
        {completingAppointment ? 'Completing...' : 'Complete Consultation'}
      </button>
    </div>
  </div>
);

export default ActionBar;
