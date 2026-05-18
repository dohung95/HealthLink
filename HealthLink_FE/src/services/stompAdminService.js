import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Service quản lý kết nối WebSocket/STOMP cho Admin Dashboard.
 *
 * Luồng hoạt động:
 *  1. connect(token) → kết nối đến /ws với JWT authentication
 *  2. subscribeToNotifications(callback) → lắng nghe thông báo tại /user/queue/notifications
 *  3. disconnect() → ngắt kết nối khi logout hoặc unmount
 *
 * Các loại notification Admin nhận:
 *  - NEW_REGISTRATION: Doctor/Pharmacy đăng ký mới
 *  - NEW_APPOINTMENT: Lịch hẹn mới được đặt
 *  - APPOINTMENT_CANCELLED: Lịch hẹn bị hủy
 *  - NEW_COMMISSION: Giao dịch hoa hồng mới
 *  - PAYMENT_RECEIVED: Thanh toán mới
 */

const BACKEND_WS_URL = import.meta.env.VITE_SPRING_API_BASE_URL
    ? `${import.meta.env.VITE_SPRING_API_BASE_URL}/ws`
    : 'http://localhost:8096/ws';

class StompAdminService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.notificationSubscription = null;
        this.callbacks = new Map();
        this.pendingCallbacks = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Kết nối WebSocket với JWT authentication
     * @param {string} token - JWT access token
     * @param {Function} onConnectedCallback - Callback khi kết nối thành công
     */
    connect(token, onConnectedCallback = null) {
        if (this.client && this.isConnected) {
            console.log('[STOMP Admin] Already connected.');
            if (onConnectedCallback) onConnectedCallback();
            return;
        }

        if (!token) {
            console.error('[STOMP Admin] No token provided');
            return;
        }

        this.client = new Client({
            webSocketFactory: () => new SockJS(BACKEND_WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,

            onConnect: (frame) => {
                console.log('[STOMP Admin] Connected:', frame.headers['user-name']);
                this.isConnected = true;
                this.reconnectAttempts = 0;

                // Subscribe vào channel notification
                this._subscribeToNotifications();

                // Xử lý các pending callbacks
                this.pendingCallbacks.forEach(({ id, callback }) => {
                    this.callbacks.set(id, callback);
                });
                this.pendingCallbacks = [];

                if (onConnectedCallback) onConnectedCallback();
            },

            onStompError: (frame) => {
                console.error('[STOMP Admin] STOMP Error:', frame.headers['message']);
                this.isConnected = false;
            },

            onWebSocketClose: (event) => {
                console.log('[STOMP Admin] WebSocket closed:', event.reason);
                this.isConnected = false;
                this.notificationSubscription = null;
            },

            onDisconnect: () => {
                console.log('[STOMP Admin] Disconnected.');
                this.isConnected = false;
                this.notificationSubscription = null;
            },
        });

        this.client.activate();
    }

    /**
     * Subscribe vào /user/queue/notifications để nhận thông báo realtime
     */
    _subscribeToNotifications() {
        if (!this.client || !this.isConnected) {
            console.warn('[STOMP Admin] Cannot subscribe: not connected');
            return;
        }

        // Unsubscribe cũ nếu có
        if (this.notificationSubscription) {
            this.notificationSubscription.unsubscribe();
        }

        this.notificationSubscription = this.client.subscribe(
            '/user/queue/notifications',
            (stompMessage) => {
                try {
                    const notification = JSON.parse(stompMessage.body);
                    console.log('[STOMP Admin] Received notification:', notification);

                    // Gọi tất cả callbacks đã đăng ký
                    this.callbacks.forEach((callback, id) => {
                        try {
                            callback(notification);
                        } catch (err) {
                            console.error(`[STOMP Admin] Callback error (${id}):`, err);
                        }
                    });
                } catch (err) {
                    console.error('[STOMP Admin] Parse error:', err);
                }
            }
        );

        console.log('[STOMP Admin] Subscribed to /user/queue/notifications');
    }

    /**
     * Đăng ký callback nhận notification
     * @param {string} id - ID để identify callback (vd: 'admin-dropdown', 'admin-context')
     * @param {Function} callback - Hàm xử lý notification
     */
    onNotification(id, callback) {
        if (this.isConnected) {
            this.callbacks.set(id, callback);
            console.log(`[STOMP Admin] Registered callback: ${id}`);
        } else {
            this.pendingCallbacks.push({ id, callback });
            console.log(`[STOMP Admin] Queued callback: ${id} (waiting for connection)`);
        }
    }

    /**
     * Hủy đăng ký callback
     * @param {string} id - ID của callback cần hủy
     */
    offNotification(id) {
        this.callbacks.delete(id);
        this.pendingCallbacks = this.pendingCallbacks.filter(p => p.id !== id);
        console.log(`[STOMP Admin] Unregistered callback: ${id}`);
    }

    /**
     * Ngắt kết nối WebSocket
     */
    disconnect() {
        if (this.notificationSubscription) {
            this.notificationSubscription.unsubscribe();
            this.notificationSubscription = null;
        }

        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }

        this.isConnected = false;
        this.callbacks.clear();
        this.pendingCallbacks = [];
        console.log('[STOMP Admin] Disconnected and cleaned up.');
    }

    /**
     * Kiểm tra trạng thái kết nối
     * @returns {boolean}
     */
    getIsConnected() {
        return this.isConnected;
    }

    /**
     * Lấy trạng thái kết nối chi tiết
     * @returns {string}
     */
    getConnectionState() {
        if (!this.client) return 'DISCONNECTED';
        if (this.isConnected) return 'CONNECTED';
        return 'CONNECTING';
    }
}

// Singleton instance - dùng chung toàn Admin app
const stompAdminService = new StompAdminService();
export default stompAdminService;
