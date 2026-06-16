import React from 'react';

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Optional' },
  { value: 'QD', label: 'QD (1x daily)' },
  { value: 'BID', label: 'BID (2x daily)' },
  { value: 'TID', label: 'TID (3x daily)' },
  { value: 'QID', label: 'QID (4x daily)' },
];

const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

const getOptionLabel = (options, value, fallback) =>
  options.find((option) => option.value === value)?.label || fallback;

const normalizeTimingValues = (timings, timing) => {
  const source = Array.isArray(timings) && timings.length > 0
    ? timings
    : String(timing || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  return [...new Set(source.map((value) => String(value).toUpperCase()).filter(Boolean))];
};

const getTimingLabel = (value) => getOptionLabel(TIMING_OPTIONS, value, value);

export default function MedicationForm({
  rows,
  highlightedRowId,
  isWorkspaceReadOnly,
  onEdit,
  onRemove,
  onAdd,
  rowRefs,
}) {
  return rows.length > 0 ? (
    <div className="doctor-prescription-list">
      {rows.map((row, index) => {
        const isHighlighted = highlightedRowId === row.id;
        const timingValues = normalizeTimingValues(row.timings, row.timing);
        const scheduleBadges = [
          row.frequency
            ? `Frequency: ${getOptionLabel(FREQUENCY_OPTIONS, row.frequency, row.frequency)}`
            : null,
          row.route ? `Route: ${row.route}` : null,
          timingValues.length > 0
            ? `Timing: ${timingValues.map(getTimingLabel).join(', ')}`
            : null,
          row.totalSupplyDays ? `${row.totalSupplyDays} day supply` : null,
        ].filter(Boolean);

        return (
          <article
            className={`doctor-prescription-item-card ${isHighlighted ? 'doctor-prescription-item-card--highlight' : ''}`}
            key={row.id}
            ref={(node) => {
              if (node) {
                rowRefs.current[row.id] = node;
              } else {
                delete rowRefs.current[row.id];
              }
            }}
          >
            <div className="doctor-prescription-item-card__summary">
              {row.quantity ? (
                <span className="doctor-prescription-chip doctor-prescription-chip--success doctor-prescription-item-card__quantity">
                  Quantity: {row.quantity}
                </span>
              ) : null}

              <div
                className={`doctor-prescription-item-card__content ${row.quantity ? 'doctor-prescription-item-card__content--with-quantity' : ''}`}
              >
                <div className="doctor-prescription-item-card__title-row">
                  <span className="doctor-prescription-item-card__index">{index + 1}</span>
                  <h4>{row.displayName || row.medicineQuery || 'Selected medication'}</h4>
                  {row.strength ? (
                    <span className="doctor-prescription-chip">{row.strength}</span>
                  ) : null}
                  <div
                    className={`doctor-prescription-item-card__actions ${row.quantity ? 'doctor-prescription-item-card__actions--with-quantity' : ''}`}
                  >
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onEdit(row.id)}
                      type="button"
                    >
                      <i className="bi bi-pencil-square me-2"></i>
                      {isWorkspaceReadOnly ? 'View' : 'Edit'}
                    </button>
                    {!isWorkspaceReadOnly ? (
                      <button
                        className="btn btn-sm btn-link text-danger"
                        onClick={() => onRemove(row.id)}
                        type="button"
                      >
                        <i className="bi bi-trash3 me-1"></i>
                      </button>
                    ) : null}
                  </div>
                </div>

                {scheduleBadges.length > 0 ? (
                  <div className="doctor-prescription-pill-list">
                    {scheduleBadges.map((badge) => (
                      <span className="doctor-prescription-pill" key={badge}>
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="doctor-prescription-item-card__helper">
                    Add quantity, supply days, timing, and instructions below.
                  </p>
                )}
              </div>
            </div>
          </article>
        );
      })}
      {!isWorkspaceReadOnly ? (
        <button
          className="doctor-prescription-list__add-btn"
          onClick={onAdd}
          type="button"
          title="Add medication"
        >
          <i className="bi bi-plus"></i>
        </button>
      ) : null}
    </div>
  ) : (
    <div className="doctor-prescription-empty-state">
      <div className="doctor-prescription-empty-state__icon">
        <i className="bi bi-capsule"></i>
      </div>
      <h4>No medication selected yet</h4>
      <p>
        {isWorkspaceReadOnly
          ? 'No draft medication is available for this appointment yet.'
          : 'Open the medicine library to choose a medication before filling in dosage details.'}
      </p>
      <button
        className={`btn btn-primary ${isWorkspaceReadOnly ? 'disabled' : ''}`}
        aria-disabled={isWorkspaceReadOnly}
        onClick={onAdd}
        type="button"
      >
        <i className="bi bi-search me-2"></i>
        Open Medicine Library
      </button>
    </div>
  );
}
