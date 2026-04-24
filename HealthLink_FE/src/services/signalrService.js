import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.listeners = new Map();
  }

  async startConnection() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR already connected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, cannot connect to SignalR');
      return;
    }

    // console.log('Starting SignalR connection with token:', token.substring(0, 20) + '...');

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7267/notificationHub', {
        accessTokenFactory: () => {
          const currentToken = localStorage.getItem('token');
          // console.log('Providing token for SignalR connection');
          return currentToken;
        },
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Retry delays: 0s, 2s, 10s, 30s, then 60s
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          if (retryContext.previousRetryCount === 3) return 30000;
          return 60000;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Handle reconnecting
    this.connection.onreconnecting(error => {
      console.log('SignalR reconnecting...', error);
    });

    // Handle reconnected
    this.connection.onreconnected(connectionId => {
      console.log('✅ SignalR reconnected with connection ID:', connectionId);
      // Re-register all listeners after reconnect
      this.reregisterListeners();
    });

    // Handle closed
    this.connection.onclose(error => {
      console.log('SignalR connection closed', error);
      // Try to reconnect after 5 seconds
      setTimeout(() => this.startConnection(), 5000);
    });

    try {
      await this.connection.start();
      console.log('✅ SignalR connected successfully, state:', this.connection.state);
      console.log('📊 Connection details:', {
        connectionId: this.connection.connectionId,
        baseUrl: this.connection.baseUrl,
        state: this.connection.state
      });
      
      // Re-register all listeners after connection is ready
      console.log('📢 Registering all pending listeners...');
      this.listeners.forEach((callbacks, eventName) => {
        callbacks.forEach(callback => {
          console.log(`  → Registering listener for: ${eventName}`);
          this.connection.on(eventName, callback);
        });
      });
      console.log('✅ All listeners registered successfully');
    } catch (err) {
      console.error('❌ Error starting SignalR connection:', err);
      console.error('Error details:', {
        message: err.message,
        statusCode: err.statusCode,
        errorType: err.constructor.name
      });
      
      // Don't retry if it's an authentication error
      if (err.statusCode === 401 || err.message?.includes('401')) {
        console.error('❌ SignalR Authentication failed. Please login again.');
        return; // Stop retrying
      }
      
      // Retry after 5 seconds for other errors
      setTimeout(() => this.startConnection(), 5000);
    }
  }

  async stopConnection() {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('SignalR connection stopped');
        this.connection = null;
      } catch (err) {
        console.error('Error stopping SignalR connection:', err);
      }
    }
  }

  reregisterListeners() {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.warn('Cannot reregister listeners: connection not ready');
      return;
    }

    console.log('Reregistering SignalR listeners...');
    this.listeners.forEach((callbacks, eventName) => {
      callbacks.forEach(callback => {
        this.connection.on(eventName, callback);
      });
    });
    console.log('Listeners reregistered:', Array.from(this.listeners.keys()));
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);

    // Always try to register if connection exists and is connected
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log(`📢 Registering listener for event: ${eventName}`);
      this.connection.on(eventName, callback);
    } else {
      console.warn(`⚠️ Connection not ready, listener for '${eventName}' will be registered when connected`);
    }
  }

  off(eventName, callback) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(eventName);
      }
    }

    if (this.connection) {
      this.connection.off(eventName, callback);
    }
  }

  async invoke(methodName, ...args) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        return await this.connection.invoke(methodName, ...args);
      } catch (err) {
        console.error(`Error invoking ${methodName}:`, err);
        throw err;
      }
    } else {
      console.warn('SignalR not connected. Cannot invoke method:', methodName);
      throw new Error('SignalR connection not established');
    }
  }

  getConnectionState() {
    return this.connection?.state || signalR.HubConnectionState.Disconnected;
  }
}

// Create singleton instance
const signalRService = new SignalRService();
export default signalRService;
