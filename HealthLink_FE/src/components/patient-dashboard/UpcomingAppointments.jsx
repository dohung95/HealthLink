import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../api/appointmentApi';

/**
 * Format ngày giờ từ ISO string sang định dạng dd/MM/yyyy - HH:mm (vi-VN).
 * @param {string} dateString - ISO date string từ API
 * @returns {string} - Chuỗi ngày giờ đã format
 */
const formatAppointmentTime = (dateString) => {
    if (!dateString) return 'Chưa xác định';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    return `${dateStr} - ${timeStr}`;
};

/**
 * UpcomingAppointments - Hiển thị danh sách lịch hẹn sắp tới của bệnh nhân.
 */
const UpcomingAppointments = () => {
    const { token } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;

        const fetchAppointments = async () => {
            try {
                const data = await getPatientAppointments(patientId)
;
                const allAppointments = Array.isArray(data) ? data : [];

                // Lọc lấy các lịch sắp tới (chưa hoàn thành, chưa hủy)
                const upcoming = allAppointments
                    .filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed')
                    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
                    .slice(0, 5); // Chỉ hiển thị 5 lịch gần nhất

                setAppointments(upcoming);
            } catch (err) {
                console.error('UpcomingAppointments: Failed to fetch appointments', err);
                setError('Unable to load appointment list.');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [token]);

    return (
        <section className="dashboard-card upcoming-appointments">
            <div className="dashboard-card-header">
                <h2>Upcoming Appointments</h2>
                <Link to="/my-appointments">View All</Link>
            </div>

            {loading ? (
                <div className="empty-state">
                    <i className="bi bi-hourglass-split"></i>
                    <p>Loading appointments...</p>
                </div>
            ) : error ? (
                <div className="empty-state">
                    <i className="bi bi-exclamation-circle"></i>
                    <p>{error}</p>
                </div>
            ) : appointments.length === 0 ? (
                <div className="empty-state">
                    <i className="bi bi-calendar-x"></i>
                    <p>No upcoming appointments</p>
                </div>
            ) : (
                <div className="appointment-list">
                    {appointments.map((appointment) => (
                        <div key={appointment.id || appointment.appointmentId} className="appointment-item">
                            <div className="appointment-icon">
                                <i className="bi bi-calendar2-heart"></i>
                            </div>

                            <div className="appointment-info">
                                <h3>
                                    {appointment.doctorName
                                        || appointment.doctor?.fullName
                                        || 'Doctor'}
                                </h3>
                                <p>
                                    {appointment.specialty
                                        || appointment.doctor?.specialty
                                        || ''}{' '}
                                    ·{' '}
                                    {formatAppointmentTime(
                                        appointment.appointmentDate || appointment.scheduledTime
                                    )}
                                </p>
                            </div>

                            <div className="appointment-meta">
                                <span>
                                    {appointment.type || appointment.appointmentType || 'Offline'}
                                </span>
                                <small>{appointment.status}</small>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default UpcomingAppointments;