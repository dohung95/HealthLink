import React, { useEffect, useRef, useState } from 'react';
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

const normalizeTimingValues = (timings, timing) => {
  const source = Array.isArray(timings) && timings.length > 0
    ? timings
    : String(timing || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  return [...new Set(source.map((value) => String(value).toUpperCase()).filter(Boolean))];
};

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
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      borderColor: isFocused ? 'var(--primary)' : 'var(--primary-border)',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 0.75rem',
    height: '100%',
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '2.375rem',
  }),
  dropdownIndicator: (base, { isDisabled }) => ({
    ...base,
    color: 'var(--text-muted)',
    padding: '0 0.5rem',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'color 0.15s ease',
    '&:hover': {
      color: isDisabled ? 'var(--text-muted)' : 'var(--primary)',
    },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.625rem',
    boxShadow: '0 4px 16px rgba(11, 24, 43, 0.12)',
    zIndex: 10,
    overflow: 'hidden',
    border: '1px solid var(--border-light)',
    marginTop: '4px',
  }),
  option: (base, { isSelected, isFocused }) => ({
    ...base,
    fontSize: '0.8125rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: isSelected ? 'var(--primary-light)' : isFocused ? 'var(--surface-hover)' : 'transparent',
    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'background-color 0.12s ease',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
  }),
  input: (base) => ({
    ...base,
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
  }),
};

export default function PrescriptionEditorModal({ row, readOnly, onClose, onRowChange, onTimingToggle }) {
  const [notesCount, setNotesCount] = useState(String(row?.notes || '').length);
  const modalRef = useRef(null);
  const timingValues = normalizeTimingValues(row?.timings, row?.timing);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const el = modalRef.current;
    if (el) el.focus();
  }, []);

  const handleNaturalNumber = (field) => (event) => {
    const raw = event.target.value;
    const cleaned = raw.replace(/\D/g, '');
    onRowChange(row.id, field, cleaned);
  };

  const handleNotesChange = (event) => {
    onRowChange(row.id, 'notes', event.target.value);
    setNotesCount(event.target.value.length);
  };

  if (!row) return null;

  const freqVal = row.frequency;
  const routeVal = row.route;

  return (
    <div className="doctor-prescription-editor-modal">
      <div
        className="doctor-prescription-editor-modal__backdrop"
        onClick={onClose}
        style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      />

      <div
        ref={modalRef}
        tabIndex={-1}
        className="doctor-prescription-editor-modal__dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="doctor-prescription-editor-modal__header">
          <div className="doctor-prescription-editor-modal__title-group">
            <i className="bi bi-capsule" style={{ color: 'var(--primary)', fontSize: '1.125rem' }} />
            <h5 className="doctor-prescription-editor-modal__title">
              {row.displayName || row.medicineQuery || 'Selected medication'}
            </h5>
            {row.strength && (
              <span className="doctor-prescription-chip doctor-prescription-chip--success">
                <i className="bi bi-droplet-half me-1" />
                {row.strength}
              </span>
            )}
            {row.dosageForm && (
              <span className="doctor-prescription-chip doctor-prescription-chip--muted">
                {row.dosageForm}
              </span>
            )}
          </div>
          <button
            className="doctor-prescription-editor-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="doctor-prescription-editor-modal__body">
          <div className="doctor-prescription-editor">
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">
                  <i className="bi bi-box-seam me-1" />
                  Quantity {row.unit ? `(${row.unit})` : ''}
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-hash" />
                  </span>
                  <input
                    className="form-control"
                    min="1"
                    placeholder="0"
                    readOnly={readOnly}
                    type="text"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={handleNaturalNumber('quantity')}
                  />
                </div>
              </div>

              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">
                  <i className="bi bi-calendar3 me-1" />
                  Supply Days
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-calendar-week" />
                  </span>
                  <input
                    className="form-control"
                    min="1"
                    placeholder="0"
                    readOnly={readOnly}
                    type="text"
                    inputMode="numeric"
                    value={row.totalSupplyDays}
                    onChange={handleNaturalNumber('totalSupplyDays')}
                  />
                </div>
              </div>
            </div>

            <hr className="doctor-prescription-editor__divider" />

            <div className="row g-3">
              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">
                  <i className="bi bi-clock me-1" />
                  Frequency
                </label>
                <Select
                  options={FREQUENCY_SELECT_OPTIONS}
                  value={FREQUENCY_SELECT_OPTIONS.find((o) => o.value === freqVal) || null}
                  onChange={(opt) => onRowChange(row.id, 'frequency', opt ? opt.value : '')}
                  isDisabled={readOnly}
                  placeholder="Select frequency"
                  isSearchable={false}
                  styles={selectStyles}
                  components={{ Control: (props) => <ControlWithIcon icon="bi-arrow-repeat" {...props} /> }}
                />
              </div>

              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">
                  <i className="bi bi-arrow-right-circle me-1" />
                  Route
                </label>
                <Select
                  options={ROUTE_SELECT_OPTIONS}
                  value={ROUTE_SELECT_OPTIONS.find((o) => o.value === routeVal) || null}
                  onChange={(opt) => onRowChange(row.id, 'route', opt ? opt.value : '')}
                  isDisabled={readOnly}
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
                <i className="bi bi-clock-history me-1" />
                Timing
              </label>
              <div className="doctor-prescription-editor__timing">
                {TIMING_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`btn ${timingValues.includes(option.value) ? 'btn-primary' : ''}`}
                    disabled={readOnly}
                    onClick={() => onTimingToggle(row.id, option.value)}
                  >
                    <i className={option.icon} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="doctor-prescription-editor__divider" />

            <div>
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="doctor-prescription-editor__label mb-0">
                  <i className="bi bi-chat-square-text me-1" />
                  Instructions / Notes
                </label>
                <span style={{
                  fontSize: '0.6875rem',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}>
                  {notesCount} / 500
                </span>
              </div>
              <textarea
                className="form-control"
                placeholder="Add short instructions for the patient..."
                readOnly={readOnly}
                rows="3"
                maxLength={500}
                value={row.notes || ''}
                onChange={handleNotesChange}
              />
            </div>
          </div>
        </div>

        <div className="doctor-prescription-editor-modal__footer">
          <button
            className="btn btn-primary d-inline-flex align-items-center gap-2"
            onClick={onClose}
            type="button"
            style={{
              borderRadius: '0.625rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              padding: '0.5rem 1.5rem',
              transition: 'all 0.15s ease',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
          >
            <i className="bi bi-check2" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const ControlWithIcon = ({ icon, children, ...props }) => (
  <components.Control {...props}>
    <span style={{
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '0.75rem',
      color: 'var(--text-muted)',
      fontSize: '0.8125rem',
      lineHeight: 0,
    }}>
      <i className={icon} />
    </span>
    {children}
  </components.Control>
);
