import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/doctor_theme.dart';
import '../../providers/auth_provider.dart';
import '../../models/doctor/wallet_balance.dart';
import '../../models/doctor/commission_transaction.dart';
import '../../models/doctor/settlement.dart';
import '../../services/doctor/doctor_wallet_service.dart';
import 'doctor_withdraw_sheet.dart';

/// Main wallet screen cho Doctor
/// Hiển thị balance, transactions, và withdrawals
class DoctorWalletScreen extends StatefulWidget {
  const DoctorWalletScreen({
    super.key,
    required this.doctorId,
  });

  final String doctorId;

  @override
  State<DoctorWalletScreen> createState() => _DoctorWalletScreenState();
}

class _DoctorWalletScreenState extends State<DoctorWalletScreen>
    with SingleTickerProviderStateMixin {
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
      _walletService = DoctorWalletService(
        accessToken: token,
        doctorId: widget.doctorId,
      );
      _loadData();
    } else {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadData() async {
    if (_walletService == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

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
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  void _showWithdrawSheet() {
    if (_walletService == null || _balance == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DoctorWithdrawSheet(
        walletService: _walletService!,
        maxAmount: _balance!.eligibleForWithdrawal,
        onSuccess: _loadData,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.doctorColors;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet & Earnings'),
        backgroundColor: colors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: colors.primary))
          : _error != null
              ? _buildErrorWidget(colors)
              : RefreshIndicator(
                  onRefresh: _loadData,
                  color: colors.primary,
                  child: CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Column(
                          children: [
                            _buildBalanceCard(colors),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                      SliverPersistentHeader(
                        pinned: true,
                        delegate: _TabBarDelegate(
                          tabController: _tabController,
                          colors: colors,
                        ),
                      ),
                      SliverFillRemaining(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildTransactionsList(colors),
                            _buildSettlementsList(colors),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildErrorWidget(DoctorColors colors) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: colors.error),
            const SizedBox(height: 16),
            Text(
              'Failed to load wallet',
              style: TextStyle(fontSize: 18, color: colors.onSurfaceVariant),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colors.onSurfaceVariant.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCard(DoctorColors colors) {
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.primary,
            colors.primary.withOpacity(0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.account_balance_wallet,
                color: Colors.white,
                size: 28,
              ),
              const SizedBox(width: 12),
              const Text(
                'Your Earnings',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Main balance
          Text(
            currencyFormat.format(_balance?.totalBalance ?? 0),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          // Breakdown
          Row(
            children: [
              Expanded(
                child: _buildBalanceItem(
                  'Available',
                  currencyFormat.format(_balance?.eligibleForWithdrawal ?? 0),
                  Icons.check_circle_outline,
                ),
              ),
              Container(
                width: 1,
                height: 40,
                color: Colors.white24,
              ),
              Expanded(
                child: _buildBalanceItem(
                  'Pending',
                  currencyFormat.format(_balance?.pendingBalance ?? 0),
                  Icons.schedule,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Withdraw button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: (_balance?.canWithdraw ?? false) ? _showWithdrawSheet : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: colors.primary,
                disabledBackgroundColor: Colors.white38,
                disabledForegroundColor: Colors.white70,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.payments_outlined),
              label: Text(
                (_balance?.canWithdraw ?? false) ? 'Withdraw Funds' : 'No Funds Available',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildTransactionsList(DoctorColors colors) {
    if (_transactions.isEmpty) {
      return _buildEmptyState(
        colors,
        icon: Icons.receipt_long_outlined,
        title: 'No Transactions Yet',
        subtitle: 'Your earnings from consultations will appear here',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final tx = _transactions[index];
        return _TransactionCard(transaction: tx, colors: colors);
      },
    );
  }

  Widget _buildSettlementsList(DoctorColors colors) {
    if (_settlements.isEmpty) {
      return _buildEmptyState(
        colors,
        icon: Icons.payments_outlined,
        title: 'No Withdrawals Yet',
        subtitle: 'Your withdrawal history will appear here',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _settlements.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final settlement = _settlements[index];
        return _SettlementCard(settlement: settlement, colors: colors);
      },
    );
  }

  Widget _buildEmptyState(
    DoctorColors colors, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 64,
              color: colors.onSurfaceVariant.withOpacity(0.4),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: colors.onSurfaceVariant.withOpacity(0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate({
    required this.tabController,
    required this.colors,
  });

  final TabController tabController;
  final DoctorColors colors;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: TabBar(
        controller: tabController,
        labelColor: colors.primary,
        unselectedLabelColor: colors.onSurfaceVariant,
        indicatorColor: colors.primary,
        tabs: const [
          Tab(text: 'Transactions', icon: Icon(Icons.receipt_long_outlined)),
          Tab(text: 'Withdrawals', icon: Icon(Icons.payments_outlined)),
        ],
      ),
    );
  }

  @override
  double get maxExtent => 72;

  @override
  double get minExtent => 72;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) =>
      false;
}

class _TransactionCard extends StatelessWidget {
  const _TransactionCard({
    required this.transaction,
    required this.colors,
  });

  final CommissionTransaction transaction;
  final DoctorColors colors;

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');

    Color statusColor;
    switch (transaction.status) {
      case 'COMPLETED':
      case 'ELIGIBLE':
        statusColor = colors.success;
        break;
      case 'PENDING':
        statusColor = colors.warning;
        break;
      case 'WITHDRAWN':
        statusColor = colors.info;
        break;
      default:
        statusColor = colors.statusDefault;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: colors.cardShadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: colors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.person_outline,
                  color: colors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      transaction.patientName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      transaction.displayType,
                      style: TextStyle(
                        color: colors.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '+${currencyFormat.format(transaction.netAmount)}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: colors.money,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      transaction.displayStatus,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: colors.surfaceContainer,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildDetailItem('Gross', currencyFormat.format(transaction.grossAmount)),
                _buildDetailItem('Commission', '-${transaction.commissionRatePercent}'),
                _buildDetailItem('Net', currencyFormat.format(transaction.netAmount)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            dateFormat.format(transaction.createdAt),
            style: TextStyle(
              color: colors.onSurfaceVariant.withOpacity(0.7),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            color: colors.onSurfaceVariant,
            fontSize: 11,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

class _SettlementCard extends StatelessWidget {
  const _SettlementCard({
    required this.settlement,
    required this.colors,
  });

  final Settlement settlement;
  final DoctorColors colors;

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');

    Color statusColor;
    IconData statusIcon;
    switch (settlement.status) {
      case 'COMPLETED':
        statusColor = colors.success;
        statusIcon = Icons.check_circle;
        break;
      case 'PENDING':
        statusColor = colors.warning;
        statusIcon = Icons.schedule;
        break;
      case 'PROCESSING':
        statusColor = colors.info;
        statusIcon = Icons.sync;
        break;
      case 'REJECTED':
      case 'CANCELLED':
        statusColor = colors.error;
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = colors.statusDefault;
        statusIcon = Icons.help_outline;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: colors.cardShadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(statusIcon, color: statusColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Withdrawal Request',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    if (settlement.paypalEmail != null)
                      Text(
                        settlement.paypalEmail!,
                        style: TextStyle(
                          color: colors.onSurfaceVariant,
                          fontSize: 13,
                        ),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    currencyFormat.format(settlement.amount),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: settlement.isCompleted ? colors.success : colors.onSurface,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      settlement.displayStatus,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.access_time, size: 14, color: colors.onSurfaceVariant),
              const SizedBox(width: 4),
              Text(
                dateFormat.format(settlement.createdAt),
                style: TextStyle(
                  color: colors.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
              if (settlement.processedAt != null) ...[
                const SizedBox(width: 16),
                Icon(Icons.check, size: 14, color: colors.success),
                const SizedBox(width: 4),
                Text(
                  'Processed: ${dateFormat.format(settlement.processedAt!)}',
                  style: TextStyle(
                    color: colors.success,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
          if (settlement.notes != null && settlement.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Note: ${settlement.notes}',
              style: TextStyle(
                color: colors.onSurfaceVariant,
                fontSize: 13,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          if (settlement.adminNotes != null && settlement.adminNotes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: settlement.isFailed ? colors.errorBg : colors.infoBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    settlement.isFailed ? Icons.error_outline : Icons.info_outline,
                    size: 16,
                    color: settlement.isFailed ? colors.error : colors.info,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      settlement.adminNotes!,
                      style: TextStyle(
                        color: settlement.isFailed ? colors.error : colors.info,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
