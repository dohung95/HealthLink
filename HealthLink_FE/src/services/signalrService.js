import websocketService from './websocketService';

class SignalRCompatibilityService {
  constructor() {
    this.listeners = new Map();
  }

  async startConnection() {
    websocketService.connect();
  }

  async stopConnection() {
    websocketService.disconnect();
    this.listeners.clear();
  }

  on(eventName, callback) {
    const unsubscribe = websocketService.subscribeToNotifications((notification) => {
const doctorNotificationTypes = [
  'NEW_APPOINTMENT',
  'CANCEL_APPOINTMENT',
  'APPOINTMENT_REMINDER',
  'WALLET_BALANCE_CHANGED',
  'ADMIN_APPOINTMENT_CANCEL',
  'ADMIN_APPOINTMENT_REASSIGN',
];
if (eventName === 'ReceiveAppointmentNotification' &&
    doctorNotificationTypes.includes(notification.type)) {
        callback({
          ...notification,
          appointmentID: notification.appointmentId || notification.relatedId,
        });
      }

      // Schedule change notifications from Admin
      if (eventName === 'ReceiveScheduleNotification' &&
          ['ADMIN_SCHEDULE_CHANGE'].includes(notification.type)) {
        callback({
          ...notification,
        });
      }

      // Prescription notifications
      if (eventName === 'ReceiveMedicationReminder' && notification.type === 'NEW_PRESCRIPTION') {
        callback({
          ...notification,
          prescriptionId: notification.prescriptionHeaderId,
        });
      }

      // Generic notification handler - for any notification type
      if (eventName === 'ReceiveNotification') {
        callback(notification);
      }
    });

    const key = this.getKey(eventName, callback);
    this.listeners.set(key, unsubscribe);
  }

  off(eventName, callback) {
    if (!callback) {
      Array.from(this.listeners.entries())
        .filter(([key]) => key.startsWith(`${eventName}:`))
        .forEach(([key, unsubscribe]) => {
          unsubscribe();
          this.listeners.delete(key);
        });
      return;
    }

    const key = this.getKey(eventName, callback);
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  getConnectionState() {
    return websocketService.isConnected() ? 'Connected' : 'Disconnected';
  }

  getKey(eventName, callback) {
    return `${eventName}:${callback.toString()}`;
  }
}

const signalRService = new SignalRCompatibilityService();
export default signalRService;
