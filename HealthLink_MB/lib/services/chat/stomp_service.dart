import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../../config/api_config.dart';
import '../../models/chat/message.dart';

typedef OnMessageCallback = void Function(Message message);
typedef OnWebRTCSignalCallback = void Function(Map<String, dynamic> signal);

typedef OnPresenceCallback = void Function(Map<String, dynamic> presence);

class StompService {
  static final StompService _instance = StompService._internal();
  static StompService get instance => _instance;

  StompService._internal();

  StompClient? _stompClient;
  bool _isConnected = false;
  bool _isConnecting = false; // Tránh tạo 2 kết nối cùng lúc
  OnMessageCallback? _onMessageReceived;
  OnPresenceCallback? _onPresenceReceived;
  String? _userId;

  /// Kết nối đến STOMP WebSocket
  void connect(String token, String userId, OnMessageCallback onMessageReceived, {OnPresenceCallback? onPresenceReceived}) {
    // Luôn cập nhật callbacks trước
    _onMessageReceived = onMessageReceived;
    _onPresenceReceived = onPresenceReceived;
    _userId = userId;

    if (_isConnected && _stompClient != null) {
      debugPrint('[STOMP] Already connected. Callbacks updated. userId=$userId');
      
      // Nếu đã kết nối, phải subscribe lại vào /topic/presence ngay lập tức để nhận sự kiện 
      // (đề phòng trường hợp trước đó chưa subscribe do hot-reload)
      _stompClient?.subscribe(
        destination: '/topic/presence',
        callback: (StompFrame frame) {
          if (frame.body != null) {
            try {
              final jsonMap = json.decode(frame.body!);
              if (_onPresenceReceived != null) {
                _onPresenceReceived!(jsonMap);
              }
            } catch (e) {
              debugPrint('[STOMP] Error parsing presence message (already connected): $e');
            }
          }
        },
      );

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

    // Lắng nghe kênh trạng thái online/offline
    _stompClient?.subscribe(
      destination: '/topic/presence',
      callback: (StompFrame frame) {
        if (frame.body != null) {
          try {
            final jsonMap = json.decode(frame.body!);
            if (_onPresenceReceived != null) {
              _onPresenceReceived!(jsonMap);
            }
          } catch (e) {
            debugPrint('[STOMP] Error parsing presence message: $e');
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
