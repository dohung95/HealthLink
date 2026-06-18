import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/auth/validators.dart';
import '../../widgets/auth/auth_text_field.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

/// Màn hình Đăng nhập.
/// UI giữ nguyên, logic validate dùng [AuthValidators], gọi API qua [AuthProvider].
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController    = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _rememberMe      = false;

  // ── Validate state ──────────────────────────────────────────────────────────
  String _emailError    = '';
  String _passwordError = '';
  bool   _emailTouched    = false;
  bool   _passwordTouched = false;

  // ── Animation ───────────────────────────────────────────────────────────────
  late AnimationController _animCtrl;
  late Animation<double>  _fadeAnim;
  late Animation<Offset>  _slideAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnim  = CurvedAnimation(parent: _animCtrl, curve: Curves.easeInOutCubic);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.05), end: Offset.zero)
        .animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeInOutCubic));
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) _animCtrl.forward();
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animCtrl.dispose();
    super.dispose();
  }

  // ── Validate handlers ───────────────────────────────────────────────────────

  void _onEmailChanged(String v) {
    if (_emailTouched) setState(() => _emailError = AuthValidators.validateEmail(v));
  }

  void _onEmailBlur() => setState(() {
        _emailTouched = true;
        _emailError   = AuthValidators.validateEmail(_emailController.text);
      });

  void _onPasswordChanged(String v) {
    if (_passwordTouched) setState(() => _passwordError = AuthValidators.validateLoginPassword(v));
  }

  void _onPasswordBlur() => setState(() {
        _passwordTouched = true;
        _passwordError   = AuthValidators.validateLoginPassword(_passwordController.text);
      });

  // ── Submit ──────────────────────────────────────────────────────────────────

  Future<void> _handleSubmit() async {
    // Validate toàn bộ form
    final emailErr    = AuthValidators.validateEmail(_emailController.text);
    final passwordErr = AuthValidators.validateLoginPassword(_passwordController.text);
    setState(() {
      _emailTouched    = true;
      _passwordTouched = true;
      _emailError      = emailErr;
      _passwordError   = passwordErr;
    });
    if (emailErr.isNotEmpty || passwordErr.isNotEmpty) return;

    // Gọi AuthProvider
    final auth    = context.read<AuthProvider>();
    final success = await auth.login(
      _emailController.text.trim(),
      _passwordController.text,
      rememberMe: _rememberMe,
    );

    if (!mounted) return;
    if (success) {
      // AuthProvider.status đã chuyển sang authenticated.
      // _RootRouter ở main.dart sẽ tự động swap sang PatientHomeScreen.
      // Pop toàn bộ stack navigation để về root widget tree.
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
    // Nếu thất bại, lỗi được hiển thị qua Consumer error banner bên trên.
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        bottom: false,
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: SlideTransition(
              position: _slideAnim,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 480),
                margin: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // ── Top Bar ─────────────────────────────────────────────
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.arrow_back),
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(right: 48.0),
                              child: Text(
                                'Log In',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: Theme.of(context).colorScheme.onSurface,
                                  letterSpacing: -0.27,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // ── Body ────────────────────────────────────────────────
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const ClampingScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Hero Image
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              child: Container(
                                width: double.infinity,
                                height: 192,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.1),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: Image.asset(
                                    'assets/images/img_UI_login.png',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: Theme.of(context).colorScheme.surface,
                                      child: Icon(Icons.local_hospital,
                                          size: 48, color: Theme.of(context).colorScheme.primary),
                                    ),
                                  ),
                                ),
                              ),
                            ),

                            // Welcome Text
                            Padding(
                              padding: const EdgeInsets.only(left: 16, right: 16, top: 32, bottom: 8),
                              child: Text(
                                'Welcome back',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 32,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).colorScheme.onSurface,
                                  height: 1.2,
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Text(
                                'Enter your credentials to access your clinical dashboard and patient records.',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 14,
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),

                            // ── Error banner từ API ──────────────────────────
                            Consumer<AuthProvider>(
                              builder: (_, auth, __) {
                                if (auth.errorMessage.isEmpty) return const SizedBox.shrink();
                                return Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).colorScheme.errorContainer,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.3)),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 18),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            auth.errorMessage,
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: Theme.of(context).colorScheme.error,
                                              fontFamily: 'Inter',
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),

                            // ── Email Field ──────────────────────────────────
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: AuthTextField(
                                controller:       _emailController,
                                label:            'Email address',
                                hintText:         'Enter your email',
                                prefixIcon:       Icons.mail_outline,
                                keyboardType:     TextInputType.emailAddress,
                                touched:          _emailTouched,
                                errorText:        _emailError,
                                successText:      'Valid email address',
                                onChanged:        _onEmailChanged,
                                onBlur:           _onEmailBlur,
                              ),
                            ),

                            // ── Password Field ───────────────────────────────
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: AuthTextField(
                                controller:       _passwordController,
                                label:            'Password',
                                hintText:         'Enter your password',
                                prefixIcon:       Icons.lock_outline,
                                isObscure:        _obscurePassword,
                                onToggleObscure:  () => setState(() => _obscurePassword = !_obscurePassword),
                                touched:          _passwordTouched,
                                errorText:        _passwordError,
                                successText:      'Password looks good',
                                onChanged:        _onPasswordChanged,
                                onBlur:           _onPasswordBlur,
                              ),
                            ),

                            // ── Remember Me & Forgot Password ────────────────
                            Padding(
                              padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 32),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  GestureDetector(
                                    onTap: () => setState(() => _rememberMe = !_rememberMe),
                                    child: Row(
                                      children: [
                                        SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: Checkbox(
                                            value: _rememberMe,
                                            activeColor: Theme.of(context).colorScheme.primary,
                                            side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
                                            onChanged: (v) => setState(() => _rememberMe = v ?? false),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Remember me',
                                          style: TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 14,
                                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      Navigator.push(context,
                                          MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()));
                                    },
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text(
                                      'Forgot password?',
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: Theme.of(context).colorScheme.primary,
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // ── Login Button ─────────────────────────────────
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: Consumer<AuthProvider>(
                                  builder: (_, auth, __) => ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Theme.of(context).colorScheme.primary,
                                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      elevation: 0,
                                    ),
                                    onPressed: auth.isLoading ? null : _handleSubmit,
                                    child: auth.isLoading
                                        ? SizedBox(
                                            width: 24,
                                            height: 24,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.5,
                                              color: Theme.of(context).colorScheme.onPrimary,
                                            ),
                                          )
                                        : Row(
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
                            ),
                            const SizedBox(height: 32),

                            // ── Sign Up Link ─────────────────────────────────
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 24),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      "Don't have an account?",
                                      style: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 14,
                                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () => Navigator.push(context,
                                          MaterialPageRoute(builder: (_) => const RegisterScreen())),
                                      child: Text(
                                        ' Sign up',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context).colorScheme.primary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // ── Footer Logo ──────────────────────────────────
                            Padding(
                              padding: const EdgeInsets.only(bottom: 24),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).colorScheme.primary,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(Icons.medical_services,
                                        size: 14, color: Theme.of(context).colorScheme.onPrimary),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'HEALTHLINK',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: FontWeight.w900,
                                      color: Theme.of(context).colorScheme.onSurface,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
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