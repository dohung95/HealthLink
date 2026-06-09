import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/patient_service.dart';

class SecuritySettingsScreen extends StatefulWidget {
  const SecuritySettingsScreen({super.key});

  @override
  State<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends State<SecuritySettingsScreen> {
  // --- Form Change Email ---
  final _emailNewController = TextEditingController();
  final _emailPasswordController = TextEditingController();
  final _otpController = TextEditingController();
  bool _emailOtpStep = false;
  bool _changingEmail = false;
  // --- Form Change Password ---
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmNewPasswordController = TextEditingController();
  bool _changingPassword = false;

  // Password visibility
  bool _obscureCurrentEmailPwd = true;
  bool _obscureCurrentPwd = true;
  bool _obscureNewPwd = true;
  bool _obscureConfirmPwd = true;

  @override
  void initState() {
    super.initState();
    _newPasswordController.addListener(() {
      if (mounted) setState(() {});
    });
    _confirmNewPasswordController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _emailNewController.dispose();
    _emailPasswordController.dispose();
    _otpController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmNewPasswordController.dispose();
    super.dispose();
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    final colorScheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white)),
        backgroundColor: isError ? colorScheme.error : colorScheme.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String? _validatePasswordStrength(String pwd, String email, String fullName) {
    if (pwd.length < 6) return "Password must be at least 6 characters long.";
    if (!RegExp(r'[A-Z]').hasMatch(pwd)) return "Password must contain at least one uppercase letter.";
    if (!RegExp(r'[a-z]').hasMatch(pwd)) return "Password must contain at least one lowercase letter.";
    if (!RegExp(r'[0-9]').hasMatch(pwd)) return "Password must contain at least one number.";
    if (!RegExp(r'[^a-zA-Z0-9\s]').hasMatch(pwd)) return "Password must contain at least one special character.";

    final emailPart = email.isNotEmpty ? email.split('@').first.toLowerCase() : '';
    final fullNameLower = fullName.toLowerCase();
    final pwdLower = pwd.toLowerCase();

    if (emailPart.isNotEmpty && pwdLower.contains(emailPart)) return "Password should not contain your email prefix.";
    if (fullNameLower.isNotEmpty && pwdLower.contains(fullNameLower.split(' ').first)) return "Password should not contain your name.";

    return null;
  }

  Future<void> _handleRequestEmailChange(String token) async {
    if (_emailNewController.text.trim().isEmpty || _emailPasswordController.text.isEmpty) {
      _showToast('Please fill in all fields!', isError: true);
      return;
    }
    setState(() => _changingEmail = true);
    try {
      await PatientService.requestEmailChange(token, {
        'newEmail': _emailNewController.text.trim(),
        'password': _emailPasswordController.text,
      });
      _showToast('Verification code sent to your new email. Please check your inbox.');
      setState(() => _emailOtpStep = true);
    } catch (e) {
      _showToast('Failed to send verification code.', isError: true);
    } finally {
      if (mounted) setState(() => _changingEmail = false);
    }
  }

  Future<void> _handleVerifyEmailOtp(String token) async {
    if (_otpController.text.trim().isEmpty) {
      _showToast('Please enter the verification code.', isError: true);
      return;
    }
    setState(() => _changingEmail = true);
    try {
      await PatientService.verifyEmailChange(token, {
        'newEmail': _emailNewController.text.trim(),
        'verificationCode': _otpController.text.trim(),
      });
      if (!mounted) return;
      _showSuccessModal('Email Changed Successfully!', 'Your email has been successfully updated.');
    } catch (e) {
      _showToast('Invalid or expired verification code.', isError: true);
    } finally {
      if (mounted) setState(() => _changingEmail = false);
    }
  }

  Future<void> _handleChangePassword(String token, String email, String fullName) async {
    final currentPwd = _currentPasswordController.text;
    final newPwd = _newPasswordController.text;
    final confirmPwd = _confirmNewPasswordController.text;

    if (currentPwd.isEmpty || newPwd.isEmpty || confirmPwd.isEmpty) {
      _showToast('Please fill in all fields.', isError: true);
      return;
    }
    if (newPwd == currentPwd) {
      _showToast('New password must be different from current password!', isError: true);
      return;
    }
    final strengthError = _validatePasswordStrength(newPwd, email, fullName);
    if (strengthError != null) {
      _showToast(strengthError, isError: true);
      return;
    }
    if (newPwd != confirmPwd) {
      _showToast('New password confirmation does not match!', isError: true);
      return;
    }

    setState(() => _changingPassword = true);
    try {
      await PatientService.changePassword(token, {
        'currentPassword': currentPwd,
        'newPassword': newPwd,
        'confirmNewPassword': confirmPwd,
      });
      if (!mounted) return;
      _showSuccessModal('Password Changed Successfully!', 'Your password has been successfully updated.');
    } catch (e) {
      _showToast('Change password failed. Current password may be incorrect.', isError: true);
    } finally {
      if (mounted) setState(() => _changingPassword = false);
    }
  }

