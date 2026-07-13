import { useCallback, useEffect, useState } from 'react';
import { paymentApi } from '../../../api/paymentApi';

export default function usePartnerPinStatus() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const loadStatus = useCallback(async () => {
    setError('');
    try {
      setStatus(await paymentApi.getPartnerPinStatus());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load PIN status.');
    }
  }, []);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  return { status, setStatus, error, setError };
}
