import React, { createContext, useContext, useState, useEffect } from 'react';
import websocketService from '../services/websocketService';
import { useAuth } from './AuthContext';
import { audioService } from '../utils/audioService';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [latestPrescription, setLatestPrescription] = useState(null);

    // Admin action notification state (for Patient)
    const [showAdminActionModal, setShowAdminActionModal] = useState(false);
    const [adminActionNotification, setAdminActionNotification] = useState(null);

    useEffect(() => {
        if (user?.id) {
            websocketService.connect();
            const unsubscribe = websocketService.subscribeToNotifications(handleNewNotification);

            return () => {
                unsubscribe();
            };
        }
    }, [user]);

    const handleNewNotification = (notification) => {
        console.log('New notification received:', notification);

        // Add to notifications list
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Handle specific notification types
        if (notification.eventType === 'PRESCRIPTION_CREATED' || notification.type === 'NEW_PRESCRIPTION') {
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

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title || 'Appointment Update', {
                    body: notification.message,
                    icon: '/logo.png',
                    tag: 'admin-action-' + notification.relatedId
                });
            }
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

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
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
        markAsRead,
        clearAll,
        closePrescriptionModal,
        closeAdminActionModal,
        isConnected: websocketService.isConnected()
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
