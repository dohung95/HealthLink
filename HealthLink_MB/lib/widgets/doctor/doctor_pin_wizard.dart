import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../config/doctor_theme.dart';
import '../../services/partner/partner_security_service.dart';

enum _PinStep { otp, pin, confirmPin }

/// Thời gian chờ tối đa cho mỗi request trong wizard trước khi coi là "quá lâu"
/// và tự phục hồi (ngắn hơn timeout mặc định của service để widget luôn chủ động
/// thoát khỏi trạng thái loading, tránh treo vô hạn nếu kết nối bị kẹt).
const Duration _kPinRequestTimeout = Duration(seconds: 12);

/// Mở bottom sheet thiết lập/đổi Withdrawal PIN — riêng cho Doctor.
///
/// Khác với `PartnerPinWizard` dùng chung (Pharmacy):
/// - Tự gửi OTP ngay khi mở thay vì hiện sẵn "a code was sent to your email"
///   trong khi chưa thực sự gửi gì (bug UX của bản dùng chung, chỉ gửi khi bấm "Resend").
/// - Mỗi request có timeout riêng của widget + tự dùng `http.Client` mới hoàn toàn
///   (không dùng chung với các màn hình khác) để tránh treo do tái sử dụng kết nối.
/// - Nếu bước lưu PIN bị timeout, tự kiểm tra lại trạng thái PIN trên server trước
///   khi báo lỗi — vì backend có thể đã lưu thành công dù phản hồi không về kịp.
Future<void> showDoctorPinWizard(
  BuildContext context, {
  required String token,
  required VoidCallback onSuccess,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    isDismissible: false,
    enableDrag: false,
    builder: (_) => _DoctorPinWizardSheet(token: token, onSuccess: onSuccess),
  );
}

class _DoctorPinWizardSheet extends StatefulWidget {
  final String token;
  final VoidCallback onSuccess;

  const _DoctorPinWizardSheet({required this.token, required this.onSuccess});

  @override
  State<_DoctorPinWizardSheet> createState() => _DoctorPinWizardSheetState();
}

class _DoctorPinWizardSheetState extends State<_DoctorPinWizardSheet> {
  // http.Client riêng cho vòng đời của wizard này — không chia sẻ với màn hình
  // cha (tránh kịch bản kết nối keep-alive bị tái sử dụng ở trạng thái lỗi).
  final _service = PartnerSecurityService();

  _PinStep _step = _PinStep.otp;
  bool _sendingInitialOtp = true;
  bool _loading = false;
  String? _error;
  int _cooldown = 0;
  Timer? _cooldownTimer;

  final _otpCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  String _verifiedOtp = '';
  String _newPin = '';

  @override
  void initState() {
    super.initState();
    _sendInitialOtp();
  }

  @override
  void dispose() {
    _otpCtrl.dispose();
    _pinCtrl.dispose();
    _confirmCtrl.dispose();
    _cooldownTimer?.cancel();
    _service.close();
    super.dispose();
  }

  // ── OTP request / cooldown ──────────────────────────────────────────────

  Future<void> _sendInitialOtp() async {
    try {
      await _service.requestPinOtp(widget.token).timeout(_kPinRequestTimeout);
      _startCooldown(60);
    } catch (e) {
      final seconds = _parseCooldownSeconds(e.toString());
      if (seconds > 0) {
        // Một mã còn hiệu lực từ lần gửi trước đó — vẫn cho vào bước nhập OTP.
        _startCooldown(seconds);
      } else {
        _error = _friendlyError(e.toString());
      }
    } finally {
      if (mounted) setState(() => _sendingInitialOtp = false);
    }
  }

  int _parseCooldownSeconds(String message) {
    final match = RegExp(r'(\d+)').firstMatch(message);
    return match != null ? int.tryParse(match.group(1)!) ?? 0 : 0;
  }

