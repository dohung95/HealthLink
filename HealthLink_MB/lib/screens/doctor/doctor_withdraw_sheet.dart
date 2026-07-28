import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_wallet_service.dart';
import '../../services/partner/partner_security_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/doctor/doctor_pin_wizard.dart';

class DoctorWithdrawSheet extends StatefulWidget {
  const DoctorWithdrawSheet({super.key, required this.walletService, required this.maxAmount, required this.onSuccess});

  final DoctorWalletService walletService;
  final double maxAmount;
  final VoidCallback onSuccess;

  @override
  State<DoctorWithdrawSheet> createState() => _DoctorWithdrawSheetState();
}

class _DoctorWithdrawSheetState extends State<DoctorWithdrawSheet> {
  final _amountController = TextEditingController();
  final _paypalEmailController = TextEditingController();
  final _pinController = TextEditingController();
  final _securityService = PartnerSecurityService();
  bool _isLoading = false;

  bool _loadingPinStatus = true;
  bool _pinConfigured = false;
  bool _pinLocked = false;

  String _formatCurrency(double amount) => NumberFormat.currency(symbol: '\$', decimalDigits: 2).format(amount);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPinStatus());
  }

  @override
  void dispose() {
    _amountController.dispose();
    _paypalEmailController.dispose();
    _pinController.dispose();
    _securityService.close();
    super.dispose();
  }

  Future<void> _loadPinStatus() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) {
      if (mounted) setState(() => _loadingPinStatus = false);
      return;
    }
    try {
      final status = await _securityService.getPinStatus(token);
      if (mounted) {
        setState(() {
          _pinConfigured = status['configured'] == true;
          _pinLocked = status['locked'] == true;
          _loadingPinStatus = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingPinStatus = false);
    }
  }

  void _openPinWizard() {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    showDoctorPinWizard(
      context,
      token: token,
      onSuccess: () {
        showDoctorNotice(context, 'Withdrawal PIN configured.');
        _loadPinStatus();
      },
    );
  }

  Future<void> _submitWithdrawal() async {
    final amount = double.tryParse(_amountController.text) ?? 0;

    if (amount <= 0) { _showError('Please enter a valid positive amount'); return; }
    if (amount > widget.maxAmount) { _showError('Amount exceeds eligible balance of ${_formatCurrency(widget.maxAmount)}'); return; }

    final paypal = _paypalEmailController.text.trim();
    if (paypal.isEmpty) { _showError('PayPal email is required'); return; }
    if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(paypal)) { _showError('Enter a valid PayPal email'); return; }

    if (_pinConfigured && _pinLocked) { _showError('Withdrawal PIN is temporarily locked. Try again later.'); return; }
    final pin = _pinController.text.trim();
    if (_pinConfigured && pin.length != 6) { _showError('Enter your six-digit withdrawal PIN'); return; }

    setState(() => _isLoading = true);

    try {
      await widget.walletService.requestWithdrawal(
        amount: amount,
        paypalEmail: paypal,
        pin: _pinConfigured ? pin : null,
      );

      if (mounted) {
        Navigator.pop(context);
        widget.onSuccess();
        showDoctorNotice(context, 'Withdrawal of ${_formatCurrency(amount)} requested');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showError(e.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  void _showError(String message) {
    showDoctorNotice(context, message, isError: true);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 100),
      decoration: const BoxDecoration(color: DS.card, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: SingleChildScrollView(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(child: Padding(padding: const EdgeInsets.only(top: 12), child: Container(width: 40, height: 4, decoration: BoxDecoration(color: DS.cardBorder, borderRadius: BorderRadius.circular(2))))),

            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Withdraw Funds', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DS.foreground)),
                const SizedBox(height: 4),
                Text('Available balance: ${_formatCurrency(widget.maxAmount)}', style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
              ]),
            ),

            // Form
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                const SizedBox(height: 8),
                TextField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
                  decoration: DS.inputDecoration(hintText: '0.00'),
                ),
                const SizedBox(height: 16),
                const Text('PayPal Email *', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                const SizedBox(height: 8),
                TextField(
                  controller: _paypalEmailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: DS.inputDecoration(hintText: 'your@paypal.email'),
                ),
                const SizedBox(height: 4),
                const Text('Must match the PayPal email in your profile settings.', style: TextStyle(fontSize: 12, color: DS.mutedForeground)),
                const SizedBox(height: 16),
                _buildPinSection(),
              ]),
            ),

            // Button
            Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitWithdrawal,
                  style: DS.primaryButtonStyle,
                  child: _isLoading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primaryForeground))
                      : const Text('Request Withdrawal', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPinSection() {
    if (_loadingPinStatus) {
      return const SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary),
      );
    }

    if (!_pinConfigured) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            const Icon(Icons.pin_outlined, size: 18, color: DS.mutedForeground),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Withdrawal PIN is optional until you configure it.',
                style: TextStyle(fontSize: 12, color: DS.mutedForeground),
              ),
            ),
            TextButton(onPressed: _openPinWizard, child: const Text('Set up')),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('Withdrawal PIN *', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
            const Spacer(),
            if (_pinLocked)
              const Text('Temporarily locked', style: TextStyle(fontSize: 12, color: DS.rose600, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _pinController,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          enabled: !_pinLocked,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: DS.inputDecoration(hintText: '••••••').copyWith(counterText: ''),
        ),
      ],
    );
  }
}
