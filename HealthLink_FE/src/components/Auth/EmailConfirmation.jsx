import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../Css/EmailConfirmation.css';

const API_URL = 'https://localhost:7267/api';

export function EmailConfirmation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        const confirmEmail = async () => {
            const userId = searchParams.get('userId');
            const token = searchParams.get('token');

            if (!userId || !token) {
                setStatus('error');
                setMessage('Invalid confirmation link. Please check your email or contact support.');
                return;
            }

            try {
                const response = await axios.get(`${API_URL}/Auth/confirm-email`, {
                    params: { userId, token }
                });

                setStatus('success');
                setMessage(response.data.message || 'Email confirmed successfully! You can now log in to your account.');

                // Redirect to login after 30 seconds
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
    }, [searchParams, navigate]);

    const handleGoToLogin = () => {
        navigate('/login');
    };

    const handleGoToHome = () => {
        navigate('/');
    };

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

export default EmailConfirmation;
