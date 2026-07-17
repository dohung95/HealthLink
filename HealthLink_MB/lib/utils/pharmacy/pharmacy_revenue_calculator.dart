import '../../models/partner/partner_wallet_models.dart';
import '../../models/pharmacy/pharmacy_revenue_series.dart';

/// Pure functions for aggregating commission transactions into revenue series.
///
/// All timestamps are normalized to local calendar boundaries using
/// `DateTime(year, month, day)` before comparison. The calculator
/// never mutates its inputs.
class PharmacyRevenueCalculator {
  PharmacyRevenueCalculator._();

  /// Build a complete [PharmacyRevenueSeries] from [transactions].
  ///
  /// [now] is the reference "current" date-time. In tests this is controlled;
  /// in production it should be `DateTime.now()`.
  static PharmacyRevenueSeries build({
    required List<PartnerTransaction> transactions,
    required PharmacyRevenueRange range,
    required DateTime now,
  }) {
    final eligible = transactions
        .where((t) => t.status.toUpperCase() != 'REFUNDED')
        .toList();

    switch (range) {
      case PharmacyRevenueRange.week:
        return _buildWeek(eligible, now);
      case PharmacyRevenueRange.month:
        return _buildMonth(eligible, now);
      case PharmacyRevenueRange.year:
        return _buildYear(eligible, now);
    }
  }

  /// ── Week: last 7 days ─────────────────────────────────────────────────

  static PharmacyRevenueSeries _buildWeek(
    List<PartnerTransaction> eligible,
    DateTime now,
  ) {
    final today = DateTime(now.year, now.month, now.day);

    final weekStart = today.subtract(const Duration(days: 6));
    final buckets = <PharmacyRevenueBucket>[];

    for (int i = 0; i < 7; i++) {
      final day = weekStart.add(Duration(days: i));
      final isFutureDay = day.isAfter(today);
      final dayTransactions = eligible.where((t) {
        final txDate = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
        return txDate == day;
      }).toList();

      buckets.add(PharmacyRevenueBucket(
        label: _shortDate(day),
        start: day,
        end: day,
        amount: isFutureDay ? null : _sumNet(dayTransactions),
        transactionCount: isFutureDay ? 0 : dayTransactions.length,
      ));
    }

    final total = _sumNonNull(buckets);

    // Previous week: 7 days ending at weekStart - 1
    final prevEnd = weekStart.subtract(const Duration(days: 1));
    final prevStart = prevEnd.subtract(const Duration(days: 6));
    final previousTotal = _sumNet(eligible.where((t) {
      final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      return !d.isBefore(prevStart) && !d.isAfter(prevEnd);
    }).toList());

    return PharmacyRevenueSeries(
      range: PharmacyRevenueRange.week,
      buckets: buckets,
      total: total,
      previousTotal: previousTotal,
      transactionCount: _countInRange(eligible, weekStart, today),
    );
  }

  /// ── Month: last 30 days ───────────────────────────────────────────────

  static PharmacyRevenueSeries _buildMonth(
    List<PartnerTransaction> eligible,
    DateTime now,
  ) {
    final today = DateTime(now.year, now.month, now.day);

    final start = today.subtract(const Duration(days: 29));
    final buckets = <PharmacyRevenueBucket>[];

    for (int i = 0; i < 30; i++) {
      final day = start.add(Duration(days: i));
      final isFutureDay = day.isAfter(today);
      final dayTransactions = eligible.where((t) {
        final txDate = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
        return txDate == day;
      }).toList();

      buckets.add(PharmacyRevenueBucket(
        label: _shortDate(day),
        start: day,
        end: day,
        amount: isFutureDay ? null : _sumNet(dayTransactions),
        transactionCount: isFutureDay ? 0 : dayTransactions.length,
      ));
    }

    final total = _sumNonNull(buckets);

    // Previous 30 days: 30 days before start
    final prevEnd = start.subtract(const Duration(days: 1));
    final prevStart = prevEnd.subtract(const Duration(days: 29));
    final previousTotal = _sumNet(eligible.where((t) {
      final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      return !d.isBefore(prevStart) && !d.isAfter(prevEnd);
    }).toList());

    return PharmacyRevenueSeries(
      range: PharmacyRevenueRange.month,
      buckets: buckets,
      total: total,
      previousTotal: previousTotal,
      transactionCount: _countInRange(eligible, start, today),
    );
  }

  /// ── Year: last 12 months ──────────────────────────────────────────────

  static PharmacyRevenueSeries _buildYear(
    List<PartnerTransaction> eligible,
    DateTime now,
  ) {
    final today = DateTime(now.year, now.month, now.day);
    final currentMonth = DateTime(today.year, today.month, 1);

    final buckets = <PharmacyRevenueBucket>[];
    for (int i = 11; i >= 0; i--) {
      final monthStart = DateTime(
        currentMonth.year,
        currentMonth.month - i,
        1,
      );
      final monthEnd = DateTime(
        monthStart.year,
        monthStart.month + 1,
        0,
      );
      final isCurrentMonthBucket = i == 0;
      final isFutureMonth = monthStart.isAfter(today);
      final cutoffEnd = isCurrentMonthBucket ? today : monthEnd;

      final monthTx = eligible.where((t) {
        final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
        return !d.isBefore(monthStart) && !d.isAfter(cutoffEnd);
      }).toList();

      buckets.add(PharmacyRevenueBucket(
        label: _shortMonth(monthStart.month),
        start: monthStart,
        end: monthEnd,
        amount: isFutureMonth ? null : (monthTx.isEmpty ? 0.0 : _sumNet(monthTx)),
        transactionCount: isFutureMonth ? 0 : monthTx.length,
      ));
    }

    final total = _sumNonNull(buckets);

    // Previous 12 months
    final prevAnchor = DateTime(
      currentMonth.year,
      currentMonth.month - 12,
      1,
    );
    final prevStart = prevAnchor;
    final prevEnd = DateTime(
      prevAnchor.year,
      prevAnchor.month + 12,
      0,
    );
    final previousTotal = _sumNet(eligible.where((t) {
      final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      return !d.isBefore(prevStart) && !d.isAfter(prevEnd);
    }).toList());

    return PharmacyRevenueSeries(
      range: PharmacyRevenueRange.year,
      buckets: buckets,
      total: total,
      previousTotal: previousTotal,
      transactionCount: _countInRange(
        eligible,
        buckets.first.start,
        buckets.last.end,
      ),
    );
  }

  /// ── Helpers ───────────────────────────────────────────────────────────

  static double _sumNet(List<PartnerTransaction> txs) {
    double total = 0;
    for (final t in txs) {
      total += t.netAmount;
    }
    return total;
  }

  static double _sumNonNull(List<PharmacyRevenueBucket> buckets) {
    double total = 0;
    for (final b in buckets) {
      if (b.amount != null) total += b.amount!;
    }
    return total;
  }

  static int _countInRange(
    List<PartnerTransaction> txs,
    DateTime startInclusive,
    DateTime endInclusive,
  ) {
    int count = 0;
    for (final t in txs) {
      final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      if (!d.isBefore(startInclusive) && !d.isAfter(endInclusive)) {
        count++;
      }
    }
    return count;
  }

  static String _shortDate(DateTime d) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[d.month - 1]} ${d.day}';
  }

  static String _shortMonth(int m) {
    const labels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return labels[m - 1];
  }
}
