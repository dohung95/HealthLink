import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../../api/auth';

/**
 * Trang đặt lại mật khẩu — người dùng nhập mật khẩu mới sau khi click link trong email.
 * URL nhận token qua query param: /reset-password?token=xxxxx
 * Route: /reset-password
 */
export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Nếu không có token trong URL thì báo lỗi ngay
    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token. Please request a new reset link.');
        }
    }, [token]);

    const validate = () => {
        if (!newPassword) return 'Please enter a new password.';
        if (newPassword.length < 6) return 'Password must be at least 6 characters.';
        if (newPassword !== confirmPassword) return 'Passwords do not match.';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) { setError(validationError); return; }
        setError('');

        setLoading(true);
        try {
            await resetPassword(token, newPassword);
            setSuccess(true);
            // Tự chuyển về trang login sau 3 giây
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.message || 'Failed to reset password. The link may be expired or invalid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.iconWrap}>
                    <i className="bi bi-lock-fill" style={{ fontSize: '2rem', color: '#00b09a' }}></i>
                </div>
                <h2 style={styles.title}>Set New Password</h2>

                {success ? (
                    <div style={styles.successBox}>
                        <i className="bi bi-check-circle-fill" style={{ fontSize: '2.5rem', color: '#00b09a' }}></i>
                        <p style={{ marginTop: '16px', fontWeight: 600 }}>Password reset successfully!</p>
                        <p style={{ color: '#555', fontSize: '0.95rem' }}>
                            Redirecting to login page in a moment...
                        </p>
                        <Link to="/login" style={styles.link}>Go to Login now</Link>
                    </div>
                ) : (
                    <>
                        <p style={styles.subtitle}>Enter your new password below.</p>

                        {error && (
                            <div style={styles.errorBox}>
                                <i className="bi bi-exclamation-circle me-2"></i>{error}
                            </div>
                        )}

                        {!error.includes('Invalid or missing') && (
                            <form onSubmit={handleSubmit}>
                                <div style={styles.fieldWrap}>
                                    <label style={styles.label}>New Password</label>
                                    <div style={styles.inputWrap}>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="At least 6 characters"
                                            style={styles.input}
                                            disabled={loading}
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            style={styles.eyeBtn}
                                            onClick={() => setShowPass(!showPass)}
                                        >
                                            <i className={`bi bi-eye${showPass ? '-slash' : ''}`}></i>
                                        </button>
                                    </div>
                                </div>

                                <div style={styles.fieldWrap}>
                                    <label style={styles.label}>Confirm Password</label>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your password"
                                        style={styles.input}
                                        disabled={loading}
                                    />
                                </div>

                                <button type="submit" style={styles.btn} disabled={loading || !token}>
                                    {loading
                                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Resetting...</>
                                        : 'Reset Password'}
                                </button>
                            </form>
                        )}

                        <div style={styles.footer}>
                            <Link to="/forgot-password" style={styles.link}>
                                Request a new reset link
                            </Link>
                            {' · '}
                            <Link to="/login" style={styles.link}>Back to Login</Link>
                        </div>
                    </>
                )}
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
        maxWidth: '440px',
        textAlign: 'center',
    },
    iconWrap: { marginBottom: '12px' },
    title: { fontSize: '1.6rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' },
    subtitle: { color: '#666', fontSize: '0.95rem', marginBottom: '24px' },
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
    fieldWrap: { textAlign: 'left', marginBottom: '18px' },
    label: { display: 'block', fontWeight: 600, color: '#333', marginBottom: '6px', fontSize: '0.9rem' },
    inputWrap: { position: 'relative' },
    input: {
        width: '100%',
        padding: '10px 40px 10px 14px',
        border: '1.5px solid #ddd',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        boxSizing: 'border-box',
    },
    eyeBtn: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#888',
        padding: '0',
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
    successBox: { padding: '20px 0', color: '#1a1a2e' },
    footer: { marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px', fontSize: '0.9rem' },
    link: { color: '#00b09a', fontWeight: 600, textDecoration: 'none' },
};
