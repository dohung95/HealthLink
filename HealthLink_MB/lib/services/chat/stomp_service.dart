import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../../config/api_config.dart';
import '../../models/chat/message.dart';

typedef OnMessageCallback = void Function(Message message);

class StompService {
  static final StompService _instance = StompService._internal();
  static StompService get instance => _instance;

  StompService._internal();

  StompClient? _stompClient;
  bool _isConnected = false;
  OnMessageCallback? _onMessageReceived;
  String? _userId;

  /// Kết nối đến STOMP WebSocket
  void connect(String token, String userId, OnMessageCallback onMessageReceived) {
    if (_isConnected && _stompClient != null) {
      debugPrint('[STOMP] Already connected.');
      _onMessageReceived = onMessageReceived;
      return;
    }

    _onMessageReceived = onMessageReceived;
    _userId = userId;

    _stompClient = StompClient(
      config: StompConfig(
        url: ApiConfig.wsUrl,
        onConnect: _onConnect,
        beforeConnect: () async {
          debugPrint('[STOMP] Connecting to ${ApiConfig.wsUrl}...');
        },
        onWebSocketError: (dynamic error) => debugPrint('[STOMP] WebSocket Error: $error'),
        onStompError: (StompFrame frame) => debugPrint('[STOMP] STOMP Error: ${frame.body}'),
        onDisconnect: (StompFrame frame) {
          debugPrint('[STOMP] Disconnected.');
          _isConnected = false;
        },
        stompConnectHeaders: {
          'Authorization': 'Bearer $token',
        },
        webSocketConnectHeaders: {
          'Authorization': 'Bearer $token',
        },
      ),
    );

    _stompClient?.activate();
  }

  void _onConnect(StompFrame frame) {
    debugPrint('[STOMP] Connected to backend!');
    _isConnected = true;

    // Lắng nghe kênh tin nhắn đến
    final destination = '/user/queue/chat';
    _stompClient?.subscribe(
      destination: destination,
      callback: (StompFrame frame) {
        if (frame.body != null) {
          try {
            final jsonMap = json.decode(frame.body!);
            if (_userId != null) {
              final message = Message.fromJson(jsonMap, _userId!);
              debugPrint('[STOMP] Received real-time message: ${message.id}');
              if (_onMessageReceived != null) {
                _onMessageReceived!(message);
              }
            }
          } catch (e) {
            debugPrint('[STOMP] Error parsing message: $e');
          }
        }
      },
    );
  }

  void disconnect() {
    if (_stompClient != null) {
      _stompClient?.deactivate();
      _stompClient = null;
      _isConnected = false;
      _onMessageReceived = null;
      debugPrint('[STOMP] Connection deactivated.');
    }
  }
}
