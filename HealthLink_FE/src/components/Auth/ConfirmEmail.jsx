import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Css/confirmemail.css';

const API_URL = 'http://localhost:8096/api/auth';

/**
 * Trang xác nhận email sau đăng ký.
 * User click link trong email → /confirm-email?token=xxx
 * Route: /confirm-email
 */
export default function ConfirmEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');
    const hasCalledAPI = React.useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid confirmation link. No token provided.');
            return;
        }

        if (hasCalledAPI.current) return;
        hasCalledAPI.current = true;

        // Gọi API xác nhận email
        axios.get(`${API_URL}/confirm-email`, { params: { token } })
            .then(() => {
                setStatus('success');
                setMessage('Your email has been confirmed successfully!');
            })
            .catch((err) => {
                setStatus('error');
                const msg = err.response?.data?.message || 'The confirmation link is invalid or has expired.';
                setMessage(msg);
            });
    }, [token]);

    return (
        <div className="confirm-email-container">
            <div className="confirm-email-card">
                {status === 'loading' && (
                    <>
                        <div className="spinner-border text-success mb-3" role="status"></div>
                        <h2 className="confirm-email-title">Verifying your email...</h2>
                        <p className="confirm-email-subtitle">Please wait a moment.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                        <h2 className="confirm-email-title" style={{ color: '#00b09a' }}>Email Confirmed!</h2>
                        <p className="confirm-email-subtitle">{message}</p>
                        <p className="confirm-email-subtitle">You can now log in to your account.</p>
                        <Link to="/login" className="confirm-email-btn">Go to Login</Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>❌</div>
                        <h2 className="confirm-email-title" style={{ color: '#c62828' }}>Confirmation Failed</h2>
                        <p className="confirm-email-subtitle">{message}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                            <Link to="/sign_up" className="confirm-email-btn">Register Again</Link>
                            <Link to="/login" className="confirm-email-btn" style={{ background: '#666' }}>Back to Login</Link>
                        </div>
                    </>
                )}

                <div className="confirm-email-footer">
                    <Link to="/" className="confirm-email-link">← Return to Home</Link>
                </div>
            </div>
        </div>
    );
}
