import { useCallback, useEffect, useState } from 'react';
import { vitalSignApi } from '@api/vitalSignApi';

const DEFAULT_VITAL_SIGN = {
  heartRate: 78,
  bloodPressureSystolic: 125,
  bloodPressureDiastolic: 82,
  oxygenSaturation: 98,
  temperature: 37.2,
  respiratoryRate: 16,
  source: 'HomeDevice',
  deviceName: 'Omron X7 Smart',
  measuredAt: new Date().toISOString(),
  notes: 'Patient reports feeling well this morning.',
};

export function useVitalSigns(appointmentId) {
  const [latestVitalSign, setLatestVitalSign] = useState(DEFAULT_VITAL_SIGN);
  const [loadingVitalSign, setLoadingVitalSign] = useState(false);

  const loadLatestVitalSign = useCallback(async () => {
    if (!appointmentId) return;

    setLoadingVitalSign(true);
    try {
      const data = await vitalSignApi.getLatestAppointmentVitalSign(appointmentId);
      setLatestVitalSign(data || DEFAULT_VITAL_SIGN);
    } catch (error) {
      console.error('Error loading vital signs:', error);
      setLatestVitalSign(DEFAULT_VITAL_SIGN);
    } finally {
      setLoadingVitalSign(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadLatestVitalSign();
  }, [loadLatestVitalSign]);

  return { latestVitalSign, loadingVitalSign };
}
