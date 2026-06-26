import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

/**
 * Modal hiển thị thông báo khi Admin thực hiện action ảnh hưởng đến lịch hẹn.
 * - ADMIN_APPOINTMENT_CANCEL: Admin hủy lịch hẹn
 * - ADMIN_APPOINTMENT_REASSIGN: Admin chuyển lịch hẹn sang bác sĩ khác
 *
 * Supports: Patient, Doctor
 */
const AdminActionNotificationModal = () => {
    const navigate = useNavigate();
    const { showAdminActionModal, adminActionNotification, closeAdminActionModal } = useNotifications();
    const { roles } = useAuth();

    if (!showAdminActionModal || !adminActionNotification) {
        return null;
    }

    const isCancel = adminActionNotification.type === 'ADMIN_APPOINTMENT_CANCEL';
    const isReassign = adminActionNotification.type === 'ADMIN_APPOINTMENT_REASSIGN';
    const isDoctor = roles?.includes('Doctor');
    const isPatient = roles?.includes('Patient');

    const handleViewAppointments = () => {
        if (isDoctor) {
            navigate('/doctor-page/appointments');
        } else {
            navigate('/patient-dashboard/appointments');
        }
        closeAdminActionModal();
    };

    const getIconAndColor = () => {
        if (isCancel) {
            return {
                icon: 'bi-calendar-x',
                bgColor: 'bg-danger',
                iconColor: 'text-danger'
            };
        }
        if (isReassign) {
            return {
                icon: 'bi-arrow-left-right',
                bgColor: 'bg-warning',
                iconColor: 'text-warning'
            };
        }
        return {
            icon: 'bi-info-circle',
            bgColor: 'bg-info',
            iconColor: 'text-info'
        };
    };

    const { icon, bgColor, iconColor } = getIconAndColor();

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-backdrop fade show"
                style={{ zIndex: 1050 }}
                onClick={closeAdminActionModal}
            ></div>

            {/* Modal */}
            <div
                className="modal fade show d-block"
                tabIndex="-1"
                style={{ zIndex: 1055 }}
                onClick={closeAdminActionModal}
            >
                <div
                    className="modal-dialog modal-dialog-centered"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-content">
                        <div className={`modal-header ${bgColor} text-white`}>
                            <h5 className="modal-title">
                                <i className={`bi ${icon} me-2`}></i>
                                {adminActionNotification.title || 'Appointment Update'}
                            </h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={closeAdminActionModal}
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body">
                            <div className="text-center py-3">
                                <i className={`bi ${icon} ${iconColor}`} style={{ fontSize: '4rem' }}></i>
                                <p className="mt-3 mb-2 fw-bold">
                                    {adminActionNotification.message}
                                </p>
                                {adminActionNotification.timestamp && (
                                    <p className="text-muted small">
                                        {new Date(adminActionNotification.timestamp).toLocaleString('vi-VN')}
                                    </p>
                                )}
                            </div>

                            {isCancel && (
                                <div className="alert alert-danger mb-0">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {isDoctor
                                        ? 'This appointment has been cancelled by the administrator.'
                                        : 'Your appointment has been cancelled by the administrator. Please contact support if you have any questions.'}
                                </div>
                            )}

                            {isReassign && (
                                <div className="alert alert-warning mb-0">
                                    <i className="bi bi-info-circle me-2"></i>
                                    {isDoctor
                                        ? 'An appointment has been reassigned. Please check your schedule for updated details.'
                                        : 'Your appointment has been reassigned to a different doctor. Please check your appointments for updated details.'}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={closeAdminActionModal}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className={`btn ${isCancel ? 'btn-danger' : 'btn-warning'}`}
                                onClick={handleViewAppointments}
                            >
                                <i className="bi bi-calendar-check me-2"></i>
                                {isDoctor ? 'View My Schedule' : 'View My Appointments'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminActionNotificationModal;
