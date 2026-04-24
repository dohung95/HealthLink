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

const MyAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const navigate = useNavigate();
    const { roles, initiateCall } = useAuth();
    const { openChatWith } = useChat();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [pendingAppointmentId, setPendingAppointmentId] = useState(null);

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            const data = await appointmentService.getMyAppointments();
            // Sắp xếp: Cuộc hẹn sắp tới (gần nhất) lên đầu
            const sortedData = data.sort((a, b) => {
                const now = new Date();
                const dateA = new Date(a.appointmentTime);
                const dateB = new Date(b.appointmentTime);

                // Phân loại: sắp tới vs đã qua
                const aIsFuture = dateA >= now;
                const bIsFuture = dateB >= now;

                // Cuộc hẹn sắp tới ưu tiên lên trước
                if (aIsFuture && !bIsFuture) return -1;
                if (!aIsFuture && bIsFuture) return 1;

                // Cùng loại thì sắp theo thời gian
                if (aIsFuture && bIsFuture) {
                    return dateA - dateB;  // Gần nhất lên đầu
                } else {
                    return dateB - dateA;  // Mới nhất lên đầu (cho các cuộc hẹn đã qua)
                }
            });

            setAppointments(sortedData);
        } catch (error) {
            navigate('/login');
        } finally {
            // Delay để hiển thị loading animation
            setTimeout(() => {
                setLoading(false);
            }, 800);
        }
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
            await appointmentService.cancelAppointment(pendingAppointmentId, "Patient request");
            toast.success("Appointment cancelled successfully.");
            loadAppointments();
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

    const handleChat = async (appointment) => {
        const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');
        const partnerData = isDoctor ? appointment.patient : appointment.doctor;
        const partnerID = isDoctor ? appointment.patientID : appointment.doctorID;

        if (!partnerData || !partnerID) {
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
            const patientID = appointment.patientID;
            const doctorID = appointment.doctorID;
            const patientName = appointment.patient?.fullName || "Patient";
            const doctorName = appointment.doctor?.fullName || "Doctor";

            const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');

            const targetUserId = isDoctor ? patientID : doctorID;
            const targetUserName = isDoctor ? patientName : doctorName;

            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let roomId = '';
            for (let i = 0; i < 45; i++) {
                roomId += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            initiateCall(targetUserId, roomId, targetUserName);

        } catch (error) {
            console.error("Error initiating video call:", error);
            toast.error("Unable to start video call.");
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

    // Hiển thị Loading component khi đang load hoặc đang cancel
    if (loading || actionLoading) {
        return <Loading />;
    }

    return (
        <div className='Background_Doctors'>
            <div className="container mt-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2>My Appointments</h2>
                    <button className="btn btn-primary" onClick={() => navigate('/schedule')}>
                        + Book New Appointment
                    </button>
                </div>

                {appointments.length === 0 ? (
                    <div className="alert alert-info">You have no appointments yet.</div>
                ) : (
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
                                    <tr key={item.appointmentID}>
                                        <td>
                                            {new Date(item.appointmentTime).toLocaleDateString()} <br />
                                            <small className="text-muted">
                                                {new Date(item.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </small>
                                        </td>

                                        <td>
                                            <strong>{item.doctor?.fullName || "Unknown Doctor"}</strong>
                                            <br />
                                            <small className="text-muted">{item.doctor?.specialty}</small>
                                        </td>

                                        <td>
                                            <span className="text-capitalize">{item.patient?.fullName || "Unknown Patient"}</span>
                                            <br />
                                            <small className="text-muted">
                                                {item.patient?.dateOfBirth ? new Date(item.patient.dateOfBirth).toLocaleDateString() : 'N/A'}
                                            </small>
                                        </td>

                                        <td>
                                            <span className="text-capitalize">{item.consultationType}</span>
                                        </td>

                                        <td>
                                            <span className={`badge ${getStatusBadge(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="d-flex gap-2 flex-wrap">
                                                {item.consultationType === 'Chat' && item.status === 'Scheduled' && (
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleChat(item)}
                                                        title={new Date(item.appointmentTime) < new Date() ? "Appointment time has passed" : "Start chat"}
                                                        disabled={new Date(item.appointmentTime) < new Date()}
                                                    >
                                                        <i className="bi bi-chat-dots me-1"></i>
                                                        Chat
                                                    </button>
                                                )}

                                                {item.consultationType === 'Video Call' && item.status === 'Scheduled' && (
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleVideoCall(item)}
                                                        title={new Date(item.appointmentTime) < new Date() ? "Appointment time has passed" : "Start video call"}
                                                        disabled={new Date(item.appointmentTime) < new Date()}
                                                    >
                                                        <i className="bi bi-camera-video me-1"></i>
                                                        Call Now
                                                    </button>
                                                )}

                                                {item.status === 'Scheduled' && (
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleCancelClick(item.appointmentID)}  // ← ĐỔI TÊN HÀM
                                                        title={new Date(item.appointmentTime) < new Date() ? "Appointment time has passed" : "Cancel appointment"}
                                                        disabled={new Date(item.appointmentTime) < new Date()}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
        </div>
    );
};

export default MyAppointments;