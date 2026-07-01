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
  currentAppointment,
  completingAppointment,
  onCompleteClick,
}) => {
  const getStartHint = () => {
    if (startingConsultation || hasStarted) return null;
    if (!canStartConsultation) return 'Appointment time has not arrived yet';
    return null;
  };

  const getJoinHint = () => {
    if (isReadOnlyAppointment) return 'Appointment already completed';
    if (isCancelledAppointment) return 'Appointment was cancelled';
    if (!hasStarted) return 'Start consultation first';
    return null;
  };

  const getCompleteHint = () => {
    if (completingAppointment) return null;
    if (isReadOnlyAppointment) return 'Already completed';
    if (isCancelledAppointment) return 'Appointment was cancelled';
    if (!hasStarted) return 'Start consultation first';
    return null;
  };

  return (
    <div className="doctor-detail-actionbar doctor-detail-actionbar--workspace doctor-detail-actionbar--consultation">
      <div className="doctor-detail-actionbar__group doctor-detail-actionbar__group--primary">
        <div className="doctor-actionbar-btn-wrapper">
          <button
            className={`btn btn-outline-success ${!canStartConsultation ? 'disabled' : ''}`}
            disabled={!canStartConsultation || startingConsultation}
            onClick={handleStartConsultation}
            type="button"
          >
            <i className="bi bi-play-circle me-2" />
            {startingConsultation ? 'Starting...' : hasStarted ? 'Started' : 'Start Consultation'}
          </button>
          {getStartHint() && (
            <span className="doctor-actionbar-hint">{getStartHint()}</span>
          )}
        </div>

        <div className="doctor-actionbar-btn-wrapper">
          <button
            className={`btn btn-primary ${joinDisabled ? 'disabled' : ''}`}
            disabled={joinDisabled}
            onClick={handleChat}
            type="button"
          >
            <i className="bi bi-chat-dots me-2" />
            {actionLabel}
          </button>
          {getJoinHint() && (
            <span className="doctor-actionbar-hint">{getJoinHint()}</span>
          )}
        </div>

        <div className="doctor-actionbar-btn-wrapper">
          <button
            className={`btn btn-success ${(isReadOnlyAppointment || isCancelledAppointment || !hasStarted || completingAppointment) ? 'disabled' : ''}`}
            disabled={isReadOnlyAppointment || isCancelledAppointment || !hasStarted || completingAppointment}
            onClick={onCompleteClick}
            type="button"
          >
            <i className="bi bi-check-circle me-2" />
            {completingAppointment ? 'Completing...' : 'Complete Consultation'}
          </button>
          {getCompleteHint() && (
            <span className="doctor-actionbar-hint">{getCompleteHint()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
