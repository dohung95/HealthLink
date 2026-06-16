import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';

import '../../config/api_config.dart';
import '../../models/notification/notification_item.dart';

class NotificationRealtimeService {
  NotificationRealtimeService._();

  static final NotificationRealtimeService instance =
  NotificationRealtimeService._();

  final StreamController<NotificationItem> _controller =
  StreamController<NotificationItem>.broadcast();

  Stream<NotificationItem> get stream => _controller.stream;

  StompClient? _client;
  bool _isConnected = false;
  bool _isConnecting = false;

  void connect({
    required String token,
  }) {
    if (_isConnected && _client != null) {
      debugPrint('[NotificationWS] Already connected.');
      return;
    }

    if (_isConnecting) {
      debugPrint('[NotificationWS] Connection already in progress.');
      return;
    }

    _isConnecting = true;

    debugPrint('[NotificationWS] Connecting to ${ApiConfig.wsUrl}');

    _client = StompClient(
      config: StompConfig(
        url: ApiConfig.wsUrl,
        beforeConnect: () async {
          debugPrint('[NotificationWS] Before connect...');
        },
        onConnect: _onConnect,
        onWebSocketError: (error) {
          debugPrint('[NotificationWS] WebSocket error: $error');
          _isConnected = false;
          _isConnecting = false;
        },
        onStompError: (frame) {
          debugPrint('[NotificationWS] STOMP error: ${frame.body}');
          _isConnected = false;
          _isConnecting = false;
        },
        onDisconnect: (frame) {
          debugPrint('[NotificationWS] Disconnected.');
          _isConnected = false;
          _isConnecting = false;
        },
        reconnectDelay: const Duration(seconds: 5),
        stompConnectHeaders: {
          'Authorization': 'Bearer $token',
        },
        webSocketConnectHeaders: {
          'Authorization': 'Bearer $token',
        },
      ),
    );

    _client?.activate();
  }

  void _onConnect(StompFrame frame) {
    debugPrint('[NotificationWS] Connected.');
    _isConnected = true;
    _isConnecting = false;

    _client?.subscribe(
      destination: '/user/queue/notifications',
      callback: (frame) {
        final body = frame.body;

        if (body == null || body.isEmpty) return;

        try {
          final data = jsonDecode(body);

          if (data is Map<String, dynamic>) {
            final item = NotificationItem.fromJson(data);
            debugPrint(
              '[NotificationWS] Received notification: ${item.notificationId}',
            );

            _controller.add(item);
          }
        } catch (error) {
          debugPrint('[NotificationWS] Parse error: $error');
        }
      },
    );
  }

  void disconnect() {
    _client?.deactivate();
    _client = null;
    _isConnected = false;
    _isConnecting = false;

    debugPrint('[NotificationWS] Deactivated.');
  }
}