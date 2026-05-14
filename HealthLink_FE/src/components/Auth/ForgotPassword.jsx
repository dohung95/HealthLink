import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';

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
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.iconWrap}>
                    <i className="bi bi-key-fill" style={{ fontSize: '2rem', color: '#00b09a' }}></i>
                </div>
                <h2 style={styles.title}>Forgot Password</h2>

                {!sent ? (
                    <>
                        <p style={styles.subtitle}>
                            Enter your registered email address and we'll send you a link to reset your password.
                        </p>

                        {error && (
                            <div style={styles.errorBox}>
                                <i className="bi bi-exclamation-circle me-2"></i>{error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={styles.fieldWrap}>
                                <label style={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    style={styles.input}
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>
                            <button type="submit" style={styles.btn} disabled={loading}>
                                {loading
                                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</>
                                    : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={styles.successBox}>
                        <i className="bi bi-envelope-check-fill" style={{ fontSize: '2.5rem', color: '#00b09a' }}></i>
                        <p style={{ marginTop: '16px', fontWeight: 600 }}>Check your inbox!</p>
                        <p style={{ color: '#555', fontSize: '0.95rem' }}>
                            If <strong>{email}</strong> is registered, a password reset link has been sent.
                            Please also check your spam folder.
                        </p>
                    </div>
                )}

                <div style={styles.footer}>
                    <Link to="/login" style={styles.link}>
                        <i className="bi bi-arrow-left me-1"></i>Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f7f4 0%, #f0fffe 100%)',
        padding: '20px',
    },
    card: {
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,176,154,0.12)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
    },
    iconWrap: {
        marginBottom: '12px',
    },
    title: {
        fontSize: '1.6rem',
        fontWeight: 700,
        color: '#1a1a2e',
        marginBottom: '8px',
    },
    subtitle: {
        color: '#666',
        fontSize: '0.95rem',
        marginBottom: '24px',
    },
    errorBox: {
        background: '#fff0f0',
        border: '1px solid #ffcdd2',
        borderRadius: '8px',
        color: '#c62828',
        padding: '10px 14px',
        marginBottom: '16px',
        fontSize: '0.9rem',
        textAlign: 'left',
    },
    fieldWrap: {
        textAlign: 'left',
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontWeight: 600,
        color: '#333',
        marginBottom: '6px',
        fontSize: '0.9rem',
    },
    input: {
        width: '100%',
        padding: '10px 14px',
        border: '1.5px solid #ddd',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border 0.2s',
    },
    btn: {
        width: '100%',
        padding: '12px',
        background: 'linear-gradient(135deg, #00b09a, #00d4b4)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successBox: {
        padding: '20px 0',
        color: '#1a1a2e',
    },
    footer: {
        marginTop: '24px',
        borderTop: '1px solid #eee',
        paddingTop: '16px',
    },
    link: {
        color: '#00b09a',
        fontWeight: 600,
        textDecoration: 'none',
        fontSize: '0.95rem',
    },
};
