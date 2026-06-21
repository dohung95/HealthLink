import { useEffect, useMemo, useState } from 'react';

const DateTimeStep = ({
  date,
  setDate,
  onChangeDate,
  slots,
  selectedSlot,
  onSelectSlot,
  onClearSlot,
  loadingSlots,
  onBack,
  onNext,
  doctorSchedules = [],
  maxDate,
  consultationType,
}) => {
  const [weekIndex, setWeekIndex] = useState(0);
  const isHomeVisit = consultationType === 'HomeVisit';


  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toDateValue = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const isSameDate = (a, b) => {
    return toDateValue(a) === toDateValue(b);
  };

  const getStartOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getMondayOfWeek = (baseDate) => {
    const date = new Date(baseDate);
    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + diffToMonday);
    return date;
  };

  const workingDaySet = useMemo(() => {
    return new Set(
      (doctorSchedules || [])
        .filter((schedule) => schedule.available !== false)
        .map((schedule) => Number(schedule.dayOfWeek))
    );
  }, [doctorSchedules]);

  const shouldFilterByDoctorSchedule = !isHomeVisit && workingDaySet.size > 0;


  const buildWeekOptions = (targetWeekIndex) => {
    const today = getStartOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const max = maxDate ? new Date(`${maxDate}T00:00:00`) : new Date(today);
    if (!maxDate) {
      max.setDate(today.getDate() + 30);
    }

    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + targetWeekIndex * 7);

    const result = [];

    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);

      if (current < today) continue;
      if (current > max) continue;

      const dayOfWeek = current.getDay();

      if (
        shouldFilterByDoctorSchedule &&
        !workingDaySet.has(dayOfWeek)
      ) {
        continue;
      }

      const value = toDateValue(current);

      let label;

      if (isSameDate(current, today)) {
        label = 'Today';
      } else if (isSameDate(current, tomorrow)) {
        label = 'Tomorrow';
      } else {
        label = `${weekdayLabels[dayOfWeek]}, ${current.getDate()}/${current.getMonth() + 1}`;
      }

      result.push({
        value,
        label,
        dayOfWeek,
      });
    }

    return result;
  };

  const dateOptions = useMemo(() => {
    return buildWeekOptions(weekIndex);
  }, [weekIndex, workingDaySet, shouldFilterByDoctorSchedule, maxDate]);

  const nextWeekOptions = useMemo(() => {
    return buildWeekOptions(weekIndex + 1);
  }, [weekIndex, workingDaySet, shouldFilterByDoctorSchedule, maxDate]);

  const canGoPreviousWeek = weekIndex > 0;
  const canGoNextWeek = nextWeekOptions.length > 0;
  const hasSelectableDate = dateOptions.some((item) => item.value === date);

  const weekLabel = useMemo(() => {
    const today = getStartOfToday();
    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + weekIndex * 7);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return `${monday.getDate()}/${monday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1}`;
  }, [weekIndex]);

  useEffect(() => {
    if (dateOptions.length === 0) {
      if (date) {
        setDate('');
      }
      return;
    }

    const currentDateStillVisible = dateOptions.some((item) => item.value === date);

    if (!currentDateStillVisible) {
      setDate(dateOptions[0].value);
    }
  }, [dateOptions, date, setDate]);

  return (
    <div className="schedule-card datetime-card">
      <h2>Choose a date & time</h2>

      <div className="week-navigation">
        <button
          type="button"
          className="week-nav-button"
          onClick={() => setWeekIndex((prev) => Math.max(prev - 1, 0))}
          disabled={!canGoPreviousWeek}
        >
          Previous week
        </button>

        <span className="week-label">
          Week {weekLabel}
        </span>

        <button
          type="button"
          className="week-nav-button"
          onClick={() => setWeekIndex((prev) => prev + 1)}
          disabled={!canGoNextWeek}
        >
          Next week
        </button>
      </div>

      <div className="date-options weekly-date-options">
        {dateOptions.length === 0 ? (
          <div className="empty-block">
            The doctor is not working this week.
          </div>
        ) : (
          dateOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`date-option ${date === item.value ? 'selected' : ''}`}
              onClick={() => onChangeDate(item.value)}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
      {!isHomeVisit && (
        <div className="slot-section">
          <h3>Available slots</h3>

          {!hasSelectableDate ? (
            <div className="empty-block">
              Please select an available working day first.
            </div>
          ) : loadingSlots ? (
            <div className="empty-block">Loading slots...</div>
          ) : slots.length === 0 ? (
            <div className="empty-block">
              No available slots on this day.
            </div>
          ) : (
            <div className="slot-grid">
              {slots.map((slot) => {
                const isSelected =
                  selectedSlot?.date === date &&
                  selectedSlot?.startTime === slot.startTime;

                const statusClass = slot.status?.toLowerCase();

                const slotDateTime = new Date(`${date}T${slot.startTime}`);
                const isPastSlot = slotDateTime < new Date();

                return (
                  <button
                    key={`${date}-${slot.startTime}`}
                    type="button"
                    className={`slot-button ${statusClass} ${isPastSlot ? 'past' : ''} ${isSelected ? 'selected' : ''}`}
                    disabled={isPastSlot || (!slot.selectable && !isSelected)}
                    onClick={() => {
                      if (isPastSlot) return;

                      if (isSelected) {
                        onClearSlot();
                      } else {
                        onSelectSlot(slot);
                      }
                    }}
                    title={
                      isPastSlot
                        ? 'Past time'
                        : isSelected
                          ? 'Click again to unselect'
                          : slot.status === 'BOOKED'
                            ? 'Booked'
                            : slot.status === 'HELD'
                              ? 'Held'
                              : 'Available'
                    }
                  >
                    {slot.startTime}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="schedule-actions datetime-actions">
        <button type="button" className="btn-outline-soft" onClick={onBack}>
          Back
        </button>

        <button
          type="button"
          className="btn-primary-soft"
          onClick={onNext}
          disabled={!hasSelectableDate || (!isHomeVisit && !selectedSlot)}
        >
          Next
        </button>

      </div>
    </div>
  );
};

export default DateTimeStep;