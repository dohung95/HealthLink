import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Container, Row, Col } from 'react-bootstrap';

const NotFound = () => {
    const navigate = useNavigate();
    const { isAuthenticated, roles } = useAuth();

    const handleGoHome = () => {
        if (isAuthenticated && roles && roles.length > 0) {
            const userRoles = roles.map(r => r.toLowerCase());
            if (userRoles.includes('admin')) {
                navigate('/admin');
            } else if (userRoles.includes('doctor')) {
                navigate('/doctor-page');
            } else if (userRoles.includes('pharmacy')) {
                navigate('/pharmacy-page');
            } else {
                navigate('/patient-dashboard');
            }
        } else {
            navigate('/');
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #f5fdfc 0%, #e6f7f5 100%)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Animated Background Elements */}
            <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                background: 'rgba(0, 176, 154, 0.05)',
                borderRadius: '50%',
                top: '-100px',
                right: '-50px',
                zIndex: 0
            }}></div>
            <div style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                background: 'rgba(0, 176, 154, 0.03)',
                borderRadius: '50%',
                bottom: '10%',
                left: '-50px',
                zIndex: 0
            }}></div>

            <Container style={{ position: 'relative', zIndex: 1 }}>
                <Row className="align-items-center">
                    <Col lg={6} className="text-center text-lg-start mb-5 mb-lg-0">
                        <div style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            background: 'rgba(0, 176, 154, 0.1)',
                            color: '#00b09a',
                            borderRadius: '50px',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            letterSpacing: '1px',
                            marginBottom: '20px'
                        }}>
                            ERROR CODE: 404
                        </div>
                        
                        <h1 style={{ 
                            fontSize: 'calc(2.5rem + 2vw)', 
                            fontWeight: '900', 
                            color: '#2c3e50',
                            lineHeight: '1.1',
                            marginBottom: '20px'
                        }}>
                            Lost in the <br />
                            <span style={{ color: '#00b09a' }}>Medical Maze?</span>
                        </h1>
                        
                        <p style={{ 
                            fontSize: '1.15rem', 
                            color: '#64748b', 
                            maxWidth: '500px',
                            lineHeight: '1.6',
                            marginBottom: '40px'
                        }}>
                            Don't worry, even the best specialists get lost sometimes. 
                            The page you're looking for has moved to another ward or doesn't exist anymore.
                        </p>
                        
                        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
                            <Button 
                                onClick={handleGoHome} 
                                size="lg"
                                style={{ 
                                    backgroundColor: '#00b09a', 
                                    borderColor: '#00b09a',
                                    padding: '16px 40px',
                                    borderRadius: '16px',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    boxShadow: '0 10px 20px rgba(0, 176, 154, 0.2)',
                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 176, 154, 0.3)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 176, 154, 0.2)';
                                }}
                            >
                                <i className="bi bi-house-door-fill me-2"></i>
                                Go Back Home
                            </Button>
                            
                            <Button 
                                variant="outline-secondary"
                                onClick={() => navigate(-1)}
                                size="lg"
                                style={{ 
                                    padding: '16px 40px',
                                    borderRadius: '16px',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    border: '2px solid #e2e8f0',
                                    color: '#64748b',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <i className="bi bi-arrow-left me-2"></i>
                                Previous Page
                            </Button>
                        </div>
                    </Col>
                    
                    <Col lg={6} className="text-center">
                        <div style={{ position: 'relative' }}>
                            {/* Floating animation for the image */}
                            <style>
                                {`
                                    @keyframes float {
                                        0% { transform: translateY(0px); }
                                        50% { transform: translateY(-20px); }
                                        100% { transform: translateY(0px); }
                                    }
                                    .floating-img {
                                        animation: float 4s ease-in-out infinite;
                                        filter: drop-shadow(0 20px 40px rgba(0, 176, 154, 0.15));
                                    }
                                `}
                            </style>
                            <img 
                                src="/medical_404.png" 
                                alt="404 Illustration" 
                                className="img-fluid floating-img"
                                style={{ maxWidth: '90%', height: 'auto' }}
                            />
                            
                            {/* Decorative elements behind image */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '120%',
                                height: '120%',
                                background: 'radial-gradient(circle, rgba(0,176,154,0.1) 0%, rgba(255,255,255,0) 70%)',
                                zIndex: -1
                            }}></div>
                        </div>
                    </Col>
                </Row>
            </Container>
            
            {/* Footer text */}
            <div style={{
                position: 'absolute',
                bottom: '30px',
                width: '100%',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.85rem'
            }}>
                © {new Date().getFullYear()} HealthLink Medical Center. All rights reserved.
            </div>
        </div>
    );
};

export default NotFound;
