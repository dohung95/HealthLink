import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import websocketService from '../services/websocketService';
import { useAuth } from './AuthContext';
import { audioService } from '../utils/audioService';
import { notificationApi } from '../api/notificationApi';
import { consultationApi } from '../api/consultationApi';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

const isPendingHomeVisitProposal = (payload) => {
  const status = String(
    payload?.metadata?.proposalStatus
    || payload?.proposalStatus
    || payload?.status
    || '',
  ).toUpperCase();

  return status === 'PENDING';
};

const getHomeVisitResultState = (notification) => {
  const metadata = notification?.metadata || {};
  const status = notification?.type === 'HOME_VISIT_CONFIRMED' ? 'ACCEPTED' : 'REJECTED';

  return {
    consultationId: notification?.relatedId ?? metadata.consultationId ?? null,
    appointmentId: notification?.appointmentId ?? metadata.appointmentId ?? null,
    doctorId: metadata.doctorId ?? null,
    patientName: metadata.patientName ?? 'Your patient',
    status,
    title: notification?.title || (status === 'ACCEPTED' ? 'Home Visit Accepted' : 'Home Visit Declined'),
    message: notification?.message || '',
    actionUrl: notification?.actionUrl || null,
  };
};

export const NotificationProvider = ({ children }) => {
  const { user, currentUserId, token, roles } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [latestPrescription, setLatestPrescription] = useState(null);
  const [latestRealtimeNotification, setLatestRealtimeNotification] = useState(null);
  const [showAdminActionModal, setShowAdminActionModal] = useState(false);
  const [adminActionNotification, setAdminActionNotification] = useState(null);
  const [homeVisitProposal, setHomeVisitProposal] = useState(null);
  const [homeVisitProposalResult, setHomeVisitProposalResult] = useState(null);
  const lastNotificationIdRef = useRef(null);

  const userId = currentUserId || user?.sub || user?.userId;
  const isPatient = useMemo(
    () => roles.some((role) => String(role || '').toLowerCase() === 'patient'),
    [roles],
  );

  const playNotificationSound = useCallback(() => {
    audioService.playNotification();
  }, []);

  const hydratePendingHomeVisitProposal = useCallback(async () => {
    if (!isPatient) {
      setHomeVisitProposal(null);
      return;
    }

    try {
      const proposal = await consultationApi.getPendingHomeVisitProposal();
      if (proposal?.consultationId && String(proposal?.status || '').toUpperCase() === 'PENDING') {
        setHomeVisitProposal({
          consultationId: proposal.consultationId,
          doctorId: proposal.doctorId,
          appointmentId: proposal.appointmentId ?? null,
          status: proposal.status,
        });
        return;
      }

      setHomeVisitProposal(null);
    } catch (error) {
      if (error?.response?.status === 204 || error?.response?.status === 404) {
        setHomeVisitProposal(null);
        return;
      }

      console.error('Failed to hydrate pending home visit proposal:', error);
    }
  }, [isPatient]);

  const handleNewNotification = useCallback((notification) => {
    setLatestRealtimeNotification(notification);
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    if (
      notification.eventType === 'PRESCRIPTION_CREATED'
      || notification.type === 'NEW_PRESCRIPTION'
      || notification.type === 'PRESCRIPTION_ISSUED'
    ) {
      setLatestPrescription({
        id: notification.prescriptionHeaderId || notification.relatedId,
        message: notification.message,
        timestamp: notification.timestamp || notification.createdAt,
      });
      setShowPrescriptionModal(true);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Prescription', {
          body: notification.message,
          icon: '/logo.png',
          tag: `prescription-${notification.prescriptionHeaderId || notification.relatedId}`,
        });
      }
    }

    const showBrowserNotification = (payload, fallbackTitle, tagPrefix) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title || fallbackTitle, {
          body: payload.message,
          icon: '/logo.png',
          tag: `${tagPrefix}-${payload.relatedId || payload.notificationId || Date.now()}`,
        });
      }
    };

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
    if (notification.type === 'PAYMENT_REQUIRED') {
      showBrowserNotification(notification, 'Payment Required', 'payment');
    }
    if (notification.type === 'ORDER_STATUS') {
      showBrowserNotification(notification, 'Order Update', 'order');
    }
    if (notification.type === 'APPOINTMENT_REMINDER') {
      showBrowserNotification(notification, 'Appointment Reminder', 'appointment');
    }

    if (['ADMIN_APPOINTMENT_CANCEL', 'ADMIN_APPOINTMENT_REASSIGN'].includes(notification.type)) {
      setAdminActionNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        appointmentId: notification.relatedId,
        timestamp: notification.createdAt,
      });
      setShowAdminActionModal(true);
      showBrowserNotification(notification, 'Appointment Update', 'admin-action');
    }

    if (notification.type === 'HOME_VISIT_PROPOSED' && isPendingHomeVisitProposal(notification)) {
      const metadata = notification.metadata || {};
      setHomeVisitProposal({
        consultationId: notification.relatedId ?? metadata.consultationId ?? null,
        doctorId: metadata.doctorId ?? null,
        appointmentId: notification.appointmentId ?? metadata.appointmentId ?? null,
        status: metadata.proposalStatus ?? 'PENDING',
      });
    }

    if (notification.type === 'HOME_VISIT_CONFIRMED' || notification.type === 'HOME_VISIT_REJECTED') {
      setHomeVisitProposalResult(getHomeVisitResultState(notification));
    }

    playNotificationSound();
  }, [playNotificationSound]);

  useEffect(() => {
    if (!userId || !token) {
      return undefined;
    }

    websocketService.connect();
    const unsubscribe = websocketService.subscribeToNotifications(handleNewNotification);

    const fetchInitialData = async () => {
      try {
        const [count, list] = await Promise.all([
          notificationApi.getUnreadCount(),
          notificationApi.getMyNotifications(),
        ]);
        setUnreadCount(count || 0);
        setNotifications(list || []);

        if (list && list.length > 0) {
          lastNotificationIdRef.current = list[0].notificationId || list[0].notificationID || null;
        }

        await hydratePendingHomeVisitProposal();
      } catch (error) {
        console.error('Failed to fetch initial notifications:', error);
      }
    };

    fetchInitialData();

    const pollInterval = setInterval(async () => {
      try {
        const [count, list] = await Promise.all([
          notificationApi.getUnreadCount(),
          notificationApi.getMyNotifications(),
        ]);

        setUnreadCount(count || 0);

        if (list && Array.isArray(list) && list.length > 0) {
          const latestId = list[0].notificationId || list[0].notificationID || null;
          const hasNew = latestId && latestId !== lastNotificationIdRef.current;

          if (hasNew) {
            lastNotificationIdRef.current = latestId;
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((item) => item.notificationId || item.notificationID));
              const newItems = list.filter((item) => !existingIds.has(item.notificationId || item.notificationID));
              return newItems.length > 0 ? [...newItems, ...prev] : prev;
            });

            if (isPatient) {
              await hydratePendingHomeVisitProposal();
            }
          }
        }
      } catch {
        // Polling is only a fallback.
      }
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [handleNewNotification, hydratePendingHomeVisitProposal, isPatient, token, userId]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = (notificationId) => {
    setNotifications((prev) => prev.map((item) => (
      item.notificationId === notificationId
        ? { ...item, isRead: true, read: true }
        : item
    )));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await notificationApi.markAllAsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, read: true })));
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

  const closeHomeVisitProposalResultModal = () => {
    setHomeVisitProposalResult(null);
  };

  const value = {
    notifications,
    unreadCount,
    showPrescriptionModal,
    latestPrescription,
    showAdminActionModal,
    adminActionNotification,
    homeVisitProposal,
    setHomeVisitProposal,
    homeVisitProposalResult,
    setHomeVisitProposalResult,
    markAsRead,
    markAllAsRead,
    clearAll,
    refreshUnreadCount,
    closePrescriptionModal,
    closeAdminActionModal,
    closeHomeVisitProposalResultModal,
    latestRealtimeNotification,
    isConnected: websocketService.isConnected(),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
