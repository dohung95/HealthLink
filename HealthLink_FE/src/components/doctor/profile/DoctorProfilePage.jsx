import React, { useEffect, useMemo, useState } from 'react';
import {
  getDoctorProfile,
  requestDoctorEmailChange,
  updateDoctorProfile,
  uploadDoctorAvatar,
  verifyDoctorEmailChange,
} from '../../../api/account';
import { useAuth } from '../../../context/AuthContext';
import Loading from '../../Loading';
import { toast } from 'sonner';
import DoctorWalletTab from './DoctorWalletTab';

const initialForm = {
  phoneNumber: '',
  description: '',
  avatarUrl: '',
  paypalEmail: '',
};

export default function DoctorProfilePage() {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [emailStep, setEmailStep] = useState('request');
  const [emailData, setEmailData] = useState({ newEmail: '', password: '' });
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await getDoctorProfile(token);
        setProfile(data);
        setFormData({
          phoneNumber: data.phoneNumber || '',
          description: data.description || '',
          avatarUrl: data.avatarUrl || '',
          paypalEmail: data.paypalEmail || '',
        });
      } catch (error) {
        console.error('Error loading doctor profile:', error);
        toast.error('Unable to load doctor profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const summary = useMemo(() => ({
    specialty: profile?.specialty || 'Not set',
    clinic: profile?.hospital || 'Not set',
    address: profile?.workingAddress || 'Not set',
    experience: profile?.yearsOfExperience ? `${profile.yearsOfExperience} years` : 'Not set',
  }), [profile]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await updateDoctorProfile(token, formData);
      setProfile(updated);
      setFormData({
        phoneNumber: updated.phoneNumber || '',
        description: updated.description || '',
        avatarUrl: updated.avatarUrl || '',
        paypalEmail: updated.paypalEmail || '',
      });
      toast.success('Doctor profile updated.');
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      toast.error(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const response = await uploadDoctorAvatar(token, file);
      setFormData((prev) => ({ ...prev, avatarUrl: response.avatarUrl }));
      setProfile((prev) => ({ ...prev, avatarUrl: response.avatarUrl }));
      toast.success('Avatar uploaded.');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.response?.data?.message || 'Unable to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  const requestEmailOtp = async (event) => {
    event.preventDefault();
    try {
      await requestDoctorEmailChange(token, emailData);
      setEmailStep('verify');
      toast.success('OTP sent to your new email.');
    } catch (error) {
      console.error('Error requesting doctor email change:', error);
      toast.error(error.response?.data?.message || 'Unable to request email change.');
    }
  };

  const verifyEmailOtp = async (event) => {
    event.preventDefault();
    try {
      await verifyDoctorEmailChange(token, { newEmail: emailData.newEmail, otp });
      toast.success('Email updated. Please sign in again.');
      logout();
    } catch (error) {
      console.error('Error verifying doctor email change:', error);
      toast.error(error.response?.data?.message || 'Unable to verify OTP.');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="section py-5 Background_Schedule">
      <div className="container" style={{ paddingTop: '180px', maxWidth: '1100px' }}>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4 d-flex flex-column flex-md-row align-items-md-center gap-4">
            <img
              src={formData.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.fullName || 'Doctor'}`}
              alt="Doctor avatar"
              width="88"
              height="88"
              className="rounded-circle border border-3 border-success-subtle"
              style={{ objectFit: 'cover' }}
            />
            <div className="flex-grow-1">
              <h1 className="h3 mb-1">Dr. {profile?.fullName || 'Doctor'}</h1>
              <p className="text-muted mb-2">{summary.specialty} · {profile?.email}</p>
              <div className="d-flex flex-wrap gap-3 small text-secondary">
                <span><i className="bi bi-hospital me-1"></i>{summary.clinic}</span>
                <span><i className="bi bi-geo-alt me-1"></i>{summary.address}</span>
                <span><i className="bi bi-award me-1"></i>{summary.experience}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 pt-4">
            <div className="nav nav-pills gap-2">
              <button
                type="button"
                className={`btn ${activeTab === 'profile' ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'security' ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('security')}
              >
                Security
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'wallet' ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('wallet')}
              >
                Wallet
              </button>
            </div>
          </div>

          <div className="card-body p-4">
            {activeTab === 'profile' ? (
              <form onSubmit={handleSave}>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label">Phone Number</label>
                    <input
                      name="phoneNumber"
                      className="form-control"
                      value={formData.phoneNumber}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">PayPal Email</label>
                    <input
                      type="email"
                      name="paypalEmail"
                      className="form-control"
                      value={formData.paypalEmail}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Avatar</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                    <div className="form-text">{uploading ? 'Uploading avatar...' : 'Supports JPG, PNG, WEBP up to 5MB.'}</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Bio</label>
                    <textarea
                      name="description"
                      rows="4"
                      className="form-control"
                      value={formData.description}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="col-12 d-flex justify-content-end">
                    <button type="submit" className="btn btn-success px-4" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            ) : activeTab === 'wallet' ? (
              <DoctorWalletTab profile={profile} />
            ) : (
              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="border rounded-4 p-4 h-100">
                    <h2 className="h5 mb-3">Change Email</h2>
                    {emailStep === 'request' ? (
                      <form onSubmit={requestEmailOtp}>
                        <div className="mb-3">
                          <label className="form-label">New Email</label>
                          <input
                            type="email"
                            className="form-control"
                            value={emailData.newEmail}
                            onChange={(event) => setEmailData((prev) => ({ ...prev, newEmail: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Current Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={emailData.password}
                            onChange={(event) => setEmailData((prev) => ({ ...prev, password: event.target.value }))}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-success">Send OTP</button>
                      </form>
                    ) : (
                      <form onSubmit={verifyEmailOtp}>
                        <div className="mb-3">
                          <label className="form-label">OTP</label>
                          <input
                            className="form-control"
                            value={otp}
                            onChange={(event) => setOtp(event.target.value)}
                            maxLength={6}
                            required
                          />
                        </div>
                        <div className="d-flex gap-2">
                          <button type="submit" className="btn btn-success">Verify</button>
                          <button type="button" className="btn btn-outline-secondary" onClick={() => setEmailStep('request')}>
                            Back
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="border rounded-4 p-4 h-100 bg-light-subtle">
                    <h2 className="h5 mb-3">Password</h2>
                    <p className="text-muted mb-0">
                      Doctor password change is not exposed by the current backend API yet.
                      Once the backend adds a dedicated doctor password endpoint, this section can be wired in directly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
