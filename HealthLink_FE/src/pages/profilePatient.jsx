import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, uploadPatientAvatar, changePassword, requestEmailChange, verifyEmailChange } from '../api/account';
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
            setLoading(false);
        }
    };

    return (
        <div className="patient-profile-page">
            <div className="row justify-content-center">
                <div className="col-12">
                    {/* Header */}
                    <div className="card shadow-sm mb-4 border-0 bg-primary text-white">
                        <div className="card-body p-4 d-flex align-items-center">
                            <img
                                src={profile.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${profile.fullName}`}
                                className="rounded-circle border border-3 border-white me-3"
                                width="80"
                                height="80"
                                alt="Avatar"
                            />

                            <div>
                                <h2 className="h4 mb-0">
                                    {loading ? 'Loading profile...' : profile.fullName || 'Name not updated'}
                                </h2>

                                <p className="mb-0 opacity-75">
                                    {loading ? 'Please wait a moment' : profile.email}
                                </p>
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
                            {loading ? (
                                <div className="text-center text-muted py-5">
                                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                    Loading profile information...
                                </div>
                            ) : activeTab === 'info' ? (
                                <GeneralInfoForm
                                    profile={profile}
                                    token={token}
                                    onUpdate={loadProfile}
                                />
                            ) : (
                                <SecurityForm token={token} logout={logout} profile={profile} />
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
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /** Upload avatar: gọi API riêng, cập nhật formData và preview ngay */
    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview tạm thời bằng ObjectURL trước khi upload xong
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, avatarUrl: previewUrl }));

        setUploading(true);
        try {
            const result = await uploadPatientAvatar(token, file);
            // Cập nhật với URL thật từ server
            setFormData(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
            toast.success('Avatar uploaded successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
            // Hoàn nguyên nếu lỗi
            setFormData(prev => ({ ...prev, avatarUrl: formData.avatarUrl }));
        } finally {
            setUploading(false);
            URL.revokeObjectURL(previewUrl);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        // Chuẩn hóa dữ liệu: Chuyển các chuỗi rỗng thành null cho các trường số
        const cleanedData = { ...formData };
        ['heightCm', 'weightKg', 'latitude', 'longitude'].forEach(field => {
            if (cleanedData[field] === '') {
                cleanedData[field] = null;
            }
        });

        try {
            await updateProfile(token, cleanedData);
            setIsEditing(false);
            if (onUpdate) onUpdate();
            toast.success("Updated successfully!");
            window.dispatchEvent(new Event('profile-updated'));
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
                                    <label className="form-label">Avatar</label>
                                    <div className="d-flex align-items-center gap-3">
                                        {/* Ảnh preview */}
                                        <img
                                            src={formData.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${formData.fullName}`}
                                            alt="Avatar"
                                            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #dee2e6' }}
                                            onError={(e) => { e.target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${formData.fullName}`; }}
                                        />
                                        {/* Nút upload — chỉ hiện khi đang edit */}
                                        {isEditing && (
                                            <div>
                                                <label
                                                    htmlFor="avatar-upload-input"
                                                    className="btn btn-sm btn-outline-primary"
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {uploading
                                                        ? <><span className="spinner-border spinner-border-sm me-1"></span>Uploading...</>
                                                        : <><i className="bi bi-cloud-upload me-1"></i>Upload Photo</>}
                                                </label>
                                                <input
                                                    id="avatar-upload-input"
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={handleAvatarUpload}
                                                    disabled={uploading}
                                                />
                                                <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                                                    JPG, PNG, WEBP — Max 5MB
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
function SecurityForm({ token, logout, profile }) {
    const navigate = useNavigate();
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [passwordErrors, setPasswordErrors] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [changing, setChanging] = useState(false);
    const [emailChange, setEmailChange] = useState({ newEmail: '', password: '' });
    const [changingEmail, setChangingEmail] = useState(false);
    // Trạng thái bước 2: nhập OTP xác nhận đổi email
    const [emailOtpStep, setEmailOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        let timer;
        if (showSuccessModal && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (showSuccessModal && countdown === 0) {
            logout();
            navigate('/login');
        }
        return () => clearTimeout(timer);
    }, [showSuccessModal, countdown, logout, navigate]);

    // Hàm kiểm tra độ mạnh mật khẩu (giống Sign_up.jsx)
    const validatePasswordStrength = (pwd) => {
        if (pwd.length < 6) return "Password must be at least 6 characters long.";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
        if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
        if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
        if (!/[^a-zA-Z0-9\s]/.test(pwd)) return "Password must contain at least one special character.";

        // Không trùng email hoặc tên
        const emailPart = profile?.email?.split('@')[0].toLowerCase();
        const fullNameLower = profile?.fullName?.toLowerCase();
        const pwdLower = pwd.toLowerCase();

        if (pwdLower.includes(emailPart)) return "Password should not contain your email prefix.";
        if (fullNameLower && pwdLower.includes(fullNameLower.split(' ')[0])) return "Password should not contain your name.";

        return null;
    };

    // đổi password
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Reset errors
        const newErrors = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
        let hasError = false;

        if (passwords.newPassword === passwords.currentPassword) {
            newErrors.newPassword = "New password must be different from current password!";
            hasError = true;
        } else {
            // Kiểm tra độ mạnh mật khẩu mới
            const strengthError = validatePasswordStrength(passwords.newPassword);
            if (strengthError) {
                newErrors.newPassword = strengthError;
                hasError = true;
            }
        }

        if (passwords.newPassword !== passwords.confirmNewPassword) {
            newErrors.confirmNewPassword = "New password confirmation does not match!";
            hasError = true;
        }

        if (hasError) {
            setPasswordErrors(newErrors);
            return;
        }

        // Clear errors before calling API
        setPasswordErrors({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

        setChanging(true);
        try {
            await changePassword(token, passwords);
            setShowSuccessModal(true);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Current password is incorrect.";
            setPasswordErrors({ ...newErrors, currentPassword: errorMsg });
            toast.error("Change password failed!");
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
                                    className={`form-control ${passwordErrors.currentPassword ? 'is-invalid' : ''}`}
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                    required
                                />
                                {passwordErrors.currentPassword && (
                                    <div className="invalid-feedback">{passwordErrors.currentPassword}</div>
                                )}
                            </div>
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

            {/* Premium Fullscreen Success Modal Overlay */}
            {showSuccessModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                }}>
                    <style>{`
                        @keyframes fadeInScale {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        padding: '40px 32px',
                        width: '90%',
                        maxWidth: '420px',
                        textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #f1f5f9',
                        animation: 'fadeInScale 0.3s ease-out'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: '#e6f7f5',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            color: '#00b09a',
                        }}>
                            <i className="bi bi-shield-check-fill" style={{ fontSize: '3rem' }}></i>
                        </div>
                        <h4 style={{
                            color: '#0f172a',
                            fontWeight: '700',
                            fontSize: '1.4rem',
                            marginBottom: '12px'
                        }}>Password Changed Successfully!</h4>
                        <p style={{
                            color: '#64748b',
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            marginBottom: '28px'
                        }}>
                            Your password has been successfully updated. For security reasons, you will be logged out automatically in <strong style={{ color: '#00b09a', fontSize: '1.1rem' }}>{countdown}</strong> seconds.
                        </p>
                        <button
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #00b09a, #007a6a)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 6px -1px rgba(0, 176, 154, 0.2)'
                            }}
                        >
                            <i className="bi bi-box-arrow-right me-2"></i>Back to Login
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}