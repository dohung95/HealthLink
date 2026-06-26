import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';

class DoctorSecurityScreen extends StatefulWidget {
  const DoctorSecurityScreen({super.key});

  @override
  State<DoctorSecurityScreen> createState() => _DoctorSecurityScreenState();
}

class _DoctorSecurityScreenState extends State<DoctorSecurityScreen> {
  int _step = 1;
  bool _sending = false;
  bool _saving = false;

  final _otpController = TextEditingController();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();

  String? _email;

  @override
  void initState() {
    super.initState();
    _loadEmail();
  }

  Future<void> _loadEmail() async {
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token != null) {
        final profile = await DoctorService.getProfile(token);
        if (mounted) setState(() => _email = profile.email);
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _otpController.dispose();
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    setState(() => _sending = true);

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final message = await DoctorService.requestPasswordChange(token);

      if (mounted) {
        setState(() { _sending = false; _step = 2; });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _sending = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceFirst('Exception: ', '')), behavior: SnackBarBehavior.floating, backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _changePassword() async {
    final otp = _otpController.text.trim();
    final current = _currentController.text;
    final next = _newController.text;
    final confirm = _confirmController.text;

    if (otp.length < 4) { _showError('Enter the 6-digit code'); return; }
    if (current.isEmpty) { _showError('Enter your current password'); return; }
    if (next.length < 8) { _showError('New password must be at least 8 characters'); return; }
    if (next != confirm) { _showError('Passwords do not match'); return; }

    setState(() => _saving = true);

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      await DoctorService.changePassword(token, verificationCode: otp, currentPassword: current, newPassword: next);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed successfully'), behavior: SnackBarBehavior.floating));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        _showError(e.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating, backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        children: [
          DoctorBackHeader(title: 'Privacy & Security', onBack: () => Navigator.pop(context)),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(children: [_buildHeader(), const SizedBox(height: 20), _buildStepIndicator(), const SizedBox(height: 20), if (_step == 1) _buildStep1() else _buildStep2()]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(children: [
      Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(color: DS.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(16)),
        child: const Icon(Icons.shield_outlined, size: 28, color: DS.primary),
      ),
      const SizedBox(height: 12),
      const Text('Change Password', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
      const SizedBox(height: 4),
      const Text("We'll verify your identity with a one-time code before updating your password.", textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: DS.mutedForeground)),
    ]);
  }

  Widget _buildStepIndicator() {
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text('1. Verify', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _step >= 1 ? DS.primary : DS.mutedForeground)),
      Container(width: 24, height: 1, margin: const EdgeInsets.symmetric(horizontal: 8), color: DS.border),
      Text('2. New password', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _step >= 2 ? DS.primary : DS.mutedForeground)),
    ]);
  }

  Widget _buildStep1() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: DS.cardDecoration,
      child: Column(children: [
        Container(width: 44, height: 44, decoration: const BoxDecoration(color: DS.secondary, shape: BoxShape.circle), child: const Icon(Icons.mark_email_read_outlined, size: 20, color: DS.mutedForeground)),
        const SizedBox(height: 16),
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(style: const TextStyle(fontSize: 14, color: DS.mutedForeground), children: [
            const TextSpan(text: 'A verification code will be sent to '),
            TextSpan(text: _email ?? 'your email', style: const TextStyle(fontWeight: FontWeight.w500, color: DS.foreground)),
          ]),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _sending ? null : _sendCode,
            style: DS.primaryButtonStyle,
            child: _sending ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primaryForeground)) : const Text('Send Verification Code'),
          ),
        ),
      ]),
    );
  }

  Widget _buildStep2() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: DS.emerald50, borderRadius: BorderRadius.circular(8)),
          child: const Row(children: [
            Icon(Icons.check_circle, size: 16, color: DS.emerald700),
            SizedBox(width: 8),
            Expanded(child: Text('Code sent. Check your email inbox.', style: TextStyle(fontSize: 12, color: DS.emerald700))),
          ]),
        ),
        const SizedBox(height: 16),
        const Text('Verification Code', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
          decoration: DS.inputDecoration(hintText: 'Enter 6-digit code'),
        ),
        const SizedBox(height: 16),
        const Text('Current Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(controller: _currentController, obscureText: true, decoration: DS.inputDecoration(hintText: '••••••••')),
        const SizedBox(height: 16),
        const Text('New Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(controller: _newController, obscureText: true, decoration: DS.inputDecoration(hintText: 'At least 8 characters')),
        const SizedBox(height: 16),
        const Text('Confirm New Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(controller: _confirmController, obscureText: true, decoration: DS.inputDecoration(hintText: 'Re-enter new password')),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _saving ? null : _changePassword,
            icon: const Icon(Icons.key, size: 16),
            label: Text(_saving ? 'Updating...' : 'Change Password'),
            style: DS.primaryButtonStyle,
          ),
        ),
      ]),
    );
  }
}
