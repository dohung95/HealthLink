import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/auth/validators.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../widgets/auth/password_strength.dart';
import 'login_screen.dart';

/// Màn hình Đăng ký tài khoản.
/// Validate dùng [AuthValidators], gọi API qua [AuthProvider].
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // ── Controllers ─────────────────────────────────────────────────────────────
  final _fullNameController       = TextEditingController();
  final _emailController          = TextEditingController();
  final _phoneController          = TextEditingController();
  final _passwordController       = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _dobController            = TextEditingController();
  final _heightController         = TextEditingController();
  final _weightController         = TextEditingController();

  String? _selectedGender;
  bool _obscurePassword = true;
  bool _obscureConfirm  = true;

  // ── Validate states ─────────────────────────────────────────────────────────
  String _fullNameError = '';
  String _emailError    = '';
  String _phoneError    = '';
  String _passwordError = '';
  String _confirmError  = '';
  String _heightError   = '';
  String _weightError   = '';

  bool _fullNameTouched = false;
  bool _emailTouched    = false;
  bool _phoneTouched    = false;
  bool _passwordTouched = false;
  bool _confirmTouched  = false;
  bool _heightTouched   = false;
  bool _weightTouched   = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _dobController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  // ── Date Picker ─────────────────────────────────────────────────────────────
  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 365 * 20)),
      firstDate: DateTime(1920),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(data: Theme.of(ctx), child: child!),
    );
    if (picked != null) {
      setState(() {
        _dobController.text =
            '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  // ── Validate all & submit ───────────────────────────────────────────────────
  bool _validateAll() {
    final fnE = AuthValidators.validateFullName(_fullNameController.text);
    final emE = AuthValidators.validateEmail(_emailController.text);
    final phE = AuthValidators.validatePhone(_phoneController.text);
    final pwE = AuthValidators.validateRegisterPassword(_passwordController.text);
    final cfE = AuthValidators.validateConfirmPassword(
        _confirmPasswordController.text, _passwordController.text);
    final htE = AuthValidators.validateHeight(_heightController.text);
    final wgE = AuthValidators.validateWeight(_weightController.text);

    setState(() {
      _fullNameError = fnE; _fullNameTouched = true;
      _emailError    = emE; _emailTouched    = true;
      _phoneError    = phE; _phoneTouched    = true;
      _passwordError = pwE; _passwordTouched = true;
      _confirmError  = cfE; _confirmTouched  = true;
      _heightError   = htE; _heightTouched   = true;
      _weightError   = wgE; _weightTouched   = true;
    });
    return [fnE, emE, phE, pwE, cfE, htE, wgE].every((e) => e.isEmpty);
  }

  Future<void> _handleRegister() async {
    if (!_validateAll()) return;

    final auth    = context.read<AuthProvider>();
    final success = await auth.register(
      username:    _fullNameController.text.trim(),
      email:       _emailController.text.trim(),
      password:    _passwordController.text,
      phoneNumber: _phoneController.text.trim(),
      dateOfBirth: _dobController.text.isNotEmpty ? _dobController.text : null,
      gender:      _selectedGender,
      heightCm:    _heightController.text.isNotEmpty
          ? double.tryParse(_heightController.text)
          : null,
      weightKg:    _weightController.text.isNotEmpty
          ? double.tryParse(_weightController.text)
          : null,
    );

    if (!mounted) return;
    if (success) {
      _showSuccessDialog();
    }
  }

  // ── Success Dialog ──────────────────────────────────────────────────────────
  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.mark_email_read_outlined,
                  size: 48, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(height: 16),
            Text(
              'Account Created!',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'An activation email has been sent to your inbox. Please confirm your email to log in.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 14,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.5,
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Theme.of(context).colorScheme.onPrimary,
                shape: const StadiumBorder(),
              ),
              onPressed: () {
                Navigator.of(context).pop(); // đóng dialog
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
              child: const Text('Go to Login',
                  style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 448),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.08),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Header Image ───────────────────────────────────────────
                  Container(
                    height: 128,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                      gradient: LinearGradient(
                        begin: Alignment.bottomLeft,
                        end: Alignment.topRight,
                        colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.primaryContainer],
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.health_and_safety, size: 48, color: Theme.of(context).colorScheme.onPrimary),
                        const SizedBox(height: 4),
                        Text(
                          'HealthLink',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Title ──────────────────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.only(left: 24, right: 24, top: 32, bottom: 4),
                    child: Text(
                      'Create Account',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'Join HealthLink to manage your health records and book appointments.',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),

                  // ── Error Banner ───────────────────────────────────────────
                  Consumer<AuthProvider>(
                    builder: (_, auth, __) {
                      if (auth.errorMessage.isEmpty) return const SizedBox.shrink();
                      return Padding(
                          padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.errorContainer,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline,
                                  color: Theme.of(context).colorScheme.error, size: 18),
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

                  // ── Form Fields ────────────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    child: Column(
                      children: [
                        // Full Name
                        AuthTextField(
                          controller:  _fullNameController,
                          label:       'Full Name',
                          hintText:    'John Doe',
                          prefixIcon:  Icons.person_outline,
                          isRequired:  true,
                          touched:     _fullNameTouched,
                          errorText:   _fullNameError,
                          successText: 'Valid name',
                          onChanged:   (v) {
                            if (_fullNameTouched) {
                              setState(() => _fullNameError = AuthValidators.validateFullName(v));
                            }
                          },
                          onBlur: () => setState(() {
                            _fullNameTouched = true;
                            _fullNameError   = AuthValidators.validateFullName(_fullNameController.text);
                          }),
                        ),
                        const SizedBox(height: 16),

                        // Email
                        AuthTextField(
                          controller:   _emailController,
                          label:        'Email',
                          hintText:     'you@example.com',
                          prefixIcon:   Icons.mail_outline,
                          isRequired:   true,
                          keyboardType: TextInputType.emailAddress,
                          touched:      _emailTouched,
                          errorText:    _emailError,
                          successText:  'Valid email format',
                          onChanged:    (v) {
                            if (_emailTouched) {
                              setState(() => _emailError = AuthValidators.validateEmail(v));
                            }
                          },
                          onBlur: () => setState(() {
                            _emailTouched = true;
                            _emailError   = AuthValidators.validateEmail(_emailController.text);
                          }),
                        ),
                        const SizedBox(height: 16),

                        // Phone
                        AuthTextField(
                          controller:   _phoneController,
                          label:        'Phone Number',
                          hintText:     '0901234567',
                          prefixIcon:   Icons.call_outlined,
                          isRequired:   true,
                          keyboardType: TextInputType.phone,
                          touched:      _phoneTouched,
                          errorText:    _phoneError,
                          successText:  'Valid phone number',
                          onChanged:    (v) {
                            // Chỉ cho phép nhập số
                            final digits = v.replaceAll(RegExp(r'[^0-9]'), '');
                            if (digits != v) {
                              _phoneController.value = TextEditingValue(
                                text: digits,
                                selection: TextSelection.collapsed(offset: digits.length),
                              );
                            }
                            if (_phoneTouched) {
                              setState(() => _phoneError = AuthValidators.validatePhone(digits));
                            }
                          },
                          onBlur: () => setState(() {
                            _phoneTouched = true;
                            _phoneError   = AuthValidators.validatePhone(_phoneController.text);
                          }),
                        ),
                        const SizedBox(height: 20),

                        // SECURITY Section header
                        _sectionHeader('SECURITY'),

                        // Password
                        AuthTextField(
                          controller:      _passwordController,
                          label:           'Password',
                          hintText:        '••••••••',
                          prefixIcon:      Icons.lock_outline,
                          isRequired:      true,
                          isObscure:       _obscurePassword,
                          onToggleObscure: () => setState(() => _obscurePassword = !_obscurePassword),
                          touched:         _passwordTouched,
                          errorText:       _passwordError,
                          successText:     'Strong password ✓',
                          onChanged:       (v) {
                            setState(() {
                              if (_passwordTouched) {
                                _passwordError = AuthValidators.validateRegisterPassword(v);
                              }
                              if (_confirmTouched) {
                                _confirmError = AuthValidators.validateConfirmPassword(
                                    _confirmPasswordController.text, v);
                              }
                            });
                          },
                          onBlur: () => setState(() {
                            _passwordTouched = true;
                            _passwordError   = AuthValidators.validateRegisterPassword(_passwordController.text);
                          }),
                          extraWidget: PasswordStrengthWidget(password: _passwordController.text),
                        ),
                        const SizedBox(height: 16),

                        // Confirm Password
                        AuthTextField(
                          controller:      _confirmPasswordController,
                          label:           'Confirm Password',
                          hintText:        '••••••••',
                          prefixIcon:      Icons.lock_outline,
                          isRequired:      true,
                          isObscure:       _obscureConfirm,
                          onToggleObscure: () => setState(() => _obscureConfirm = !_obscureConfirm),
                          touched:         _confirmTouched,
                          errorText:       _confirmError,
                          successText:     'Passwords match ✓',
                          onChanged:       (v) {
                            if (_confirmTouched) {
                              setState(() => _confirmError = AuthValidators.validateConfirmPassword(
                                  v, _passwordController.text));
                            }
                          },
                          onBlur: () => setState(() {
                            _confirmTouched = true;
                            _confirmError   = AuthValidators.validateConfirmPassword(
                                _confirmPasswordController.text, _passwordController.text);
                          }),
                        ),
                        const SizedBox(height: 20),

                        // OPTIONAL DETAILS Section header
                        _sectionHeader('OPTIONAL DETAILS'),

                        // Date of Birth & Gender
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // DOB
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _fieldLabel('Date of Birth'),
                                  const SizedBox(height: 4),
                                  TextField(
                                    controller: _dobController,
                                    readOnly: true,
                                    onTap: _selectDate,
                                    style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface),
                                    decoration: _optionalDecoration('Select date',
                                        suffix: Icon(Icons.calendar_today, size: 18, color: Theme.of(context).colorScheme.outline)),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            // Gender
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _fieldLabel('Gender'),
                                  const SizedBox(height: 4),
                                  DropdownButtonFormField<String>(
                                    initialValue: _selectedGender,
                                    dropdownColor: Theme.of(context).colorScheme.surface,
                                    style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 14),
                                    decoration: _optionalDecoration('Select'),
                                    hint: Text('Select', style: TextStyle(color: Theme.of(context).colorScheme.outline, fontSize: 14)),
                                    items: const [
                                      DropdownMenuItem(value: 'Male',   child: Text('Male')),
                                      DropdownMenuItem(value: 'Female', child: Text('Female')),
                                      DropdownMenuItem(value: 'Other',  child: Text('Other')),
                                    ],
                                    onChanged: (v) => setState(() => _selectedGender = v),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Height & Weight
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Height
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _fieldLabel('Height (cm)'),
                                  const SizedBox(height: 4),
                                  Focus(
                                    onFocusChange: (hasFocus) {
                                      if (!hasFocus) {
                                        setState(() {
                                          _heightTouched = true;
                                          _heightError   = AuthValidators.validateHeight(_heightController.text);
                                        });
                                      }
                                    },
                                    child: TextField(
                                      controller: _heightController,
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                                      style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface),
                                      onChanged: (v) {
                                        if (_heightTouched) setState(() => _heightError = AuthValidators.validateHeight(v));
                                      },
                                      decoration: _validatedDecoration('175', _heightTouched, _heightError),
                                    ),
                                  ),
                                  if (_heightTouched && _heightError.isNotEmpty) _inlineError(_heightError),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            // Weight
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _fieldLabel('Weight (kg)'),
                                  const SizedBox(height: 4),
                                  Focus(
                                    onFocusChange: (hasFocus) {
                                      if (!hasFocus) {
                                        setState(() {
                                          _weightTouched = true;
                                          _weightError   = AuthValidators.validateWeight(_weightController.text);
                                        });
                                      }
                                    },
                                    child: TextField(
                                      controller: _weightController,
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                                      style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface),
                                      onChanged: (v) {
                                        if (_weightTouched) setState(() => _weightError = AuthValidators.validateWeight(v));
                                      },
                                      decoration: _validatedDecoration('70', _weightTouched, _weightError),
                                    ),
                                  ),
                                  if (_weightTouched && _weightError.isNotEmpty) _inlineError(_weightError),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // ── Footer Buttons ─────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Register Button
                        Consumer<AuthProvider>(
                          builder: (_, auth, __) => SizedBox(
                            height: 48,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.primary,
                                foregroundColor: Theme.of(context).colorScheme.onPrimary,
                                elevation: 0,
                                shape: const StadiumBorder(),
                              ),
                              onPressed: auth.isLoading ? null : _handleRegister,
                              child: auth.isLoading
                                      ? SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2.5, color: Theme.of(context).colorScheme.onPrimary),
                                    )
                                  : const Text(
                                      'Register',
                                      style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600),
                                    ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Log In link
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Already have an account? ',
                              style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 14,
                                  color: Theme.of(context).colorScheme.outline),
                            ),
                            GestureDetector(
                              onTap: () => Navigator.push(context,
                                  MaterialPageRoute(builder: (_) => const LoginScreen())),
                              child: Text(
                                'Log In',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Theme.of(context).colorScheme.primary,
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
    );
  }

  // ── Helper UI builders ──────────────────────────────────────────────────────

  Widget _sectionHeader(String title) => Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(top: 16, bottom: 12),
        decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant))),
        child: Text(
          title,
          style: TextStyle(
              fontFamily: 'Inter', fontSize: 11,
              fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.outline, letterSpacing: 1.0),
        ),
      );

    Widget _fieldLabel(String label) => Text(
      label,
      style: TextStyle(
      fontFamily: 'Inter', fontSize: 14,
      fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onSurfaceVariant),
    );

  /// Decoration cho optional fields (DOB, gender).
    InputDecoration _optionalDecoration(String hint, {Widget? suffix}) => InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Theme.of(context).colorScheme.outline, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      fillColor: Theme.of(context).colorScheme.surface,
      filled: true,
      suffixIcon: suffix,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2)),
      );

  /// Decoration cho height/weight với màu border theo validate state.
  InputDecoration _validatedDecoration(String hint, bool touched, String error) {
    final border = touched
        ? (error.isEmpty ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.error)
        : Theme.of(context).colorScheme.outlineVariant;
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Theme.of(context).colorScheme.outline, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      fillColor: Theme.of(context).colorScheme.surface,
      filled: true,
      border:        OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: border)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(
              color: touched && error.isNotEmpty ? Theme.of(context).colorScheme.error : Theme.of(context).colorScheme.primary,
              width: 2)),
    );
  }

  Widget _inlineError(String message) => Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Row(
          children: [
            Icon(Icons.cancel_outlined, size: 13, color: Theme.of(context).colorScheme.error),
            const SizedBox(width: 4),
            Expanded(
                child: Text(message,
                    style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.error, fontFamily: 'Inter'))),
          ],
        ),
      );
}