import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { getProfile } from '../../api/account';
import { getMyRooms } from '../../api/chatApi';
import stompChatService from '../../services/stompChatService';
import Swal from 'sweetalert2';

/**
 * PatientSidebar - Thanh điều hướng bên trái cho bệnh nhân.
 * Hiển thị tên và email thật của bệnh nhân từ API profile.
 */
const PatientSidebar = () => {
    const { logout, token } = useAuth();
    const [patientInfo, setPatientInfo] = useState({ name: 'Bệnh nhân', email: '', avatarUrl: '' });
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = useCallback(async () => {
        if (!token) return;
        try {
            const rooms = await getMyRooms();
            const total = rooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
            setUnreadCount(total);
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;

        refreshUnreadCount();

        const unsub = stompChatService.subscribeToChat(() => {
            setTimeout(() => {
                refreshUnreadCount();
            }, 1000);
        });

        const handleReadUpdate = () => {
            refreshUnreadCount();
        };
        window.addEventListener('chat-read-updated', handleReadUpdate);

        return () => {
            unsub();
            window.removeEventListener('chat-read-updated', handleReadUpdate);
        };
    }, [token, refreshUnreadCount]);

    useEffect(() => {
        if (!token) return;

        const fetchProfile = async () => {
            try {
                const data = await getProfile(token);
                setPatientInfo({
                    name: data?.fullName || data?.username || data?.name || 'Bệnh nhân',
                    email: data?.email || '',
                    avatarUrl: data?.avatarUrl || '',
                });
            } catch (error) {
                console.error('PatientSidebar: Failed to fetch profile', error);
            }
        };

        fetchProfile();

        window.addEventListener('profile-updated', fetchProfile);
        return () => window.removeEventListener('profile-updated', fetchProfile);
    }, [token]);

    const handleLogout = () => {
        Swal.fire({
            title: 'Logout?',
            text: "Are you sure you want to logout from the system?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e8604c',
            cancelButtonColor: '#6f7f7b',
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'No, Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
            }
        });
    };

    const menuItems = [
        { isHeader: true, label: 'Consultation' },
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
            label: 'Chat',
            icon: 'bi bi-chat-dots-fill',
            path: '/patient-dashboard/chat',
        },
        { isHeader: true, label: 'Medical Data' },
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
        { isHeader: true, label: 'Medication' },
        {
            label: 'Prescriptions',
            icon: 'bi bi-capsule',
            path: '/patient-dashboard/prescriptions',
        },
        {
            label: 'Pharmacy',
            icon: 'bi bi-shop',
            path: '/patient-dashboard/pharmacy',
        },
        {
            label: 'Medicine Reminder',
            icon: 'bi bi-alarm-fill',
            path: '/patient-dashboard/reminders',
        },
        { isHeader: true, label: 'Account' },
        {
            label: 'Profile',
            icon: 'bi bi-person-circle',
            path: '/patient-dashboard/profile',
        },
    ];

    return (
        <aside className="patient-sidebar d-print-none">
            <div className="patient-sidebar-brand">
                <div className="patient-sidebar-logo">+</div>
                <div>
                    <h2>HealthLink</h2>
                    <p>Patient Portal</p>
                </div>
            </div>

            <nav className="patient-sidebar-nav">
                {menuItems.map((item, index) => {
                    if (item.isHeader) {
                        return (
                            <div key={`header-${index}`} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', padding: '20px 24px 8px 24px', letterSpacing: '1px' }}>
                                {item.label}
                            </div>
                        );
                    }
                    return (
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
                            {item.label === 'Chat' && unreadCount > 0 && (
                                <span className="badge rounded-pill bg-danger ms-auto px-2 py-1" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="patient-sidebar-footer" style={{ marginTop: 'auto' }}>
                <div className="patient-sidebar-user">
                    <div className="patient-sidebar-avatar">
                        <img
                            src={patientInfo.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${patientInfo.name}`}
                            alt="avatar"
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </div>
                    <div>
                        <strong>{patientInfo.name}</strong>
                        <span>{patientInfo.email}</span>
                    </div>
                </div>

                <button
                    className="patient-logout-btn"
                    onClick={handleLogout}
                    title="Logout from system"
                >
                    <i className="bi bi-box-arrow-right"></i>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default PatientSidebar;
