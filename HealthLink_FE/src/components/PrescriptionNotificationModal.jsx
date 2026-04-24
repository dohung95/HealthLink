import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const PrescriptionNotificationModal = () => {
    const navigate = useNavigate();
    const { showPrescriptionModal, latestPrescription, closePrescriptionModal } = useNotifications();

    if (!showPrescriptionModal || !latestPrescription) {
        return null;
    }

    const handleViewPrescription = () => {
        navigate(`/prescription`);
        closePrescriptionModal();
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className="modal-backdrop fade show" 
                style={{ zIndex: 1050 }}
                onClick={closePrescriptionModal}
            ></div>

            {/* Modal */}
            <div 
                className="modal fade show d-block" 
                tabIndex="-1" 
                style={{ zIndex: 1055 }}
                onClick={closePrescriptionModal}
            >
                <div 
                    className="modal-dialog modal-dialog-centered"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-content">
                        <div className="modal-header bg-primary text-white">
                            <h5 className="modal-title">
                                <i className="bi bi-prescription2 me-2"></i>
                                New Prescription Received
                            </h5>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white" 
                                onClick={closePrescriptionModal}
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body">
                            <div className="text-center py-3">
                                <i className="bi bi-prescription2 text-primary" style={{ fontSize: '4rem' }}></i>
                                <p className="mt-3 mb-2 fw-bold">{latestPrescription.message}</p>
                                <p className="text-muted small">
                                    Received: {new Date(latestPrescription.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={closePrescriptionModal}
                            >
                                Close
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary" 
                                onClick={handleViewPrescription}
                            >
                                <i className="bi bi-eye me-2"></i>
                                View Prescription
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrescriptionNotificationModal;
