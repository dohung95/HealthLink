import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { requestPharmacyPasswordChangeOtp, verifyPharmacyPasswordChangeOtp } from '../../api/account';
import { useModalFocus } from '../shared/modalFocus';

const emptyPasswords = { newPassword: '', confirmNewPassword: '' };

export default function PharmacyPasswordChangeModal({ onClose, open, openerRef, token, logout }) {
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('password');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);

  const close = useCallback((force = false) => {
    if (saving && !force) return;
    setPasswords(emptyPasswords);
    setOtp('');
    setStep('password');
    setError('');
    onClose();
  }, [onClose, saving]);

  useModalFocus({ active: open, closeDisabled: saving, dialogRef, focusKey: step, onClose: close, openerRef });

  const requestOtp = async (event) => {
    event.preventDefault();
    if (passwords.newPassword.length < 6 || passwords.newPassword !== passwords.confirmNewPassword) {
      setError('Enter matching passwords with at least 6 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await requestPharmacyPasswordChangeOtp(token);
      setStep('otp');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send OTP.');
    } finally {
      setSaving(false);
    }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setError('Enter the six-digit code.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await verifyPharmacyPasswordChangeOtp(token, { otp, ...passwords });
      close(true);
      toast.success('Password changed. Please sign in again.');
      await logout();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };
  if (!open) return null;

  return createPortal(
    <div className="pharmacy-security-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section aria-labelledby="pharmacy-password-modal-title" aria-modal="true" className="pharmacy-security-modal" ref={dialogRef} role="dialog">
        <header className="pharmacy-security-modal-header"><div><p>Security</p><h2 id="pharmacy-password-modal-title">Change password</h2></div><button aria-label="Close password change" className="pharmacy-security-icon-button" disabled={saving} onClick={() => close()} type="button"><span className="material-symbols-outlined">close</span></button></header>
        {step === 'password' ? <form className="pharmacy-security-modal-body" noValidate onSubmit={requestOtp}><label htmlFor="pharmacy-new-password">New password<input autoComplete="new-password" id="pharmacy-new-password" onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} type="password" value={passwords.newPassword} /></label><label htmlFor="pharmacy-confirm-password">Confirm new password<input autoComplete="new-password" id="pharmacy-confirm-password" onChange={(event) => setPasswords((current) => ({ ...current, confirmNewPassword: event.target.value }))} type="password" value={passwords.confirmNewPassword} /></label>{error && <p className="pharmacy-security-error" role="alert">{error}</p>}<footer><button className="pharmacy-security-secondary-button" disabled={saving} onClick={() => close()} type="button">Cancel</button><button className="pharmacy-security-primary-button" disabled={saving} type="submit">{saving ? 'Sending...' : 'Request code'}</button></footer></form> : <form className="pharmacy-security-modal-body" noValidate onSubmit={changePassword}><p className="pharmacy-security-modal-copy">Enter the code sent to your registered email.</p><label htmlFor="pharmacy-password-otp">OTP code<input autoComplete="one-time-code" id="pharmacy-password-otp" inputMode="numeric" maxLength="6" onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} value={otp} /></label>{error && <p className="pharmacy-security-error" role="alert">{error}</p>}<footer><button className="pharmacy-security-secondary-button" disabled={saving} onClick={() => close()} type="button">Cancel</button><button className="pharmacy-security-primary-button" disabled={saving || otp.length !== 6} type="submit">{saving ? 'Changing...' : 'Change password'}</button></footer></form>}
      </section>
    </div>,
    document.body,
  );
}
