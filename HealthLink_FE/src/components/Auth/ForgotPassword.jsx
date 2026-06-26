import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import './Css/forgotpassword.css';

/**
 * Trang quên mật khẩu — người dùng nhập email để nhận link reset.
 * Route: /forgot-password
 */
export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            await forgotPassword(email.trim());
            // Backend luôn trả 200 dù email không tồn tại → hiển thị thông báo chung
            setSent(true);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="forgot-password-icon-wrap">
                    <i className="bi bi-key-fill" style={{ fontSize: '2rem', color: '#00b09a' }}></i>
                </div>
                <h2 className="forgot-password-title">Forgot Password</h2>

                {!sent ? (
                    <>
                        <p className="forgot-password-subtitle">
                            Enter your registered email address and we'll send you a link to reset your password.
                        </p>

                        {error && (
                            <div className="forgot-password-error-box">
                                <i className="bi bi-exclamation-circle me-2"></i>{error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="forgot-password-field-wrap">
                                <label className="forgot-password-label">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="forgot-password-input"
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="forgot-password-btn" disabled={loading}>
                                {loading
                                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</>
                                    : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="forgot-password-success-box">
                        <i className="bi bi-envelope-check-fill" style={{ fontSize: '2.5rem', color: '#00b09a' }}></i>
                        <p style={{ marginTop: '16px', fontWeight: 600 }}>Check your inbox!</p>
                        <p style={{ color: '#555', fontSize: '0.95rem' }}>
                            If <strong>{email}</strong> is registered, a password reset link has been sent.
                            Please also check your spam folder.
                        </p>
                    </div>
                )}

                <div className="forgot-password-footer">
                    <Link to="/login" state={{ fromAuth: true }} className="forgot-password-link">
                        <i className="bi bi-arrow-left me-1"></i>Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
