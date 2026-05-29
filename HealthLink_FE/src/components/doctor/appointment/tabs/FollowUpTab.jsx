import React from 'react';
import Calendar from 'react-calendar';
import '../../Css/FollowUpTab.css';

const FollowUpTab = ({
  canEditFollowUp,
  isReadOnlyAppointment,
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
  getTypeIcon,
  followUpNotes,
  onFollowUpNotesChange,
  renderEmptyState,
}) => {
  return (
    <div className="doctor-detail-followup">
      {consultation.followUpDate || consultation.followUpNotes ? (
        <div className="doctor-detail-followup__summary">
          <div className="doctor-detail-note-card">
            <p className="doctor-detail-note-card__label">Saved Date</p>
            <p className="doctor-detail-note-card__value">
              {consultation.followUpDate ? formatDateTime(consultation.followUpDate) : 'Not scheduled'}
            </p>
          </div>
          <div className="doctor-detail-note-card">
            <p className="doctor-detail-note-card__label">Saved Notes</p>
            <p className="doctor-detail-note-card__value">
              {consultation.followUpNotes || 'No follow-up notes recorded.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="doctor-detail-followup__planner doctor-detail-followup__planner--workspace">
        <div className="doctor-detail-followup__left">
          <div className="doctor-detail-followup__calendar">
            <div className="doctor-detail-followup__header">
              
              {loadingFollowUpCalendar ? (
                <span className="doctor-detail-followup__loading">Refreshing</span>
              ) : null}
            </div>

            <Calendar
              locale="en-US"
              minDate={new Date()}
              onActiveStartDateChange={onFollowUpMonthChange}
              onChange={onFollowUpDateChange}
              tileClassName={({ date, view }) => {
                if (view !== 'month') return null;
                const day = followUpCalendarDayMap.get(toLocalDateValue(date));
                if (!day) return null;
                return [
                  day.hasAppointments ? 'doctor-followup-calendar__tile--busy' : '',
                  day.availableSlots === 0 ? 'doctor-followup-calendar__tile--full' : '',
                ].filter(Boolean).join(' ');
              }}
              tileContent={({ date, view }) => {
                if (view !== 'month') return null;
                const day = followUpCalendarDayMap.get(toLocalDateValue(date));
                if (!day?.hasAppointments) return null;
                return <span className="doctor-followup-calendar__dot"></span>;
              }}
              value={followUpSelectedDate}
            />
          </div>

          <div className="doctor-detail-followup__visit">
            <p className="doctor-detail-eyebrow mb-2">Visit Details</p>
            <div className="doctor-detail-followup__visit-grid">
              <span>
                <i className={`bi ${getTypeIcon(currentAppointment?.consultationType)}`}></i>
                {currentAppointment?.consultationType || 'Consultation'}
              </span>
              <span>
                <i className="bi bi-clock"></i>
                30 mins
              </span>
            </div>
            <label className="doctor-detail-followup__notes">
              <span>Follow-up notes</span>
              <textarea
                className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                disabled={!canEditFollowUp || savingFollowUp}
                onChange={(event) => onFollowUpNotesChange(event.target.value)}
                placeholder="Add concise notes for the next appointment..."
                rows="3"
                value={followUpNotes}
              />
            </label>
          </div>
        </div>

        <div className="doctor-detail-followup__slots">
          <div className="doctor-detail-followup__header">
            <div>
              <p className="doctor-detail-eyebrow mb-1">
                {toLocalDateValue(followUpSelectedDate) || 'Selected day'}
              </p>
              <h3 className="doctor-detail-section-title doctor-detail-section-title--compact">
                Available slots
              </h3>
            </div>
          </div>

          {loadingFollowUpSlots ? (
            <div className="doctor-detail-followup__slot-skeleton">
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Loading slots...
            </div>
          ) : followUpSlots.length > 0 ? (
            <div className="doctor-detail-followup__slot-grid">
              {followUpSlots.map((slot) => {
                const slotDateTime = buildFollowUpDateTime(followUpSelectedDate, slot.startTime);
                const isSelected = selectedFollowUpDateTime === slotDateTime;

                return (
                  <button
                    className={[
                      'doctor-followup-slot',
                      slot.selectable ? 'doctor-followup-slot--available' : 'doctor-followup-slot--disabled',
                      isSelected ? 'doctor-followup-slot--selected' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={!slot.selectable || !canEditFollowUp || savingFollowUp}
                    key={slot.startTime}
                    onClick={() => onSelectFollowUpSlot(slot)}
                    title={slot.disabledReason || slot.label}
                    type="button"
                  >
                    <span className="doctor-followup-slot__time">{slot.label}</span>
                    <span className="doctor-followup-slot__status">
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

      <div className="doctor-detail-followup__footer">
        <div>
          <p className="doctor-detail-eyebrow mb-1">Selected Schedule</p>
          <strong>{selectedScheduleLabel}</strong>
        </div>
        <div className="doctor-detail-followup__actions">
          {canCancelFollowUp ? (
            <button
              className="btn btn-outline-danger"
              disabled={savingFollowUp}
              onClick={onCancelFollowUp}
              type="button"
            >
              {followUpAction === 'cancel' ? 'Cancelling...' : 'Cancel follow-up'}
            </button>
          ) : null}
          <button
            className="btn btn-primary"
            disabled={!canEditFollowUp || savingFollowUp || !selectedFollowUpDateTime}
            onClick={onConfirmFollowUp}
            type="button"
          >
            <i className="bi bi-calendar-check me-2"></i>
            {followUpAction === 'confirm' ? 'Saving...' : 'Confirm Follow-up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpTab;
