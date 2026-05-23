import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorDirectoryContent from './DoctorDirectoryContent';
import './Css/DoctorDirectoryModal.css';

const DoctorDirectoryModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="doctor-modal-overlay" onClick={onClose}>
            <div
                className="doctor-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <DoctorDirectoryContent
                    title="All Doctors"
                    pageSize={5}
                    showCloseButton={true}
                    onClose={onClose}
                    onViewProfile={(doctorId) => navigate(`/doctor/${doctorId}`)}
                    onBookDoctor={(doctorId) => {
                        onClose();
                        navigate(`/patient-dashboard/book/${doctorId}`);
                    }}
                />
            </div>
        </div>
    );
};

export default DoctorDirectoryModal;