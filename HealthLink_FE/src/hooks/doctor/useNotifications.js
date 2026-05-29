import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationApi } from '@api/notificationApi';

export function useNotifications({ onNavigateToAppointment }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const notificationRef = useRef(null);
  const seenNotificationIds = useRef(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getMyNotifications();
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.isRead).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  const handleNotificationClick = useCallback(async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationApi.markAsRead(notification.notificationId);
        fetchNotifications();
      }
      setShowNotificationDropdown(false);
      setShowAllNotifications(false);
      if (typeof onNavigateToAppointment === 'function') {
        onNavigateToAppointment(notification);
      }
    } catch (err) {
      console.error('Error navigating notification:', err);
      alert('Failed to load notification target');
    }
  }, [fetchNotifications, onNavigateToAppointment]);

  const handleMarkAllRead = useCallback(async () => {
    await notificationApi.markAllAsRead();
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    notifications,
    unreadCount,
    showNotificationDropdown,
    showAllNotifications,
    notificationRef,
    setShowNotificationDropdown,
    setShowAllNotifications,
    fetchNotifications,
    handleNotificationClick,
    handleMarkAllRead,
  };
}
