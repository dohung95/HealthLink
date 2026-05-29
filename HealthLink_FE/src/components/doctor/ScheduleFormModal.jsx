import React, { useEffect, useState } from 'react';
import { doctorScheduleService } from '@api/doctorApi';

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
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.9)' }}>
              {schedule?.isNew ? 'add_circle' : 'edit_calendar'}
            </span>
            {schedule?.isNew ? 'Add Schedule' : 'Edit Schedule'}
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
                Day of Week
              </label>
              <select
                className="form-select"
                disabled={loading}
                name="dayOfWeek"
                onChange={handleChange}
                value={formData.dayOfWeek}
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
              >
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </div>

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
                    Slot Duration
                  </label>
                  <select
                    className="form-select"
                    disabled={loading}
                    name="slotDuration"
                    onChange={handleChange}
                    value={formData.slotDuration}
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
                  >
                    {SLOT_DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>{duration} mins</option>
                    ))}
                  </select>
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
                    Max Patients per Slot
                  </label>
                  <input
                    className="form-control"
                    disabled={loading}
                    max="10"
                    min="1"
                    name="maxPatients"
                    onChange={handleChange}
                    type="number"
                    value={formData.maxPatients}
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
                Consultation Type
              </label>
              <select
                className="form-select"
                disabled={loading}
                name="consultationType"
                onChange={handleChange}
                value={formData.consultationType}
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
              >
                <option value="">All Types</option>
                {CONSULTATION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
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
                Location
              </label>
              <input
                className="form-control"
                disabled={loading}
                name="location"
                onChange={handleChange}
                placeholder="Room number, clinic address..."
                type="text"
                value={formData.location}
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
                Notes
              </label>
              <textarea
                className="form-control"
                disabled={loading}
                name="notes"
                onChange={handleChange}
                placeholder="Any additional notes..."
                value={formData.notes}
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
              {loading ? 'Saving...' : schedule?.isNew ? 'Create Schedule' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleFormModal;
