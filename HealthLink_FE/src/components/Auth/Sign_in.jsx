import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { decodeToken } from '../../utils/tokenUtils';
import { Modal, Button } from 'react-bootstrap';
import Loading from '../Loading'; // Import Loading component
import '../Css/Sign_in.css';

export function Sign_in() {
    const navigate = useNavigate();
    const { login, token, roles } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true); // Initial page loading
    const [submitting, setSubmitting] = useState(false); // Form submission loading
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState('');

    // Custom validation states
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    // Initial loading effect (giống Home.jsx)
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    // Custom validation functions
    const validateEmail = (value) => {
        if (!value) {
            return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
        }
        return '';
    };

    const validatePassword = (value) => {
        if (!value) {
            return 'Password is required';
        }
        if (value.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return '';
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (emailTouched) {
            setEmailError(validateEmail(value));
        }
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (passwordTouched) {
            setPasswordError(validatePassword(value));
        }
    };

    const handleEmailBlur = () => {
        setEmailTouched(true);
        setEmailError(validateEmail(email));
    };

    const handlePasswordBlur = () => {
        setPasswordTouched(true);
        setPasswordError(validatePassword(password));
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
        setErrorModalMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Trigger validation
        const emailErr = validateEmail(email);
        const passwordErr = validatePassword(password);

        setEmailError(emailErr);
        setPasswordError(passwordErr);
        setEmailTouched(true);
        setPasswordTouched(true);

        // Stop if validation fails
        if (emailErr || passwordErr) {
            return;
        }

        setSubmitting(true);

        try {
            const success = await login(email, password);
            if (success) {
                // Get token and decode to extract roles
                const token = localStorage.getItem('token');
                const decoded = decodeToken(token);

                // Extract roles from token
                let userRoles = [];
                const roleClaimType = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
                if (decoded?.[roleClaimType]) {
                    const roleValue = decoded[roleClaimType];
                    userRoles = Array.isArray(roleValue) ? roleValue : [roleValue];
                } else if (decoded?.role) {
                    const roleValue = decoded.role;
                    userRoles = Array.isArray(roleValue) ? roleValue : [roleValue];
                }

                // Navigate based on role (priority: Admin > Doctor > Patient)
                if (userRoles.some(r => r.toLowerCase() === 'admin')) {
                    navigate('/admin');
                } else if (userRoles.some(r => r.toLowerCase() === 'doctor')) {
                    navigate('/doctor-page');
                } else {
                    navigate('/');
                }
            } else {
                setError('Invalid email or password');
            }
        } catch (err) {
            const errorMessage = err.message || 'Login failed';

            // Check if error is related to account status or email confirmation
            const statusErrors = [
                'inactive',
                'suspended',
                'banned',
                'not active',
                'admin approval',
                'contact support',
                'confirm your email',
                'email address before logging in'
            ];

            const isStatusError = statusErrors.some(keyword =>
                errorMessage.toLowerCase().includes(keyword)
            );

            if (isStatusError) {
                setErrorModalMessage(errorMessage);
                setShowErrorModal(true);
            } else {
                setError(errorMessage);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Redirect if already logged in with valid token
    useEffect(() => {
        if (token && roles && roles.length > 0) {
            if (roles.some(r => String(r).trim().toLowerCase() === 'admin')) {
                navigate('/admin', { replace: true });
            } else if (roles.some(r => String(r).trim().toLowerCase() === 'doctor')) {
                navigate('/doctor-page', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    }, [token, roles, navigate]);

    // Hiển thị Loading component khi initial load
    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <div className='Background_Sign_In'>
                <div className='signin-container container'>
                    <h2>Login</h2>
                    {error && <div className='error-message'><i className="bi bi-exclamation-circle"></i>{error}</div>}
                    <form onSubmit={handleSubmit} noValidate>
                        <div>
                            <label>Email:</label>
                            <input
                                type="email"
                                className={`signin-input ${emailTouched ? (emailError ? 'invalid' : 'valid') : ''}`}
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={handleEmailBlur}
                                disabled={submitting}
                            />
                            {emailTouched && emailError && (
                                <div className='validation-message error'>
                                    <i className="bi bi-x-circle"></i>
                                    {emailError}
                                </div>
                            )}
                        </div>
                        <div>
                            <label>Password:</label>
                            <input
                                type="password"
                                className={`signin-input ${passwordTouched ? (passwordError ? 'invalid' : 'valid') : ''}`}
                                value={password}
                                onChange={handlePasswordChange}
                                onBlur={handlePasswordBlur}
                                disabled={submitting}
                            />
                            {passwordTouched && passwordError && (
                                <div className='validation-message error'>
                                    <i className="bi bi-x-circle"></i>
                                    {passwordError}
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={submitting} className='signin-button'>
                            {submitting ? 'Loading...' : 'Login'}
                        </button>
                    </form>
                    <p>
                        Don't have an account? <Link to="/register">Register</Link>
                    </p>
                </div>
            </div>

            {/* Error Modal */}
            <Modal
                show={showErrorModal}
                onHide={handleCloseErrorModal}
                backdrop="static"
                keyboard={false}
                centered
                size="lg"
                style={{padding:"230px"}}
            >
                <Modal.Header closeButton className='modal-error-header'>
                    <Modal.Title className='modal-error-title'>
                        <i className="bi bi-info-circle-fill"></i>
                        <div className='modal-title-text'>
                            Account Access Notice
                        </div>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className='modal-error-body'>
                    <div className='modal-error-content'>
                        <i className="bi bi-person-lock modal-error-icon"></i>
                        <h5 className='modal-error-heading'>
                            Unable to Access Your Account
                        </h5>
                        <p className='modal-error-message'>
                            {errorModalMessage}
                        </p>
                    </div>
                    <div className='modal-support-text'>
                        <i className="bi bi-envelope"></i> Please contact our support team if you need assistance
                    </div>
                </Modal.Body>
                <Modal.Footer className='modal-error-footer'>
                    <Button
                        onClick={handleCloseErrorModal}
                        size="lg"
                        className='modal-error-button'
                    >
                        <i className="bi bi-check-circle me-2"></i>
                        I Understand
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default Sign_in;