import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../../config/api_config.dart';
import '../../models/chat/message.dart';

typedef OnMessageCallback = void Function(Message message);
typedef OnWebRTCSignalCallback = void Function(Map<String, dynamic> signal);

class StompService {
  static final StompService _instance = StompService._internal();
  static StompService get instance => _instance;

  StompService._internal();

  StompClient? _stompClient;
  bool _isConnected = false;
  bool _isConnecting = false; // Tránh tạo 2 kết nối cùng lúc
  OnMessageCallback? _onMessageReceived;
  String? _userId;

  /// Kết nối đến STOMP WebSocket
  void connect(String token, String userId, OnMessageCallback onMessageReceived) {
    // Luôn cập nhật callbacks trước
    _onMessageReceived = onMessageReceived;
    _userId = userId;

    if (_isConnected && _stompClient != null) {
      debugPrint('[STOMP] Already connected. Callbacks updated. userId=$userId');
      return;
    }

    // Tránh tạo 2 kết nối cùng lúc (race condition)
    if (_isConnecting) {
      debugPrint('[STOMP] Connection already in progress, skipping. userId=$userId');
      return;
    }

    _isConnecting = true;
    debugPrint('[STOMP] Initiating new connection for userId=$userId');

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
          _isConnecting = false;
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
    _isConnecting = false;

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
