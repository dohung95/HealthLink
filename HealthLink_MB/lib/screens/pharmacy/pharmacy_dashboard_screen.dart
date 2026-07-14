import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/pharmacy/pharmacy_order.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';
import '../../providers/pharmacy/pharmacy_order_provider.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';
import '../../providers/pharmacy/pharmacy_revenue_provider.dart';
import '../../utils/pharmacy/pharmacy_overview_metrics.dart';
import '../../utils/pharmacy/pharmacy_workflow.dart';
import '../../widgets/pharmacy/pharmacy_revenue_card.dart';

class PharmacyDashboardScreen extends StatefulWidget {
  final void Function(int tabIndex)? onNavigate;

  const PharmacyDashboardScreen({super.key, this.onNavigate});

  @override
  State<PharmacyDashboardScreen> createState() =>
      _PharmacyDashboardScreenState();
}

class _PharmacyDashboardScreenState extends State<PharmacyDashboardScreen> {
  String? _pharmacyName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final pharmacy = context.read<AuthProvider>().pharmacyProfile;
      _pharmacyName = pharmacy?['name']?.toString() ?? 'Pharmacy';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workflow = context.watch<PharmacyWorkflowProvider>();
    final orderProvider = context.watch<PharmacyOrderProvider>();
    final inventory = context.watch<PharmacyInventoryProvider>();
    final items = workflow.workItems;
    final isLoading = workflow.isLoading;
    final error = workflow.error;
    final orders = orderProvider.orders;
    final invItems = inventory.items;

    final activeOrders = PharmacyOverviewMetrics.activeOrdersCount(orders);
    final pendingReqs = PharmacyOverviewMetrics.attentionRequestsCount(items);
    final riskTotal = PharmacyOverviewMetrics.inventoryRiskTotal(invItems);
    final rate = PharmacyOverviewMetrics.completionRate(orders);
    final revenue = PharmacyOverviewMetrics.revenueTotal(orders);
    final queue = PharmacyOverviewMetrics.workflowQueue(items);
    final insights = PharmacyOverviewMetrics.operationalInsights(
      orders: orders,
      workItems: items,
      inventoryItems: invItems,
    );

    if (error != null && items.isEmpty && orders.isEmpty) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline,
                  size: 48, color: theme.colorScheme.error),
              const SizedBox(height: 12),
              Text(error,
                  style: TextStyle(color: theme.colorScheme.error)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          final auth = context.read<AuthProvider>();
          if (auth.accessToken != null) {
            final pharmacyId =
                auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
            await Future.wait([
              workflow.refresh(auth.accessToken!, pharmacyId),
              context.read<PharmacyRevenueProvider>().refresh(
                    token: auth.accessToken!,
                    pharmacyId: pharmacyId,
                  ),
            ]);
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, $_pharmacyName',
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              Text(
                DateFormat('EEEE, dd MMMM yyyy').format(DateTime.now()),
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              _buildMetricsGrid(theme, activeOrders, pendingReqs, riskTotal,
                  rate, revenue),
              const SizedBox(height: 20),
              const PharmacyRevenueCard(),
              const SizedBox(height: 20),
              _buildWorkflowQueue(theme, queue),
              const SizedBox(height: 20),
              _buildInsights(theme, insights),
              if (isLoading && items.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 24),
                  child: Center(child: CircularProgressIndicator()),
                ),
              const SizedBox(height: 20),
              Text('RECENT ITEMS',
                  style: theme.textTheme.labelLarge
                      ?.copyWith(color: theme.colorScheme.primary)),
              const SizedBox(height: 8),
              ...items.take(5).map(
                  (item) => _workItemCard(theme, item)),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricsGrid(ThemeData theme, int activeOrders,
      int pendingReqs, int riskTotal, double rate, double revenue) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _metricCard(
                theme,
                'Active Orders',
                activeOrders.toString(),
                Icons.receipt_long,
                Colors.orange,
                onTap: activeOrders > 0
                    ? () => widget.onNavigate?.call(2)
                    : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _metricCard(
                theme,
                'Attention Requests',
                pendingReqs.toString(),
                Icons.assignment,
                Colors.blue,
                onTap: pendingReqs > 0
                    ? () => widget.onNavigate?.call(1)
                    : null,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _metricCard(
                theme,
                'Inventory Risk',
                riskTotal.toString(),
                Icons.inventory,
                Colors.red,
                onTap: riskTotal > 0
                    ? () => widget.onNavigate?.call(3)
                    : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _metricCard(
                theme,
                'Completion',
                '${(rate * 100).toStringAsFixed(0)}%',
                Icons.check_circle,
                Colors.green,
                onTap: () => widget.onNavigate?.call(2),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _metricCard(
                theme,
                'Revenue',
                '\$${revenue.toStringAsFixed(0)}',
                Icons.trending_up,
                Colors.teal,
                onTap: revenue > 0
                    ? () => widget.onNavigate?.call(4)
                    : null,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _metricCard(ThemeData theme, String title, String value,
      IconData icon, Color color,
      {VoidCallback? onTap}) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: color, size: 20),
                  if (onTap != null) ...[
                    const Spacer(),
                    Icon(Icons.chevron_right, size: 16, color: color),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Text(value,
                  style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold, color: color)),
              const SizedBox(height: 2),
              Text(title,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWorkflowQueue(
      ThemeData theme, List<PharmacyWorkItem> queue) {
    if (queue.isEmpty) return const SizedBox.shrink();

    final byStage = <String, int>{};
    for (final item in queue.take(10)) {
      byStage.update(
        item.workflowStage.isNotEmpty
            ? item.workflowStage
            : (item.orderStatus ?? item.requestStatus ?? 'UNKNOWN'),
        (v) => v + 1,
        ifAbsent: () => 1,
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Workflow Queue',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...byStage.entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Chip(
                        label: Text(
                          '${e.value}',
                          style: const TextStyle(fontSize: 12),
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        PharmacyWorkflow.workflowLabel(e.key),
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildInsights(ThemeData theme, List<String> insights) {
    if (insights.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Operational Insights',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...insights.map((insight) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ',
                          style: theme.textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.bold)),
                      Expanded(
                        child: Text(insight,
                            style: theme.textTheme.bodySmall),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _workItemCard(ThemeData theme, dynamic item) {
    final sourceType = item.sourceType?.value ?? '';
    final patientName = item.patientName ?? 'Unknown';
    final stage = item.workflowStage ?? '';
    final sourceIcon = sourceType == 'CONSULTATION'
        ? Icons.assignment
        : Icons.receipt_long;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        leading: CircleAvatar(child: Icon(sourceIcon, size: 18)),
        title: Text(patientName,
            style: theme.textTheme.bodyMedium
                ?.copyWith(fontWeight: FontWeight.w500)),
        subtitle: Text('$sourceType  •  $stage',
            style: theme.textTheme.bodySmall),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
