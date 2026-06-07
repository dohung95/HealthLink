import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../api/appointmentApi';
import { healthRecordApi } from '../../api/healthRecordApi';
import { prescriptionService } from '../../api/prescriptionApi';
import { getProfile } from '../../api/account';


/**
 * PatientStats - Hiển thị các số liệu thống kê của bệnh nhân.
 * Lấy dữ liệu thật từ các API tương ứng.
 */
const PatientStats = () => {
    const { token } = useAuth();
    const [statsData, setStatsData] = useState({
        upcomingAppointments: 0,
        healthRecords: 0,
        prescriptions: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        const fetchStats = async () => {
            try {
                // Gọi song song để tối ưu thời gian tải
                const profile = await getProfile(token);

                const [appointments, records, prescriptions] = await Promise.allSettled([
                    appointmentService.getPatientAppointments(profile.userId),
                    healthRecordApi.getMyRecords(profile.userId, 1, 1),
                    prescriptionService.getMyPrescriptions(),
                ]);

                // Lọc các lịch hẹn sắp tới (status: Scheduled)
                const upcomingCount = appointments.status === 'fulfilled'
                    ? (Array.isArray(appointments.value) ? appointments.value : []).filter(
                        (a) => a.status === 'Scheduled' || a.status === 'Confirmed'
                    ).length
                    : 0;

                const recordsCount = records.status === 'fulfilled'
                    ? records.value?.totalItems ?? 0
                    : 0;

                const prescriptionsCount = prescriptions.status === 'fulfilled'
                    ? (Array.isArray(prescriptions.value) ? prescriptions.value.length : 0)
                    : 0;

                setStatsData({
                    upcomingAppointments: upcomingCount,
                    healthRecords: recordsCount,
                    prescriptions: prescriptionsCount,
                });
            } catch (error) {
                console.error('PatientStats: Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    const stats = [
        {
            title: 'Upcoming Appointments',
            value: loading ? '...' : statsData.upcomingAppointments,
            icon: 'bi bi-calendar-check',
            tone: 'teal',
        },
        {
            title: 'Health Records',
            value: loading ? '...' : statsData.healthRecords,
            icon: 'bi bi-file-earmark-medical',
            tone: 'blue',
        },
        {
            title: 'Prescriptions',
            value: loading ? '...' : statsData.prescriptions,
            icon: 'bi bi-capsule',
            tone: 'amber',
        },
    ];

    return (
        <section className="patient-stats">
            {stats.map((stat) => (
                <div key={stat.title} className={`patient-stat-card ${stat.tone}`}>
                    <div className="patient-stat-icon">
                        <i className={stat.icon}></i>
                    </div>

                    <div>
                        <h3>{stat.value}</h3>
                        <p>{stat.title}</p>
                    </div>
                </div>
            ))}
        </section>
    );
};

export default PatientStats;