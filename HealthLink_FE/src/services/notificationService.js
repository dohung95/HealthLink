import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

class NotificationService {
    constructor() {
        this.connection = null;
        this.handlers = new Map();
    }

    async startConnection(userId) {
        if (this.connection) {
            console.log('Connection already exists');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        try {
            this.connection = new HubConnectionBuilder()
                .withUrl('https://localhost:7267/hubs/notifications', {
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();

            // Handle connection events
            this.connection.onreconnecting((error) => {
                console.log('Connection lost, reconnecting...', error);
            });

            this.connection.onreconnected((connectionId) => {
                console.log('Reconnected with ID:', connectionId);
            });

            this.connection.onclose((error) => {
                console.log('Connection closed', error);
            });

            // Register for notifications
            this.connection.on('ReceiveNotification', (notification) => {
                console.log('Received notification:', notification);
                this.handleNotification(notification);
            });

            await this.connection.start();
            console.log('SignalR Connected for user:', userId);
        } catch (error) {
            console.error('Error starting SignalR connection:', error);
            setTimeout(() => this.startConnection(userId), 5000); // Retry after 5 seconds
        }
    }

    handleNotification(notification) {
        // Trigger all registered handlers
        this.handlers.forEach((handler) => {
            try {
                handler(notification);
            } catch (error) {
                console.error('Error in notification handler:', error);
            }
        });
    }

    // Register a handler for notifications
    onNotification(handlerId, callback) {
        this.handlers.set(handlerId, callback);
    }

    // Unregister a handler
    offNotification(handlerId) {
        this.handlers.delete(handlerId);
    }

    async stopConnection() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
            this.handlers.clear();
            console.log('SignalR Disconnected');
        }
    }

    isConnected() {
        return this.connection && this.connection.state === 'Connected';
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
