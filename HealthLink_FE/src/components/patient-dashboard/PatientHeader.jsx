import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../../api/account';
import { notificationApi } from '../../api/notificationApi';
import { useNotifications } from '../../context/NotificationContext';

/**
 * PatientHeader - Hiển thị lời chào, ngày hiện tại và notification bell cho bệnh nhân.
 */
const PatientHeader = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const notificationRef = useRef(null);
    const [patientName, setPatientName] = useState('Patient');
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const { unreadCount, markAsRead: contextMarkAsRead, refreshUnreadCount } = useNotifications();

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
                const name = data?.username || data?.fullName || data?.name || 'Patient';
                setPatientName(name);
            } catch (error) {
                console.error('PatientHeader: Failed to fetch profile', error);
            }
        };

        fetchProfile();
    }, [token]);

    // Fetch notifications when dropdown opens
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationApi.getMyNotifications();
            setNotifications(data || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDropdown = () => {
        if (!showDropdown) {
            fetchNotifications();
        }
        setShowDropdown(!showDropdown);
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationApi.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true, read: true } : n)
            );
            // Update global unread count in context
            contextMarkAsRead(notificationId);
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
            // Refresh unread count from server
            await refreshUnreadCount();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead && !notification.read) {
            await handleMarkAsRead(notification.notificationId);
        }
        setShowDropdown(false);

        // Navigate based on notification type
        if (notification.type?.includes('APPOINTMENT') || notification.appointmentId || notification.relatedId) {
            navigate('/patient-dashboard/appointments');
        } else if (notification.type?.includes('PRESCRIPTION')) {
            navigate('/patient-dashboard/prescriptions');
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format time ago
    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Get icon based on notification type
    const getNotificationIcon = (type) => {
        if (type?.includes('CANCEL')) return 'bi-calendar-x text-danger';
        if (type?.includes('REASSIGN')) return 'bi-arrow-left-right text-warning';
        if (type?.includes('APPOINTMENT')) return 'bi-calendar-check text-primary';
        if (type?.includes('PRESCRIPTION')) return 'bi-capsule text-success';
        return 'bi-bell text-secondary';
    };

    return (
        <section className="patient-header">
            <div>
                <h1>Hello, {patientName} 👋</h1>
            </div>

            <div className="patient-header-actions">
                {/* Notification Bell */}
                <div className="patient-notification-wrapper" ref={notificationRef}>
                    <button
                        className="patient-notification-btn"
                        onClick={handleToggleDropdown}
                        aria-label="Notifications"
                    >
                        <i className="bi bi-bell"></i>
                        {unreadCount > 0 && (
                            <span className="patient-notification-badge">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showDropdown && (
                        <div className="patient-notification-dropdown">
                            <div className="patient-notification-header">
                                <h4>Notifications</h4>
                                {notifications.some(n => !n.isRead && !n.read) && (
                                    <button
                                        className="patient-mark-all-btn"
                                        onClick={handleMarkAllAsRead}
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="patient-notification-list">
                                {loading ? (
                                    <div className="patient-notification-loading">
                                        <div className="spinner-border spinner-border-sm" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="patient-notification-empty">
                                        <i className="bi bi-bell-slash"></i>
                                        <p>No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.slice(0, 10).map((notification) => (
                                        <div
                                            key={notification.notificationId}
                                            className={`patient-notification-item ${!notification.isRead && !notification.read ? 'unread' : ''}`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="patient-notification-icon">
                                                <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                                            </div>
                                            <div className="patient-notification-content">
                                                <p className="patient-notification-title">
                                                    {notification.title || 'Notification'}
                                                </p>
                                                <p className="patient-notification-message">
                                                    {notification.message}
                                                </p>
                                                <span className="patient-notification-time">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                            {!notification.isRead && !notification.read && (
                                                <div className="patient-notification-dot"></div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {notifications.length > 10 && (
                                <div className="patient-notification-footer">
                                    <button onClick={() => navigate('/patient-dashboard/notifications')}>
                                        View all notifications
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Date */}
                <div className="patient-header-date">
                    <i className="bi bi-calendar-event"></i>
                    <span>{today}</span>
                </div>
            </div>
        </section>
    );
};

export default PatientHeader;