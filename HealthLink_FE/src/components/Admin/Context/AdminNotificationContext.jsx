import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import stompAdminService from '../../../services/stompAdminService';
import adminNotificationApi from '../../../api/adminNotificationApi';
import { useAuth } from '../../../context/AuthContext';

/**
 * Context quản lý Notification cho Admin Dashboard
 *
 * Cung cấp:
 *  - notifications: Danh sách thông báo
 *  - unreadCount: Số thông báo chưa đọc
 *  - loading: Trạng thái loading
 *  - isConnected: Trạng thái WebSocket
 *  - markAsRead(id): Đánh dấu đã đọc
 *  - markAllAsRead(): Đánh dấu tất cả đã đọc
 *  - deleteNotification(id): Xóa thông báo
 *  - refreshNotifications(): Làm mới danh sách
 *
 * Notification Types cho Admin:
 *  - NEW_REGISTRATION: Doctor/Pharmacy đăng ký mới → /admin/registrations
 *  - NEW_APPOINTMENT: Lịch hẹn mới → /admin/appointments
 *  - APPOINTMENT_CANCELLED: Lịch hẹn bị hủy → /admin/appointments
 *  - NEW_COMMISSION: Giao dịch hoa hồng → /admin/commission
 *  - PAYMENT_RECEIVED: Thanh toán mới → /admin
 */

const AdminNotificationContext = createContext(null);

// Custom hook để sử dụng context
export const useAdminNotifications = () => {
    const context = useContext(AdminNotificationContext);
    if (!context) {
        throw new Error('useAdminNotifications must be used within AdminNotificationProvider');
    }
    return context;
};

// Notification type configurations
const NOTIFICATION_CONFIG = {
    NEW_REGISTRATION: {
        icon: 'bi-person-plus-fill',
        color: '#6f42c1',
        bgColor: 'rgba(111, 66, 193, 0.1)',
        actionUrl: '/admin/registrations',
        sound: true
    },
    NEW_APPOINTMENT: {
        icon: 'bi-calendar-plus-fill',
        color: '#0d6efd',
        bgColor: 'rgba(13, 110, 253, 0.1)',
        actionUrl: '/admin/appointments',
        sound: true
    },
    CANCEL_APPOINTMENT: {
        icon: 'bi-calendar-x-fill',
        color: '#dc3545',
        bgColor: 'rgba(220, 53, 69, 0.1)',
        actionUrl: '/admin/appointments',
        sound: true
    },
    NEW_COMMISSION: {
        icon: 'bi-currency-exchange',
        color: '#198754',
        bgColor: 'rgba(25, 135, 84, 0.1)',
        actionUrl: '/admin/commission',
        sound: false
    },
    INVOICE_PAID: {
        icon: 'bi-credit-card-fill',
        color: '#20c997',
        bgColor: 'rgba(32, 201, 151, 0.1)',
        actionUrl: '/admin',
        sound: false
    },
    DEFAULT: {
        icon: 'bi-bell-fill',
        color: '#6c757d',
        bgColor: 'rgba(108, 117, 125, 0.1)',
        actionUrl: '/admin',
        sound: false
    }
};

// Notification sound
const playNotificationSound = () => {
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Ignore autoplay errors (browser policy)
        });
    } catch (e) {
        // Ignore errors
    }
};

// Show browser notification
const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.DEFAULT;
        new Notification(notification.title || 'New Notification', {
            body: notification.message,
            icon: '/logo.png',
            tag: `admin-notification-${notification.notificationId}`,
            requireInteraction: false
        });
    }
};

