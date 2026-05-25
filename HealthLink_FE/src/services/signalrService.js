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
      ];

      if (eventName === 'ReceiveAppointmentNotification' &&
          doctorNotificationTypes.includes(notification.type)) {
        callback({
          ...notification,
          appointmentID: notification.appointmentId,
        });
      }

      if (eventName === 'ReceiveMedicationReminder' && notification.type === 'NEW_PRESCRIPTION') {
        callback({
          ...notification,
          prescriptionId: notification.prescriptionHeaderId,
        });
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
