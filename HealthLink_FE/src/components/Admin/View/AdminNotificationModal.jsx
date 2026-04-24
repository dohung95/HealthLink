import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../Css/AdminNotificationModal.css';

const AdminNotificationModal = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    const API_URL = 'https://localhost:7267/api/admin/notifications';

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // Fetch all notifications (without limit)
    const fetchAllNotifications = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_URL, {
                headers: getAuthHeader()
            });

            if (response.data) {
                setNotifications(response.data.notifications || []);
                setTotalCount(response.data.totalCount || 0);
                setUnreadCount(response.data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching all notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await axios.put(`${API_URL}/mark-all-read`, {}, {
                headers: getAuthHeader()
            });

            // Update local state
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Mark single notification as read
    const markAsRead = async (notificationId) => {
        try {
            await axios.put(`${API_URL}/${notificationId}/mark-read`, {}, {
                headers: getAuthHeader()
            });

            // Update local state
            setNotifications(notifications.map(n =>
                n.notificationID === notificationId ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId, event) => {
        // Prevent triggering markAsRead
        event.stopPropagation();

        try {
            await axios.delete(`${API_URL}/${notificationId}`, {
                headers: getAuthHeader()
            });

            // Update local state - remove notification
            setNotifications(prevNotifications =>
                prevNotifications.filter(n => n.notificationID !== notificationId)
            );
            setTotalCount(prev => prev - 1);

            // Update unread count if it was unread
            const notification = notifications.find(n => n.notificationID === notificationId);
            if (notification && !notification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // Fetch notifications when modal opens and auto-refresh every 3 seconds while open
    useEffect(() => {
        if (isOpen) {
            fetchAllNotifications();

            // Refresh every 3 seconds (3000 ms) while modal is open
            const intervalId = setInterval(fetchAllNotifications, 3000);

            return () => clearInterval(intervalId);
        }
    }, [isOpen]);

    // Format time ago
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        if (type === 'UserRegistration') {
            return 'bi-person-plus-fill';
        }
        return 'bi-calendar-check-fill';
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="admin-notification-modal-overlay" onClick={onClose}>
            <div className="admin-notification-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-notification-modal-header">
                    <h4>
                        <i className="bi bi-bell-fill"></i>
                        All Notifications
                    </h4>
                    <div className="admin-notification-modal-header-actions">
                        {unreadCount > 0 && (
                            <button
                                className="admin-notification-modal-mark-all"
                                onClick={markAllAsRead}
                            >
                                <i className="bi bi-check-all"></i> Mark all as read ({unreadCount})
                            </button>
                        )}
                    </div>
                    <button
                        className="admin-notification-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="admin-notification-modal-body">
                    {loading ? (
                        <div className="admin-notification-modal-loading">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p>Loading notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="admin-notification-modal-empty">
                            <i className="bi bi-bell-slash"></i>
                            <h5>No notifications</h5>
                            <p>You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="admin-notification-modal-list">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.notificationID}
                                    className={`admin-notification-modal-item ${!notification.isRead ? 'unread' : ''}`}
                                    onClick={() => !notification.isRead && markAsRead(notification.notificationID)}
                                >
                                    <div className="admin-notification-modal-icon">
                                        <i className={`bi ${getNotificationIcon(notification.notificationType)}`}></i>
                                    </div>
                                    <div className="admin-notification-modal-content">
                                        <p className="admin-notification-modal-message">
                                            {notification.message}
                                        </p>
                                        <span className="admin-notification-modal-time">
                                            {formatTimeAgo(notification.createdAt)}
                                        </span>
                                    </div>
                                    {!notification.isRead && (
                                        <div className="admin-notification-modal-unread-dot"></div>
                                    )}
                                    <button
                                        className="admin-notification-modal-delete-btn"
                                        onClick={(e) => deleteNotification(notification.notificationID, e)}
                                        aria-label="Delete notification"
                                    >
                                        <i className="bi bi-x"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="admin-notification-modal-footer">
                    <p className="admin-notification-modal-count">
                        Total: {totalCount} notification{totalCount !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AdminNotificationModal;
