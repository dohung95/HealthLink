import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { getProfile } from '../../api/account';

/**
 * PatientHeader - Hiển thị lời chào và ngày hiện tại cho bệnh nhân.
 * Lấy tên bệnh nhân thật từ API profile.
 */
const PatientHeader = () => {
    const { token } = useAuth();
    const [patientName, setPatientName] = useState('Bệnh nhân');

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    useEffect(() => {
        if (!token) return;

        const fetchProfile = async () => {
            try {
                const data = await getProfile(token);
                // API trả về username hoặc fullName
                const name = data?.username || data?.fullName || data?.name || 'Bệnh nhân';
                setPatientName(name);
            } catch (error) {
                console.error('PatientHeader: Failed to fetch profile', error);
            }
        };

        fetchProfile();
    }, [token]);

    return (
        <section className="patient-header">
            <div>
                <h1>Hello, {patientName} 👋</h1>
            </div>

            <div className="patient-header-date">
                <i className="bi bi-calendar-event"></i>
                <span>{today}</span>
            </div>
        </section>
    );
};

export default PatientHeader;