import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Loading from '../Loading';
import './Css/RegistrationChoice.css';

export function RegistrationChoice() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="registration-choice-bg">
            <div className="registration-choice-container" style={{paddingTop:"13%"}}>
                <div className="choice-cards">
                    <div
                        className="choice-card reg-doctor-card"
                        onClick={() => navigate('/register/doctor')}
                    >
                        <div className="card-icon">
                            <i className="bi bi-person-badge"></i>
                        </div>
                        <h3>Doctor</h3>
                        <p>Register as a healthcare professional to offer consultations and manage patients</p>
                        <ul className="benefits-list">
                            <li><i className="bi bi-check-circle-fill"></i> Online consultations</li>
                            <li><i className="bi bi-check-circle-fill"></i> Patient management</li>
                            <li><i className="bi bi-check-circle-fill"></i> Prescription system</li>
                            <li><i className="bi bi-check-circle-fill"></i> Schedule management</li>
                        </ul>
                        <button className="choice-btn">
                            Register as Doctor <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>

                    <div
                        className="choice-card reg-pharmacy-card"
                        onClick={() => navigate('/register/pharmacy')}
                    >
                        <div className="card-icon">
                            <i className="bi bi-shop"></i>
                        </div>
                        <h3>Pharmacy</h3>
                        <p>Register your pharmacy to fulfill prescriptions and connect with patients</p>
                        <ul className="benefits-list">
                            <li><i className="bi bi-check-circle-fill"></i> Prescription fulfillment</li>
                            <li><i className="bi bi-check-circle-fill"></i> Inventory management</li>
                            <li><i className="bi bi-check-circle-fill"></i> Delivery services</li>
                            <li><i className="bi bi-check-circle-fill"></i> Customer reach</li>
                        </ul>
                        <button className="choice-btn reg-pharmacy-btn">
                            Register as Pharmacy <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>

                <div className="alternative-links">
                    <p>Already have an account? <Link to="/login">Sign In</Link></p>
                    <p>Looking to register as a patient? <Link to="/register">Patient Registration</Link></p>
                    <br/>
                </div>
            </div>
        </div>
    );
}

export default RegistrationChoice;
