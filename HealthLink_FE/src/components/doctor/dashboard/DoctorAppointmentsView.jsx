import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import { doctorService } from '../../../api/doctorApi';
import '../Css/DoctorDashboard.css';

const STATUS_FILTERS = [
  { key: 'All', label: 'All', countKey: 'all' },
  { key: 'Scheduled', label: 'Scheduled', countKey: 'scheduled' },
  { key: 'Completed', label: 'Completed', countKey: 'completed' },
  { key: 'Cancelled', label: 'Cancelled', countKey: 'cancelled' },
];

const toDateInputValue = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDate = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

const getStatusClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'scheduled':
      return 'bg-primary';
    case 'completed':
      return 'bg-success';
    case 'cancelled':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
};

const getTypeIcon = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'video call':
    case 'video':
      return 'videocam';
    case 'audio call':
    case 'audio':
      return 'call';
    case 'chat':
      return 'chat';
    case 'offline':
      return 'local_hospital';
    default:
      return 'event';
  }
};

export default function DoctorAppointmentsView({ doctorId, onViewAppointment }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    let mounted = true;
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getDoctorDailyAppointments(
          doctorId,
          selectedDate,
          selectedStatus,
        );
        if (mounted) {
          setAppointments(data.appointments || []);
          setCounts(data.counts || {});
        }
      } catch (err) {
        console.error('Error fetching daily appointments:', err);
        if (mounted) {
          setError('Failed to load appointments');
          setAppointments([]);
          setCounts({
            all: 0,
            scheduled: 0,
            completed: 0,
            cancelled: 0,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAppointments();
    return () => {
      mounted = false;
    };
  }, [doctorId, selectedDate, selectedStatus]);

  const selectedDateLabel = useMemo(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Selected day';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const handleView = (appointment) => {
    if (onViewAppointment) {
      onViewAppointment(appointment);
      return;
    }
    navigate(`/appointment/${appointment.appointmentID}`);
  };

  return (
    <>
      <div className="doctor-daily-toolbar">
        <div className="doctor-daily-toolbar__main">
          <p className="doctor-detail-eyebrow mb-1">Daily schedule</p>
          <h3 className="doctor-daily-toolbar__title">{selectedDateLabel}</h3>
        </div>

        <div className="doctor-daily-toolbar__controls">
          <div className="btn-group" role="group" aria-label="Change date">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setSelectedDate((current) => shiftDate(current, -1))}
              title="Previous day"
            >
              <i className="bi bi-chevron-left"></i>
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setSelectedDate(toDateInputValue(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setSelectedDate((current) => shiftDate(current, 1))}
              title="Next day"
            >
              <i className="bi bi-chevron-right"></i>
            </Button>
          </div>

          <Form.Control
            aria-label="Select appointment date"
            className="doctor-daily-toolbar__date"
            onChange={(event) => setSelectedDate(event.target.value)}
            type="date"
            value={selectedDate}
          />
        </div>
      </div>

      <div className="doctor-daily-status-tabs">
        {STATUS_FILTERS.map((filter) => (
          <button
            className={`doctor-daily-status-tab ${selectedStatus === filter.key ? 'doctor-daily-status-tab--active' : ''}`}
            key={filter.key}
            onClick={() => setSelectedStatus(filter.key)}
            type="button"
          >
            <span>{filter.label}</span>
            <strong>{counts?.[filter.countKey] ?? 0}</strong>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger m-4">{error}</div>
      ) : appointments.length === 0 ? (
        <div className="doctor-detail-empty">
          <div className="doctor-detail-empty__icon">
            <i className="bi bi-calendar2-check"></i>
          </div>
          <h3 className="doctor-detail-empty__title">No appointments for this day</h3>
          <p className="doctor-detail-empty__description">
            Choose another date or status to review the schedule.
          </p>
        </div>
      ) : (
        <div className="table-responsive doctor-appointments-table-wrap">
          <table className="table table-borderless align-middle mb-0">
            <thead className="table-header">
              <tr>
                <th scope="col" className="px-4 py-3">Time</th>
                <th scope="col" className="px-4 py-3">Patient</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Started</th>
                <th scope="col" className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.appointmentID} className="border-bottom hover-table-row">
                  <td className="px-4 py-4 fw-semibold text-dark" data-label="Time">
                    {new Date(appointment.appointmentTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-4 text-dark" data-label="Patient">
                    {appointment.patient?.fullName || appointment.patientName || 'Unknown Patient'}
                  </td>
                  <td className="px-4 py-4" data-label="Type">
                    <span className={`type-badge ${appointment.consultationType === 'Audio Call' ? 'type-audio' : appointment.consultationType === 'Chat' ? 'type-chat' : 'type-video'}`}>
                      <span className="material-symbols-outlined me-1" style={{ fontSize: '1rem' }}>
                        {getTypeIcon(appointment.consultationType)}
                      </span>
                      {appointment.consultationType || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4" data-label="Status">
                    <span className={`badge ${getStatusClass(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-dark" data-label="Started">
                    {appointment.consultationStartTime ? (
                      new Date(appointment.consultationStartTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      <span className="text-muted">Not yet</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-end" data-label="Actions">
                    {appointment.status !== 'Cancelled' ? (
                      <button
                        className="btn btn-view d-inline-flex align-items-center justify-content-center"
                        onClick={() => handleView(appointment)}
                        type="button"
                      >
                        View
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
