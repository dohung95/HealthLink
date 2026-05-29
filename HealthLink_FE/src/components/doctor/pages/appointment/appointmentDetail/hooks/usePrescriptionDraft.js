import { useCallback, useEffect, useMemo, useReducer } from 'react';

const initialState = {
  diagnosis: '',
  medicationRows: [],
};

function prescriptionReducer(state, action) {
  switch (action.type) {
    case 'SET_DIAGNOSIS':
      return { ...state, diagnosis: action.payload };
    case 'INIT_FROM_CONSULTATION':
      return { ...state, diagnosis: action.payload || '' };
    case 'ADD_MEDICATION': {
      const existing = state.medicationRows.find((r) => r.medicineId === action.payload.medicineId);
      if (existing) return { ...state, duplicateRowId: existing.id };
      return {
        ...state,
        medicationRows: [...state.medicationRows, action.payload],
        duplicateRowId: null,
      };
    }
    case 'REMOVE_MEDICATION':
      return {
        ...state,
        medicationRows: state.medicationRows.filter((r) => r.id !== action.payload),
      };
    case 'UPDATE_ROW':
      return {
        ...state,
        medicationRows: state.medicationRows.map((r) =>
          r.id === action.payload.rowId ? { ...r, [action.payload.field]: action.payload.value } : r,
        ),
      };
    case 'TOGGLE_TIMING': {
      return {
        ...state,
        medicationRows: state.medicationRows.map((r) => {
          if (r.id !== action.payload.rowId) return r;
          const current = Array.isArray(r.timings) && r.timings.length > 0
            ? r.timings
            : String(r.timing || '').split(',').map((v) => v.trim()).filter(Boolean);
          const next = current.includes(action.payload.value)
            ? current.filter((v) => v !== action.payload.value)
            : [...current, action.payload.value];
          return { ...r, timings: next, timing: next.join(',') };
        }),
      };
    }
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function usePrescriptionDraft(appointmentId, consultation, prescription, readOnly) {
  const [state, dispatch] = useReducer(prescriptionReducer, initialState);

  useEffect(() => {
    if (prescription) return;
    dispatch({ type: 'INIT_FROM_CONSULTATION', payload: consultation?.diagnosis });
  }, [consultation?.diagnosis, prescription]);

  const draft = useMemo(() => {
    if (prescription) return null;
    return {
      appointmentId,
      diagnosis: state.diagnosis,
      medicationRows: state.medicationRows,
    };
  }, [appointmentId, state.diagnosis, state.medicationRows, prescription]);

  const setDiagnosis = useCallback((value) => {
    dispatch({ type: 'SET_DIAGNOSIS', payload: value });
  }, []);

  const handleAddMedication = useCallback((medicine, createRowFn) => {
    dispatch({ type: 'ADD_MEDICATION', payload: createRowFn(medicine) });
  }, []);

  const handleRemoveRow = useCallback((rowId) => {
    dispatch({ type: 'REMOVE_MEDICATION', payload: rowId });
  }, []);

  const handleRowChange = useCallback((rowId, field, value) => {
    dispatch({ type: 'UPDATE_ROW', payload: { rowId, field, value } });
  }, []);

  const handleRowTimingToggle = useCallback((rowId, value) => {
    dispatch({ type: 'TOGGLE_TIMING', payload: { rowId, value } });
  }, []);

  const resetDraft = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    diagnosis: state.diagnosis,
    medicationRows: state.medicationRows,
    duplicateRowId: state.duplicateRowId,
    draft,
    setDiagnosis,
    handleAddMedication,
    handleRemoveRow,
    handleRowChange,
    handleRowTimingToggle,
    resetDraft,
  };
}