  void _startCooldown(int seconds) {
    _cooldown = seconds;
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_cooldown <= 1) {
        _cooldownTimer?.cancel();
        setState(() => _cooldown = 0);
      } else {
        setState(() => _cooldown--);
      }
    });
  }

  Future<void> _resendOtp() async {
    if (_loading || _cooldown > 0) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _service.requestPinOtp(widget.token).timeout(_kPinRequestTimeout);
      _otpCtrl.clear();
      _startCooldown(60);
    } catch (e) {
      final seconds = _parseCooldownSeconds(e.toString());
      if (seconds > 0) _startCooldown(seconds);
      if (mounted) setState(() => _error = _friendlyError(e.toString()));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Step actions ─────────────────────────────────────────────────────────

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    if (otp.length != 6) {
      setState(() => _error = 'Enter the six-digit code sent to your email.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _service.verifyPinOtp(widget.token, otp).timeout(_kPinRequestTimeout);
      _verifiedOtp = otp;
      if (mounted) {
        setState(() {
          _step = _PinStep.pin;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = _friendlyError(e.toString());
          _loading = false;
        });
      }
    }
  }

  void _continueToConfirm() {
    final pin = _pinCtrl.text.trim();
    if (pin.length != 6) {
      setState(() => _error = 'Enter a six-digit withdrawal PIN.');
      return;
    }
    _newPin = pin;
    setState(() {
      _step = _PinStep.confirmPin;
      _error = null;
    });
  }

  Future<void> _savePin() async {
    final confirm = _confirmCtrl.text.trim();
    if (confirm.length != 6) {
      setState(() => _error = 'Re-enter your six-digit withdrawal PIN.');
      return;
    }
    if (confirm != _newPin) {
      setState(() => _error = 'PIN and confirmation do not match.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _service
          .setPin(widget.token, otp: _verifiedOtp, pin: _newPin, confirmPin: confirm)
          .timeout(_kPinRequestTimeout);
      _finishSuccess();
    } on TimeoutException {
      // Request có thể đã tới backend và lưu thành công dù phản hồi không về kịp
      // (từng thấy trên emulator do kẹt kết nối keep-alive) — xác nhận lại qua
      // status trước khi báo lỗi, tránh làm mất công người dùng gõ lại từ đầu.
      final savedAnyway = await _didPinActuallySave();
      if (savedAnyway) {
        _finishSuccess();
      } else if (mounted) {
        setState(() {
          _error = 'The request took too long. Please check your connection and try again.';
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _loading = false;
        });
      }
    }
  }

  Future<bool> _didPinActuallySave() async {
    try {
      final status = await _service.getPinStatus(widget.token).timeout(const Duration(seconds: 8));
      return status['configured'] == true;
    } catch (_) {
      return false;
    }
  }

  void _finishSuccess() {
    if (!mounted) return;
    // Đóng sheet TRƯỚC khi gọi onSuccess: onSuccess (ở màn hình cha) push một
    // dialog thông báo mới lên cùng Navigator — nếu gọi trước, Navigator.pop()
    // bên dưới sẽ đóng nhầm dialog vừa mở thay vì sheet này, khiến sheet treo
    // mãi ở trạng thái loading dù request đã thành công.
    Navigator.pop(context);
    widget.onSuccess();
  }

  String _friendlyError(String raw) {
    if (raw.contains('TimeoutException')) {
      return 'The request took too long. Please check your connection and try again.';
    }
    final message = raw.replaceFirst('Exception: ', '');
    if (!message.startsWith('PIN_OTP_ERROR:')) return message;
    switch (message.substring('PIN_OTP_ERROR:'.length)) {
      case 'PIN_OTP_INVALID':
        return 'Incorrect code. Please check your email and try again.';
      case 'PIN_OTP_EXPIRED':
        return 'This code has expired. Tap Resend to get a new one.';
      case 'PIN_OTP_ATTEMPTS_EXCEEDED':
        return 'Too many incorrect attempts. Tap Resend to get a new code.';
      case 'PIN_OTP_COOLDOWN':
        return 'Please wait before requesting another code.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(color: DS.background, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildHeader(),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: _sendingInitialOtp ? _buildSendingState() : _buildStepBody(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 8, 14),
      decoration: const BoxDecoration(color: DS.card, border: Border(bottom: BorderSide(color: DS.cardBorder))),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Withdrawal PIN', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: DS.foreground)),
                if (!_sendingInitialOtp) ...[
                  const SizedBox(height: 4),
                  _buildStepIndicator(),
                ],
              ],
            ),
          ),
          IconButton(
            onPressed: _loading ? null : () => Navigator.pop(context),
            icon: const Icon(Icons.close, color: DS.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _buildStepIndicator() {
    const steps = ['Verify', 'New PIN', 'Confirm'];
    final currentIndex = _step.index;
    return Row(
      children: [
        for (int i = 0; i < steps.length; i++) ...[
          if (i > 0) Container(width: 16, height: 1, color: DS.border, margin: const EdgeInsets.symmetric(horizontal: 4)),
          Text(
            '${i + 1}. ${steps[i]}',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: i <= currentIndex ? DS.primary : DS.mutedForeground),
          ),
        ],
      ],
    );
  }

  Widget _buildSendingState() {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary)),
          SizedBox(height: 16),
          Text('Sending verification code to your email...', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
        ],
      ),
    );
  }

  Widget _buildStepBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_error != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: DS.rose100, borderRadius: BorderRadius.circular(10)),
            child: Text(_error!, style: const TextStyle(fontSize: 12, color: DS.rose700)),
          ),
          const SizedBox(height: 16),
        ],
        if (_step == _PinStep.otp) _buildOtpStep(),
        if (_step == _PinStep.pin) _buildPinStep(),
        if (_step == _PinStep.confirmPin) _buildConfirmStep(),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('We just sent a 6-digit code to your registered email.', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
        const SizedBox(height: 16),
        const Text('Verification code', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(
          controller: _otpCtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: DS.inputDecoration(hintText: '000000').copyWith(counterText: ''),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _verifyOtp,
            style: DS.primaryButtonStyle,
            child: _loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Verify'),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: TextButton(
            onPressed: (_loading || _cooldown > 0) ? null : _resendOtp,
            child: Text(_cooldown > 0 ? 'Resend code in ${_cooldown}s' : 'Resend code'),
          ),
        ),
      ],
    );
  }

  Widget _buildPinStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Choose a 6-digit PIN. You will need it for every withdrawal.', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
        const SizedBox(height: 16),
        const Text('New PIN', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(
          controller: _pinCtrl,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: DS.inputDecoration(hintText: '••••••').copyWith(counterText: ''),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _continueToConfirm,
            style: DS.primaryButtonStyle,
            child: const Text('Continue'),
          ),
        ),
      ],
    );
  }

  Widget _buildConfirmStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Re-enter the same 6-digit PIN to confirm.', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
        const SizedBox(height: 16),
        const Text('Confirm PIN', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(
          controller: _confirmCtrl,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: DS.inputDecoration(hintText: '••••••').copyWith(counterText: ''),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                style: DS.outlineButtonStyle,
                onPressed: _loading
                    ? null
                    : () => setState(() {
                          _step = _PinStep.pin;
                          _error = null;
                        }),
                child: const Text('Back'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _loading ? null : _savePin,
                style: DS.primaryButtonStyle,
                child: _loading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Save PIN'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