export const AdminNotificationProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0
    });

    // Ref để tránh duplicate fetch
    const isFetching = useRef(false);

    /**
     * Load notifications từ REST API
     */
    const fetchNotifications = useCallback(async (page = 0) => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            setLoading(true);

            const [notifResponse, unreadResponse] = await Promise.all([
                adminNotificationApi.getNotifications(page, pagination.size),
                adminNotificationApi.getUnreadCount()
            ]);

            // Handle paginated response
            const content = notifResponse.content || notifResponse || [];
            setNotifications(content);
            setUnreadCount(unreadResponse);

            setPagination(prev => ({
                ...prev,
                page: notifResponse.number || page,
                totalElements: notifResponse.totalElements || content.length,
                totalPages: notifResponse.totalPages || 1
            }));

        } catch (error) {
            console.error('[AdminNotification] Error fetching notifications:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [pagination.size]);

    /**
     * Xử lý notification mới từ WebSocket
     */
    const handleNewNotification = useCallback((notification) => {
        console.log('[AdminNotification] New notification received:', notification);

        // Thêm vào đầu danh sách
        setNotifications(prev => {
            // Tránh duplicate
            const exists = prev.some(n => n.notificationId === notification.notificationId);
            if (exists) return prev;
            return [notification, ...prev];
        });

        // Tăng unread count
        setUnreadCount(prev => prev + 1);

        // Play sound nếu cần
        const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.DEFAULT;
        if (config.sound) {
            playNotificationSound();
        }

        // Show browser notification
        showBrowserNotification(notification);

    }, []);

    /**
     * Kết nối WebSocket khi có token
     */
    useEffect(() => {
        if (!token) {
            setIsConnected(false);
            return;
        }

        // Kết nối STOMP
        stompAdminService.connect(token, () => {
            setIsConnected(true);
        });

        // Đăng ký callback nhận notification
        stompAdminService.onNotification('admin-context', handleNewNotification);

        // Load notifications ban đầu
        fetchNotifications(0);

        // Request browser notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Cleanup
        return () => {
            stompAdminService.offNotification('admin-context');
            stompAdminService.disconnect();
            setIsConnected(false);
        };
    }, [token, handleNewNotification, fetchNotifications]);

    /**
     * Đánh dấu một thông báo đã đọc
     */
    const markAsRead = useCallback(async (notificationId) => {
        try {
            await adminNotificationApi.markAsRead(notificationId);

            setNotifications(prev =>
                prev.map(n =>
                    n.notificationId === notificationId ? { ...n, read: true } : n
                )
            );

            setUnreadCount(prev => Math.max(0, prev - 1));

        } catch (error) {
            console.error('[AdminNotification] Error marking as read:', error);
        }
    }, []);

    /**
     * Đánh dấu tất cả thông báo đã đọc
     */
    const markAllAsRead = useCallback(async () => {
        try {
            await adminNotificationApi.markAllAsRead();

            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

        } catch (error) {
            console.error('[AdminNotification] Error marking all as read:', error);
        }
    }, []);

    /**
     * Xóa một thông báo
     */
    const deleteNotification = useCallback(async (notificationId) => {
        try {
            await adminNotificationApi.deleteNotification(notificationId);

            setNotifications(prev => {
                const notification = prev.find(n => n.notificationId === notificationId);
                const newList = prev.filter(n => n.notificationId !== notificationId);

                // Giảm unread count nếu notification chưa đọc
                if (notification && !notification.read) {
                    setUnreadCount(count => Math.max(0, count - 1));
                }

                return newList;
            });

        } catch (error) {
            console.error('[AdminNotification] Error deleting notification:', error);
        }
    }, []);

    /**
     * Làm mới danh sách notifications
     */
    const refreshNotifications = useCallback(() => {
        fetchNotifications(0);
    }, [fetchNotifications]);

    /**
     * Load thêm notifications (pagination)
     */
    const loadMore = useCallback(() => {
        if (pagination.page < pagination.totalPages - 1) {
            fetchNotifications(pagination.page + 1);
        }
    }, [pagination.page, pagination.totalPages, fetchNotifications]);

    /**
     * Lấy config của notification type
     */
    const getNotificationConfig = useCallback((type) => {
        return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.DEFAULT;
    }, []);

    // Context value
    const value = {
        // State
        notifications,
        unreadCount,
        loading,
        isConnected,
        pagination,

        // Actions
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        loadMore,

        // Helpers
        getNotificationConfig,
        NOTIFICATION_CONFIG
    };

    return (
        <AdminNotificationContext.Provider value={value}>
            {children}
        </AdminNotificationContext.Provider>
    );
};

export default AdminNotificationContext;
