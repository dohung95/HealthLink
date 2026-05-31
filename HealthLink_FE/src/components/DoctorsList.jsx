import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import DoctorDirectoryContent from './DoctorDirectoryContent';
import './Css/DoctorDirectory.css';

const DoctorsList = () => {
    const navigate = useNavigate();
    const { isAuthenticated, roles } = useAuth();
    const [pendingRedirect, setPendingRedirect] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [pendingDoctorId, setPendingDoctorId] = useState(null);

    const handleBookNow = (doctorId) => {
        const target = `/patient-dashboard/book/${doctorId}`;

        if (!isAuthenticated) {
            setPendingDoctorId(doctorId);
            setPendingRedirect(target);

            sessionStorage.setItem('postLoginRedirect', target);

            setShowModal(true);
            return;
        }

        const isPatient = roles?.some(
            (role) => String(role).toLowerCase() === 'patient'
        );

        if (!isPatient) {
            navigate('/');
            return;
        }

        navigate(target);
    };

    const handleConfirmLogin = () => {
        setShowModal(false);

        const target = pendingRedirect || `/patient-dashboard/book/${pendingDoctorId}`;

        sessionStorage.setItem('postLoginRedirect', target);

        navigate('/login', {
            state: {
                redirectTo: target,
            },
        });
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setPendingDoctorId(null);
        setPendingRedirect(null);
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
                        onViewProfile={(doctorId) => navigate(`/doctors/${doctorId}`)}
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

export default DoctorsList;
