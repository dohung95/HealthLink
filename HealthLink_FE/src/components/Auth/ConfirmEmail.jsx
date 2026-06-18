import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../Css/EmailConfirmation.css'; // Dùng CSS của giao diện xịn

const API_URL = 'http://localhost:8096/api/auth'; // Giữ lại đúng API_URL gốc của dự án

export default function ConfirmEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const hasCalledAPI = useRef(false);

    useEffect(() => {
        const confirmEmail = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid confirmation link. No token provided.');
                return;
            }

            if (hasCalledAPI.current) return;
            hasCalledAPI.current = true;

            try {
                // Gọi API theo đúng logic cũ: chỉ truyền token lên endpoint cũ
                const response = await axios.get(`${API_URL}/confirm-email`, {
                    params: { token }
                });

                setStatus('success');
                setMessage(response.data?.message || 'Email confirmed successfully! You can now log in to your account.');

                // Redirect to login after 30 seconds (đây là tính năng UX từ file mới)
                setTimeout(() => {
                    navigate('/login');
                }, 30000);
            } catch (error) {
                setStatus('error');
                if (error.response) {
                    setMessage(error.response.data?.message || error.response.data?.error || 'Email confirmation failed. The link may be invalid or expired.');
                } else {
                    setMessage('Network error. Please check your connection and try again.');
                }
                console.error('Email confirmation error:', error);
            }
        };

        confirmEmail();
    }, [token, navigate]);

    const handleGoToLogin = () => {
        navigate('/login');
    };

    const handleGoToHome = () => {
        navigate('/');
    };

    // Toàn bộ phần return bên dưới là copy nguyên vẹn cấu trúc UI và class CSS từ bản mới xịn sang
    return (
        <div className='email-confirmation-container'>
            <div className='email-confirm-card'>
                {status === 'loading' && (
                    <>
                        <div className='email-confirm-spinner-container'>
                            <div className='email-confirm-spinner'></div>
                        </div>
                        <h2>Verifying Your Email...</h2>
                        <p>Please wait while we confirm your email address.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className='email-confirm-icon-container success'>
                            <i className="bi bi-check-circle-fill"></i>
                        </div>
                        <h2>Email Verified Successfully!</h2>
                        <div className='email-confirm-message-box success'>
                            <p>{message}</p>
                        </div>
                        <div className='email-confirm-info-box'>
                            <i className="bi bi-info-circle"></i>
                            <span>Your account is now active. You will be redirected to login in 30 seconds...</span>
                        </div>
                        <div className='email-confirm-button-group'>
                            <button onClick={handleGoToLogin} className='email-confirm-btn-primary'>
                                <i className="bi bi-box-arrow-in-right"></i> Go to Login
                            </button>
                            <button onClick={handleGoToHome} className='email-confirm-btn-secondary'>
                                <i className="bi bi-house"></i> Back to Home
                            </button>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className='email-confirm-icon-container error'>
                            <i className="bi bi-x-circle-fill"></i>
                        </div>
                        <h2>Verification Failed</h2>
                        <div className='email-confirm-message-box error'>
                            <p>{message}</p>
                        </div>
                        <div className='email-confirm-help-section'>
                            <h4>What can you do?</h4>
                            <ul>
                                <li>
                                    <i className="bi bi-arrow-right-circle"></i>
                                    Check if you clicked the correct link from your email
                                </li>
                                <li>
                                    <i className="bi bi-arrow-right-circle"></i>
                                    The verification link may have expired (valid for 24 hours)
                                </li>
                                <li>
                                    <i className="bi bi-arrow-right-circle"></i>
                                    Your email may already be verified - try logging in
                                </li>
                                <li>
                                    <i className="bi bi-arrow-right-circle"></i>
                                    Contact our support team for assistance
                                </li>
                            </ul>
                        </div>
                        <div className='email-confirm-button-group'>
                            <button onClick={handleGoToLogin} className='email-confirm-btn-primary'>
                                <i className="bi bi-box-arrow-in-right"></i> Try to Login
                            </button>
                            <button onClick={handleGoToHome} className='email-confirm-btn-secondary'>
                                <i className="bi bi-house"></i> Back to Home
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
