import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { normalizeNotification } from '../api/normalizers';

const WS_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8096'}/ws`;

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.pending = [];
    this.notificationCallbacks = new Set();
  }

  connect(token = localStorage.getItem('token') || sessionStorage.getItem('token')) {
    if (!token) {
      return;
    }

    if (this.client && (this.connected || this.client.active)) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected = true;
        this.pending.forEach(({ destination, callback }) => {
          this.subscribe(destination, callback);
        });
        this.pending = [];
      },
      onDisconnect: () => {
        this.connected = false;
      },
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP error:', frame.headers?.message);
      },
      onWebSocketClose: () => {
        this.connected = false;
      },
    });

    this.client.activate();
  }

  disconnect() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();
    this.pending = [];
    this.notificationCallbacks.clear();
    this.connected = false;

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  subscribe(destination, callback) {
    if (!this.client || !this.connected) {
      this.pending.push({ destination, callback });
      this.connect();
      return () => this.unsubscribe(destination, callback);
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const payload = JSON.parse(message.body);
        callback(destination.includes('/notifications') ? normalizeNotification(payload) : payload);
      } catch (error) {
        console.error('[WebSocket] Failed to parse payload:', error);
      }
    });

    const key = this.getKey(destination, callback);
    this.subscriptions.set(key, subscription);

    return () => this.unsubscribe(destination, callback);
  }

  unsubscribe(destination, callback) {
    const key = this.getKey(destination, callback);
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }

    this.pending = this.pending.filter(
      (item) => item.destination !== destination || item.callback !== callback,
    );
  }

  subscribeToNotifications(callback) {
    this.notificationCallbacks.add(callback);
    const unsubscribe = this.subscribe('/user/queue/notifications', callback);
    return () => {
      this.notificationCallbacks.delete(callback);
      unsubscribe();
    };
  }

  dispatchNotificationForTesting(notification) {
    if (!import.meta.env.DEV) return;
    const normalized = normalizeNotification(notification);
    this.notificationCallbacks.forEach((callback) => callback(normalized));
  }

  isConnected() {
    return this.connected;
  }

  getKey(destination, callback) {
    return `${destination}:${callback.toString()}`;
  }
}

const websocketService = new WebSocketService();
export default websocketService;
