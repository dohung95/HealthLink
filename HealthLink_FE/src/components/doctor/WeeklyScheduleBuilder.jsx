import React, { useState, useMemo } from 'react';
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

const isHomeVisitType = (type) => {
  const t = String(type || '').trim().toLowerCase();
  return t === 'homevisit' || t === 'home visit' || t === 'home-visit' || t === 'home';
};

const SHIFT_LABELS = { MORNING: 'Morning', AFTERNOON: 'Afternoon', EVENING: 'Evening' };

const getTypeIcon = (type) => {
  if (isHomeVisitType(type)) return 'home_health';
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
    case 'online':
      return 'laptop_mac';
    default:
      return 'medical_services';
  }
};

const getTypeLabel = (type) => {
  if (isHomeVisitType(type)) return 'Home visit';
  return type || 'All Types';
};

const formatTime = (time) => {
  if (!time) return '';
  const parts = String(time).split(':');
  return `${parts[0]}:${parts[1]}`;
};

// Generate a temporary ID for pending adds
let tempIdCounter = 0;
const generateTempId = () => `temp_${++tempIdCounter}_${Date.now()}`;

const WeeklyScheduleBuilder = ({
  schedules,
  scheduleData,
  onRefresh,
  appointments = [],
  changeRequests = [],
  loadingRequests = false,
  onRefreshRequests,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingSchedule, setConfirmingSchedule] = useState(false);

  // Change request modal state
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Blocked deletion modal state (when schedule has future appointments)
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');

  // Track pending changes (not yet saved to server)
  const [pendingAdds, setPendingAdds] = useState([]); // New schedules to create
  const [pendingDeletes, setPendingDeletes] = useState([]); // Existing schedule IDs to delete

  // Combine existing schedules with pending changes for display
  const displaySchedules = useMemo(() => {
    // Filter out schedules marked for deletion
    const existing = schedules.filter((s) => !pendingDeletes.includes(s.scheduleId));
    // Add pending new schedules
    return [...existing, ...pendingAdds];
  }, [schedules, pendingAdds, pendingDeletes]);

  const hasChanges = pendingAdds.length > 0 || pendingDeletes.length > 0;

  const getSchedulesForDay = (dayIndex) =>
    displaySchedules
      .filter((schedule) => schedule.dayOfWeek === dayIndex)
      .sort((left, right) => String(left.startTime).localeCompare(String(right.startTime)));

  const handleAdd = (dayIndex) => {
    setEditingSchedule({ dayOfWeek: dayIndex, isNew: true });
    setShowModal(true);
  };

  // Called when user creates schedule(s) in modal.
  // Online returns a single-item array; Home visit can return multiple shifts.
  const handleScheduleCreated = (newScheduleData) => {
    const items = Array.isArray(newScheduleData) ? newScheduleData : [newScheduleData];
    const pending = items.map((data) => ({
      ...data,
      tempId: generateTempId(),
      isPending: true,
      scheduleStatus: 'PENDING',
    }));
    setPendingAdds((prev) => [...prev, ...pending]);
    setShowModal(false);
    setEditingSchedule(null);
    toast.info(`${items.length} schedule(s) added. Click "Save All" to confirm changes.`);
  };

  const handleDelete = (schedule) => {
    if (schedule.isPending) {
      // Remove from pending adds (not saved yet)
      setPendingAdds((prev) => prev.filter((s) => s.tempId !== schedule.tempId));
      toast.info('Pending schedule removed.');
    } else {
      // Mark existing schedule for deletion
      setPendingDeletes((prev) => [...prev, schedule.scheduleId]);
      toast.info('Schedule marked for deletion. Click "Save All" to confirm.');
    }
  };

  const handleUndoDelete = (scheduleId) => {
    setPendingDeletes((prev) => prev.filter((id) => id !== scheduleId));
    toast.info('Deletion cancelled.');
  };

  const handleDiscardChanges = () => {
    setPendingAdds([]);
    setPendingDeletes([]);
    toast.info('All pending changes discarded.');
  };

  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    setSaving(true);

    try {
      // First, process deletions
      for (const scheduleId of pendingDeletes) {
        try {
          await doctorScheduleService.deleteSchedule(scheduleId);
        } catch (err) {
          console.error('Delete error:', err);
          const msg = err.response?.data?.message || 'Failed to delete schedule';

          // Check if error is due to future appointments
          if (msg.includes('future') || msg.includes('appointment') || msg.includes('booked')) {
            setBlockedMessage(msg);
            setShowBlockedModal(true);
          } else {
            toast.error(msg);
          }

          setSaving(false);
          return; // Stop on first error
        }
      }

      // Then, process additions
      for (const schedule of pendingAdds) {
        try {
          await doctorScheduleService.createSchedule({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            slotDuration: schedule.slotDuration,
            maxPatients: schedule.maxPatients,
            consultationType: schedule.consultationType,
            shiftType: schedule.shiftType,
            location: schedule.location,
            notes: schedule.notes,
          });
        } catch (err) {
          console.error('Create error:', err);
          const msg = err.response?.data?.message || 'Failed to create schedule';
          toast.error(msg);
          setSaving(false);
          return; // Stop on first error
        }
      }

      // Clear pending changes
      setPendingAdds([]);
      setPendingDeletes([]);

      toast.success('All changes saved successfully!');
      onRefresh();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Calculate hours for status display (monthly)
  const totalHours = scheduleData?.totalMonthlyHours || 0;
  const requiredHours = scheduleData?.requiredMonthlyHours || 80;
  const doctorStatus = scheduleData?.doctorScheduleStatus || 'PENDING';
  const needsReconfirmation = !!scheduleData?.needsScheduleReconfirmation;

  const handleConfirmMonthlySchedule = async () => {
    try {
      setConfirmingSchedule(true);
      await doctorScheduleService.confirmMonthlySchedule();
      toast.success('Schedule confirmed for this month.');
      onRefresh();
    } catch (err) {
      console.error('Error confirming monthly schedule:', err);
      toast.error(err.response?.data?.message || 'Failed to confirm schedule.');
    } finally {
      setConfirmingSchedule(false);
    }
  };

  return (
    <div>
      {/* Status Banner */}
      <div className={`schedule-status-banner schedule-status-banner--${doctorStatus.toLowerCase()}`} style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg, 0.75rem)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: doctorStatus === 'APPROVED' ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' :
          doctorStatus === 'REJECTED' ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)' :
            'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)',
        border: `1px solid ${doctorStatus === 'APPROVED' ? '#86efac' : doctorStatus === 'REJECTED' ? '#fca5a5' : '#fde047'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{
            fontSize: '1.5rem',
            color: doctorStatus === 'APPROVED' ? '#16a34a' : doctorStatus === 'REJECTED' ? '#dc2626' : '#ca8a04',
          }}>
            {doctorStatus === 'APPROVED' ? 'check_circle' : doctorStatus === 'REJECTED' ? 'cancel' : 'schedule'}
          </span>
          <div>
            <div style={{ fontWeight: 600, color: doctorStatus === 'APPROVED' ? '#166534' : doctorStatus === 'REJECTED' ? '#991b1b' : '#854d0e' }}>
              {doctorStatus === 'APPROVED' ? 'Schedule Approved' :
                doctorStatus === 'REJECTED' ? 'Schedule Not Approved' : 'Schedule Pending'}
            </div>
            <div style={{ fontSize: '0.875rem', color: doctorStatus === 'APPROVED' ? '#15803d' : doctorStatus === 'REJECTED' ? '#b91c1c' : '#a16207' }}>
              {needsReconfirmation
                ? `Your schedule from last month carries over and still meets the ${requiredHours}h/month requirement — please reconfirm to stay visible to patients.`
                : <>
                    {totalHours.toFixed(1)}h / {requiredHours}h per month
                    {doctorStatus !== 'APPROVED' && ` (need ${(requiredHours - totalHours).toFixed(1)}h more)`}
                  </>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className={`doctor-status-badge ${
              doctorStatus === 'APPROVED' ? 'doctor-status-badge--compliant' :
                doctorStatus === 'REJECTED' ? 'doctor-status-badge--non-compliant' :
                  'doctor-status-badge--pending'
            }`}
            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.625rem', gap: '0.375rem' }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                flexShrink: 0,
              }}
            />
            {doctorStatus}
          </span>
          {needsReconfirmation && (
            <button
              type="button"
              onClick={handleConfirmMonthlySchedule}
              disabled={confirmingSchedule}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-md, 0.5rem)',
                border: 'none',
                background: 'linear-gradient(135deg, #0052cc 0%, #0047b3 100%)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: confirmingSchedule ? 'not-allowed' : 'pointer',
                opacity: confirmingSchedule ? 0.7 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                {confirmingSchedule ? 'progress_activity' : 'check_circle'}
              </span>
              {confirmingSchedule ? 'Confirming...' : 'Update Schedule'}
            </button>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {hasChanges && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #93c5fd',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>info</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              You have unsaved changes: {pendingAdds.length} to add, {pendingDeletes.length} to delete
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleDiscardChanges}
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md, 0.5rem)',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Discard
            </button>
            <button
              onClick={handleSaveClick}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-md, 0.5rem)',
                border: 'none',
                background: 'linear-gradient(135deg, #0052cc 0%, #0047b3 100%)',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                {saving ? 'progress_activity' : 'save'}
              </span>
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>
      )}

      {/* Weekly Grid */}
      <div className="row g-3">
        {DAYS.map((day) => {
          const daySchedules = getSchedulesForDay(day.index);
          const isWeekend = day.index === 0 || day.index === 6;

          return (
            <section className="col-12 col-md-6 col-xl" key={day.index} style={{ minWidth: '0' }}>
              <div className={`schedule-day-card ${daySchedules.length === 0 && isWeekend ? 'opacity-75' : ''}`}>
                <div className="schedule-day-card__header">
                  <span className="schedule-day-card__header-title">{day.short}</span>
                  <button className="schedule-day-card__header-add" onClick={() => handleAdd(day.index)} title={`Add schedule for ${day.label}`} type="button">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add_circle</span>
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
                      const isMarkedForDeletion = pendingDeletes.includes(schedule.scheduleId);
                      const isPending = schedule.isPending;

                      return (
                        <article
                          className={`doctor-schedule-item ${isMarkedForDeletion ? 'doctor-schedule-item--deleting' : ''} ${isPending ? 'doctor-schedule-item--pending' : ''}`}
                          key={schedule.scheduleId || schedule.tempId}
                          style={{
                            opacity: isMarkedForDeletion ? 0.5 : 1,
                            background: isPending ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' :
                              isMarkedForDeletion ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)' : undefined,
                            border: isPending ? '1px dashed #86efac' : isMarkedForDeletion ? '1px dashed #fca5a5' : undefined,
                          }}
                        >
                          {isPending && (
                            <div style={{
                              position: 'absolute',
                              top: '0.25rem',
                              right: '0.25rem',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              fontWeight: 600,
                              background: '#16a34a',
                              color: '#fff',
                              textTransform: 'uppercase',
                            }}>New</div>
                          )}
                          {isMarkedForDeletion && (
                            <div style={{
                              position: 'absolute',
                              top: '0.25rem',
                              right: '0.25rem',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              fontWeight: 600,
                              background: '#dc2626',
                              color: '#fff',
                              textTransform: 'uppercase',
                            }}>Deleting</div>
                          )}

                          <div className="doctor-schedule-item__top">
                            <span className="doctor-schedule-item__time">
                              {isHomeVisitType(schedule.consultationType) && schedule.shiftType
                                ? `${SHIFT_LABELS[String(schedule.shiftType).toUpperCase()] || schedule.shiftType} · `
                                : ''}
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </span>
                          </div>

                          <div className="doctor-schedule-item__tags">
                            <span className="doctor-schedule-item__tag">
                              <span className="material-symbols-outlined">{getTypeIcon(schedule.consultationType)}</span>
                              {getTypeLabel(schedule.consultationType)}
                            </span>
                            {!isHomeVisitType(schedule.consultationType) ? (
                              <>
                                <span className="doctor-schedule-item__tag">
                                  <span className="material-symbols-outlined">schedule</span>
                                  {schedule.slotDuration || 30} min
                                </span>
                                <span className="doctor-schedule-item__tag">
                                  <span className="material-symbols-outlined">groups</span>
                                  {schedule.maxPatients || 1} pat/slot
                                </span>
                              </>
                            ) : (
                              <span className="doctor-schedule-item__tag">
                                <span className="material-symbols-outlined">person</span>
                                1 visit/shift
                              </span>
                            )}
                            {schedule.location ? (
                              <span className="doctor-schedule-item__tag">
                                <span className="material-symbols-outlined">location_on</span>
                                {schedule.location}
                              </span>
                            ) : null}
                          </div>

                          <div className="doctor-schedule-item__actions">
                            {isMarkedForDeletion ? (
                              <button
                                className="doctor-schedule-item__action-btn doctor-schedule-item__action-btn--undo"
                                onClick={() => handleUndoDelete(schedule.scheduleId)}
                                title="Undo deletion"
                                type="button"
                                style={{ color: '#0052cc' }}
                              >
                                <span className="material-symbols-outlined">undo</span>
                              </button>
                            ) : (
                              <button
                                className="doctor-schedule-item__action-btn doctor-schedule-item__action-btn--delete"
                                onClick={() => handleDelete(schedule)}
                                title="Delete schedule"
                                type="button"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            )}
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
      </div>

      {/* Future Appointments List */}
      {appointments.length > 0 && (
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          background: '#fff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#0052cc' }}>event_upcoming</span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Future Appointments ({appointments.length})</h3>
            </div>
            {onRefreshRequests && (
              <button
                type="button"
                onClick={onRefreshRequests}
                disabled={loadingRequests}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-md, 0.5rem)',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  cursor: loadingRequests ? 'not-allowed' : 'pointer',
                  opacity: loadingRequests ? 0.6 : 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '0.875rem',
                    animation: loadingRequests ? 'spin 0.8s linear infinite' : 'none',
                  }}
                >
                  refresh
                </span>
                {loadingRequests ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Patient</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Change Request</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => {
                  const appointmentTime = appointment.appointmentTime || appointment.consultationStartTime || appointment.startTime;
                  const changeRequest = changeRequests.find((cr) => cr.appointmentId === appointment.appointmentId);

                  return (
                    <tr key={appointment.appointmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>
                          {appointmentTime ? new Date(appointmentTime).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          }) : '-'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                          {appointmentTime ? new Date(appointmentTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : '-'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{appointment.patientName || appointment.patient?.fullName || 'Unknown'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>#{appointment.appointmentId}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          background: '#f1f5f9',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                            {getTypeIcon(appointment.consultationType || appointment.type)}
                          </span>
                          {appointment.consultationType || appointment.type || 'General'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        {changeRequest ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: changeRequest.status === 'APPROVED' ? '#dcfce7' :
                                changeRequest.status === 'REJECTED' ? '#fef2f2' : '#fefce8',
                              color: changeRequest.status === 'APPROVED' ? '#166534' :
                                changeRequest.status === 'REJECTED' ? '#991b1b' : '#854d0e',
                            }}>
                              {changeRequest.status}
                            </span>
                            {changeRequest.adminReason && (
                              <button
                                onClick={() => toast.info(`Admin: ${changeRequest.adminReason}`)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0.25rem',
                                  borderRadius: '0.25rem',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                }}
                                title="View admin response"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setRequestReason('');
                              setShowChangeRequestModal(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              padding: '0.375rem 0.75rem',
                              borderRadius: 'var(--radius-md, 0.5rem)',
                              border: '1px solid #0052cc',
                              background: '#fff',
                              color: '#0052cc',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>swap_horiz</span>
                            Request Change
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && selectedAppointment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1060,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div
            onClick={() => setShowChangeRequestModal(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          />
          <div style={{
            position: 'relative',
            background: '#fff',
            borderRadius: 'var(--radius-xl, 1rem)',
            padding: '1.5rem',
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#0052cc' }}>swap_horiz</span>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Request Schedule Change</h3>
            </div>

            <div style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md, 0.5rem)',
              background: '#f8fafc',
              marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Appointment</div>
              <div style={{ fontWeight: 500 }}>
                #{selectedAppointment.appointmentId} - {selectedAppointment.patientName || selectedAppointment.patient?.fullName}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                {new Date(selectedAppointment.appointmentTime || selectedAppointment.consultationStartTime || selectedAppointment.startTime).toLocaleString()}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '0.375rem',
              }}>
                Reason for change <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Please explain why you need to change this schedule..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md, 0.5rem)',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowChangeRequestModal(false)}
                disabled={submittingRequest}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 'var(--radius-md, 0.5rem)',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!requestReason.trim()) {
                    toast.error('Please enter a reason for the change request.');
                    return;
                  }
                  setSubmittingRequest(true);
                  try {
                    await doctorScheduleService.createScheduleChangeRequest({
                      appointmentId: selectedAppointment.appointmentId,
                      reason: requestReason.trim(),
                    });
                    toast.success('Change request sent to admin.');
                    setShowChangeRequestModal(false);
                    setSelectedAppointment(null);
                    setRequestReason('');
                    if (onRefreshRequests) onRefreshRequests();
                  } catch (err) {
                    console.error('Error creating change request:', err);
                    toast.error(err.response?.data?.message || 'Failed to send change request');
                  } finally {
                    setSubmittingRequest(false);
                  }
                }}
                disabled={submittingRequest || !requestReason.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: 'var(--radius-md, 0.5rem)',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0052cc 0%, #0047b3 100%)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: submittingRequest ? 'not-allowed' : 'pointer',
                  opacity: submittingRequest || !requestReason.trim() ? 0.7 : 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                  {submittingRequest ? 'progress_activity' : 'send'}
                </span>
                {submittingRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Form Modal - now passes data back instead of calling API */}
      <ScheduleFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSchedule(null);
        }}
        onSuccess={handleScheduleCreated}
        schedule={editingSchedule}
        batchMode={true}
        daySchedules={editingSchedule ? getSchedulesForDay(editingSchedule.dayOfWeek) : []}
      />

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1060,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div
            onClick={() => setShowConfirmDialog(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          />
          <div style={{
            position: 'relative',
            background: '#fff',
            borderRadius: 'var(--radius-xl, 1rem)',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#0052cc' }}>help</span>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Confirm Changes</h3>
            </div>
            <p style={{ margin: '0 0 1rem', color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to save these changes?
            </p>
            <ul style={{ margin: '0 0 1.5rem', paddingLeft: '1.25rem', color: '#64748b', fontSize: '0.875rem' }}>
              {pendingAdds.length > 0 && <li>{pendingAdds.length} schedule(s) will be added</li>}
              {pendingDeletes.length > 0 && <li>{pendingDeletes.length} schedule(s) will be deleted</li>}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 'var(--radius-md, 0.5rem)',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 'var(--radius-md, 0.5rem)',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0052cc 0%, #0047b3 100%)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Yes, Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Deletion Modal - shown when schedule has future appointments */}
      {showBlockedModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1070,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div
            onClick={() => setShowBlockedModal(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          />
          <div style={{
            position: 'relative',
            background: '#fff',
            borderRadius: 'var(--radius-xl, 1rem)',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            {/* Warning Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: '2.5rem',
                color: '#dc2626',
              }}>
                event_busy
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              margin: '0 0 1rem',
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#1e293b',
            }}>
              Cannot Delete Schedule
            </h3>

            {/* Message */}
            <p style={{
              margin: '0 0 1.5rem',
              fontSize: '1rem',
              color: '#475569',
              lineHeight: 1.6,
            }}>
              {blockedMessage}
            </p>

            {/* Hint */}
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md, 0.5rem)',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#0052cc', flexShrink: 0 }}>
                  lightbulb
                </span>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  <strong style={{ color: '#334155' }}>What to do:</strong>
                  <br />
                  Use the "Request Change" button in the appointments list below to request admin to reschedule or transfer these appointments first.
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowBlockedModal(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 2rem',
                borderRadius: 'var(--radius-md, 0.5rem)',
                border: 'none',
                background: 'linear-gradient(135deg, #0052cc 0%, #0047b3 100%)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '150px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>check</span>
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduleBuilder;
