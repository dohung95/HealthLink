import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import Loading from '../Loading';
import registrationService from '../../api/registrationApi';
import CVImportModal from './CVImportModal';
import { quickContentCheck } from '../../utils/documentModeration';
import './Css/PharmacyRegistration.css';

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

export function PharmacyRegistration() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [locatingPharmacy, setLocatingPharmacy] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        name: 'input[name="name"]',
        licenseNumber: 'input[name="licenseNumber"]',
        email: 'input[name="email"]',
        phoneNumber: 'input[name="phoneNumber"]',
        avatar: '#avatarUpload',
        address: 'input[name="address"]',
        locationMap: '#pharmacyMapGroup',
        businessLicense: '#businessLicense',
        pharmacyLicense: '#pharmacyLicense',
        ownerIdCard: '#ownerIdCard',
        openTime: 'input[name="openTime"]',
        closeTime: 'input[name="closeTime"]',
        workingDays: 'select[name="workingDays"]',
        deliveryRadius: 'input[name="deliveryRadius"]',
        deliveryFee: 'input[name="deliveryFee"]',
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
        name: '',  // Pharmacy name - consistent with Pharmacy entity
        email: '',
        phoneNumber: '',
        licenseNumber: '',
        address: '',
        city: '',
        district: '',
        ward: '',
        latitude: null,
        longitude: null,
        openTime: '08:00',
        closeTime: '22:00',
        open24Hours: false,
        workingDays: 'Mon-Sun',
        deliveryAvailable: false,
        deliveryRadius: '',
        deliveryFee: '',
        description: ''
    });

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const [documents, setDocuments] = useState({
        businessLicense: null,
        pharmacyLicense: null,
        ownerIdCard: null,
        otherDocuments: []
    });

    // Preview URLs for uploaded documents that are images
    const [documentPreviews, setDocumentPreviews] = useState({
        businessLicense: null,
        pharmacyLicense: null,
        ownerIdCard: null,
    });
    const [otherDocumentPreviews, setOtherDocumentPreviews] = useState([]);

    // Avatar state
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [moderatingFile, setModeratingFile] = useState(null);
    const [submissionStep, setSubmissionStep] = useState(''); // Track current submission step

    // CV Import Modal state
    const [showCVImportModal, setShowCVImportModal] = useState(false);

    // Handle CV import data
    const handleCVImport = (extractedData) => {
        setFormData(prev => {
            const newData = { ...prev };
            // Map pharmacy data fields
            Object.keys(extractedData).forEach(key => {
                if (extractedData[key] !== null && extractedData[key] !== undefined && extractedData[key] !== '') {
                    // Map pharmacyName to name (form uses 'name')
                    if (key === 'pharmacyName') {
                        newData.name = extractedData[key];
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
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        clearFieldError(name);
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePickLocation = (lat, lng) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
        }));
        clearFieldError('locationMap');
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Your browser does not support location detection.');
            return;
        }

        setError('');
        setLocatingPharmacy(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                handlePickLocation(position.coords.latitude, position.coords.longitude);
                setLocatingPharmacy(false);
            },
            () => {
                setError('Unable to access your location.');
                setLocatingPharmacy(false);
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
            if (file.size > 10 * 1024 * 1024) {
                setFieldError(documentType, 'File size must be less than 10MB');
                return;
            }
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
                        console.warn('Image warning:', result.reason);
                    }
                } catch (err) {
                    console.error('Moderation error:', err);
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
            otherDocuments: [...prev.otherDocuments, ...validFiles]
        }));
        setOtherDocumentPreviews(prev => [
            ...prev,
            ...validFiles.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
        ]);
        setError('');
    };

    const removeFile = (documentType, index = null) => {
        if (index !== null) {
            setDocuments(prev => ({
                ...prev,
                otherDocuments: prev.otherDocuments.filter((_, i) => i !== index)
            }));
            setOtherDocumentPreviews(prev => {
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

        if (documents.businessLicense) {
            uploads.push({ file: documents.businessLicense, type: 'Business License' });
        }
        if (documents.pharmacyLicense) {
            uploads.push({ file: documents.pharmacyLicense, type: 'Pharmacy License (GPP)' });
        }
        if (documents.ownerIdCard) {
            uploads.push({ file: documents.ownerIdCard, type: 'Owner ID Card / Passport' });
        }
        documents.otherDocuments.forEach((file, index) => {
            uploads.push({ file, type: `Other Document ${index + 1}` });
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

        if (!formData.name?.trim()) {
            errors.name = 'Pharmacy name is required';
        }

        if (!formData.licenseNumber?.trim()) {
            errors.licenseNumber = 'License number is required';
        }

        if (!formData.email?.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!formData.phoneNumber?.trim()) {
            errors.phoneNumber = 'Phone number is required';
        }

        if (!avatar) {
            errors.avatar = 'Profile photo is required';
        }

        if (!formData.address?.trim()) {
            errors.address = 'Address is required';
        }

        if (!formData.latitude || !formData.longitude) {
            errors.locationMap = 'Please pin your pharmacy location on the map';
        }

        if (!documents.businessLicense) {
            errors.businessLicense = 'Business License is required';
        }

        if (!documents.pharmacyLicense) {
            errors.pharmacyLicense = 'Pharmacy License (GPP) is required';
        }

        if (!documents.ownerIdCard) {
            errors.ownerIdCard = 'Owner ID Card / Passport is required';
        }

        if (!formData.open24Hours) {
            if (!formData.openTime) {
                errors.openTime = 'Open time is required';
            }
            if (!formData.closeTime) {
                errors.closeTime = 'Close time is required';
            }
        }

        if (!formData.workingDays) {
            errors.workingDays = 'Working days is required';
        }

        if (formData.deliveryAvailable) {
            if (formData.deliveryRadius === '' || formData.deliveryRadius === null) {
                errors.deliveryRadius = 'Delivery radius is required';
            } else {
                const radiusValue = parseFloat(formData.deliveryRadius);
                if (Number.isNaN(radiusValue) || radiusValue < 0) {
                    errors.deliveryRadius = 'Please enter a valid delivery radius';
                } else if (radiusValue > 50) {
                    errors.deliveryRadius = 'Delivery radius cannot exceed 50 km';
                }
            }

            if (formData.deliveryFee === '' || formData.deliveryFee === null) {
                errors.deliveryFee = 'Delivery fee is required';
            } else {
                const feeValue = parseFloat(formData.deliveryFee);
                if (Number.isNaN(feeValue) || feeValue < 0) {
                    errors.deliveryFee = 'Please enter a valid delivery fee';
                } else if (feeValue > 20) {
                    errors.deliveryFee = 'Delivery fee cannot exceed $20.00';
                }
            }
        }

        if (!acceptedTerms) {
            errors.acceptedTerms = 'You must accept the Terms and Conditions to proceed';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(prev => ({ ...prev, ...errors }));
            const fieldOrder = [
                'name', 'licenseNumber', 'email', 'phoneNumber', 'avatar', 'address', 'locationMap',
                'businessLicense', 'pharmacyLicense', 'ownerIdCard',
                'openTime', 'closeTime', 'workingDays', 'deliveryRadius', 'deliveryFee', 'acceptedTerms',
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
                pharmacyName: formData.name,  // Map to backend DTO field name
                deliveryRadius: parseFloat(formData.deliveryRadius) || null,
                deliveryFee: parseFloat(formData.deliveryFee) || null
            };
            delete submitData.name;  // Remove duplicate field

            const response = await registrationService.submitPharmacyRegistration(submitData);

            // Upload documents and avatar if any
            const hasDocuments = documents.businessLicense || documents.pharmacyLicense ||
                                documents.ownerIdCard || documents.otherDocuments.length > 0 || avatar;

            if (hasDocuments && response.requestId) {
                setUploadingFiles(true);
                setSubmissionStep('uploading');
                try {
                    await uploadDocuments(response.requestId);
                    setSubmissionStep('verifying');
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
                                        <i className="bi bi-building"></i>
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

            <div className="pharmacy-registration-bg">
                <div className="pharmacy-registration-container">
                    <div className="form-header">
                        <Link to="/register-as" className="back-link">
                            <i className="bi bi-arrow-left"></i> Back
                        </Link>
                        <button
                            type="button"
                            className="quick-fill-corner-btn"
                            onClick={() => setShowCVImportModal(true)}
                            disabled={submitting}
                            title="Upload documents to auto-fill the form (PDF, DOCX, or image)"
                        >
                            <i className="bi bi-magic"></i>
                            Quick Fill
                        </button>
                        <h2>Pharmacy Registration</h2>
                        <p>Complete the form below to register your pharmacy</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            <i className="bi bi-exclamation-circle-fill"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Basic Information + Profile Photo */}
                        <div className="form-section profile-basic-row">
                            <div className="basic-info-col">
                                <h3><i className="bi bi-shop"></i> Basic Information</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Pharmacy Name <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="HealthLink Pharmacy"
                                            disabled={submitting}
                                            className={fieldErrors.name ? 'input-error' : undefined}
                                        />
                                        <FieldError field="name" />
                                    </div>
                                    <div className="form-group">
                                        <label>License Number <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            name="licenseNumber"
                                            value={formData.licenseNumber}
                                            onChange={handleChange}
                                            placeholder="GPP-2024-001"
                                            disabled={submitting}
                                            className={fieldErrors.licenseNumber ? 'input-error' : undefined}
                                        />
                                        <FieldError field="licenseNumber" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email <span className="required">*</span></label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="pharmacy@example.com"
                                            disabled={submitting}
                                            className={fieldErrors.email ? 'input-error' : undefined}
                                        />
                                        <FieldError field="email" />
                                    </div>
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
                                </div>
                            </div>
                            <div className="profile-photo-col">
                                <h3><i className="bi bi-image"></i> Profile Photo <span className="required">*</span></h3>
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
                                                <i className="bi bi-shop"></i>
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
                                        <p className="photo-format-hint">Logo or storefront photo (JPG, PNG - Max 5MB)</p>
                                    </div>
                                </div>
                                <FieldError field="avatar" />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="form-section">
                            <h3><i className="bi bi-geo-alt"></i> Location</h3>
                            <div className="form-group full-width">
                                <label>Address <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="123 Main Street"
                                    disabled={submitting}
                                    className={fieldErrors.address ? 'input-error' : undefined}
                                />
                                <FieldError field="address" />
                            </div>
                            <div className="form-row three-cols">
                                <div className="form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="Ho Chi Minh City"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>District</label>
                                    <input
                                        type="text"
                                        name="district"
                                        value={formData.district}
                                        onChange={handleChange}
                                        placeholder="District 1"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Ward</label>
                                    <input
                                        type="text"
                                        name="ward"
                                        value={formData.ward}
                                        onChange={handleChange}
                                        placeholder="Ben Nghe Ward"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group pharmacy-map-group" id="pharmacyMapGroup">
                                    <label>Pin Pharmacy Location on Map <span className="required">*</span></label>
                                    <small className="form-text text-muted">
                                        Click on the map to mark the exact location of your pharmacy. This pin determines whether patients can order delivery from you and how delivery distance is calculated.
                                    </small>
                                    <FieldError field="locationMap" />
                                    <div className="pharmacy-map-actions">
                                        <button
                                            type="button"
                                            className="pharmacy-map-location-btn"
                                            onClick={handleUseCurrentLocation}
                                            disabled={submitting || locatingPharmacy}
                                        >
                                            {locatingPharmacy ? (
                                                <>
                                                    <span className="pharmacy-map-location-spinner"></span>
                                                    Detecting your location...
                                                </>
                                            ) : (
                                                'Use my current location'
                                            )}
                                        </button>
                                        {locatingPharmacy && (
                                            <small className="pharmacy-map-location-status">
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
                        </div>

                        {/* Business Hours */}
                        <div className="form-section">
                            <h3><i className="bi bi-clock"></i> Business Hours</h3>
                            <div className="checkbox-single">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="open24Hours"
                                        checked={formData.open24Hours}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <span className="checkmark"></span>
                                    <i className="bi bi-24-hour"></i> Open 24 Hours
                                </label>
                            </div>
                            {!formData.open24Hours && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Open Time <span className="required">*</span></label>
                                        <input
                                            type="time"
                                            name="openTime"
                                            value={formData.openTime}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            className={fieldErrors.openTime ? 'input-error' : undefined}
                                        />
                                        <FieldError field="openTime" />
                                    </div>
                                    <div className="form-group">
                                        <label>Close Time <span className="required">*</span></label>
                                        <input
                                            type="time"
                                            name="closeTime"
                                            value={formData.closeTime}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            className={fieldErrors.closeTime ? 'input-error' : undefined}
                                        />
                                        <FieldError field="closeTime" />
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Working Days <span className="required">*</span></label>
                                <select
                                    name="workingDays"
                                    value={formData.workingDays}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    className={fieldErrors.workingDays ? 'input-error' : undefined}
                                >
                                    <option value="Mon-Sun">Monday - Sunday (7 days)</option>
                                    <option value="Mon-Sat">Monday - Saturday (6 days)</option>
                                    <option value="Mon-Fri">Monday - Friday (5 days)</option>
                                </select>
                                <FieldError field="workingDays" />
                            </div>
                        </div>

                        {/* Delivery */}
                        <div className="form-section">
                            <h3><i className="bi bi-truck"></i> Delivery Services</h3>
                            <div className="checkbox-single">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="deliveryAvailable"
                                        checked={formData.deliveryAvailable}
                                        onChange={handleChange}
                                        disabled={submitting}
                                    />
                                    <span className="checkmark"></span>
                                    <i className="bi bi-box-seam"></i> Delivery Available
                                </label>
                            </div>
                            {formData.deliveryAvailable && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Delivery Radius (km) <span className="required">*</span></label>
                                        <input
                                            type="number"
                                            name="deliveryRadius"
                                            value={formData.deliveryRadius}
                                            onChange={handleChange}
                                            placeholder="5"
                                            min="0"
                                            max="50"
                                            step="0.5"
                                            disabled={submitting}
                                            className={fieldErrors.deliveryRadius ? 'input-error' : undefined}
                                        />
                                        <small className="form-text text-muted">Maximum 50 km</small>
                                        <FieldError field="deliveryRadius" />
                                    </div>
                                    <div className="form-group">
                                        <label>Delivery Fee (USD) <span className="required">*</span></label>
                                        <input
                                            type="number"
                                            name="deliveryFee"
                                            value={formData.deliveryFee}
                                            onChange={handleChange}
                                            placeholder="10"
                                            min="0"
                                            max="20"
                                            step="0.5"
                                            disabled={submitting}
                                            className={fieldErrors.deliveryFee ? 'input-error' : undefined}
                                        />
                                        <FieldError field="deliveryFee" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Required Documents */}
                        <div className="form-section">
                            <h3><i className="bi bi-file-earmark-medical"></i> Required Documents</h3>
                            <p className="section-description">Please upload the following documents for verification (PDF, JPG, PNG, DOC - Max 10MB each)</p>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Business License <span className="required">*</span></label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="businessLicense"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileChange(e, 'businessLicense')}
                                            disabled={submitting}
                                            className="file-input"
                                        />
                                        <label htmlFor="businessLicense" className="file-upload-label">
                                            {documentPreviews.businessLicense ? (
                                                <img src={documentPreviews.businessLicense} alt="Business License preview" className="file-preview-thumb" />
                                            ) : (
                                                <i className="bi bi-cloud-upload"></i>
                                            )}
                                            <span>{documents.businessLicense ? documents.businessLicense.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.businessLicense && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('businessLicense')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                    <FieldError field="businessLicense" />
                                </div>
                                <div className="form-group">
                                    <label>Pharmacy License (GPP) <span className="required">*</span></label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="pharmacyLicense"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileChange(e, 'pharmacyLicense')}
                                            disabled={submitting}
                                            className="file-input"
                                        />
                                        <label htmlFor="pharmacyLicense" className="file-upload-label">
                                            {documentPreviews.pharmacyLicense ? (
                                                <img src={documentPreviews.pharmacyLicense} alt="Pharmacy License preview" className="file-preview-thumb" />
                                            ) : (
                                                <i className="bi bi-cloud-upload"></i>
                                            )}
                                            <span>{documents.pharmacyLicense ? documents.pharmacyLicense.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.pharmacyLicense && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('pharmacyLicense')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                    <FieldError field="pharmacyLicense" />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Owner ID Card / Passport <span className="required">*</span></label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="ownerIdCard"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileChange(e, 'ownerIdCard')}
                                            disabled={submitting}
                                            className="file-input"
                                        />
                                        <label htmlFor="ownerIdCard" className="file-upload-label">
                                            {documentPreviews.ownerIdCard ? (
                                                <img src={documentPreviews.ownerIdCard} alt="Owner ID Card preview" className="file-preview-thumb" />
                                            ) : (
                                                <i className="bi bi-cloud-upload"></i>
                                            )}
                                            <span>{documents.ownerIdCard ? documents.ownerIdCard.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.ownerIdCard && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('ownerIdCard')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                    <FieldError field="ownerIdCard" />
                                </div>
                                <div className="form-group">
                                    <label>Other Documents (Optional)</label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            id="otherDocuments"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={handleMultipleFileChange}
                                            disabled={submitting}
                                            className="file-input"
                                            multiple
                                        />
                                        <label htmlFor="otherDocuments" className="file-upload-label">
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>Add more documents...</span>
                                        </label>
                                    </div>
                                    {documents.otherDocuments.length > 0 && (
                                        <div className="uploaded-files-list">
                                            {documents.otherDocuments.map((file, index) => (
                                                <div key={index} className="uploaded-file-item">
                                                    {otherDocumentPreviews[index] ? (
                                                        <img src={otherDocumentPreviews[index]} alt={`${file.name} preview`} className="file-preview-thumb-sm" />
                                                    ) : (
                                                        <i className="bi bi-file-earmark"></i>
                                                    )}
                                                    <span>{file.name}</span>
                                                    <button type="button" onClick={() => removeFile('otherDocuments', index)}>
                                                        <i className="bi bi-x"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="form-section">
                            <h3><i className="bi bi-card-text"></i> Description</h3>
                            <div className="form-group full-width">
                                <label>About Your Pharmacy</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Tell customers about your pharmacy, services, and specialties..."
                                    rows="4"
                                    disabled={submitting}
                                />
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
                        <h5>Your pharmacy registration has been submitted!</h5>
                        <p>
                            Thank you for registering with HealthLink. Our admin team will carefully review
                            your application and verify your pharmacy license.
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
                className="pharmacy-terms-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-file-earmark-text"></i> Terms and Conditions
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pharmacy-terms-modal-body">
                    <div className="pharmacy-terms-content">
                        <h4>HealthLink Pharmacy Partner Agreement</h4>
                        <p className="pharmacy-terms-intro">
                            By registering as a pharmacy partner on the HealthLink platform, you agree to the following terms and conditions:
                        </p>

                        <div className="pharmacy-terms-section-item">
                            <h5><i className="bi bi-1-circle"></i> Legal Compliance</h5>
                            <ul>
                                <li>You confirm that your pharmacy is legally registered and licensed to operate.</li>
                                <li>You hold a valid Good Pharmacy Practice (GPP) certificate.</li>
                                <li>You comply with all applicable pharmaceutical laws and regulations.</li>
                                <li>You will notify HealthLink immediately of any changes to your licensing status.</li>
                            </ul>
                        </div>

                        <div className="pharmacy-terms-section-item">
                            <h5><i className="bi bi-2-circle"></i> Product Quality and Safety</h5>
                            <ul>
                                <li>You guarantee that all medications sold are authentic and sourced from authorized distributors.</li>
                                <li>You maintain proper storage conditions for all pharmaceutical products.</li>
                                <li>You will not sell expired, counterfeit, or prohibited medications.</li>
                                <li>You follow proper handling and disposal procedures for medications.</li>
                            </ul>
                        </div>

                        <div className="pharmacy-terms-section-item">
                            <h5><i className="bi bi-3-circle"></i> Prescription Handling</h5>
                            <ul>
                                <li>You will verify all prescriptions before dispensing prescription medications.</li>
                                <li>You maintain confidentiality of all prescription information.</li>
                                <li>You will not dispense prescription medications without valid prescriptions.</li>
                                <li>You provide proper medication counseling to customers.</li>
                            </ul>
                        </div>

                        <div className="pharmacy-terms-section-item">
                            <h5><i className="bi bi-4-circle"></i> Platform Usage</h5>
                            <ul>
                                <li>You will maintain accurate inventory and pricing information.</li>
                                <li>You will fulfill orders promptly and maintain professional service standards.</li>
                                <li>You agree not to share your account credentials with unauthorized persons.</li>
                                <li>You will respond to customer inquiries in a timely and professional manner.</li>
                            </ul>
                        </div>

                        <div className="pharmacy-terms-section-item">
                            <h5><i className="bi bi-5-circle"></i> Data Privacy</h5>
                            <ul>
                                <li>You will protect all customer and patient data in compliance with privacy laws.</li>
                                <li>You will not share customer information with third parties without consent.</li>
                                <li>You consent to HealthLink storing your business information for verification purposes.</li>
                            </ul>
                        </div>

                        <div className="pharmacy-terms-section-item">
                            <h5><i className="bi bi-6-circle"></i> Account Termination</h5>
                            <ul>
                                <li>HealthLink reserves the right to suspend accounts that violate these terms.</li>
                                <li>You may request account deletion by contacting support.</li>
                                <li>Upon termination, you must fulfill all pending orders appropriately.</li>
                            </ul>
                        </div>

                        <div className="pharmacy-terms-footer-note">
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
                type="pharmacy"
            />
        </>
    );
}

export default PharmacyRegistration;
