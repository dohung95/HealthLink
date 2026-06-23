import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/doctor/wallet_balance.dart';
import '../../models/doctor/commission_transaction.dart';
import '../../models/doctor/settlement.dart';
import '../../services/doctor/doctor_wallet_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import 'doctor_withdraw_sheet.dart';

class DoctorWalletScreen extends StatefulWidget {
  const DoctorWalletScreen({super.key, required this.doctorId});

  final String doctorId;

  @override
  State<DoctorWalletScreen> createState() => _DoctorWalletScreenState();
}

class _DoctorWalletScreenState extends State<DoctorWalletScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DoctorWalletService? _walletService;

  bool _isLoading = true;
  String? _error;
  WalletBalance? _balance;
  List<CommissionTransaction> _transactions = [];
  List<Settlement> _settlements = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _initService();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _initService() {
    final auth = context.read<AuthProvider>();
    final token = auth.accessToken;
    if (token != null) {
      _walletService = DoctorWalletService(accessToken: token, doctorId: widget.doctorId);
      _loadData();
    } else {
      setState(() { _error = 'Not authenticated'; _isLoading = false; });
    }
  }

  Future<void> _loadData() async {
    if (_walletService == null) return;
    setState(() { _isLoading = true; _error = null; });

    try {
      final results = await Future.wait([
        _walletService!.getBalance(),
        _walletService!.getTransactions(),
        _walletService!.getSettlements(),
      ]);

      if (mounted) {
        setState(() {
          _balance = results[0] as WalletBalance;
          _transactions = (results[1] as PagedTransactions).items;
          _settlements = (results[2] as PagedSettlements).items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _isLoading = false; });
    }
  }

  void _showWithdrawSheet() {
    if (_walletService == null || _balance == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DoctorWithdrawSheet(walletService: _walletService!, maxAmount: _balance!.eligibleForWithdrawal, onSuccess: _loadData),
    );
  }

  String _formatCurrency(double amount) => NumberFormat.currency(symbol: '\$', decimalDigits: 2).format(amount);
  String _formatDateTime(DateTime dt) => DateFormat('MMM d, yyyy · h:mm a').format(dt);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        children: [
          DoctorBackHeader(title: 'Wallet & Earnings', onBack: () => Navigator.pop(context)),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: DS.primary))
                : _error != null
                    ? _buildErrorWidget()
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        color: DS.primary,
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(children: [_buildBalanceCard(), const SizedBox(height: 20), _buildTabs()]),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(width: 64, height: 64, decoration: const BoxDecoration(color: DS.secondary, shape: BoxShape.circle), child: Icon(Icons.error_outline, size: 28, color: DS.mutedForeground.withOpacity(0.6))),
            const SizedBox(height: 16),
            const Text('Failed to load wallet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
            const SizedBox(height: 4),
            Text(_error ?? '', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
            const SizedBox(height: 24),
            ElevatedButton.icon(onPressed: _loadData, icon: const Icon(Icons.refresh, size: 18), label: const Text('Retry'), style: DS.primaryButtonStyle),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: DS.primary, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.account_balance_wallet_outlined, size: 16, color: DS.primaryForeground.withOpacity(0.8)),
            const SizedBox(width: 8),
            Text('Total Earnings', style: TextStyle(fontSize: 14, color: DS.primaryForeground.withOpacity(0.8))),
          ]),
          const SizedBox(height: 4),
          Text(_formatCurrency(_balance?.totalBalance ?? 0), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: DS.primaryForeground)),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Available', style: TextStyle(fontSize: 12, color: DS.primaryForeground.withOpacity(0.8))),
                const SizedBox(height: 2),
                Text(_formatCurrency(_balance?.eligibleForWithdrawal ?? 0), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.primaryForeground)),
              ]),
            )),
            const SizedBox(width: 12),
            Expanded(child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Pending', style: TextStyle(fontSize: 12, color: DS.primaryForeground.withOpacity(0.8))),
                const SizedBox(height: 2),
                Text(_formatCurrency(_balance?.pendingBalance ?? 0), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.primaryForeground)),
              ]),
            )),
          ]),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: (_balance?.canWithdraw ?? false) ? _showWithdrawSheet : null,
              icon: const Icon(Icons.download, size: 16),
              label: const Text('Withdraw Funds'),
              style: ElevatedButton.styleFrom(
                backgroundColor: DS.secondary,
                foregroundColor: DS.foreground,
                disabledBackgroundColor: DS.secondary.withOpacity(0.5),
                disabledForegroundColor: DS.mutedForeground,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Column(children: [
      Container(
        decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)),
        child: TabBar(
          controller: _tabController,
          indicator: BoxDecoration(color: DS.card, borderRadius: BorderRadius.circular(6), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 1))]),
          indicatorPadding: const EdgeInsets.all(4),
          labelColor: DS.foreground,
          unselectedLabelColor: DS.mutedForeground,
          labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          dividerColor: Colors.transparent,
          tabs: const [Tab(text: 'Transactions'), Tab(text: 'Withdrawals')],
        ),
      ),
      const SizedBox(height: 16),
      SizedBox(height: 500, child: TabBarView(controller: _tabController, children: [_buildTransactionsList(), _buildSettlementsList()])),
    ]);
  }

  Widget _buildTransactionsList() {
    if (_transactions.isEmpty) return const DoctorEmptyState(icon: Icons.receipt_long_outlined, title: 'No transactions yet', subtitle: 'Your consultation earnings will appear here.');
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _TransactionCard(transaction: _transactions[index], formatCurrency: _formatCurrency, formatDateTime: _formatDateTime),
    );
  }

  Widget _buildSettlementsList() {
    if (_settlements.isEmpty) return const DoctorEmptyState(icon: Icons.download, title: 'No withdrawals', subtitle: 'Your withdrawal requests will appear here.');
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _settlements.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _SettlementCard(settlement: _settlements[index], formatCurrency: _formatCurrency, formatDateTime: _formatDateTime),
    );
  }
}

class _TransactionCard extends StatelessWidget {
  final CommissionTransaction transaction;
  final String Function(double) formatCurrency;
  final String Function(DateTime) formatDateTime;

  const _TransactionCard({required this.transaction, required this.formatCurrency, required this.formatDateTime});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(transaction.patientName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DS.foreground))),
            DoctorStatusBadge(status: transaction.status),
          ]),
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('${formatCurrency(transaction.grossAmount)} gross · ${transaction.commissionRatePercent} fee', style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
            Text('+${formatCurrency(transaction.netAmount)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: DS.emerald600)),
          ]),
          const SizedBox(height: 4),
          Text(formatDateTime(transaction.createdAt), style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
        ],
      ),
    );
  }
}

class _SettlementCard extends StatelessWidget {
  final Settlement settlement;
  final String Function(double) formatCurrency;
  final String Function(DateTime) formatDateTime;

  const _SettlementCard({required this.settlement, required this.formatCurrency, required this.formatDateTime});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(formatCurrency(settlement.amount), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: DS.foreground))),
            DoctorStatusBadge(status: settlement.status),
          ]),
          const SizedBox(height: 4),
          if (settlement.paypalEmail != null) Text(settlement.paypalEmail!, style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
          const SizedBox(height: 4),
          Text('Requested ${formatDateTime(settlement.createdAt)}${settlement.processedAt != null ? ' · Processed ${formatDateTime(settlement.processedAt!)}' : ''}', style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
          if (settlement.adminNotes != null && settlement.adminNotes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(6)),
              child: Text(settlement.adminNotes!, style: const TextStyle(fontSize: 12, color: DS.secondaryForeground)),
            ),
          ],
        ],
      ),
    );
  }
}
