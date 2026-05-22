import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { medicineApi } from '../../../api/medicineApi';

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

const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyFilterState = () => ({
  brandName: true,
  genericName: true,
  dosageForm: false,
  manufacturer: false,
});

const getOptionLabel = (options, value, fallback) =>
  options.find((option) => option.value === value)?.label || fallback;

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
  const scheduleBadges = [
    item.frequency ? `Frequency: ${item.frequency}` : null,
    item.route ? `Route: ${item.route}` : null,
    item.timing ? `Timing: ${getOptionLabel(TIMING_OPTIONS, item.timing, item.timing)}` : null,
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
                className={`btn ${showFilters ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={onToggleFilters}
                type="button"
              >
                <i className="bi bi-funnel me-2"></i>
                Filters
                <span className="doctor-prescription-library__filter-count">{activeFilterCount}</span>
              </button>
              <button
                aria-label="Close medicine library"
                className="btn btn-light doctor-prescription-library__close"
                onClick={onClose}
                type="button"
              >
                <i className="bi bi-x-lg"></i>
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

const DoctorPrescriptionWorkspace = ({
  appointment,
  patient,
  consultation,
  prescription,
  loadingPrescription,
  onDraftChange,
  readOnly = false,
}) => {
  const workspaceAppointmentId = appointment?.appointmentID ?? appointment?.appointmentId ?? 'new';
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
  const [expandedRowId, setExpandedRowId] = useState(null);
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
      setExpandedRowId(null);
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

    if (prescription) {
      onDraftChange(null);
      return;
    }

    onDraftChange({
      appointmentId: workspaceAppointmentId,
      diagnosis,
      medicationRows,
    });
  }, [diagnosis, medicationRows, onDraftChange, prescription, workspaceAppointmentId]);

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
    setLibraryQuery('');
    setShowLibraryFilters(false);
    setIsLibraryOpen(true);
  };

  const closeMedicineLibrary = () => {
    setIsLibraryOpen(false);
    setShowLibraryFilters(false);
  };

  const handleSelectMedicine = (medicine) => {
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
      setExpandedRowId(existingRowId);
      pulseRow(existingRowId);
      focusRow(existingRowId);
      toast.info('This medication is already in the prescription');
      return;
    }

    if (nextRowId) {
      setExpandedRowId(nextRowId);
      pulseRow(nextRowId);
      focusRow(nextRowId);
      toast.success('Medication added to prescription');
    }
  };

  const handleRemoveRow = (rowId) => {
    setMedicationRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
    setExpandedRowId((currentId) => (currentId === rowId ? null : currentId));
    setHighlightedRowId((currentId) => (currentId === rowId ? null : currentId));
  };

  const handleRowChange = (rowId, field, value) => {
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
            readOnly={readOnly}
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
            {!readOnly ? (
              <button className="btn btn-outline-primary" onClick={openMedicineLibrary} type="button">
                <i className="bi bi-plus-lg me-2"></i>
                Add Item
              </button>
            ) : null}
          </div>

          {medicationRows.length > 0 ? (
            <div className="doctor-prescription-list">
              {medicationRows.map((row, index) => {
                const isExpanded = expandedRowId === row.id;
                const isHighlighted = highlightedRowId === row.id;
                const scheduleBadges = [
                  row.frequency
                    ? `Frequency: ${getOptionLabel(FREQUENCY_OPTIONS, row.frequency, row.frequency)}`
                    : null,
                  row.route ? `Route: ${row.route}` : null,
                  row.timing
                    ? `Timing: ${getOptionLabel(TIMING_OPTIONS, row.timing, row.timing)}`
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
                        </div>

                        <p className="doctor-prescription-item-card__meta">
                          {row.genericName ? `Generic: ${row.genericName}` : 'Selected from medicine library'}
                          {row.brandName ? ` | Brand: ${row.brandName}` : ''}
                        </p>

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

                      <div
                        className={`doctor-prescription-item-card__actions ${row.quantity ? 'doctor-prescription-item-card__actions--with-quantity' : ''}`}
                      >
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                          type="button"
                        >
                          <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} me-2`}></i>
                          {isExpanded ? 'Hide Details' : readOnly ? 'View Details' : 'Edit Details'}
                        </button>
                        {!readOnly ? (
                          <button
                            className="btn btn-sm btn-link text-danger"
                            onClick={() => handleRemoveRow(row.id)}
                            type="button"
                          >
                            <i className="bi bi-trash3 me-1"></i>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="doctor-prescription-item-card__editor">
                        <div className="doctor-prescription-field-grid">
                          <label className="doctor-prescription-field">
                            <span>Quantity {row.unit ? `(${row.unit})` : ''}</span>
                            <input
                              className="form-control doctor-prescription-input"
                              min="1"
                              placeholder="Qty"
                              readOnly={readOnly}
                              type="number"
                              value={row.quantity}
                              onChange={(event) => handleRowChange(row.id, 'quantity', event.target.value)}
                            />
                          </label>

                          <label className="doctor-prescription-field">
                            <span>Supply Days</span>
                            <input
                              className="form-control doctor-prescription-input"
                              min="1"
                              placeholder="Days"
                              readOnly={readOnly}
                              type="number"
                              value={row.totalSupplyDays}
                              onChange={(event) => handleRowChange(row.id, 'totalSupplyDays', event.target.value)}
                            />
                          </label>

                          <label className="doctor-prescription-field">
                            <span>Frequency</span>
                            <select
                              className="form-select doctor-prescription-input"
                              disabled={readOnly}
                              value={row.frequency}
                              onChange={(event) => handleRowChange(row.id, 'frequency', event.target.value)}
                            >
                              {FREQUENCY_OPTIONS.map((option) => (
                                <option key={option.value || 'blank'} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="doctor-prescription-field">
                            <span>Route</span>
                            <select
                              className="form-select doctor-prescription-input"
                              disabled={readOnly}
                              value={row.route}
                              onChange={(event) => handleRowChange(row.id, 'route', event.target.value)}
                            >
                              {ROUTE_OPTIONS.map((option) => (
                                <option key={option.value || 'blank'} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="doctor-prescription-field">
                            <span>Timing</span>
                            <select
                              className="form-select doctor-prescription-input"
                              disabled={readOnly}
                              value={row.timing}
                              onChange={(event) => handleRowChange(row.id, 'timing', event.target.value)}
                            >
                              {TIMING_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="doctor-prescription-field">
                            <span>Strength</span>
                            <input
                              className="form-control doctor-prescription-input"
                              readOnly
                              value={[row.strength, row.dosageForm].filter(Boolean).join(' / ') || 'Auto'}
                            />
                          </label>

                          <label className="doctor-prescription-field doctor-prescription-field--full">
                            <span>Instructions / Notes</span>
                            <textarea
                              className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                              placeholder="Add short instructions for the patient..."
                              readOnly={readOnly}
                              rows="3"
                              value={row.notes}
                              onChange={(event) => handleRowChange(row.id, 'notes', event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="doctor-prescription-empty-state">
              <div className="doctor-prescription-empty-state__icon">
                <i className="bi bi-capsule"></i>
              </div>
              <h4>No medication selected yet</h4>
              <p>Open the medicine library to choose a medication before filling in dosage details.</p>
              {!readOnly ? (
                <button className="btn btn-primary" onClick={openMedicineLibrary} type="button">
                  <i className="bi bi-search me-2"></i>
                  Open Medicine Library
                </button>
              ) : null}
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
    </>
  );
};

export default DoctorPrescriptionWorkspace;
