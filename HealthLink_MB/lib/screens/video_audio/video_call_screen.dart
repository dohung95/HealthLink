import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';

class VideoCallScreen extends StatefulWidget {
  const VideoCallScreen({super.key});

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> with SingleTickerProviderStateMixin {
  // Bộ đếm thời gian
  late Timer _timer;
  int _secondsElapsed = 954; // Bắt đầu từ 15:54 (765s -> 954s để khớp với code HTML gốc)

  // Trạng thái các nút điều khiển
  bool _isMuted = false;
  bool _isVideoOff = false;

  // Animation cho Connection Toast
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    // 1. Khởi tạo Timer
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _secondsElapsed++;
        });
      }
    });

    // 2. Khởi tạo Animation cho thông báo mạng "Stable Connection"
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(_animationController);

    // Kích hoạt Toast hiện lên rồi mờ đi sau 2 giây giống HTML script
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        _animationController.forward(); // Hiện Toast
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            _animationController.reverse(); // Mờ dần Toast
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    _animationController.dispose();
    super.dispose();
  }

  // Hàm chuyển đổi giây thành chuỗi phút:giây (MM:SS)
  String get _formattedTime {
    final int minutes = _secondsElapsed ~/ 60;
    final int seconds = _secondsElapsed % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final bool isWide = MediaQuery.of(context).size.width > 1024; // Check màn hình ngang (Tablet/Web)

    return Scaffold(
      backgroundColor: Colors.black, // Nền đen khi chưa load được video
      body: Stack(
        children: [
          // --- 1. Background Video Feed (Bác sĩ) ---
          SizedBox(
            width: double.infinity,
            height: double.infinity,
            child: Image.asset(
              'assets/images/doctor_mitchell.png', // Hãy thêm ảnh này vào tài nguyên của bạn
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
              const Center(child: Icon(Icons.videocam_off, color: Colors.white54, size: 64)),
            ),
          ),

          // --- 2. Top Header Overlay ---
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0), // p-margin-mobile
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Bảng thông tin góc trái trên
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00463B).withOpacity(0.6), // Tương đương rgba(0, 70, 59, 0.6)
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
                                    decoration: const BoxDecoration(
                                      color: Colors.redAccent, // bg-error
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
                                const Text(
                                  'Dr. Sarah Mitchell',
                                  style: TextStyle(fontFamily: 'Inter', fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
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
              width: 120, // Tương đương w-32
              height: 160, // Tương đương h-44
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
                      Image.asset(
                        'assets/images/patient_view.png', // Ảnh đại diện cam của bệnh nhân
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            Container(color: Colors.black87, child: const Icon(Icons.person, color: Colors.white54)),
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
                          decoration: BoxDecoration(
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

          // --- 4. Connection Toast (Thông báo nổi giữa màn hình) ---
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

          // --- 5. Floating Note (Dành cho màn hình rộng / Desktop) ---
          if (isWide)
            Positioned(
              bottom: 128,
              right: 48,
              child: Container(
                width: 256, // w-64
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colorScheme.surface.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colorScheme.primary.withOpacity(0.1)),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 16, offset: Offset(0, 8))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.assignment, color: colorScheme.primary, size: 16),
                        const SizedBox(width: 8),
                        Text('Appointment Notes', style: textTheme.labelMedium?.copyWith(color: colorScheme.primary)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '"Reviewing blood work results from March 12. Cholesterol levels show positive trends."',
                      style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant, fontStyle: FontStyle.italic),
                    ),
                  ],
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
                          color: const Color(0xFF00463B).withOpacity(0.6), // glass-panel
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            // Nút Mute
                            _buildControlButton(
                              iconOn: Icons.mic,
                              iconOff: Icons.mic_off,
                              label: 'Mute',
                              isToggled: _isMuted,
                              onTap: () => setState(() => _isMuted = !_isMuted),
                            ),

                            // Nút Tắt Camera
                            _buildControlButton(
                              iconOn: Icons.videocam,
                              iconOff: Icons.videocam_off,
                              label: 'Video',
                              isToggled: _isVideoOff,
                              onTap: () => setState(() => _isVideoOff = !_isVideoOff),
                            ),

                            // Nút Kết thúc cuộc gọi
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Material(
                                  color: Colors.redAccent, // bg-error
                                  shape: const CircleBorder(),
                                  shadowColor: Colors.redAccent.withOpacity(0.5),
                                  elevation: 8,
                                  child: InkWell(
                                    onTap: () {
                                      Navigator.pop(context); // Tắt màn hình khi bấm End
                                    },
                                    customBorder: const CircleBorder(),
                                    child: Container(
                                      width: 56, // h-14
                                      height: 56, // w-14
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
    );
  }

  // Widget hỗ trợ: Nút điều khiển âm thanh/camera
  Widget _buildControlButton({
    required IconData iconOn,
    required IconData iconOff,
    required String label,
    required bool isToggled,
    required VoidCallback onTap,
  }) {
    // Nếu isToggled == true => Đã bị tắt (Màu đỏ, Icon gạch chéo)
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
}