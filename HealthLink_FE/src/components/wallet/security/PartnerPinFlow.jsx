import { useCallback, useEffect, useState } from 'react';
import { paymentApi } from '../../../api/paymentApi';
import PinCodeInput from './PinCodeInput';

export default function PartnerPinFlow({ onConfigured, compact = false }) {
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState('status');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const result = await paymentApi.getPartnerPinStatus();
      setStatus(result);
      if (result.locked) setStep('locked');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load PIN status.');
    }
  }, []);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const requestOtp = async () => {
    setSaving(true); setError('');
    try {
      await paymentApi.requestPartnerPinOtp();
      setStep('enterOtpAndPin');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send OTP.');
    } finally { setSaving(false); }
  };

  const save = async () => {
    if (otp.length !== 6 || pin.length !== 6 || pin !== confirmPin) {
      setError(pin !== confirmPin ? 'PIN and confirmation do not match.' : 'Enter all six digits.');
      return;
    }
    setSaving(true); setError('');
    try {
      await paymentApi.setPartnerPin({ otp, pin, confirmPin });
      const next = { configured: true, locked: false, lockedUntil: null };
      setStatus(next); setStep('status'); setOtp(''); setPin(''); setConfirmPin('');
      onConfigured?.(next);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save PIN.');
    } finally { setSaving(false); }
  };

  if (!status && !error) return <p className="partner-pin-muted">Loading PIN security...</p>;
  if (step === 'locked') return <div className="partner-pin-lock"><strong>PIN temporarily locked</strong><span>Try again after {status?.lockedUntil || 'the lock period'}.</span></div>;
  if (step === 'enterOtpAndPin') return (
    <div className={`partner-pin-flow ${compact ? 'is-compact' : ''}`}>
      <PinCodeInput id="partner-pin-otp" label="OTP code" value={otp} onChange={setOtp} disabled={saving} />
      <PinCodeInput id="partner-pin-value" label="Withdrawal PIN" value={pin} onChange={setPin} disabled={saving} />
      <PinCodeInput id="partner-pin-confirm" label="Confirm withdrawal PIN" value={confirmPin} onChange={setConfirmPin} disabled={saving} error={error} />
      <div className="partner-pin-actions"><button type="button" onClick={() => setStep('status')} disabled={saving}>Cancel</button><button type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save PIN'}</button></div>
    </div>
  );
  return (
    <div className={`partner-pin-status ${compact ? 'is-compact' : ''}`}>
      <div><strong>{status?.configured ? 'Withdrawal PIN is configured' : 'Protect withdrawals with a PIN'}</strong><span>{status?.configured ? 'PIN is required on every supported withdrawal client.' : 'A six-digit PIN adds confirmation before payout.'}</span></div>
      <button type="button" onClick={requestOtp} disabled={saving}>{status?.configured ? 'Change PIN' : 'Create PIN'}</button>
      {error && <small className="partner-pin-error">{error}</small>}
    </div>
  );
}
