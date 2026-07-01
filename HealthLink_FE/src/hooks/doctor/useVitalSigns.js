import { useCallback, useEffect, useState, useRef } from 'react';
import { vitalSignApi } from '@api/vitalSignApi';

export function useVitalSigns(appointmentId) {
  const [latestVitalSign, setLatestVitalSign] = useState(null);
  const [loadingVitalSign, setLoadingVitalSign] = useState(false);
  const isPollingRef = useRef(false);

  const loadLatestVitalSign = useCallback(async (isSilent = false) => {
    if (!appointmentId) return false;

    if (!isSilent) setLoadingVitalSign(true);
    try {
      const data = await vitalSignApi.getLatestAppointmentVitalSign(appointmentId);
      if (data && data.vitalSignId) {
          setLatestVitalSign(data);
          return true; // Found
      }
      setLatestVitalSign(null);
      return false; // Not found
    } catch (error) {
      // 404 means no vitals yet
      if (error.response && error.response.status !== 404) {
          console.error('Error loading vital signs:', error);
      }
      setLatestVitalSign(null);
      return false;
    } finally {
      if (!isSilent) setLoadingVitalSign(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    let intervalId;

    const fetchInitialAndPoll = async () => {
      const found = await loadLatestVitalSign(false);
      
      // If not found, start polling every 3 seconds
      if (!found && !isPollingRef.current) {
        isPollingRef.current = true;
        intervalId = setInterval(async () => {
          const foundNow = await loadLatestVitalSign(true);
          if (foundNow) {
            clearInterval(intervalId);
            isPollingRef.current = false;
          }
        }, 3000);
      }
    };

    fetchInitialAndPoll();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      isPollingRef.current = false;
    };
  }, [loadLatestVitalSign]);

  return { latestVitalSign, loadingVitalSign };
}
