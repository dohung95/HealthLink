import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  requestPharmacyPasswordChangeOtp,
  requestPharmacyPaypalOtp,
  uploadPharmacyAvatar,
  verifyPharmacyPasswordChangeOtp,
  verifyPharmacyPaypalOtp,
} from '../../api/account';
import { Avatar, getProfileName } from './PharmacyShared';

function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function strengthLabel(score) {
  if (score <= 2) return 'Weak';
  if (score === 3) return 'Medium';
  return 'Strong';
}

function strengthClass(score) {
  if (score <= 2) return 'is-weak';
  if (score === 3) return 'is-medium';
  return 'is-strong';
}

export default function PharmacyProfileTab({ token, profile, reload, logout }) {
  const fileRef = useRef(null);

  const [form, setForm] = useState({ avatarUrl: '' });
  const [paypalData, setPaypalData] = useState({ newPaypalEmail: '' });
  const [paypalOtp, setPaypalOtp] = useState('');
  const [paypalStep, setPaypalStep] = useState('form');
  const [savingPaypal, setSavingPaypal] = useState(false);

  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmNewPassword: '' });
  const [passwordOtp, setPasswordOtp] = useState('');
  const [passwordStep, setPasswordStep] = useState('form');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setForm({ avatarUrl: profile?.avatarUrl || '' });
  }, [profile]);

  const name = getProfileName(profile);
  const address = [profile?.address, profile?.district, profile?.city].filter(Boolean).join(', ') || 'No address provided';
  const paypalScore = getPasswordStrength(passwordData.newPassword);

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadPharmacyAvatar(token, file);
      setForm((prev) => ({ ...prev, avatarUrl: result.avatarUrl }));
      toast.success('Avatar uploaded.');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload avatar.');
    }
  };

  const requestPaypalOtp = async (event) => {
    event.preventDefault();
    if (!paypalData.newPaypalEmail) {
      toast.error('Please enter a new PayPal email.');
      return;
    }
    setSavingPaypal(true);
    try {
      await requestPharmacyPaypalOtp(token, { newPaypalEmail: paypalData.newPaypalEmail });
      toast.success('OTP sent to your email.');
      setPaypalStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send OTP.');
    } finally {
      setSavingPaypal(false);
    }
  };

  const verifyPaypalOtp = async (event) => {
    event.preventDefault();
    if (!paypalOtp) {
      toast.error('Please enter the OTP code.');
      return;
    }
    setSavingPaypal(true);
    try {
      await verifyPharmacyPaypalOtp(token, { newPaypalEmail: paypalData.newPaypalEmail, otp: paypalOtp });
      toast.success('PayPal email updated.');
      setPaypalStep('form');
      setPaypalData({ newPaypalEmail: '' });
      setPaypalOtp('');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to verify OTP.');
    } finally {
      setSavingPaypal(false);
    }
  };

  const requestPasswordOtp = async (event) => {
    event.preventDefault();
    if (!passwordData.newPassword || !passwordData.confirmNewPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSavingPassword(true);
    try {
      await requestPharmacyPasswordChangeOtp(token);
      toast.success('OTP sent to your email.');
      setPasswordStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send OTP.');
    } finally {
      setSavingPassword(false);
    }
  };

  const verifyPasswordOtp = async (event) => {
    event.preventDefault();
    if (!passwordOtp) {
      toast.error('Please enter the OTP code.');
      return;
    }
    setSavingPassword(true);
    try {
      await verifyPharmacyPasswordChangeOtp(token, { otp: passwordOtp, newPassword: passwordData.newPassword });
      toast.success('Password changed. Please log in again.');
      await logout();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="pharmacy-profile-grid">
      {/* ── LEFT COLUMN ── */}
      <div className="profile-left">

        {/* ── CARD: Pharmacy Profile ── */}
        <section className="pharmacy-card">
          <div className="profile-section-header">
            <span className="material-symbols-outlined">store</span>
            <h2>Pharmacy Profile</h2>
          </div>

          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper">
              <Avatar profile={{ ...profile, avatarUrl: form.avatarUrl }} />
              <button className="profile-avatar-overlay" onClick={() => fileRef.current?.click()} type="button" aria-label="Upload photo">
                <span className="material-symbols-outlined">photo_camera</span>
              </button>
            </div>
            <div className="profile-avatar-info">
              <strong>{name}</strong>
              <span>{profile?.email || ''}</span>
              <button className="profile-upload-btn" onClick={() => fileRef.current?.click()} type="button">
                <span className="material-symbols-outlined">upload</span>
                Upload Photo
              </button>
              <input ref={fileRef} accept="image/*" hidden onChange={uploadAvatar} type="file" />
            </div>
          </div>

          <div className="profile-display-fields">
            <div className="profile-display-row">
              <span className="profile-display-label">Pharmacy Name</span>
              <span className="profile-display-value">{name}</span>
            </div>
            <div className="profile-display-row">
              <span className="profile-display-label">Email</span>
              <span className="profile-display-value">{profile?.email || '-'}</span>
            </div>
            <div className="profile-display-row">
              <span className="profile-display-label">Phone Number</span>
              <span className="profile-display-value">{profile?.phoneNumber || '-'}</span>
            </div>
          </div>
        </section>

        {/* ── CARD: Payment Info ── */}
        <section className="pharmacy-card">
          <div className="profile-section-header">
            <span className="material-symbols-outlined">payments</span>
            <h2>Payment Info</h2>
          </div>

          {paypalStep === 'form' ? (
            <div className="profile-step-form">
              <div className="profile-current-info">
                <span className="material-symbols-outlined">email</span>
                <span>Current PayPal: <strong>{profile?.paypalEmail || 'Not set'}</strong></span>
              </div>

              <div className="profile-step-indicator">
                <div className="profile-step-item is-active">
                  <span className="profile-step-dot is-active" />
                  Update
                </div>
                <span className="profile-step-line" />
                <div className="profile-step-item">
                  <span className="profile-step-dot" />
                  Verify OTP
                </div>
              </div>

              <form className="pharmacy-form" onSubmit={requestPaypalOtp}>
                <label>
                  New PayPal Email
                  <input
                    onChange={(e) => setPaypalData((p) => ({ ...p, newPaypalEmail: e.target.value }))}
                    placeholder="paypal@example.com"
                    type="email"
                    value={paypalData.newPaypalEmail}
                  />
                </label>
                <button className="profile-btn-primary" disabled={savingPaypal} type="submit">
                  <span className="material-symbols-outlined">mail</span>
                  {savingPaypal ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </div>
          ) : (
            <div className="profile-otp-form">
              <div className="profile-step-indicator">
                <div className="profile-step-item">
                  <span className="profile-step-dot" />
                  Update
                </div>
                <span className="profile-step-line is-active" />
                <div className="profile-step-item is-active">
                  <span className="profile-step-dot is-active" />
                  Verify OTP
                </div>
              </div>

              <form className="pharmacy-form" onSubmit={verifyPaypalOtp}>
                <label>
                  OTP Code
                  <input
                    onChange={(e) => setPaypalOtp(e.target.value)}
                    placeholder="Enter OTP sent to your email"
                    type="text"
                    value={paypalOtp}
                  />
                </label>
                <button className="profile-btn-primary" disabled={savingPaypal} type="submit">
                  <span className="material-symbols-outlined">check_circle</span>
                  {savingPaypal ? 'Verifying...' : 'Verify & Update'}
                </button>
              </form>

              <button className="profile-btn-ghost" onClick={() => setPaypalStep('form')} type="button">
                <span className="material-symbols-outlined">arrow_back</span>
                Back
              </button>
            </div>
          )}
        </section>

        {/* ── CARD: Change Password ── */}
        <section className="pharmacy-card">
          <div className="profile-section-header">
            <span className="material-symbols-outlined">lock</span>
            <h2>Change Password</h2>
          </div>

          {passwordStep === 'form' ? (
            <div className="profile-step-form">
              <div className="profile-step-indicator">
                <div className="profile-step-item is-active">
                  <span className="profile-step-dot is-active" />
                  New Password
                </div>
                <span className="profile-step-line" />
                <div className="profile-step-item">
                  <span className="profile-step-dot" />
                  Verify OTP
                </div>
              </div>

              <form className="pharmacy-form" onSubmit={requestPasswordOtp}>
                <label>
                  New Password
                  <input
                    onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                    type="password"
                    value={passwordData.newPassword}
                    placeholder="Min. 6 characters"
                  />
                </label>

                {passwordData.newPassword && (
                  <div className="profile-password-strength">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={`profile-strength-bar ${i <= paypalScore ? strengthClass(paypalScore) : ''}`} />
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--pharmacy-muted)', fontWeight: 700, marginLeft: 6 }}>
                      {strengthLabel(paypalScore)}
                    </span>
                  </div>
                )}

                <label>
                  Confirm New Password
                  <input
                    onChange={(e) => setPasswordData((p) => ({ ...p, confirmNewPassword: e.target.value }))}
                    type="password"
                    value={passwordData.confirmNewPassword}
                    placeholder="Re-enter new password"
                  />
                </label>

                <button className="profile-btn-primary" disabled={savingPassword} type="submit">
                  <span className="material-symbols-outlined">mail</span>
                  {savingPassword ? 'Sending...' : 'Send OTP Code'}
                </button>
              </form>
            </div>
          ) : (
            <div className="profile-otp-form">
              <div className="profile-step-indicator">
                <div className="profile-step-item">
                  <span className="profile-step-dot" />
                  New Password
                </div>
                <span className="profile-step-line is-active" />
                <div className="profile-step-item is-active">
                  <span className="profile-step-dot is-active" />
                  Verify OTP
                </div>
              </div>

              <form className="pharmacy-form" onSubmit={verifyPasswordOtp}>
                <label>
                  OTP Code
                  <input
                    onChange={(e) => setPasswordOtp(e.target.value)}
                    placeholder="Enter OTP sent to your email"
                    type="text"
                    value={passwordOtp}
                  />
                </label>
                <button className="profile-btn-primary" disabled={savingPassword} type="submit">
                  <span className="material-symbols-outlined">lock</span>
                  {savingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </form>

              <button className="profile-btn-ghost" onClick={() => setPasswordStep('form')} type="button">
                <span className="material-symbols-outlined">arrow_back</span>
                Back
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="profile-right">
        <section className="pharmacy-card profile-status-card">
          <Avatar profile={{ ...profile, avatarUrl: form.avatarUrl }} />
          <h3>{name}</h3>
          <p className="profile-status-address">{address}</p>

          <div className={`profile-status-badge ${profile?.verified ? 'is-verified' : 'is-pending'}`}>
            <span className="material-symbols-outlined">
              {profile?.verified ? 'verified' : 'hourglass_empty'}
            </span>
            {profile?.verified ? 'Verified Partner' : 'Pending Verification'}
          </div>

          <div className="profile-status-divider" />

          <div className="profile-status-item">
            <span className="material-symbols-outlined">phone</span>
            Phone
            <strong>{profile?.phoneNumber || '-'}</strong>
          </div>
          <div className="profile-status-item">
            <span className="material-symbols-outlined">email</span>
            Email
            <strong>{profile?.email || '-'}</strong>
          </div>
          <div className="profile-status-item">
            <span className="material-symbols-outlined">payments</span>
            PayPal
            <strong>{profile?.paypalEmail || 'Not set'}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
