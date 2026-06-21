import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { doctorService } from '@api/doctorApi';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import NextAppointmentCard from '@components/doctor/NextAppointmentCard';
import AppointmentCard from '@components/doctor/AppointmentCard';
import TodayTimeline from '@components/doctor/TodayTimeline';
import { DoctorSkeletonList } from '@components/doctor/DoctorSkeleton';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import {
  isSameLocalDay,
  isActionableAppointment,
  getPatientName,
  getVisitReason,
  getStatusKey,
  parseAppointmentDate,
  formatDateLabel,
  toDateInputValue,
} from '@utils/doctor/appointmentHelpers';

const STATUS_FILTERS = [
  { key: 'SCHEDULED', label: 'Scheduled', countKey: 'scheduled' },
  { key: 'IN_CONSULTATION', label: 'In Progress', countKey: 'inprogress' },
  { key: 'COMPLETED', label: 'Completed', countKey: 'completed' },
  { key: 'CANCELLED', label: 'Cancelled', countKey: 'cancelled' },
];

export default function DoctorAppointmentsView() {
  const navigate = useNavigate();
  const { doctorId, appointmentsRefreshKey: refreshKey } = useOutletContext();
  const [appointments, setAppointments] = useState([]);
  const [counts, setCounts] = useState({
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedStatus, setSelectedStatus] = useState('SCHEDULED');
  const [searchTerm, setSearchTerm] = useState('');
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
  }, [doctorId, selectedDate, selectedStatus, refreshKey]);

  const selectedDateLabel = useMemo(() => formatDateLabel(selectedDate), [selectedDate]);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((left, right) => {
        const leftTime = parseAppointmentDate(left)?.getTime() || 0;
        const rightTime = parseAppointmentDate(right)?.getTime() || 0;
        return leftTime - rightTime;
      }),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sortedAppointments;

    return sortedAppointments.filter((appointment) => {
      const haystack = [
        getPatientName(appointment),
        getVisitReason(appointment),
        appointment?.consultationType,
        appointment?.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm, sortedAppointments]);

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const selected = new Date(`${selectedDate}T00:00:00`);
    const sameDay = !Number.isNaN(selected.getTime()) && isSameLocalDay(selected, now);
    const candidates = sortedAppointments.filter(isActionableAppointment);
    if (!candidates.length) return null;

    const inProgress = candidates.find((appointment) => getStatusKey(appointment) === 'inprogress');
    if (inProgress) return inProgress;

    if (sameDay) {
      return candidates.find((appointment) => {
        const appointmentDate = parseAppointmentDate(appointment);
        return appointmentDate && appointmentDate >= now;
      }) || candidates[0];
    }

    return candidates[0];
  }, [selectedDate, sortedAppointments]);

  const handleView = (appointment) => {
    navigate(`/doctor/appointments/${appointment.appointmentID || appointment.appointmentId}`);
  };

  const ITEMS_PER_PAGE = 5;
  const [tabPage, setTabPage] = useState(1);

  useEffect(() => { setTabPage(1); }, [selectedDate, selectedStatus, searchTerm]);

  return (
    <div className="doctor-content-section">

      <div className="doctor-asymmetric-grid">
          <div className="d-flex flex-column gap-4">
          <NextAppointmentCard appointment={nextAppointment} onView={handleView} selectedDate={selectedDate} />

          <div className="d-flex flex-column gap-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 bg-surface-container-lowest border border-surface-border rounded-4 p-2">
              <div className="doctor-filter-chips">
                {STATUS_FILTERS.map((filter) => {
                  const isActive = selectedStatus === filter.key;
                  return (
                    <button
                      className={`doctor-filter-chip ${isActive ? 'doctor-filter-chip--active' : ''}`}
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="position-relative w-100" style={{maxWidth:'13rem'}}>
                <span className="material-symbols-outlined position-absolute top-50 start-0 translate-middle-y text-text-muted" style={{left:'0.625rem',fontSize:'0.875rem'}}>search</span>
                <input
                  className="form-control form-control-sm ps-4"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search patient..."
                  type="text"
                  value={searchTerm}
                  style={{height:'2rem',borderRadius:'0.5rem',fontSize:'0.8125rem',borderColor:'var(--border)'}}
                />
              </div>
            </div>

            {loading ? (
              <div style={{minHeight:'180px'}}>
                <DoctorSkeletonList rows={4} />
              </div>
            ) : error ? (
              <div style={{minHeight:'180px'}}>
                <DoctorErrorState message={error} />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div style={{minHeight:'180px'}}>
                <DoctorEmptyState
                  icon="calendar_today"
                  title="No appointments for this day"
                  description="Choose another date or status to review the schedule."
                />
              </div>
            ) : (
              (() => {
                const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
                const startIndex = (tabPage - 1) * ITEMS_PER_PAGE;
                const pageItems = filteredAppointments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
                return (
                  <div className="d-flex flex-column" style={{gap:'0.625rem',minHeight:'180px'}}>
                    {pageItems.map((appointment, index) => (
                      <div key={appointment.appointmentID || appointment.appointmentId} className="doctor-stagger-item" style={{ '--stagger-index': startIndex + index }}>
                        <AppointmentCard appointment={appointment} onView={handleView} />
                      </div>
                    ))}
                    {totalPages > 1 && (
                      <div className="tab-pagination">
                        <span className="tab-pagination__info">Page {tabPage} of {totalPages}</span>
                        <div className="tab-pagination__nav">
                          <button type="button" className="tab-pagination__btn" disabled={tabPage <= 1} onClick={() => setTabPage((p) => Math.max(1, p - 1))}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>chevron_left</span>
                            Prev
                          </button>
                          <button type="button" className="tab-pagination__btn" disabled={tabPage >= totalPages} onClick={() => setTabPage((p) => Math.min(totalPages, p + 1))}>
                            Next
                            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>chevron_right</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        <aside className="doctor-asymmetric-grid__divider">
          <TodayTimeline appointments={sortedAppointments} loading={loading} selectedDate={selectedDate} onView={handleView} onDateChange={setSelectedDate} />
        </aside>
      </div>
    </div>
  );
}
