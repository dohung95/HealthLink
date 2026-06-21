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
  isReadOnlyAppointment,   // true khi appointment đã COMPLETED
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
  /**
   * Xử lý click nút "Start Consultation".
   * Nếu không đủ điều kiện start → gọi onLockedAction để hiện toast hướng dẫn.
   */
  const handleStartClick = () => {
    if (!canStartConsultation) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    handleStartConsultation();
  };

  /**
   * Xử lý click nút "Join Video" hoặc "Open Chat".
   * Bị khóa khi: chưa start, đã complete, hoặc đã cancelled.
   */
  const handleJoinClick = () => {
    if (!hasStarted || isReadOnlyAppointment || isCancelledAppointment) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    // Phân biệt loại cuộc hẹn: Chat → mở chat, còn lại → video call
    if (currentAppointment?.consultationType === 'Chat') {
      handleChat();
      return;
    }
    handleVideoCall();
  };

  /**
   * Xử lý click nút "Complete Consultation".
   * Chỉ active khi bác sĩ có quyền chỉnh sửa lâm sàng (canEditClinical).
   */
  const handleCompleteClick = () => {
    if (!canEditClinical) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    onCompleteClick();
  };



  return (
    <div className="doctor-detail-actionbar doctor-detail-actionbar--workspace doctor-detail-actionbar--consultation">
      {/* --- Nhóm nút bên phải: Start, Join, Complete --- */}
      <div className="doctor-detail-actionbar__group doctor-detail-actionbar__group--primary">
        {/* Nút Start Consultation: chỉ active khi đến giờ và chưa start */}
        <button
          className={`btn btn-outline-success ${!canStartConsultation ? 'disabled' : ''}`}
          disabled={!canStartConsultation}
          aria-disabled={!canStartConsultation}
          onClick={handleStartClick}
          type="button"
        >
          <i className="bi bi-play-circle me-2" />
          {startingConsultation ? 'Starting...' : hasStarted ? 'Started' : 'Start Consultation'}
        </button>

        {/* Nút Join (Video/Chat): disabled khi chưa start, đã complete, hoặc cancelled */}
        <button
          className={`btn btn-primary ${joinDisabled ? 'disabled' : ''}`}
          disabled={joinDisabled}
          aria-disabled={joinDisabled}
          onClick={handleJoinClick}
          type="button"
          title={joinDisabled ? 'Cannot join: consultation not active or already completed.' : ''}
        >
          <i className="bi bi-camera-video me-2" />
          {actionLabel}
        </button>

        {/* Nút Complete: disabled khi không có quyền chỉnh sửa lâm sàng hoặc đang xử lý */}
        <button
          className={`btn btn-success ${!canEditClinical || completingAppointment ? 'disabled' : ''}`}
          disabled={!canEditClinical || completingAppointment}
          aria-disabled={!canEditClinical || completingAppointment}
          onClick={handleCompleteClick}
          type="button"
        >
          <i className="bi bi-check-circle me-2" />
          {completingAppointment ? 'Completing...' : 'Complete Consultation'}
        </button>
      </div>
    </div>
  );
};

export default ActionBar;
