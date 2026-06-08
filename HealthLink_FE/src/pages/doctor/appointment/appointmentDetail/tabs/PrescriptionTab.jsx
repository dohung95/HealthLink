import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { medicineApi } from '@api/medicineApi';
import Select, { components } from 'react-select'; // eslint-disable-line no-unused-vars

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

const LIBRARY_FILTERS = [
  { key: 'brandName', label: 'Brand Name' },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'dosageForm', label: 'Dosage Form' },
  { key: 'manufacturer', label: 'Manufacturer' },
];

const FREQUENCY_SELECT_OPTIONS = FREQUENCY_OPTIONS.filter((o) => o.value !== '');
const ROUTE_SELECT_OPTIONS = ROUTE_OPTIONS.filter((o) => o.value !== '');

const SelectControlWithIcon = ({ icon, children, ...props }) => (
  <components.Control {...props}>
    <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.25rem 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
      <i className={`bi ${icon}`}></i>
    </span>
    {children}
  </components.Control>
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

const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyFilterState = () => ({
  brandName: true,
  genericName: true,
  dosageForm: false,
  manufacturer: false,
});

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

const getMedicineDisplayName = (medicine) => {
  const brandName = medicine.brandName || '';
  const genericName = medicine.genericName || medicine.name || '';

  if (brandName && genericName && brandName.toLowerCase() !== genericName.toLowerCase()) {
    return `${brandName} (${genericName})`;
  }

  return brandName || genericName || 'Unnamed medicine';
};

const normalizeMedicine = (medicine = {}) => {
  const displayName = getMedicineDisplayName(medicine);
  const searchableText = [
    displayName,
    medicine.brandName,
    medicine.genericName,
    medicine.dosageForm,
    medicine.strength,
    medicine.manufacturer,
    medicine.unit,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    ...medicine,
    displayName,
    searchLabel: [displayName, medicine.strength].filter(Boolean).join(' - '),
    searchableText,
  };
};

const createMedicationRowFromMedicine = (medicine) => ({
  id: createRowId(),
  medicineId: medicine.medicineId ?? null,
  medicineQuery: medicine.searchLabel || medicine.displayName || '',
  displayName: medicine.displayName || '',
  brandName: medicine.brandName || '',
  genericName: medicine.genericName || '',
  dosageForm: medicine.dosageForm || '',
  strength: medicine.strength || '',
  quantity: '',
  totalSupplyDays: '',
  frequency: '',
  route: '',
  timing: 'MORNING',
  timings: ['MORNING'],
  notes: '',
  unit: medicine.unit || '',
});

const hydrateMedicationRow = (row, medicine) => {
  if (!medicine) {
    return row;
  }

  const hydratedRow = {
    ...row,
    medicineQuery: row.medicineQuery || medicine.searchLabel || medicine.displayName || '',
    displayName: row.displayName || medicine.displayName || '',
    brandName: row.brandName || medicine.brandName || '',
    genericName: row.genericName || medicine.genericName || '',
    dosageForm: row.dosageForm || medicine.dosageForm || '',
    strength: row.strength || medicine.strength || '',
    unit: row.unit || medicine.unit || '',
  };

  const hasChanged = Object.keys(hydratedRow).some((key) => hydratedRow[key] !== row[key]);
  return hasChanged ? hydratedRow : row;
};

const getPrescriptionStrengthLabel = (item = {}) => {
  const dosage = item.strength || item.dosage || '';
  const unit = item.unit || '';

  if (!dosage || !unit) {
    return dosage;
  }

  return dosage.toLowerCase().endsWith(unit.toLowerCase())
    ? dosage.slice(0, dosage.length - unit.length).trim()
    : dosage;
};

const PrescriptionReadonlyItem = ({ item, index }) => {
  const medicationName =
    item.medicationName ||
    item.brandName ||
    item.genericName ||
    `Medication ${index + 1}`;
  const strengthLabel = getPrescriptionStrengthLabel(item);
  const timingValues = normalizeTimingValues(item.timings, item.timing);
  const scheduleBadges = [
    item.frequency ? `Frequency: ${item.frequency}` : null,
    item.route ? `Route: ${item.route}` : null,
    item.totalSupplyDays ? `${item.totalSupplyDays} day supply` : null,
  ].filter(Boolean);

  return (
    <article className="doctor-prescription-item-card doctor-prescription-item-card--readonly">
      <div className="doctor-prescription-item-card__summary">
        {item.quantity ? (
          <span className="doctor-prescription-chip doctor-prescription-chip--success doctor-prescription-item-card__quantity">
            Quantity: {item.quantity}
          </span>
        ) : null}

        <div
          className={`doctor-prescription-item-card__content ${item.quantity ? 'doctor-prescription-item-card__content--with-quantity' : ''}`}
        >
          <div className="doctor-prescription-item-card__title-row">
            <h4>{medicationName}</h4>
            {strengthLabel ? <span className="doctor-prescription-chip">{strengthLabel}</span> : null}
          </div>

          {scheduleBadges.length > 0 ? (
            <div className="doctor-prescription-pill-list">
              {scheduleBadges.map((badge) => (
                <span className="doctor-prescription-pill" key={badge}>
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          {timingValues.length > 0 ? (
            <div className="doctor-prescription-pill-list">
              {timingValues.map((timingValue) => (
                <span className="doctor-prescription-pill doctor-prescription-pill--timing" key={timingValue}>
                  {getTimingLabel(timingValue)}
                </span>
              ))}
            </div>
          ) : null}

          {item.notes || item.instructions ? (
            <p className="doctor-prescription-item-card__notes">
              {item.notes || item.instructions}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const MedicineLibraryModal = ({
  commonMedicines,
  filteredMedicines,
  filters,
  loading,
  onClose,
  onQueryChange,
  onSelectMedicine,
  onToggleFilter,
  onToggleFilters,
  query,
  recentMedicines,
  selectedMedicineIds,
  showFilters,
}) => {
  const resultCount = filteredMedicines.length;
  const activeFilterCount = LIBRARY_FILTERS.filter((filter) => filters[filter.key]).length;

  return (
    <div className="doctor-prescription-library">
      <div className="doctor-prescription-library__backdrop" onClick={onClose}></div>
      <div
        aria-modal="true"
        className="doctor-prescription-library__dialog"
        role="dialog"
      >
        <aside className="doctor-prescription-library__sidebar">
          <div>
            <p className="doctor-detail-eyebrow">Medicine Library</p>
            <h3 className="doctor-detail-section-title">Find a medication</h3>
          </div>

          <div className="doctor-prescription-library__sidebar-group">
            <p className="doctor-prescription-library__sidebar-label">Recent Searches</p>
            {recentMedicines.length > 0 ? (
              <div className="doctor-prescription-library__shortcut-list">
                {recentMedicines.map((medicine) => (
                  <button
                    className="doctor-prescription-library__shortcut"
                    key={`recent-${medicine.medicineId}`}
                    onClick={() => onSelectMedicine(medicine)}
                    type="button"
                  >
                    <i className="bi bi-clock-history"></i>
                    <span>{medicine.searchLabel}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="doctor-prescription-library__placeholder">
                Search selections will show up here.
              </p>
            )}
          </div>

          <div className="doctor-prescription-library__sidebar-group">
            <p className="doctor-prescription-library__sidebar-label">Commonly Used</p>
            {commonMedicines.length > 0 ? (
              <div className="doctor-prescription-library__shortcut-list">
                {commonMedicines.map((medicine) => (
                  <button
                    className="doctor-prescription-library__shortcut"
                    key={`common-${medicine.medicineId}`}
                    onClick={() => onSelectMedicine(medicine)}
                    type="button"
                  >
                    <i className="bi bi-heart"></i>
                    <span>{medicine.searchLabel}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="doctor-prescription-library__placeholder">
                Medicine catalog is loading.
              </p>
            )}
          </div>
        </aside>

        <section className="doctor-prescription-library__main">
          <div className="doctor-prescription-library__header">
            <div className="doctor-prescription-library__search-group">
              <i className="bi bi-search"></i>
              <input
                autoFocus
                className="form-control doctor-prescription-input"
                placeholder="Search medicines, brands, or generics..."
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </div>

            <div className="doctor-prescription-library__header-actions">
              <button
                className="btn doctor-prescription-library__filter-btn"
                onClick={onToggleFilters}
                type="button"
              >
                <span className={`doctor-prescription-library__filter-icon-wrapper${showFilters ? ' doctor-prescription-library__filter-icon-wrapper--active' : ''}`}>
                  <i className="bi bi-funnel"></i>
                  {activeFilterCount > 0 ? (
                    <span className="doctor-prescription-library__filter-count">{activeFilterCount}</span>
                  ) : null}
                </span>
              </button>
            </div>
          </div>

          {showFilters ? (
            <div className="doctor-prescription-library__filters">
              <div className="doctor-prescription-library__filters-grid">
                {LIBRARY_FILTERS.map((filter) => (
                  <label className="doctor-prescription-library__filter" key={filter.key}>
                    <input
                      checked={filters[filter.key]}
                      onChange={() => onToggleFilter(filter.key)}
                      type="checkbox"
                    />
                    <span>{filter.label}</span>
                  </label>
                ))}
              </div>
              <p className="doctor-prescription-library__filter-note">
                The Stock field was removed because it is not available in the current medicine data.
              </p>
            </div>
          ) : null}

          <div className="doctor-prescription-library__results-head">
            <div>
              <p className="doctor-prescription-library__results-title">Search Results</p>
              <p className="doctor-prescription-library__results-subtitle">
                {resultCount} medicine{resultCount === 1 ? '' : 's'} available
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredMedicines.length > 0 ? (
            <div className="doctor-prescription-library__results">
              {filteredMedicines.map((medicine) => {
                const isSelected = selectedMedicineIds.has(medicine.medicineId);

                return (
                  <div className="doctor-prescription-library__result" key={medicine.medicineId}>
                    <div className="doctor-prescription-library__result-content">
                      <div className="doctor-prescription-library__result-title-row">
                        <h4>{medicine.displayName}</h4>
                        {medicine.strength ? (
                          <span className="doctor-prescription-chip">{medicine.strength}</span>
                        ) : null}
                        {medicine.dosageForm ? (
                          <span className="doctor-prescription-chip doctor-prescription-chip--muted">
                            {medicine.dosageForm}
                          </span>
                        ) : null}
                      </div>

                      <p className="doctor-prescription-library__result-meta">
                        {medicine.manufacturer || 'Manufacturer not listed'}
                      </p>

                      <div className="doctor-prescription-pill-list">
                        {medicine.brandName ? (
                          <span className="doctor-prescription-pill">Brand: {medicine.brandName}</span>
                        ) : null}
                        {medicine.genericName ? (
                          <span className="doctor-prescription-pill">Generic: {medicine.genericName}</span>
                        ) : null}
                        {medicine.unit ? (
                          <span className="doctor-prescription-pill">Unit: {medicine.unit}</span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      className={`btn ${isSelected ? 'btn-outline-secondary' : 'btn-primary'}`}
                      disabled={isSelected}
                      onClick={() => onSelectMedicine(medicine)}
                      type="button"
                    >
                      <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'} me-2`}></i>
                      {isSelected ? 'Selected' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="doctor-prescription-empty-state">
              <div className="doctor-prescription-empty-state__icon">
                <i className="bi bi-search"></i>
              </div>
              <h4>No medicines matched this search</h4>
              <p>Try another keyword or loosen the active search filters.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const PrescriptionEditorModal = ({ row, readOnly, onClose, onRowChange, onTimingToggle }) => {
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
};

const PrescriptionTab = ({
  appointment,
  patient,
  consultation,
  prescription,
  loadingPrescription,
  onDraftChange,
  readOnly = false,
  canEditPrescription = !readOnly,
  onLockedAction,
}) => {
  const workspaceAppointmentId = appointment?.appointmentID ?? appointment?.appointmentId ?? 'new';
  const isWorkspaceReadOnly = readOnly || !canEditPrescription;
  const rowRefs = useRef({});
  const initializedAppointmentIdRef = useRef(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [medicationRows, setMedicationRows] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [showLibraryFilters, setShowLibraryFilters] = useState(false);
  const [libraryFilters, setLibraryFilters] = useState(createEmptyFilterState);
  const [editorModalRowId, setEditorModalRowId] = useState(null);
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const [recentMedicineIds, setRecentMedicineIds] = useState([]);

  useEffect(() => {
    const loadMedicines = async () => {
      setLoadingMedicines(true);
      try {
        const data = await medicineApi.searchMedicines();
        setMedicines(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading medicines:', error);
        toast.error('Failed to load medicine catalog');
      } finally {
        setLoadingMedicines(false);
      }
    };

    loadMedicines();
  }, []);

  const medicineOptions = useMemo(
    () => medicines.map((medicine) => normalizeMedicine(medicine)),
    [medicines],
  );

  const medicineMap = useMemo(
    () => new Map(medicineOptions.map((medicine) => [medicine.medicineId, medicine])),
    [medicineOptions],
  );

  useEffect(() => {
    if (prescription) {
      return;
    }

    if (initializedAppointmentIdRef.current !== workspaceAppointmentId) {
      initializedAppointmentIdRef.current = workspaceAppointmentId;
      setDiagnosis(consultation?.diagnosis ?? '');
      setMedicationRows([]);
      setEditorModalRowId(null);
      setHighlightedRowId(null);
      setRecentMedicineIds([]);
      setIsLibraryOpen(false);
      setLibraryQuery('');
      setShowLibraryFilters(false);
      setLibraryFilters(createEmptyFilterState());
      return;
    }

    setDiagnosis((currentDiagnosis) => currentDiagnosis || consultation?.diagnosis || '');
  }, [consultation?.diagnosis, prescription, workspaceAppointmentId]);

  useEffect(() => {
    if (!medicineMap.size) {
      return;
    }

    setMedicationRows((currentRows) => {
      let hasChanges = false;

      const nextRows = currentRows.map((row) => {
        if (!row.medicineId) {
          return row;
        }

        const hydratedRow = hydrateMedicationRow(row, medicineMap.get(row.medicineId));
        if (hydratedRow !== row) {
          hasChanges = true;
        }
        return hydratedRow;
      });

      return hasChanges ? nextRows : currentRows;
    });
  }, [medicineMap]);

  useEffect(() => {
    if (typeof onDraftChange !== 'function') {
      return;
    }

    if (prescription || !canEditPrescription) {
      onDraftChange(null);
      return;
    }

    onDraftChange({
      appointmentId: workspaceAppointmentId,
      diagnosis,
      medicationRows,
    });
  }, [canEditPrescription, diagnosis, medicationRows, onDraftChange, prescription, workspaceAppointmentId]);

  useEffect(() => {
    if (!isWorkspaceReadOnly) {
      return;
    }

    setIsLibraryOpen(false);
    setShowLibraryFilters(false);
    setEditorModalRowId(null);
  }, [isWorkspaceReadOnly]);

  useEffect(() => {
    if (!isLibraryOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsLibraryOpen(false);
        setShowLibraryFilters(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isLibraryOpen]);

  useEffect(() => {
    if (!editorModalRowId) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setEditorModalRowId(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [editorModalRowId]);

  const recentMedicines = useMemo(
    () => recentMedicineIds.map((id) => medicineMap.get(id)).filter(Boolean),
    [medicineMap, recentMedicineIds],
  );

  const commonMedicines = useMemo(() => medicineOptions.slice(0, 4), [medicineOptions]);

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = libraryQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return medicineOptions;
    }

    const enabledKeys = LIBRARY_FILTERS.filter((filter) => libraryFilters[filter.key]).map(
      (filter) => filter.key,
    );

    return medicineOptions.filter((medicine) => {
      if (medicine.searchableText.includes(normalizedQuery)) {
        return true;
      }

      if (!enabledKeys.length) {
        return false;
      }

      return enabledKeys.some((key) =>
        String(medicine[key] || '').toLowerCase().includes(normalizedQuery),
      );
    });
  }, [libraryFilters, libraryQuery, medicineOptions]);

  const selectedMedicineIds = useMemo(
    () => new Set(medicationRows.map((row) => row.medicineId).filter(Boolean)),
    [medicationRows],
  );

  const summaryStats = useMemo(
    () => ({
      itemCount: medicationRows.filter((item) => item.medicineId).length,
      patientName: patient?.fullName || 'Patient',
    }),
    [medicationRows, patient?.fullName],
  );

  const issuedAtLabel = prescription?.issueDate
    ? new Date(prescription.issueDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const focusRow = (rowId) => {
    if (!rowId) {
      return;
    }

    window.setTimeout(() => {
      rowRefs.current[rowId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const pulseRow = (rowId) => {
    if (!rowId) {
      return;
    }

    setHighlightedRowId(rowId);
    window.setTimeout(() => {
      setHighlightedRowId((currentId) => (currentId === rowId ? null : currentId));
    }, 1800);
  };

  const openMedicineLibrary = () => {
    if (isWorkspaceReadOnly) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }

    setLibraryQuery('');
    setShowLibraryFilters(false);
    setIsLibraryOpen(true);
  };

  const closeMedicineLibrary = () => {
    setIsLibraryOpen(false);
    setShowLibraryFilters(false);
  };

  const handleSelectMedicine = (medicine) => {
    if (isWorkspaceReadOnly) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }

    let existingRowId = null;
    let nextRowId = null;

    setMedicationRows((currentRows) => {
      const existingRow = currentRows.find((row) => row.medicineId === medicine.medicineId);
      if (existingRow) {
        existingRowId = existingRow.id;
        return currentRows;
      }

      const nextRow = createMedicationRowFromMedicine(medicine);
      nextRowId = nextRow.id;
      return [...currentRows, nextRow];
    });

    setRecentMedicineIds((currentIds) => [
      medicine.medicineId,
      ...currentIds.filter((id) => id !== medicine.medicineId),
    ].slice(0, 5));

    closeMedicineLibrary();
    setLibraryQuery('');

    if (existingRowId) {
      setEditorModalRowId(existingRowId);
      pulseRow(existingRowId);
      focusRow(existingRowId);
      toast.info('This medication is already in the prescription');
      return;
    }

    if (nextRowId) {
      setEditorModalRowId(nextRowId);
      pulseRow(nextRowId);
      focusRow(nextRowId);
      toast.success('Medication added to prescription');
    }
  };

  const handleRemoveRow = (rowId) => {
    if (isWorkspaceReadOnly) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }

    setMedicationRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
    setEditorModalRowId((currentId) => (currentId === rowId ? null : currentId));
    setHighlightedRowId((currentId) => (currentId === rowId ? null : currentId));
  };

  const handleRowChange = (rowId, field, value) => {
    if (isWorkspaceReadOnly) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }

    setMedicationRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const handleRowTimingToggle = (rowId, timingValue) => {
    if (isWorkspaceReadOnly) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }

    setMedicationRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const currentTimings = normalizeTimingValues(row.timings, row.timing);
        const nextTimings = currentTimings.includes(timingValue)
          ? currentTimings.filter((value) => value !== timingValue)
          : [...currentTimings, timingValue];

        return {
          ...row,
          timings: nextTimings,
          timing: nextTimings.join(','),
        };
      }),
    );
  };

  if (loadingPrescription && !prescription) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (prescription) {
    return (
      <div className="doctor-prescription-workspace doctor-prescription-workspace--readonly">
        <div className="doctor-prescription-header doctor-prescription-header--readonly">
          <p className="doctor-detail-eyebrow mb-0">Prescription</p>
          <span className="doctor-detail-status doctor-detail-status--completed">
            {prescription.status || 'Issued'}
          </span>
        </div>

        <div className="doctor-detail-note-card doctor-prescription-summary-card">
          <div className="doctor-prescription-summary-card__item">
            <p className="doctor-prescription-summary-card__label">Patient</p>
            <p className="doctor-prescription-summary-card__value">{summaryStats.patientName}</p>
          </div>
          <div className="doctor-prescription-summary-card__item">
            <p className="doctor-prescription-summary-card__label">Issued</p>
            <p className="doctor-prescription-summary-card__value">{issuedAtLabel}</p>
          </div>
          <div className="doctor-prescription-summary-card__item doctor-prescription-summary-card__item--diagnosis">
            <p className="doctor-prescription-summary-card__label">Diagnosis</p>
            <p className="doctor-prescription-summary-card__value">
              {prescription.diagnosis?.trim() || 'Not provided'}
            </p>
          </div>
        </div>

        <div className="doctor-prescription-table-card">
          <div className="doctor-prescription-table-card__header">
            <p className="doctor-detail-eyebrow mb-0">Medications</p>
            <div className="doctor-prescription-header__badge">
              {prescription.medications?.length || 0} item
              {prescription.medications?.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="doctor-prescription-list">
            {prescription.medications?.map((item, index) => (
              <PrescriptionReadonlyItem
                item={item}
                index={index}
                key={`${item.medicationName || item.medicineId || 'medication'}-${index}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="doctor-prescription-workspace">
        <div className="doctor-detail-note-card doctor-prescription-diagnosis-card">
          <p className="doctor-detail-note-card__label">Diagnosis Summary</p>
          <textarea
            className="form-control doctor-prescription-textarea"
            readOnly={isWorkspaceReadOnly}
            onFocus={() => { if (isWorkspaceReadOnly && typeof onLockedAction === 'function') onLockedAction(); }}
            onClick={() => { if (isWorkspaceReadOnly && typeof onLockedAction === 'function') onLockedAction(); }}
            rows="4"
            placeholder="Enter primary diagnosis and relevant context for this prescription..."
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
          />
        </div>

        <div className="doctor-prescription-table-card">
          <div className="doctor-prescription-table-card__header">
            <div>
              <p className="doctor-detail-eyebrow mb-1">Medications</p>
            </div>
          </div>

          {medicationRows.length > 0 ? (
            <div className="doctor-prescription-list">
              {medicationRows.map((row, index) => {
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
                                 onClick={() => setEditorModalRowId(row.id)}
                                 type="button"
                               >
                                 <i className="bi bi-pencil-square me-2"></i>
                                 {isWorkspaceReadOnly ? 'View' : 'Edit'}
                               </button>
                              {!isWorkspaceReadOnly ? (
                                <button
                                  className="btn btn-sm btn-link text-danger"
                                  onClick={() => handleRemoveRow(row.id)}
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

                      {null}
                  </article>
                );
              })}
              {!isWorkspaceReadOnly ? (
                <button
                  className="doctor-prescription-list__add-btn"
                  onClick={openMedicineLibrary}
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
                onClick={openMedicineLibrary}
                type="button"
              >
                <i className="bi bi-search me-2"></i>
                Open Medicine Library
              </button>
            </div>
          )}
        </div>

      </div>

      {isLibraryOpen ? (
        <MedicineLibraryModal
          commonMedicines={commonMedicines}
          filteredMedicines={filteredMedicines}
          filters={libraryFilters}
          loading={loadingMedicines}
          onClose={closeMedicineLibrary}
          onQueryChange={setLibraryQuery}
          onSelectMedicine={handleSelectMedicine}
          onToggleFilter={(key) =>
            setLibraryFilters((currentFilters) => ({
              ...currentFilters,
              [key]: !currentFilters[key],
            }))
          }
          onToggleFilters={() => setShowLibraryFilters((currentValue) => !currentValue)}
          query={libraryQuery}
          recentMedicines={recentMedicines}
          selectedMedicineIds={selectedMedicineIds}
          showFilters={showLibraryFilters}
        />
      ) : null}

      {editorModalRowId ? (
        <PrescriptionEditorModal
          readOnly={isWorkspaceReadOnly}
          row={medicationRows.find((r) => r.id === editorModalRowId)}
          onClose={() => setEditorModalRowId(null)}
          onRowChange={handleRowChange}
          onTimingToggle={handleRowTimingToggle}
        />
      ) : null}
    </>
  );
};

export default PrescriptionTab;
