import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications } from '../../context/NotificationContext';

const WORKFLOW_TYPES = new Set([
  'NEW_PHARMACY_REQUEST',
  'PHARMACY_REQUEST_STATUS',
  'NEW_ORDER',
  'ORDER_STATUS',
  'PAYMENT_REQUIRED',
  'INVOICE_PAID',
]);

function getNotificationKey(notification) {
  if (!notification) return null;
  return notification.notificationId
    || `${notification.type}-${notification.relatedId}-${notification.createdAt || ''}`;
}

function extractIdFromActionUrl(actionUrl, pattern) {
  const match = String(actionUrl || '').match(pattern);
  return match ? match[1] : null;
}

function getTargetPath(notification) {
  const actionUrl = notification.actionUrl || '';
  const orderId = notification.relatedId
    || extractIdFromActionUrl(actionUrl, /\/pharmacy-orders\/([^/]+)/)
    || extractIdFromActionUrl(actionUrl, /\/payment\/order\/([^/]+)/);

  if (notification.type === 'NEW_PHARMACY_REQUEST') {
    return '/pharmacy-page/orders?group=NEW_REQUESTS';
  }

  if (notification.type === 'PHARMACY_REQUEST_STATUS') {
    return '/patient-dashboard/pharmacy/requests';
  }

  if (['NEW_ORDER', 'ORDER_STATUS', 'PAYMENT_REQUIRED', 'INVOICE_PAID'].includes(notification.type)) {
    if (orderId) return `/patient-dashboard/pharmacy/orders/${orderId}`;
    return '/patient-dashboard/pharmacy/orders';
  }

  return null;
}

function getToastKind(type) {
  if (type === 'PAYMENT_REQUIRED') return 'warning';
  if (type === 'INVOICE_PAID') return 'success';
  if (type === 'NEW_PHARMACY_REQUEST' || type === 'NEW_ORDER') return 'info';
  return 'message';
}

export default function NotificationToastBridge() {
  const navigate = useNavigate();
  const { latestRealtimeNotification } = useNotifications();
  const lastShownKeyRef = useRef(null);

  useEffect(() => {
    const notification = latestRealtimeNotification;
    const key = getNotificationKey(notification);
    if (!notification || !key || lastShownKeyRef.current === key) return;
    if (!WORKFLOW_TYPES.has(notification.type)) return;

    lastShownKeyRef.current = key;
    const targetPath = getTargetPath(notification);
    const toastPayload = {
      description: notification.message,
      action: targetPath
        ? {
            label: 'Open',
            onClick: () => navigate(targetPath),
          }
        : undefined,
    };

    const title = notification.title || 'Notification';
    const kind = getToastKind(notification.type);

    if (kind === 'success') {
      toast.success(title, toastPayload);
      return;
    }

    if (kind === 'warning') {
      toast.warning(title, toastPayload);
      return;
    }

    if (kind === 'info') {
      toast.info(title, toastPayload);
      return;
    }

    toast(title, toastPayload);
  }, [latestRealtimeNotification, navigate]);

  return null;
}