  void _showSuccessModal(String title, String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _SuccessModal(title: title, message: message),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final authProvider = context.watch<AuthProvider>();
    final token = authProvider.accessToken ?? '';
    final profile = authProvider.patientProfile ?? {};
    final email = profile['email']?.toString() ?? '';
    final fullName = profile['fullName']?.toString() ?? '';

    return Scaffold(
      backgroundColor: colorScheme.background,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: colorScheme.outlineVariant.withOpacity(0.5),
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: colorScheme.onSurfaceVariant),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Security Settings',
          style: textTheme.titleLarge?.copyWith(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 768),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildEmailSection(token, colorScheme, textTheme),
                const SizedBox(height: 24),
                _buildPasswordSection(token, email, fullName, colorScheme, textTheme),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmailSection(String token, ColorScheme colorScheme, TextTheme textTheme) {
    // Sử dụng màu secondary (tương đương Info bên Web) cho Email
    final sectionColor = colorScheme.secondary;
    final onSectionColor = colorScheme.onSecondary;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: sectionColor.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: sectionColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
            ),
            child: Row(
              children: [
                Icon(Icons.email_outlined, color: onSectionColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Change Email',
                  style: textTheme.titleMedium?.copyWith(
                    color: onSectionColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: !_emailOtpStep
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: sectionColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: sectionColor.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, color: sectionColor, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'A verification code will be sent to your new email address.',
                                style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurface),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        controller: _emailNewController,
                        label: 'New Email',
                        hint: 'Enter new email',
                        icon: Icons.mail_outline,
                        colorScheme: colorScheme,
                        textTheme: textTheme,
                      ),
                      const SizedBox(height: 16),
                      _buildPasswordField(
                        controller: _emailPasswordController,
                        label: 'Current Password',
                        hint: 'For verification',
                        obscureText: _obscureCurrentEmailPwd,
                        onToggleVisibility: () => setState(() => _obscureCurrentEmailPwd = !_obscureCurrentEmailPwd),
                        colorScheme: colorScheme,
                        textTheme: textTheme,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: sectionColor,
                            foregroundColor: onSectionColor,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            elevation: 0,
                          ),
                          onPressed: _changingEmail ? null : () => _handleRequestEmailChange(token),
                          icon: _changingEmail
                              ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: onSectionColor, strokeWidth: 2))
                              : const Icon(Icons.send, size: 18),
                          label: Text(_changingEmail ? 'Sending...' : 'Send Verification Code'),
                        ),
                      ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.mark_email_read_outlined, color: Colors.green, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'A 6-digit code has been sent to ${_emailNewController.text.trim()}. Please check your inbox.',
                                style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurface),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        controller: _otpController,
                        label: 'Verification Code',
                        hint: 'Enter 6-digit code',
                        icon: Icons.numbers,
                        maxLength: 6,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        colorScheme: colorScheme,
                        textTheme: textTheme,
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: colorScheme.onSurfaceVariant,
                                side: BorderSide(color: colorScheme.outlineVariant),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: () {
                                setState(() {
                                  _emailOtpStep = false;
                                  _otpController.clear();
                                });
                              },
                              icon: const Icon(Icons.arrow_back, size: 18),
                              label: const Text('Back'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: sectionColor,
                                foregroundColor: onSectionColor,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                elevation: 0,
                              ),
                              onPressed: _changingEmail ? null : () => _handleVerifyEmailOtp(token),
                              icon: _changingEmail
                                  ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: onSectionColor, strokeWidth: 2))
                                  : const Icon(Icons.check_circle_outline, size: 18),
                              label: Text(_changingEmail ? 'Verifying...' : 'Confirm Change'),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordSection(String token, String email, String fullName, ColorScheme colorScheme, TextTheme textTheme) {
    // Sử dụng màu error (tương đương Danger bên Web) cho Password
    final sectionColor = colorScheme.error;
    final onSectionColor = colorScheme.onError;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: sectionColor.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: sectionColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
            ),
            child: Row(
              children: [
                Icon(Icons.shield_outlined, color: onSectionColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Change Password',
                  style: textTheme.titleMedium?.copyWith(
                    color: onSectionColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'After changing your password, you will need to log in again.',
                          style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurface),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                _buildPasswordField(
                  controller: _currentPasswordController,
                  label: 'Current Password',
                  hint: 'Enter current password',
                  obscureText: _obscureCurrentPwd,
                  onToggleVisibility: () => setState(() => _obscureCurrentPwd = !_obscureCurrentPwd),
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
                const SizedBox(height: 16),
                _buildPasswordField(
                  controller: _newPasswordController,
                  label: 'New Password',
                  hint: 'Enter new password',
                  obscureText: _obscureNewPwd,
                  onToggleVisibility: () => setState(() => _obscureNewPwd = !_obscureNewPwd),
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
                const SizedBox(height: 16),
                _buildPasswordField(
                  controller: _confirmNewPasswordController,
                  label: 'Confirm New Password',
                  hint: 'Confirm new password',
                  obscureText: _obscureConfirmPwd,
                  onToggleVisibility: () => setState(() => _obscureConfirmPwd = !_obscureConfirmPwd),
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
                const SizedBox(height: 24),
                // Password Requirements
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceVariant.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Password Requirements:',
                        style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurface),
                      ),
                      const SizedBox(height: 8),
                      _buildRequirementItem(
                          'At least 6 characters',
                          _newPasswordController.text.length >= 6,
                          colorScheme,
                          textTheme),
                      _buildRequirementItem(
                          'At least one number (0-9)',
                          RegExp(r'[0-9]').hasMatch(_newPasswordController.text),
                          colorScheme,
                          textTheme),
                      _buildRequirementItem(
                          'At least one special character (!@#\$%^&*)',
                          RegExp(r'[^a-zA-Z0-9\s]').hasMatch(_newPasswordController.text),
                          colorScheme,
                          textTheme),
                      _buildRequirementItem(
                          'Upper and lowercase letters',
                          RegExp(r'[A-Z]').hasMatch(_newPasswordController.text) && RegExp(r'[a-z]').hasMatch(_newPasswordController.text),
                          colorScheme,
                          textTheme),
                      _buildRequirementItem(
                          'Passwords match',
                          _newPasswordController.text.isNotEmpty && _newPasswordController.text == _confirmNewPasswordController.text,
                          colorScheme,
                          textTheme),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: sectionColor,
                      foregroundColor: onSectionColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    onPressed: _changingPassword ? null : () => _handleChangePassword(token, email, fullName),
                    icon: _changingPassword
                        ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: onSectionColor, strokeWidth: 2))
                        : const Icon(Icons.shield_outlined, size: 18),
                    label: Text(_changingPassword ? 'Processing...' : 'Change Password'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    IconData? icon,
    int? maxLength,
    TextInputType? keyboardType,
    TextAlign textAlign = TextAlign.start,
    required ColorScheme colorScheme,
    required TextTheme textTheme,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLength: maxLength,
          keyboardType: keyboardType,
          textAlign: textAlign,
          style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurface),
          decoration: InputDecoration(
            counterText: '',
            hintText: hint,
            hintStyle: textTheme.bodyMedium?.copyWith(color: colorScheme.outline),
            filled: true,
            fillColor: colorScheme.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            suffixIcon: icon != null ? Icon(icon, color: colorScheme.outline, size: 20) : null,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: colorScheme.outlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: colorScheme.primary),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required bool obscureText,
    required VoidCallback onToggleVisibility,
    required ColorScheme colorScheme,
    required TextTheme textTheme,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscureText,
          style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurface),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: textTheme.bodyMedium?.copyWith(color: colorScheme.outline),
            filled: true,
            fillColor: colorScheme.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            suffixIcon: IconButton(
              icon: Icon(
                obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                color: colorScheme.outline,
                size: 20,
              ),
              onPressed: onToggleVisibility,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: colorScheme.outlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: colorScheme.primary),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRequirementItem(String text, bool isMet, ColorScheme colorScheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Icon(
            isMet ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 16,
            color: isMet ? Colors.green : colorScheme.outline,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: textTheme.bodyMedium?.copyWith(
                color: isMet ? Colors.green : colorScheme.onSurfaceVariant,
                fontWeight: isMet ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SuccessModal extends StatefulWidget {
  final String title;
  final String message;

  const _SuccessModal({required this.title, required this.message});

  @override
  State<_SuccessModal> createState() => _SuccessModalState();
}

class _SuccessModalState extends State<_SuccessModal> {
  int _countdown = 3;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 0) {
        setState(() => _countdown--);
      } else {
        _timer?.cancel();
        _logoutAndRedirect();
      }
    });
  }

  void _logoutAndRedirect() {
    final authProvider = context.read<AuthProvider>();
    authProvider.logout();
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Dialog(
      backgroundColor: colorScheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.security, size: 40, color: colorScheme.primary),
            ),
            const SizedBox(height: 24),
            Text(
              widget.title,
              textAlign: TextAlign.center,
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 12),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
                children: [
                  TextSpan(text: widget.message + ' For security reasons, you will be logged out automatically in '),
                  TextSpan(
                    text: '$_countdown',
                    style: textTheme.bodyLarge?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const TextSpan(text: ' seconds.'),
                ],
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: colorScheme.onPrimary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                onPressed: () {
                  _timer?.cancel();
                  _logoutAndRedirect();
                },
                icon: const Icon(Icons.exit_to_app, size: 20),
                label: const Text('Back to Login', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}