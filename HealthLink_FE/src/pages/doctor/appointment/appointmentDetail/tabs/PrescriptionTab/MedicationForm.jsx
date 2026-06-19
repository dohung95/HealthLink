import React, { useState } from 'react';
import Select, { components } from 'react-select';

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Optional' },
  { value: 'QD', label: 'QD (1x daily)' },
  { value: 'BID', label: 'BID (2x daily)' },
  { value: 'TID', label: 'TID (3x daily)' },
  { value: 'QID', label: 'QID (4x daily)' },
];

const ROUTE_OPTIONS = [
  { value: '', label: 'Optional' },
  { value: 'Oral', label: 'Oral' },
  { value: 'Topical', label: 'Topical' },
  { value: 'Injection', label: 'Injection' },
  { value: 'Inhalation', label: 'Inhalation' },
];

const TIMING_OPTIONS = [
  { value: 'MORNING', label: 'Morning', icon: 'bi-sunrise' },
  { value: 'AFTERNOON', label: 'Afternoon', icon: 'bi-sun' },
  { value: 'EVENING', label: 'Evening', icon: 'bi-moon' },
];

const FREQUENCY_SELECT_OPTIONS = FREQUENCY_OPTIONS.filter((o) => o.value !== '');
const ROUTE_SELECT_OPTIONS = ROUTE_OPTIONS.filter((o) => o.value !== '');

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

