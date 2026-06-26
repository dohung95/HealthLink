import React from 'react';
import Calendar from 'react-calendar';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';

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
  canCancelFollowUp,
  onCancelFollowUp,
  followUpAction,
  onConfirmFollowUp,
  currentAppointment,
  followUpNotes,
  onFollowUpNotesChange,
  renderEmptyState,
  followUpConsultationType,
  onFollowUpTypeChange,
  onLockedAction,
  onMarkDirty,
  onMarkClean,
}) => {
  const hasExistingFollowUp = Boolean(consultation.followUpDate || consultation.followUpNotes);

  return (
    <div className="fu-container">
      {hasExistingFollowUp && (
        <div className="fu-saved-banner">
          <div className="fu-saved-banner__item">
            <span className="fu-saved-banner__label">Saved Date</span>
            <span className="fu-saved-banner__value">
              {consultation.followUpDate ? formatDateTime(consultation.followUpDate) : 'Not scheduled'}
            </span>
          </div>
          {consultation.followUpNotes && (
            <div className="fu-saved-banner__divider" />
          )}
          {consultation.followUpNotes && (
            <div className="fu-saved-banner__item">
              <span className="fu-saved-banner__label">Notes</span>
              <span className="fu-saved-banner__value fu-saved-banner__value--notes">
                {consultation.followUpNotes}
              </span>
            </div>
          )}
        </div>
      )}

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
              onChange={onFollowUpDateChange}
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
            <div className="fu-visit-row">
              <div className="fu-visit-item">
                <i className="bi bi-camera-video"></i>
                <span>{currentAppointment?.consultationType || 'Consultation'}</span>
              </div>
              <div className="fu-visit-item">
                <i className="bi bi-clock"></i>
                <span>30 mins</span>
              </div>
            </div>
            <div className="fu-notes-group">
              <label className="fu-notes-label">Follow-up Notes</label>
              <textarea
                className="form-control fu-notes-input"
                readOnly={!canEditFollowUp || savingFollowUp}
                onFocus={() => { if (!canEditFollowUp && typeof onLockedAction === 'function') onLockedAction(); }}
                onClick={() => { if (!canEditFollowUp && typeof onLockedAction === 'function') onLockedAction(); }}
                onChange={(event) => {
                  onFollowUpNotesChange(event.target.value);
                  if (typeof onMarkDirty === 'function') onMarkDirty();
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
                        disabled={!slot.selectable || savingFollowUp}
                        aria-disabled={!canEditFollowUp}
                        key={slot.startTime}
                        onClick={() => {
                          if (!canEditFollowUp) {
                            if (typeof onLockedAction === 'function') onLockedAction();
                            return;
                          }
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
                    aria-disabled={!canEditFollowUp || savingFollowUp}
                    onClick={() => {
                      if (!canEditFollowUp) {
                        if (typeof onLockedAction === 'function') onLockedAction();
                        return;
                      }
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
        </div>
      </div>

      <div className="fu-footer">
        <div className="fu-footer-info">
          <span className="fu-footer-label">Selected Schedule</span>
          <strong className="fu-footer-value">{selectedScheduleLabel}</strong>
        </div>
        <div className="fu-footer-actions">
          {canCancelFollowUp && (
            <button
              className="btn btn-outline-danger btn-sm"
              disabled={savingFollowUp}
              onClick={onCancelFollowUp}
              type="button"
            >
              {followUpAction === 'cancel' ? (
                <><span className="spinner-border spinner-border-sm me-1" />Cancelling...</>
              ) : (
                <><i className="bi bi-x-circle me-1"></i>Cancel</>
              )}
            </button>
          )}
          <button
            className={`btn btn-primary btn-sm ${!canEditFollowUp || savingFollowUp || !selectedFollowUpDateTime ? 'disabled' : ''}`}
            aria-disabled={!canEditFollowUp || savingFollowUp || !selectedFollowUpDateTime}
            onClick={() => {
              if (!canEditFollowUp) {
                if (typeof onLockedAction === 'function') onLockedAction();
                return;
              }
              onConfirmFollowUp();
              if (typeof onMarkClean === 'function') onMarkClean();
            }}
            type="button"
          >
            {followUpAction === 'confirm' ? (
              <><span className="spinner-border spinner-border-sm me-1" />Saving...</>
            ) : (
              <><i className="bi bi-check-lg me-1"></i>Confirm</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpTab;
