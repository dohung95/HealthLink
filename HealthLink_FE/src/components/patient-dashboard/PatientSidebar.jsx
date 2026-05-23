import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { getProfile } from '../../api/account';

/**
 * PatientSidebar - Thanh điều hướng bên trái cho bệnh nhân.
 * Hiển thị tên và email thật của bệnh nhân từ API profile.
 */
const PatientSidebar = () => {
    const { logout, token } = useAuth();
    const [patientInfo, setPatientInfo] = useState({ name: 'Bệnh nhân', email: '' });

    useEffect(() => {
        if (!token) return;

        const fetchProfile = async () => {
            try {
                const data = await getProfile(token);
                setPatientInfo({
                    name: data?.username || data?.fullName || data?.name || 'Bệnh nhân',
                    email: data?.email || '',
                });
            } catch (error) {
                console.error('PatientSidebar: Failed to fetch profile', error);
            }
        };

        fetchProfile();
    }, [token]);

    const menuItems = [
        {
            label: 'Dashboard',
            icon: 'bi bi-grid-1x2-fill',
            path: '/patient-dashboard',
            end: true,
        },
        {
            label: 'Booking',
            icon: 'bi bi-calendar-plus-fill',
            path: '/patient-dashboard/booking',
        },
        {
            label: 'My Appointment',
            icon: 'bi bi-calendar-check-fill',
            path: '/patient-dashboard/appointments',
        },
        {
            label: 'Health records',
            icon: 'bi bi-file-medical-fill',
            path: '/patient-dashboard/health-records',
        },
        {
            label: 'Share records',
            icon: 'bi bi-share-fill',
            path: '/patient-dashboard/share-records',
        },
        {
            label: 'Prescriptions',
            icon: 'bi bi-capsule',
            path: '/patient-dashboard/prescriptions',
        },
        {
            label: 'Profile',
            icon: 'bi bi-person-circle',
            path: '/patient-dashboard/profile',
        },
    ];


    // Lấy 2 chữ cái đầu của tên làm avatar
    const avatarInitials = patientInfo.name
        .split(' ')
        .slice(-2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <aside className="patient-sidebar">
            <div className="patient-sidebar-brand">
                <div className="patient-sidebar-logo">+</div>
                <div>
                    <h2>HealthLink</h2>
                    <p>Patient Portal</p>
                </div>
            </div>

            <nav className="patient-sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            `patient-sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >

                        <i className={item.icon}></i>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="patient-sidebar-footer">
                <div className="patient-sidebar-user">
                    <div className="patient-sidebar-avatar">{avatarInitials || 'BN'}</div>
                    <div>
                        <strong>{patientInfo.name}</strong>
                        <span>{patientInfo.email}</span>
                    </div>
                </div>

                <button className="patient-logout-btn" onClick={logout}>
                    <i className="bi bi-box-arrow-right"></i>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default PatientSidebar;