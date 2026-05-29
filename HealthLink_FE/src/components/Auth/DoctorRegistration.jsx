import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import Loading from '../Loading';
import registrationService from '../../api/registrationApi';
import './Css/DoctorRegistration.css';

export function DoctorRegistration() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [specialties, setSpecialties] = useState([]);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        qualifications: '',
        specialtyId: '',
        specialty: '',
        yearsOfExperience: '',
        languageSpoken: '',
        location: '',
        bio: '',
        consultationFee: '',
        clinicName: '',
        clinicAddress: '',
        availableForVideo: true,
        availableForAudio: true,
        availableForChat: true,
        availableForOffline: true
    });

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const [documents, setDocuments] = useState({
        medicalDegree: null,
        practiceLicense: null,
        idCard: null,
        otherCertificates: []
    });

    // Avatar state
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [uploadingFiles, setUploadingFiles] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const specialtiesData = await registrationService.getSpecialties();
                // Ensure specialties is always an array
                if (Array.isArray(specialtiesData)) {
                    setSpecialties(specialtiesData);
                } else if (specialtiesData && Array.isArray(specialtiesData.data)) {
                    // Handle case where response is wrapped in {data: [...]}
                    setSpecialties(specialtiesData.data);
                } else {
                    console.error('Invalid specialties data format:', specialtiesData);
                    setSpecialties([]);
                }
            } catch (err) {
                console.error('Failed to load specialties:', err);
                setSpecialties([]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'specialtyId') {
            const selectedSpecialty = Array.isArray(specialties)
                ? specialties.find(s => s.specialtyId === parseInt(value))
                : null;
            setFormData(prev => ({
                ...prev,
                specialtyId: value,
                specialty: selectedSpecialty ? selectedSpecialty.name : ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB for avatar)
            if (file.size > 5 * 1024 * 1024) {
                setError('Avatar size must be less than 5MB');
                return;
            }
            // Validate file type (images only)
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setError('Please upload an image file (JPG, PNG, or WebP)');
                return;
            }
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
            setError('');
        }
    };

    const removeAvatar = () => {
        setAvatar(null);
        if (avatarPreview) {
            URL.revokeObjectURL(avatarPreview);
        }
        setAvatarPreview(null);
    };

    const handleFileChange = (e, documentType) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                return;
            }
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
                                  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setError('File type not allowed. Please upload PDF, JPG, PNG, DOC, or DOCX files.');
                return;
            }
            setDocuments(prev => ({
                ...prev,
                [documentType]: file
            }));
            setError('');
        }
    };

    const handleMultipleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                setError('Each file size must be less than 10MB');
                return;
            }
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
                                  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setError('File type not allowed. Please upload PDF, JPG, PNG, DOC, or DOCX files.');
                return;
            }
            validFiles.push(file);
        }

        setDocuments(prev => ({
            ...prev,
            otherCertificates: [...prev.otherCertificates, ...validFiles]
        }));
        setError('');
    };

    const removeFile = (documentType, index = null) => {
        if (index !== null) {
            setDocuments(prev => ({
                ...prev,
                otherCertificates: prev.otherCertificates.filter((_, i) => i !== index)
            }));
        } else {
            setDocuments(prev => ({
                ...prev,
                [documentType]: null
            }));
        }
    };

    const uploadDocuments = async (requestId) => {
        const uploads = [];

        // Upload avatar first (as Profile Photo)
        if (avatar) {
            uploads.push({ file: avatar, type: 'Profile Photo' });
        }

        if (documents.medicalDegree) {
            uploads.push({ file: documents.medicalDegree, type: 'Medical Degree Certificate' });
        }
        if (documents.practiceLicense) {
            uploads.push({ file: documents.practiceLicense, type: 'Practice License' });
        }
        if (documents.idCard) {
            uploads.push({ file: documents.idCard, type: 'ID Card / Passport' });
        }
        documents.otherCertificates.forEach((file, index) => {
            uploads.push({ file, type: `Other Certificate ${index + 1}` });
        });

        for (const upload of uploads) {
            const formData = new FormData();
            formData.append('file', upload.file);
            formData.append('documentType', upload.type);

            await registrationService.uploadDocument(requestId, formData);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation - Personal Information
        if (!formData.fullName?.trim()) {
            setError('Full name is required');
            return;
        }

        if (!formData.email?.trim()) {
            setError('Email is required');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!formData.phoneNumber?.trim()) {
            setError('Phone number is required');
            return;
        }

        // Validate phone number format (10-11 digits)
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
            setError('Phone number must be 10-11 digits');
            return;
        }

        if (!formData.location?.trim()) {
            setError('Location is required');
            return;
        }

        // Validation - Professional Information
        if (!formData.qualifications?.trim()) {
            setError('Qualifications are required');
            return;
        }

        if (!formData.specialtyId) {
            setError('Please select a specialty');
            return;
        }

        if (!formData.yearsOfExperience || parseInt(formData.yearsOfExperience) < 0) {
            setError('Years of experience is required and must be non-negative');
            return;
        }

        if (!formData.languageSpoken?.trim()) {
            setError('Languages spoken is required');
            return;
        }

        if (!formData.consultationFee || parseFloat(formData.consultationFee) < 1) {
            setError('Consultation fee is required and must be at least 1');
            return;
        }

        // Validation - Clinic Information (required for profile display)
        if (!formData.clinicName?.trim()) {
            setError('Clinic/Hospital name is required');
            return;
        }

        if (!formData.clinicAddress?.trim()) {
            setError('Clinic/Hospital address is required');
            return;
        }

        // Validation - Required Documents
        if (!documents.medicalDegree) {
            setError('Medical Degree Certificate is required');
            return;
        }

        if (!documents.practiceLicense) {
            setError('Practice License is required');
            return;
        }

        if (!documents.idCard) {
            setError('ID Card / Passport is required');
            return;
        }

        if (!acceptedTerms) {
            setError('You must accept the Terms and Conditions to proceed');
            return;
        }

        setSubmitting(true);

        try {
            const submitData = {
                ...formData,
                fullName: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                phoneNumber: formData.phoneNumber.replace(/[\s-]/g, ''),
                qualifications: formData.qualifications.trim(),
                languageSpoken: formData.languageSpoken.trim(),
                location: formData.location.trim(),
                bio: formData.bio?.trim() || '',
                clinicName: formData.clinicName.trim(),
                clinicAddress: formData.clinicAddress.trim(),
                specialtyId: parseInt(formData.specialtyId),
                yearsOfExperience: parseInt(formData.yearsOfExperience),
                consultationFee: parseFloat(formData.consultationFee)
            };

            const response = await registrationService.submitDoctorRegistration(submitData);

            // Upload documents and avatar if any
            const hasDocuments = documents.medicalDegree || documents.practiceLicense ||
                                documents.idCard || documents.otherCertificates.length > 0 || avatar;

            if (hasDocuments && response.requestId) {
                setUploadingFiles(true);
                try {
                    await uploadDocuments(response.requestId);
                } catch (uploadErr) {
                    console.error('Error uploading documents:', uploadErr);
                    // Continue even if document upload fails - registration is still successful
                }
                setUploadingFiles(false);
            }

            setShowSuccessModal(true);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || 'Registration failed. Please try again.';
            setError(typeof errorMsg === 'string' ? errorMsg : 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
            setUploadingFiles(false);
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        navigate('/login');
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <div className="doctor-registration-bg">
                <div className="doctor-registration-container">
                    <div className="form-header">
                        <Link to="/register-as" className="back-link">
                            <i className="bi bi-arrow-left"></i> Back
                        </Link>
                        <h2>Doctor Registration</h2>
                        <p>Complete the form below to register as a healthcare professional</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            <i className="bi bi-exclamation-circle-fill"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Profile Photo */}
                        <div className="form-section">
                            <h3><i className="bi bi-person-circle"></i> Profile Photo</h3>
                            <p className="section-description">Upload your professional photo (Optional - JPG, PNG, WebP - Max 5MB)</p>
                            <div className="avatar-upload-wrapper">
                                <div className="avatar-preview">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar preview" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            <i className="bi bi-person"></i>
                                        </div>
                                    )}
                                </div>
                                <div className="avatar-controls">
                                    <input
                                        type="file"
                                        id="avatarUpload"
                                        accept="image/jpeg,image/png,image/jpg,image/webp"
                                        onChange={handleAvatarChange}
                                        disabled={submitting}
                                        className="file-input"
                                    />
                                    <label htmlFor="avatarUpload" className="avatar-upload-btn">
                                        <i className="bi bi-cloud-upload"></i>
                                        {avatar ? 'Change Photo' : 'Upload Photo'}
                                    </label>
                                    {avatar && (
                                        <button type="button" className="avatar-remove-btn" onClick={removeAvatar}>
                                            <i className="bi bi-trash"></i> Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="form-section">
                            <h3><i className="bi bi-person"></i> Personal Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="Dr. John Smith"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email <span className="required">*</span></label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="doctor@example.com"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone Number <span className="required">*</span></label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        placeholder="0901234567"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Location <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="Ho Chi Minh City"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Professional Information */}
                        <div className="form-section">
                            <h3><i className="bi bi-briefcase"></i> Professional Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Qualifications <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="qualifications"
                                        value={formData.qualifications}
                                        onChange={handleChange}
                                        placeholder="MD, PhD - Medical University"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Specialty <span className="required">*</span></label>
                                    <select
                                        name="specialtyId"
                                        value={formData.specialtyId}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    >
                                        <option value="">Select Specialty</option>
                                        {Array.isArray(specialties) && specialties.map(specialty => (
                                            <option key={specialty.specialtyId} value={specialty.specialtyId}>
                                                {specialty.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Years of Experience <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        name="yearsOfExperience"
                                        value={formData.yearsOfExperience}
                                        onChange={handleChange}
                                        placeholder="5"
                                        min="0"
                                        disabled={submitting}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Languages Spoken <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="languageSpoken"
                                        value={formData.languageSpoken}
                                        onChange={handleChange}
                                        placeholder="Vietnamese, English"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Consultation Fee (USD) <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        name="consultationFee"
                                        value={formData.consultationFee}
                                        onChange={handleChange}
                                        placeholder="50"
                                        min="1"
                                        step="0.01"
                                        disabled={submitting}
                                        required
                                    />
                                    <small className="form-text text-muted">Minimum fee: $1.00</small>
                                </div>
                                <div className="form-group">
                                    <label>Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        placeholder="Brief description about yourself and your expertise..."
                                        rows="3"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Required Documents */}
                        <div className="form-section">
                            <h3><i className="bi bi-file-earmark-medical"></i> Required Documents</h3>
                            <p className="section-description">Please upload the following documents for verification (PDF, JPG, PNG, DOC - Max 10MB each)</p>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Medical Degree Certificate <span className="required">*</span></label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="medicalDegree"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileChange(e, 'medicalDegree')}
                                            disabled={submitting}
                                            className="file-input"
                                        />
                                        <label htmlFor="medicalDegree" className="file-upload-label">
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>{documents.medicalDegree ? documents.medicalDegree.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.medicalDegree && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('medicalDegree')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Practice License <span className="required">*</span></label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="practiceLicense"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileChange(e, 'practiceLicense')}
                                            disabled={submitting}
                                            className="file-input"
                                        />
                                        <label htmlFor="practiceLicense" className="file-upload-label">
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>{documents.practiceLicense ? documents.practiceLicense.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.practiceLicense && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('practiceLicense')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>ID Card / Passport <span className="required">*</span></label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="idCard"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileChange(e, 'idCard')}
                                            disabled={submitting}
                                            className="file-input"
                                        />
                                        <label htmlFor="idCard" className="file-upload-label">
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>{documents.idCard ? documents.idCard.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.idCard && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('idCard')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Other Certificates (Optional)</label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="otherCertificates"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={handleMultipleFileChange}
                                            disabled={submitting}
                                            className="file-input"
                                            multiple
                                        />
                                        <label htmlFor="otherCertificates" className="file-upload-label">
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>Add more certificates...</span>
                                        </label>
                                    </div>
                                    {documents.otherCertificates.length > 0 && (
                                        <div className="uploaded-files-list">
                                            {documents.otherCertificates.map((file, index) => (
                                                <div key={index} className="uploaded-file-item">
                                                    <i className="bi bi-file-earmark"></i>
                                                    <span>{file.name}</span>
                                                    <button type="button" onClick={() => removeFile('otherCertificates', index)}>
                                                        <i className="bi bi-x"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Clinic Information */}
                        <div className="form-section">
                            <h3><i className="bi bi-hospital"></i> Clinic/Hospital Information</h3>
                            <p className="section-description">This information will be displayed on your public profile</p>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Clinic/Hospital Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="clinicName"
                                        value={formData.clinicName}
                                        onChange={handleChange}
                                        placeholder="HealthLink Medical Center"
                                        disabled={submitting}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Clinic/Hospital Address <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="clinicAddress"
                                        value={formData.clinicAddress}
                                        onChange={handleChange}
                                        placeholder="123 Main Street, District 1, Ho Chi Minh City"
                                        disabled={submitting}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Availability */}
                        <div className="form-section">
                            <h3><i className="bi bi-calendar-check"></i> Consultation Availability</h3>
                            <div className="availability-grid">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="availableForVideo"
                                        checked={formData.availableForVideo}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <span className="checkmark"></span>
                                    <i className="bi bi-camera-video"></i> Video Consultation
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="availableForAudio"
                                        checked={formData.availableForAudio}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <span className="checkmark"></span>
                                    <i className="bi bi-telephone"></i> Audio Consultation
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="availableForChat"
                                        checked={formData.availableForChat}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <span className="checkmark"></span>
                                    <i className="bi bi-chat-dots"></i> Chat Consultation
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="availableForOffline"
                                        checked={formData.availableForOffline}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <span className="checkmark"></span>
                                    <i className="bi bi-person-workspace"></i> In-Person Visit
                                </label>
                            </div>
                        </div>

                        {/* Terms and Conditions */}
                        <div className="form-section terms-section">
                            <h3><i className="bi bi-shield-check"></i> Terms and Conditions</h3>
                            <div className="terms-agreement">
                                <label className="terms-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        disabled={submitting}
                                    />
                                    <span className="terms-checkmark"></span>
                                    <span className="terms-text">
                                        I have read and agree to the{' '}
                                        <button
                                            type="button"
                                            className="terms-link"
                                            onClick={() => setShowTermsModal(true)}
                                        >
                                            Terms and Conditions
                                        </button>
                                        {' '}and{' '}
                                        <button
                                            type="button"
                                            className="terms-link"
                                            onClick={() => setShowTermsModal(true)}
                                        >
                                            Privacy Policy
                                        </button>
                                        {' '}of HealthLink platform.
                                    </span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn" disabled={submitting || uploadingFiles || !acceptedTerms}>
                            {submitting || uploadingFiles ? (
                                <>
                                    <span className="spinner"></span>
                                    {uploadingFiles ? 'Uploading documents...' : 'Submitting...'}
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-send"></i> Submit Registration
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Success Modal */}
            <Modal
                show={showSuccessModal}
                onHide={handleCloseSuccessModal}
                backdrop="static"
                keyboard={false}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="modal-success-header">
                    <Modal.Title className="modal-success-title">
                        <i className="bi bi-check-circle-fill"></i>
                        Registration Submitted
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="modal-success-body">
                    <div className="modal-success-content">
                        <i className="bi bi-envelope-check modal-success-icon"></i>
                        <h5>Your registration has been submitted successfully!</h5>
                        <p>
                            Thank you for registering with HealthLink. Our admin team will carefully review
                            your application and uploaded documents.
                        </p>
                        <div className="info-box waiting">
                            <i className="bi bi-clock-history"></i>
                            <div>
                                <strong>What happens next?</strong>
                                <span>You will receive an email notification at <strong>{formData.email}</strong> once your application has been reviewed. This email will contain your login credentials if approved, or feedback if additional information is needed.</span>
                            </div>
                        </div>
                        <div className="info-box tips">
                            <i className="bi bi-lightbulb"></i>
                            <div>
                                <strong>Tips:</strong>
                                <span>Please check your inbox and spam folder regularly. The review process typically takes 1-3 business days.</span>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="modal-success-footer">
                    <Button onClick={handleCloseSuccessModal} className="modal-success-button">
                        <i className="bi bi-check-circle"></i> Got it, I'll wait for the email
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Terms and Conditions Modal */}
            <Modal
                show={showTermsModal}
                onHide={() => setShowTermsModal(false)}
                centered
                size="lg"
                className="terms-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-file-earmark-text"></i> Terms and Conditions
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="terms-modal-body">
                    <div className="terms-content">
                        <h4>HealthLink Healthcare Provider Agreement</h4>
                        <p className="terms-intro">
                            By registering as a healthcare provider on the HealthLink platform, you agree to the following terms and conditions:
                        </p>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-1-circle"></i> Professional Qualifications</h5>
                            <ul>
                                <li>You confirm that all information provided during registration is accurate and complete.</li>
                                <li>You hold valid medical licenses and certifications required to practice in your jurisdiction.</li>
                                <li>You agree to provide authentic documentation for verification purposes.</li>
                                <li>You will notify HealthLink immediately of any changes to your professional status or credentials.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-2-circle"></i> Patient Care Standards</h5>
                            <ul>
                                <li>You commit to providing professional, ethical, and evidence-based medical advice.</li>
                                <li>You will maintain patient confidentiality in accordance with healthcare privacy laws (HIPAA, local regulations).</li>
                                <li>You will not prescribe medications inappropriately or without proper evaluation.</li>
                                <li>You will refer patients to emergency services when their condition requires immediate attention.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-3-circle"></i> Platform Usage</h5>
                            <ul>
                                <li>You will respond to patient consultations in a timely and professional manner.</li>
                                <li>You will not use the platform for any illegal or unethical purposes.</li>
                                <li>You agree not to share your account credentials with others.</li>
                                <li>You will maintain professional conduct in all communications on the platform.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-4-circle"></i> Data Privacy and Security</h5>
                            <ul>
                                <li>You will handle all patient data in compliance with applicable privacy laws.</li>
                                <li>You will not download, copy, or share patient information outside the platform without authorization.</li>
                                <li>You consent to HealthLink storing and processing your professional information for verification purposes.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-5-circle"></i> Liability and Insurance</h5>
                            <ul>
                                <li>You maintain adequate professional liability insurance coverage.</li>
                                <li>You understand that HealthLink serves as a platform facilitator and is not responsible for clinical decisions.</li>
                                <li>You agree to indemnify HealthLink against claims arising from your professional services.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-6-circle"></i> Account Termination</h5>
                            <ul>
                                <li>HealthLink reserves the right to suspend or terminate accounts that violate these terms.</li>
                                <li>You may request account deletion at any time by contacting support.</li>
                                <li>Upon termination, you must complete any ongoing patient consultations appropriately.</li>
                            </ul>
                        </div>

                        <div className="terms-footer-note">
                            <i className="bi bi-info-circle"></i>
                            <p>
                                By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by this agreement.
                                Last updated: January 2024
                            </p>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTermsModal(false)}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setAcceptedTerms(true);
                            setShowTermsModal(false);
                        }}
                    >
                        <i className="bi bi-check-lg"></i> I Accept
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default DoctorRegistration;
