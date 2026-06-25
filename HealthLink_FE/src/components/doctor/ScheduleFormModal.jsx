import React, { useEffect, useMemo, useState } from 'react';
import { doctorScheduleService } from '@api/doctorApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_DURATIONS = [15, 20, 30, 45, 60];

// Phải khớp với khung giờ ở backend (DoctorScheduleServiceImpl)
const SHIFT_WINDOWS = {
  MORNING: { label: 'Morning', start: '07:00', end: '10:30' },
  AFTERNOON: { label: 'Afternoon', start: '13:00', end: '17:30' },
  EVENING: { label: 'Evening', start: '19:00', end: '21:00' },
};
const SHIFT_ORDER = ['MORNING', 'AFTERNOON', 'EVENING'];

const HOME_VISIT_HINT =
  'Home visits take travel time. Plan shifts carefully so a morning home visit running late '
  + 'does not overlap an afternoon online appointment — keep care within each shift window.';

const formatTimeForInput = (time) => {
  if (!time) return '09:00';
  const parts = String(time).split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const minutesBetween = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

// Kiểm tra [start, end] có nằm gọn trong MỘT khung cho phép không.
const fitsOneWindow = (start, end) =>
  SHIFT_ORDER.some((key) => {
    const w = SHIFT_WINDOWS[key];
    return start >= w.start && end <= w.end;
  });

const isHomeVisitType = (type) => {
  const t = String(type || '').trim().toLowerCase();
  return t === 'homevisit' || t === 'home visit' || t === 'home-visit' || t === 'home';
};

// Chuẩn hóa "07:00:00" / "7:0" -> "07:00" để so sánh chuỗi an toàn.
const toHM = (time) => {
  if (!time) return '';
  const [h = '00', m = '00'] = String(time).split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

// [aStart, aEnd) giao [bStart, bEnd) ? (chuỗi "HH:MM" so sánh được trực tiếp)
const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const initialOnlineData = {
  startTime: '09:00',
  endTime: '10:00',
  slotDuration: 30,
  maxPatients: 1,
  location: '',
  notes: '',
};

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted, #64748b)',
  marginBottom: '0.375rem',
  display: 'block',
};

const inputStyle = {
  border: '1.5px solid var(--border, #e2e8f0)',
  borderRadius: 'var(--radius-md, 0.625rem)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  color: 'var(--text-primary, #0f172a)',
  background: '#fff',
  minHeight: '42px',
  width: '100%',
  boxSizing: 'border-box',
};

const ScheduleFormModal = ({ isOpen, onClose, schedule, onSuccess, batchMode = false, daySchedules = [] }) => {
  const [scheduleKind, setScheduleKind] = useState('Online'); // 'Online' | 'HomeVisit'
  const [onlineData, setOnlineData] = useState(initialOnlineData);
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [homeVisitMeta, setHomeVisitMeta] = useState({ location: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dayOfWeek = schedule?.dayOfWeek ?? 0;

  // Các ca home-visit đã tồn tại trong ngày -> disable để không thêm trùng.
  const usedShifts = useMemo(() => {
    return new Set(
      (daySchedules || [])
        .filter((s) => isHomeVisitType(s.consultationType) && s.shiftType)
        .map((s) => String(s.shiftType).toUpperCase())
    );
  }, [daySchedules]);

  useEffect(() => {
    if (!schedule) return;
    // Reset mỗi lần mở modal cho một ngày mới
    setError('');
    if (schedule.isNew) {
      setScheduleKind('Online');
      setOnlineData(initialOnlineData);
      setSelectedShifts([]);
      setHomeVisitMeta({ location: '', notes: '' });
    } else if (isHomeVisitType(schedule.consultationType)) {
      setScheduleKind('HomeVisit');
      setSelectedShifts(schedule.shiftType ? [String(schedule.shiftType).toUpperCase()] : []);
      setHomeVisitMeta({ location: schedule.location || '', notes: schedule.notes || '' });
    } else {
      setScheduleKind('Online');
      setOnlineData({
        startTime: formatTimeForInput(schedule.startTime),
        endTime: formatTimeForInput(schedule.endTime),
        slotDuration: schedule.slotDuration || 30,
        maxPatients: schedule.maxPatients || 1,
        location: schedule.location || '',
        notes: schedule.notes || '',
      });
    }
  }, [schedule]);

  const handleOnlineChange = (event) => {
    const { name, value } = event.target;
    setOnlineData((current) => ({
      ...current,
      [name]: ['slotDuration', 'maxPatients'].includes(name) ? parseInt(value, 10) : value,
    }));
  };

  const toggleShift = (shiftKey) => {
    if (usedShifts.has(shiftKey)) return;
    setSelectedShifts((current) =>
      current.includes(shiftKey)
        ? current.filter((key) => key !== shiftKey)
        : [...current, shiftKey]
    );
  };

  // Trả về lịch hiện có trong ngày bị chồng giờ với payload, hoặc null nếu không.
  const findOverlap = (payload) => {
    const ps = toHM(payload.startTime);
    const pe = toHM(payload.endTime);
    return (daySchedules || []).find((s) =>
      rangesOverlap(ps, pe, toHM(s.startTime), toHM(s.endTime))
    );
  };

  const buildPayloads = () => {
    if (scheduleKind === 'HomeVisit') {
      if (selectedShifts.length === 0) {
        setError('Please select at least one shift (Morning / Afternoon / Evening).');
        return null;
      }
      const payloads = SHIFT_ORDER
        .filter((key) => selectedShifts.includes(key))
        .map((key) => {
          const w = SHIFT_WINDOWS[key];
          return {
            dayOfWeek,
            consultationType: 'HomeVisit',
            shiftType: key,
            startTime: w.start,
            endTime: w.end,
            slotDuration: minutesBetween(w.start, w.end),
            maxPatients: 1,
            location: homeVisitMeta.location,
            notes: homeVisitMeta.notes,
          };
        });

      for (const payload of payloads) {
        const clash = findOverlap(payload);
        if (clash) {
          setError(`The ${SHIFT_WINDOWS[payload.shiftType].label} shift (${toHM(payload.startTime)}–${toHM(payload.endTime)}) overlaps an existing schedule (${toHM(clash.startTime)}–${toHM(clash.endTime)}) on this day.`);
          return null;
        }
      }
      return payloads;
    }

    // Online
    const { startTime, endTime, slotDuration, maxPatients, location, notes } = onlineData;
    if (startTime >= endTime) {
      setError('Start time must be before end time');
      return null;
    }
    if (!fitsOneWindow(startTime, endTime)) {
      setError('Online hours must fit within one shift window: Morning 07:00–10:30, Afternoon 13:00–17:30, or Evening 19:00–21:00.');
      return null;
    }
    if (slotDuration < 10 || slotDuration > 120) {
      setError('Slot duration must be between 10 and 120 minutes');
      return null;
    }
    if (maxPatients < 1 || maxPatients > 10) {
      setError('Max patients must be between 1 and 10');
      return null;
    }
    const onlinePayload = {
      dayOfWeek,
      consultationType: 'Online',
      shiftType: null,
      startTime,
      endTime,
      slotDuration,
      maxPatients,
      location,
      notes,
    };
    const clash = findOverlap(onlinePayload);
    if (clash) {
      setError(`This time range (${toHM(startTime)}–${toHM(endTime)}) overlaps an existing schedule (${toHM(clash.startTime)}–${toHM(clash.endTime)}) on this day.`);
      return null;
    }
    return [onlinePayload];
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const payloads = buildPayloads();
    if (!payloads) return;

    if (batchMode) {
      onSuccess(payloads);
      return;
    }

    try {
      setLoading(true);
      for (const payload of payloads) {
        await doctorScheduleService.createSchedule(payload);
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

  const submitLabel = loading
    ? 'Saving...'
    : batchMode
      ? (scheduleKind === 'HomeVisit' ? `Add ${selectedShifts.length || ''} shift(s)`.trim() : 'Add Schedule')
      : 'Create Schedule';

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
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 0 }}
      />
      <div
        className="modal-modern"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '600px',
          maxHeight: 'calc(100dvh - 2rem)',
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
              add_circle
            </span>
            Add Schedule — {DAYS[dayOfWeek]}
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
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
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

            {/* Visit type toggle */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Visit Type</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[
                  { key: 'Online', label: 'Online consultation', icon: 'laptop_mac' },
                  { key: 'HomeVisit', label: 'Home visit', icon: 'home_health' },
                ].map((opt) => {
                  const active = scheduleKind === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setScheduleKind(opt.key); setError(''); }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md, 0.625rem)',
                        border: active ? '1.5px solid var(--primary, #0052cc)' : '1.5px solid var(--border, #e2e8f0)',
                        background: active ? 'rgba(0,82,204,0.06)' : '#fff',
                        color: active ? 'var(--primary, #0052cc)' : 'var(--text-secondary, #475569)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {scheduleKind === 'HomeVisit' ? (
              <>
                {/* Hint with exclamation icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  marginBottom: '1.25rem',
                  borderRadius: 'var(--radius-md, 0.625rem)',
                  background: 'rgba(202,138,4,0.08)',
                  border: '1px solid rgba(202,138,4,0.25)',
                  color: '#854d0e',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#ca8a04', flexShrink: 0 }}>
                    warning
                  </span>
                  <span>{HOME_VISIT_HINT}</span>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>Shifts (each shift = one bookable home visit)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {SHIFT_ORDER.map((key) => {
                      const w = SHIFT_WINDOWS[key];
                      const checked = selectedShifts.includes(key);
                      const disabled = usedShifts.has(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleShift(key)}
                          title={disabled
                            ? 'This shift is already scheduled for this day'
                            : `${w.label} — suggested window ${w.start}–${w.end}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 0.875rem',
                            borderRadius: 'var(--radius-md, 0.625rem)',
                            border: checked ? '1.5px solid var(--primary, #0052cc)' : '1.5px solid var(--border, #e2e8f0)',
                            background: disabled ? '#f1f5f9' : checked ? 'rgba(0,82,204,0.06)' : '#fff',
                            color: disabled ? '#94a3b8' : 'var(--text-primary, #0f172a)',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{
                            fontSize: '1.25rem',
                            color: checked ? 'var(--primary, #0052cc)' : '#94a3b8',
                          }}>
                            {checked ? 'check_box' : 'check_box_outline_blank'}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem', flex: 1 }}>{w.label}</span>
                          <span
                            className="material-symbols-outlined"
                            title={`Recommended care window: ${w.start}–${w.end}. ${HOME_VISIT_HINT}`}
                            style={{ fontSize: '1.125rem', color: '#ca8a04' }}
                          >
                            error
                          </span>
                          {disabled ? (
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Added</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    disabled={loading}
                    value={homeVisitMeta.notes}
                    onChange={(e) => setHomeVisitMeta((m) => ({ ...m, notes: e.target.value }))}
                    placeholder="Any notes for these home visit shifts..."
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Online window hint */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  marginBottom: '1.25rem',
                  borderRadius: 'var(--radius-md, 0.625rem)',
                  background: 'rgba(0,82,204,0.05)',
                  border: '1px solid rgba(0,82,204,0.18)',
                  color: '#1e40af',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#0052cc', flexShrink: 0 }}>
                    info
                  </span>
                  <span>Working hours must fit within one shift window: Morning 07:00–10:30, Afternoon 13:00–17:30, or Evening 19:00–21:00.</span>
                </div>

                <div className="row g-3" style={{ marginBottom: '1.25rem' }}>
                  <div className="col-12 col-sm-6">
                    <label style={labelStyle}>Start Time</label>
                    <input
                      className="form-control"
                      disabled={loading}
                      name="startTime"
                      onChange={handleOnlineChange}
                      required
                      type="time"
                      value={onlineData.startTime}
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label style={labelStyle}>End Time</label>
                    <input
                      className="form-control"
                      disabled={loading}
                      name="endTime"
                      onChange={handleOnlineChange}
                      required
                      type="time"
                      value={onlineData.endTime}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="row g-3" style={{ marginBottom: '1.25rem' }}>
                  <div className="col-12 col-sm-6">
                    <label style={labelStyle}>Slot Duration</label>
                    <select
                      className="form-select"
                      disabled={loading}
                      name="slotDuration"
                      onChange={handleOnlineChange}
                      value={onlineData.slotDuration}
                      style={inputStyle}
                    >
                      {SLOT_DURATIONS.map((duration) => (
                        <option key={duration} value={duration}>{duration} mins</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label style={labelStyle}>Max Patients per Slot</label>
                    <input
                      className="form-control"
                      disabled={loading}
                      max="10"
                      min="1"
                      name="maxPatients"
                      onChange={handleOnlineChange}
                      type="number"
                      value={onlineData.maxPatients}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>Location</label>
                  <input
                    className="form-control"
                    disabled={loading}
                    name="location"
                    onChange={handleOnlineChange}
                    placeholder="Room number, clinic address..."
                    type="text"
                    value={onlineData.location}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 0 }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    className="form-control"
                    disabled={loading}
                    name="notes"
                    onChange={handleOnlineChange}
                    placeholder="Any additional notes..."
                    value={onlineData.notes}
                    style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </>
            )}
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
              opacity: loading ? 0.5 : 1,
            }}
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
              boxShadow: '0 2px 8px rgba(0,82,204,0.25)',
              opacity: loading ? 0.5 : 1,
            }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                {loading ? 'progress_activity' : 'add'}
              </span>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleFormModal;
