import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/partner/partner_wallet_service.dart';
import '../../services/partner/partner_security_service.dart';
import '../../models/partner/partner_wallet_models.dart';
import '../../widgets/partner/partner_pin_wizard.dart';

class PharmacyWalletScreen extends StatefulWidget {
  const PharmacyWalletScreen({super.key});

  @override
  State<PharmacyWalletScreen> createState() => _PharmacyWalletScreenState();
}

class _PharmacyWalletScreenState extends State<PharmacyWalletScreen> {
  late PartnerWalletService _walletService;
  final _securityService = PartnerSecurityService();
  bool _loading = false;
  PartnerWalletBalance? _balance;
  List<PartnerTransaction> _transactions = [];
  List<PartnerSettlement> _settlements = [];
  bool _showSettlements = false;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthProvider>();
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId ?? '';
    _walletService = PartnerWalletService(
      partnerId: pharmacyId,
      partnerType: 'PHARMACY',
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _walletService.getBalance(auth.accessToken!),
        _walletService.getTransactions(auth.accessToken!),
        _walletService.getSettlements(auth.accessToken!),
      ]);
      if (mounted) setState(() {
        _balance = results[0] as PartnerWalletBalance;
        _transactions = results[1] as List<PartnerTransaction>;
        _settlements = results[2] as List<PartnerSettlement>;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _showWithdrawalDialog() {
    final amountCtrl = TextEditingController();
    bool sending = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Withdraw Funds'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amountCtrl,
                decoration: const InputDecoration(
                  labelText: 'Amount (\$)',
                  prefixText: '\$',
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 8),
              const Text(
                'Funds will be sent to your registered PayPal email',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                final amount = double.tryParse(amountCtrl.text);
                if (amount == null || amount <= 0) return;
                final auth = context.read<AuthProvider>();
                if (auth.accessToken == null) return;

                setDialogState(() => sending = true);
                try {
                  final pinStatus = await _securityService
                      .getPinStatus(auth.accessToken!);
                  if (pinStatus['configured'] != true) {
                    if (ctx.mounted) {
                      Navigator.pop(ctx);
                      _promptCreatePin();
                    }
                    return;
                  }
                  if (ctx.mounted) Navigator.pop(ctx);
                  _promptWithdrawalPin(amount);
                } catch (e) {
                  if (ctx.mounted) {
                    setDialogState(() => sending = false);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString())),
                    );
                  }
                }
              },
              child: sending
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child:
                          CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }

  void _promptCreatePin() {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    showDialog(
      context: context,
      builder: (_) => PartnerPinWizard(
        service: _securityService,
        token: auth.accessToken!,
        onSuccess: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('PIN created successfully')),
          );
        },
      ),
    );
  }

  void _promptWithdrawalPin(double amount) {
    final pinCtrl = TextEditingController();
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter PIN'),
        content: TextField(
          controller: pinCtrl,
          decoration: const InputDecoration(labelText: '6-digit PIN'),
          keyboardType: TextInputType.number,
          obscureText: true,
          maxLength: 6,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (pinCtrl.text.trim().length != 6) return;
              Navigator.pop(ctx);
              _executeWithdrawal(amount, pinCtrl.text.trim());
            },
            child: const Text('Withdraw'),
          ),
        ],
      ),
    );
  }

  Future<void> _executeWithdrawal(double amount, String pin) async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    setState(() => _loading = true);
    try {
      final paypalEmail = context.read<AuthProvider>().pharmacyProfile?['paypalEmail']?.toString();
      await _walletService.requestWithdrawal(
        auth.accessToken!,
        amount: amount,
        paypalEmail: paypalEmail ?? '',
        pin: pin,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Withdrawal request submitted')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Wallet'), centerTitle: true),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: _loading && _balance == null
            ? const Center(child: CircularProgressIndicator())
            : _error != null && _balance == null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!,
                            style: TextStyle(
                                color: theme.colorScheme.error)),
                        FilledButton.tonal(
                            onPressed: _loadData,
                            child: const Text('Retry')),
                      ],
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildBalanceCard(theme),
                      const SizedBox(height: 16),
                      _buildActionButtons(theme),
                      const SizedBox(height: 16),
                      _buildToggleFilter(theme),
                      const SizedBox(height: 8),
                      if (_showSettlements)
                        ..._settlements
                            .map((s) => _settlementTile(s, theme))
                      else
                        ..._transactions
                            .map((t) => _transactionTile(t, theme)),
                    ],
                  ),
      ),
    );
  }

  Widget _buildBalanceCard(ThemeData theme) {
    final b = _balance;
    if (b == null) return const SizedBox();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Text('Available Balance',
                style: theme.textTheme.titleSmall
                    ?.copyWith(color: Colors.grey)),
            const SizedBox(height: 8),
            Text('\$${b.pendingBalance.toStringAsFixed(2)}',
                style: theme.textTheme.headlineLarge
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            if (b.totalEarnings != null)
              Text('Total earned: \$${b.totalEarnings!.toStringAsFixed(2)}',
                  style: theme.textTheme.bodySmall),
            const SizedBox(height: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: b.canWithdraw
                    ? Colors.green.withOpacity(0.1)
                    : Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                b.canWithdraw ? 'Eligible for withdrawal' : 'Insufficient balance',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: b.canWithdraw ? Colors.green : Colors.orange,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(ThemeData theme) {
    return Row(
      children: [
        Expanded(
          child: FilledButton.icon(
            onPressed: _balance?.canWithdraw == true
                ? _showWithdrawalDialog
                : null,
            icon: const Icon(Icons.arrow_upward),
            label: const Text('Withdraw'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
          ),
        ),
      ],
    );
  }

  Widget _buildToggleFilter(ThemeData theme) {
    return Row(
      children: [
        ChoiceChip(
          label: const Text('Transactions'),
          selected: !_showSettlements,
          onSelected: (_) => setState(() => _showSettlements = false),
        ),
        const SizedBox(width: 8),
        ChoiceChip(
          label: const Text('Settlements'),
          selected: _showSettlements,
          onSelected: (_) => setState(() => _showSettlements = true),
        ),
      ],
    );
  }

  Widget _transactionTile(PartnerTransaction tx, ThemeData theme) {
    return Card(
      child: ListTile(
        leading: Icon(
          tx.status == 'SETTLED'
              ? Icons.check_circle
              : Icons.schedule,
          color: tx.status == 'SETTLED' ? Colors.green : Colors.orange,
        ),
        title: Text('${tx.serviceType} - \$${tx.netAmount.toStringAsFixed(2)}'),
        subtitle: Text(
            '${tx.displayStatus} • ${tx.createdAt.toString().substring(0, 10)}'),
        trailing: Text('\$${tx.grossAmount.toStringAsFixed(2)}',
            style: theme.textTheme.bodyMedium),
      ),
    );
  }

  Widget _settlementTile(PartnerSettlement s, ThemeData theme) {
    return Card(
      child: ListTile(
        leading: Icon(
          s.isCompleted
              ? Icons.check_circle
              : s.isPending
                  ? Icons.schedule
                  : Icons.cancel,
          color: s.isCompleted
              ? Colors.green
              : s.isPending
                  ? Colors.orange
                  : Colors.red,
        ),
        title: Text('#${s.settlementNumber} - \$${s.netAmount.toStringAsFixed(2)}'),
        subtitle: Text(
            '${s.displayStatus} • ${s.createdAt.toString().substring(0, 10)}'),
        trailing: Text('\$${s.grossAmount.toStringAsFixed(2)}',
            style: theme.textTheme.bodyMedium),
      ),
    );
  }
}
