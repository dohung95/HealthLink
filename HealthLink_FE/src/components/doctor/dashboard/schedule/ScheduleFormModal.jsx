import React, { useEffect, useState } from 'react';
import { doctorScheduleService } from '../../../../api/doctorApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CONSULTATION_TYPES = ['Video', 'Audio', 'Chat', 'Offline'];
const SLOT_DURATIONS = [15, 20, 30, 45, 60];

const formatTimeForInput = (time) => {
  if (!time) return '09:00';
  const parts = String(time).split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const initialFormData = {
  dayOfWeek: 0,
  startTime: '09:00',
  endTime: '17:00',
  slotDuration: 30,
  maxPatients: 1,
  consultationType: '',
  location: '',
  notes: '',
};

const ScheduleFormModal = ({ isOpen, onClose, schedule, onSuccess }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!schedule) return;

    if (schedule.isNew) {
      setFormData({
        ...initialFormData,
        dayOfWeek: schedule.dayOfWeek,
      });
    } else {
      setFormData({
        dayOfWeek: schedule.dayOfWeek,
        startTime: formatTimeForInput(schedule.startTime),
        endTime: formatTimeForInput(schedule.endTime),
        slotDuration: schedule.slotDuration || 30,
        maxPatients: schedule.maxPatients || 1,
        consultationType: schedule.consultationType || '',
        location: schedule.location || '',
        notes: schedule.notes || '',
      });
    }
    setError('');
  }, [schedule]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: ['dayOfWeek', 'slotDuration', 'maxPatients'].includes(name) ? parseInt(value, 10) : value,
    }));
  };

  const validateForm = () => {
    if (formData.startTime >= formData.endTime) {
      setError('Start time must be before end time');
      return false;
    }
    if (formData.slotDuration < 10 || formData.slotDuration > 120) {
      setError('Slot duration must be between 10 and 120 minutes');
      return false;
    }
    if (formData.maxPatients < 1 || formData.maxPatients > 10) {
      setError('Max patients must be between 1 and 10');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validateForm()) return;

    try {
      setLoading(true);
      if (schedule?.isNew) {
        await doctorScheduleService.createSchedule(formData);
      } else {
        await doctorScheduleService.updateSchedule(schedule.scheduleId, formData);
      }
      onSuccess();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 d-flex align-items-center justify-content-center bg-black/50 p-4" onClick={onClose}>
      <section className="max-h-92vh w-100 max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="d-flex align-items-center justify-content-between border-bottom border-surface-border px-5 py-4">
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">{schedule?.isNew ? 'add_circle' : 'edit_calendar'}</span>
            <h2 className="mb-0 text-lg fw-bold text-text-main">{schedule?.isNew ? 'Add Schedule' : 'Edit Schedule'}</h2>
          </div>
          <button className="btn border-0 rounded p-2 text-text-muted hover:bg-surface-container" disabled={loading} onClick={onClose} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="d-grid gap-4 px-5 py-4">
            {error ? (
              <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error" role="alert">
                {error}
              </div>
            ) : null}

            <label className="d-grid gap-1">
              <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Day of Week</span>
              <select className="form-select h-10 rounded border border-surface-border bg-white px-3 text-sm focus-ring-primary" disabled={loading} name="dayOfWeek" onChange={handleChange} value={formData.dayOfWeek}>
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </label>

            <div className="row g-4">
              <div className="col-12 col-sm-6">
                <label className="d-grid gap-1">
                  <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Start Time</span>
                  <input className="form-control h-10 rounded border border-surface-border px-3 text-sm focus-ring-primary" disabled={loading} name="startTime" onChange={handleChange} required type="time" value={formData.startTime} />
                </label>
              </div>
              <div className="col-12 col-sm-6">
                <label className="d-grid gap-1">
                  <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">End Time</span>
                  <input className="form-control h-10 rounded border border-surface-border px-3 text-sm focus-ring-primary" disabled={loading} name="endTime" onChange={handleChange} required type="time" value={formData.endTime} />
                </label>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-12 col-sm-6">
                <label className="d-grid gap-1">
                  <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Slot Duration</span>
                  <select className="form-select h-10 rounded border border-surface-border bg-white px-3 text-sm focus-ring-primary" disabled={loading} name="slotDuration" onChange={handleChange} value={formData.slotDuration}>
                    {SLOT_DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>{duration} mins</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="col-12 col-sm-6">
                <label className="d-grid gap-1">
                  <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Max Patients per Slot</span>
                  <input className="form-control h-10 rounded border border-surface-border px-3 text-sm focus-ring-primary" disabled={loading} max="10" min="1" name="maxPatients" onChange={handleChange} type="number" value={formData.maxPatients} />
                </label>
              </div>
            </div>

            <label className="d-grid gap-1">
              <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Consultation Type</span>
              <select className="form-select h-10 rounded border border-surface-border bg-white px-3 text-sm focus-ring-primary" disabled={loading} name="consultationType" onChange={handleChange} value={formData.consultationType}>
                <option value="">All Types</option>
                {CONSULTATION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="d-grid gap-1">
              <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Location</span>
              <input className="form-control h-10 rounded border border-surface-border px-3 text-sm focus-ring-primary" disabled={loading} name="location" onChange={handleChange} placeholder="Room number, clinic address..." type="text" value={formData.location} />
            </label>

            <label className="d-grid gap-1">
              <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Notes</span>
              <textarea className="form-control min-h-20 rounded border border-surface-border px-3 py-2 text-sm focus-ring-primary" disabled={loading} name="notes" onChange={handleChange} placeholder="Any additional notes..." value={formData.notes} />
            </label>
          </div>

          <div className="d-flex justify-content-end gap-3 border-top border-surface-border px-5 py-4">
            <button className="btn rounded border border-surface-border px-4 py-2 text-sm fw-semibold text-text-main hover:bg-surface-container" disabled={loading} onClick={onClose} type="button">
              Cancel
            </button>
            <button className="btn d-inline-flex align-items-center gap-2 rounded bg-primary-container px-4 py-2 text-sm fw-semibold text-white hover:bg-primary disabled:opacity-60" disabled={loading} type="submit">
              <span className="material-symbols-outlined text-18px">{loading ? 'progress_activity' : 'save'}</span>
              {loading ? 'Saving...' : schedule?.isNew ? 'Create Schedule' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ScheduleFormModal;
