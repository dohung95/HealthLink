import React, { useState } from 'react';
import { toast } from 'sonner';
import { doctorScheduleService } from '@api/doctorApi';
import ScheduleFormModal from '@components/doctor/ScheduleFormModal';

const DAYS = [
  { index: 1, short: 'MON', label: 'Monday' },
  { index: 2, short: 'TUE', label: 'Tuesday' },
  { index: 3, short: 'WED', label: 'Wednesday' },
  { index: 4, short: 'THU', label: 'Thursday' },
  { index: 5, short: 'FRI', label: 'Friday' },
  { index: 6, short: 'SAT', label: 'Saturday' },
  { index: 0, short: 'SUN', label: 'Sunday' },
];

const getTypeIcon = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'video':
    case 'video call':
      return 'videocam';
    case 'audio':
    case 'audio call':
      return 'call';
    case 'chat':
      return 'chat';
    case 'offline':
      return 'local_hospital';
    default:
      return 'medical_services';
  }
};

const getTypeLabel = (type) => type || 'All Types';

const formatTime = (time) => {
  if (!time) return '';
  const parts = String(time).split(':');
  return `${parts[0]}:${parts[1]}`;
};

const WeeklyScheduleBuilder = ({ schedules, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const getSchedulesForDay = (dayIndex) =>
    schedules
      .filter((schedule) => schedule.dayOfWeek === dayIndex)
      .sort((left, right) => String(left.startTime).localeCompare(String(right.startTime)));

  const handleAdd = (dayIndex) => {
    setEditingSchedule({ dayOfWeek: dayIndex, isNew: true });
    setShowModal(true);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule({ ...schedule, isNew: false });
    setShowModal(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      setDeletingId(scheduleId);
      await doctorScheduleService.deleteSchedule(scheduleId);
      toast.success('Schedule deleted successfully');
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleAvailability = async (scheduleId, currentAvailable) => {
    try {
      setTogglingId(scheduleId);
      await doctorScheduleService.toggleAvailability(scheduleId, !currentAvailable);
      toast.success(`Schedule ${!currentAvailable ? 'enabled' : 'disabled'}`);
      onRefresh();
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error(err.response?.data?.message || 'Failed to toggle availability');
    } finally {
      setTogglingId(null);
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingSchedule(null);
    onRefresh();
    toast.success(editingSchedule?.isNew ? 'Schedule created successfully' : 'Schedule updated successfully');
  };

  return (
    <div className="row g-3">
      {DAYS.map((day) => {
        const daySchedules = getSchedulesForDay(day.index);
        const isWeekend = day.index === 0 || day.index === 6;

        return (
          <section className="col-12 col-md-6 col-xl" key={day.index} style={{minWidth:'0'}}>
            <div className={`schedule-day-card ${daySchedules.length === 0 && isWeekend ? 'opacity-75' : ''}`}>
              <div className="schedule-day-card__header">
                <span className="schedule-day-card__header-title">{day.short}</span>
                <button className="schedule-day-card__header-add" onClick={() => handleAdd(day.index)} title={`Add schedule for ${day.label}`} type="button">
                  <span className="material-symbols-outlined" style={{fontSize:'1.125rem'}}>add_circle</span>
                </button>
              </div>

              <div className="schedule-day-card__body">
                {daySchedules.length === 0 ? (
                  <div className="schedule-day-card__empty" onClick={() => handleAdd(day.index)}>
                    <span className="material-symbols-outlined schedule-day-card__empty-icon">{isWeekend ? 'weekend' : 'event_busy'}</span>
                    <span className="schedule-day-card__empty-label">{isWeekend ? 'Day Off' : 'No Schedule'}</span>
                    <span className="schedule-day-card__empty-action">Add working hours</span>
                  </div>
                ) : (
                  daySchedules.map((schedule) => {
                    const isAvailable = Boolean(schedule.available);
                    const isBusy = deletingId === schedule.scheduleId || togglingId === schedule.scheduleId;

                    return (
                      <article
                        className={`doctor-schedule-item ${!isAvailable ? 'doctor-schedule-item--disabled' : ''}`}
                        key={schedule.scheduleId}
                      >
                        <div className="doctor-schedule-item__top">
                          <span className="doctor-schedule-item__time">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </span>
                          <div className="doctor-schedule-item__toggle">
                            <input
                              className="form-check-input"
                              checked={isAvailable}
                              disabled={isBusy}
                              onChange={() => handleToggleAvailability(schedule.scheduleId, isAvailable)}
                              type="checkbox"
                              role="switch"
                              id={`toggle-${schedule.scheduleId}`}
                            />
                          </div>
                        </div>

                        <div className="doctor-schedule-item__tags">
                          <span className="doctor-schedule-item__tag">
                            <span className="material-symbols-outlined">{getTypeIcon(schedule.consultationType)}</span>
                            {getTypeLabel(schedule.consultationType)}
                          </span>
                          <span className="doctor-schedule-item__tag">
                            <span className="material-symbols-outlined">schedule</span>
                            {schedule.slotDuration || 30} min
                          </span>
                          <span className="doctor-schedule-item__tag">
                            <span className="material-symbols-outlined">groups</span>
                            {schedule.maxPatients || 1} pat/slot
                          </span>
                          {schedule.location ? (
                            <span className="doctor-schedule-item__tag">
                              <span className="material-symbols-outlined">location_on</span>
                              {schedule.location}
                            </span>
                          ) : null}
                        </div>

                        <div className="doctor-schedule-item__actions">
                          <button className="doctor-schedule-item__action-btn" onClick={() => handleEdit(schedule)} title="Edit schedule" type="button">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            className="doctor-schedule-item__action-btn doctor-schedule-item__action-btn--delete"
                            disabled={deletingId === schedule.scheduleId}
                            onClick={() => handleDelete(schedule.scheduleId)}
                            title="Delete schedule"
                            type="button"
                          >
                            <span className="material-symbols-outlined">{deletingId === schedule.scheduleId ? 'progress_activity' : 'delete'}</span>
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        );
      })}

      <ScheduleFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSchedule(null);
        }}
        onSuccess={handleModalSuccess}
        schedule={editingSchedule}
      />
    </div>
  );
};

export default WeeklyScheduleBuilder;
