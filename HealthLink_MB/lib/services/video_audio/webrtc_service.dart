import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:permission_handler/permission_handler.dart';

class WebRTCService {
  static final WebRTCService _instance = WebRTCService._internal();
  static WebRTCService get instance => _instance;

  WebRTCService._internal();

  RTCPeerConnection? _peerConnection;
  
  bool get isPeerConnectionReady => _peerConnection != null;
  MediaStream? _localStream;
  MediaStream? _remoteStream;

  // Renderers for UI
  final RTCVideoRenderer localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();

  // Callbacks for signaling
  Function(RTCIceCandidate candidate)? onIceCandidate;
  Function(MediaStream stream)? onAddRemoteStream;
  Function(RTCPeerConnectionState state)? onConnectionStateChange;

  bool _isInitialized = false;
  bool _isRemoteDescriptionSet = false;
  final List<RTCIceCandidate> _pendingCandidates = [];

  final Map<String, dynamic> _iceConfiguration = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
      {
        'urls': 'turn:openrelay.metered.ca:80',
        'username': 'openrelayproject',
        'credential': 'openrelayproject'
      },
      {
        'urls': 'turn:openrelay.metered.ca:443',
        'username': 'openrelayproject',
        'credential': 'openrelayproject'
      },
      {
        'urls': 'turn:openrelay.metered.ca:443?transport=tcp',
        'username': 'openrelayproject',
        'credential': 'openrelayproject'
      }
    ],
    'iceCandidatePoolSize': 10,
  };

  Future<void> initialize() async {
    if (_isInitialized) return;
    await localRenderer.initialize();
    await remoteRenderer.initialize();
    _isInitialized = true;
  }

  Future<void> requestPermissions() async {
    await [Permission.camera, Permission.microphone].request();
  }

  Future<void> startLocalStream() async {
    await requestPermissions();

    final Map<String, dynamic> mediaConstraints = {
      'audio': true,
      'video': {
        'facingMode': 'user',
        'mandatory': {
          'minWidth': '640',
          'minHeight': '480',
          'minFrameRate': '30',
        },
        'optional': [],
      }
    };

    try {
      _localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localRenderer.srcObject = _localStream;
      debugPrint('[WebRTC] Local stream started');
    } catch (e) {
      debugPrint('[WebRTC] Error starting local stream: $e');
    }
  }

  Future<void> setupPeerConnection() async {
    _peerConnection = await createPeerConnection(_iceConfiguration);

    // Thêm local stream vào PC
    if (_localStream != null) {
      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });
    }

    // Lắng nghe ICE Candidate
    _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
      debugPrint('[WebRTC] Local ICE Candidate generated');
      onIceCandidate?.call(candidate);
    };

    // Lắng nghe Remote Stream
    _peerConnection!.onTrack = (RTCTrackEvent event) {
      if (event.streams.isNotEmpty) {
        debugPrint('[WebRTC] Remote track added');
        _remoteStream = event.streams[0];
        remoteRenderer.srcObject = _remoteStream;
        onAddRemoteStream?.call(_remoteStream!);
      }
    };

    // Lắng nghe trạng thái
    _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
      debugPrint('\x1B[31m[WebRTC LOG] Connection state change: $state\x1B[0m');
      onConnectionStateChange?.call(state);
    };

    _peerConnection!.onIceConnectionState = (RTCIceConnectionState state) {
      debugPrint('\x1B[31m[WebRTC LOG] ICE Connection state change: $state\x1B[0m');
    };
  }

  Future<RTCSessionDescription?> createOffer() async {
    if (_peerConnection == null) return null;
    try {
      final offer = await _peerConnection!.createOffer();
      await _peerConnection!.setLocalDescription(offer);
      debugPrint('[WebRTC] Offer created and set as local description');
      return offer;
    } catch (e) {
      debugPrint('[WebRTC] Error creating offer: $e');
      return null;
    }
  }

  Future<RTCSessionDescription?> createAnswer() async {
    if (_peerConnection == null) return null;
    try {
      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);
      debugPrint('[WebRTC] Answer created and set as local description');
      return answer;
    } catch (e) {
      debugPrint('[WebRTC] Error creating answer: $e');
      return null;
    }
  }

  Future<void> setRemoteDescription(RTCSessionDescription description) async {
    if (_peerConnection == null) return;
    try {
      await _peerConnection!.setRemoteDescription(description);
      _isRemoteDescriptionSet = true;
      debugPrint('[WebRTC] Remote description set');
      
      // Process pending candidates
      for (var candidate in _pendingCandidates) {
        await _peerConnection!.addCandidate(candidate);
        debugPrint('[WebRTC] Applied pending remote ICE candidate');
      }
      _pendingCandidates.clear();
    } catch (e) {
      debugPrint('[WebRTC] Error setting remote description: $e');
    }
  }

  Future<void> addIceCandidate(RTCIceCandidate candidate) async {
    if (_peerConnection == null) return;
    
    if (!_isRemoteDescriptionSet) {
      debugPrint('[WebRTC] Queuing ICE candidate because remote description is not set yet');
      _pendingCandidates.add(candidate);
      return;
    }
    
    try {
      await _peerConnection!.addCandidate(candidate);
      debugPrint('[WebRTC] Remote ICE candidate added');
    } catch (e) {
      debugPrint('[WebRTC] Error adding ICE candidate: $e');
    }
  }

  Future<void> toggleCamera(bool isOff) async {
    if (_localStream != null) {
      final videoTracks = _localStream!.getVideoTracks();
      for (var track in videoTracks) {
        track.enabled = !isOff;
      }
    }
  }

  Future<void> toggleMic(bool isMuted) async {
    if (_localStream != null) {
      final audioTracks = _localStream!.getAudioTracks();
      for (var track in audioTracks) {
        track.enabled = !isMuted;
      }
    }
  }

  Future<void> switchCamera() async {
    if (_localStream != null) {
      try {
        final videoTrack = _localStream!.getVideoTracks().firstWhere((track) => track.kind == 'video');
        await Helper.switchCamera(videoTrack);
      } catch (e) {
        debugPrint('[WebRTC] Error switching camera: $e');
      }
    }
  }

  void disposeCall() {
    debugPrint('[WebRTC] Disposing call...');
    
    _pendingCandidates.clear();
    _isRemoteDescriptionSet = false;

    _localStream?.getTracks().forEach((track) {
      track.stop();
    });
    _localStream?.dispose();
    _localStream = null;

    _remoteStream?.getTracks().forEach((track) {
      track.stop();
    });
    _remoteStream?.dispose();
    _remoteStream = null;

    _peerConnection?.close();
    _peerConnection?.dispose();
    _peerConnection = null;

    localRenderer.srcObject = null;
    remoteRenderer.srcObject = null;

    onIceCandidate = null;
    onAddRemoteStream = null;
    onConnectionStateChange = null;
  }
}
