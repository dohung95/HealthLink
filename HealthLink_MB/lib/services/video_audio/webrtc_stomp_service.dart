import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../../config/api_config.dart';

typedef OnWebRTCSignalCallback = void Function(Map<String, dynamic> signal);

enum WebrtcConnectionState { disconnected, connecting, connected }

class WebrtcStompService {
  static final WebrtcStompService _instance = WebrtcStompService._internal();
  static WebrtcStompService get instance => _instance;

  WebrtcStompService._internal();

  StompClient? _stompClient;
  bool _isConnected = false;
  bool _isConnecting = false;
  OnWebRTCSignalCallback? onWebRTCSignalReceived;

  WebrtcConnectionState get connectionState {
    if (_isConnected && _stompClient?.connected == true) {
      return WebrtcConnectionState.connected;
    }
    if (_isConnecting) return WebrtcConnectionState.connecting;
    return WebrtcConnectionState.disconnected;
  }

  /// Kết nối đến STOMP WebSocket
  void connect(String token, String userId, {OnWebRTCSignalCallback? onWebRTCSignalReceived}) {
    if (onWebRTCSignalReceived != null) {
      this.onWebRTCSignalReceived = onWebRTCSignalReceived;
    }

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
        onWebSocketError: (dynamic error) {
          _isConnected = false;
          _isConnecting = false;
          debugPrint('[WebrtcStomp] WebSocket Error: $error');
        },
        onStompError: (StompFrame frame) {
          _isConnected = false;
          _isConnecting = false;
          debugPrint('[WebrtcStomp] STOMP Error: ${frame.body}');
        },
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

  Future<bool> sendWebRTCSignal(Map<String, dynamic> signal) async {
    if (connectionState != WebrtcConnectionState.connected ||
        _stompClient?.connected != true) {
      debugPrint('[WebrtcStomp] Cannot send signal, not connected.');
      return false;
    }

    _stompClient!.send(
        destination: '/app/webrtc.signal',
        body: json.encode(signal),
    );
    debugPrint('[WebrtcStomp] Sent signal: ${signal['type']}');
    return true;
  }

  void disconnect() {
    if (_stompClient != null) {
      _stompClient?.deactivate();
      _stompClient = null;
      _isConnected = false;
      _isConnecting = false;
      debugPrint('[WebrtcStomp] Connection deactivated.');
    }
  }
}
