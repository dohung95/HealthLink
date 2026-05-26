import React, { useState } from 'react';
import { toast } from 'sonner';
import { doctorScheduleService } from '../../../../api/doctorApi';
import ScheduleFormModal from './ScheduleFormModal';

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
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-7">
      {DAYS.map((day) => {
        const daySchedules = getSchedulesForDay(day.index);
        const isWeekend = day.index === 0 || day.index === 6;

        return (
          <section
            className={`flex h-full min-h-[170px] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-container-lowest ${daySchedules.length === 0 && isWeekend ? 'bg-surface-container-low/30' : ''}`}
            key={day.index}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-container-low px-3 py-2">
              <span className={`text-xs font-bold tracking-wide ${daySchedules.length ? 'text-text-main' : 'text-text-muted'}`}>{day.short}</span>
              <button className="text-text-muted transition hover:text-primary" onClick={() => handleAdd(day.index)} title={`Add schedule for ${day.label}`} type="button">
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {daySchedules.length === 0 ? (
                <button
                  className="flex min-h-[120px] flex-1 flex-col items-center justify-center rounded border border-dashed border-surface-border bg-surface-bright/50 p-4 text-center text-text-muted transition hover:border-primary hover:text-primary"
                  onClick={() => handleAdd(day.index)}
                  type="button"
                >
                  <span className="material-symbols-outlined mb-2 text-[32px] opacity-50">{isWeekend ? 'weekend' : 'event_busy'}</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{isWeekend ? 'Day Off' : 'No Schedule'}</span>
                  <span className="mt-1 text-[11px]">Add working hours</span>
                </button>
              ) : (
                daySchedules.map((schedule) => {
                  const isAvailable = Boolean(schedule.available);
                  const isBusy = deletingId === schedule.scheduleId || togglingId === schedule.scheduleId;

                  return (
                    <article
                      className={`group relative rounded border p-2 transition ${isAvailable ? 'border-surface-border bg-white' : 'border-surface-border bg-surface-container text-text-muted opacity-70'}`}
                      key={schedule.scheduleId}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-text-main">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </span>
                        <button
                          aria-pressed={isAvailable}
                          className={`relative h-4 w-8 shrink-0 rounded-full transition ${isAvailable ? 'bg-primary-container' : 'bg-slate-300'}`}
                          disabled={isBusy}
                          onClick={() => handleToggleAvailability(schedule.scheduleId, isAvailable)}
                          title={isAvailable ? 'Disable schedule' : 'Enable schedule'}
                          type="button"
                        >
                          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${isAvailable ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                          <span className="material-symbols-outlined text-[14px]">{getTypeIcon(schedule.consultationType)}</span>
                          {getTypeLabel(schedule.consultationType)}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {schedule.slotDuration || 30} min slots
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                          <span className="material-symbols-outlined text-[14px]">groups</span>
                          {schedule.maxPatients || 1} patient{(schedule.maxPatients || 1) === 1 ? '' : 's'}/slot
                        </span>
                        {schedule.location ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            {schedule.location}
                          </span>
                        ) : null}
                      </div>

                      <div className="absolute right-1 top-1 flex rounded border border-surface-border bg-white/90 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100">
                        <button className="p-1 text-text-muted hover:text-primary" onClick={() => handleEdit(schedule)} title="Edit schedule" type="button">
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button
                          className="p-1 text-text-muted hover:text-critical"
                          disabled={deletingId === schedule.scheduleId}
                          onClick={() => handleDelete(schedule.scheduleId)}
                          title="Delete schedule"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[14px]">{deletingId === schedule.scheduleId ? 'progress_activity' : 'delete'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
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
