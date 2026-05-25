import React, { useEffect, useMemo, useState } from 'react';
import { doctorService } from '../api/doctorApi';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const formatTime = (value) => {
  if (!value) return 'N/A';
  return String(value).slice(0, 5);
};

export default function DoctorScheduleView({ doctorId }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId) return;
    let mounted = true;

    const loadSchedules = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getDoctorSchedules(doctorId);
        if (mounted) setSchedules(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading doctor schedule:', err);
        if (mounted) {
          setError('Failed to load schedule');
          setSchedules([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSchedules();
    return () => {
      mounted = false;
    };
  }, [doctorId]);

  const schedulesByDay = useMemo(() => {
    const grouped = new Map(DAY_ORDER.map((day) => [day, []]));
    schedules.forEach((schedule) => {
      const day = schedule.dayOfWeek ?? 0;
      grouped.set(day, [...(grouped.get(day) || []), schedule]);
    });
    grouped.forEach((items, day) => {
      grouped.set(day, [...items].sort((left, right) => String(left.startTime).localeCompare(String(right.startTime))));
    });
    return grouped;
  }, [schedules]);

  return (
    <div className="doctor-management-view">
      <div className="doctor-management-toolbar">
        <div>
          <p className="doctor-detail-eyebrow mb-1">Availability</p>
          <h3 className="doctor-management-title">Working Schedule</h3>
        </div>
        <span className="doctor-schedule-note">Read-only in this version</span>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger m-4">{error}</div>
      ) : (
        <div className="doctor-schedule-week">
          {DAY_ORDER.map((day) => {
            const items = schedulesByDay.get(day) || [];
            return (
              <section className="doctor-schedule-day" key={day}>
                <div className="doctor-schedule-day__header">
                  <h4>{DAY_LABELS[day]}</h4>
                  <span>{items.length} shift{items.length === 1 ? '' : 's'}</span>
                </div>

                {items.length ? (
                  <div className="doctor-management-list">
                    {items.map((schedule) => (
                      <article className="doctor-management-list-item" key={schedule.scheduleId}>
                        <div>
                          <strong>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</strong>
                          <p>{schedule.consultationType || 'All consultation types'}</p>
                          <p>{schedule.slotDuration || 30} minute slots</p>
                        </div>
                        <span className={`doctor-schedule-availability ${schedule.available ? 'doctor-schedule-availability--on' : ''}`}>
                          {schedule.available ? 'Available' : 'Off'}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="doctor-schedule-empty">No working shift.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
