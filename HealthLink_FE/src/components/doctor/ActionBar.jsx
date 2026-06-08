import React from 'react';

const ActionBar = ({
  handleChat,
  canStartConsultation,
  hasStarted,
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
  onLockedAction,
}) => {
  const handleStartClick = () => {
    if (!canStartConsultation) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    handleStartConsultation();
  };

  const handleJoinClick = () => {
    if (!hasStarted || isReadOnlyAppointment || isCancelledAppointment) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    if (currentAppointment?.consultationType === 'Chat') {
      handleChat();
      return;
    }
    handleVideoCall();
  };

  const handleCompleteClick = () => {
    if (!canEditClinical) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    onCompleteClick();
  };

  return (
    <div className="doctor-detail-actionbar doctor-detail-actionbar--workspace doctor-detail-actionbar--consultation">
      <div className="doctor-detail-actionbar__group">
        <button className="btn btn-outline-primary" onClick={handleChat} type="button">
          <i className="bi bi-chat-dots me-2"></i>
          Send Message
        </button>
      </div>
      <div className="doctor-detail-actionbar__group doctor-detail-actionbar__group--primary">
        <button
          className={`btn btn-outline-success ${!canStartConsultation ? 'disabled' : ''}`}
          aria-disabled={!canStartConsultation}
          onClick={handleStartClick}
          type="button"
        >
          <i className="bi bi-play-circle me-2"></i>
          {startingConsultation ? 'Starting...' : hasStarted ? 'Started' : 'Start Consultation'}
        </button>
        <button
          className={`btn btn-primary ${joinDisabled ? 'disabled' : ''}`}
          aria-disabled={joinDisabled}
          onClick={handleJoinClick}
          type="button"
        >
          <i className={`bi ${getTypeIcon(currentAppointment?.consultationType)} me-2`}></i>
          {actionLabel}
        </button>
        <button
          className={`btn btn-success ${!canEditClinical || completingAppointment ? 'disabled' : ''}`}
          aria-disabled={!canEditClinical || completingAppointment}
          onClick={handleCompleteClick}
          type="button"
        >
          <i className="bi bi-check-circle me-2"></i>
          {completingAppointment ? 'Completing...' : 'Complete Consultation'}
        </button>
      </div>
    </div>
  );
};

export default ActionBar;
