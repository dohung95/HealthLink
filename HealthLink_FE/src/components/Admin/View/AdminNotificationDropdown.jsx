import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications } from '../Context/AdminNotificationContext';
import '../Css/AdminNotificationDropdown.css';

/**
 * Component hiển thị dropdown thông báo cho Admin
 *
 * Features:
 *  - Realtime notifications via WebSocket
 *  - Badge hiển thị số chưa đọc
 *  - Click để đánh dấu đã đọc
 *  - Navigate đến trang liên quan
 *  - Mark all as read
 *  - Delete notification
 */
const AdminNotificationDropdown = () => {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    // Lấy state và actions từ context
    const {
        notifications,
        unreadCount,
        loading,
        isConnected,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        getNotificationConfig
    } = useAdminNotifications();

    // Close dropdown khi click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Toggle dropdown
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            refreshNotifications();
        }
    };

    // Format thời gian
    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    // Xử lý click vào notification
    const handleNotificationClick = async (notification) => {
        // Đánh dấu đã đọc nếu chưa đọc
        if (!notification.read) {
            await markAsRead(notification.notificationId);
        }

        // Navigate đến trang liên quan
        const config = getNotificationConfig(notification.type);
        if (config.actionUrl) {
            navigate(config.actionUrl);
            setIsOpen(false);
        }
    };

    // Xử lý xóa notification
    const handleDelete = async (e, notificationId) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
    };

    // Xử lý mark all as read
    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    // Render notification item
    const renderNotificationItem = (notification) => {
        const config = getNotificationConfig(notification.type);

        return (
            <div
                key={notification.notificationId}
                className={`admin-notif-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
            >
                {/* Icon */}
                <div
                    className="admin-notif-icon"
                    style={{
                        backgroundColor: config.bgColor,
                        color: config.color
                    }}
                >
                    <i className={`bi ${config.icon}`}></i>
                </div>

                {/* Content */}
                <div className="admin-notif-content">
                    {notification.title && (
                        <p className="admin-notif-title">{notification.title}</p>
                    )}
                    <p className="admin-notif-message">{notification.message}</p>
                    <span className="admin-notif-time">
                        {formatTimeAgo(notification.createdAt)}
                    </span>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                    <span className="admin-notif-unread-dot"></span>
                )}

                {/* Delete button */}
                <button
                    className="admin-notif-delete"
                    onClick={(e) => handleDelete(e, notification.notificationId)}
                    title="Delete"
                >
                    <i className="bi bi-x"></i>
                </button>
            </div>
        );
    };

    return (
        <div className="admin-notification-dropdown" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                className={`admin-notif-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={toggleDropdown}
                aria-label="Notifications"
            >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                    <span className="admin-notif-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="admin-notif-menu">
                    {/* Header */}
                    <div className="admin-notif-header">
                        <div className="admin-notif-header-left">
                            <h6>Notifications</h6>
                            {/* Connection status */}
                            <span className={`admin-notif-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                <i className={`bi ${isConnected ? 'bi-wifi' : 'bi-wifi-off'}`}></i>
                            </span>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                className="admin-notif-mark-all"
                                onClick={handleMarkAllAsRead}
                            >
                                <i className="bi bi-check-all"></i>
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="admin-notif-body">
                        {loading ? (
                            <div className="admin-notif-loading">
                                <div className="spinner-border spinner-border-sm"></div>
                                <span>Loading...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="admin-notif-empty">
                                <i className="bi bi-bell-slash"></i>
                                <p>No notifications</p>
                                <span>You're all caught up!</span>
                            </div>
                        ) : (
                            <div className="admin-notif-list">
                                {notifications.slice(0, 10).map(renderNotificationItem)}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="admin-notif-footer">
                            <button
                                className="admin-notif-view-all"
                                onClick={() => {
                                    navigate('/admin/notifications');
                                    setIsOpen(false);
                                }}
                            >
                                View all notifications
                                <i className="bi bi-arrow-right"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminNotificationDropdown;
