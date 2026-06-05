import 'package:flutter/material.dart';
import '../config/themes.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  // Các Controller quản lý nhập liệu
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true; // Biến trạng thái ẩn/hiện mật khẩu
  bool _rememberMe = false;     // Biến trạng thái của Checkbox

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    // Tạo hiệu ứng chuyển động mượt mà khi load trang (0.6s cubic-bezier)
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOutCubic,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.05), // Dịch nhẹ xuống 20px
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOutCubic,
    ));

    // Kích hoạt animation sau một khoảng trễ nhỏ (100ms giống file HTML)
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) _animationController.forward();
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HealthLinkTheme.background, // Nền tổng thể #e4fff9
      body: SafeArea(
        bottom: false,
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SlideTransition(
              position: _slideAnimation,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 480), // max-w-[480px]
                margin: const EdgeInsets.symmetric(vertical: 16), // Cân đối viền ngoài khi chạy máy tính/máy tính bảng
                decoration: BoxDecoration(
                  color: HealthLinkTheme.surfaceContainerLowest, // Màu nền trắng bên trong khung
                  borderRadius: BorderRadius.circular(16), // md:rounded-xl
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // --- 1. Top Bar ---
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: () {
                              Navigator.pop(context); // Quay lại màn hình Welcome
                            },
                            icon: const Icon(Icons.arrow_back),
                            color: HealthLinkTheme.onSurface,
                            style: IconButton.styleFrom(
                              hoverColor: HealthLinkTheme.surfaceContainerLow,
                            ),
                          ),
                          const Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(right: 48.0), // Cân bằng khoảng cách pr-12 để text căn đúng giữa
                              child: Text(
                                'Log In',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: HealthLinkTheme.onSurface,
                                  letterSpacing: -0.27,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // --- Toàn bộ phần thân cho phép cuộn để tránh tràn màn hình khi bật bàn phím ---
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const ClampingScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 2. Hero Branding Image
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              child: Container(
                                width: double.infinity,
                                height: 192, // h-48 (48 * 4 = 192px)
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: Image.asset(
                                    'assets/images/img_UI_login.png', // Hãy thêm file ảnh này vào thư mục assets của bạn
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
                                      // Fallback phòng trường hợp chưa có file ảnh thực tế
                                      return Container(
                                        color: HealthLinkTheme.surfaceContainer,
                                        child: const Icon(Icons.local_hospital, size: 48, color: HealthLinkTheme.primary),
                                      );
                                    },
                                  ),
                                ),
                              ),
                            ),

                            // 3. Welcome Text & Description
                            const Padding(
                              padding: EdgeInsets.only(left: 16.0, right: 16.0, top: 32.0, bottom: 8.0),
                              child: Text(
                                'Welcome back',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 32, // text-[32px]
                                  fontWeight: FontWeight.w700,
                                  color: HealthLinkTheme.onSurface,
                                  height: 1.2,
                                ),
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 16.0),
                              child: Text(
                                'Enter your credentials to access your clinical dashboard and patient records.',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 14, // text-body-md
                                  fontWeight: FontWeight.w400,
                                  color: HealthLinkTheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),

                            // 4. Form Field: Email Address
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Email address',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                      color: HealthLinkTheme.onSurface,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    decoration: InputDecoration(
                                      hintText: 'Enter your email',
                                      hintStyle: const TextStyle(color: HealthLinkTheme.outline, fontSize: 16),
                                      fillColor: HealthLinkTheme.surfaceContainerLowest,
                                      filled: true,
                                      contentPadding: const EdgeInsets.all(15),
                                      suffixIcon: const Icon(Icons.mail_outline, color: HealthLinkTheme.outline),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: HealthLinkTheme.outlineVariant),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: HealthLinkTheme.outlineVariant),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: HealthLinkTheme.primary, width: 2),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // 5. Form Field: Password
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Password',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                      color: HealthLinkTheme.onSurface,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: _passwordController,
                                    obscureText: _obscurePassword,
                                    decoration: InputDecoration(
                                      hintText: 'Enter your password',
                                      hintStyle: const TextStyle(color: HealthLinkTheme.outline, fontSize: 16),
                                      fillColor: HealthLinkTheme.surfaceContainerLowest,
                                      filled: true,
                                      contentPadding: const EdgeInsets.all(15),
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _obscurePassword ? Icons.visibility : Icons.visibility_off,
                                          color: HealthLinkTheme.outline,
                                        ),
                                        onPressed: () {
                                          setState(() {
                                            _obscurePassword = !_obscurePassword; // Thực thi logic tương đương function togglePassword()
                                          });
                                        },
                                      ),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: HealthLinkTheme.outlineVariant),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: HealthLinkTheme.outlineVariant),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: HealthLinkTheme.primary, width: 2),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // 6. Remember Me & Forgot Password
                            Padding(
                              padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 4.0, bottom: 32.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _rememberMe = !_rememberMe;
                                      });
                                    },
                                    child: Row(
                                      children: [
                                        SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: Checkbox(
                                            value: _rememberMe,
                                            activeColor: HealthLinkTheme.primary,
                                            side: const BorderSide(color: HealthLinkTheme.outlineVariant),
                                            onChanged: (value) {
                                              setState(() {
                                                _rememberMe = value ?? false;
                                              });
                                            },
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Text(
                                          'Remember me',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 14,
                                            color: HealthLinkTheme.onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      // Xử lý sự kiện quên mật khẩu
                                    },
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: const Text(
                                      'Forgot password?',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: HealthLinkTheme.primary,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // 7. Log In Main Button
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              child: SizedBox(
                                width: double.infinity,
                                height: 56, // py-4 tương đương khoảng h-14 (56px)
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: HealthLinkTheme.primary,
                                    foregroundColor: HealthLinkTheme.onPrimary,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12), // rounded-xl
                                    ),
                                    elevation: 0,
                                    shadowColor: HealthLinkTheme.primary.withOpacity(0.2),
                                  ).copyWith(
                                    overlayColor: WidgetStateProperty.resolveWith<Color?>(
                                          (Set<WidgetState> states) {
                                        if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
                                          return HealthLinkTheme.primaryContainer.withOpacity(0.2);
                                        }
                                        return null;
                                      },
                                    ),
                                  ),
                                  onPressed: () {
                                    // Thực thi logic kiểm tra dữ liệu đăng nhập ở đây
                                  },
                                  child: const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Log In',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      SizedBox(width: 8),
                                      Icon(Icons.login, size: 20),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 32),

                            // 8. Secondary Action: Sign up Link
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 24.0),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Text(
                                      "Don't have an account?",
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 14,
                                        color: HealthLinkTheme.onSurfaceVariant,
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(builder: (context) => const RegisterScreen()),
                                        );
                                      },
                                      child: const Text(
                                        ' Sign up',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: HealthLinkTheme.primary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // 9. Footer Logo/Branding (Opacity 30%)
                            Opacity(
                              opacity: 0.3,
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 24.0),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      width: 24,
                                      height: 24,
                                      decoration: const BoxDecoration(
                                        color: HealthLinkTheme.primary,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.medical_services,
                                        size: 14,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Text(
                                      'HEALTHLINK',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}