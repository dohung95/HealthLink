import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications } from '../../context/NotificationContext';
import { PHARMACY_WORKFLOW_NOTIFICATION_TYPES, getPharmacyNotificationTarget } from '../pharmacy/workflow/pharmacyWorkflow';
import { audioService } from '../../utils/audioService';
import {
  WORKFLOW_NOTIFICATION_TYPES,
  getNotificationSurfaceKey,
  getWorkflowToastId,
  getWorkflowToastKind,
  isWorkflowToastSuppressed,
  shouldShowInAppWorkflowToast,
} from '../../utils/notificationToastPolicy';

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
    return getPharmacyNotificationTarget(notification);
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

export default function NotificationToastBridge() {
  const navigate = useNavigate();
  const { latestRealtimeNotification } = useNotifications();
  const lastShownKeyRef = useRef(null);

  useEffect(() => {
    const notification = latestRealtimeNotification;
    if (!notification) return;
    const key = getNotificationSurfaceKey(notification);
    if (!key || lastShownKeyRef.current === key) return;
    if (!WORKFLOW_NOTIFICATION_TYPES.has(String(notification.type || '').toUpperCase())) return;
    if (!shouldShowInAppWorkflowToast(notification, document)) return;

    lastShownKeyRef.current = key;
    const toastId = getWorkflowToastId(notification);
    if (isWorkflowToastSuppressed(toastId)) return;

    if (PHARMACY_WORKFLOW_NOTIFICATION_TYPES.has(notification.type)) {
      const targetPath = getPharmacyNotificationTarget(notification);
      audioService.playNotification();

      const pharmacyToastId = toastId || `pharmacy-workflow-${key}`;
      toast.custom((toastItem) => (
        <button
          className="pharmacy-workflow-toast"
          onClick={() => {
            toast.dismiss(toastItem.id);
            navigate(targetPath);
          }}
          type="button"
        >
          <span className="material-symbols-outlined pharmacy-workflow-toast__bell">
            notifications_active
          </span>
          <span className="pharmacy-workflow-toast__copy">
            <strong>{notification.title || 'New pharmacy request'}</strong>
            <small>{notification.message || 'A patient request is waiting for intake.'}</small>
          </span>
        </button>
      ), {
        id: pharmacyToastId,
        duration: Infinity,
      });

      const dismissOnScreenClick = () => toast.dismiss(pharmacyToastId);
      window.setTimeout(() => {
        document.addEventListener('pointerdown', dismissOnScreenClick, { once: true });
      }, 0);
      return;
    }

    const targetPath = getTargetPath(notification);
    const toastPayload = {
      id: toastId,
      description: notification.message,
      action: targetPath
        ? {
            label: 'Open',
            onClick: () => navigate(targetPath),
          }
        : undefined,
    };

    const title = notification.title || 'Notification';
    const kind = getWorkflowToastKind(notification);

    if (kind === 'success') {
      toast.success(title, toastPayload);
      return;
    }

    if (kind === 'warning') {
      toast.warning(title, toastPayload);
      return;
    }

    if (kind === 'error') {
      toast.error(title, toastPayload);
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
