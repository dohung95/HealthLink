import React, { useState, useEffect } from 'react';
import { doctorScheduleService } from '../../../../api/doctorApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CONSULTATION_TYPES = ['Video', 'Audio', 'Chat', 'Offline'];
const SLOT_DURATIONS = [15, 20, 30, 45, 60];

const ScheduleFormModal = ({ isOpen, onClose, schedule, onSuccess }) => {
  const [formData, setFormData] = useState({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    maxPatients: 1,
    consultationType: '',
    location: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (schedule) {
      if (schedule.isNew) {
        // New schedule - only set dayOfWeek
        setFormData(prev => ({
          ...prev,
          dayOfWeek: schedule.dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          slotDuration: 30,
          maxPatients: 1,
          consultationType: '',
          location: '',
          notes: ''
        }));
      } else {
        // Edit existing schedule
        setFormData({
          dayOfWeek: schedule.dayOfWeek,
          startTime: formatTimeForInput(schedule.startTime),
          endTime: formatTimeForInput(schedule.endTime),
          slotDuration: schedule.slotDuration || 30,
          maxPatients: schedule.maxPatients || 1,
          consultationType: schedule.consultationType || '',
          location: schedule.location || '',
          notes: schedule.notes || ''
        });
      }
    }
    setError('');
  }, [schedule]);

  const formatTimeForInput = (time) => {
    if (!time) return '09:00';
    // Handle both "HH:mm" and "HH:mm:ss" formats
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dayOfWeek' || name === 'slotDuration' || name === 'maxPatients'
        ? parseInt(value, 10)
        : value
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <span className="material-symbols-outlined me-2" style={{ verticalAlign: 'middle' }}>
                {schedule?.isNew ? 'add_circle' : 'edit_calendar'}
              </span>
              {schedule?.isNew ? 'Add Schedule' : 'Edit Schedule'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger py-2" role="alert">
                  {error}
                </div>
              )}

              {/* Day of Week */}
              <div className="mb-3">
                <label className="form-label">Day of Week</label>
                <select
                  name="dayOfWeek"
                  className="form-select"
                  value={formData.dayOfWeek}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div className="row mb-3">
                <div className="col">
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    className="form-control"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="col">
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    className="form-control"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Slot Duration & Max Patients */}
              <div className="row mb-3">
                <div className="col">
                  <label className="form-label">Slot Duration (minutes)</label>
                  <select
                    name="slotDuration"
                    className="form-select"
                    value={formData.slotDuration}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {SLOT_DURATIONS.map(duration => (
                      <option key={duration} value={duration}>{duration} mins</option>
                    ))}
                  </select>
                </div>
                <div className="col">
                  <label className="form-label">Max Patients per Slot</label>
                  <input
                    type="number"
                    name="maxPatients"
                    className="form-control"
                    min="1"
                    max="10"
                    value={formData.maxPatients}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Consultation Type */}
              <div className="mb-3">
                <label className="form-label">Consultation Type (leave empty for all)</label>
                <select
                  name="consultationType"
                  className="form-select"
                  value={formData.consultationType}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">All Types</option>
                  {CONSULTATION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="mb-3">
                <label className="form-label">Location (for offline consultations)</label>
                <input
                  type="text"
                  name="location"
                  className="form-control"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Room number, clinic address..."
                  disabled={loading}
                />
              </div>

              {/* Notes */}
              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  name="notes"
                  className="form-control"
                  rows="2"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes..."
                  disabled={loading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined me-1" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                      save
                    </span>
                    {schedule?.isNew ? 'Create Schedule' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleFormModal;
