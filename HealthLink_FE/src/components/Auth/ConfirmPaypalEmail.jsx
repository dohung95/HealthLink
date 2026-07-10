import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../Css/EmailConfirmation.css';

const API_URL = 'http://localhost:8096/api/auth';

export default function ConfirmPaypalEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const hasCalledAPI = useRef(false);

    useEffect(() => {
        const confirmPaypalEmail = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid confirmation link. No token provided.');
                return;
            }

            if (hasCalledAPI.current) return;
            hasCalledAPI.current = true;

            try {
                const response = await axios.get(`${API_URL}/confirm-paypal-email`, {
                    params: { token }
                });

                setStatus('success');
                setMessage(response.data?.message || 'PayPal email confirmed successfully!');

                setTimeout(() => {
                    navigate('/login');
                }, 30000);
            } catch (error) {
                setStatus('error');
                if (error.response) {
                    setMessage(error.response.data?.message || error.response.data?.error || 'PayPal email confirmation failed. The link may be invalid or expired.');
                } else {
                    setMessage('Network error. Please check your connection and try again.');
                }
                console.error('PayPal email confirmation error:', error);
            }
        };

        confirmPaypalEmail();
    }, [token, navigate]);

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
                        <h2>Verifying Your PayPal Email...</h2>
                        <p>Please wait while we confirm your PayPal payout email.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className='email-confirm-icon-container success'>
                            <i className="bi bi-check-circle-fill"></i>
                        </div>
                        <h2>PayPal Email Confirmed!</h2>
                        <div className='email-confirm-message-box success'>
                            <p>{message}</p>
                        </div>
                        <div className='email-confirm-info-box'>
                            <i className="bi bi-info-circle"></i>
                            <span>This PayPal email now appears in your profile and can receive payouts. You will be redirected to login in 30 seconds...</span>
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
                        <h2>Confirmation Failed</h2>
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
                                    The confirmation link may have expired (valid for 24 hours)
                                </li>
                                <li>
                                    <i className="bi bi-arrow-right-circle"></i>
                                    This PayPal email may already be confirmed - try logging in
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
