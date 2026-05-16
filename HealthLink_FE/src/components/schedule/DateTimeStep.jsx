import { useMemo, useState } from 'react';

const DateTimeStep = ({
  date,
  setDate,
  slots,
  selectedSlot,
  onSelectSlot,
  onClearSlot,
  loadingSlots,
  onBack,
  onNext,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);

  const totalDays = 30;
  const daysPerPage = 7;

  const dateOptions = useMemo(() => {
    const result = [];

    for (
      let i = weekOffset;
      i < Math.min(weekOffset + daysPerPage, totalDays);
      i++
    ) {
      const current = new Date();
      current.setDate(current.getDate() + i);

      const value = current.toISOString().split('T')[0];

      let label = '';

      if (i === 0) {
        label = 'Today';
      } else if (i === 1) {
        label = 'Tomorrow';
      } else {
        const weekday = current.toLocaleDateString('en-US', {
          weekday: 'short',
        });

        const day = current.getDate();
        const month = current.getMonth() + 1;

        label = `${weekday}, ${day}/${month}`;
      }

      result.push({
        value,
        label,
      });
    }

    return result;
  }, [weekOffset]);

  return (
    <div className="schedule-card datetime-card">
      <h2>Choose a date & time</h2>

      <div className="week-navigation">
        <button
          type="button"
          className="week-nav-button"
          onClick={() => setWeekOffset((prev) => Math.max(prev - 7, 0))}
          disabled={weekOffset === 0}
        >
          Last week
        </button>

        <span className="week-label">
          {dateOptions[0]?.label} - {dateOptions[dateOptions.length - 1]?.label}
        </span>

        <button
          type="button"
          className="week-nav-button"
          onClick={() =>
            setWeekOffset((prev) =>
              Math.min(prev + 7, totalDays - daysPerPage)
            )
          }
          disabled={weekOffset + daysPerPage >= totalDays}
        >
          Next week
        </button>
      </div>

      <div className="date-options weekly-date-options">
        {dateOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`date-option ${date === item.value ? 'selected' : ''}`}
            onClick={() => setDate(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>


      <div className="slot-section">
        <h3>Available slots</h3>

        {loadingSlots ? (
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

              return (
                <button
                  key={`${date}-${slot.startTime}`}
                  type="button"
                  className={`slot-button ${statusClass} ${isSelected ? 'selected' : ''
                    }`}
                  disabled={!slot.selectable && !isSelected}
                  onClick={() => {
                    if (isSelected) {
                      onClearSlot();
                    } else {
                      onSelectSlot(slot);
                    }
                  }}
                  title={
                    isSelected
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

      <div className="schedule-actions datetime-actions">
        <button type="button" className="btn-outline-soft" onClick={onBack}>
          Back
        </button>

        <button
          type="button"
          className="btn-primary-soft"
          onClick={onNext}
          disabled={!selectedSlot}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DateTimeStep;