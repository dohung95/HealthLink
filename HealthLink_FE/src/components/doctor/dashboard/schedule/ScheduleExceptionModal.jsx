import React, { useState, useEffect } from 'react';
import { doctorScheduleService } from '../../../../api/doctorApi';

const ScheduleExceptionModal = ({ isOpen, onClose, selectedDate, onSuccess }) => {
  const [formData, setFormData] = useState({
    exceptionDate: '',
    exceptionType: 'DayOff',
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
    recurring: false,
    recurringUntil: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate instanceof Date
        ? selectedDate.toISOString().split('T')[0]
        : selectedDate;
      setFormData(prev => ({
        ...prev,
        exceptionDate: dateStr
      }));
    }
    setError('');
  }, [selectedDate, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.exceptionDate) {
      setError('Exception date is required');
      return false;
    }
    if (!formData.reason.trim()) {
      setError('Reason is required');
      return false;
    }
    if (['Modified', 'AddSlot'].includes(formData.exceptionType)) {
      if (!formData.startTime || !formData.endTime) {
        setError('Start time and end time are required for Modified/AddSlot');
        return false;
      }
      if (formData.startTime >= formData.endTime) {
        setError('Start time must be before end time');
        return false;
      }
    }
    if (formData.recurring && !formData.recurringUntil) {
      setError('Please specify recurring until date');
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

      const requestData = {
        exceptionDate: formData.exceptionDate,
        exceptionType: formData.exceptionType,
        reason: formData.reason,
        recurring: formData.recurring,
        recurringUntil: formData.recurring ? formData.recurringUntil : null
      };

      // Only include time fields for Modified/AddSlot
      if (['Modified', 'AddSlot'].includes(formData.exceptionType)) {
        requestData.startTime = formData.startTime;
        requestData.endTime = formData.endTime;
      }

      await doctorScheduleService.createException(requestData);
      onSuccess();
    } catch (err) {
      console.error('Create exception error:', err);
      setError(err.response?.data?.message || 'Failed to create exception');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      exceptionDate: selectedDate ? (
        selectedDate instanceof Date
          ? selectedDate.toISOString().split('T')[0]
          : selectedDate
      ) : '',
      exceptionType: 'DayOff',
      startTime: '09:00',
      endTime: '17:00',
      reason: '',
      recurring: false,
      recurringUntil: ''
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const showTimeFields = ['Modified', 'AddSlot'].includes(formData.exceptionType);

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <span className="material-symbols-outlined me-2" style={{ verticalAlign: 'middle' }}>
                event_busy
              </span>
              Add Schedule Exception
            </h5>
            <button type="button" className="btn-close" onClick={handleClose} disabled={loading}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger py-2" role="alert">
                  {error}
                </div>
              )}

              {/* Exception Date */}
              <div className="mb-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  name="exceptionDate"
                  className="form-control"
                  value={formData.exceptionDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  disabled={loading}
                />
              </div>

              {/* Exception Type */}
              <div className="mb-3">
                <label className="form-label">Exception Type</label>
                <select
                  name="exceptionType"
                  className="form-select"
                  value={formData.exceptionType}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="DayOff">Day Off (Not Available)</option>
                  <option value="Modified">Modified Hours</option>
                  <option value="AddSlot">Add Extra Slot</option>
                </select>
                <div className="form-text">
                  {formData.exceptionType === 'DayOff' && 'You will not be available on this day'}
                  {formData.exceptionType === 'Modified' && 'Replace your regular hours with different hours'}
                  {formData.exceptionType === 'AddSlot' && 'Add extra availability outside regular hours'}
                </div>
              </div>

              {/* Time Fields (for Modified/AddSlot) */}
              {showTimeFields && (
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
              )}

              {/* Reason */}
              <div className="mb-3">
                <label className="form-label">Reason</label>
                <textarea
                  name="reason"
                  className="form-control"
                  rows="2"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="e.g., Personal leave, Conference attendance, Emergency..."
                  required
                  disabled={loading}
                />
              </div>

              {/* Recurring */}
              <div className="mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    name="recurring"
                    className="form-check-input"
                    id="recurring"
                    checked={formData.recurring}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="recurring">
                    Repeat weekly
                  </label>
                </div>
              </div>

              {/* Recurring Until */}
              {formData.recurring && (
                <div className="mb-3">
                  <label className="form-label">Repeat Until</label>
                  <input
                    type="date"
                    name="recurringUntil"
                    className="form-control"
                    value={formData.recurringUntil}
                    onChange={handleChange}
                    min={formData.exceptionDate || new Date().toISOString().split('T')[0]}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {/* Warning for DayOff */}
              {formData.exceptionType === 'DayOff' && (
                <div className="alert alert-warning py-2 mb-0">
                  <small>
                    <span className="material-symbols-outlined me-1" style={{ fontSize: '16px', verticalAlign: 'middle' }}>
                      warning
                    </span>
                    If you have appointments on this day, patients will be notified about the schedule change.
                  </small>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined me-1" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                      save
                    </span>
                    Create Exception
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

export default ScheduleExceptionModal;
