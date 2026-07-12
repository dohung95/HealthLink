import { useState } from 'react';
import { toast } from 'sonner';
import { requestPharmacyPasswordChangeOtp, verifyPharmacyPasswordChangeOtp } from '../../api/account';
import PartnerPinFlow from '../wallet/security/PartnerPinFlow';

export default function PharmacySecurityPanel({ token, logout }) {
  const [passwords, setPasswords] = useState({ newPassword: '', confirmNewPassword: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('password');
  const [saving, setSaving] = useState(false);

  const requestOtp = async (event) => {
    event.preventDefault();
    if (passwords.newPassword.length < 6 || passwords.newPassword !== passwords.confirmNewPassword) {
      toast.error('Enter matching passwords with at least 6 characters.'); return;
    }
    setSaving(true);
    try { await requestPharmacyPasswordChangeOtp(token); setStep('otp'); toast.success('OTP sent to your registered email.'); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to send OTP.'); }
    finally { setSaving(false); }
  };

  const changePassword = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await verifyPharmacyPasswordChangeOtp(token, { otp, ...passwords });
      toast.success('Password changed. Please sign in again.'); await logout();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to change password.'); }
    finally { setSaving(false); }
  };

  return <div className="pharmacy-security-stack">
    <section className="pharmacy-card">
      <div className="profile-section-header"><span className="material-symbols-outlined">password</span><h2>Password</h2></div>
      {step === 'password' ? <form className="pharmacy-form" onSubmit={requestOtp}>
        <label>New password<input type="password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} /></label>
        <label>Confirm new password<input type="password" value={passwords.confirmNewPassword} onChange={(e) => setPasswords((p) => ({ ...p, confirmNewPassword: e.target.value }))} /></label>
        <button className="profile-btn-primary" disabled={saving} type="submit">{saving ? 'Sending...' : 'Send OTP'}</button>
      </form> : <form className="pharmacy-form" onSubmit={changePassword}>
        <label>OTP code<input inputMode="numeric" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
        <button className="profile-btn-primary" disabled={saving || otp.length !== 6} type="submit">{saving ? 'Changing...' : 'Change password'}</button>
      </form>}
    </section>
    <section className="pharmacy-card">
      <div className="profile-section-header"><span className="material-symbols-outlined">pin</span><h2>Withdrawal PIN</h2></div>
      <PartnerPinFlow />
    </section>
  </div>;
}
