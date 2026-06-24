import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import websocketService from '../services/websocketService';
import { useAuth } from './AuthContext';
import { audioService } from '../utils/audioService';
import { notificationApi } from '../api/notificationApi';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user, currentUserId, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [latestPrescription, setLatestPrescription] = useState(null);

    const [latestRealtimeNotification, setLatestRealtimeNotification] = useState(null);

    // Admin action notification state (for Patient)
    const [showAdminActionModal, setShowAdminActionModal] = useState(false);
    const [adminActionNotification, setAdminActionNotification] = useState(null);

    const [homeVisitProposal, setHomeVisitProposal] = useState(null);
    const lastNotificationIdRef = useRef(null);

    // Dùng currentUserId hoặc user?.sub (JWT subject) để check đăng nhập
    const userId = currentUserId || user?.sub || user?.userId;

    useEffect(() => {
        if (userId && token) {
            websocketService.connect();
            const unsubscribe = websocketService.subscribeToNotifications(handleNewNotification);

            // Fetch initial notifications and unread count from API
            const fetchInitialData = async () => {
                try {
                    const [count, list] = await Promise.all([
                        notificationApi.getUnreadCount(),
                        notificationApi.getMyNotifications()
                    ]);
                    setUnreadCount(count || 0);
                    setNotifications(list || []);

                    // Track latest notification ID for polling
                    if (list && list.length > 0) {
                        lastNotificationIdRef.current = list[0].notificationId || list[0].notificationID || null;
                    }

                    // Process HOME_VISIT_PROPOSED from API response
                    if (list && Array.isArray(list)) {
                        const homeVisitNotif = list.find(n => n.type === 'HOME_VISIT_PROPOSED');
                        if (homeVisitNotif) {
                            setHomeVisitProposal(prev => prev ?? {
                                consultationId: homeVisitNotif.relatedId,
                                doctorId: (homeVisitNotif.metadata || {}).doctorId,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch initial notifications:', error);
                }
            };
            fetchInitialData();

            // Polling fallback every 15s to catch missed WebSocket notifications
            const pollInterval = setInterval(async () => {
                try {
                    const [count, list] = await Promise.all([
                        notificationApi.getUnreadCount(),
                        notificationApi.getMyNotifications()
                    ]);

                    setUnreadCount(count || 0);

                    if (list && Array.isArray(list) && list.length > 0) {
                        const latestId = list[0].notificationId || list[0].notificationID || null;
                        const hasNew = latestId && latestId !== lastNotificationIdRef.current;

                        if (hasNew) {
                            lastNotificationIdRef.current = latestId;

                            // Merge new notifications without duplicates
                            setNotifications(prev => {
                                const existingIds = new Set(prev.map(n => n.notificationId || n.notificationID));
                                const newItems = list.filter(n => !existingIds.has(n.notificationId || n.notificationID));
                                return newItems.length > 0 ? [...newItems, ...prev] : prev;
                            });

                            // Check new notifications for special types
                            const latestNotif = list[0];
                            if (latestNotif.type === 'HOME_VISIT_PROPOSED') {
                                setHomeVisitProposal(prev => prev ?? {
                                    consultationId: latestNotif.relatedId,
                                    doctorId: (latestNotif.metadata || {}).doctorId,
                                });
                            }
                        }
                    }
                } catch {
                    // Silently fail — polling is a fallback
                }
            }, 15000);

            return () => {
                unsubscribe();
                clearInterval(pollInterval);
            };
        }
    }, [userId, token]);

    const handleNewNotification = (notification) => {
        console.log('New notification received:', notification);

        // Track as latest realtime notification for toast bridge
        setLatestRealtimeNotification(notification);

        // Add to notifications list
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Handle specific notification types
        if (notification.eventType === 'PRESCRIPTION_CREATED'
            || notification.type === 'NEW_PRESCRIPTION'
            || notification.type === 'PRESCRIPTION_ISSUED') {
            setLatestPrescription({
                id: notification.prescriptionHeaderId || notification.relatedId,
                message: notification.message,
                timestamp: notification.timestamp || notification.createdAt
            });
            setShowPrescriptionModal(true);

            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Prescription', {
                    body: notification.message,
                    icon: '/logo.png',
                    tag: 'prescription-' + (notification.prescriptionHeaderId || notification.relatedId)
                });
            }
        }

        const showBrowserNotification = (notification, fallbackTitle, tagPrefix) => {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title || fallbackTitle, {
                    body: notification.message,
                    icon: '/logo.png',
                    tag: `${tagPrefix}-${notification.relatedId || notification.notificationId || Date.now()}`
                });
            }
        };

        // Handle pharmacy workflow browser notifications
        if (notification.type === 'NEW_PHARMACY_REQUEST') {
            showBrowserNotification(notification, 'New pharmacy request', 'pharmacy-request');
        }

        if (notification.type === 'PHARMACY_REQUEST_STATUS') {
            showBrowserNotification(notification, 'Pharmacy request updated', 'pharmacy-request-status');
        }

        if (notification.type === 'NEW_ORDER') {
            showBrowserNotification(notification, 'New order update', 'pharmacy-order');
        }

        if (notification.type === 'INVOICE_PAID') {
            showBrowserNotification(notification, 'Payment confirmed', 'invoice-paid');
        }

        // Handle payment required notification
        if (notification.type === 'PAYMENT_REQUIRED') {
            showBrowserNotification(notification, 'Payment Required', 'payment');
        }

        // Handle order status updates
        if (notification.type === 'ORDER_STATUS') {
            showBrowserNotification(notification, 'Order Update', 'order');
        }

        // Handle appointment reminders
        if (notification.type === 'APPOINTMENT_REMINDER') {
            showBrowserNotification(notification, 'Appointment Reminder', 'appointment');
        }

        // Handle Admin action notifications (cancel/reassign appointment)
        if (['ADMIN_APPOINTMENT_CANCEL', 'ADMIN_APPOINTMENT_REASSIGN'].includes(notification.type)) {
            setAdminActionNotification({
                type: notification.type,
                title: notification.title,
                message: notification.message,
                appointmentId: notification.relatedId,
                timestamp: notification.createdAt
            });
            setShowAdminActionModal(true);

            showBrowserNotification(notification, 'Appointment Update', 'admin-action');
        }

        // Handle home visit proposal notifications
        if (notification.type === 'HOME_VISIT_PROPOSED') {
            // metadata đã được parse thành object bởi normalizeNotification
            const meta = notification.metadata || {};
            setHomeVisitProposal({
                consultationId: notification.relatedId,
                doctorId: meta.doctorId,
            });
        }

        // Play notification sound (optional)
        playNotificationSound();
    };

    const playNotificationSound = () => {
        audioService.playNotification();
    };

    const markAsRead = (notificationId) => {
        setNotifications(prev =>
            prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        await notificationApi.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
        setUnreadCount(0);
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    const refreshUnreadCount = async () => {
        try {
            const count = await notificationApi.getUnreadCount();
            setUnreadCount(count || 0);
        } catch (error) {
            console.error('Failed to refresh unread count:', error);
        }
    };

    const closePrescriptionModal = () => {
        setShowPrescriptionModal(false);
        setLatestPrescription(null);
    };

    const closeAdminActionModal = () => {
        setShowAdminActionModal(false);
        setAdminActionNotification(null);
    };

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const value = {
        notifications,
        unreadCount,
        showPrescriptionModal,
        latestPrescription,
        showAdminActionModal,
        adminActionNotification,
        homeVisitProposal,
        setHomeVisitProposal,
        markAsRead,
        markAllAsRead,
        clearAll,
        refreshUnreadCount,
        closePrescriptionModal,
        closeAdminActionModal,
        latestRealtimeNotification,
        isConnected: websocketService.isConnected()
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
