import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getPharmacyProfile,
    updatePharmacyProfile,
    changePassword,
    requestPharmacyEmailChange,
    verifyPharmacyEmailChange,
} from '../api/account';
import { toast } from 'sonner';
import Loading from '../components/Loading';

/**
 * Trang hồ sơ dành cho Pharmacy.
 * Route: /profile-pharmacy
 *
 * Tabs:
 *  - Pharmacy Info: thông tin cửa hàng, giao hàng, giờ làm việc
 *  - Security: đổi mật khẩu + đổi email (có OTP)
 */
export default function ProfilePharmacy() {
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
            const data = await getPharmacyProfile(token);
            setProfile(data);
        } catch (err) {
            console.error('Error loading pharmacy profile:', err);
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
                    <div className="card shadow-sm mb-4 border-0" style={{ background: 'linear-gradient(135deg, #6a1b9a, #ab47bc)' }}>
                        <div className="card-body p-4 d-flex align-items-center">
                            <img
                                src={profile?.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.pharmacyName}`}
                                className="rounded-circle border border-3 border-white me-3"
                                width="80" height="80" alt="Avatar"
                            />
                            <div>
                                <h2 className="h4 mb-0 text-white">{profile?.pharmacyName || 'Pharmacy Name'}</h2>
                                <p className="mb-0 text-white opacity-75">
                                    {profile?.deliveryAvailable ? '🚚 Delivery Available' : '🏪 In-store Only'} · {profile?.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <ul className="nav nav-tabs nav-fill mb-4 bg-white rounded shadow-sm">
                        <li className="nav-item">
                            <button
                                className={`nav-link py-3 fw-bold ${activeTab === 'info' ? 'active' : 'text-muted'}`}
                                style={activeTab === 'info' ? { color: '#6a1b9a' } : {}}
                                onClick={() => setActiveTab('info')}
                            >
                                <i className="bi bi-shop me-2"></i>Pharmacy Info
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
                                <PharmacyInfoForm profile={profile} token={token} onUpdate={loadProfile} />
                            ) : (
                                <PharmacySecurityForm token={token} logout={logout} profile={profile} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Form cập nhật thông tin nhà thuốc ────────────────────────────────────────
function PharmacyInfoForm({ profile, token, onUpdate }) {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const [formData, setFormData] = useState({
        phoneNumber: profile?.phoneNumber || '',
        description: profile?.description || '',
        avatarUrl: profile?.avatarUrl || '',
        openTime: profile?.openTime || '08:00',
        closeTime: profile?.closeTime || '20:00',
        workingDays: profile?.workingDays || [],
        deliveryFee: profile?.deliveryFee ?? 0,
        deliveryRadius: profile?.deliveryRadius ?? 0,
        deliveryAvailable: profile?.deliveryAvailable ?? false,
    });
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                phoneNumber: profile.phoneNumber || '',
                description: profile.description || '',
                avatarUrl: profile.avatarUrl || '',
                openTime: profile.openTime || '08:00',
                closeTime: profile.closeTime || '20:00',
                workingDays: profile.workingDays || [],
                deliveryFee: profile.deliveryFee ?? 0,
                deliveryRadius: profile.deliveryRadius ?? 0,
                deliveryAvailable: profile.deliveryAvailable ?? false,
            });
        }
    }, [profile]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const toggleDay = (day) => {
        if (!isEditing) return;
        setFormData(prev => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter(d => d !== day)
                : [...prev.workingDays, day]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updatePharmacyProfile(token, formData);
            setIsEditing(false);
            if (onUpdate) onUpdate();
            toast.success('Pharmacy profile updated!');
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
                <div className="col-md-4">
                    <div className="card h-100" style={{ borderColor: '#6a1b9a' }}>
                        <div className="card-header text-white" style={{ background: '#6a1b9a' }}>
                            <h5 className="mb-0"><i className="bi bi-shop me-2"></i>Pharmacy Details</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label">Pharmacy Name</label>
                                <input type="text" className="form-control bg-light" value={profile?.pharmacyName || ''} disabled />
                                <small className="text-muted">Contact admin to change name</small>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control bg-light" value={profile?.email || ''} disabled />
                                <small className="text-muted">Go to Security tab</small>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Phone Number</label>
                                <input type="text" className="form-control" name="phoneNumber"
                                    value={formData.phoneNumber} onChange={handleChange} disabled={!isEditing} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Avatar URL</label>
                                <input type="url" className="form-control" name="avatarUrl"
                                    value={formData.avatarUrl} onChange={handleChange} disabled={!isEditing}
                                    placeholder="https://..." />
                            </div>
                            <div className="mb-0">
                                <label className="form-label">Description</label>
                                <textarea className="form-control" name="description"
                                    value={formData.description} onChange={handleChange}
                                    disabled={!isEditing} rows={3} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Working Hours */}
                <div className="col-md-4">
                    <div className="card h-100 border-warning">
                        <div className="card-header bg-warning text-dark">
                            <h5 className="mb-0"><i className="bi bi-clock me-2"></i>Working Hours</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3 mb-3">
                                <div className="col-6">
                                    <label className="form-label">Open Time</label>
                                    <input type="time" className="form-control" name="openTime"
                                        value={formData.openTime} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Close Time</label>
                                    <input type="time" className="form-control" name="closeTime"
                                        value={formData.closeTime} onChange={handleChange} disabled={!isEditing} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Working Days</label>
                                <div className="d-flex flex-wrap gap-2">
                                    {DAYS.map(day => (
                                        <span
                                            key={day}
                                            onClick={() => toggleDay(day)}
                                            className={`badge px-3 py-2 ${formData.workingDays.includes(day) ? 'bg-warning text-dark' : 'bg-light text-muted border'}`}
                                            style={{ cursor: isEditing ? 'pointer' : 'default', fontSize: '0.8rem' }}
                                        >
                                            {day.slice(0, 3)}
                                        </span>
                                    ))}
                                </div>
                                <small className="text-muted">{isEditing ? 'Click to toggle days' : ''}</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3: Delivery */}
                <div className="col-md-4">
                    <div className="card h-100 border-info">
                        <div className="card-header bg-info text-white">
                            <h5 className="mb-0"><i className="bi bi-truck me-2"></i>Delivery Settings</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <div className="form-check form-switch">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        name="deliveryAvailable"
                                        checked={formData.deliveryAvailable}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        id="deliverySwitch"
                                    />
                                    <label className="form-check-label fw-bold" htmlFor="deliverySwitch">
                                        Delivery Available
                                    </label>
                                </div>
                            </div>
                            {formData.deliveryAvailable && (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label">Delivery Fee (VND)</label>
                                        <input type="number" min="0" className="form-control" name="deliveryFee"
                                            value={formData.deliveryFee} onChange={handleChange} disabled={!isEditing} />
                                    </div>
                                    <div className="mb-0">
                                        <label className="form-label">Delivery Radius (km)</label>
                                        <input type="number" min="0" step="0.1" className="form-control" name="deliveryRadius"
                                            value={formData.deliveryRadius} onChange={handleChange} disabled={!isEditing} />
                                    </div>
                                </>
                            )}
                            {!formData.deliveryAvailable && (
                                <p className="text-muted mt-2">Enable delivery to configure fee and radius.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end">
                {!isEditing ? (
                    <button type="button" className="btn px-4 text-white" style={{ background: '#6a1b9a' }} onClick={() => setIsEditing(true)}>
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

// ─── Form Security ─────────────────────────────────────────────────────────────
function PharmacySecurityForm({ token, logout, profile }) {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [passwordErrors, setPasswordErrors] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [changing, setChanging] = useState(false);

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
            await requestPharmacyEmailChange(token, emailData);
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
            await verifyPharmacyEmailChange(token, { newEmail: emailData.newEmail, otp });
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
                                    <i className="bi bi-info-circle me-2"></i>An OTP will be sent to your new email.
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">New Email</label>
                                    <input type="email" className="form-control"
                                        value={emailData.newEmail}
                                        onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                                        placeholder="new@example.com" required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Current Password</label>
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
                                <button type="button" className="btn btn-link w-100" onClick={() => setStep('form')}>← Back</button>
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
                            {/* Current Password */}
                            <div className="mb-3">
                                <label className="form-label">Current Password</label>
                                <input
                                    type="password"
                                    className={`form-control ${passwordErrors.currentPassword ? 'is-invalid' : ''}`}
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                    required
                                />
                                {passwordErrors.currentPassword && (
                                    <div className="invalid-feedback">{passwordErrors.currentPassword}</div>
                                )}
                            </div>

                            {/* New Password */}
                            <div className="mb-3">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className={`form-control ${passwordErrors.newPassword ? 'is-invalid' : ''}`}
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    required
                                />
                                {passwordErrors.newPassword && (
                                    <div className="invalid-feedback">{passwordErrors.newPassword}</div>
                                )}
                            </div>

                            {/* Confirm New Password */}
                            <div className="mb-3">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className={`form-control ${passwordErrors.confirmNewPassword ? 'is-invalid' : ''}`}
                                    value={passwords.confirmNewPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
                                    required
                                />
                                {passwordErrors.confirmNewPassword && (
                                    <div className="invalid-feedback">{passwordErrors.confirmNewPassword}</div>
                                )}
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
