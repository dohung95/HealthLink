import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api/notificationApi';
import { useNotifications } from '../../context/NotificationContext';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function targetForNotification(notification) {
  if (notification.type === 'NEW_PHARMACY_REQUEST') {
    return '/pharmacy-page/orders?group=NEW_REQUESTS';
  }

  if (notification.type === 'INVOICE_PAID') {
    return '/pharmacy-page/orders?group=PAYMENT_DUE';
  }

  if (notification.type === 'ORDER_STATUS') {
    return '/pharmacy-page/orders?group=CONSULTING';
  }

  if (notification.type === 'NEW_ORDER') {
    return '/pharmacy-page/orders?group=NEW_REQUESTS';
  }

  return '/pharmacy-page/orders';
}

function iconForType(type) {
  if (type === 'NEW_PHARMACY_REQUEST') return 'mark_unread_chat_alt';
  if (type === 'INVOICE_PAID') return 'payments';
  if (type === 'NEW_ORDER') return 'receipt_long';
  if (type === 'ORDER_STATUS') return 'sync_alt';
  return 'notifications';
}

export default function PharmacyNotificationDropdown() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const pharmacyNotifications = useMemo(
    () => notifications.filter((notification) => [
      'NEW_PHARMACY_REQUEST',
      'INVOICE_PAID',
      'NEW_ORDER',
      'ORDER_STATUS',
      'PAYMENT_REQUIRED',
    ].includes(notification.type)),
    [notifications],
  );

  const pharmacyUnreadCount = useMemo(
    () => pharmacyNotifications.filter((item) => !item.isRead && !item.read).length,
    [pharmacyNotifications],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead && !notification.read && notification.notificationId) {
      await notificationApi.markAsRead(notification.notificationId);
      markAsRead(notification.notificationId);
    }
    setOpen(false);
    navigate(targetForNotification(notification));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button onClick={() => setOpen((value) => !value)} type="button" title="Notifications">
        <span className={`material-symbols-outlined ${pharmacyUnreadCount > 0 ? 'pharmacy-bell-ring' : ''}`}>
          {pharmacyUnreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {pharmacyUnreadCount > 0 ? <span className="pharmacy-notification-dot" /> : null}
      </button>

      {open ? (
        <div className="pharmacy-notification-menu">
          <div className="pharmacy-notification-header">
            <strong>Notifications</strong>
            {unreadCount > 0 ? (
              <button onClick={handleMarkAllRead} type="button">Mark all read</button>
            ) : null}
          </div>
          <div className="pharmacy-notification-list">
            {pharmacyNotifications.length === 0 ? (
              <div className="pharmacy-notification-empty">No notifications yet</div>
            ) : (
              pharmacyNotifications.slice(0, 10).map((notification) => {
                const unread = !notification.isRead && !notification.read;
                return (
                  <div
                    className={`pharmacy-notification-item ${unread ? 'is-unread' : ''}`}
                    key={notification.notificationId || `${notification.type}-${notification.createdAt}`}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined">{iconForType(notification.type)}</span>
                    <span>
                      <strong>{notification.title || 'Notification'}</strong>
                      <small>{notification.message}</small>
                      <em>{formatTime(notification.createdAt)}</em>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
