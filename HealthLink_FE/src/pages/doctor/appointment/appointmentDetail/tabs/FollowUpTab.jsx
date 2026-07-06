import React, { useCallback, useState } from 'react';
import Calendar from 'react-calendar';
import { toast } from 'react-toastify';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import FollowUpStatusBadge from '@components/doctor/FollowUpStatusBadge';

const CONSULTATION_TYPES = [
  { value: 'Online', label: 'Online', icon: 'bi-laptop' },
  { value: 'HomeVisit', label: 'Home Visit', icon: 'bi-house-heart' },
];

const FollowUpTab = ({
  canEditFollowUp,
  consultation,
  formatDateTime,
  loadingFollowUpCalendar,
  followUpCalendarDayMap,
  followUpSelectedDate,
  toLocalDateValue,
  onFollowUpMonthChange,
  onFollowUpDateChange,
  loadingFollowUpSlots,
  followUpSlots,
  buildFollowUpDateTime,
  selectedFollowUpDateTime,
  savingFollowUp,
  onSelectFollowUpSlot,
  selectedScheduleLabel,
  followUpNotes,
  onFollowUpNotesChange,
  renderEmptyState,
  followUpConsultationType,
  onFollowUpTypeChange,
  followUpPaymentStatus,
  sendingPaymentRequest,
  handleSendPaymentRequest,
  showRescheduleConfirm,
  isRescheduling,
  handleInitiateReschedule,
  handleConfirmRescheduleModal,
  handleCancelRescheduleModal,
  handleSaveReschedule,
  handleCancelReschedule,
  canCancelPendingPayment,
  cancelingPaymentRequest,
  handleCancelPendingPayment,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const hasExistingFollowUp = Boolean(consultation.followUpDate || consultation.followUpNotes);
  const isPaidLocked = followUpPaymentStatus === 'PAID' && !isRescheduling;

  const handlePaidLockAction = useCallback(() => {
    toast.info('Click "Reschedule" to change follow-up information');
  }, []);

  const handleCancelClick = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    handleCancelPendingPayment();
  }, [handleCancelPendingPayment]);

  const handleDismissCancel = useCallback(() => {
    setShowCancelConfirm(false);
  }, []);

  return (
    <div className="fu-container">
      <div className="fu-body">
        <div className="fu-left">
          <div className="fu-calendar-card">
            <div className="fu-calendar-header">
              <span className="fu-calendar-title">
                <i className="bi bi-calendar3 me-2"></i>Select Date
              </span>
              {loadingFollowUpCalendar && (
                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill">
                  <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.6rem', height: '0.6rem' }} />
                  Refreshing
                </span>
              )}
            </div>
            <Calendar
              locale="en-US"
              minDate={new Date()}
              showNeighboringMonth={false}
              onActiveStartDateChange={onFollowUpMonthChange}
              onChange={isPaidLocked ? handlePaidLockAction : onFollowUpDateChange}
              tileClassName={({ date, view }) => {
                if (view !== 'month') return null;
                const day = followUpCalendarDayMap.get(toLocalDateValue(date));
                if (!day) return null;
                return [
                  day.hasAppointments ? 'fu-cal-tile--busy' : '',
                  day.availableSlots === 0 ? 'fu-cal-tile--full' : '',
                ].filter(Boolean).join(' ');
              }}
              tileContent={({ date, view }) => {
                if (view !== 'month') return null;
                const day = followUpCalendarDayMap.get(toLocalDateValue(date));
                if (!day?.hasAppointments) return null;
                return <span className="fu-cal-dot"></span>;
              }}
              value={followUpSelectedDate}
            />
          </div>

          <div className="fu-visit-card">
            <div className="fu-visit-card__header">
              <i className="bi bi-journal-check text-primary me-2"></i>
              <label className="fu-notes-label">Follow-up Notes</label>
            </div>
            <div className="fu-visit-card__body">
              <textarea
                className="form-control fu-notes-input"
                readOnly={!canEditFollowUp || savingFollowUp || isPaidLocked}
                onClick={() => isPaidLocked && handlePaidLockAction()}
                onChange={(event) => {
                  onFollowUpNotesChange(event.target.value);
                }}
                placeholder="Add concise notes for the next appointment..."
                rows="2"
                value={followUpNotes}
              />
            </div>
          </div>
        </div>

        <div className="fu-right-col">
          <div className="fu-right">
            <div className="fu-slots-header">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-clock-history me-2"></i>Available Slots
              </h6>
              {followUpSelectedDate && (
                <span className="badge bg-light text-dark rounded-pill fs-xs">
                  {followUpSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <div className="fu-slots-body">
              {loadingFollowUpSlots ? (
                <div className="fu-slots-loading">
                  <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
                  Loading slots...
                </div>
              ) : followUpSlots.length > 0 ? (
                <div className="fu-slots-grid">
                  {followUpSlots.map((slot) => {
                    const slotDateTime = buildFollowUpDateTime(followUpSelectedDate, slot.startTime);
                    const isSelected = selectedFollowUpDateTime === slotDateTime;

                    return (
                      <button
                        className={`fu-slot-btn ${slot.selectable ? 'fu-slot-btn--avail' : 'fu-slot-btn--disabled'} ${isSelected ? 'fu-slot-btn--selected' : ''}`}
                        disabled={!slot.selectable || savingFollowUp || !canEditFollowUp}
                        key={slot.startTime}
                        onClick={() => {
                          if (isPaidLocked) { handlePaidLockAction(); return; }
                          onSelectFollowUpSlot(slot);
                        }}
                        title={slot.disabledReason || slot.label}
                        type="button"
                      >
                        <span className="fu-slot-time">{slot.label}</span>
                        <span className={`fu-slot-status ${isSelected ? 'fu-slot-status--selected' : ''}`}>
                          {slot.status === 'BOOKED'
                            ? 'Booked'
                            : slot.status === 'DISABLED'
                              ? slot.disabledReason || 'Disabled'
                              : isSelected
                                ? 'Selected'
                                : 'Available'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                renderEmptyState(
                  'No slots available',
                  'Choose another date to view follow-up availability.',
                )
              )}
            </div>
          </div>

          <div className="fu-status-type-container">
            <div className="fu-type-card">
              <div className="fu-type-card__header">
                <i className="bi bi-diagram-3 me-2"></i>Consultation Type
              </div>
              <div className="fu-type-card__body">
                {CONSULTATION_TYPES.map((type) => {
                  const isActive = followUpConsultationType === type.value;
                  return (
                    <button
                      key={type.value}
                      className={`fu-type-btn ${isActive ? 'fu-type-btn--active' : ''} ${!canEditFollowUp ? 'disabled' : ''}`}
                      disabled={!canEditFollowUp || savingFollowUp}
                      onClick={() => {
                        if (isPaidLocked) { handlePaidLockAction(); return; }
                        onFollowUpTypeChange(type.value);
                      }}
                      type="button"
                    >
                      <i className={`bi ${type.icon}`}></i>
                      <span className="fu-type-btn__label">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(hasExistingFollowUp || selectedFollowUpDateTime) && (
              <div className="fu-status-card">
                <div className="fu-status-card__header">
                  <i className="bi bi-credit-card me-2"></i>Payment Status
                </div>
                <div className="fu-status-card__body">
                  {hasExistingFollowUp && (
                    <div className="fu-saved-banner">
                      <div className="fu-saved-banner__item">
                        <span className="fu-saved-banner__label">Date</span>
                        <span className="fu-saved-banner__value">
                          {consultation.followUpDate ? formatDateTime(consultation.followUpDate) : 'Not scheduled'}
                        </span>
                      </div>
                      {followUpPaymentStatus && followUpPaymentStatus !== 'NONE' && (
                        <div className="fu-saved-banner__item">
                          <span className="fu-saved-banner__label">Status</span>
                          <FollowUpStatusBadge status={followUpPaymentStatus} />
                        </div>
                      )}
                    </div>
                  )}
                  {selectedFollowUpDateTime && (!followUpPaymentStatus || followUpPaymentStatus === 'NONE') && (
                    <button className="btn btn-primary" onClick={handleSendPaymentRequest} disabled={sendingPaymentRequest} style={{ width: '100%' }}>
                      {sendingPaymentRequest ? (
                        <>Sending...</>
                      ) : (
                        <><i className="bi bi-send me-1" /> Send payment request</>
                      )}
                    </button>
                  )}
                  {selectedFollowUpDateTime && followUpPaymentStatus === 'PENDING_PAYMENT' && (
                    <div className="fu-status-card__pending">
                      <div className="fu-status-waiting-btn">
                        <span className="fu-pulse-dot"></span>
                        Waiting for patient...
                      </div>
                      <button
                        className="fu-status-cancel-btn"
                        onClick={handleCancelClick}
                        disabled={cancelingPaymentRequest}
                      >
                        {cancelingPaymentRequest ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  )}
                  {selectedFollowUpDateTime && followUpPaymentStatus === 'PAID' && !isRescheduling && (
                    <div className="fu-status-actions">
                      <button className="btn btn-primary fu-reschedule-btn" onClick={handleInitiateReschedule}>
                        <i className="bi bi-arrow-clockwise me-1" /> Reschedule
                      </button>
                      <button className="btn btn-success" disabled>
                        <i className="bi bi-check2-all me-1" /> Follow-up created
                      </button>
                    </div>
                  )}

                  {selectedFollowUpDateTime && followUpPaymentStatus === 'PAID' && isRescheduling && (
                    <div className="fu-status-actions">
                      <button className="btn btn-primary" onClick={handleSaveReschedule} disabled={savingFollowUp}>
                        {savingFollowUp ? 'Saving...' : <><i className="bi bi-check-lg me-1" /> Confirm</>}
                      </button>
                      <button className="btn btn-outline-danger" onClick={handleCancelReschedule} disabled={savingFollowUp}>
                        <i className="bi bi-x me-1" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCancelConfirm && (
        <div className="fu-modal-overlay" onClick={handleDismissCancel}>
          <div className="fu-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h5 className="fu-confirm-modal__title">Cancel payment request?</h5>
            <p className="fu-confirm-modal__desc">This will cancel the payment request sent to the patient and reset the follow-up status.</p>
            <div className="fu-confirm-modal__actions">
              <button className="btn btn-outline-secondary" onClick={handleDismissCancel}>Keep request</button>
              <button className="fu-status-cancel-btn" onClick={handleConfirmCancel} style={{ flex: 1, border: 'none', borderRadius: 'var(--radius-md, 8px)' }}>Yes, cancel</button>
            </div>
          </div>
        </div>
      )}
      {showRescheduleConfirm && !isRescheduling && (
        <div className="fu-modal-overlay" onClick={handleCancelRescheduleModal}>
          <div className="fu-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h5 className="fu-confirm-modal__title">Reschedule this follow-up?</h5>
            <p className="fu-confirm-modal__desc">The follow-up appointment will be updated to the new date and time.</p>
            <div className="fu-confirm-modal__actions">
              <button className="btn btn-outline-danger" onClick={handleCancelRescheduleModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmRescheduleModal}>Yes, reschedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default FollowUpTab;