const selectStyles = {
  control: (base, { isDisabled, isFocused }) => ({
    ...base,
    border: `1.5px solid ${isFocused ? 'var(--primary)' : 'var(--border)'}`,
    borderRadius: '0.625rem',
    minHeight: '2.375rem',
    boxShadow: isFocused ? '0 0 0 3px var(--focus-ring)' : 'none',
    backgroundColor: isDisabled ? 'var(--surface-muted)' : 'var(--surface)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: '0.8125rem',
  }),
  valueContainer: (base) => ({ ...base, padding: '0 0.75rem', height: '100%' }),
  indicatorsContainer: (base) => ({ ...base, height: '2.375rem' }),
  dropdownIndicator: (base, { isDisabled }) => ({
    ...base, color: 'var(--text-muted)', padding: '0 0.5rem',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (base) => ({
    ...base, borderRadius: '0.625rem',
    boxShadow: '0 4px 16px rgba(11, 24, 43, 0.12)', zIndex: 10, overflow: 'hidden',
    border: '1px solid var(--border-light)', marginTop: '4px',
  }),
  option: (base, { isSelected, isFocused }) => ({
    ...base, fontSize: '0.8125rem', padding: '0.5rem 0.75rem',
    backgroundColor: isSelected ? 'var(--primary-light)' : isFocused ? 'var(--surface-hover)' : 'transparent',
    color: isSelected ? 'var(--primary)' : 'var(--text-primary)', cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--text-primary)', fontSize: '0.8125rem' }),
  placeholder: (base) => ({ ...base, color: 'var(--text-muted)', fontSize: '0.75rem' }),
  input: (base) => ({ ...base, fontSize: '0.8125rem', color: 'var(--text-primary)' }),
};

const ControlWithIcon = ({ icon, children, ...props }) => (
  <components.Control {...props}>
    <span style={{
      display: 'flex', alignItems: 'center', paddingLeft: '0.75rem',
      color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 0,
    }}>
      <i className={icon} />
    </span>
    {children}
  </components.Control>
);

function InlineEditor({ row, onRowChange, onTimingToggle }) {
  const timingValues = normalizeTimingValues(row?.timings, row?.timing);
  const [notesCount, setNotesCount] = useState(String(row?.notes || '').length);

  const handleNaturalNumber = (field) => (event) => {
    const cleaned = event.target.value.replace(/\D/g, '');
    onRowChange(row.id, field, cleaned);
  };

  const handleNotesChange = (event) => {
    onRowChange(row.id, 'notes', event.target.value);
    setNotesCount(event.target.value.length);
  };

  if (!row) return null;

  return (
    <div className="doctor-prescription-editor">
      <div className="row g-3">
        <div className="col-sm-6">
          <label className="doctor-prescription-editor__label">
            <i className="bi bi-box-seam me-1" />
            Quantity {row.unit ? `(${row.unit})` : ''}
          </label>
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-hash" /></span>
            <input
              className="form-control" min="1" placeholder="0" type="text"
              inputMode="numeric" value={row.quantity}
              onChange={handleNaturalNumber('quantity')}
            />
          </div>
        </div>
        <div className="col-sm-6">
          <label className="doctor-prescription-editor__label">
            <i className="bi bi-calendar3 me-1" />Supply Days
          </label>
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-calendar-week" /></span>
            <input
              className="form-control" min="1" placeholder="0" type="text"
              inputMode="numeric" value={row.totalSupplyDays}
              onChange={handleNaturalNumber('totalSupplyDays')}
            />
          </div>
        </div>
      </div>

      <hr className="doctor-prescription-editor__divider" />

      <div className="row g-3">
        <div className="col-sm-6">
          <label className="doctor-prescription-editor__label">
            <i className="bi bi-clock me-1" />Frequency
          </label>
          <Select
            options={FREQUENCY_SELECT_OPTIONS}
            value={FREQUENCY_SELECT_OPTIONS.find((o) => o.value === row.frequency) || null}
            onChange={(opt) => onRowChange(row.id, 'frequency', opt ? opt.value : '')}
            placeholder="Select frequency"
            isSearchable={false}
            styles={selectStyles}
            components={{ Control: (props) => <ControlWithIcon icon="bi-arrow-repeat" {...props} /> }}
          />
        </div>
        <div className="col-sm-6">
          <label className="doctor-prescription-editor__label">
            <i className="bi bi-arrow-right-circle me-1" />Route
          </label>
          <Select
            options={ROUTE_SELECT_OPTIONS}
            value={ROUTE_SELECT_OPTIONS.find((o) => o.value === row.route) || null}
            onChange={(opt) => onRowChange(row.id, 'route', opt ? opt.value : '')}
            placeholder="Select route"
            isSearchable={false}
            styles={selectStyles}
            components={{ Control: (props) => <ControlWithIcon icon="bi-diagram-3" {...props} /> }}
          />
        </div>
      </div>

      <hr className="doctor-prescription-editor__divider" />

      <div>
        <label className="doctor-prescription-editor__label">
          <i className="bi bi-clock-history me-1" />Timing
        </label>
        <div className="doctor-prescription-editor__timing">
          {TIMING_OPTIONS.map((option) => (
            <button
              type="button" key={option.value}
              className={`btn ${timingValues.includes(option.value) ? 'btn-primary' : ''}`}
              onClick={() => onTimingToggle(row.id, option.value)}
            >
              <i className={option.icon} />{option.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="doctor-prescription-editor__divider" />

      <div>
        <div className="d-flex align-items-center justify-content-between mb-1">
          <label className="doctor-prescription-editor__label mb-0">
            <i className="bi bi-chat-square-text me-1" />Instructions / Notes
          </label>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {notesCount} / 500
          </span>
        </div>
        <textarea
          className="form-control" placeholder="Add short instructions for the patient..."
          rows="3" maxLength={500} value={row.notes || ''}
          onChange={handleNotesChange}
        />
      </div>
    </div>
  );
}

export default function MedicationForm({
  rows,
  highlightedRowId,
  isWorkspaceReadOnly,
  onRemove,
  onAdd,
  rowRefs,
  onRowChange,
  onTimingToggle,
}) {
  const [expandedRowId, setExpandedRowId] = useState(null);

  const toggleExpand = (rowId) => {
    setExpandedRowId((currentId) => (currentId === rowId ? null : rowId));
  };
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
                      onClick={() => toggleExpand(row.id)}
                      type="button"
                    >
                      <i className="bi bi-pencil-square me-2"></i>
                      {isWorkspaceReadOnly ? 'View' : expandedRowId === row.id ? 'Collapse' : 'Edit'}
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

            {!isWorkspaceReadOnly && expandedRowId === row.id && (
              <div className="doctor-prescription-item-card__editor">
                <InlineEditor
                  row={row}
                  onRowChange={onRowChange}
                  onTimingToggle={onTimingToggle}
                />
              </div>
            )}
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
          : 'Select a medication from the library on the left to start building the prescription.'}
      </p>
    </div>
  );
}
