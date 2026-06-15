import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { requestDoctorPasswordChange, verifyDoctorPasswordChange } from '@api/account';

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

export default function DoctorChangePasswordModal({ onClose }) {
  const [step, setStep] = useState('request');
  const [otp, setOtp] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const token = getToken();
      await requestDoctorPasswordChange(token);
      setCountdown(60);
      setStep('verify');
      toast.success('OTP sent to your registered email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    try {
      const token = getToken();
      await requestDoctorPasswordChange(token);
      setCountdown(60);
      toast.success('OTP resent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      await verifyDoctorPasswordChange(token, {
        verificationCode: otp,
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        aria-modal="true"
        className="position-fixed top-0 start-0 w-100 h-100"
        onClick={onClose}
        role="dialog"
        style={{
          zIndex: 1050,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.15s ease-out',
        }}
      />

      <div
        className="position-fixed top-50 start-50 translate-middle w-100 mx-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          zIndex: 1051,
          maxWidth: '420px',
          padding: '0 1rem',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <section
          className="bg-white shadow-lg overflow-hidden"
          style={{
            borderRadius: '1.25rem',
            border: '1px solid var(--border)',
          }}
        >
          <div className="px-4 pt-4 pb-4" style={{ background: 'var(--primary-active)' }}>
            <div className="d-flex align-items-start justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <span
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary-subtle) 100%)',
                    color: 'var(--primary)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.375rem' }}>lock</span>
                </span>
                <div>
                  <h5 className="fw-bold mb-0" style={{ color: 'var(--primary-light)', fontSize: '1.125rem' }}>
                    Change Password
                  </h5>
                  <p className="small fw-medium mb-0 mt-1" style={{ color: 'var(--primary-light)', fontSize: '0.75rem' }}>
                    {step === 'request' ? 'Verify your identity' : 'Enter OTP and new password'}
                  </p>
                </div>
              </div>
              <button
                className="btn-close btn-close-white"
                onClick={onClose}
                type="button"
                aria-label="Close"
                style={{ opacity: 0.4, marginTop: '0.25rem' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
              />
            </div>
          </div>

          <div className="mx-4" style={{ height: '1px', background: 'var(--border)' }} />

          {step === 'request' ? (
            <div className="px-4 pt-4 pb-4">
              <div className="text-center mb-4">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: '3.5rem', height: '3.5rem', background: 'var(--primary-light)', color: 'var(--primary)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>mail</span>
                </span>
                <p className="fw-semibold mb-1" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                  Verify your email
                </p>
                <p className="small mb-0" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  An OTP will be sent to your registered email address to verify your identity before changing your password.
                </p>
              </div>
              <button
                className="btn fw-semibold py-2 w-100 d-inline-flex align-items-center justify-content-center gap-2 border-0"
                disabled={loading}
                onClick={handleSendOtp}
                type="button"
                style={{
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  background: loading ? 'var(--surface-muted)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                  color: loading ? 'var(--text-muted)' : '#fff',
                  boxShadow: loading ? 'none' : '0 4px 10px -2px rgba(0, 82, 204, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>send</span>
                    Send OTP
                  </>
                )}
              </button>
            </div>
          ) : (
            <form className="px-4 pt-3 pb-4" onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="small fw-bold mb-1 d-block" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  OTP Code
                </label>
                <input
                  className="form-control shadow-none text-center fw-bold"
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  style={{
                    fontSize: '1.25rem',
                    letterSpacing: '0.3em',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-border)';
                    e.currentTarget.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface-muted)';
                  }}
                />
                <button
                  className="small border-0 bg-transparent p-0 mt-1 fw-semibold"
                  disabled={countdown > 0 || loading}
                  onClick={handleResendOtp}
                  type="button"
                  style={{
                    color: countdown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                    fontSize: '0.75rem',
                  }}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>

              <div className="mb-3">
                <label className="small fw-bold mb-1 d-block" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  Current Password
                </label>
                <input
                  className="form-control shadow-none"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    padding: '0.625rem 0.75rem',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-border)';
                    e.currentTarget.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface-muted)';
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="small fw-bold mb-1 d-block" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  New Password
                </label>
                <input
                  className="form-control shadow-none"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    padding: '0.625rem 0.75rem',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-border)';
                    e.currentTarget.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface-muted)';
                  }}
                />
              </div>

              <div className="mb-4">
                <label className="small fw-bold mb-1 d-block" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  Confirm New Password
                </label>
                <input
                  className="form-control shadow-none"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    padding: '0.625rem 0.75rem',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-border)';
                    e.currentTarget.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface-muted)';
                  }}
                />
              </div>

              <div className="d-flex align-items-center gap-3">
                <button
                  className="btn fw-semibold py-2 px-4 flex-shrink-0"
                  onClick={onClose}
                  type="button"
                  style={{
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  Cancel
                </button>
                <button
                  className="btn fw-semibold py-2 w-100 d-inline-flex align-items-center justify-content-center gap-2 border-0"
                  disabled={loading}
                  type="submit"
                  style={{
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    background: loading ? 'var(--surface-muted)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                    color: loading ? 'var(--text-muted)' : '#fff',
                    boxShadow: loading ? 'none' : '0 4px 10px -2px rgba(0, 82, 204, 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>verified</span>
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
