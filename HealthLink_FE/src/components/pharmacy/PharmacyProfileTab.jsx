import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  changePharmacyPassword,
  requestPharmacyEmailChange,
  updatePharmacyProfile,
  uploadPharmacyAvatar,
  verifyPharmacyEmailChange,
} from '../../api/account';
import { Avatar, getProfileName } from './PharmacyShared';

export default function PharmacyProfileTab({ token, profile, reload, logout }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [emailData, setEmailData] = useState({ newEmail: '', password: '' });
  const [otp, setOtp] = useState('');
  const [emailStep, setEmailStep] = useState('form');

  useEffect(() => {
    setForm({
      phoneNumber: profile?.phoneNumber || '',
      description: profile?.description || '',
      avatarUrl: profile?.avatarUrl || '',
      openTime: profile?.openTime || '',
      closeTime: profile?.closeTime || '',
      workingDays: profile?.workingDays || '',
      deliveryFee: profile?.deliveryFee ?? '',
      deliveryRadius: profile?.deliveryRadius ?? '',
      deliveryAvailable: Boolean(profile?.deliveryAvailable),
      paypalEmail: profile?.paypalEmail || '',
    });
  }, [profile]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updatePharmacyProfile(token, form);
      toast.success('Pharmacy profile updated.');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadPharmacyAvatar(token, file);
      updateField('avatarUrl', result.avatarUrl);
      toast.success('Avatar uploaded.');
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload avatar.');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      await changePharmacyPassword(token, passwords);
      toast.success('Password changed. Please log in again.');
      await logout();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to change password.');
    }
  };

  const requestEmail = async (event) => {
    event.preventDefault();
    try {
      await requestPharmacyEmailChange(token, emailData);
      toast.success('OTP sent to your new email.');
      setEmailStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to request email change.');
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();
    try {
      await verifyPharmacyEmailChange(token, { newEmail: emailData.newEmail, otp });
      toast.success('Email changed. Please log in again.');
      await logout();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to verify email.');
    }
  };

  return (
    <>
      <div className="pharmacy-profile-grid">
        <section className="pharmacy-card pharmacy-card-large">
          <h2>Pharmacy Profile</h2>
          <form className="pharmacy-profile-form" onSubmit={saveProfile}>
            <div className="pharmacy-avatar-editor">
              <Avatar profile={{ ...profile, avatarUrl: form.avatarUrl }} />
              <label className="pharmacy-secondary-action">
                Upload Avatar
                <input accept="image/*" hidden onChange={uploadAvatar} type="file" />
              </label>
            </div>
            <label>Pharmacy Name<input disabled value={getProfileName(profile)} /></label>
            <label>Email<input disabled value={profile?.email || ''} /></label>
            <label>Phone Number<input onChange={(event) => updateField('phoneNumber', event.target.value)} value={form.phoneNumber || ''} /></label>
            <label>Open Time<input onChange={(event) => updateField('openTime', event.target.value)} type="time" value={form.openTime || ''} /></label>
            <label>Close Time<input onChange={(event) => updateField('closeTime', event.target.value)} type="time" value={form.closeTime || ''} /></label>
            <label>Working Days<input onChange={(event) => updateField('workingDays', event.target.value)} placeholder="Mon-Sun" value={form.workingDays || ''} /></label>
            <label>Delivery Fee<input onChange={(event) => updateField('deliveryFee', event.target.value)} step="0.01" type="number" value={form.deliveryFee} /></label>
            <label>Delivery Radius<input onChange={(event) => updateField('deliveryRadius', event.target.value)} step="0.1" type="number" value={form.deliveryRadius} /></label>
            <label>PayPal Email<input onChange={(event) => updateField('paypalEmail', event.target.value)} type="email" value={form.paypalEmail || ''} /></label>
            <label className="wide">Description<textarea onChange={(event) => updateField('description', event.target.value)} value={form.description || ''} /></label>
            <label className="checkbox-line wide"><input checked={Boolean(form.deliveryAvailable)} onChange={(event) => updateField('deliveryAvailable', event.target.checked)} type="checkbox" /> Delivery Available</label>
            <button disabled={saving} type="submit">{saving ? 'Saving...' : 'Save Profile Changes'}</button>
          </form>
        </section>

        <section className="pharmacy-card">
          <h2>Public Preview</h2>
          <div className="pharmacy-public-preview">
            <div className="preview-map" />
            <Avatar profile={{ ...profile, avatarUrl: form.avatarUrl }} />
            <h3>{getProfileName(profile)}</h3>
            <span>{profile?.verified ? 'Verified Partner' : 'Pending Verification'}</span>
            <p>{[profile?.address, profile?.district, profile?.city].filter(Boolean).join(', ') || 'No address provided'}</p>
          </div>
        </section>

        <section className="pharmacy-card">
          <h2>Contact Email</h2>
          {emailStep === 'form' ? (
            <form className="pharmacy-form" onSubmit={requestEmail}>
              <label>New Email<input onChange={(event) => setEmailData((current) => ({ ...current, newEmail: event.target.value }))} type="email" value={emailData.newEmail} /></label>
              <label>Current Password<input onChange={(event) => setEmailData((current) => ({ ...current, password: event.target.value }))} type="password" value={emailData.password} /></label>
              <button type="submit">Send OTP</button>
            </form>
          ) : (
            <form className="pharmacy-form" onSubmit={verifyEmail}>
              <label>OTP Code<input onChange={(event) => setOtp(event.target.value)} value={otp} /></label>
              <button type="submit">Verify & Update Email</button>
              <button className="secondary" onClick={() => setEmailStep('form')} type="button">Back</button>
            </form>
          )}
        </section>

        <section className="pharmacy-card">
          <h2>Change Password</h2>
          <form className="pharmacy-form" onSubmit={changePassword}>
            <label>Current Password<input onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} type="password" value={passwords.currentPassword} /></label>
            <label>New Password<input onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} type="password" value={passwords.newPassword} /></label>
            <label>Confirm New Password<input onChange={(event) => setPasswords((current) => ({ ...current, confirmNewPassword: event.target.value }))} type="password" value={passwords.confirmNewPassword} /></label>
            <button type="submit">Update Password</button>
          </form>
        </section>
      </div>
    </>
  );
}
