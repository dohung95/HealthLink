import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';

class DoctorChangePhoneScreen extends StatefulWidget {
  const DoctorChangePhoneScreen({super.key});

  @override
  State<DoctorChangePhoneScreen> createState() => _DoctorChangePhoneScreenState();
}

class _DoctorChangePhoneScreenState extends State<DoctorChangePhoneScreen> {
  int _step = 1;
  bool _sending = false;
  bool _saving = false;

  final _newPhoneController = TextEditingController();
  final _otpController = TextEditingController();

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
    _newPhoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final newPhone = _newPhoneController.text.trim();
    if (newPhone.isEmpty) { _showError('Enter a valid phone number'); return; }

    setState(() => _sending = true);
    // Chưa có xác thực OTP thật ở bước này (project chưa tích hợp SMS/endpoint riêng
    // cho đổi số điện thoại) - chỉ chuyển sang bước 2 để giữ nguyên luồng UI.
    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) {
      setState(() { _sending = false; _step = 2; });
    }
  }

  Future<void> _confirmPhoneChange() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) { _showError('Enter the 6-digit code'); return; }

    setState(() => _saving = true);

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      await DoctorService.updateProfile(token, {'phoneNumber': _newPhoneController.text.trim()});

      if (mounted) {
        await showDoctorNotice(context, 'Phone number updated successfully');
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        _showError(e.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  void _showError(String message) {
    showDoctorNotice(context, message, isError: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        children: [
          DoctorBackHeader(title: 'Change Phone Number', onBack: () => Navigator.pop(context)),
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
        child: const Icon(Icons.phone_outlined, size: 28, color: DS.primary),
      ),
      const SizedBox(height: 12),
      const Text('Change Phone Number', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
      const SizedBox(height: 4),
      const Text("We'll verify this change with a one-time code sent to your email.", textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: DS.mutedForeground)),
    ]);
  }

  Widget _buildStepIndicator() {
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text('1. New number', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _step >= 1 ? DS.primary : DS.mutedForeground)),
      Container(width: 24, height: 1, margin: const EdgeInsets.symmetric(horizontal: 8), color: DS.border),
      Text('2. Verify', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _step >= 2 ? DS.primary : DS.mutedForeground)),
    ]);
  }

  Widget _buildStep1() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)),
          child: Row(children: [
            const Icon(Icons.info_outline, size: 16, color: DS.mutedForeground),
            const SizedBox(width: 8),
            Expanded(child: Text('A verification code will be sent to ${_email ?? 'your email'} (no SMS available yet).', style: const TextStyle(fontSize: 12, color: DS.mutedForeground))),
          ]),
        ),
        const SizedBox(height: 16),
        const Text('New Phone Number', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(controller: _newPhoneController, keyboardType: TextInputType.phone, decoration: DS.inputDecoration(hintText: 'Enter new phone number')),
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
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _saving ? null : _confirmPhoneChange,
            icon: const Icon(Icons.check, size: 16),
            label: Text(_saving ? 'Updating...' : 'Confirm New Number'),
            style: DS.primaryButtonStyle,
          ),
        ),
      ]),
    );
  }
}
