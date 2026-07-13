import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { PHARMACY_WORKFLOW_NOTIFICATION_TYPES } from '../pharmacy/workflow/pharmacyWorkflow';
import { audioService } from '../../utils/audioService';
import {
  WORKFLOW_NOTIFICATION_TYPES,
  getNotificationSurfaceKey,
  getWorkflowToastId,
  getWorkflowToastKind,
  getWorkflowNotificationTarget,
  isWorkflowToastSuppressed,
  shouldShowInAppWorkflowToast,
} from '../../utils/notificationToastPolicy';

export default function NotificationToastBridge() {
  const navigate = useNavigate();
  const { latestRealtimeNotification } = useNotifications();
  const { roles } = useAuth();
  const lastShownKeyRef = useRef(null);
  const normalizedRoles = Array.isArray(roles) ? roles : [];
  const isPharmacy = normalizedRoles.some((role) => String(role || '').toLowerCase() === 'pharmacy');
  const isPatient = normalizedRoles.some((role) => String(role || '').toLowerCase() === 'patient');

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

    if (isPharmacy && PHARMACY_WORKFLOW_NOTIFICATION_TYPES.has(notification.type)) {
      const targetPath = getWorkflowNotificationTarget(notification, 'pharmacy');
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

    const targetPath = getWorkflowNotificationTarget(notification, isPatient ? 'patient' : isPharmacy ? 'pharmacy' : '');
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
  }, [isPatient, isPharmacy, latestRealtimeNotification, navigate]);

  return null;
}
