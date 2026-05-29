import React, { useEffect, useState } from 'react';
import { doctorScheduleService } from '../../../../api/doctorApi';

const EXCEPTION_TYPES = [
  { value: 'DayOff', label: 'Day Off', help: 'Not available all day', icon: 'block' },
  { value: 'Modified', label: 'Modified', help: 'Change regular hours', icon: 'schedule' },
  { value: 'AddSlot', label: 'Extra Slot', help: 'Add time outside hours', icon: 'add_circle' },
];

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  const selectExceptionType = (value) => {
    setFormData((current) => ({ ...current, exceptionType: value }));
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

  const showTimeFields = ['Modified', 'AddSlot'].includes(formData.exceptionType);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1050,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 0,
        }}
      />
      <div
        className="modal-modern"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '600px',
          maxHeight: 'calc(100vh - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          borderRadius: 'var(--radius-xl, 1.25rem)',
          boxShadow: '0 25px 60px rgba(11,24,43,0.18)',
          animation: 'modalFadeIn 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-light, #edf2f7)',
          background: 'linear-gradient(135deg, var(--primary, #0052cc) 0%, #0047b3 100%)',
        }}>
          <h5 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            margin: 0,
            fontSize: '1.0625rem',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.01em',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.9)' }}>event_busy</span>
            Add Schedule Exception
          </h5>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            style={{
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: 'var(--radius-md, 0.625rem)',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
          }}>
            {error ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.8125rem',
                borderRadius: 'var(--radius-md, 0.625rem)',
                color: '#dc2626',
                backgroundColor: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
              }} role="alert">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>error</span>
                {error}
              </div>
            ) : null}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #64748b)',
                marginBottom: '0.375rem',
                display: 'block',
              }}>
                Date
              </label>
              <input
                className="form-control"
                disabled={loading}
                min={today}
                name="exceptionDate"
                onChange={handleChange}
                required
                type="date"
                value={formData.exceptionDate}
                style={{
                  border: '1.5px solid var(--border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 0.625rem)',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary, #0f172a)',
                  background: '#fff',
                  minHeight: '42px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #64748b)',
                marginBottom: '0.375rem',
                display: 'block',
              }}>
                Exception Type
              </label>
              <div className="exception-type-group">
                {EXCEPTION_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className={`exception-type-card ${formData.exceptionType === type.value ? 'exception-type-card--active' : ''}`}
                    onClick={() => selectExceptionType(type.value)}
                  >
                    <div className="exception-type-card__check">
                      <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>check</span>
                    </div>
                    <span className="material-symbols-outlined exception-type-card__icon">{type.icon}</span>
                    <span className="exception-type-card__label">{type.label}</span>
                    <p className="exception-type-card__help">{type.help}</p>
                  </div>
                ))}
              </div>
            </div>

            {showTimeFields ? (
              <div className="row g-3" style={{ marginBottom: '1.25rem' }}>
                <div className="col-12 col-sm-6">
                  <div style={{ marginBottom: 0 }}>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted, #64748b)',
                      marginBottom: '0.375rem',
                      display: 'block',
                    }}>
                      Start Time
                    </label>
                    <input
                      className="form-control"
                      disabled={loading}
                      name="startTime"
                      onChange={handleChange}
                      required
                      type="time"
                      value={formData.startTime}
                      style={{
                        border: '1.5px solid var(--border, #e2e8f0)',
                        borderRadius: 'var(--radius-md, 0.625rem)',
                        padding: '0.625rem 0.875rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary, #0f172a)',
                        background: '#fff',
                        minHeight: '42px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <div style={{ marginBottom: 0 }}>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted, #64748b)',
                      marginBottom: '0.375rem',
                      display: 'block',
                    }}>
                      End Time
                    </label>
                    <input
                      className="form-control"
                      disabled={loading}
                      name="endTime"
                      onChange={handleChange}
                      required
                      type="time"
                      value={formData.endTime}
                      style={{
                        border: '1.5px solid var(--border, #e2e8f0)',
                        borderRadius: 'var(--radius-md, 0.625rem)',
                        padding: '0.625rem 0.875rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary, #0f172a)',
                        background: '#fff',
                        minHeight: '42px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #64748b)',
                marginBottom: '0.375rem',
                display: 'block',
              }}>
                Reason
              </label>
              <textarea
                className="form-control"
                disabled={loading}
                name="reason"
                onChange={handleChange}
                placeholder="e.g., Personal leave, conference attendance, emergency..."
                required
                value={formData.reason}
                style={{
                  border: '1.5px solid var(--border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 0.625rem)',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary, #0f172a)',
                  background: '#fff',
                  minHeight: '90px',
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md, 0.625rem)',
                background: 'var(--surface-muted, #f8fafc)',
                border: '1px solid var(--border-light, #edf2f7)',
                cursor: 'pointer',
                userSelect: 'none',
              }}>
                <input
                  checked={formData.recurring}
                  className="form-check-input"
                  disabled={loading}
                  name="recurring"
                  onChange={handleChange}
                  type="checkbox"
                  style={{
                    width: '2.25rem',
                    height: '1.25rem',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                />
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                  cursor: 'pointer',
                }}>
                  Repeat weekly
                </span>
              </label>
            </div>

            {formData.recurring ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted, #64748b)',
                  marginBottom: '0.375rem',
                  display: 'block',
                }}>
                  Repeat Until
                </label>
                <input
                  className="form-control"
                  disabled={loading}
                  min={formData.exceptionDate || today}
                  name="recurringUntil"
                  onChange={handleChange}
                  required
                  type="date"
                  value={formData.recurringUntil}
                  style={{
                    border: '1.5px solid var(--border, #e2e8f0)',
                    borderRadius: 'var(--radius-md, 0.625rem)',
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary, #0f172a)',
                    background: '#fff',
                    minHeight: '42px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : null}

            {formData.exceptionType === 'DayOff' ? (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md, 0.625rem)',
                background: 'rgba(217,119,6,0.08)',
                border: '1px solid rgba(217,119,6,0.2)',
                fontSize: '0.8125rem',
                color: 'var(--text-primary, #0f172a)',
                lineHeight: 1.5,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--warning, #d97706)', flexShrink: 0 }}>warning</span>
                <span>If you have appointments on this day, patients will be notified about the schedule change.</span>
              </div>
            ) : null}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-light, #edf2f7)',
            background: 'var(--surface-muted, #f8fafc)',
          }}>
            <button type="button" disabled={loading} onClick={onClose} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md, 0.625rem)',
              border: '1.5px solid var(--border, #e2e8f0)',
              background: '#fff',
              color: 'var(--text-secondary, #475569)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'var(--surface-hover, #f1f4f8)'; e.currentTarget.style.color = 'var(--text-primary, #0f172a)'; } }}
            onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; } }}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md, 0.625rem)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary, #0052cc) 0%, #0047b3 100%)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,82,204,0.25)',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,82,204,0.35)'; } }}
            onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,82,204,0.25)'; } }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                {loading ? 'progress_activity' : 'save'}
              </span>
              {loading ? 'Creating...' : 'Create Exception'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleExceptionModal;
