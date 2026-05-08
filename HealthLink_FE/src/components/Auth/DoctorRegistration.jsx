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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.fullName || !formData.email || !formData.phoneNumber) {
            setError('Please fill in all required fields');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!formData.qualifications || !formData.specialtyId || !formData.languageSpoken || !formData.location) {
            setError('Please fill in all professional information');
            return;
        }

        setSubmitting(true);

        try {
            const submitData = {
                ...formData,
                specialtyId: parseInt(formData.specialtyId) || null,
                yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
                consultationFee: parseFloat(formData.consultationFee) || 0
            };

            await registrationService.submitDoctorRegistration(submitData);
            setShowSuccessModal(true);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || 'Registration failed. Please try again.';
            setError(typeof errorMsg === 'string' ? errorMsg : 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
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
            <div className="doctor-registration-bg" style={{paddingTop:"15%"}}>
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
                                    <label>Years of Experience</label>
                                    <input
                                        type="number"
                                        name="yearsOfExperience"
                                        value={formData.yearsOfExperience}
                                        onChange={handleChange}
                                        placeholder="5"
                                        min="0"
                                        disabled={submitting}
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
                                    <label>Consultation Fee (VND)</label>
                                    <input
                                        type="number"
                                        name="consultationFee"
                                        value={formData.consultationFee}
                                        onChange={handleChange}
                                        placeholder="200000"
                                        min="0"
                                        disabled={submitting}
                                    />
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

                        {/* Clinic Information */}
                        <div className="form-section">
                            <h3><i className="bi bi-hospital"></i> Clinic Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Clinic Name</label>
                                    <input
                                        type="text"
                                        name="clinicName"
                                        value={formData.clinicName}
                                        onChange={handleChange}
                                        placeholder="HealthLink Medical Center"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Clinic Address</label>
                                    <input
                                        type="text"
                                        name="clinicAddress"
                                        value={formData.clinicAddress}
                                        onChange={handleChange}
                                        placeholder="123 Main Street, District 1"
                                        disabled={submitting}
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

                        <button type="submit" className="submit-btn" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <span className="spinner"></span> Submitting...
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
                            Our admin team will review your application. Once approved, you will receive
                            an email with your login credentials.
                        </p>
                        <div className="info-box">
                            <i className="bi bi-info-circle"></i>
                            <span>Default password after approval: <strong>HealthLink@123</strong></span>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="modal-success-footer">
                    <Button onClick={handleCloseSuccessModal} className="modal-success-button">
                        <i className="bi bi-check-circle"></i> Understood
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default DoctorRegistration;
