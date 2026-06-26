import React from 'react';

/**
 * ActionBar – Thanh hành động phía dưới màn hình chi tiết cuộc hẹn (doctor side).
 *
 * Hiển thị các nút: Send Message, Start Consultation, Join Video/Chat, Complete.
 * Các nút sẽ bị khóa (disabled) tùy theo trạng thái cuộc hẹn:
 *  - Chưa đến giờ → Start bị khóa
 *  - Chưa start → Join bị khóa
 *  - Đã COMPLETED → tất cả các nút hành động bị khóa (chỉ xem)
 */
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
    handleChat();
  };

  const handleCompleteClick = () => {
    if (!canEditClinical) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    onCompleteClick();
  };

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
    if (!canEditClinical) return 'Start consultation first';
    return null;
  };

  return (
    <div className="doctor-detail-actionbar doctor-detail-actionbar--workspace doctor-detail-actionbar--consultation">
      <div className="doctor-detail-actionbar__group doctor-detail-actionbar__group--primary">
        <div className="doctor-actionbar-btn-wrapper">
          <button
            className={`btn btn-outline-success ${!canStartConsultation ? 'disabled' : ''}`}
            aria-disabled={!canStartConsultation}
            onClick={handleStartClick}
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
            aria-disabled={joinDisabled}
            onClick={handleJoinClick}
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
            className={`btn btn-success ${!canEditClinical || completingAppointment ? 'disabled' : ''}`}
            aria-disabled={!canEditClinical || completingAppointment}
            onClick={handleCompleteClick}
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
