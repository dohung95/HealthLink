import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/pharmacy/pharmacy_revenue_series.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_revenue_provider.dart';

class PharmacyRevenueCard extends StatelessWidget {
  const PharmacyRevenueCard({super.key});

  static const double _chartHeight = 160;
  static const double _minimumCardHeight = 240;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<PharmacyRevenueProvider>();

    return Card(
      margin: EdgeInsets.zero,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: _minimumCardHeight),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final growth = _buildGrowth(theme, provider);
              final ranges = _buildRangeControl(theme, provider);
              final header = constraints.maxWidth < 340
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [growth, const SizedBox(height: 8), ranges],
                    )
                  : Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: growth),
                        const SizedBox(width: 8),
                        ranges,
                      ],
                    );

              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  header,
                  if (provider.range != PharmacyRevenueRange.week) ...[
                    const SizedBox(height: 4),
                    _buildPeriodSelector(theme, provider),
                  ],
                  const SizedBox(height: 8),
                  _buildBarChart(theme, provider),
                  const SizedBox(height: 4),
                  _buildFooter(context, theme, provider),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildGrowth(ThemeData theme, PharmacyRevenueProvider provider) {
    final series = provider.series;
    final comparison = 'vs previous ${provider.range.name}';
    final positive = series.growthPercent != null && series.growthPercent! >= 0;
    final color = positive ? Colors.green.shade700 : Colors.red.shade700;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (series.isNewRevenue)
          Text(
            'NEW',
            style: theme.textTheme.labelLarge?.copyWith(
              color: Colors.green.shade700,
              fontWeight: FontWeight.w700,
            ),
          )
        else if (series.growthPercent != null)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                positive ? Icons.trending_up : Icons.trending_down,
                size: 18,
                color: color,
              ),
              const SizedBox(width: 4),
              Text(
                '${positive ? '+' : ''}${series.growthPercent!.toStringAsFixed(1)}%',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          )
        else
          Text(
            'No previous comparison',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        const SizedBox(height: 2),
        Text(
          comparison,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildRangeControl(ThemeData theme, PharmacyRevenueProvider provider) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _rangeButton(theme, 'Week', PharmacyRevenueRange.week, provider),
        const SizedBox(width: 4),
        _rangeButton(theme, 'Month', PharmacyRevenueRange.month, provider),
        const SizedBox(width: 4),
        _rangeButton(theme, 'Year', PharmacyRevenueRange.year, provider),
      ],
    );
  }

  Widget _rangeButton(
    ThemeData theme,
    String label,
    PharmacyRevenueRange range,
    PharmacyRevenueProvider provider,
  ) {
    final selected = provider.range == range;
    return Material(
      color: selected
          ? theme.colorScheme.primary.withOpacity(0.10)
          : Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(6),
        side: BorderSide(
          color: selected
              ? theme.colorScheme.primary
              : theme.colorScheme.outlineVariant,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: () => provider.selectRange(range),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          child: Center(
            child: Text(
              label,
              style: theme.textTheme.labelMedium?.copyWith(
                color: selected
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurfaceVariant,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPeriodSelector(
    ThemeData theme,
    PharmacyRevenueProvider provider,
  ) {
    final isMonth = provider.range == PharmacyRevenueRange.month;
    final label = isMonth
        ? '${_monthName(provider.selectedMonth)} ${provider.selectedYear}'
        : '${provider.selectedYear}';

    return SizedBox(
      height: 44,
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            tooltip: isMonth ? 'Previous month' : 'Previous year',
            onPressed: () => _selectPreviousPeriod(provider),
          ),
          Expanded(
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            tooltip: isMonth ? 'Next month' : 'Next year',
            onPressed: () => _selectNextPeriod(provider),
          ),
        ],
      ),
    );
  }

  void _selectPreviousPeriod(PharmacyRevenueProvider provider) {
    if (provider.range == PharmacyRevenueRange.month) {
      final month = provider.selectedMonth == 1
          ? 12
          : provider.selectedMonth - 1;
      final year = provider.selectedMonth == 1
          ? provider.selectedYear - 1
          : provider.selectedYear;
      provider.selectMonth(month, year);
      return;
    }
    provider.selectYear(provider.selectedYear - 1);
  }

  void _selectNextPeriod(PharmacyRevenueProvider provider) {
    if (provider.range == PharmacyRevenueRange.month) {
      final month = provider.selectedMonth == 12
          ? 1
          : provider.selectedMonth + 1;
      final year = provider.selectedMonth == 12
          ? provider.selectedYear + 1
          : provider.selectedYear;
      provider.selectMonth(month, year);
      return;
    }
    provider.selectYear(provider.selectedYear + 1);
  }

  Widget _buildBarChart(ThemeData theme, PharmacyRevenueProvider provider) {
    final series = provider.series;
    if (provider.loading && !provider.hasData) {
      return const SizedBox(
        key: ValueKey('pharmacy-revenue-chart'),
        height: _chartHeight,
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (!provider.hasData && provider.error == null) {
      return SizedBox(
        key: const ValueKey('pharmacy-revenue-chart'),
        height: _chartHeight,
        child: Center(
          child: Text(
            'No revenue in this period',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }

    final amounts = series.buckets
        .where((bucket) => bucket.amount != null)
        .map((bucket) => bucket.amount!)
        .toList();
    final maximum = amounts.isEmpty
        ? 0.0
        : amounts.reduce((a, b) => a > b ? a : b);

    return SizedBox(
      key: const ValueKey('pharmacy-revenue-chart'),
      height: _chartHeight,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: series.buckets
            .map((bucket) => _buildBucket(theme, bucket, maximum))
            .toList(),
      ),
    );
  }

  Widget _buildBucket(
    ThemeData theme,
    PharmacyRevenueBucket bucket,
    double maximum,
  ) {
    final hasBar = bucket.amount != null;
    final ratio = hasBar && maximum > 0 ? bucket.amount! / maximum : 0.0;
    final barHeight = maximum == 0 ? 3.0 : (ratio * 126).clamp(4.0, 126.0);
    final amountLabel = hasBar
        ? NumberFormat.currency(
            symbol: '\$',
            decimalDigits: 2,
          ).format(bucket.amount)
        : null;
    final transactionLabel = bucket.transactionCount == 1
        ? '1 transaction'
        : '${bucket.transactionCount} transactions';
    final tooltipMessage = hasBar
        ? '${bucket.label}\n$amountLabel | $transactionLabel'
        : null;
    final bar = hasBar
        ? Container(
            width: 14,
            height: barHeight,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(3),
              ),
            ),
          )
        : const SizedBox.shrink();

    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Column(
          children: [
            Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: hasBar
                    ? Semantics(
                        container: true,
                        button: true,
                        label: tooltipMessage,
                        excludeSemantics: true,
                        child: Tooltip(
                          message: tooltipMessage,
                          triggerMode: TooltipTriggerMode.tap,
                          child: bar,
                        ),
                      )
                    : bar,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              bucket.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter(
    BuildContext context,
    ThemeData theme,
    PharmacyRevenueProvider provider,
  ) {
    if (provider.error != null) {
      return Row(
        children: [
          Expanded(
            child: Text(
              provider.error!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              final auth = context.read<AuthProvider>();
              final token = auth.accessToken;
              if (token == null) return;
              final pharmacyId =
                  auth.pharmacyProfile?['pharmacyId']?.toString() ??
                  auth.userId;
              if (pharmacyId == null) return;
              provider.refresh(token: token, pharmacyId: pharmacyId);
            },
            style: TextButton.styleFrom(
              minimumSize: const Size(44, 32),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              visualDensity: VisualDensity.compact,
            ),
            child: const Text('Retry'),
          ),
        ],
      );
    }

    if (provider.updatedAt != null) {
      return Text(
        'Updated ${_timeAgo(provider.updatedAt!)}',
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      );
    }

    return const SizedBox(height: 0);
  }

  static String _monthName(int month) {
    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return names[month - 1];
  }

  static String _timeAgo(DateTime value) {
    final difference = DateTime.now().difference(value);
    if (difference.inSeconds < 60) return 'just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    return '${difference.inDays}d ago';
  }
}
