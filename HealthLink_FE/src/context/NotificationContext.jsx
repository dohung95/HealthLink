import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
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

    useEffect(() => {
        if (user?.id) {
            // Start SignalR connection
            notificationService.startConnection(user.id);

            // Register notification handler
            notificationService.onNotification('main', handleNewNotification);

            // Cleanup on unmount
            return () => {
                notificationService.offNotification('main');
                notificationService.stopConnection();
            };
        }
    }, [user]);

    const handleNewNotification = (notification) => {
        console.log('New notification received:', notification);

        // Add to notifications list
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Handle specific notification types
        if (notification.eventType === 'PRESCRIPTION_CREATED') {
            setLatestPrescription({
                id: notification.prescriptionHeaderId,
                message: notification.message,
                timestamp: notification.timestamp
            });
            setShowPrescriptionModal(true);

            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Prescription', {
                    body: notification.message,
                    icon: '/logo.png',
                    tag: 'prescription-' + notification.prescriptionHeaderId
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
        markAsRead,
        clearAll,
        closePrescriptionModal,
        isConnected: notificationService.isConnected()
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
