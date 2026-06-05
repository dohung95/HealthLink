import 'package:flutter/material.dart';
import 'dart:ui';
import '../config/themes.dart';
import 'login_screen.dart';
import 'register_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with TickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _logoAnimation;
  late Animation<double> _titleAnimation;
  late Animation<double> _descAnimation;
  late Animation<double> _actionAnimation;

  @override
  void initState() {
    super.initState();

    // Khởi tạo controller cho hiệu ứng dịch chuyển floatUp (0.8s)
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // Tạo hiệu ứng trễ (delay) tương ứng với Tailwind animate-float-up
    _logoAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 1.0, curve: Curves.easeOutCubic),
    );
    _titleAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.125, 1.0, curve: Curves.easeOutCubic), // delay 100ms
    );
    _descAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.25, 1.0, curve: Curves.easeOutCubic),  // delay 200ms
    );
    _actionAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.375, 1.0, curve: Curves.easeOutCubic), // delay 300ms
    );

    // Chạy hiệu ứng ngay khi màn hình khởi tạo
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // Widget bổ trợ bọc hiệu ứng mờ (Opacity) và đẩy từ dưới lên (Translate)
  Widget _buildAnimatedComponent({
    required Animation<double> animation,
    required Widget child,
  }) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, animChild) {
        return Opacity(
          opacity: animation.value,
          child: Transform.translate(
            offset: Offset(0, 20 * (1 - animation.value)),
            child: animChild,
          ),
        );
      },
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      backgroundColor: HealthLinkTheme.background, // Màu nền tổng thể của body
      body: Stack(
        children: [
          // --- Vòng tròn trang trí mờ phía sau (Background Blur) ---
          // Top-Left Decorative Circle
          Positioned(
            top: -100,
            left: -100,
            width: screenWidth * 0.7,
            height: screenWidth * 0.7,
            child: Container(
              decoration: const BoxDecoration(
                color: HealthLinkTheme.surfaceContainer,
                shape: BoxShape.circle,
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                child: Container(color: Colors.transparent),
              ),
            ),
          ),
          // Bottom-Right Decorative Circle
          Positioned(
            bottom: -150,
            right: -150,
            width: screenWidth * 0.8,
            height: screenWidth * 0.8,
            child: Container(
              decoration: const BoxDecoration(
                color: HealthLinkTheme.surfaceContainerHigh,
                shape: BoxShape.circle,
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100),
                child: Container(color: Colors.transparent),
              ),
            ),
          ),

          // --- Nội dung chính (Main Content) ---
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0), // margin-mobile: 16px
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 400), // max-w-[400px]
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // 1. Logo Section
                      _buildAnimatedComponent(
                        animation: _logoAnimation,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 32), // mb-xl
                          width: 150, // w-32 lên tới md:w-40 (Cân đối khoảng 150px)
                          height: 150,
                          decoration: BoxDecoration(
                            color: HealthLinkTheme.surfaceContainerLowest,
                            borderRadius: BorderRadius.circular(24), // rounded-3xl
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF0F3D38).withOpacity(0.06),
                                blurRadius: 30,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.all(24), // p-6
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16), // Bo tròn nhẹ cho ảnh bên trong
                            child: Image.asset(
                              'assets/images/logo.png', // Thay đúng tên file ảnh logo của bạn trong folder vào đây
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),

                      // 2. Typography Section (Tiêu đề & Mô tả)
                      Container(
                        constraints: const BoxConstraints(maxWidth: 320),
                        margin: const EdgeInsets.only(bottom: 32), // mb-xl
                        child: Column(
                          children: [
                            _buildAnimatedComponent(
                              animation: _titleAnimation,
                              child: const Text(
                                'Your health journey starts here',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 32, // text-headline-xl
                                  fontWeight: FontWeight.w700,
                                  color: HealthLinkTheme.primary,
                                  height: 40 / 32,
                                  letterSpacing: -0.32,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12), // space-sm
                            _buildAnimatedComponent(
                              animation: _descAnimation,
                              child: const Text(
                                'A modern digital health platform connecting you with top healthcare professionals quickly and safely.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 16, // text-body-lg
                                  fontWeight: FontWeight.w400,
                                  color: HealthLinkTheme.onSurfaceVariant,
                                  height: 24 / 16,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // 3. Action Section (Nút bấm & Link Log In)
                      _buildAnimatedComponent(
                        animation: _actionAnimation,
                        child: Column(
                          children: [
                            // Nút Get Started
                            SizedBox(
                              width: double.infinity,
                              height: 56, // py-4 tương đương tổng chiều cao nút khoảng 56px
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: HealthLinkTheme.primary,
                                  foregroundColor: HealthLinkTheme.onPrimary,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12), // rounded-xl
                                  ),
                                  shadowColor: const Color(0xFF0F3D38).withOpacity(0.08),
                                ).copyWith(
                                  // Hiệu ứng hover đổi màu nền như Tailwind hover:bg-tertiary-container
                                  overlayColor: WidgetStateProperty.resolveWith<Color?>(
                                        (Set<WidgetState> states) {
                                      if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                        return HealthLinkTheme.tertiaryContainer.withOpacity(0.2);
                                      }
                                      return null;
                                    },
                                  ),
                                ),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (context) => const RegisterScreen()),
                                  );
                                },
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'Get Started',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 18, // text-title-md
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    SizedBox(width: 8),
                                    Icon(
                                      Icons.arrow_forward, // Material Symbols Outlined arrow_forward
                                      size: 20,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 16), // mt-md

                            // Dòng Đăng nhập
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'Already have an account? ',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 14, // text-body-md
                                    fontWeight: FontWeight.w400,
                                    color: HealthLinkTheme.outline,
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                                    );
                                  },
                                  child: const Text(
                                    'Log In',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 18, // text-title-md
                                      fontWeight: FontWeight.w600,
                                      color: HealthLinkTheme.primary,
                                      decoration: TextDecoration.underline,
                                      decorationThickness: 2,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}