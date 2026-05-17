import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Service quản lý kết nối WebSocket/STOMP đến backend Spring Boot.
 *
 * Luồng hoạt động:
 *  1. connect(userId, token) → kết nối đến /ws
 *  2. subscribeToChat(callback) → lắng nghe tin nhắn mới tại /user/{userId}/queue/chat
 *  3. disconnect() → ngắt kết nối khi logout hoặc unmount
 */

const BACKEND_WS_URL = 'http://localhost:8096/ws';

class StompChatService {
    constructor() {
        this.client = null;
        this.chatSubscription = null;
        this.isConnected = false;
        this.pendingSubscriptions = [];
        this.stompClientPromise = null;
    }

    /**
     * Kết nối đến WebSocket backend với JWT authentication.
     *
     * @param {string} token - JWT access token
     * @param {Function} onConnectedCallback - Gọi sau khi kết nối thành công
     */
    connect(token, onConnectedCallback) {
        if (this.client && this.isConnected) {
            console.log('[STOMP Chat] Already connected.');
            if (onConnectedCallback) onConnectedCallback();
            return;
        }

        this.client = new Client({
            // SockJS factory — giúp tương thích với Spring SockJS fallback
            webSocketFactory: () => new SockJS(BACKEND_WS_URL),

            // Đính kèm JWT vào header STOMP CONNECT
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },

            // Thử kết nối lại sau 5 giây nếu mất kết nối
            reconnectDelay: 5000,

            onConnect: (frame) => {
                console.log('[STOMP Chat] Successfully connected:', frame.headers['user-name']);
                this.isConnected = true;

                // Đăng ký các subscription đang chờ
                this.pendingSubscriptions.forEach(({ destination, callback }) => {
                    this._subscribe(destination, callback);
                });
                this.pendingSubscriptions = [];

                if (onConnectedCallback) onConnectedCallback();
            },

            onStompError: (frame) => {
                console.error('[STOMP Chat] STOMP Error:', frame.headers['message']);
            },

            onDisconnect: () => {
                console.log('[STOMP Chat] Disconnected.');
                this.isConnected = false;
            },
        });

        this.client.activate();
    }

    /**
     * Đăng ký nhận tin nhắn chat realtime.
     * Backend push đến: /user/{userId}/queue/chat
     *
     * @param {Function} onMessageCallback - Callback nhận MessageDTO
     * @returns {Function} Hàm để huỷ đăng ký (unsubscribe)
     */
    subscribeToChat(onMessageCallback) {
        const destination = '/user/queue/chat';
        return this.subscribeToDestination(destination, onMessageCallback);
    }

    /**
     * Đăng ký nhận message từ một destination bất kỳ
     */
    subscribeToDestination(destination, onMessageCallback) {
        if (this.isConnected && this.client) {
            return this._subscribe(destination, onMessageCallback);
        } else {
            this.pendingSubscriptions.push({ destination, callback: onMessageCallback });
            return () => {
                this.pendingSubscriptions = this.pendingSubscriptions.filter(
                    s => s.callback !== onMessageCallback
                );
            };
        }
    }

    /**
     * Gửi message đến một destination bất kỳ
     */
    publishToDestination(destination, body) {
        if (this.isConnected && this.client) {
            this.client.publish({
                destination: destination,
                body: JSON.stringify(body)
            });
        } else {
            console.error(`[STOMP] Cannot publish to ${destination}, not connected.`);
        }
    }



    /**
     * Ngắt kết nối WebSocket.
     * Gọi khi user logout hoặc component unmount.
     */
    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.isConnected = false;
            this.chatSubscription = null;
            this.pendingSubscriptions = [];
            console.log('[STOMP Chat] Disconnected.');
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    _subscribe(destination, callback) {
        const subscription = this.client.subscribe(destination, (stompMessage) => {
            try {
                const messageDto = JSON.parse(stompMessage.body);
                callback(messageDto);
            } catch (err) {
                console.error('[STOMP Chat] Failed to parse message:', err);
            }
        });

        console.log(`[STOMP Chat] Subscribed to: ${destination}`);
        return () => subscription.unsubscribe();
    }
}

// Singleton — dùng chung toàn app
const stompChatService = new StompChatService();
export default stompChatService;
