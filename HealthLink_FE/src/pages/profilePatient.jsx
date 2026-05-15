import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword, requestEmailChange, verifyEmailChange } from '../api/account';
import { toast } from 'sonner';
import Loading from '../components/Loading';

export default function PatientProfile() {
    const { token, logout } = useAuth();
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        city: '',
        country: '',
        bloodType: '',
        heightCm: '',
        weightKg: '',
        allergies: '',
        chronicConditions: '',
        currentMedications: '',
        medicalHistorySummary: '',
        insuranceProvider: '',
        insurancePolicyNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        preferredLanguage: '',
        preferredContactMethod: '',
        occupation: '',
        latitude: '',
        longitude: '',
        avatarUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');

    useEffect(() => {
        if (token) {
            loadProfile();
        }
    }, [token]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile(token);
            if (data.dateOfBirth) {
                data.dateOfBirth = new Date(data.dateOfBirth).toISOString().split('T')[0];
            }
            setProfile(data);
        } catch (error) {
            console.error("Error loading profile:", error);
            toast.error("Unable to load profile information.");
        } finally {
            // Delay để hiển thị loading animation
            setTimeout(() => {
                setLoading(false);
            }, 800);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="section py-5 Background_Schedule">
            <div className="row justify-content-center" style={{ paddingTop: '200px' }}>
                <div className="col-lg-10">
                    {/* Header */}
                    <div className="card shadow-sm mb-4 border-0 bg-primary text-white">
                        <div className="card-body p-4 d-flex align-items-center">
                            <img
                                src={profile.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${profile.fullName}`}
                                className="rounded-circle border border-3 border-white me-3"
                                width="80" height="80" alt="Avatar"
                            />
                            <div>
                                <h2 className="h4 mb-0">{profile.fullName || "Name not updated"}</h2>
                                <p className="mb-0 opacity-75">{profile.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <ul className="nav nav-tabs nav-fill mb-4 bg-white rounded shadow-sm">
                        <li className="nav-item">
                            <button
                                className={`nav-link py-3 fw-bold ${activeTab === 'info' ? 'active text-primary' : 'text-muted'}`}
                                onClick={() => setActiveTab('info')}
                            >
                                <i className="bi bi-person-vcard me-2"></i>Personal Information
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
                                <GeneralInfoForm profile={profile} token={token} onUpdate={loadProfile} />
                            ) : (
                                <SecurityForm token={token} logout={logout} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENT CON: FORM CẬP NHẬT THÔNG TIN ---
function GeneralInfoForm({ profile, token, onUpdate }) {
    const [formData, setFormData] = useState(profile);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfile(token, formData);
            setIsEditing(false);
            if (onUpdate) onUpdate();
            toast.success("Updated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Update error: " + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = () => {
        return (
            formData.fullName !== profile.fullName ||
            formData.phoneNumber !== profile.phoneNumber ||
            formData.dateOfBirth !== profile.dateOfBirth ||
            formData.gender !== profile.gender ||
            formData.address !== profile.address ||
            formData.city !== profile.city ||
            formData.country !== profile.country ||
            formData.bloodType !== profile.bloodType ||
            formData.heightCm !== profile.heightCm ||
            formData.weightKg !== profile.weightKg ||
            formData.allergies !== profile.allergies ||
            formData.chronicConditions !== profile.chronicConditions ||
            formData.currentMedications !== profile.currentMedications ||
            formData.medicalHistorySummary !== profile.medicalHistorySummary ||
            formData.insuranceProvider !== profile.insuranceProvider ||
            formData.insurancePolicyNumber !== profile.insurancePolicyNumber ||
            formData.emergencyContactName !== profile.emergencyContactName ||
            formData.emergencyContactPhone !== profile.emergencyContactPhone ||
            formData.emergencyContactRelationship !== profile.emergencyContactRelationship ||
            formData.preferredLanguage !== profile.preferredLanguage ||
            formData.preferredContactMethod !== profile.preferredContactMethod ||
            formData.occupation !== profile.occupation ||
            formData.latitude !== profile.latitude ||
            formData.longitude !== profile.longitude ||
            formData.avatarUrl !== profile.avatarUrl
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="row g-4 mb-4">
                {/* === Card 1: Personal & Contact Information === */}
                <div className="col-md-6">
                    <div className="card h-100 border-primary">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0"><i className="bi bi-person-vcard me-2"></i>Personal & Contact</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} disabled={!isEditing} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Phone Number</label>
                                    <input type="text" className="form-control" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Date of Birth</label>
                                    <input type="date" className="form-control" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Gender</label>
                                    <select className="form-select" name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}>
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Avatar URL</label>
                                    <input type="text" className="form-control" name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} disabled={!isEditing} placeholder="https://example.com/photo.jpg" />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Address</label>
                                    <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">City</label>
                                    <input type="text" className="form-control" name="city" value={formData.city} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Country</label>
                                    <input type="text" className="form-control" name="country" value={formData.country} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Latitude</label>
                                    <input type="number" step="any" className="form-control" name="latitude" value={formData.latitude} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Longitude</label>
                                    <input type="number" step="any" className="form-control" name="longitude" value={formData.longitude} onChange={handleChange} disabled={!isEditing} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === Card 2: Health Information === */}
                <div className="col-md-6">
                    <div className="card h-100 border-success">
                        <div className="card-header bg-success text-white">
                            <h5 className="mb-0"><i className="bi bi-heart-pulse me-2"></i>Health Information</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label">Blood Type</label>
                                    <select className="form-select" name="bloodType" value={formData.bloodType} onChange={handleChange} disabled={!isEditing}>
                                        <option value="">Select</option>
                                        <option value="A+">A+</option><option value="A-">A-</option>
                                        <option value="B+">B+</option><option value="B-">B-</option>
                                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                        <option value="O+">O+</option><option value="O-">O-</option>
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Height (cm)</label>
                                    <input type="number" className="form-control" name="heightCm" value={formData.heightCm} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Weight (kg)</label>
                                    <input type="number" className="form-control" name="weightKg" value={formData.weightKg} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Allergies</label>
                                    <textarea className="form-control" name="allergies" value={formData.allergies} onChange={handleChange} disabled={!isEditing} rows="2" placeholder="List any allergies..."></textarea>
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Chronic Conditions</label>
                                    <textarea className="form-control" name="chronicConditions" value={formData.chronicConditions} onChange={handleChange} disabled={!isEditing} rows="2" placeholder="Diabetes, Hypertension, etc."></textarea>
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Current Medications</label>
                                    <textarea className="form-control" name="currentMedications" value={formData.currentMedications} onChange={handleChange} disabled={!isEditing} rows="2"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === Card 3: Medical History & Preferences === */}
                <div className="col-md-6">
                    <div className="card h-100 border-info">
                        <div className="card-header bg-info text-white">
                            <h5 className="mb-0"><i className="bi bi-file-earmark-medical me-2"></i>History & Preferences</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">Medical History Summary</label>
                                    <textarea className="form-control" name="medicalHistorySummary" value={formData.medicalHistorySummary} onChange={handleChange} disabled={!isEditing} rows="3"></textarea>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Occupation</label>
                                    <input type="text" className="form-control" name="occupation" value={formData.occupation} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Preferred Language</label>
                                    <select className="form-select" name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange} disabled={!isEditing}>
                                        <option value="">Select Language</option>
                                        <option value="Vietnamese">Vietnamese</option>
                                        <option value="English">English</option>
                                    </select>
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Preferred Contact Method</label>
                                    <select className="form-select" name="preferredContactMethod" value={formData.preferredContactMethod} onChange={handleChange} disabled={!isEditing}>
                                        <option value="">Select Method</option>
                                        <option value="Email">Email</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Phone">Phone Call</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === Card 4: Insurance & Emergency Contact === */}
                <div className="col-md-6">
                    <div className="card h-100 border-danger">
                        <div className="card-header bg-danger text-white">
                            <h5 className="mb-0"><i className="bi bi-shield-plus me-2"></i>Insurance & Emergency</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Insurance Provider</label>
                                    <input type="text" className="form-control" name="insuranceProvider" value={formData.insuranceProvider} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Policy Number</label>
                                    <input type="text" className="form-control" name="insurancePolicyNumber" value={formData.insurancePolicyNumber} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <hr className="my-2" />
                                <div className="col-md-12">
                                    <label className="form-label fw-bold">Emergency Contact</label>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Contact Name</label>
                                    <input type="text" className="form-control" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Contact Phone</label>
                                    <input type="text" className="form-control" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} disabled={!isEditing} />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Relationship</label>
                                    <select className="form-select" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleChange} disabled={!isEditing}>
                                        <option value="">Select Relationship</option>
                                        <option value="Parent">Parent</option>
                                        <option value="Spouse">Spouse</option>
                                        <option value="Sibling">Sibling</option>
                                        <option value="Child">Child</option>
                                        <option value="Friend">Friend</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === Action Buttons === */}
            <div className="d-flex justify-content-end align-items-center">
                {!isEditing ? (
                    <button type="button" className="btn btn-primary px-4" onClick={() => setIsEditing(true)}>
                        <i className="bi bi-pencil me-2"></i>Edit Profile
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary px-4 me-2"
                            onClick={() => {
                                setIsEditing(false);
                                setFormData(profile);
                            }}
                        >
                            <i className="bi bi-x-circle me-2"></i>Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-success px-4"
                            disabled={saving || !hasChanges()}
                            style={{ opacity: (saving || !hasChanges()) ? 0.5 : 1 }}
                        >
                            {saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-circle me-2"></i>
                                    Save Changes
                                </>
                            )}
                        </button>
                        {!hasChanges() && !saving && (
                            <small className="text-muted ms-2">No changes detected</small>
                        )}
                    </>
                )}
            </div>
        </form>
    );
}

// --- COMPONENT CON: FORM ĐỔI MẬT KHẨU VÀ EMAIL---
function SecurityForm({ token, logout }) {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [changing, setChanging] = useState(false);
    const [emailChange, setEmailChange] = useState({ newEmail: '', password: '' });
    const [changingEmail, setChangingEmail] = useState(false);
    // Trạng thái bước 2: nhập OTP xác nhận đổi email
    const [emailOtpStep, setEmailOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    // đổi password
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmNewPassword) {
            toast.error("New password confirmation does not match!");
            return;
        }

        setChanging(true);
        try {
            await changePassword(token, passwords);
            toast.success("Password changed successfully! Please log in again.");
            logout();
        } catch (error) {
            toast.error("Error: " + (error.response?.data?.message || "Current password is incorrect."));
        } finally {
            setChanging(false);
        }
    };

    // đổi email — 2 bước: (1) request OTP, (2) verify OTP
    const handleEmailChange = async (e) => {
        e.preventDefault();

        if (!emailChange.newEmail || !emailChange.password) {
            toast.error('Please fill in all fields!');
            return;
        }

        setChangingEmail(true);
        try {
            // Bước 1: gửi yêu cầu và nhận OTP qua email
            await requestEmailChange(token, { newEmail: emailChange.newEmail, password: emailChange.password });
            toast.success('Verification code sent to your new email. Please check your inbox.');
            setEmailOtpStep(true); // chuyển sang bước nhập OTP
        } catch (error) {
            toast.error('Error: ' + (error.response?.data?.message || 'Failed to send verification code.'));
        } finally {
            setChangingEmail(false);
        }
    };

    // Bước 2: xác nhận OTP để hoàn tất đổi email
    const handleVerifyEmailOtp = async (e) => {
        e.preventDefault();
        if (!otpCode.trim()) {
            toast.error('Please enter the verification code.');
            return;
        }

        setChangingEmail(true);
        try {
            await verifyEmailChange(token, { newEmail: emailChange.newEmail, verificationCode: otpCode });
            toast.success('Email changed successfully! Please log in again.');
            logout();
        } catch (error) {
            toast.error('Error: ' + (error.response?.data?.message || 'Invalid or expired verification code.'));
        } finally {
            setChangingEmail(false);
        }
    };

    return (
        <div className="row g-4">
            {/* === Cột trái: Form Change Email === */}
            <div className="col-md-6">
                <div className="card h-100 border-info">
                    <div className="card-header bg-info text-white">
                        <h5 className="mb-0">
                            <i className="bi bi-envelope-at me-2"></i>
                            Change Email
                        </h5>
                    </div>
                    <div className="card-body">
                        {!emailOtpStep ? (
                            <form onSubmit={handleEmailChange}>
                                <div className="alert alert-info mb-3">
                                    <i className="bi bi-info-circle me-2"></i>
                                    A verification code will be sent to your new email address.
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">New Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={emailChange.newEmail}
                                        onChange={(e) => setEmailChange({ ...emailChange, newEmail: e.target.value })}
                                        placeholder="Enter new email"
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Current Password</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={emailChange.password}
                                        onChange={(e) => setEmailChange({ ...emailChange, password: e.target.value })}
                                        placeholder="For verification"
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-info w-100" disabled={changingEmail}>
                                    {changingEmail
                                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</>
                                        : <><i className="bi bi-send me-2"></i>Send Verification Code</>}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyEmailOtp}>
                                <div className="alert alert-success mb-3">
                                    <i className="bi bi-envelope-check me-2"></i>
                                    A 6-digit code has been sent to <strong>{emailChange.newEmail}</strong>. Please check your inbox.
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Verification Code</label>
                                    <input
                                        type="text"
                                        className="form-control text-center"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary flex-grow-1"
                                        onClick={() => { setEmailOtpStep(false); setOtpCode(''); }}
                                    >
                                        <i className="bi bi-arrow-left me-1"></i>Back
                                    </button>
                                    <button type="submit" className="btn btn-info flex-grow-1" disabled={changingEmail}>
                                        {changingEmail
                                            ? <><span className="spinner-border spinner-border-sm me-2"></span>Verifying...</>
                                            : <><i className="bi bi-check-circle me-2"></i>Confirm Change</>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* === Cột phải: Form Change Password === */}
            <div className="col-md-6">
                <form onSubmit={handleSubmit} className="h-100">
                    <div className="card h-100 border-danger">
                        <div className="card-header bg-danger text-white">
                            <h5 className="mb-0">
                                <i className="bi bi-shield-lock me-2"></i>
                                Change Password
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="alert alert-warning mb-3">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                After changing your password, you will need to log in again.
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Current Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwords.confirmNewPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-danger w-100" disabled={changing}>
                                {changing ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-shield-check me-2"></i>
                                        Change Password
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}