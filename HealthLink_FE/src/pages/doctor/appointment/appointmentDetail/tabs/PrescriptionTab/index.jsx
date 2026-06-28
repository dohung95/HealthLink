import React, { useEffect, useMemo, useRef, useState } from 'react';
import { medicineApi } from '@api/medicineApi';
import AdminFormSection from './AdminFormSection';
import MedicationForm from './MedicationForm';
import MedicineSearch from './MedicineSearch';

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
  prescription,
  loadingPrescription,
  onDraftChange,
  readOnly = false,
  canEditPrescription = !readOnly,
  prescriptionDraft,
}) => {
  const workspaceAppointmentId = appointment?.appointmentID ?? appointment?.appointmentId ?? 'new';
  const isWorkspaceReadOnly = readOnly || !canEditPrescription;
  const rowRefs = useRef({});
  const initializedAppointmentIdRef = useRef(null);
  const [medicationRows, setMedicationRows] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [showLibraryFilters, setShowLibraryFilters] = useState(false);
  const [libraryFilters, setLibraryFilters] = useState(createEmptyFilterState);
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const [recentMedicineIds, setRecentMedicineIds] = useState([]);
  const [activeDosageForm, setActiveDosageForm] = useState(null);

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

      const draftRows = prescriptionDraft?.medicationRows;
      if (Array.isArray(draftRows) && draftRows.length > 0) {
        setMedicationRows(draftRows);
        setRecentMedicineIds(
          draftRows.map((r) => r.medicineId).filter(Boolean),
        );
      } else {
        setMedicationRows([]);
      }

      setHighlightedRowId(null);
      setLibraryQuery('');
      setShowLibraryFilters(false);
      setLibraryFilters(createEmptyFilterState());
      return;
    }

  }, [prescription, workspaceAppointmentId, prescriptionDraft]);

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

    if (prescription || !canEditPrescription || medicationRows.length === 0) {
      onDraftChange(null);
      return;
    }

    onDraftChange({
      appointmentId: workspaceAppointmentId,
      medicationRows,
    });
  }, [canEditPrescription, medicationRows, onDraftChange, prescription, workspaceAppointmentId]);

  useEffect(() => {
    if (!isWorkspaceReadOnly) {
      return;
    }

    setShowLibraryFilters(false);
  }, [isWorkspaceReadOnly]);

  const recentMedicines = useMemo(
    () => recentMedicineIds.map((id) => medicineMap.get(id)).filter(Boolean),
    [medicineMap, recentMedicineIds],
  );

  const commonMedicines = useMemo(() => medicineOptions.slice(0, 4), [medicineOptions]);

  const dosageForms = useMemo(() => {
    const forms = new Set(
      medicineOptions
        .map((m) => m.dosageForm?.trim().toLowerCase())
        .filter(Boolean),
    );
    forms.delete('tablet');
    return Array.from(forms).sort();
  }, [medicineOptions]);

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = libraryQuery.trim().toLowerCase();

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
      if (activeDosageForm && medicine.dosageForm?.toLowerCase() !== activeDosageForm) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      if (!enabledKeys.length) {
        return medicine.searchableText.includes(normalizedQuery);
      }

      return enabledKeys.some((key) =>
        String(medicine[key] || '').toLowerCase().includes(normalizedQuery),
      );
    });
  }, [libraryFilters, libraryQuery, medicineOptions, activeDosageForm]);

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
    if (isWorkspaceReadOnly) return;

    setLibraryQuery('');
    setShowLibraryFilters(false);
  };

  const handleSelectMedicine = (medicine) => {
    if (isWorkspaceReadOnly) return;

    setMedicationRows((currentRows) => {
      const existing = currentRows.find((r) => r.medicineId === medicine.medicineId);
      if (existing) {
        setTimeout(() => {
          pulseRow(existing.id);
          focusRow(existing.id);
          toast.info('Medication already in prescription');
        }, 0);
        return currentRows;
      }
      return [...currentRows, createMedicationRowFromMedicine(medicine)];
    });

    setRecentMedicineIds((currentIds) =>
      [medicine.medicineId, ...currentIds.filter((id) => id !== medicine.medicineId)].slice(0, 5)
    );
  };

  const handleRemoveRow = (rowId) => {
    if (isWorkspaceReadOnly) {
      return;
    }

    setMedicationRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
    setHighlightedRowId((currentId) => (currentId === rowId ? null : currentId));
  };

  const handleRowChange = (rowId, field, value) => {
    if (isWorkspaceReadOnly) {
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
      <div className="doctor-prescription-split">
          <div className="doctor-prescription-split__left">
            <MedicineSearch
              isPanel={true}
              commonMedicines={commonMedicines}
              dosageForms={dosageForms}
              activeDosageForm={activeDosageForm}
              filteredMedicines={filteredMedicines}
              filters={libraryFilters}
              loading={loadingMedicines}
              onClose={() => {}}
              onDosageFormChange={setActiveDosageForm}
              onQueryChange={setLibraryQuery}
              onSelectMedicine={handleSelectMedicine}
              onToggleFilter={(key) =>
                setLibraryFilters((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              onToggleFilters={() => setShowLibraryFilters((prev) => !prev)}
              query={libraryQuery}
              recentMedicines={recentMedicines}
              selectedMedicineIds={selectedMedicineIds}
              showFilters={showLibraryFilters}
            />
          </div>
          <div className="doctor-prescription-split__right">
            <div className="doctor-prescription-table-card">
              <div className="doctor-prescription-table-card__header">
                <p className="doctor-detail-eyebrow mb-1">
                  Prescription ({medicationRows.length} items)
                </p>
              </div>
              <MedicationForm
                rows={medicationRows}
                highlightedRowId={highlightedRowId}
                isWorkspaceReadOnly={isWorkspaceReadOnly}
                onRemove={handleRemoveRow}
                onAdd={openMedicineLibrary}
                rowRefs={rowRefs}
                onRowChange={handleRowChange}
                onTimingToggle={handleRowTimingToggle}
              />
              
            </div>
          </div>
      </div>
    </>);
};

export default PrescriptionTab;
