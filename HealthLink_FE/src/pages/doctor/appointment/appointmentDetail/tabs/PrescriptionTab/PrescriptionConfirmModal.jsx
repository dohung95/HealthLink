import React from 'react';
import Select from 'react-select';

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
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
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

const SelectControlWithIcon = ({ icon, children, ...props }) => (
  <Select.components.Control {...props}>
    <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.25rem 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
      <i className={`bi ${icon}`}></i>
    </span>
    {children}
  </Select.components.Control>
);

const prescSelectStyles = {
  control: (base, { isDisabled, isFocused }) => ({
    ...base,
    border: `1px solid var(--border)`,
    borderRadius: '0.625rem',
    minHeight: '2.375rem',
    boxShadow: isFocused ? '0 0 0 3px var(--focus-ring)' : 'none',
    borderColor: isFocused ? 'var(--primary)' : 'var(--border)',
    backgroundColor: isDisabled ? 'var(--surface-muted)' : 'var(--surface)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: '0.8125rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 0.75rem 0 0.25rem',
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
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.625rem',
    boxShadow: '0 4px 16px rgba(11, 24, 43, 0.12)',
    zIndex: 10,
    overflow: 'hidden',
  }),
  option: (base, { isSelected, isFocused }) => ({
    ...base,
    fontSize: '0.8125rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: isSelected ? 'var(--primary-light)' : isFocused ? 'var(--surface-hover)' : 'transparent',
    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-muted)',
    fontSize: '0.8125rem',
  }),
  input: (base) => ({
    ...base,
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
  }),
};

export default function PrescriptionEditorModal({ row, readOnly, onClose, onRowChange, onTimingToggle }) {
  const timingValues = normalizeTimingValues(row.timings, row.timing);
  const handleNaturalNumber = (field) => (event) => {
    const raw = event.target.value;
    const cleaned = raw.replace(/\D/g, '');
    onRowChange(row.id, field, cleaned);
  };

  return (
    <div className="doctor-prescription-editor-modal">
      <div className="doctor-prescription-editor-modal__backdrop" onClick={onClose}></div>
      <div
        aria-modal="true"
        className="doctor-prescription-editor-modal__dialog"
        role="dialog"
      >
        <div className="doctor-prescription-editor-modal__header">
          <div className="doctor-prescription-editor-modal__title-group">
            <h5 className="doctor-prescription-editor-modal__title">
              <i className="bi bi-pencil-square me-2"></i>
              {row.displayName || row.medicineQuery || 'Selected medication'}
            </h5>
            {row.strength ? (
              <span className="doctor-prescription-chip doctor-prescription-chip--strength">{row.strength}</span>
            ) : null}
            {row.dosageForm ? (
              <span className="doctor-prescription-chip doctor-prescription-chip--muted">{row.dosageForm}</span>
            ) : null}
          </div>
          <button
            className="btn doctor-prescription-editor-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="doctor-prescription-editor-modal__body">
          <div className="doctor-prescription-editor">
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">
                  Quantity {row.unit ? `(${row.unit})` : ''}
                </label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-box-seam"></i></span>
                  <input
                    className="form-control"
                    min="1"
                    placeholder="Enter quantity"
                    readOnly={readOnly}
                    type="text"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={handleNaturalNumber('quantity')}
                  />
                </div>
              </div>

              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">Supply Days</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-calendar3"></i></span>
                  <input
                    className="form-control"
                    min="1"
                    placeholder="Days of supply"
                    readOnly={readOnly}
                    type="text"
                    inputMode="numeric"
                    value={row.totalSupplyDays}
                    onChange={handleNaturalNumber('totalSupplyDays')}
                  />
                </div>
              </div>

              <hr className="doctor-prescription-editor__divider" />

              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">Frequency</label>
                <Select
                  options={FREQUENCY_SELECT_OPTIONS}
                  value={FREQUENCY_SELECT_OPTIONS.find((o) => o.value === row.frequency) || null}
                  onChange={(opt) => onRowChange(row.id, 'frequency', opt ? opt.value : '')}
                  isDisabled={readOnly}
                  placeholder="Optional"
                  isSearchable={false}
                  styles={prescSelectStyles}
                  components={{ Control: (props) => <SelectControlWithIcon icon="bi-clock" {...props} /> }}
                />
              </div>

              <div className="col-sm-6">
                <label className="doctor-prescription-editor__label">Route</label>
                <Select
                  options={ROUTE_SELECT_OPTIONS}
                  value={ROUTE_SELECT_OPTIONS.find((o) => o.value === row.route) || null}
                  onChange={(opt) => onRowChange(row.id, 'route', opt ? opt.value : '')}
                  isDisabled={readOnly}
                  placeholder="Optional"
                  isSearchable={false}
                  styles={prescSelectStyles}
                  components={{ Control: (props) => <SelectControlWithIcon icon="bi-arrow-right-circle" {...props} /> }}
                />
              </div>

              <hr className="doctor-prescription-editor__divider" />

              <div className="col-12">
                <label className="doctor-prescription-editor__label">Timing</label>
                <div className="doctor-prescription-editor__timing">
                  {TIMING_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={`btn ${timingValues.includes(option.value) ? 'btn-primary' : ''}`}
                      disabled={readOnly}
                      onClick={() => onTimingToggle(row.id, option.value)}
                    >
                      <i className={`bi ${option.value === 'MORNING' ? 'bi-sunrise' : option.value === 'AFTERNOON' ? 'bi-sun' : 'bi-moon'}`}></i>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="doctor-prescription-editor__divider" />

              <div className="col-12">
                <label className="doctor-prescription-editor__label">
                  <i className="bi bi-chat-square-text me-1"></i>
                  Instructions / Notes
                </label>
                <textarea
                  className="form-control"
                  placeholder="Add short instructions for the patient..."
                  readOnly={readOnly}
                  rows="3"
                  value={row.notes}
                  onChange={(event) => onRowChange(row.id, 'notes', event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="doctor-prescription-editor-modal__footer">
          <button className="btn btn-primary" onClick={onClose} type="button">
            <i className="bi bi-check2 me-2"></i>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
