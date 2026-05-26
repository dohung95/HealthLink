import React, { useState } from 'react';
import { doctorScheduleService } from '../../../../api/doctorApi';
import ScheduleFormModal from './ScheduleFormModal';
import { toast } from 'sonner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WeeklyScheduleBuilder = ({ schedules, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const getSchedulesForDay = (dayIndex) => {
    return schedules.filter(s => s.dayOfWeek === dayIndex);
  };

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

  const formatTime = (time) => {
    if (!time) return '';
    // Handle both "HH:mm" and "HH:mm:ss" formats
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <div className="weekly-schedule-builder">
      <div className="row g-3">
        {DAYS.map((day, index) => {
          const daySchedules = getSchedulesForDay(index);

          return (
            <div key={day} className="col-12 col-md-6 col-lg-4 col-xl-3">
              <div className="card h-100 shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center bg-light">
                  <h6 className="mb-0 fw-bold">{day}</h6>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleAdd(index)}
                    title="Add schedule"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  </button>
                </div>
                <div className="card-body">
                  {daySchedules.length === 0 ? (
                    <div className="text-center py-4">
                      <span className="material-symbols-outlined text-muted mb-2" style={{ fontSize: '48px' }}>
                        event_busy
                      </span>
                      <p className="text-muted mb-0">No schedule</p>
                      <button
                        className="btn btn-link btn-sm"
                        onClick={() => handleAdd(index)}
                      >
                        Add working hours
                      </button>
                    </div>
                  ) : (
                    daySchedules.map(schedule => (
                      <div
                        key={schedule.scheduleId}
                        className={`schedule-block p-3 mb-2 rounded border ${
                          schedule.available
                            ? 'border-success bg-success bg-opacity-10'
                            : 'border-secondary bg-secondary bg-opacity-10'
                        }`}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <span className="fw-bold text-dark">
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </span>
                            {schedule.consultationType && (
                              <span className="badge bg-info ms-2">{schedule.consultationType}</span>
                            )}
                          </div>
                          <div className="form-check form-switch">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={schedule.available}
                              onChange={() => handleToggleAvailability(schedule.scheduleId, schedule.available)}
                              disabled={togglingId === schedule.scheduleId}
                              title={schedule.available ? 'Disable schedule' : 'Enable schedule'}
                            />
                          </div>
                        </div>

                        <div className="d-flex gap-2 text-muted small mb-2">
                          <span>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                              schedule
                            </span>
                            {' '}{schedule.slotDuration || 30} min slots
                          </span>
                          {schedule.location && (
                            <span>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                                location_on
                              </span>
                              {' '}{schedule.location}
                            </span>
                          )}
                        </div>

                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => handleEdit(schedule)}
                            title="Edit schedule"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(schedule.scheduleId)}
                            disabled={deletingId === schedule.scheduleId}
                            title="Delete schedule"
                          >
                            {deletingId === schedule.scheduleId ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ScheduleFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSchedule(null);
        }}
        schedule={editingSchedule}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default WeeklyScheduleBuilder;
