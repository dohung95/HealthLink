/// Time range for revenue aggregation.
enum PharmacyRevenueRange { week, month, year }

/// A single bucket within a revenue series.
class PharmacyRevenueBucket {
  const PharmacyRevenueBucket({
    required this.label,
    required this.start,
    required this.end,
    required this.amount,
    required this.transactionCount,
  });

  /// Display label (e.g. "Jul 7", "W1", "Jan").
  final String label;

  /// Inclusive start of this bucket.
  final DateTime start;

  /// Inclusive end of this bucket.
  final DateTime end;

  /// Revenue amount. `null` indicates a future bucket — render no bar.
  final double? amount;

  /// Number of transactions in this bucket.
  final int transactionCount;

  /// Whether this bucket is in the future.
  bool get isFuture => amount == null;
}

/// Complete revenue series for a selected range.
class PharmacyRevenueSeries {
  const PharmacyRevenueSeries({
    required this.range,
    required this.buckets,
    required this.total,
    required this.previousTotal,
    required this.transactionCount,
  });

  /// The selected range type.
  final PharmacyRevenueRange range;

  /// The buckets for this period.
  final List<PharmacyRevenueBucket> buckets;

  /// Total revenue in the selected period (sum of non-null amounts).
  final double total;

  /// Total revenue in the immediately preceding comparable period.
  final double previousTotal;

  /// Number of eligible transactions in the selected period.
  final int transactionCount;

  /// Percentage growth compared to the previous period.
  /// Returns `null` when [previousTotal] is zero (new revenue).
  double? get growthPercent {
    if (previousTotal == 0) return null;
    return ((total - previousTotal) / previousTotal) * 100;
  }

  /// Whether this is the first revenue period (no previous data).
  bool get isNewRevenue => previousTotal == 0 && total > 0;
}
