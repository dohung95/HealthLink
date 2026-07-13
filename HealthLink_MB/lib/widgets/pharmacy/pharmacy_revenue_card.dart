import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/pharmacy/pharmacy_revenue_series.dart';
import '../../providers/pharmacy/pharmacy_revenue_provider.dart';
import '../../providers/auth_provider.dart';

/// Compact revenue card showing NET REVENUE with a Week/Month/Year bar chart.
///
/// Uses the existing [PharmacyRevenueProvider] for data and selection actions.
class PharmacyRevenueCard extends StatelessWidget {
  const PharmacyRevenueCard({super.key});

  static const double _maxBarHeight = 40;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<PharmacyRevenueProvider>();

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(theme, provider),
            const SizedBox(height: 4),
            _buildSegmentedControl(theme, provider),
            if (provider.range != PharmacyRevenueRange.week) ...[
              const SizedBox(height: 2),
              _buildPeriodSelector(theme, provider),
            ],
            const SizedBox(height: 2),
            _buildBarChart(theme, provider),
            _buildFooter(context, theme, provider),
          ],
        ),
      ),
    );
  }

  // ── Header ─────────────────────────────────────────────────────────

  Widget _buildHeader(ThemeData theme, PharmacyRevenueProvider provider) {
    final series = provider.series;

    if (!provider.hasData && !provider.loading && provider.error == null) {
      return Text('No revenue data',
          style: theme.textTheme.bodySmall
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant));
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('NET REVENUE',
                  style: theme.textTheme.labelSmall
                      ?.copyWith(fontWeight: FontWeight.w700, fontSize: 10)),
              Text(
                NumberFormat.currency(symbol: '\$', decimalDigits: 2)
                    .format(series.total),
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              if (series.transactionCount > 0)
                Text(
                  '${series.transactionCount} transaction${series.transactionCount == 1 ? '' : 's'}',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(fontSize: 10, color: theme.colorScheme.onSurfaceVariant),
                ),
            ],
          ),
        ),
        if (series.isNewRevenue)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text('NEW',
                style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: Colors.green.shade700)),
          )
        else if (series.growthPercent != null)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                series.growthPercent! >= 0
                    ? Icons.trending_up
                    : Icons.trending_down,
                size: 14,
                color: series.growthPercent! >= 0
                    ? Colors.green.shade600
                    : Colors.red.shade600,
              ),
              const SizedBox(width: 1),
              Text(
                '${series.growthPercent! >= 0 ? '+' : ''}${series.growthPercent!.toStringAsFixed(1)}%',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: series.growthPercent! >= 0
                      ? Colors.green.shade600
                      : Colors.red.shade600,
                ),
              ),
            ],
          ),
      ],
    );
  }

  // ── Segmented Control ──────────────────────────────────────────────

  Widget _buildSegmentedControl(
      ThemeData theme, PharmacyRevenueProvider provider) {
    return SizedBox(
      height: 24,
      child: Row(
        children: [
          _segmentBtn(theme, 'Week', PharmacyRevenueRange.week, provider),
          const SizedBox(width: 3),
          _segmentBtn(theme, 'Month', PharmacyRevenueRange.month, provider),
          const SizedBox(width: 3),
          _segmentBtn(theme, 'Year', PharmacyRevenueRange.year, provider),
        ],
      ),
    );
  }

  Widget _segmentBtn(ThemeData theme, String label,
      PharmacyRevenueRange value, PharmacyRevenueProvider provider) {
    final selected = provider.range == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => provider.selectRange(value),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected
                ? theme.colorScheme.primary.withOpacity(0.1)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(5),
            border: Border.all(
              color: selected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.outlineVariant,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }

  // ── Period Selector ────────────────────────────────────────────────

  Widget _buildPeriodSelector(
      ThemeData theme, PharmacyRevenueProvider provider) {
    if (provider.range == PharmacyRevenueRange.month) {
      return SizedBox(
        height: 20,
        child: Row(
          children: [
            _periodBtn(theme, Icons.chevron_left, () {
              final newM = provider.selectedMonth == 1
                  ? 12
                  : provider.selectedMonth - 1;
              final newY = provider.selectedMonth == 1
                  ? provider.selectedYear - 1
                  : provider.selectedYear;
              provider.selectMonth(newM, newY);
            }),
            Expanded(
              child: Text(
                '${_monthName(provider.selectedMonth)} ${provider.selectedYear}',
                textAlign: TextAlign.center,
                style: theme.textTheme.labelSmall
                    ?.copyWith(fontWeight: FontWeight.w600, fontSize: 10),
              ),
            ),
            _periodBtn(theme, Icons.chevron_right, () {
              final newM = provider.selectedMonth == 12
                  ? 1
                  : provider.selectedMonth + 1;
              final newY = provider.selectedMonth == 12
                  ? provider.selectedYear + 1
                  : provider.selectedYear;
              provider.selectMonth(newM, newY);
            }),
          ],
        ),
      );
    }

    return SizedBox(
      height: 20,
      child: Row(
        children: [
          _periodBtn(theme, Icons.chevron_left, () {
            provider.selectYear(provider.selectedYear - 1);
          }),
          Expanded(
            child: Text(
              '${provider.selectedYear}',
              textAlign: TextAlign.center,
              style: theme.textTheme.labelSmall
                  ?.copyWith(fontWeight: FontWeight.w600, fontSize: 10),
            ),
          ),
          _periodBtn(theme, Icons.chevron_right, () {
            provider.selectYear(provider.selectedYear + 1);
          }),
        ],
      ),
    );
  }

  Widget _periodBtn(ThemeData theme, IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(1),
        child: Icon(icon, size: 14),
      ),
    );
  }

  // ── Bar Chart ──────────────────────────────────────────────────────

  Widget _buildBarChart(ThemeData theme, PharmacyRevenueProvider provider) {
    final series = provider.series;
    if (series.buckets.isEmpty) return const SizedBox.shrink();

    final numericAmounts = series.buckets
        .where((b) => b.amount != null)
        .map((b) => b.amount!)
        .toList();
    final maxVal =
        numericAmounts.isEmpty ? 0.0 : numericAmounts.reduce((a, b) => a > b ? a : b);
    final allZero = numericAmounts.isEmpty || numericAmounts.every((v) => v == 0);

    return SizedBox(
      height: _maxBarHeight + 10,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: series.buckets.map((bucket) {
          final ratio =
              (maxVal > 0 && bucket.amount != null) ? bucket.amount! / maxVal : 0.0;
          final barHeight = ratio * _maxBarHeight;

          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (bucket.amount != null && !allZero)
                    Text(
                      NumberFormat.compact().format(bucket.amount),
                      style: theme.textTheme.labelSmall
                          ?.copyWith(fontSize: 7, fontWeight: FontWeight.w600),
                    ),
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: bucket.amount != null && !allZero
                          ? Container(
                              width: 10,
                              height: barHeight.clamp(2, _maxBarHeight),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primary,
                                borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(2)),
                              ),
                            )
                          : bucket.amount != null
                              ? Container(
                                  width: 10,
                                  height: 2,
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.outlineVariant,
                                    borderRadius: BorderRadius.circular(1),
                                  ),
                                )
                              : const SizedBox.shrink(),
                    ),
                  ),
                  Text(
                    bucket.label,
                    style: theme.textTheme.labelSmall?.copyWith(fontSize: 7),
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Footer ─────────────────────────────────────────────────────────

  Widget _buildFooter(BuildContext ctx, ThemeData theme, PharmacyRevenueProvider provider) {
    if (provider.loading && !provider.hasData) {
      return const SizedBox(
        height: 10,
        child: Center(child: SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 2))),
      );
    }

    if (provider.error != null) {
      return Row(
        children: [
          Expanded(
            child: Text(
              provider.error!,
              style: TextStyle(fontSize: 9, color: theme.colorScheme.error),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: () {
              final auth = ctx.read<AuthProvider>();
              if (auth.accessToken != null) {
                final pharmacyId = auth.pharmacyProfile?['pharmacyId']
                        ?.toString() ??
                    auth.userId!;
                provider.refresh(
                    token: auth.accessToken!, pharmacyId: pharmacyId);
              }
            },
            child: Text('Retry',
                style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary)),
          ),
        ],
      );
    }

    if (provider.updatedAt != null) {
      return Text(
        'Updated ${_timeAgo(provider.updatedAt!)}',
        style: theme.textTheme.labelSmall
            ?.copyWith(fontSize: 8, color: theme.colorScheme.onSurfaceVariant),
      );
    }

    return const SizedBox.shrink();
  }

  // ── Helpers ────────────────────────────────────────────────────────

  static String _monthName(int m) {
    const names = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return names[m - 1];
  }

  static String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
