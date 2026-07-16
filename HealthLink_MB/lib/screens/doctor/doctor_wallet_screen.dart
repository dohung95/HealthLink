import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/doctor/wallet_balance.dart';
import '../../models/doctor/commission_transaction.dart';
import '../../models/doctor/settlement.dart';
import '../../services/doctor/doctor_wallet_service.dart';
import '../../services/partner/partner_security_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/partner/partner_pin_wizard.dart';
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

  final _securityService = PartnerSecurityService();
  bool _loadingPinStatus = true;
  bool _pinConfigured = false;
  bool _pinLocked = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Không dùng TabBarView (PageView) cho nội dung nên phải tự lắng nghe đổi tab để rebuild.
    // Đổi ngay khi bấm (không đợi hết animation trượt của indicator) để nội dung phản hồi tức thì.
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _initService();
    _loadPinStatus();
  }

  @override
  void dispose() {
    _tabController.dispose();
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
    showDialog(
      context: context,
      builder: (_) => PartnerPinWizard(
        service: _securityService,
        token: token,
        onSuccess: () {
          showDoctorNotice(context, _pinConfigured ? 'Withdrawal PIN updated.' : 'Withdrawal PIN configured.');
          _loadPinStatus();
        },
      ),
    );
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
    final maxAmount = (_balance!.pendingBalance - 10).clamp(0, double.infinity).toDouble();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DoctorWithdrawSheet(walletService: _walletService!, maxAmount: maxAmount, onSuccess: _loadData),
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
                            child: Column(children: [_buildBalanceCard(), const SizedBox(height: 20), _buildSecurityCard(), const SizedBox(height: 20), _buildTabs()]),
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
            Text('Available Balance', style: TextStyle(fontSize: 14, color: DS.primaryForeground.withOpacity(0.8))),
          ]),
          const SizedBox(height: 4),
          Text(_formatCurrency(_balance?.pendingBalance ?? 0), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: DS.primaryForeground)),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Total Earnings', style: TextStyle(fontSize: 12, color: DS.primaryForeground.withOpacity(0.8))),
                const SizedBox(height: 2),
                Text(_formatCurrency(_balance?.totalEarnings ?? 0), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.primaryForeground)),
              ]),
            )),
            const SizedBox(width: 12),
            Expanded(child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Status', style: TextStyle(fontSize: 12, color: DS.primaryForeground.withOpacity(0.8))),
                const SizedBox(height: 2),
                Text(
                  (_balance?.canWithdraw ?? false) ? 'Withdrawals Ready' : 'On Hold',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: DS.primaryForeground),
                ),
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

  Widget _buildSecurityCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(10)),
            child: Icon(
              _pinConfigured ? Icons.lock_outline : Icons.lock_open_outlined,
              size: 20,
              color: _pinConfigured ? DS.emerald600 : DS.mutedForeground,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Withdrawal PIN', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground)),
                const SizedBox(height: 2),
                Text(
                  _pinLocked
                      ? 'Temporarily locked after too many attempts'
                      : _pinConfigured
                          ? 'Configured — required for every withdrawal'
                          : 'Optional. Once configured, every withdrawal requires it.',
                  style: TextStyle(fontSize: 12, color: _pinLocked ? DS.rose600 : DS.mutedForeground),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _loadingPinStatus
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary))
              : TextButton(
                  onPressed: _openPinWizard,
                  child: Text(_pinConfigured ? 'Update' : 'Set up'),
                ),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    // Màu/style khai báo thẳng ở đây (không lấy qua DS.* trong doctor_theme.dart) để chỉnh trực tiếp tại chỗ.
    const Color tabBarBackground = Color(0x44C6C6C6); // = DS.secondary
    const Color tabIndicatorBackground = Color(0xB239E3D1); // = DS.card
    const Color tabLabelColor = Color(0xFF111827); // = DS.foreground
    const Color tabUnselectedLabelColor = Color(0xFF30343C); // = DS.mutedForeground
    const Color tabIndicatorShadowColor = Color(0xFF705959); // Colors.black @ 5% opacity
    const double tabBarContainerRadius = 8;
    const double tabIndicatorRadius = 6;
    const EdgeInsets tabIndicatorPadding = EdgeInsets.symmetric(horizontal: -18, vertical: 4);
    const TextStyle tabLabelStyle = TextStyle(fontSize: 15, fontWeight: FontWeight.w800);

    return Column(children: [
      Container(
        decoration: BoxDecoration(color: tabBarBackground, borderRadius: BorderRadius.circular(tabBarContainerRadius)),
        child: TabBar(
          controller: _tabController,
          indicator: BoxDecoration(
            color: tabIndicatorBackground,
            borderRadius: BorderRadius.circular(tabIndicatorRadius),
            boxShadow: const [BoxShadow(color: tabIndicatorShadowColor, blurRadius: 4, offset: Offset(0, 1))],
          ),
          indicatorPadding: tabIndicatorPadding,
          labelColor: tabLabelColor,
          unselectedLabelColor: tabUnselectedLabelColor,
          labelStyle: tabLabelStyle,
          dividerColor: Colors.transparent,
          tabs: const [Tab(text: 'Transactions'), Tab(text: 'Withdrawals')],
        ),
      ),
      const SizedBox(height: 16),
      // Không dùng TabBarView/PageView (luôn ép chiều cao cố định, gây khoảng trống thừa
      // khi list ngắn hơn khung). Hiện trực tiếp đúng list của tab đang chọn để tự co theo nội dung thật.
      _tabController.index == 0 ? _buildTransactionsList() : _buildSettlementsList(),
    ]);
  }

  Widget _buildTransactionsList() {
    if (_transactions.isEmpty) return const DoctorEmptyState(icon: Icons.receipt_long_outlined, title: 'No transactions yet', subtitle: 'Your consultation earnings will appear here.');
    return ListView.separated(
      padding: EdgeInsets.zero, // list lồng trong SingleChildScrollView — không để tự cộng thêm MediaQuery.padding.top (đã do DoctorBackHeader xử lý)
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
      padding: EdgeInsets.zero, // list lồng trong SingleChildScrollView — không để tự cộng thêm MediaQuery.padding.top (đã do DoctorBackHeader xử lý)
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
