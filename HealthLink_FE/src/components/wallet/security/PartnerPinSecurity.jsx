import { useRef, useState } from 'react';
import { paymentApi } from '../../../api/paymentApi';
import { mapPartnerPinError } from './partnerPinWizardState';
import PartnerPinStatusAction from './PartnerPinStatusAction';
import PartnerPinWizardModal from './PartnerPinWizardModal';
import usePartnerPinStatus from './usePartnerPinStatus';

export default function PartnerPinSecurity({ compact = false, onConfigured }) {
  const { error, setError, setStatus, status } = usePartnerPinStatus();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [initialRetryAfterSeconds, setInitialRetryAfterSeconds] = useState(60);
  const openerRef = useRef(null);
  const start = async (event) => {
    openerRef.current = event.currentTarget;
    setLoading(true);
    setError('');
    try {
      await paymentApi.requestPartnerPinOtp();
      setInitialRetryAfterSeconds(60);
      setOpen(true);
    } catch (requestError) {
      const recovery = mapPartnerPinError(requestError.response?.data, 'request');
      setError(recovery.error);
      if (recovery.retryAfterSeconds !== null) {
        setInitialRetryAfterSeconds(recovery.retryAfterSeconds);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };
  const configured = (next) => {
    setStatus(next);
    onConfigured?.(next);
  };
  return <><PartnerPinStatusAction compact={compact} error={error} loading={loading} onStart={start} status={status} /><PartnerPinWizardModal initialRetryAfterSeconds={initialRetryAfterSeconds} onClose={() => setOpen(false)} onConfigured={configured} open={open} openerRef={openerRef} /></>;
}
