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
        pharmacyName: '',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.pharmacyName || !formData.email || !formData.phoneNumber) {
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

        setSubmitting(true);

        try {
            const submitData = {
                ...formData,
                deliveryRadius: parseFloat(formData.deliveryRadius) || null,
                deliveryFee: parseFloat(formData.deliveryFee) || null
            };

            await registrationService.submitPharmacyRegistration(submitData);
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
            <div className="pharmacy-registration-bg" style={{paddingTop:"15%"}}>
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
                        {/* Basic Information */}
                        <div className="form-section">
                            <h3><i className="bi bi-shop"></i> Basic Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Pharmacy Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="pharmacyName"
                                        value={formData.pharmacyName}
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
                        <h5>Your pharmacy registration has been submitted!</h5>
                        <p>
                            Our admin team will review your application and verify your license.
                            Once approved, you will receive an email with your login credentials.
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

export default PharmacyRegistration;
