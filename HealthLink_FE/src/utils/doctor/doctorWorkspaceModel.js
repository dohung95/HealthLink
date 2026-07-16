const NOTE_FIELDS = ['diagnosis', 'doctorNotes', 'treatmentPlan'];

export const DOCTOR_WORKSPACE_TABS = [
  { id: 'notes', label: 'Consultation Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', icon: 'bi-folder2-open' },
  { id: 'clinical-results', label: 'Clinical Results', icon: 'bi-clipboard2-pulse' },
  { id: 'prescription', label: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', icon: 'bi-calendar-check' },
];

function createDraft(source = {}) {
  return {
    diagnosis: source.diagnosis || '',
    doctorNotes: source.doctorNotes || '',
    treatmentPlan: source.treatmentPlan || '',
  };
}

function isSameAppointment(left, right) {
  if (left == null || right == null) return left === right;
  return String(left) === String(right);
}

function draftsEqual(left, right) {
  return NOTE_FIELDS.every((field) => (left?.[field] || '') === (right?.[field] || ''));
}

export function createConsultationNotesState(appointmentId, source) {
  return {
    appointmentId: appointmentId ?? null,
    draft: createDraft(source),
    dirty: false,
  };
}

export function hydrateConsultationNotesState(state, appointmentId, source) {
  if (isSameAppointment(state?.appointmentId, appointmentId) && state?.dirty) {
    return state;
  }
  return createConsultationNotesState(appointmentId, source);
}

export function updateConsultationNotesState(state, field, value) {
  if (!NOTE_FIELDS.includes(field)) return state;
  return {
    ...state,
    draft: { ...state.draft, [field]: value },
    dirty: true,
  };
}

export function markConsultationNotesSaved(state, savedDraft) {
  if (!draftsEqual(state?.draft, savedDraft)) return state;
  return { ...state, dirty: false };
}

export function shouldSaveConsultationNotesOnTabChange(currentTab, nextTab, dirty) {
  return currentTab === 'notes' && nextTab !== 'notes' && dirty === true;
}
