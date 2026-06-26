import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { consultationApi } from '@api/consultationApi';
import { buildConsultation } from '@utils/doctor/tabHelpers';

export function useConsultationNotes(appointmentId, appointment, appointmentDetail) {
  const [notesDraft, setNotesDraft] = useState({ diagnosis: '', doctorNotes: '', treatmentPlan: '' });
  const [savingNotes, setSavingNotes] = useState(false);

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
    if (!appointmentId || savingNotes) return;

    setSavingNotes(true);
    try {
      await consultationApi.updateAppointmentNotes(appointmentId, {
        diagnosis: notesDraft.diagnosis,
        doctorNotes: notesDraft.doctorNotes,
        treatmentPlan: notesDraft.treatmentPlan,
      });
    } catch (error) {
      console.error('Error saving consultation notes:', error);
      toast.error(error.response?.data?.message || 'Failed to save consultation notes');
    } finally {
      setSavingNotes(false);
    }
  }, [appointmentId, notesDraft, savingNotes]);

  return { notesDraft, savingNotes, handleNotesDraftChange, handleSaveNotes };
}
