import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../Css/AdminNotificationDropdown.css';
import AdminNotificationModal from './AdminNotificationModal';

const AdminNotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const dropdownRef = useRef(null);

    const API_URL = 'https://localhost:7267/api/admin/notifications';

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // Fetch notifications (limit to 10 for dropdown)
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}?limit=10`, {
                headers: getAuthHeader()
            });

            if (response.data) {
                setNotifications(response.data.notifications || []);
                setUnreadCount(response.data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
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
            console.error('Error marking notifications as read:', error);
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

            // Update unread count if it was unread
            const notification = notifications.find(n => n.notificationID === notificationId);
            if (notification && !notification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // Toggle dropdown
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            fetchNotifications();
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial fetch and auto-refresh every 3 seconds
    useEffect(() => {
        fetchNotifications();

        // Refresh every 3 seconds (3000 ms)
        const intervalId = setInterval(fetchNotifications, 3000);

        return () => clearInterval(intervalId);
    }, []);

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

    return (
        <div className="admin-notification-dropdown" ref={dropdownRef}>
            <button
                className="admin-icon-btn position-relative"
                onClick={toggleDropdown}
                aria-label="Notifications"
            >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                    <span className="admin-notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="admin-notification-dropdown-menu">
                    <div className="admin-notification-header">
                        <h6 className="mb-0">Notifications</h6>
                        {unreadCount > 0 && (
                            <button
                                className="admin-notification-mark-all"
                                onClick={markAllAsRead}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="admin-notification-list">
                        {loading ? (
                            <div className="admin-notification-loading">
                                <div className="spinner-border spinner-border-sm" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="admin-notification-empty">
                                <i className="bi bi-bell-slash"></i>
                                <p>No notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.notificationID}
                                    className={`admin-notification-item ${!notification.isRead ? 'unread' : ''}`}
                                    onClick={() => !notification.isRead && markAsRead(notification.notificationID)}
                                >
                                    <div className="admin-notification-icon">
                                        <i className={`bi ${getNotificationIcon(notification.notificationType)}`}></i>
                                    </div>
                                    <div className="admin-notification-content">
                                        <p className="admin-notification-message">{notification.message}</p>
                                        <span className="admin-notification-time">
                                            {formatTimeAgo(notification.createdAt)}
                                        </span>
                                    </div>
                                    {!notification.isRead && (
                                        <div className="admin-notification-unread-dot"></div>
                                    )}
                                    <button
                                        className="admin-notification-delete-btn"
                                        onClick={(e) => deleteNotification(notification.notificationID, e)}
                                        aria-label="Delete notification"
                                    >
                                        <i className="bi bi-x"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="admin-notification-footer">
                            <button
                                className="admin-notification-view-all"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsModalOpen(true);
                                }}
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}

            <AdminNotificationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchNotifications(); // Refresh dropdown when modal closes
                }}
            />
        </div>
    );
};

export default AdminNotificationDropdown;
