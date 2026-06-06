import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/auth/validators.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _emailController = TextEditingController();

  // Trạng thái nút bấm để giả lập micro-interaction từ script HTML
  // 0: Trạng thái ban đầu (Send Reset Link)
  // 1: Trạng thái đang xử lý (Loading xoay tròn)
  // 2: Trạng thái gửi thành công (Link Sent!)
  int _buttonState = 0; // 0=idle, 1=loading, 2=sent
  String _emailError = '';
  bool _emailTouched = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  /// Xử lý gửi email đặt lại mật khẩu (gọi API thực)
  Future<void> _handleSendLink() async {
    // Validate email trước
    final err = AuthValidators.validateEmail(_emailController.text);
    setState(() {
      _emailTouched = true;
      _emailError   = err;
    });
    if (err.isNotEmpty || _buttonState != 0) return;

    setState(() => _buttonState = 1);

    final auth    = context.read<AuthProvider>();
    final success = await auth.forgotPassword(_emailController.text.trim());

    if (!mounted) return;
    if (success) {
      setState(() => _buttonState = 2);
    } else {
      setState(() => _buttonState = 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: Stack(
        children: [
          // --- 2. Nội dung chính ---
          SafeArea(
            child: Column(
              children: [
                // Top Bar Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                  child: Row(
                    children: [
                      // Nút quay lại để cân bằng layout
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios, size: 20),
                        color: colorScheme.primary,
                      ),
                      Expanded(
                        child: Text(
                          'HealthLink',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: colorScheme.primary,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                      // Spacer bên phải để đảm bảo text nằm chính giữa màn hình
                      const SizedBox(width: 48),
                    ],
                  ),
                ),

                // Thân giữa màn hình chính (Giới hạn max-w-lg)
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(32.0), // px-8
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 512), // max-w-lg (512px)
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // Icon ổ khóa reset (Hero Section)
                            Container(
                              margin: const EdgeInsets.only(bottom: 24),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: colorScheme.primary.withValues(alpha: 0.1), // bg-primary/10
                                borderRadius: BorderRadius.circular(16), // rounded-2xl
                              ),
                              child: Icon(
                                Icons.lock_reset, // lock_reset icon từ Material Symbols
                                size: 40,
                                color: colorScheme.primary,
                              ),
                            ),

                            // Tiêu đề lớn
                            Text(
                              'Forgot Password?',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 30, // text-3xl
                                fontWeight: FontWeight.bold,
                                color: colorScheme.onSurface,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Đoạn mô tả hướng dẫn ngắn
                            Text(
                              "Enter your email address and we'll send you a link to reset your password.",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 16,
                                color: colorScheme.onSurfaceVariant,
                                height: 1.5,
                              ),
                            ),
                            const SizedBox(height: 48),

                            // Ô nhập Email
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(left: 4.0, bottom: 8.0),
                                  child: Text(
                                    'Email Address',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ),
                                TextField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  style: TextStyle(fontSize: 16, color: colorScheme.onSurface),
                                  decoration: InputDecoration(
                                    hintText: 'doctor.neo@healthlink.com',
                                    hintStyle: TextStyle(color: colorScheme.outline),
                                    fillColor: colorScheme.surfaceContainerHighest,
                                    filled: true,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16).copyWith(left: 48),
                                    prefixIcon: Padding(
                                      padding: const EdgeInsets.only(left: 4.0),
                                      child: Icon(Icons.mail_outline, color: colorScheme.outline),
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide(color: colorScheme.outline.withValues(alpha: 0.5), width: 2),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide(color: colorScheme.outline.withValues(alpha: 0.5), width: 2),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide(color: colorScheme.primary, width: 2),
                                    ),
                                  ),
                                  onChanged: (val) {
                                    if (_buttonState == 2) setState(() => _buttonState = 0);
                                    if (_emailTouched) setState(() => _emailError = AuthValidators.validateEmail(val));
                                  },
                                ),
                                if (_emailTouched && _emailError.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Row(children: [
                                      Icon(Icons.cancel_outlined, size: 13, color: colorScheme.error),
                                      const SizedBox(width: 4),
                                      Expanded(child: Text(_emailError,
                                          style: TextStyle(fontSize: 12, color: colorScheme.error, fontFamily: 'Inter'))),
                                    ]),
                                  ),
                                Consumer<AuthProvider>(
                                  builder: (_, auth, __) {
                                    if (auth.errorMessage.isEmpty) return const SizedBox.shrink();
                                    return Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Row(children: [
                                        Icon(Icons.error_outline, size: 14, color: colorScheme.error),
                                        const SizedBox(width: 6),
                                        Expanded(child: Text(auth.errorMessage,
                                            style: TextStyle(fontSize: 12, color: colorScheme.error, fontFamily: 'Inter'))),
                                      ]),
                                    );
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 32),

                            // Nút hành động chính có tích hợp vi tương tác (Micro-interaction)
                            SizedBox(
                              width: double.infinity,
                              height: 56, // Chiều cao py-4
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _buttonState == 2
                                      ? colorScheme.secondary
                                      : colorScheme.primary,
                                  foregroundColor: colorScheme.onPrimary,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12), // rounded-xl
                                  ),
                                  shadowColor: colorScheme.primary.withValues(alpha: 0.2),
                                ),
                                onPressed: _handleSendLink,
                                child: _buildButtonContent(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                // --- 3. Footer Action (Trở về màn Login) ---
                Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: TextButton(
                    onPressed: () {
                      Navigator.pop(context); // Quay lại trang Login trước đó
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: colorScheme.primary,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.arrow_back_ios, size: 14, color: colorScheme.primary),
                        const SizedBox(width: 4),
                        Text(
                          'Back to Log In',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Hàm xây dựng nội dung nút bấm dựa theo tiến trình gửi
  Widget _buildButtonContent() {
    if (_buttonState == 1) {
      // Trạng thái Đang xử lý (Loading)
      return SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          color: Theme.of(context).colorScheme.onPrimary,
        ),
      );
    } else if (_buttonState == 2) {
      // Trạng thái Đã gửi thành công
      return const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Link Sent!',
            style: TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w600),
          ),
          SizedBox(width: 12),
          Icon(Icons.check_circle, size: 20),
        ],
      );
    } else {
      // Trạng thái Ban đầu
      return const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Send Reset Link',
            style: TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w600),
          ),
          SizedBox(width: 12),
          Icon(Icons.send, size: 20),
        ],
      );
    }
  }
}