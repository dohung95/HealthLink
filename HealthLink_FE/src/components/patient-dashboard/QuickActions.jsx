import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../api/appointmentApi';
import { doctorService } from '../../api/doctorApi';


const QuickActions = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    // State cho lịch hẹn sắp tới
    const [appointments, setAppointments] = useState([]);
    const [loadingAppts, setLoadingAppts] = useState(true);

    // State cho bác sĩ đề xuất
    const [doctors, setDoctors] = useState([]);
    const [loadingDoctors, setLoadingDoctors] = useState(true);

    // Fetch lịch hẹn sắp tới
    useEffect(() => {
        if (!token) return;
        const fetch = async () => {
            try {
                const data = await getPatientAppointments(patientId)
;
                const upcoming = (Array.isArray(data) ? data : [])
                    .filter(a => a.status === 'Scheduled' || a.status === 'Confirmed')
                    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
                    .slice(0, 3); // Chỉ lấy 3 lịch gần nhất
                setAppointments(upcoming);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingAppts(false);
            }
        };
        fetch();
    }, [token]);

    // Fetch danh sách bác sĩ (lấy top 2 làm "đề xuất")
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const data = await doctorService.getAllDoctors();

                // Debug: xem cấu trúc thực tế từ API
                console.log('[QuickActions] doctors raw response:', data);

                // Xử lý nhiều dạng response có thể từ backend
                let list = [];
                if (Array.isArray(data)) {
                    list = data;
                } else if (Array.isArray(data?.data)) {
                    list = data.data;
                } else if (Array.isArray(data?.doctors)) {
                    list = data.doctors;
                } else if (Array.isArray(data?.items)) {
                    list = data.items;
                }

                setDoctors(list.slice(0, 2));
            } catch (e) {
                console.error('[QuickActions] Failed to fetch doctors:', e);
            } finally {
                setLoadingDoctors(false);
            }
        };
        fetchDoctors();
    }, []);

    // Format thời gian lịch hẹn
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    // Tạo initials avatar từ tên bác sĩ
    const getInitials = (name = '') =>
        name.split(' ').slice(-2).map(w => w[0]?.toUpperCase() ?? '').join('');



    return (
        <section className="dashboard-panels">

            {/* === Card trái: Lịch hẹn sắp tới === */}
            <div className="dashboard-card upcoming-mini">
                <div className="dashboard-card-header">
                    <h2>Upcoming Appointments</h2>
                </div>

                {loadingAppts ? (
                    <p className="panel-loading">Loading...</p>
                ) : appointments.length === 0 ? (
                    <p className="panel-empty">No upcoming appointments</p>
                ) : (
                    <div className="appt-mini-list">
                        {appointments.map((a) => (
                            <div key={a.id || a.appointmentId} className="appt-mini-item">
                                <div className="appt-mini-icon">
                                    <i className="bi bi-camera-video"></i>
                                </div>
                                <div className="appt-mini-info">
                                    <strong>{a.doctorName || a.doctor?.fullName || 'Doctor'}</strong>
                                    <span>{a.specialty || a.doctor?.specialty} · {formatTime(a.appointmentDate)}</span>
                                </div>
                                <span className="appt-mini-badge">
                                    {a.type || a.appointmentType || 'Offline'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <Link to="/patient-dashboard/appointments" className="panel-link-btn">
                    View all appointments
                </Link>
            </div>

            {/* === Card phải: Bác sĩ đề xuất === */}
            <div className="dashboard-card suggested-doctors">
                <div className="dashboard-card-header">
                    <h2>Suggested Doctors</h2>
                </div>

                {loadingDoctors ? (
                    <p className="panel-loading">Loading...</p>
                ) : doctors.length === 0 ? (
                    <p className="panel-empty">No doctors available</p>
                ) : (
                    <div className="doctor-suggest-list">
                        {doctors.map((doc) => (
                            <div key={doc.doctorId} className="doctor-suggest-item">
                                <div className="doctor-suggest-avatar">
                                    {getInitials(doc.fullName || doc.name)}
                                </div>
                                <div className="doctor-suggest-info">
                                    <strong>{doc.fullName || doc.name}</strong>
                                    <div className="doctor-suggest-meta">
                                        <span className="doctor-tag">{doc.specialtyName}</span>
                                        {doc.averageRating && (
                                            <span className="doctor-rating">⭐ {doc.averageRating.toFixed(1)}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="book-btn"
                                    onClick={() => navigate(`/patient-dashboard/book/${doc.doctorId}`)}
                                >
                                    Book
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <Link to="/doctors" className="panel-link-btn">
                    View all doctors
                </Link>
            </div>

        </section>
    );

}

export default QuickActions;