import 'dart:async';
import 'dart:ui';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/video_audio/webrtc_stomp_service.dart';
import '../../services/video_audio/webrtc_service.dart';
import '../../providers/video_call_provider.dart';

class VideoCallScreen extends StatefulWidget {
  final String partnerName;
  final String partnerRole;
  final String? partnerId;
  final String? roomId;
  final bool isCaller;
  final bool isResuming;

  const VideoCallScreen({
    super.key,
    this.partnerName = 'Dr. Sarah Mitchell',
    this.partnerRole = 'Doctor',
    this.partnerId,
    this.roomId,
    this.isCaller = false,
    this.isResuming = false,
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> with SingleTickerProviderStateMixin {
  late Timer _timer;

  bool _isMuted = false;
  bool _isVideoOff = false;
  bool _isConnected = false;

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_isConnected && mounted) {
        setState(() {}); // Just rebuild to update the timer text
      }
    });

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(_animationController);

    _initWebRTC();
  }

  Future<void> _initWebRTC() async {
    final webrtc = WebRTCService.instance;
    await webrtc.initialize();

    webrtc.onConnectionStateChange = () {
      if (mounted) {
        setState(() {
          _isConnected = true;
        });
        _animationController.forward();
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) _animationController.reverse();
        });
      }
    };

    webrtc.onAddRemoteStream = (stream) {
      if (mounted) setState(() {});
    };

    webrtc.onIceCandidate = (candidate) {
      WebrtcStompService.instance.sendWebRTCSignal({
        'type': 'CANDIDATE',
        'senderId': context.read<AuthProvider>().userId ?? '',
        'receiverId': widget.partnerId,
        'data': json.encode({
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        }),
      });
    };

    if (widget.isResuming) {
      if (mounted) {
        setState(() {
          _isConnected = true;
        });
      }
    } else {
      await webrtc.startLocalStream();
      await webrtc.setupPeerConnection();
      if (mounted) setState(() {}); // Cập nhật local renderer
    }

    // Nếu mình là người gọi (Mobile gọi Web), mình đã tạo Offer lúc nhấn Call rồi.
    // Nếu mình là người nghe (Web gọi Mobile), Web sẽ tự tạo Offer gửi qua. Mình chờ OFFER.
  }

  @override
  void dispose() {
    _timer.cancel();
    _animationController.dispose();
    super.dispose();
  }

  String get _formattedTime {
    final provider = context.read<VideoCallProvider>();
    if (provider.callStartTime == null) return '00:00';
    
    final secondsElapsed = DateTime.now().difference(provider.callStartTime!).inSeconds;
    final int minutes = secondsElapsed ~/ 60;
    final int seconds = secondsElapsed % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final bool isWide = MediaQuery.of(context).size.width > 1024;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        context.read<VideoCallProvider>().showPiP(context);
        Navigator.pop(context);
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // --- 1. Background Video Feed (Partner) ---
            Container(
              width: double.infinity,
              height: double.infinity,
              color: Colors.black87,
              child: _isConnected
                  ? RTCVideoView(
                      WebRTCService.instance.remoteRenderer,
                      objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                    )
                  : Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const CircularProgressIndicator(color: Colors.white54),
                          const SizedBox(height: 16),
                          Text(
                            'Connecting to ${widget.partnerName}...',
                            style: const TextStyle(color: Colors.white54, fontSize: 18),
                          ),
                        ],
                      ),
                    ),
            ),

            // --- 2. Top Header Overlay ---
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00463B).withOpacity(0.6),
                            border: Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  const Icon(Icons.videocam, color: Colors.white, size: 20),
                                  Positioned(
                                    right: -2,
                                    top: -2,
                                    child: Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: _isConnected ? Colors.green : Colors.redAccent,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    widget.partnerName,
                                    style: const TextStyle(fontFamily: 'Inter', fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                  Row(
                                    children: [
                                      Text('LIVE', style: textTheme.labelSmall?.copyWith(color: colorScheme.surfaceVariant, letterSpacing: 1.2)),
                                      Container(
                                        width: 4, height: 4,
                                        margin: const EdgeInsets.symmetric(horizontal: 8),
                                        decoration: BoxDecoration(color: colorScheme.surfaceVariant, shape: BoxShape.circle),
                                      ),
                                      Text(_formattedTime, style: textTheme.labelSmall?.copyWith(color: Colors.white70, fontFamily: 'monospace')),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // --- 3. Picture-in-Picture (Góc nhìn của bệnh nhân) ---
            Positioned(
              top: 96,
              right: 16,
              child: Container(
                width: 120,
                height: 160,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
                  boxShadow: const [
                    BoxShadow(color: Colors.black38, blurRadius: 20, offset: Offset(0, 10)),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (!_isVideoOff)
                        RTCVideoView(
                          WebRTCService.instance.localRenderer,
                          mirror: true,
                          objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                        )
                      else
                        Container(
                          color: Colors.black87,
                          child: const Icon(Icons.videocam_off, color: Colors.white54, size: 40),
                        ),

                      if (_isMuted)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.mic_off, color: Colors.redAccent, size: 16),
                          ),
                        ),

                      Positioned(
                        bottom: 8,
                        left: 8,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              color: const Color(0xFF00463B).withOpacity(0.6),
                              child: const Text('You', style: TextStyle(fontFamily: 'Inter', fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // --- 4. Connection Toast ---
            Positioned(
              top: 96,
              left: 0,
              right: 0,
              child: Center(
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: colorScheme.secondaryContainer.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.3)),
                      boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4))],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.wifi, color: colorScheme.onSecondaryContainer, size: 16),
                        const SizedBox(width: 8),
                        Text('Stable Connection', style: textTheme.labelMedium?.copyWith(color: colorScheme.onSecondaryContainer)),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // --- 6. Bottom Control Bar ---
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Center(
                  child: Container(
                    width: MediaQuery.of(context).size.width * 0.9,
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(100),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00463B).withOpacity(0.6),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildControlButton(
                                iconOn: Icons.mic,
                                iconOff: Icons.mic_off,
                                label: 'Mute',
                                isToggled: _isMuted,
                                onTap: () {
                                  setState(() => _isMuted = !_isMuted);
                                  WebRTCService.instance.toggleMic(_isMuted);
                                },
                              ),

                              _buildControlButton(
                                iconOn: Icons.videocam,
                                iconOff: Icons.videocam_off,
                                label: 'Video',
                                isToggled: _isVideoOff,
                                onTap: () {
                                  setState(() => _isVideoOff = !_isVideoOff);
                                  WebRTCService.instance.toggleCamera(_isVideoOff);
                                },
                              ),

                              _buildControlButton(
                                iconOn: Icons.cameraswitch,
                                iconOff: Icons.cameraswitch,
                                label: 'Flip',
                                isToggled: false,
                                onTap: () async {
                                  await WebRTCService.instance.switchCamera();
                                },
                              ),

                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Material(
                                    color: Colors.redAccent,
                                    shape: const CircleBorder(),
                                    shadowColor: Colors.redAccent.withOpacity(0.5),
                                    elevation: 8,
                                    child: InkWell(
                                      onTap: _handleEndCall,
                                      customBorder: const CircleBorder(),
                                      child: Container(
                                        width: 56,
                                        height: 56,
                                        alignment: Alignment.center,
                                        child: const Icon(Icons.call_end, color: Colors.white, size: 28),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text('END', style: TextStyle(fontFamily: 'Inter', fontSize: 10, color: Colors.redAccent, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      )
    );
  }

  Widget _buildControlButton({
    required IconData iconOn,
    required IconData iconOff,
    required String label,
    required bool isToggled,
    required VoidCallback onTap,
  }) {
    final Color bgColor = isToggled ? Colors.redAccent.withOpacity(0.2) : Colors.white.withOpacity(0.1);
    final Color iconColor = isToggled ? Colors.redAccent : Colors.white;
    final IconData currentIcon = isToggled ? iconOff : iconOn;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: bgColor,
          shape: const CircleBorder(),
          child: InkWell(
            onTap: onTap,
            customBorder: const CircleBorder(),
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              child: Icon(currentIcon, color: iconColor),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontFamily: 'Inter', fontSize: 10, color: Colors.white70, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  void _handleEndCall() {
    if (widget.partnerId != null && widget.roomId != null) {
      final myId = context.read<AuthProvider>().userId;
      if (myId != null) {
        WebrtcStompService.instance.sendWebRTCSignal({
          'type': 'HANGUP',
          'senderId': myId,
          'senderName': 'Patient',
          'receiverId': widget.partnerId,
          'data': widget.roomId,
        });
      }
    }
    context.read<VideoCallProvider>().endCall();
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    }
  }
}