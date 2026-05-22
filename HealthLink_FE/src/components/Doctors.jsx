import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import DoctorDirectoryContent from './DoctorDirectoryContent';
import './Css/Doctors.css';

const Doctors = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const [showModal, setShowModal] = useState(false);
    const [pendingDoctorId, setPendingDoctorId] = useState(null);

    const handleBookNow = (doctorId) => {
        if (!isAuthenticated) {
            setPendingDoctorId(doctorId);
            setShowModal(true);
        } else {
            navigate(`/book/${doctorId}`);
        }
    };

    const handleConfirmLogin = () => {
        setShowModal(false);
        navigate('/login');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setPendingDoctorId(null);
    };

    return (
        <div className="Background_Doctors">
            <div className="container">
                <div
                    className="row"
                    style={{
                        backgroundColor: '#ffffffa4',
                        padding: '3%'
                    }}
                >
                    <DoctorDirectoryContent
                        title="Available Doctors"
                        pageSize={5}
                        onViewProfile={(doctorId) => navigate(`/doctor/${doctorId}`)}
                        onBookDoctor={handleBookNow}
                    />
                </div>
            </div>

            <ConfirmModal
                isOpen={showModal}
                onClose={handleCloseModal}
                onConfirm={handleConfirmLogin}
                title="Authentication Required"
                message="You need to login to book an appointment. Would you like to go to the login page?"
                confirmText="Go to Login"
                iconClass="bi-shield-lock-fill"
                variant="primary"
            />
        </div>
    );
};

export default Doctors;