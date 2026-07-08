import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import Loading from '../Loading';
import registrationService from '../../api/registrationApi';
import CVImportModal from './CVImportModal';
import { quickContentCheck } from '../../utils/documentModeration';
import './Css/DoctorRegistration.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const LocationPicker = ({ location, onPick }) => {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });

    if (!location?.lat || !location?.lng) return null;

    return <Marker position={[location.lat, location.lng]} />;
};

const MapRecenter = ({ location }) => {
    const map = useMap();

    useEffect(() => {
        if (location?.lat && location?.lng) {
            map.setView([location.lat, location.lng], 16);
        }
    }, [location, map]);

    return null;
};

export function DoctorRegistration() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [locatingClinic, setLocatingClinic] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [specialties, setSpecialties] = useState([]);

    const setFieldError = (field, message) => {
        setFieldErrors(prev => ({ ...prev, [field]: message }));
    };

    const clearFieldError = (field) => {
        setFieldErrors(prev => {
            if (!(field in prev)) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const fieldSelectors = {
        fullName: 'input[name="fullName"]',
        email: 'input[name="email"]',
        phoneNumber: 'input[name="phoneNumber"]',
        location: 'input[name="location"]',
        avatar: '#avatarUpload',
        qualifications: 'input[name="qualifications"]',
        specialtyId: 'select[name="specialtyId"]',
        yearsOfExperience: 'input[name="yearsOfExperience"]',
        languageSpoken: 'input[name="languageSpoken"]',
        clinicName: 'input[name="clinicName"]',
        clinicAddress: 'input[name="clinicAddress"]',
        clinicMap: '#clinicMapGroup',
        homeVisitRadiusKm: 'input[name="homeVisitRadiusKm"]',
        medicalDegree: '#medicalDegree',
        practiceLicense: '#practiceLicense',
        idCard: '#idCard',
        acceptedTerms: '#acceptedTermsCheckbox',
    };

    const focusAndScrollToField = (fieldKey) => {
        const selector = fieldSelectors[fieldKey];
        const el = selector && document.querySelector(selector);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof el.focus === 'function') {
            setTimeout(() => el.focus({ preventScroll: true }), 300);
        }
    };

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
        clinicName: '',
        clinicAddress: '',
        latitude: null,
        longitude: null,
        homeVisitRadiusKm: 10,
    });

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const [documents, setDocuments] = useState({
        medicalDegree: null,
        practiceLicense: null,
        idCard: null,
        otherCertificates: []
    });

    // Preview URLs for uploaded documents that are images
    const [documentPreviews, setDocumentPreviews] = useState({
        medicalDegree: null,
        practiceLicense: null,
        idCard: null,
    });
    const [otherCertificatePreviews, setOtherCertificatePreviews] = useState([]);

    // Avatar state
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [moderatingFile, setModeratingFile] = useState(null); // Track which file is being moderated
    const [submissionStep, setSubmissionStep] = useState(''); // Track current submission step

    // CV Import Modal state
    const [showCVImportModal, setShowCVImportModal] = useState(false);

    // Handle CV import data
    const handleCVImport = (extractedData) => {
        setFormData(prev => {
            const newData = { ...prev };
            // Only merge non-null, non-empty values
            Object.keys(extractedData).forEach(key => {
                if (extractedData[key] !== null && extractedData[key] !== undefined && extractedData[key] !== '') {
                    // Map CV data to form fields
                    if (key === 'yearsOfExperience' && typeof extractedData[key] === 'number') {
                        newData[key] = extractedData[key].toString();
                    } else if (key === 'specialty') {
                        // Try to match specialty name to specialtyId
                        const specialtyName = extractedData[key].toLowerCase().trim();
                        const matchedSpecialty = specialties.find(s =>
                            s.name?.toLowerCase().includes(specialtyName) ||
                            specialtyName.includes(s.name?.toLowerCase())
                        );
                        if (matchedSpecialty) {
                            newData.specialtyId = matchedSpecialty.specialtyId?.toString() || matchedSpecialty.id?.toString();
                            newData.specialty = matchedSpecialty.name;
                        } else {
                            // Keep the extracted specialty name for reference
                            newData.specialty = extractedData[key];
                        }
                    } else {
                        newData[key] = extractedData[key];
                    }
                }
            });
            return newData;
        });
        setError('');
    };

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
        clearFieldError(name);
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

    const handlePickLocation = (lat, lng) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
        }));
        clearFieldError('clinicMap');
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Your browser does not support location detection.');
            return;
        }

        setError('');
        setLocatingClinic(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                handlePickLocation(position.coords.latitude, position.coords.longitude);
                setLocatingClinic(false);
            },
            () => {
                setError('Unable to access your location.');
                setLocatingClinic(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
            }
        );
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB for avatar)
            if (file.size > 5 * 1024 * 1024) {
                setFieldError('avatar', 'Avatar size must be less than 5MB');
                return;
            }
            // Validate file type (images only)
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setFieldError('avatar', 'Please upload an image file (JPG, PNG, or WebP)');
                return;
            }

            // Content moderation
            setModeratingFile('avatar');
            try {
                const result = await quickContentCheck(file);
                if (!result.safe) {
                    setFieldError('avatar', result.reason || 'This image contains inappropriate content and cannot be uploaded.');
                    e.target.value = '';
                    setModeratingFile(null);
                    return;
                }
            } catch (err) {
                console.error('Moderation error:', err);
            } finally {
                setModeratingFile(null);
            }

            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
            clearFieldError('avatar');
        }
    };

    const removeAvatar = () => {
        setAvatar(null);
        if (avatarPreview) {
            URL.revokeObjectURL(avatarPreview);
        }
        setAvatarPreview(null);
    };

    const handleFileChange = async (e, documentType) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setFieldError(documentType, 'File size must be less than 10MB');
                return;
            }
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
                                  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setFieldError(documentType, 'File type not allowed. Please upload PDF, JPG, PNG, DOC, or DOCX files.');
                return;
            }

            // Content moderation for images
            if (file.type.startsWith('image/')) {
                setModeratingFile(documentType);
                clearFieldError(documentType);
                try {
                    const result = await quickContentCheck(file);
                    if (!result.safe) {
                        setFieldError(documentType, result.reason || 'This image contains inappropriate content and cannot be uploaded.');
                        e.target.value = '';
                        setModeratingFile(null);
                        return;
                    }
                    if (result.warning) {
                        // Allow but show warning
                        console.warn('Image warning:', result.reason);
                    }
                } catch (err) {
                    console.error('Moderation error:', err);
                    // Allow on error, will be checked by backend
                } finally {
                    setModeratingFile(null);
                }
            }

            setDocuments(prev => ({
                ...prev,
                [documentType]: file
            }));
            setDocumentPreviews(prev => {
                if (prev[documentType]) {
                    URL.revokeObjectURL(prev[documentType]);
                }
                return {
                    ...prev,
                    [documentType]: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
                };
            });
            clearFieldError(documentType);
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
        setOtherCertificatePreviews(prev => [
            ...prev,
            ...validFiles.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
        ]);
        setError('');
    };

    const removeFile = (documentType, index = null) => {
        if (index !== null) {
            setDocuments(prev => ({
                ...prev,
                otherCertificates: prev.otherCertificates.filter((_, i) => i !== index)
            }));
            setOtherCertificatePreviews(prev => {
                if (prev[index]) {
                    URL.revokeObjectURL(prev[index]);
                }
                return prev.filter((_, i) => i !== index);
            });
        } else {
            setDocuments(prev => ({
                ...prev,
                [documentType]: null
            }));
            setDocumentPreviews(prev => {
                if (prev[documentType]) {
                    URL.revokeObjectURL(prev[documentType]);
                }
                return {
                    ...prev,
                    [documentType]: null
                };
            });
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

        const errors = {};

        // Validation - Personal Information
        if (!formData.fullName?.trim()) {
            errors.fullName = 'Full name is required';
        }

        if (!formData.email?.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!formData.phoneNumber?.trim()) {
            errors.phoneNumber = 'Phone number is required';
        } else if (!/^[0-9]{10,11}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
            errors.phoneNumber = 'Phone number must be 10-11 digits';
        }

        if (!formData.location?.trim()) {
            errors.location = 'Location is required';
        }

        if (!avatar) {
            errors.avatar = 'Profile photo is required';
        }

        // Validation - Professional Information
        if (!formData.qualifications?.trim()) {
            errors.qualifications = 'Qualifications are required';
        }

        if (!formData.specialtyId) {
            errors.specialtyId = 'Please select a specialty';
        }

        if (!formData.yearsOfExperience || parseInt(formData.yearsOfExperience) < 0) {
            errors.yearsOfExperience = 'Years of experience is required and must be non-negative';
        }

        if (!formData.languageSpoken?.trim()) {
            errors.languageSpoken = 'Languages spoken is required';
        }

        // Validation - Clinic Information (required for profile display)
        if (!formData.clinicName?.trim()) {
            errors.clinicName = 'Clinic/Hospital name is required';
        }

        if (!formData.clinicAddress?.trim()) {
            errors.clinicAddress = 'Clinic/Hospital address is required';
        }

        if (!formData.latitude || !formData.longitude) {
            errors.clinicMap = 'Please pin your clinic location on the map';
        }

        if (formData.homeVisitRadiusKm && parseFloat(formData.homeVisitRadiusKm) > 25) {
            errors.homeVisitRadiusKm = 'Home visit service radius cannot exceed 25km';
        }

        // Validation - Required Documents
        if (!documents.medicalDegree) {
            errors.medicalDegree = 'Medical Degree Certificate is required';
        }

        if (!documents.practiceLicense) {
            errors.practiceLicense = 'Practice License is required';
        }

        if (!documents.idCard) {
            errors.idCard = 'ID Card / Passport is required';
        }

        if (!acceptedTerms) {
            errors.acceptedTerms = 'You must accept the Terms and Conditions to proceed';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(prev => ({ ...prev, ...errors }));
            const fieldOrder = [
                'fullName', 'email', 'phoneNumber', 'location', 'avatar',
                'qualifications', 'specialtyId', 'yearsOfExperience', 'languageSpoken',
                'clinicName', 'clinicAddress', 'clinicMap', 'homeVisitRadiusKm',
                'medicalDegree', 'practiceLicense', 'idCard', 'acceptedTerms',
            ];
            const firstField = fieldOrder.find(f => errors[f]);
            focusAndScrollToField(firstField);
            return;
        }

        setFieldErrors({});
        setSubmitting(true);
        setSubmissionStep('submitting');

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
                latitude: formData.latitude,
                longitude: formData.longitude,
                homeVisitRadiusKm: formData.homeVisitRadiusKm ? parseFloat(formData.homeVisitRadiusKm) : 10
            };

            const response = await registrationService.submitDoctorRegistration(submitData);

            // Upload documents and avatar if any
            const hasDocuments = documents.medicalDegree || documents.practiceLicense ||
                                documents.idCard || documents.otherCertificates.length > 0 || avatar;

            if (hasDocuments && response.requestId) {
                setUploadingFiles(true);
                setSubmissionStep('uploading');
                try {
                    await uploadDocuments(response.requestId);
                    // After upload, AI screening will start automatically
                    setSubmissionStep('verifying');
                    // Small delay to show verifying message
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } catch (uploadErr) {
                    console.error('Error uploading documents:', uploadErr);
                    // Continue even if document upload fails - registration is still successful
                }
                setUploadingFiles(false);
            }

            setSubmissionStep('complete');
            setShowSuccessModal(true);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || 'Registration failed. Please try again.';
            setError(typeof errorMsg === 'string' ? errorMsg : 'Registration failed. Please try again.');
            setSubmissionStep('');
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

    const FieldError = ({ field }) => (
        fieldErrors[field] ? (
            <p className="field-error-text">
                <i className="bi bi-exclamation-circle-fill"></i> {fieldErrors[field]}
            </p>
        ) : null
    );

    return (
        <>
            {/* Submission Loading Overlay */}
            {(submitting || uploadingFiles) && (
                <div className="submission-overlay">
                    <div className="submission-modal">
                        <div className="submission-spinner"></div>
                        <h3>
                            {submissionStep === 'submitting' && 'Submitting Registration'}
                            {submissionStep === 'uploading' && 'Uploading Documents'}
                            {submissionStep === 'verifying' && 'AI Verification in Progress'}
                            {submissionStep === 'complete' && 'Almost Done!'}
                        </h3>
                        <p className="submission-message">
                            {submissionStep === 'submitting' && 'Please wait while we process your registration...'}
                            {submissionStep === 'uploading' && 'Uploading your documents securely. This may take a moment...'}
                            {submissionStep === 'verifying' && 'Our AI is reviewing your documents for verification...'}
                            {submissionStep === 'complete' && 'Your registration has been submitted successfully!'}
                        </p>
                        <div className="submission-steps">
                            <div className={`step ${submissionStep === 'submitting' ? 'active' : ''} ${['uploading', 'verifying', 'complete'].includes(submissionStep) ? 'completed' : ''}`}>
                                <div className="step-icon">
                                    {['uploading', 'verifying', 'complete'].includes(submissionStep) ? (
                                        <i className="bi bi-check-lg"></i>
                                    ) : (
                                        <i className="bi bi-person-lines-fill"></i>
                                    )}
                                </div>
                                <span>Submit Info</span>
                            </div>
                            <div className="step-line"></div>
                            <div className={`step ${submissionStep === 'uploading' ? 'active' : ''} ${['verifying', 'complete'].includes(submissionStep) ? 'completed' : ''}`}>
                                <div className="step-icon">
                                    {['verifying', 'complete'].includes(submissionStep) ? (
                                        <i className="bi bi-check-lg"></i>
                                    ) : (
                                        <i className="bi bi-cloud-upload"></i>
                                    )}
                                </div>
                                <span>Upload Files</span>
                            </div>
                            <div className="step-line"></div>
                            <div className={`step ${submissionStep === 'verifying' ? 'active' : ''} ${submissionStep === 'complete' ? 'completed' : ''}`}>
                                <div className="step-icon">
                                    {submissionStep === 'complete' ? (
                                        <i className="bi bi-check-lg"></i>
                                    ) : (
                                        <i className="bi bi-robot"></i>
                                    )}
                                </div>
                                <span>AI Review</span>
                            </div>
                        </div>
                        <p className="submission-note">
                            <i className="bi bi-info-circle"></i>
                            Please do not close this page or navigate away
                        </p>
                    </div>
                </div>
            )}

            <div className="doctor-registration-bg">
                <div className="doctor-registration-container">
                    <div className="form-header">
                        <Link to="/register-as" className="back-link">
                            <i className="bi bi-arrow-left"></i> Back
                        </Link>
                        <button
                            type="button"
                            className="quick-fill-corner-btn"
                            onClick={() => setShowCVImportModal(true)}
                            disabled={submitting}
                            title="Upload your CV to auto-fill the form (PDF, DOCX, or image)"
                        >
                            <i className="bi bi-magic"></i>
                            Quick Fill
                        </button>
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
                        {/* Personal Information + Profile Photo */}
                        <div className="form-section profile-personal-row">
                            <div className="personal-info-col">
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
                                            className={fieldErrors.fullName ? 'input-error' : undefined}
                                        />
                                        <FieldError field="fullName" />
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
                                            className={fieldErrors.email ? 'input-error' : undefined}
                                        />
                                        <FieldError field="email" />
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
                                            className={fieldErrors.phoneNumber ? 'input-error' : undefined}
                                        />
                                        <FieldError field="phoneNumber" />
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
                                            className={fieldErrors.location ? 'input-error' : undefined}
                                        />
                                        <FieldError field="location" />
                                        <small className="form-text text-muted">
                                            Main city/province you operate in — shown publicly on your profile and used by patients to filter by area (different from the detailed clinic address below).
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div className="profile-photo-col">
                                <h3><i className="bi bi-person-circle"></i> Profile Photo <span className="required">*</span></h3>
                                <div className={`avatar-upload-wrapper${avatarPreview ? ' has-avatar' : ''}`}>
                                    <div className="avatar-preview">
                                        {avatarPreview ? (
                                            <>
                                                <img src={avatarPreview} alt="Avatar preview" />
                                                <button
                                                    type="button"
                                                    className="avatar-remove-btn"
                                                    onClick={removeAvatar}
                                                    title="Remove photo"
                                                    aria-label="Remove photo"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </>
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
                                        <p className="photo-format-hint">Your professional photo (JPG, PNG - Max 5MB)</p>
                                    </div>
                                </div>
                                <FieldError field="avatar" />
                                <p className="photo-warning-note">
                                    <i className="bi bi-exclamation-triangle"></i>
                                    Please choose a clear, appropriate photo for patients to see — an invalid or unsuitable photo will result in your application being rejected.
                                </p>
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
                                        className={fieldErrors.qualifications ? 'input-error' : undefined}
                                    />
                                    <FieldError field="qualifications" />
                                    <small className="form-text text-muted">
                                        Your degrees/certifications, e.g. MD, PhD, BS CKI — shown publicly so patients can assess your qualifications.
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Specialty <span className="required">*</span></label>
                                    <select
                                        name="specialtyId"
                                        value={formData.specialtyId}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        className={fieldErrors.specialtyId ? 'input-error' : undefined}
                                    >
                                        <option value="">Select Specialty</option>
                                        {Array.isArray(specialties) && specialties.map(specialty => (
                                            <option key={specialty.specialtyId} value={specialty.specialtyId}>
                                                {specialty.name}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError field="specialtyId" />
                                    <small className="form-text text-muted">
                                        Your main specialty — patients search and filter doctors by this field.
                                    </small>
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
                                        className={fieldErrors.yearsOfExperience ? 'input-error' : undefined}
                                    />
                                    <FieldError field="yearsOfExperience" />
                                    <small className="form-text text-muted">
                                        Actual years of practice — shown publicly on your profile.
                                    </small>
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
                                        className={fieldErrors.languageSpoken ? 'input-error' : undefined}
                                    />
                                    <FieldError field="languageSpoken" />
                                    <small className="form-text text-muted">
                                        Languages you can use to communicate with patients, e.g. Vietnamese, English.
                                    </small>
                                </div>
                            </div>
                            <div className="form-row">
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
                                    <small className="form-text text-muted">
                                        A short introduction about your experience/approach to care — shown on your public profile page.
                                    </small>
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
                                            {documentPreviews.medicalDegree ? (
                                                <img src={documentPreviews.medicalDegree} alt="Medical Degree Certificate preview" className="file-preview-thumb" />
                                            ) : (
                                                <i className="bi bi-cloud-upload"></i>
                                            )}
                                            <span>{documents.medicalDegree ? documents.medicalDegree.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.medicalDegree && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('medicalDegree')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                    <FieldError field="medicalDegree" />
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
                                            {documentPreviews.practiceLicense ? (
                                                <img src={documentPreviews.practiceLicense} alt="Practice License preview" className="file-preview-thumb" />
                                            ) : (
                                                <i className="bi bi-cloud-upload"></i>
                                            )}
                                            <span>{documents.practiceLicense ? documents.practiceLicense.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.practiceLicense && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('practiceLicense')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                    <FieldError field="practiceLicense" />
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
                                            {documentPreviews.idCard ? (
                                                <img src={documentPreviews.idCard} alt="ID Card / Passport preview" className="file-preview-thumb" />
                                            ) : (
                                                <i className="bi bi-cloud-upload"></i>
                                            )}
                                            <span>{documents.idCard ? documents.idCard.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.idCard && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('idCard')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                    <FieldError field="idCard" />
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
                                                    {otherCertificatePreviews[index] ? (
                                                        <img src={otherCertificatePreviews[index]} alt={`${file.name} preview`} className="file-preview-thumb-sm" />
                                                    ) : (
                                                        <i className="bi bi-file-earmark"></i>
                                                    )}
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
                                        className={fieldErrors.clinicName ? 'input-error' : undefined}
                                    />
                                    <FieldError field="clinicName" />
                                    <small className="form-text text-muted">
                                        Name of the clinic/hospital you currently work at — shown publicly on your profile.
                                    </small>
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
                                        className={fieldErrors.clinicAddress ? 'input-error' : undefined}
                                    />
                                    <FieldError field="clinicAddress" />
                                    <small className="form-text text-muted">
                                        Full street address — shown publicly and used as your contact point if a Home Visit patient needs to verify your clinic.
                                    </small>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group clinic-map-group" id="clinicMapGroup">
                                    <label>Pin Clinic Location on Map <span className="required">*</span></label>
                                    <small className="form-text text-muted">
                                        Click on the map to mark the exact location of your clinic/hospital. This pin determines whether you show up when patients search for nearby doctors (Home Visit).
                                    </small>
                                    <FieldError field="clinicMap" />
                                    <div className="clinic-map-actions">
                                        <button
                                            type="button"
                                            className="clinic-map-location-btn"
                                            onClick={handleUseCurrentLocation}
                                            disabled={submitting || locatingClinic}
                                        >
                                            {locatingClinic ? (
                                                <>
                                                    <span className="clinic-map-location-spinner"></span>
                                                    Detecting your location...
                                                </>
                                            ) : (
                                                'Use my current location'
                                            )}
                                        </button>
                                        {locatingClinic && (
                                            <small className="clinic-map-location-status">
                                                Please wait, requesting your current location from the browser...
                                            </small>
                                        )}
                                    </div>
                                    <MapContainer
                                        center={[
                                            formData.latitude || 13.5,
                                            formData.longitude || 106.0,
                                        ]}
                                        zoom={formData.latitude && formData.longitude ? 15 : 4}
                                        style={{ height: '300px', width: '100%' }}
                                    >
                                        <TileLayer
                                            attribution="&copy; OpenStreetMap contributors"
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />

                                        <MapRecenter
                                            location={
                                                formData.latitude && formData.longitude
                                                    ? { lat: formData.latitude, lng: formData.longitude }
                                                    : null
                                            }
                                        />

                                        <LocationPicker
                                            location={
                                                formData.latitude && formData.longitude
                                                    ? { lat: formData.latitude, lng: formData.longitude }
                                                    : null
                                            }
                                            onPick={handlePickLocation}
                                        />
                                    </MapContainer>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Home Visit Service Radius (km)</label>
                                    <input
                                        type="number"
                                        name="homeVisitRadiusKm"
                                        value={formData.homeVisitRadiusKm}
                                        onChange={handleChange}
                                        placeholder="10"
                                        min="1"
                                        max="25"
                                        step="1"
                                        disabled={submitting}
                                        className={fieldErrors.homeVisitRadiusKm ? 'input-error' : undefined}
                                    />
                                    <FieldError field="homeVisitRadiusKm" />
                                    <small className="form-text text-muted">
                                        How far (in km) you're willing to travel to a patient's home, measured from the pin above. Maximum 25km. Patients outside this radius won't see you in Home Visit search results. You can change this later after logging in.
                                    </small>
                                </div>
                            </div>
                        </div>

                        {/* Terms and Conditions */}
                        <div className="form-section terms-section">
                            <h3><i className="bi bi-shield-check"></i> Terms and Conditions</h3>
                            <div className="terms-agreement">
                                <label className="terms-checkbox-label">
                                    <input
                                        type="checkbox"
                                        id="acceptedTermsCheckbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => {
                                            setAcceptedTerms(e.target.checked);
                                            clearFieldError('acceptedTerms');
                                        }}
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
                                <FieldError field="acceptedTerms" />
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
                className="doctor-terms-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-file-earmark-text"></i> Terms and Conditions
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="doctor-terms-modal-body">
                    <div className="doctor-terms-content">
                        <h4>HealthLink Healthcare Provider Agreement</h4>
                        <p className="doctor-terms-intro">
                            By registering as a healthcare provider on the HealthLink platform, you agree to the following terms and conditions:
                        </p>

                        <div className="doctor-terms-section-item">
                            <h5><i className="bi bi-1-circle"></i> Professional Qualifications</h5>
                            <ul>
                                <li>You confirm that all information provided during registration is accurate and complete.</li>
                                <li>You hold valid medical licenses and certifications required to practice in your jurisdiction.</li>
                                <li>You agree to provide authentic documentation for verification purposes.</li>
                                <li>You will notify HealthLink immediately of any changes to your professional status or credentials.</li>
                            </ul>
                        </div>

                        <div className="doctor-terms-section-item">
                            <h5><i className="bi bi-2-circle"></i> Patient Care Standards</h5>
                            <ul>
                                <li>You commit to providing professional, ethical, and evidence-based medical advice.</li>
                                <li>You will maintain patient confidentiality in accordance with healthcare privacy laws (HIPAA, local regulations).</li>
                                <li>You will not prescribe medications inappropriately or without proper evaluation.</li>
                                <li>You will refer patients to emergency services when their condition requires immediate attention.</li>
                            </ul>
                        </div>

                        <div className="doctor-terms-section-item">
                            <h5><i className="bi bi-3-circle"></i> Platform Usage</h5>
                            <ul>
                                <li>You will respond to patient consultations in a timely and professional manner.</li>
                                <li>You will not use the platform for any illegal or unethical purposes.</li>
                                <li>You agree not to share your account credentials with others.</li>
                                <li>You will maintain professional conduct in all communications on the platform.</li>
                            </ul>
                        </div>

                        <div className="doctor-terms-section-item">
                            <h5><i className="bi bi-4-circle"></i> Data Privacy and Security</h5>
                            <ul>
                                <li>You will handle all patient data in compliance with applicable privacy laws.</li>
                                <li>You will not download, copy, or share patient information outside the platform without authorization.</li>
                                <li>You consent to HealthLink storing and processing your professional information for verification purposes.</li>
                            </ul>
                        </div>

                        <div className="doctor-terms-section-item">
                            <h5><i className="bi bi-5-circle"></i> Liability and Insurance</h5>
                            <ul>
                                <li>You maintain adequate professional liability insurance coverage.</li>
                                <li>You understand that HealthLink serves as a platform facilitator and is not responsible for clinical decisions.</li>
                                <li>You agree to indemnify HealthLink against claims arising from your professional services.</li>
                            </ul>
                        </div>

                        <div className="doctor-terms-section-item">
                            <h5><i className="bi bi-6-circle"></i> Account Termination</h5>
                            <ul>
                                <li>HealthLink reserves the right to suspend or terminate accounts that violate these terms.</li>
                                <li>You may request account deletion at any time by contacting support.</li>
                                <li>Upon termination, you must complete any ongoing patient consultations appropriately.</li>
                            </ul>
                        </div>

                        <div className="doctor-terms-footer-note">
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

            {/* CV Import Modal */}
            <CVImportModal
                show={showCVImportModal}
                onHide={() => setShowCVImportModal(false)}
                onImport={handleCVImport}
                type="doctor"
            />
        </>
    );
}

export default DoctorRegistration;
