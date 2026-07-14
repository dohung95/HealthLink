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
    int? selectedMonth,
    int? selectedYear,
  }) {
    final eligible = transactions
        .where((t) => t.status.toUpperCase() != 'REFUNDED')
        .toList();

    switch (range) {
      case PharmacyRevenueRange.week:
        return _buildWeek(eligible, now);
      case PharmacyRevenueRange.month:
        return _buildMonth(eligible, now, selectedMonth ?? now.month);
      case PharmacyRevenueRange.year:
        return _buildYear(eligible, now, selectedYear ?? now.year);
    }
  }

  /// ── Week ──────────────────────────────────────────────────────────────

  static PharmacyRevenueSeries _buildWeek(
    List<PartnerTransaction> eligible,
    DateTime now,
  ) {
    final today = DateTime(now.year, now.month, now.day);

    // Current week: 7 days ending at today
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
        label: _shortWeekday(day),
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

  /// ── Month ─────────────────────────────────────────────────────────────

  static PharmacyRevenueSeries _buildMonth(
    List<PartnerTransaction> eligible,
    DateTime now,
    int month,
  ) {
    final year = now.month >= month ? now.year : now.year - 1;
    final today = DateTime(now.year, now.month, now.day);
    final monthStart = DateTime(year, month, 1);
    final monthEnd = DateTime(year, month + 1, 0);

    final isCurrentMonth = year == now.year && month == now.month;

    // W1 = days 1-7, W2 = 8-14, W3 = 15-21, W4 = 22-end
    final weekDefs = [
      (label: 'W1', start: monthStart, end: DateTime(year, month, 7)),
      (label: 'W2', start: DateTime(year, month, 8), end: DateTime(year, month, 14)),
      (label: 'W3', start: DateTime(year, month, 15), end: DateTime(year, month, 21)),
      (label: 'W4', start: DateTime(year, month, 22), end: monthEnd),
    ];

    final buckets = <PharmacyRevenueBucket>[];
    for (final def in weekDefs) {
      final isFutureWeek = isCurrentMonth && def.start.isAfter(today);
      final weekTransactions = eligible.where((t) {
        final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
        return !d.isBefore(def.start) && !d.isAfter(def.end) && !d.isAfter(today);
      }).toList();

      final amount = isFutureWeek
          ? null
          : (weekTransactions.isEmpty ? 0.0 : _sumNet(weekTransactions));

      buckets.add(PharmacyRevenueBucket(
        label: def.label,
        start: def.start,
        end: def.end,
        amount: amount,
        transactionCount: isFutureWeek ? 0 : weekTransactions.length,
      ));
    }

    final total = _sumNonNull(buckets);

    // Previous month
    final prevMonthStart = monthStart.subtract(const Duration(days: 1));
    final prevMonthFirst = DateTime(prevMonthStart.year, prevMonthStart.month, 1);
    final previousTotal = _sumNet(eligible.where((t) {
      final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      return !d.isBefore(prevMonthFirst) && !d.isAfter(prevMonthStart);
    }).toList());

    return PharmacyRevenueSeries(
      range: PharmacyRevenueRange.month,
      buckets: buckets,
      total: total,
      previousTotal: previousTotal,
      transactionCount: _countInRange(eligible, monthStart, isCurrentMonth ? today : monthEnd),
    );
  }

  /// ── Year ──────────────────────────────────────────────────────────────

  static PharmacyRevenueSeries _buildYear(
    List<PartnerTransaction> eligible,
    DateTime now,
    int year,
  ) {
    final today = DateTime(now.year, now.month, now.day);
    final isCurrentYear = year == now.year;

    final buckets = <PharmacyRevenueBucket>[];
    for (int m = 1; m <= 12; m++) {
      final monthStart = DateTime(year, m, 1);
      final monthEnd = DateTime(year, m + 1, 0);
      final isFutureMonth = isCurrentYear && m > now.month;
      final cutoffEnd = isCurrentYear && m == now.month ? today : monthEnd;

      final monthTx = eligible.where((t) {
        final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
        return !d.isBefore(monthStart) && !d.isAfter(cutoffEnd);
      }).toList();

      buckets.add(PharmacyRevenueBucket(
        label: _shortMonth(m),
        start: monthStart,
        end: monthEnd,
        amount: isFutureMonth ? null : (monthTx.isEmpty ? 0.0 : _sumNet(monthTx)),
        transactionCount: isFutureMonth ? 0 : monthTx.length,
      ));
    }

    final total = _sumNonNull(buckets);

    // Previous year same date range
    final prevYear = year - 1;
    final currentElapsedEnd = isCurrentYear ? today : DateTime(year, 12, 31);
    final prevElapsedEnd = DateTime(
      prevYear,
      currentElapsedEnd.month,
      currentElapsedEnd.day,
    );
    final prevYearStart = DateTime(prevYear, 1, 1);
    final previousTotal = _sumNet(eligible.where((t) {
      final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      return !d.isBefore(prevYearStart) && !d.isAfter(prevElapsedEnd);
    }).toList());

    return PharmacyRevenueSeries(
      range: PharmacyRevenueRange.year,
      buckets: buckets,
      total: total,
      previousTotal: previousTotal,
      transactionCount: _countInRange(
        eligible,
        DateTime(year, 1, 1),
        isCurrentYear ? today : DateTime(year, 12, 31),
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

  static String _shortWeekday(DateTime d) {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // DateTime.weekday: 1=Monday … 7=Sunday
    return labels[d.weekday - 1];
  }

  static String _shortMonth(int m) {
    const labels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return labels[m - 1];
  }
}
