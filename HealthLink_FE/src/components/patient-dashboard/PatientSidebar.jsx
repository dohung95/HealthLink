import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { getProfile } from '../../api/account';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

/**
 * PatientSidebar - Thanh điều hướng bên trái cho bệnh nhân.
 * Hiển thị tên và email thật của bệnh nhân từ API profile.
 */
const PatientSidebar = () => {
    const { logout, token } = useAuth();
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [patientInfo, setPatientInfo] = useState({ name: 'Bệnh nhân', email: '', avatarUrl: '' });

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
    }, [token]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        if (!notification.isRead && notification.notificationId) {
            markAsRead(notification.notificationId);
        }
        setShowDropdown(false);
        if (notification.type === 'PRESCRIPTION_ISSUED' || notification.type === 'NEW_PRESCRIPTION') {
            navigate('/patient-dashboard/prescriptions');
        } else if (notification.type === 'PAYMENT_REQUIRED') {
            navigate('/patient-dashboard/prescriptions');
        } else if (notification.type === 'ORDER_STATUS') {
            navigate('/patient-dashboard/prescriptions');
        } else if (notification.type === 'APPOINTMENT_REMINDER') {
            navigate('/patient-dashboard/appointments');
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return diffMin + 'm ago';
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return diffHr + 'h ago';
        return d.toLocaleDateString();
    };

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
    // const avatarInitials = patientInfo.name
    //     .split(' ')
    //     .slice(-2)
    //     .map((w) => w[0]?.toUpperCase() ?? '')
    //     .join('');

    return (
        <aside className="patient-sidebar">
            <div className="patient-sidebar-brand">
                <div className="patient-sidebar-logo">+</div>
                <div>
                    <h2>HealthLink</h2>
                    <p>Patient Portal</p>
                </div>
                <div className="patient-notification-wrapper" style={{ marginLeft: 'auto' }} ref={dropdownRef}>
                    <button
                        className="patient-notification-btn"
                        onClick={() => setShowDropdown(prev => !prev)}
                        type="button"
                    >
                        <i className="bi bi-bell-fill"></i>
                        {unreadCount > 0 && (
                            <span className="patient-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>
                    {showDropdown && (
                        <div className="patient-notification-dropdown">
                            <div className="patient-notification-header">
                                <h4>Notifications</h4>
                                {unreadCount > 0 && (
                                    <button
                                        className="patient-mark-all-btn"
                                        onClick={() => {
                                            notifications.forEach(n => {
                                                if (!n.isRead && n.notificationId) markAsRead(n.notificationId);
                                            });
                                            setShowDropdown(false);
                                        }}
                                        type="button"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                            <div className="patient-notification-list">
                                {notifications.length === 0 ? (
                                    <div className="patient-notification-empty">
                                        <i className="bi bi-bell-slash"></i>
                                        <p>No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.notificationId || n.createdAt}
                                            className={`patient-notification-item ${!n.isRead ? 'unread' : ''}`}
                                            onClick={() => handleNotificationClick(n)}
                                        >
                                            <div className="patient-notification-icon">
                                                <i className="bi bi-bell"></i>
                                            </div>
                                            <div className="patient-notification-content">
                                                <div className="patient-notification-title">{n.title || 'Notification'}</div>
                                                <div className="patient-notification-message">{n.message}</div>
                                                <div className="patient-notification-time">{formatTime(n.createdAt)}</div>
                                            </div>
                                            {!n.isRead && <div className="patient-notification-dot" />}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="patient-notification-footer">
                                <button onClick={() => setShowDropdown(false)} type="button">
                                    View all notifications
                                </button>
                            </div>
                        </div>
                    )}
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

                <button className="patient-logout-btn" onClick={logout}>
                    <i className="bi bi-box-arrow-right"></i>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default PatientSidebar;