import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { consultationApi } from '@api/consultationApi';
import { buildConsultation } from '@utils/doctor/tabHelpers';
import {
  createConsultationNotesState,
  hydrateConsultationNotesState,
  markConsultationNotesSaved,
  updateConsultationNotesState,
} from '@utils/doctor/doctorWorkspaceModel';

const stripHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export function useConsultationNotes(appointmentId, appointment, appointmentDetail) {
  const initialConsultation = buildConsultation(appointmentDetail || appointment);
  const [notesState, setNotesState] = useState(
    () => createConsultationNotesState(appointmentId, initialConsultation),
  );
  const [savingNotes, setSavingNotes] = useState(false);
  const notesStateRef = useRef(notesState);
  const savingLockRef = useRef(false);
  const serverNotesSignature = JSON.stringify(
    createConsultationNotesState(
      appointmentId,
      buildConsultation(appointmentDetail || appointment),
    ).draft,
  );

  useEffect(() => {
    const serverDraft = JSON.parse(serverNotesSignature);
    const nextState = hydrateConsultationNotesState(
      notesStateRef.current,
      appointmentId,
      serverDraft,
    );
    if (nextState !== notesStateRef.current) {
      notesStateRef.current = nextState;
      setNotesState(nextState);
    }
  }, [appointmentId, serverNotesSignature]);

  const handleNotesDraftChange = useCallback((field, value) => {
    const nextState = updateConsultationNotesState(notesStateRef.current, field, value);
    notesStateRef.current = nextState;
    setNotesState(nextState);
  }, []);

  const handleSaveNotes = useCallback(async () => {
    if (!appointmentId || savingLockRef.current) return false;

    const stateToSave = notesStateRef.current;
    if (!stateToSave.dirty) return true;
    const draftToSave = stateToSave.draft;

    savingLockRef.current = true;
    setSavingNotes(true);
    try {
      await consultationApi.updateAppointmentNotes(appointmentId, {
        diagnosis: stripHtml(draftToSave.diagnosis),
        doctorNotes: stripHtml(draftToSave.doctorNotes),
        treatmentPlan: stripHtml(draftToSave.treatmentPlan),
      });
      const nextState = markConsultationNotesSaved(notesStateRef.current, draftToSave);
      notesStateRef.current = nextState;
      setNotesState(nextState);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save consultation notes');
      return false;
    } finally {
      savingLockRef.current = false;
      setSavingNotes(false);
    }
  }, [appointmentId]);

  return {
    notesDraft: notesState.draft,
    notesDirty: notesState.dirty,
    savingNotes,
    handleNotesDraftChange,
    handleSaveNotes,
  };
}
