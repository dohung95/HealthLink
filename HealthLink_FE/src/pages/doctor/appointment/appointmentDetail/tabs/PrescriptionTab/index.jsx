import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { medicineApi } from '@api/medicineApi';
import MedicationForm from './MedicationForm';
import MedicineSearch from './MedicineSearch';
import PrescriptionEditorModal from './PrescriptionConfirmModal';
import AdminFormSection from './AdminFormSection';

let rowCounter = 0;
const createRowId = () => `row-${Date.now()}-${++rowCounter}`;

const createEmptyFilterState = () => ({
  brandName: true,
  genericName: true,
  dosageForm: false,
  manufacturer: false,
});

const normalizeTimingValues = (timings, timing) => {
  const source = Array.isArray(timings) && timings.length > 0
    ? timings
    : String(timing || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  return [...new Set(source.map((value) => String(value).toUpperCase()).filter(Boolean))];
};

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

    const LIBRARY_FILTERS = [
      { key: 'brandName', label: 'Brand Name' },
      { key: 'genericName', label: 'Generic Name' },
      { key: 'dosageForm', label: 'Dosage Form' },
      { key: 'manufacturer', label: 'Manufacturer' },
    ];

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
      <AdminFormSection
        prescription={prescription}
        patientName={summaryStats.patientName}
      />
    );
  }

  return (
    <>
      <div className="doctor-prescription-workspace">
        <AdminFormSection
          diagnosis={diagnosis}
          isWorkspaceReadOnly={isWorkspaceReadOnly}
          onDiagnosisChange={setDiagnosis}
          onLockedAction={onLockedAction}
        />

        <div className="doctor-prescription-table-card">
          <div className="doctor-prescription-table-card__header">
            <div>
              <p className="doctor-detail-eyebrow mb-1">Medications</p>
            </div>
          </div>

          <MedicationForm
            rows={medicationRows}
            highlightedRowId={highlightedRowId}
            isWorkspaceReadOnly={isWorkspaceReadOnly}
            onEdit={setEditorModalRowId}
            onRemove={handleRemoveRow}
            onAdd={openMedicineLibrary}
            rowRefs={rowRefs}
          />
        </div>
      </div>

      {isLibraryOpen ? (
        <MedicineSearch
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
