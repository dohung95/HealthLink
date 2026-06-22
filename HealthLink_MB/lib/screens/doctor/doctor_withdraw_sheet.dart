import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../services/doctor/doctor_wallet_service.dart';
import '../../config/doctor_theme.dart';

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
  bool _isLoading = false;

  String _formatCurrency(double amount) => NumberFormat.currency(symbol: '\$', decimalDigits: 2).format(amount);

  @override
  void dispose() {
    _amountController.dispose();
    _paypalEmailController.dispose();
    super.dispose();
  }

  Future<void> _submitWithdrawal() async {
    final amount = double.tryParse(_amountController.text) ?? 0;

    if (amount < 10) { _showError('Minimum withdrawal amount is \$10.00'); return; }
    if (amount > widget.maxAmount) { _showError('Amount exceeds available balance'); return; }

    final paypal = _paypalEmailController.text.trim();
    if (paypal.isNotEmpty && !paypal.contains('@')) { _showError('Enter a valid PayPal email'); return; }

    setState(() => _isLoading = true);

    try {
      await widget.walletService.requestWithdrawal(amount: amount, paypalEmail: paypal.isNotEmpty ? paypal : null);

      if (mounted) {
        Navigator.pop(context);
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Withdrawal of ${_formatCurrency(amount)} requested'), behavior: SnackBarBehavior.floating));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showError(e.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating, backgroundColor: DS.destructive));
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
                const Text('Amount (min \$10.00)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                const SizedBox(height: 8),
                TextField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
                  decoration: DS.inputDecoration(hintText: '0.00'),
                ),
                const SizedBox(height: 16),
                const Text('PayPal Email', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                const SizedBox(height: 8),
                TextField(
                  controller: _paypalEmailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: DS.inputDecoration(hintText: 'your@email.com'),
                ),
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
}
