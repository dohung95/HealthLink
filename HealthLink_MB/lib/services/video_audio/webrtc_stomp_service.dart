import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../../config/api_config.dart';

typedef OnWebRTCSignalCallback = void Function(Map<String, dynamic> signal);

class WebrtcStompService {
  static final WebrtcStompService _instance = WebrtcStompService._internal();
  static WebrtcStompService get instance => _instance;

  WebrtcStompService._internal();

  StompClient? _stompClient;
  bool _isConnected = false;
  bool _isConnecting = false;
  OnWebRTCSignalCallback? onWebRTCSignalReceived;
  String? _userId;

  /// Kết nối đến STOMP WebSocket
  void connect(String token, String userId, {OnWebRTCSignalCallback? onWebRTCSignalReceived}) {
    if (onWebRTCSignalReceived != null) {
      this.onWebRTCSignalReceived = onWebRTCSignalReceived;
    }
    _userId = userId;

    if (_isConnected && _stompClient != null) {
      debugPrint('[WebrtcStomp] Already connected. Callbacks updated. userId=$userId');
      return;
    }

    if (_isConnecting) {
      debugPrint('[WebrtcStomp] Connection already in progress, skipping. userId=$userId');
      return;
    }

    _isConnecting = true;
    debugPrint('[WebrtcStomp] Initiating new connection for userId=$userId');

    _stompClient = StompClient(
      config: StompConfig(
        url: ApiConfig.wsUrl,
        onConnect: _onConnect,
        beforeConnect: () async {
          debugPrint('[WebrtcStomp] Connecting to ${ApiConfig.wsUrl}...');
        },
        onWebSocketError: (dynamic error) => debugPrint('[WebrtcStomp] WebSocket Error: $error'),
        onStompError: (StompFrame frame) => debugPrint('[WebrtcStomp] STOMP Error: ${frame.body}'),
        onDisconnect: (StompFrame frame) {
          debugPrint('[WebrtcStomp] Disconnected.');
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
    debugPrint('[WebrtcStomp] Connected to backend!');
    _isConnected = true;
    _isConnecting = false;

    // Lắng nghe kênh tín hiệu WebRTC (Video Call)
    _stompClient?.subscribe(
      destination: '/user/queue/webrtc',
      callback: (StompFrame frame) {
        if (frame.body != null) {
          try {
            final jsonMap = json.decode(frame.body!);
            debugPrint('[WebrtcStomp] Received WebRTC signal: ${jsonMap['type']}');
            if (onWebRTCSignalReceived != null) {
              onWebRTCSignalReceived!(jsonMap);
            }
          } catch (e) {
            debugPrint('[WebrtcStomp] Error parsing WebRTC signal: $e');
          }
        }
      },
    );
  }

  void sendWebRTCSignal(Map<String, dynamic> signal) {
    if (_isConnected && _stompClient != null) {
      _stompClient?.send(
        destination: '/app/webrtc.signal',
        body: json.encode(signal),
      );
      debugPrint('[WebrtcStomp] Sent signal: ${signal['type']}');
    } else {
      debugPrint('[WebrtcStomp] Cannot send signal, not connected.');
    }
  }

  void disconnect() {
    if (_stompClient != null) {
      _stompClient?.deactivate();
      _stompClient = null;
      _isConnected = false;
      debugPrint('[WebrtcStomp] Connection deactivated.');
    }
  }
}
