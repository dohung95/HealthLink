import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { consultationApi } from '@api/consultationApi';
import { buildConsultation } from '@utils/doctor/tabHelpers';

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
  const [notesDraft, setNotesDraft] = useState({ diagnosis: '', doctorNotes: '', treatmentPlan: '' });
  const [savingNotes, setSavingNotes] = useState(false);
  const savingLockRef = useRef(false);

  useEffect(() => {
    const consultation = buildConsultation(appointmentDetail || appointment);
    setNotesDraft({
      diagnosis: consultation.diagnosis || '',
      doctorNotes: consultation.doctorNotes || '',
      treatmentPlan: consultation.treatmentPlan || '',
    });
  }, [
    appointment,
    appointmentDetail,
    appointmentDetail?.consultation?.diagnosis,
    appointmentDetail?.consultation?.doctorNotes,
    appointmentDetail?.consultation?.treatmentPlan,
    appointmentDetail?.diagnosis,
    appointmentDetail?.doctorNotes,
    appointmentDetail?.treatmentPlan,
  ]);

  const handleNotesDraftChange = useCallback((field, value) => {
    setNotesDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const handleSaveNotes = useCallback(async () => {
    if (!appointmentId || savingLockRef.current) return false;

    savingLockRef.current = true;
    setSavingNotes(true);
    try {
      await consultationApi.updateAppointmentNotes(appointmentId, {
        diagnosis: stripHtml(notesDraft.diagnosis),
        doctorNotes: stripHtml(notesDraft.doctorNotes),
        treatmentPlan: stripHtml(notesDraft.treatmentPlan),
      });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save consultation notes');
      return false;
    } finally {
      savingLockRef.current = false;
      setSavingNotes(false);
    }
  }, [appointmentId, notesDraft]);

  return { notesDraft, savingNotes, handleNotesDraftChange, handleSaveNotes };
}
