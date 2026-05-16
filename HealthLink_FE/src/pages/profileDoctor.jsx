import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getDoctorProfile,
    updateDoctorProfile,
    uploadDoctorAvatar,
    changePassword,
    requestDoctorEmailChange,
    verifyDoctorEmailChange,
} from '../api/account';
import { toast } from 'sonner';
import Loading from '../components/Loading';

/**
 * Trang hồ sơ dành cho Doctor.
 * Route: /profile-doctor
 *
 * Tabs:
 *  - Professional Info: thông tin nghề nghiệp có thể chỉnh sửa
 *  - Security: đổi mật khẩu + đổi email (có OTP)
 */
export default function ProfileDoctor() {
    const { token, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');

    useEffect(() => {
        if (token) loadProfile();
    }, [token]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await getDoctorProfile(token);
            setProfile(data);
        } catch (err) {
            console.error('Error loading doctor profile:', err);
            toast.error('Unable to load profile information.');
        } finally {
            setTimeout(() => setLoading(false), 600);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="section py-5 Background_Schedule">
            <div className="row justify-content-center" style={{ paddingTop: '200px' }}>
                <div className="col-lg-10">
                    {/* Header */}
                    <div className="card shadow-sm mb-4 border-0" style={{ background: 'linear-gradient(135deg, #1a6e5c, #27ae8c)' }}>
                        <div className="card-body p-4 d-flex align-items-center">
                            <img
                                src={profile?.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.fullName}`}
                                className="rounded-circle border border-3 border-white me-3"
                                width="80" height="80" alt="Avatar"
                            />
                            <div>
                                <h2 className="h4 mb-0 text-white">Dr. {profile?.fullName || 'Name not updated'}</h2>
                                <p className="mb-0 text-white opacity-75">{profile?.specialty || 'Specialty not set'} · {profile?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <ul className="nav nav-tabs nav-fill mb-4 bg-white rounded shadow-sm">
                        <li className="nav-item">
                            <button
                                className={`nav-link py-3 fw-bold ${activeTab === 'info' ? 'active text-success' : 'text-muted'}`}
                                onClick={() => setActiveTab('info')}
                            >
                                <i className="bi bi-person-badge me-2"></i>Professional Info
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link py-3 fw-bold ${activeTab === 'security' ? 'active text-danger' : 'text-muted'}`}
                                onClick={() => setActiveTab('security')}
                            >
                                <i className="bi bi-shield-lock me-2"></i>Security & Password
                            </button>
                        </li>
                    </ul>

                    {/* Content */}
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4">
                            {activeTab === 'info' ? (
                                <DoctorInfoForm profile={profile} token={token} onUpdate={loadProfile} />
                            ) : (
                                <DoctorSecurityForm token={token} logout={logout} profile={profile} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Form cập nhật thông tin chuyên môn ───────────────────────────────────────
function DoctorInfoForm({ profile, token, onUpdate }) {
    const [formData, setFormData] = useState({
        phoneNumber: profile?.phoneNumber || '',
        description: profile?.description || '',
        avatarUrl: profile?.avatarUrl || '',
        licenseNumber: profile?.licenseNumber || '',
        specialty: profile?.specialty || '',
        yearsOfExperience: profile?.yearsOfExperience || '',
        consultationFee: profile?.consultationFee || '',
        hospital: profile?.hospital || '',
        workingAddress: profile?.workingAddress || '',
    });
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                phoneNumber: profile.phoneNumber || '',
                description: profile.description || '',
                avatarUrl: profile.avatarUrl || '',
                licenseNumber: profile.licenseNumber || '',
                specialty: profile.specialty || '',
                yearsOfExperience: profile.yearsOfExperience || '',
                consultationFee: profile.consultationFee || '',
                hospital: profile.hospital || '',
                workingAddress: profile.workingAddress || '',
            });
        }
    }, [profile]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    /** Upload avatar: gọi API riêng, cập nhật preview ngay */
    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, avatarUrl: previewUrl }));
        setUploading(true);
        try {
            const result = await uploadDoctorAvatar(token, file);
            setFormData(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
            toast.success('Avatar uploaded successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
            setFormData(prev => ({ ...prev, avatarUrl: formData.avatarUrl }));
        } finally {
            setUploading(false);
            URL.revokeObjectURL(previewUrl);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDoctorProfile(token, formData);
            setIsEditing(false);
            if (onUpdate) onUpdate();
            toast.success('Profile updated successfully!');
        } catch (err) {
            toast.error('Update failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="row g-4 mb-4">
                {/* Card 1: Basic */}
                <div className="col-md-6">
                    <div className="card h-100 border-success">
                        <div className="card-header bg-success text-white">
                            <h5 className="mb-0"><i className="bi bi-person-badge me-2"></i>Basic Information</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-control bg-light" value={profile?.fullName || ''} disabled />
                                    <small className="text-muted">Contact admin to change name</small>
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-control bg-light" value={profile?.email || ''} disabled />
                                    <small className="text-muted">Go to Security tab to change email</small>
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Phone Number</label>
                                    <input type="text" className="form-control" name="phoneNumber"
                                        value={formData.phoneNumber} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Avatar</label>
                                    <div className="d-flex align-items-center gap-3">
                                        <img
                                            src={formData.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.fullName}`}
                                            alt="Avatar"
                                            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #dee2e6' }}
                                            onError={(e) => { e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.fullName}`; }}
                                        />
                                        {isEditing && (
                                            <div>
                                                <label htmlFor="doctor-avatar-upload" className="btn btn-sm btn-outline-success" style={{ cursor: 'pointer' }}>
                                                    {uploading
                                                        ? <><span className="spinner-border spinner-border-sm me-1"></span>Uploading...</>
                                                        : <><i className="bi bi-cloud-upload me-1"></i>Upload Photo</>}
                                                </label>
                                                <input id="doctor-avatar-upload" type="file" accept="image/*"
                                                    style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={uploading} />
                                                <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>JPG, PNG, WEBP — Max 5MB</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Description / Bio</label>
                                    <textarea className="form-control" name="description"
                                        value={formData.description} onChange={handleChange}
                                        disabled={!isEditing} rows={3} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Professional */}
                <div className="col-md-6">
                    <div className="card h-100 border-primary">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0"><i className="bi bi-hospital me-2"></i>Professional Details</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-6">
                                    <label className="form-label">License Number</label>
                                    <input type="text" className="form-control" name="licenseNumber"
                                        value={formData.licenseNumber} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Specialty</label>
                                    <input type="text" className="form-control" name="specialty"
                                        value={formData.specialty} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Years of Experience</label>
                                    <input type="number" min="0" className="form-control" name="yearsOfExperience"
                                        value={formData.yearsOfExperience} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Consultation Fee (VND)</label>
                                    <input type="number" min="0" className="form-control" name="consultationFee"
                                        value={formData.consultationFee} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Hospital / Clinic</label>
                                    <input type="text" className="form-control" name="hospital"
                                        value={formData.hospital} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Working Address</label>
                                    <input type="text" className="form-control" name="workingAddress"
                                        value={formData.workingAddress} onChange={handleChange} disabled={!isEditing} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end align-items-center">
                {!isEditing ? (
                    <button type="button" className="btn btn-success px-4" onClick={() => setIsEditing(true)}>
                        <i className="bi bi-pencil me-2"></i>Edit Profile
                    </button>
                ) : (
                    <>
                        <button type="button" className="btn btn-secondary px-4 me-2"
                            onClick={() => { setIsEditing(false); }}>
                            <i className="bi bi-x-circle me-2"></i>Cancel
                        </button>
                        <button type="submit" className="btn btn-success px-4" disabled={saving}>
                            {saving
                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                : <><i className="bi bi-check-circle me-2"></i>Save Changes</>
                            }
                        </button>
                    </>
                )}
            </div>
        </form>
    );
}

// ─── Form Security (Change Password + Change Email với OTP) ───────────────────
function DoctorSecurityForm({ token, logout, profile }) {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [passwordErrors, setPasswordErrors] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [changing, setChanging] = useState(false);

    // Email change states
    const [step, setStep] = useState('form'); // 'form' | 'otp'
    const [emailData, setEmailData] = useState({ newEmail: '', password: '' });
    const [otp, setOtp] = useState('');
    const [changingEmail, setChangingEmail] = useState(false);

    // Hàm kiểm tra độ mạnh mật khẩu
    const validatePasswordStrength = (pwd) => {
        if (pwd.length < 6) return "Password must be at least 6 characters long.";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
        if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
        if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
        if (!/[^a-zA-Z0-9\s]/.test(pwd)) return "Password must contain at least one special character.";
        
        const emailPart = profile?.email?.split('@')[0].toLowerCase();
        const fullNameLower = profile?.fullName?.toLowerCase();
        const pwdLower = pwd.toLowerCase();
        
        if (pwdLower.includes(emailPart)) return "Password should not contain your email prefix.";
        if (fullNameLower && pwdLower.includes(fullNameLower.split(' ')[0])) return "Password should not contain your name.";
        
        return null;
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        // Reset errors
        const newErrors = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
        let hasError = false;

        if (passwords.newPassword === passwords.currentPassword) {
            newErrors.newPassword = "New password must be different from current password!";
            hasError = true;
        } else {
            const strengthError = validatePasswordStrength(passwords.newPassword);
            if (strengthError) {
                newErrors.newPassword = strengthError;
                hasError = true;
            }
        }

        if (passwords.newPassword !== passwords.confirmNewPassword) {
            newErrors.confirmNewPassword = "New passwords do not match!";
            hasError = true;
        }

        if (hasError) {
            setPasswordErrors(newErrors);
            return;
        }

        setPasswordErrors({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        setChanging(true);
        try {
            await changePassword(token, passwords);
            toast.success('Password changed! Please log in again.');
            logout();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Current password is incorrect.';
            setPasswordErrors({ ...newErrors, currentPassword: errorMsg });
            toast.error('Change password failed!');
        } finally {
            setChanging(false);
        }
    };

    const handleRequestEmailChange = async (e) => {
        e.preventDefault();
        if (!emailData.newEmail || !emailData.password) { toast.error('Please fill all fields!'); return; }
        setChangingEmail(true);
        try {
            await requestDoctorEmailChange(token, emailData);
            toast.success('OTP sent to your new email!');
            setStep('otp');
        } catch (err) {
            toast.error('Error: ' + (err.response?.data?.message || 'Failed to send OTP.'));
        } finally {
            setChangingEmail(false);
        }
    };

    const handleVerifyEmailChange = async (e) => {
        e.preventDefault();
        if (!otp) { toast.error('Please enter the OTP!'); return; }
        setChangingEmail(true);
        try {
            await verifyDoctorEmailChange(token, { newEmail: emailData.newEmail, otp });
            toast.success('Email changed! Please log in again.');
            logout();
        } catch (err) {
            toast.error('Error: ' + (err.response?.data?.message || 'Invalid OTP.'));
        } finally {
            setChangingEmail(false);
        }
    };

    return (
        <div className="row g-4">
            {/* Change Email */}
            <div className="col-md-6">
                <div className="card h-100 border-info">
                    <div className="card-header bg-info text-white">
                        <h5 className="mb-0"><i className="bi bi-envelope-at me-2"></i>Change Email</h5>
                    </div>
                    <div className="card-body">
                        {step === 'form' ? (
                            <form onSubmit={handleRequestEmailChange}>
                                <div className="alert alert-info mb-3">
                                    <i className="bi bi-info-circle me-2"></i>An OTP will be sent to your new email for verification.
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">New Email</label>
                                    <input type="email" className="form-control"
                                        value={emailData.newEmail}
                                        onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                                        placeholder="new@example.com" required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Current Password (verification)</label>
                                    <input type="password" className="form-control"
                                        value={emailData.password}
                                        onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                                        required />
                                </div>
                                <button type="submit" className="btn btn-info w-100" disabled={changingEmail}>
                                    {changingEmail ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</> : 'Send OTP'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyEmailChange}>
                                <div className="alert alert-success mb-3">
                                    <i className="bi bi-check-circle me-2"></i>OTP sent to <strong>{emailData.newEmail}</strong>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Enter OTP</label>
                                    <input type="text" className="form-control form-control-lg text-center fw-bold"
                                        value={otp} onChange={(e) => setOtp(e.target.value)}
                                        placeholder="6-digit OTP" maxLength={6} required />
                                </div>
                                <button type="submit" className="btn btn-success w-100 mb-2" disabled={changingEmail}>
                                    {changingEmail ? <><span className="spinner-border spinner-border-sm me-2"></span>Verifying...</> : 'Verify & Change Email'}
                                </button>
                                <button type="button" className="btn btn-link w-100" onClick={() => setStep('form')}>
                                    ← Back
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="col-md-6">
                <form onSubmit={handlePasswordSubmit} className="h-100">
                    <div className="card h-100 border-danger">
                        <div className="card-header bg-danger text-white">
                            <h5 className="mb-0"><i className="bi bi-shield-lock me-2"></i>Change Password</h5>
                        </div>
                        <div className="card-body">
                            <div className="alert alert-warning mb-3">
                                <i className="bi bi-exclamation-triangle me-2"></i>You will need to log in again after changing.
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Current Password</label>
                                <input type="password" className={`form-control ${passwordErrors.currentPassword ? 'is-invalid' : ''}`}
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
                                {passwordErrors.currentPassword && <div className="invalid-feedback">{passwordErrors.currentPassword}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">New Password</label>
                                <input type="password" className={`form-control ${passwordErrors.newPassword ? 'is-invalid' : ''}`}
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
                                {passwordErrors.newPassword && <div className="invalid-feedback">{passwordErrors.newPassword}</div>}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm New Password</label>
                                <input type="password" className={`form-control ${passwordErrors.confirmNewPassword ? 'is-invalid' : ''}`}
                                    value={passwords.confirmNewPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })} required />
                                {passwordErrors.confirmNewPassword && <div className="invalid-feedback">{passwordErrors.confirmNewPassword}</div>}
                            </div>
                            <button type="submit" className="btn btn-danger w-100" disabled={changing}>
                                {changing ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</> : <><i className="bi bi-shield-check me-2"></i>Change Password</>}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
