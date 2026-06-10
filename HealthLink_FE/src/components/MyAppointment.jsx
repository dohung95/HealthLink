import React, { useEffect, useState } from 'react';
import { appointmentService } from '../api/appointmentApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';
import Loading from './Loading';
import { getProfile } from '../api/account';
import RescheduleAppointmentModal from './RescheduleAppointmentModal';
import PreConsultationVitalsModal from './PreConsultationVitalsModal';
import ReviewForm from './patient-dashboard/ReviewForm';
import { patientReviewApi } from '../api/reviewApi';

const MyAppointments = () => {
    const APPOINTMENTS_PAGE_SIZE = 5;
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const navigate = useNavigate();
    const { roles, initiateCall, token } = useAuth();
    const { openChatWith } = useChat();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedRescheduleAppointment, setSelectedRescheduleAppointment] = useState(null);
    const [pendingAppointmentId, setPendingAppointmentId] = useState(null);
    const [patientId, setPatientId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: APPOINTMENTS_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0,
    });
    const [showVitalsModal, setShowVitalsModal] = useState(false);
    const [pendingConsultationAppointment, setPendingConsultationAppointment] = useState(null);
    const [pendingConsultationAction, setPendingConsultationAction] = useState(null);
    const [now, setNow] = useState(new Date());
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedReviewAppointment, setSelectedReviewAppointment] = useState(null);
    const [reviewableAppointments, setReviewableAppointments] = useState({});

    useEffect(() => {
        if (!token) return;

        const initializeAppointments = async () => {
            try {
                setLoading(true);

                const profile = await getProfile(token);
                setPatientId(profile.userId);

                await loadAppointments(profile.userId, 1);
            } catch (error) {
                console.error('Failed to initialize appointments', error);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        initializeAppointments();
    }, [token]);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 30 * 1000);

        return () => clearInterval(timer);
    }, []);

    const loadAppointments = async (currentPatientId = patientId, page = currentPage) => {
        if (!currentPatientId) return;

        try {
            setLoading(true);

            const data = await appointmentService.getPatientAppointmentsPage(
                currentPatientId,
                page,
                APPOINTMENTS_PAGE_SIZE
            );

            setAppointments(data.items || []);
            setPagination({
                page: data.page || page,
                pageSize: data.pageSize || APPOINTMENTS_PAGE_SIZE,
                totalItems: data.totalItems || 0,
                totalPages: data.totalPages || 0,
            });
            setCurrentPage(data.page || page);

            // Check which completed appointments can be reviewed
            const completedAppointments = (data.items || []).filter(a => a.status === 'Completed');
            const reviewableMap = {};
            await Promise.all(
                completedAppointments.map(async (apt) => {
                    try {
                        const result = await patientReviewApi.canReview(apt.appointmentId);
                        reviewableMap[apt.appointmentId] = result.canReview;
                    } catch (error) {
                        reviewableMap[apt.appointmentId] = false;
                    }
                })
            );
            setReviewableAppointments(reviewableMap);
        } catch (error) {
            console.error('Failed to load appointments', error);
            toast.error('Unable to load appointments.');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = async (page) => {
        if (page < 1 || page > pagination.totalPages || page === currentPage) return;
        await loadAppointments(patientId, page);
    };

    const getPageNumbers = () => {
        const total = pagination.totalPages;
        if (total <= 7) {
            return Array.from({ length: total }, (_, index) => index + 1);
        }

        const pages = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(total - 1, currentPage + 1);

        if (start > 2) pages.push('left-ellipsis');
        for (let page = start; page <= end; page++) pages.push(page);
        if (end < total - 1) pages.push('right-ellipsis');
        pages.push(total);

        return pages;
    };

    // Hàm mở modal xác nhận
    const handleCancelClick = (id) => {
        setPendingAppointmentId(id);
        setShowCancelModal(true);
    };

    // Hàm xác nhận hủy (khi nhấn Confirm trong modal)
    const handleConfirmCancel = async () => {
        setShowCancelModal(false);

        if (!pendingAppointmentId) return;

        try {
            await appointmentService.cancelAppointment(pendingAppointmentId, {
                cancelReason: 'Patient request',
                cancelledBy: 'Patient',
            });

            toast.success('Appointment cancelled successfully.');
            loadAppointments(patientId, currentPage);

        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data || "Failed to cancel.";
            toast.error(msg);
        } finally {
            setPendingAppointmentId(null);
        }
    };

    // Hàm đóng modal (khi nhấn Cancel trong modal)
    const handleCloseCancelModal = () => {
        setShowCancelModal(false);
        setPendingAppointmentId(null);
    };

    const openVitalsBeforeConsultation = (appointment, action) => {
        setPendingConsultationAppointment(appointment);
        setPendingConsultationAction(action);
        setShowVitalsModal(true);
    };

    const handleChat = async (appointment) => {
        const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');
        const partnerID = isDoctor ? appointment.patientId : appointment.doctorId;
        const partnerName = isDoctor ? appointment.patientName : appointment.doctorName;

        if (!partnerID) {
            toast.error("Chat partner information is missing.");
            return;
        }

        let firebaseID;
        if (partnerID.includes('-')) {
            firebaseID = partnerID.substring(0, partnerID.length - 4);
        } else {
            firebaseID = partnerID.substring(0, partnerID.length - 5);
        }

        setActionLoading(true);
        try {
            const usersRef = collection(db, "users");

            let q = query(usersRef, where("__name__", "==", firebaseID));
            let querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
                openChatWith(partnerUser);
                return;
            }

            q = query(usersRef, where("uid", "==", firebaseID));
            querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
                openChatWith(partnerUser);
                return;
            }

            console.warn(`[Chat] ✗ Could not find user with Firebase ID: ${firebaseID}`);
            toast.error(`Could not find chat user. They may not have registered in the chat system yet.`);
        } catch (error) {
            console.error("[Chat] Error:", error);
            toast.error("Error initiating chat.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleVideoCall = async (appointment) => {
        try {
            const patientId = appointment.patientId;
            const doctorId = appointment.doctorId;
            const patientName = appointment.patientName || "Patient";
            const doctorName = appointment.doctorName || "Doctor";

            const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');

            const targetUserId = isDoctor ? patientId : doctorId;
            const targetUserName = isDoctor ? patientName : doctorName;
            const callerName = isDoctor ? doctorName : patientName;

            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let roomId = '';
            for (let i = 0; i < 45; i++) {
                roomId += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            initiateCall(targetUserId, roomId, targetUserName, callerName);

        } catch (error) {
            console.error("Error initiating video call:", error);
            toast.error("Unable to start video call.");
        }
    };

    const handleVitalsSaved = async () => {
        setShowVitalsModal(false);

        const appointment = pendingConsultationAppointment;
        const action = pendingConsultationAction;

        setPendingConsultationAppointment(null);
        setPendingConsultationAction(null);

        if (!appointment) return;

        if (action === 'chat') {
            await handleChat(appointment);
            return;
        }

        if (action === 'video') {
            await handleVideoCall(appointment);
        }
    };

    const normalizeText = (value) => String(value || '').trim().toLowerCase();

    const isScheduledAppointment = (appointment) => {
        return normalizeText(appointment.status) === 'scheduled';
    };

    const isChatAppointment = (appointment) => {
        return normalizeText(appointment.consultationType) === 'chat';
    };

    const isVideoAppointment = (appointment) => {
        const type = normalizeText(appointment.consultationType);
        return type === 'video' || type === 'video call';
    };

    const getAppointmentStartTime = (appointment) => {
        return new Date(appointment.appointmentTime);
    };

    const getAppointmentEndTime = (appointment) => {
        if (appointment.consultationEndTime) {
            return new Date(appointment.consultationEndTime);
        }

        const startTime = getAppointmentStartTime(appointment);

        // Nếu BE chưa trả consultationEndTime thì tạm cho phép dùng trong 30 phút
        return new Date(startTime.getTime() + 30 * 60 * 1000);
    };

    const isAppointmentJoinable = (appointment) => {
        const s = normalizeText(appointment.status);
        return s === 'in_consultation' || s === 'inconsultation' || s === 'in_progress';
    };

    const formatStatusLabel = (status) => {
        switch (normalizeText(status)) {
            case 'scheduled':
                return 'Scheduled';
            case 'cancelled':
                return 'Cancelled';
            case 'completed':
                return 'Completed';
            default:
                return status || 'Unknown';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Scheduled': return 'bg-success';
            case 'Cancelled': return 'bg-danger';
            case 'Completed': return 'bg-primary';
            default: return 'bg-secondary';
        }
    };

    const canReschedule = (appointment) => {
        const appointmentTime = new Date(appointment.appointmentTime);
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

        return (
            isScheduledAppointment(appointment) &&
            appointmentTime > twoHoursFromNow
        );
    };

    const handleRescheduleClick = (appointment) => {
        setSelectedRescheduleAppointment(appointment);
        setShowRescheduleModal(true);
    };

    const handleCloseRescheduleModal = () => {
        setShowRescheduleModal(false);
        setSelectedRescheduleAppointment(null);
    };

    const handleRescheduled = async () => {
        await loadAppointments(patientId, currentPage);
    };

    const handleRateClick = (appointment) => {
        setSelectedReviewAppointment(appointment);
        setShowReviewModal(true);
    };

    const handleReviewSubmitted = async () => {
        // Reload appointments to update the reviewable status
        await loadAppointments(patientId, currentPage);
    };

    if (actionLoading) {
        return <Loading />;
    }

    return (
        <div className="appointment-dashboard-page">
            <div className="container-fluid px-0">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2>My Appointments</h2>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/patient-dashboard/booking')}
                    >
                        + Book New Appointment
                    </button>
                </div>

                {loading ? (
                    <div className="card border-0 shadow-sm">
                        <div className="card-body py-5 text-center text-muted">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Loading appointments...
                        </div>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="alert alert-info">You have no appointments yet.</div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-hover table-bordered shadow-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Doctor</th>
                                        <th>Patient</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map((item) => (
                                        <tr key={item.appointmentId}>
                                            <td>
                                                {new Date(item.appointmentTime).toLocaleDateString()} <br />
                                                <small className="text-muted">
                                                    {new Date(item.appointmentTime).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </small>
                                            </td>

                                            <td>
                                                <strong>{item.doctorName || "Unknown Doctor"}</strong>
                                                <br />
                                                <small className="text-muted">{item.specialtyName || ''}</small>
                                            </td>

                                            <td>
                                                <span className="text-capitalize">
                                                    {item.patientName || 'Unknown Patient'}
                                                </span>
                                                <br />
                                                <small className="text-muted">
                                                    Patient ID: {item.patientId}
                                                </small>
                                            </td>

                                            <td>
                                                <span className="text-capitalize">{item.consultationType}</span>
                                            </td>

                                            <td>
                                                <span className={`badge ${getStatusBadge(item.status)}`}>
                                                    {formatStatusLabel(item.status)}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="d-flex gap-2 flex-wrap">
                                                    {/* thay isAppointmentJoinable = isScheduledAppointment */}
                                                    {isChatAppointment(item) && isAppointmentJoinable(item) && (
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => openVitalsBeforeConsultation(item, 'chat')}
                                                            title="Start chat"
                                                        >
                                                            <i className="bi bi-chat-dots me-1"></i>
                                                            Chat
                                                        </button>
                                                    )}

                                                    {/* thay isAppointmentJoinable = isScheduledAppointment */}
                                                    {isVideoAppointment(item) && isAppointmentJoinable(item) && (
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => openVitalsBeforeConsultation(item, 'video')}
                                                            title={
                                                                new Date(item.appointmentTime) < new Date()
                                                                    ? "Appointment time has passed"
                                                                    : "Start video call"
                                                            }
                                                            disabled={new Date(item.appointmentTime) < new Date()}
                                                        >
                                                            <i className="bi bi-camera-video me-1"></i>
                                                            Call Now
                                                        </button>
                                                    )}

                                                    {canReschedule(item) && (
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => handleRescheduleClick(item)}
                                                        >
                                                            Reschedule
                                                        </button>
                                                    )}

                                                    {isScheduledAppointment(item) && (
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() =>
                                                                handleCancelClick(item.appointmentId)
                                                            }
                                                            title={
                                                                new Date(item.appointmentTime) < new Date()
                                                                    ? "Appointment time has passed"
                                                                    : "Cancel appointment"
                                                            }
                                                            disabled={new Date(item.appointmentTime) < new Date()}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}

                                                    {/* Rate button for completed appointments */}
                                                    {item.status === 'Completed' && (
                                                        <button
                                                            className={`btn btn-sm ${reviewableAppointments[item.appointmentId] ? 'btn-warning' : 'btn-outline-secondary'}`}
                                                            onClick={() => handleRateClick(item)}
                                                            title={reviewableAppointments[item.appointmentId] ? 'Rate this appointment' : 'View your review'}
                                                        >
                                                            <i className={`bi ${reviewableAppointments[item.appointmentId] ? 'bi-star' : 'bi-star-fill'} me-1`}></i>
                                                            {reviewableAppointments[item.appointmentId] ? 'Rate' : 'Reviewed'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                                <small className="text-muted">
                                    Showing page {pagination.page} of {pagination.totalPages}
                                    {' '}({pagination.totalItems} appointments)
                                </small>

                                <nav aria-label="Appointments pagination">
                                    <ul className="pagination pagination-sm mb-0">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                        </li>

                                        {getPageNumbers().map((page) => (
                                            typeof page === 'string' ? (
                                                <li key={page} className="page-item disabled">
                                                    <span className="page-link">...</span>
                                                </li>
                                            ) : (
                                                <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => handlePageChange(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            )
                                        ))}

                                        <li className={`page-item ${currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === pagination.totalPages}
                                            >
                                                Next
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal xác nhận hủy lịch hẹn */}
            <ConfirmModal
                isOpen={showCancelModal}
                onClose={handleCloseCancelModal}
                onConfirm={handleConfirmCancel}
                title="Cancel Appointment"
                message="Are you sure you want to cancel this appointment? This action cannot be undone."
                confirmText="Yes, Cancel"
                cancelText="No, Keep It"
                iconClass="bi-exclamation-triangle-fill"
                variant="warning"
            />

            {/* Modal đổi lịch hẹn */}
            <RescheduleAppointmentModal
                isOpen={showRescheduleModal}
                appointment={selectedRescheduleAppointment}
                onClose={handleCloseRescheduleModal}
                onRescheduled={handleRescheduled}
            />

            <PreConsultationVitalsModal
                isOpen={showVitalsModal}
                appointment={pendingConsultationAppointment}
                patientId={patientId}
                onClose={() => {
                    setShowVitalsModal(false);
                    setPendingConsultationAppointment(null);
                    setPendingConsultationAction(null);
                }}
                onSaved={handleVitalsSaved}
            />

            {/* Review Modal */}
            <ReviewForm
                isOpen={showReviewModal}
                onClose={() => {
                    setShowReviewModal(false);
                    setSelectedReviewAppointment(null);
                }}
                appointment={selectedReviewAppointment}
                onReviewSubmitted={handleReviewSubmitted}
            />
        </div>
    );
};

export default MyAppointments;
