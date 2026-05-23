import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import Loading from '../Loading';
import registrationService from '../../api/registrationApi';
import './Css/PharmacyRegistration.css';

export function PharmacyRegistration() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',  // Pharmacy name - consistent with Pharmacy entity
        email: '',
        phoneNumber: '',
        licenseNumber: '',
        address: '',
        city: '',
        district: '',
        ward: '',
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

    // Avatar state
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [uploadingFiles, setUploadingFiles] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                return;
            }
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
            otherDocuments: [...prev.otherDocuments, ...validFiles]
        }));
        setError('');
    };

    const removeFile = (documentType, index = null) => {
        if (index !== null) {
            setDocuments(prev => ({
                ...prev,
                otherDocuments: prev.otherDocuments.filter((_, i) => i !== index)
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

        // Validation
        if (!formData.name || !formData.email || !formData.phoneNumber) {
            setError('Please fill in all required fields');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!formData.licenseNumber || !formData.address) {
            setError('Please fill in license number and address');
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
                try {
                    await uploadDocuments(response.requestId);
                } catch (uploadErr) {
                    console.error('Error uploading documents:', uploadErr);
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
            <div className="pharmacy-registration-bg">
                <div className="pharmacy-registration-container">
                    <div className="form-header">
                        <Link to="/register-as" className="back-link">
                            <i className="bi bi-arrow-left"></i> Back
                        </Link>
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
                        {/* Profile Photo */}
                        <div className="form-section">
                            <h3><i className="bi bi-image"></i> Profile Photo</h3>
                            <p className="section-description">Upload your pharmacy's logo or storefront photo (Optional - JPG, PNG, WebP - Max 5MB)</p>
                            <div className="avatar-upload-wrapper">
                                <div className="avatar-preview">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar preview" />
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
                                    {avatar && (
                                        <button type="button" className="avatar-remove-btn" onClick={removeAvatar}>
                                            <i className="bi bi-trash"></i> Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="form-section">
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
                                    />
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
                                    />
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
                                    />
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
                                    />
                                </div>
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
                                />
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
                                        <label>Open Time</label>
                                        <input
                                            type="time"
                                            name="openTime"
                                            value={formData.openTime}
                                            onChange={handleChange}
                                            disabled={submitting}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Close Time</label>
                                        <input
                                            type="time"
                                            name="closeTime"
                                            value={formData.closeTime}
                                            onChange={handleChange}
                                            disabled={submitting}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Working Days</label>
                                <select
                                    name="workingDays"
                                    value={formData.workingDays}
                                    onChange={handleChange}
                                    disabled={submitting}
                                >
                                    <option value="Mon-Sun">Monday - Sunday (7 days)</option>
                                    <option value="Mon-Sat">Monday - Saturday (6 days)</option>
                                    <option value="Mon-Fri">Monday - Friday (5 days)</option>
                                </select>
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
                                        <label>Delivery Radius (km)</label>
                                        <input
                                            type="number"
                                            name="deliveryRadius"
                                            value={formData.deliveryRadius}
                                            onChange={handleChange}
                                            placeholder="5"
                                            min="0"
                                            step="0.5"
                                            disabled={submitting}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Delivery Fee (VND)</label>
                                        <input
                                            type="number"
                                            name="deliveryFee"
                                            value={formData.deliveryFee}
                                            onChange={handleChange}
                                            placeholder="20000"
                                            min="0"
                                            disabled={submitting}
                                        />
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
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>{documents.businessLicense ? documents.businessLicense.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.businessLicense && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('businessLicense')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
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
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>{documents.pharmacyLicense ? documents.pharmacyLicense.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.pharmacyLicense && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('pharmacyLicense')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
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
                                            <i className="bi bi-cloud-upload"></i>
                                            <span>{documents.ownerIdCard ? documents.ownerIdCard.name : 'Choose file...'}</span>
                                        </label>
                                        {documents.ownerIdCard && (
                                            <button type="button" className="file-remove-btn" onClick={() => removeFile('ownerIdCard')}>
                                                <i className="bi bi-x-circle"></i>
                                            </button>
                                        )}
                                    </div>
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
                                                    <i className="bi bi-file-earmark"></i>
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
                className="terms-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-file-earmark-text"></i> Terms and Conditions
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="terms-modal-body">
                    <div className="terms-content">
                        <h4>HealthLink Pharmacy Partner Agreement</h4>
                        <p className="terms-intro">
                            By registering as a pharmacy partner on the HealthLink platform, you agree to the following terms and conditions:
                        </p>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-1-circle"></i> Legal Compliance</h5>
                            <ul>
                                <li>You confirm that your pharmacy is legally registered and licensed to operate.</li>
                                <li>You hold a valid Good Pharmacy Practice (GPP) certificate.</li>
                                <li>You comply with all applicable pharmaceutical laws and regulations.</li>
                                <li>You will notify HealthLink immediately of any changes to your licensing status.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-2-circle"></i> Product Quality and Safety</h5>
                            <ul>
                                <li>You guarantee that all medications sold are authentic and sourced from authorized distributors.</li>
                                <li>You maintain proper storage conditions for all pharmaceutical products.</li>
                                <li>You will not sell expired, counterfeit, or prohibited medications.</li>
                                <li>You follow proper handling and disposal procedures for medications.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-3-circle"></i> Prescription Handling</h5>
                            <ul>
                                <li>You will verify all prescriptions before dispensing prescription medications.</li>
                                <li>You maintain confidentiality of all prescription information.</li>
                                <li>You will not dispense prescription medications without valid prescriptions.</li>
                                <li>You provide proper medication counseling to customers.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-4-circle"></i> Platform Usage</h5>
                            <ul>
                                <li>You will maintain accurate inventory and pricing information.</li>
                                <li>You will fulfill orders promptly and maintain professional service standards.</li>
                                <li>You agree not to share your account credentials with unauthorized persons.</li>
                                <li>You will respond to customer inquiries in a timely and professional manner.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-5-circle"></i> Data Privacy</h5>
                            <ul>
                                <li>You will protect all customer and patient data in compliance with privacy laws.</li>
                                <li>You will not share customer information with third parties without consent.</li>
                                <li>You consent to HealthLink storing your business information for verification purposes.</li>
                            </ul>
                        </div>

                        <div className="terms-section-item">
                            <h5><i className="bi bi-6-circle"></i> Account Termination</h5>
                            <ul>
                                <li>HealthLink reserves the right to suspend accounts that violate these terms.</li>
                                <li>You may request account deletion by contacting support.</li>
                                <li>Upon termination, you must fulfill all pending orders appropriately.</li>
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

export default PharmacyRegistration;
