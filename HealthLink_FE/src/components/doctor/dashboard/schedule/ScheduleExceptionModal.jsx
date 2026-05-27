import React, { useEffect, useState } from 'react';
import { doctorScheduleService } from '../../../../api/doctorApi';

const EXCEPTION_TYPES = [
  { value: 'DayOff', label: 'Day Off (Not Available)', help: 'You will not be available on this day' },
  { value: 'Modified', label: 'Modified Hours', help: 'Replace your regular hours with different hours' },
  { value: 'AddSlot', label: 'Add Extra Slot', help: 'Add extra availability outside regular hours' },
];

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const createInitialState = (selectedDate) => ({
  exceptionDate: toDateInputValue(selectedDate),
  exceptionType: 'DayOff',
  startTime: '09:00',
  endTime: '17:00',
  reason: '',
  recurring: false,
  recurringUntil: '',
});

const ScheduleExceptionModal = ({ isOpen, onClose, selectedDate, onSuccess }) => {
  const [formData, setFormData] = useState(() => createInitialState(selectedDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(createInitialState(selectedDate));
      setError('');
    }
  }, [selectedDate, isOpen]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validateForm()) return;

    try {
      setLoading(true);
      const requestData = {
        exceptionDate: formData.exceptionDate,
        exceptionType: formData.exceptionType,
        reason: formData.reason,
        recurring: formData.recurring,
        recurringUntil: formData.recurring ? formData.recurringUntil : null,
      };

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

  if (!isOpen) return null;

  const selectedType = EXCEPTION_TYPES.find((type) => type.value === formData.exceptionType) || EXCEPTION_TYPES[0];
  const showTimeFields = ['Modified', 'AddSlot'].includes(formData.exceptionType);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 d-flex align-items-center justify-content-center bg-black/50 p-4" onClick={onClose}>
      <section className="max-h-92vh w-100 max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="d-flex align-items-center justify-content-between border-bottom border-surface-border px-5 py-4">
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">event_busy</span>
            <h2 className="mb-0 text-lg fw-bold text-text-main">Add Schedule Exception</h2>
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
              <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Date</span>
              <input className="form-control h-10 rounded border border-surface-border px-3 text-sm focus-ring-primary" disabled={loading} min={today} name="exceptionDate" onChange={handleChange} required type="date" value={formData.exceptionDate} />
            </label>

            <label className="d-grid gap-1">
              <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Exception Type</span>
              <select className="form-select h-10 rounded border border-surface-border bg-white px-3 text-sm focus-ring-primary" disabled={loading} name="exceptionType" onChange={handleChange} value={formData.exceptionType}>
                {EXCEPTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <span className="text-xs text-text-muted">{selectedType.help}</span>
            </label>

            {showTimeFields ? (
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
            ) : null}

            <label className="d-grid gap-1">
              <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Reason</span>
              <textarea className="form-control min-h-20 rounded border border-surface-border px-3 py-2 text-sm focus-ring-primary" disabled={loading} name="reason" onChange={handleChange} placeholder="e.g., Personal leave, conference attendance, emergency..." required value={formData.reason} />
            </label>

            <label className="d-flex align-items-center gap-2 text-sm fw-semibold text-text-main">
              <input checked={formData.recurring} className="h-4 w-4 rounded border-surface-border text-primary-container" disabled={loading} name="recurring" onChange={handleChange} type="checkbox" />
              Repeat weekly
            </label>

            {formData.recurring ? (
              <label className="d-grid gap-1">
                <span className="text-xs fw-bold text-uppercase tracking-wide text-text-muted">Repeat Until</span>
                <input className="form-control h-10 rounded border border-surface-border px-3 text-sm focus-ring-primary" disabled={loading} min={formData.exceptionDate || today} name="recurringUntil" onChange={handleChange} required type="date" value={formData.recurringUntil} />
              </label>
            ) : null}

            {formData.exceptionType === 'DayOff' ? (
              <div className="d-flex gap-2 rounded border border-warning/30 bg-warning/10 p-3 text-sm text-text-main">
                <span className="material-symbols-outlined text-18px text-warning">warning</span>
                <span>If you have appointments on this day, patients will be notified about the schedule change.</span>
              </div>
            ) : null}
          </div>

          <div className="d-flex justify-content-end gap-3 border-top border-surface-border px-5 py-4">
            <button className="btn rounded border border-surface-border px-4 py-2 text-sm fw-semibold text-text-main hover:bg-surface-container" disabled={loading} onClick={onClose} type="button">
              Cancel
            </button>
            <button className="btn d-inline-flex align-items-center gap-2 rounded bg-primary-container px-4 py-2 text-sm fw-semibold text-white hover:bg-primary disabled:opacity-60" disabled={loading} type="submit">
              <span className="material-symbols-outlined text-18px">{loading ? 'progress_activity' : 'save'}</span>
              {loading ? 'Creating...' : 'Create Exception'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ScheduleExceptionModal;
