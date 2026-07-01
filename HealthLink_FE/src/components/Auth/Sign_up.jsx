import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Modal, Button } from 'react-bootstrap';
import Loading from '../Loading'; // Import Loading component
import '../Css/Sign_up.css';

export function Sign_up() {
    const navigate = useNavigate();
    const location = useLocation();
    const fromAuth = location.state?.fromAuth || false;
    const { register, token, roles } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phonenumber, setPhonenumber] = useState('');
    const [DateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [preferredLanguage, setPreferredLanguage] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(!fromAuth); // Initial page loading if not from auth
    const [submitting, setSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const role = "Patient";

    // Initial loading effect
    useEffect(() => {
        if (!fromAuth) {
            const timer = setTimeout(() => {
                setLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [fromAuth]);

    // Password validation checks
    const passwordRequirements = {
        minLength: password.length >= 6,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[^a-zA-Z0-9\s]/.test(password),
        hasMatch: password === confirmPassword && password.length > 0,
        notSameAsEmail: password.toLowerCase() !== email.toLowerCase() && password.length > 0,
        notSameAsUsername: password.toLowerCase() !== username.toLowerCase() && password.length > 0
    };

    // Redirect if already logged in with valid token
    useEffect(() => {
        if (token && roles && roles.length > 0) {
            // Navigate based on role
            if (roles.some(r => String(r).trim().toLowerCase() === 'admin')) {
                navigate('/admin', { replace: true });
            } else if (roles.some(r => String(r).trim().toLowerCase() === 'doctor')) {
                navigate('/doctor', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    }, [token, roles, navigate]);

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        // Reset form
        setUsername('');
        setEmail('');
        setPhonenumber('');
        setDateOfBirth('');
        setGender('');
        setHeightCm('');
        setWeightKg('');
        setPreferredLanguage('');
        setPassword('');
        setConfirmPassword('');
        // quay về trang login
        navigate('/login');
    };

    // Countdown and auto redirect to login page after 10 seconds
    useEffect(() => {
        let timer;
        if (showSuccessModal) {
            setCountdown(10);
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleCloseSuccessModal();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [showSuccessModal]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username && !email && !phonenumber && !password && !confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (username.length < 2) {
            setError('Username must be at least 2 characters');
            return;
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            setError('Invalid email format');
            return;
        }

        if (phonenumber.length < 8 || phonenumber.length > 15) {
            setError('Phone number must be between 8 and 15 digits');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (DateOfBirth) {
            const selectedDate = new Date(DateOfBirth);
            const today = new Date();
            if (selectedDate > today) {
                setError('Date of Birth cannot be in the future');
                return;
            }
        }

        setSubmitting(true);

        try {
            await register(
                username, phonenumber, email, password,
                role,
                DateOfBirth || null,
                gender || null,
                heightCm ? parseFloat(heightCm) : null,
                weightKg ? parseFloat(weightKg) : null,
                preferredLanguage || null
            );
            setShowSuccessModal(true);
        } catch (err) {
            setError(err.message || 'Registration failed');
            console.log(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Hiển thị Loading component khi initial load
    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <div className='Background_Sign_Up'>
                <div className='signup-container container'>
                    <h2>Register</h2>
                    {error && (
                        <div className='error-message'>
                            <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '18px' }}></i>
                            <span>{error}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} noValidate>
                        {/* Row 1: Username + Email */}
                        <div className="form-row">
                            <div>
                                <label>
                                    User Name:
                                    <span className='tooltip-container'>
                                        <span style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold' }}>*</span>
                                        <div className='tooltip'>
                                            <div className='tooltip-arrow'></div>
                                            <div>
                                                <strong style={{ display: 'block', marginBottom: '6px' }}>Username Rules:</strong>
                                                <div className='requirement-item'>
                                                    <i className="bi bi-check-circle" style={{ color: '#00b09a' }}></i>
                                                    <span>Letters (A-Z, a-z)</span>
                                                </div>
                                                <div className='requirement-item'>
                                                    <i className="bi bi-check-circle" style={{ color: '#00b09a' }}></i>
                                                    <span>Numbers (0-9)</span>
                                                </div>
                                                <div className='requirement-item'>
                                                    <i className="bi bi-check-circle" style={{ color: '#00b09a' }}></i>
                                                    <span>Spaces allowed</span>
                                                </div>
                                                <div className='requirement-item'>
                                                    <i className="bi bi-x-circle" style={{ color: '#dc3545' }}></i>
                                                    <span>No special characters</span>
                                                </div>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                />
                                {username.length > 0 && !/^[a-zA-Z0-9 ]+$/.test(username) && (
                                    <div style={{
                                        color: '#dc3545',
                                        fontSize: '12px',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <i className="bi bi-exclamation-circle"></i>
                                        <span>Only letters, numbers, and spaces allowed</span>
                                    </div>
                                )}
                                {username.length > 0 && /^[a-zA-Z0-9 ]+$/.test(username) && (
                                    <div style={{
                                        color: '#4caf50',
                                        fontSize: '12px',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <i className="bi bi-check-circle-fill"></i>
                                        <span>Valid username</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label>
                                    Email:
                                    <span className='tooltip-container'>
                                        <span style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold' }}>*</span>
                                        <div className='tooltip'>
                                            <div className='tooltip-arrow'></div>
                                            <div>
                                                <strong style={{ display: 'block', marginBottom: '6px' }}>Email Requirements:</strong>
                                                <span style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                                    Please provide a valid email address.
                                                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                                        <li>Must be in format: <code style={{ backgroundColor: '#f0f0f0', padding: '2px 4px', borderRadius: '3px' }}>user@domain.com</code></li>
                                                        <li>Used for account verification</li>
                                                        <li>Used for important notifications</li>
                                                        <li>Used for password recovery</li>
                                                    </ul>
                                                    {email.length > 0 && (
                                                        <div style={{
                                                            marginTop: '8px',
                                                            fontSize: '11px',
                                                            color: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '#4caf50' : '#dc3545'
                                                        }}>
                                                            Format: {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Valid ✓' : 'Invalid ✗'}
                                                        </div>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                />
                                {email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                                    <div style={{
                                        color: '#dc3545',
                                        fontSize: '12px',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <i className="bi bi-exclamation-circle"></i>
                                        <span>Please enter a valid email format (e.g., user@domain.com)</span>
                                    </div>
                                )}
                                {email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                                    <div style={{
                                        color: '#4caf50',
                                        fontSize: '12px',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <i className="bi bi-check-circle-fill"></i>
                                        <span>Valid email format</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Phone + Date of Birth */}
                        <div className='form-row'>
                            {/* Phone Number */}
                            <div>
                                <label>
                                    Phone Number:
                                    <span className='tooltip-container'>
                                        <span style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold' }}>*</span>
                                        <div className='tooltip'>
                                            <div className='tooltip-arrow'></div>
                                            <div>
                                                <strong style={{ display: 'block', marginBottom: '6px', color: '#ffc107' }}>⚠️ Important:</strong>
                                                <span style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                                    Please provide a real, active phone number.
                                                    <div className='form-row'>
                                                        <div>• <strong>Length:</strong> 6-20 digits</div>
                                                        <div>• Appointment reminders</div>
                                                        <div>• <strong>Format:</strong> Numbers only</div>
                                                        <div>• Emergency contact</div>
                                                        <div></div>
                                                        <div>• Account verification</div>
                                                    </div>
                                                    {phonenumber.length > 0 && (
                                                        <div style={{
                                                            marginTop: '8px',
                                                            fontSize: '11px',
                                                            color: phonenumber.length >= 8 && phonenumber.length <= 15 ? '#4caf50' : '#dc3545'
                                                        }}>
                                                            Current: {phonenumber.length} digits
                                                            {phonenumber.length >= 8 && phonenumber.length <= 15 ? ' ✓' : ' ✗'}
                                                        </div>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={phonenumber}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                        setPhonenumber(value);
                                    }}
                                    disabled={submitting}
                                    className='signup-input'
                                />
                                {phonenumber.length > 0 && (phonenumber.length < 8 || phonenumber.length > 15) && (
                                    <div style={{
                                        color: '#dc3545', fontSize: '12px', marginTop: '4px',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <i className="bi bi-exclamation-circle"></i>
                                        <span>Phone number must be 8-15 digits (Current: {phonenumber.length})</span>
                                    </div>
                                )}
                                {phonenumber.length >= 8 && phonenumber.length <= 15 && (
                                    <div style={{
                                        color: '#4caf50', fontSize: '12px', marginTop: '4px',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        <i className="bi bi-check-circle-fill"></i>
                                        <span>Valid phone number ({phonenumber.length} digits)</span>
                                    </div>
                                )}
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label>Date of Birth: <small className="text-muted">(Optional)</small></label>
                                <input
                                    type="date"
                                    value={DateOfBirth}
                                    max={new Date().toISOString().split("T")[0]}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                />
                            </div>
                        </div>

                        {/* Row 3: Optional Health Info */}
                        <div className='form-row'>
                            <div>
                                <label>Gender: <small className="text-muted">(Optional)</small></label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label>Preferred Language: <small className="text-muted">(Optional)</small></label>
                                <select
                                    value={preferredLanguage}
                                    onChange={(e) => setPreferredLanguage(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                >
                                    <option value="">Select Language</option>
                                    <option value="Vietnamese">Vietnamese</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 4: Height + Weight */}
                        <div className='form-row'>
                            <div>
                                <label>Height (cm): <small className="text-muted">(Optional)</small></label>
                                <input
                                    type="number"
                                    min="50" max="250"
                                    value={heightCm}
                                    onChange={(e) => setHeightCm(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                    placeholder="e.g. 170"
                                />
                            </div>
                            <div>
                                <label>Weight (kg): <small className="text-muted">(Optional)</small></label>
                                <input
                                    type="number"
                                    min="10" max="300"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                    placeholder="e.g. 65"
                                />
                            </div>
                        </div>

                        {/* Row 3: Password + Confirm Password */}
                        <div className='form-row'>
                            <div>
                                <label>
                                    Password:
                                    <span className='tooltip-container'>
                                        <span style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold' }}>*</span>
                                        <div className='tooltip'>
                                            <div className='tooltip-arrow'></div>
                                            <strong style={{ display: 'block', marginBottom: '8px' }}>Password Requirements:</strong>

                                            <div className='requirement-item'>
                                                <i className={`bi bi-${passwordRequirements.minLength ? 'check-circle-fill' : 'circle'}`}
                                                    style={{ color: passwordRequirements.minLength ? '#4caf50' : '#ccc' }}></i>
                                                <span>At least 6 characters</span>
                                            </div>

                                            <div className='requirement-item'>
                                                <i className={`bi bi-${passwordRequirements.hasUppercase ? 'check-circle-fill' : 'circle'}`}
                                                    style={{ color: passwordRequirements.hasUppercase ? '#4caf50' : '#ccc' }}></i>
                                                <span>Uppercase letter (A-Z)</span>
                                            </div>

                                            <div className='requirement-item'>
                                                <i className={`bi bi-${passwordRequirements.hasLowercase ? 'check-circle-fill' : 'circle'}`}
                                                    style={{ color: passwordRequirements.hasLowercase ? '#4caf50' : '#ccc' }}></i>
                                                <span>Lowercase letter (a-z)</span>
                                            </div>

                                            <div className='requirement-item'>
                                                <i className={`bi bi-${passwordRequirements.hasNumber ? 'check-circle-fill' : 'circle'}`}
                                                    style={{ color: passwordRequirements.hasNumber ? '#4caf50' : '#ccc' }}></i>
                                                <span>Number (0-9)</span>
                                            </div>

                                            <div className='requirement-item'>
                                                <i className={`bi bi-${passwordRequirements.hasSpecialChar ? 'check-circle-fill' : 'circle'}`}
                                                    style={{ color: passwordRequirements.hasSpecialChar ? '#4caf50' : '#ccc' }}></i>
                                                <span>Special character (!@#$%...)</span>
                                            </div>

                                            <div className='requirement-item'>
                                                <i className={`bi bi-${passwordRequirements.hasMatch ? 'check-circle-fill' : 'circle'}`}
                                                    style={{ color: passwordRequirements.hasMatch ? '#4caf50' : '#ccc' }}></i>
                                                <span>Passwords match</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={submitting}
                                    className='signup-input'
                                />
                                {password.length > 0 && (
                                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                        {!passwordRequirements.minLength && (
                                            <div style={{ color: '#dc3545', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <i className="bi bi-x-circle"></i>
                                                <span>At least 6 characters required</span>
                                            </div>
                                        )}
                                        {!passwordRequirements.hasUppercase && (
                                            <div style={{ color: '#dc3545', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <i className="bi bi-x-circle"></i>
                                                <span>Needs uppercase letter (A-Z)</span>
                                            </div>
                                        )}
                                        {!passwordRequirements.hasLowercase && (
                                            <div style={{ color: '#dc3545', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <i className="bi bi-x-circle"></i>
                                                <span>Needs lowercase letter (a-z)</span>
                                            </div>
                                        )}
                                        {!passwordRequirements.hasNumber && (
                                            <div style={{ color: '#dc3545', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <i className="bi bi-x-circle"></i>
                                                <span>Needs number (0-9)</span>
                                            </div>
                                        )}
                                        {!passwordRequirements.hasSpecialChar && (
                                            <div style={{ color: '#dc3545', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <i className="bi bi-x-circle"></i>
                                                <span>Needs special character</span>
                                            </div>
                                        )}
                                        {passwordRequirements.minLength && passwordRequirements.hasUppercase &&
                                            passwordRequirements.hasLowercase && passwordRequirements.hasNumber &&
                                            passwordRequirements.hasSpecialChar && (
                                                <div style={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="bi bi-check-circle-fill"></i>
                                                    <span>Strong password ✓</span>
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div>
                                    <label>
                                        Confirm Password:
                                        <span className='tooltip-container'>
                                            <span style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold' }}>*</span>
                                            <div className='tooltip'>
                                                <div className='tooltip-arrow'></div>
                                                <strong style={{ display: 'block', marginBottom: '8px' }}>Confirm Password:</strong>

                                                {confirmPassword.length > 0 && (
                                                    <div className='requirement-item'>
                                                        <i className={`bi bi-${passwordRequirements.hasMatch ? 'check-circle-fill' : 'x-circle-fill'}`}
                                                            style={{ color: passwordRequirements.hasMatch ? '#4caf50' : '#dc3545' }}></i>
                                                        <span style={{ color: passwordRequirements.hasMatch ? '#4caf50' : '#dc3545' }}>
                                                            {passwordRequirements.hasMatch ? 'Passwords match ✓' : 'Passwords do not match ✗'}
                                                        </span>
                                                    </div>
                                                )}

                                                {confirmPassword.length === 0 && (
                                                    <span style={{ fontSize: '13px', color: '#ccc' }}>
                                                        Please re-enter your password to confirm
                                                    </span>
                                                )}
                                            </div>
                                        </span>
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={submitting}
                                        className='signup-input'
                                    />
                                    {confirmPassword.length > 0 && !passwordRequirements.hasMatch && (
                                        <div style={{
                                            color: '#dc3545',
                                            fontSize: '12px',
                                            marginTop: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <i className="bi bi-x-circle"></i>
                                            <span>Passwords do not match</span>
                                        </div>
                                    )}
                                    {confirmPassword.length > 0 && passwordRequirements.hasMatch && (
                                        <div style={{
                                            color: '#4caf50',
                                            fontSize: '12px',
                                            marginTop: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <i className="bi bi-check-circle-fill"></i>
                                            <span>Passwords match ✓</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* button */}
                        <button type="submit" disabled={submitting} className='signup-button'>
                            {submitting ? 'Loading...' : 'Register'}
                        </button>
                    </form>
                    <p style={{ marginTop: '10px' }}>
                        Already have an account? <Link to="/login" state={{ fromAuth: true }}>Login</Link>
                    </p>
                </div >
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
                <Modal.Header
                    closeButton
                    className="modal-success-header"
                    style={{
                        backgroundColor: '#f8f9fa'
                    }}
                >
                    <Modal.Title className="modal-success-title">
                        <i className="bi bi-info-circle-fill"></i>
                        <div className="modal-title-text">
                            Registration Successful
                        </div>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="modal-success-body">
                    <div className="modal-success-content">
                        <i className="bi bi-person-check modal-success-icon"></i>
                        <h5 className="modal-success-heading">
                            Account Created Successfully
                        </h5>
                        <p className="modal-success-message">
                            Your account has been created. An activation email has been sent to your registered email. Please confirm to log in.
                        </p>
                        <p className="redirect-countdown-text" style={{ color: '#00b09a', fontWeight: '500', marginTop: '15px', fontSize: '15px' }}>
                            <i className="bi bi-clock-history"></i> Automatically redirecting to login page in {countdown} seconds...
                        </p>
                    </div>
                    <div className="modal-support-text">
                        <i className="bi bi-envelope"></i> Please contact our support team if you need assistance
                    </div>
                </Modal.Body>
                <Modal.Footer className="modal-success-footer">
                    <Button
                        onClick={handleCloseSuccessModal}
                        size="lg"
                        className="modal-success-button"
                    >
                        <i className="bi bi-check-circle"></i>
                        I Understand ({countdown}s)
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default Sign_up;