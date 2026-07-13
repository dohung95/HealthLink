import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/partner/partner_security_service.dart';

enum PinWizardStep { otp, pin, confirmPin }

class PartnerPinWizard extends StatefulWidget {
  final PartnerSecurityService service;
  final String token;
  final VoidCallback? onSuccess;

  const PartnerPinWizard({
    super.key,
    required this.service,
    required this.token,
    this.onSuccess,
  });

  @override
  State<PartnerPinWizard> createState() => _PartnerPinWizardState();
}

class _PartnerPinWizardState extends State<PartnerPinWizard> {
  PinWizardStep _step = PinWizardStep.otp;
  bool _loading = false;
  String? _error;

  final _otpCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  final _confirmPinCtrl = TextEditingController();

  int _cooldown = 0;
  Timer? _cooldownTimer;

  String _otp = '';
  String _pin = '';

  @override
  void dispose() {
    _otpCtrl.dispose();
    _pinCtrl.dispose();
    _confirmPinCtrl.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.service.requestPinOtp(widget.token);
      _startCooldown();
      if (mounted) setState(() => _loading = false);
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('Cooldown')) {
        final secs = _parseCooldown(msg);
        if (secs > 0) _startCooldown(secs);
      }
      if (mounted) setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  int _parseCooldown(String msg) {
    final parts = msg.split(' ');
    for (int i = 0; i < parts.length; i++) {
      final n = int.tryParse(parts[i]);
      if (n != null) return n;
    }
    return 0;
  }

  void _startCooldown([int seconds = 60]) {
    _cooldown = seconds;
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_cooldown <= 1) {
        _cooldownTimer?.cancel();
        if (mounted) setState(() => _cooldown = 0);
      } else {
        if (mounted) setState(() => _cooldown--);
      }
    });
  }

  Future<void> _verifyOtp() async {
    if (_otpCtrl.text.trim().length != 6) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.service.verifyPinOtp(widget.token, _otpCtrl.text.trim());
      _otp = _otpCtrl.text.trim();
      if (mounted) setState(() {
        _step = PinWizardStep.pin;
        _loading = false;
        _otpCtrl.clear();
      });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _submitPin() async {
    if (_pinCtrl.text.trim().length != 6) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    _pin = _pinCtrl.text.trim();
    if (mounted) setState(() {
      _step = PinWizardStep.confirmPin;
      _loading = false;
    });
  }

  Future<void> _confirmPin() async {
    if (_confirmPinCtrl.text.trim() != _pin) {
      setState(() => _error = 'PINs do not match');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.service.setPin(
        widget.token,
        otp: _otp,
        pin: _pin,
        confirmPin: _confirmPinCtrl.text.trim(),
      );
      _otp = '';
      _pin = '';
      _otpCtrl.clear();
      _pinCtrl.clear();
      _confirmPinCtrl.clear();
      if (mounted) {
        widget.onSuccess?.call();
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SimpleDialog(
      title: Text(_step == PinWizardStep.otp
          ? 'Verify Email OTP'
          : _step == PinWizardStep.pin
              ? 'Set Withdrawal PIN'
              : 'Confirm Withdrawal PIN'),
      contentPadding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        if (_step == PinWizardStep.otp) _buildOtpStep(),
        if (_step == PinWizardStep.pin) _buildPinStep(),
        if (_step == PinWizardStep.confirmPin) _buildConfirmStep(),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Enter the 6-digit OTP sent to your email'),
        const SizedBox(height: 12),
        TextField(
          controller: _otpCtrl,
          decoration: InputDecoration(
            labelText: 'OTP',
            suffixText: _cooldown > 0 ? '${_cooldown}s' : null,
          ),
          keyboardType: TextInputType.number,
          maxLength: 6,
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _loading ? null : _verifyOtp,
          child: _loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Verify'),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _cooldown > 0 || _loading ? null : _requestOtp,
          child: Text(_cooldown > 0
              ? 'Resend in ${_cooldown}s'
              : 'Resend OTP'),
        ),
      ],
    );
  }

  Widget _buildPinStep() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Create a 6-digit withdrawal PIN'),
        const SizedBox(height: 12),
        TextField(
          controller: _pinCtrl,
          decoration: const InputDecoration(labelText: 'New PIN'),
          keyboardType: TextInputType.number,
          obscureText: true,
          maxLength: 6,
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _loading ? null : _submitPin,
          child: _loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Next'),
        ),
      ],
    );
  }

  Widget _buildConfirmStep() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Re-enter your 6-digit withdrawal PIN'),
        const SizedBox(height: 12),
        TextField(
          controller: _confirmPinCtrl,
          decoration: const InputDecoration(labelText: 'Confirm PIN'),
          keyboardType: TextInputType.number,
          obscureText: true,
          maxLength: 6,
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _loading ? null : _confirmPin,
          child: _loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Confirm'),
        ),
      ],
    );
  }
}
