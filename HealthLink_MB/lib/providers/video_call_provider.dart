import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../../main.dart';
import '../../services/video_audio/webrtc_stomp_service.dart';
import '../../services/video_audio/webrtc_service.dart';
import '../../screens/video_audio/video_call_screen.dart';
import '../services/chat/chat_service.dart';
import '../providers/auth_provider.dart';
import 'package:provider/provider.dart';
import 'package:flutter_ringtone_player/flutter_ringtone_player.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class VideoCallProvider extends ChangeNotifier {
  bool _isInCall = false;
  bool get isInCall => _isInCall;

  Timer? _incomingCallTimer;
  Timer? _outgoingCallTimer;

  void _clearTimers() {
    _incomingCallTimer?.cancel();
    _outgoingCallTimer?.cancel();
    _incomingCallTimer = null;
    _outgoingCallTimer = null;
  }

  String? _lastUserId;
  OverlayEntry? _pipOverlay;
  
  // Call metadata
  String? currentPartnerName;
  String? currentPartnerId;
  String? currentRoomId;
  bool currentIsCaller = false;
  DateTime? callStartTime;
  bool isRemoteCameraOff = false;

  VideoCallProvider() {
    // Register STOMP callback
    WebrtcStompService.instance.onWebRTCSignalReceived = _onWebRTCSignal;
  }

  void updateUserId(String? userId) {
    _lastUserId = userId;
  }

  void _sendCallHistory(String status) async {
    if (!currentIsCaller || currentRoomId == null || currentPartnerId == null) return;
    int duration = 0;
    if (callStartTime != null) {
      duration = DateTime.now().difference(callStartTime!).inSeconds;
    }
    
    final context = navigatorKey.currentContext;
    if (context == null) return;
    
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final token = auth.accessToken;
    final userId = auth.userId;
    if (token == null || userId == null) return;

    try {
      await ChatService.sendMessage(
        token,
        userId,
        currentRoomId!,
        currentPartnerId!,
        '[CALL_HISTORY] duration:$duration status:$status',
      );
    } catch (e) {
      debugPrint('[VideoCallProvider] Error sending call history: $e');
    }
  }

  void _onWebRTCSignal(Map<String, dynamic> signal) async {
    debugPrint('[VideoCallProvider] ⚡️ WebRTC signal received: $signal');
    final type = signal['type'];
    final senderId = signal['senderId'];
    final senderName = signal['senderName'];
    final roomId = signal['data'];

    if (type == 'CALL_REQUEST') {
      if (_isInCall) {
        debugPrint('[VideoCallProvider] Automatically declining because already in a call.');
        WebrtcStompService.instance.sendWebRTCSignal({
          'type': 'CALL_DECLINED',
          'senderId': _lastUserId ?? '',
          'senderName': 'Patient',
          'receiverId': senderId,
          'data': roomId,
        });
        return;
      }

      debugPrint('[VideoCallProvider] 📲 Incoming call from $senderName - showing dialog...');
      
      // Play ringtone
      try {
        FlutterRingtonePlayer().playRingtone();
      } catch (e) {
        debugPrint('[VideoCallProvider] Error playing ringtone: $e');
      }

      final context = navigatorKey.currentContext;
      
      if (context != null) {
        _incomingCallTimer = Timer(const Duration(seconds: 30), () {
          FlutterRingtonePlayer().stop();
          final currentContext = navigatorKey.currentContext;
          if (currentContext != null) {
            Navigator.popUntil(currentContext, (route) => route.settings.name != '/incoming_call');
            ScaffoldMessenger.of(currentContext).showSnackBar(
              const SnackBar(content: Text('Incoming call timed out after 30 seconds.')),
            );
          }
          WebrtcStompService.instance.sendWebRTCSignal({
            'type': 'CALL_DECLINED',
            'senderId': _lastUserId ?? '',
            'senderName': 'Patient',
            'receiverId': senderId,
            'data': roomId,
          });
          WebrtcStompService.instance.sendWebRTCSignal({
            'type': 'CALL_HANDLED_ELSEWHERE',
            'senderId': _lastUserId ?? '',
            'receiverId': _lastUserId ?? '',
            'data': roomId,
          });
        });

        showDialog(
          context: context,
          barrierDismissible: false,
          routeSettings: const RouteSettings(name: '/incoming_call'),
          builder: (BuildContext dialogContext) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(Icons.videocam, color: Colors.green, size: 28),
                  const SizedBox(width: 8),
                  const Text('Incoming Video Call'),
                ],
              ),
              content: Text('${senderName ?? 'A doctor'} is calling you for a consultation.'),
              actions: [
                TextButton(
                  onPressed: () {
                    _clearTimers();
                    FlutterRingtonePlayer().stop();
                    Navigator.pop(dialogContext);
                    WebrtcStompService.instance.sendWebRTCSignal({
                      'type': 'CALL_DECLINED',
                      'senderId': _lastUserId ?? '',
                      'senderName': 'Patient',
                      'receiverId': senderId,
                      'data': roomId,
                    });

                    // Báo cho các thiết bị KHÁC CỦA CHÍNH MÌNH tắt chuông
                    WebrtcStompService.instance.sendWebRTCSignal({
                      'type': 'CALL_HANDLED_ELSEWHERE',
                      'senderId': _lastUserId ?? '',
                      'receiverId': _lastUserId ?? '',
                      'data': roomId,
                    });
                  },
                  child: const Text('Decline', style: TextStyle(color: Colors.red)),
                ),
                FilledButton(
                  onPressed: () {
                    _clearTimers();
                    FlutterRingtonePlayer().stop();
                    Navigator.pop(dialogContext);
                    WebrtcStompService.instance.sendWebRTCSignal({
                      'type': 'CALL_ACCEPTED',
                      'senderId': _lastUserId ?? '',
                      'senderName': 'Patient',
                      'receiverId': senderId,
                      'data': roomId,
                    });

                    // Báo cho các thiết bị KHÁC CỦA CHÍNH MÌNH tắt chuông
                    WebrtcStompService.instance.sendWebRTCSignal({
                      'type': 'CALL_HANDLED_ELSEWHERE',
                      'senderId': _lastUserId ?? '',
                      'receiverId': _lastUserId ?? '',
                      'data': roomId,
                    });
                    
                    _isInCall = true;
                    WakelockPlus.enable();
                    callStartTime = DateTime.now();
                    notifyListeners();

                    currentPartnerName = senderName ?? 'Unknown';
                    currentPartnerId = senderId;
                    currentRoomId = roomId;
                    currentIsCaller = false;

                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        settings: const RouteSettings(name: '/video_call'),
                        builder: (_) => VideoCallScreen(
                          partnerName: currentPartnerName!,
                          partnerRole: 'Doctor',
                          partnerId: currentPartnerId,
                          roomId: currentRoomId,
                          isCaller: currentIsCaller,
                        ),
                      ),
                    ).then((_) {
                      // Do nothing here because pop doesn't always mean end call anymore
                    });
                  },
                  child: const Text('Accept'),
                ),
              ],
            );
          }
        );
      }
    } else if (type == 'HANGUP' || type == 'CALL_DECLINED' || type == 'CALL_HANDLED_ELSEWHERE') {
      debugPrint('[VideoCallProvider] 📞 Call ended/declined/handled elsewhere by $senderName');
      _clearTimers();
      FlutterRingtonePlayer().stop();

      // Nếu là CALL_HANDLED_ELSEWHERE và thiết bị này ĐÃ VÀO CUỘC GỌI (chính nó vừa Accept)
      // thì KHÔNG ĐƯỢC tắt cuộc gọi, chỉ bỏ qua tín hiệu này.
      if (type == 'CALL_HANDLED_ELSEWHERE' && _isInCall) {
        debugPrint('[VideoCallProvider] Ignoring CALL_HANDLED_ELSEWHERE because this device accepted the call.');
        return;
      }

      String status = type == 'CALL_DECLINED' ? 'DECLINED' : (callStartTime != null ? 'COMPLETED' : 'MISSED');
      _sendCallHistory(status);

      _isInCall = false;
      WakelockPlus.disable();
      callStartTime = null;
      isRemoteCameraOff = false;
      hidePiP();
      
      // Clear IDs so duplicate HANGUPs don't trigger MISSED call history again
      currentRoomId = null;
      currentPartnerId = null;
      currentIsCaller = false;
      
      notifyListeners();
      try {
        WebRTCService.instance.disposeCall();
      } catch (e) {
        debugPrint('[VideoCallProvider] Error disposing call: $e');
      }

      navigatorKey.currentState?.popUntil((route) {
        final name = route.settings.name;
        if (name == '/video_call' || name == '/incoming_call') {
          return false;
        }
        return true;
      });
    } else if (type == 'OFFER') {
      final dataStr = signal['data'];
      if (dataStr != null) {
        try {
          while (!WebRTCService.instance.isPeerConnectionReady && _isInCall) {
            await Future.delayed(const Duration(milliseconds: 500));
          }
          if (!_isInCall) return;

          final offerMap = json.decode(dataStr);
          final description = RTCSessionDescription(offerMap['sdp'], offerMap['type']);
          await WebRTCService.instance.setRemoteDescription(description);
          final answer = await WebRTCService.instance.createAnswer();
          if (answer != null) {
            WebrtcStompService.instance.sendWebRTCSignal({
              'type': 'ANSWER',
              'senderId': _lastUserId ?? '',
              'receiverId': senderId,
              'data': json.encode({'sdp': answer.sdp, 'type': answer.type}),
            });
          }
        } catch (e) {
          debugPrint('[VideoCallProvider] Error handling OFFER: $e');
        }
      }
    } else if (type == 'ANSWER') {
      final dataStr = signal['data'];
      if (dataStr != null) {
        try {
          while (!WebRTCService.instance.isPeerConnectionReady && _isInCall) {
            await Future.delayed(const Duration(milliseconds: 500));
          }
          if (!_isInCall) return;

          final answerMap = json.decode(dataStr);
          final description = RTCSessionDescription(answerMap['sdp'], answerMap['type']);
          await WebRTCService.instance.setRemoteDescription(description);
        } catch (e) {
          debugPrint('[VideoCallProvider] Error handling ANSWER: $e');
        }
      }
    } else if (type == 'CANDIDATE') {
      final dataStr = signal['data'];
      if (dataStr != null) {
        try {
          while (!WebRTCService.instance.isPeerConnectionReady && _isInCall) {
            await Future.delayed(const Duration(milliseconds: 500));
          }
          if (!_isInCall) return;

          final candidateMap = json.decode(dataStr);
          final candidate = RTCIceCandidate(
            candidateMap['candidate'],
            candidateMap['sdpMid'],
            candidateMap['sdpMLineIndex'],
          );
          await WebRTCService.instance.addIceCandidate(candidate);
        } catch (e) {
          debugPrint('[VideoCallProvider] Error handling CANDIDATE: $e');
        }
      }
    } else if (type == 'CALL_ACCEPTED') {
      // Khi Mobile là Caller, Web đã nhận cuộc gọi
      // Mobile tạo Offer và gửi đi
      debugPrint('[VideoCallProvider] Call accepted by Web. Creating Offer after delay...');
      callStartTime = DateTime.now();
      
      // Đợi 2.5s để tab Web của người nhận kịp mở và subscribe WebRTC (giống logic trên Web)
      await Future.delayed(const Duration(milliseconds: 2500));
      
      if (!_isInCall) return; // Đề phòng user cúp máy trong lúc chờ
      
      final offer = await WebRTCService.instance.createOffer();
      if (offer != null) {
        WebrtcStompService.instance.sendWebRTCSignal({
          'type': 'OFFER',
          'senderId': _lastUserId ?? '',
          'receiverId': senderId,
          'data': json.encode({'sdp': offer.sdp, 'type': offer.type}),
        });
      }
    } else if (type == 'TOGGLE_CAMERA') {
      final String? statusStr = signal['data'];
      if (statusStr != null) {
        isRemoteCameraOff = statusStr == 'true';
        notifyListeners();
      }
    }
  }

  void sendToggleCameraSignal(bool isOff) {
    if (currentPartnerId != null) {
      WebrtcStompService.instance.sendWebRTCSignal({
        'type': 'TOGGLE_CAMERA',
        'senderId': _lastUserId ?? '',
        'receiverId': currentPartnerId,
        'data': isOff.toString(),
      });
    }
  }

  bool sendCallRequest({
    required String receiverId,
    required String roomId,
    required String myId,
    required String myName,
  }) {
    if (_isInCall) {
      debugPrint('[VideoCallProvider] Blocked: Already in a call');
      return false;
    }

    _isInCall = true;
    WakelockPlus.enable();
    currentPartnerId = receiverId;
    currentRoomId = roomId;
    currentPartnerName = 'Doctor';
    currentIsCaller = true;
    notifyListeners();

    WebrtcStompService.instance.sendWebRTCSignal({
      'type': 'CALL_REQUEST',
      'senderId': myId,
      'senderName': myName,
      'receiverId': receiverId,
      'data': roomId,
    });

    _outgoingCallTimer = Timer(const Duration(seconds: 30), () {
      if (_isInCall && callStartTime == null && currentRoomId == roomId) {
        debugPrint('[VideoCallProvider] Call timed out after 30 seconds');
        _sendCallHistory('MISSED');
        WebrtcStompService.instance.sendWebRTCSignal({
          'type': 'HANGUP',
          'senderId': myId,
          'receiverId': receiverId,
          'data': roomId,
        });
        
        _clearTimers();
        _isInCall = false;
        WakelockPlus.disable();
        currentRoomId = null;
        currentPartnerId = null;
        currentIsCaller = false;
        notifyListeners();
        
        try {
          WebRTCService.instance.disposeCall();
        } catch (e) {
          debugPrint('[VideoCallProvider] Error disposing call on timeout: $e');
        }
        
        final context = navigatorKey.currentContext;
        if (context != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No answer. Call timed out after 30 seconds.')),
          );
          Navigator.popUntil(context, (route) => route.settings.name != '/video_call');
        }
      }
    });

    return true;
  }

  void endCall({String? overrideStatus}) {
    String status = overrideStatus ?? (callStartTime != null ? 'COMPLETED' : 'MISSED');
    _sendCallHistory(status);
    _clearTimers();
    _isInCall = false;
    WakelockPlus.disable();
    callStartTime = null;
    isRemoteCameraOff = false;
    hidePiP();
    
    // Clear IDs so duplicate HANGUPs don't trigger MISSED call history again
    currentRoomId = null;
    currentPartnerId = null;
    currentIsCaller = false;
    
    notifyListeners();
    FlutterRingtonePlayer().stop();
    try {
      WebRTCService.instance.disposeCall();
    } catch (e) {
      debugPrint('[VideoCallProvider] Error disposing call: $e');
    }
  }

  void showPiP(BuildContext context) {
    if (_pipOverlay != null) return;
    
    double top = 100;
    double left = MediaQuery.of(context).size.width - 120; // 100 width + 20 margin

    _pipOverlay = OverlayEntry(
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return Positioned(
            top: top,
            left: left,
            child: GestureDetector(
              onPanUpdate: (details) {
                setState(() {
                  top += details.delta.dy;
                  left += details.delta.dx;
                });
              },
              onTap: () => restoreCall(context),
              child: Material(
                elevation: 8,
                borderRadius: BorderRadius.circular(12),
                clipBehavior: Clip.antiAlias,
                child: Container(
                  width: 110,
                  height: 160,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    border: Border.all(color: Colors.green, width: 2),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 5)),
                    ],
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      RTCVideoView(
                        WebRTCService.instance.remoteRenderer,
                        objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                      ),
                      Positioned(
                        top: 6,
                        right: 6,
                        width: 35,
                        height: 50,
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white70, width: 1.5),
                            borderRadius: BorderRadius.circular(6),
                            boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 4)],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: RTCVideoView(
                              WebRTCService.instance.localRenderer,
                              mirror: true,
                              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }
      ),
    );

    Overlay.of(context).insert(_pipOverlay!);
  }

  void hidePiP() {
    _pipOverlay?.remove();
    _pipOverlay = null;
  }

  void restoreCall(BuildContext context) {
    hidePiP();
    if (currentPartnerName != null && currentPartnerId != null && currentRoomId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          settings: const RouteSettings(name: '/video_call'),
          builder: (_) => VideoCallScreen(
            partnerName: currentPartnerName!,
            partnerRole: 'Doctor',
            partnerId: currentPartnerId,
            roomId: currentRoomId,
            isCaller: currentIsCaller,
            isResuming: true,
          ),
        ),
      );
    }
  }
}
