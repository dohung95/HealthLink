import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/models/partner/partner_wallet_models.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_revenue_series.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_revenue_calculator.dart';

/// Helper to build a [PartnerTransaction] with minimal fields.
PartnerTransaction _tx({
  required int id,
  required double netAmount,
  required String status,
  required String createdAt,
}) {
  return PartnerTransaction(
    transactionId: id,
    sourceType: 'PHARMACY_ORDER',
    serviceType: 'PHARMACY_ORDER',
    grossAmount: netAmount * 1.08,
    netAmount: netAmount,
    status: status,
    createdAt: DateTime.parse(createdAt),
  );
}

/// Reference now for all deterministic tests.
final _now = DateTime(2026, 7, 13, 12);

void main() {
  group('PharmacyRevenueCalculator — filtering', () {
    test('includes PENDING, VESTED, SETTLED; excludes REFUNDED', () {
      final txs = [
        _tx(id: 1, netAmount: 10, status: 'PENDING', createdAt: '2026-07-13'),
        _tx(id: 2, netAmount: 20, status: 'VESTED', createdAt: '2026-07-13'),
        _tx(id: 3, netAmount: 30, status: 'SETTLED', createdAt: '2026-07-13'),
        _tx(id: 4, netAmount: 40, status: 'REFUNDED', createdAt: '2026-07-13'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.week,
        now: _now,
      );
      expect(series.transactionCount, 3);
      expect(series.total, closeTo(60, 0.001));
    });
  });

  group('PharmacyRevenueCalculator — week', () {
    test('emits 7 buckets Jul 7–Jul 13 with short date labels', () {
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 10, status: 'SETTLED', createdAt: '2026-07-07'),
        _tx(id: 2, netAmount: 20, status: 'SETTLED', createdAt: '2026-07-10'),
        _tx(id: 3, netAmount: 30, status: 'SETTLED', createdAt: '2026-07-13'),
        _tx(id: 4, netAmount: 5, status: 'SETTLED', createdAt: '2026-07-01'),
        _tx(id: 5, netAmount: 15, status: 'SETTLED', createdAt: '2026-07-04'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.week,
        now: _now,
      );

      expect(series.buckets.length, 7);
      expect(series.buckets[0].label, 'Jul 7');
      expect(series.buckets[6].label, 'Jul 13');
      expect(series.buckets[0].amount, closeTo(10, 0.001));
      expect(series.buckets[6].amount, closeTo(30, 0.001));
      expect(series.total, closeTo(60, 0.001));
      expect(series.previousTotal, closeTo(20, 0.001));
      expect(series.transactionCount, 3);
    });
  });

  group('PharmacyRevenueCalculator — month', () {
    test('emits 30 daily buckets from Jun 14 to Jul 13', () {
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 10, status: 'SETTLED', createdAt: '2026-06-14'),
        _tx(id: 2, netAmount: 20, status: 'SETTLED', createdAt: '2026-07-10'),
        _tx(id: 3, netAmount: 5, status: 'SETTLED', createdAt: '2026-07-13'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.month,
        now: _now,
      );

      expect(series.buckets.length, 30);
      expect(series.buckets[0].label, 'Jun 14');
      expect(series.buckets[0].amount, closeTo(10, 0.001));
      expect(series.buckets[26].label, 'Jul 10');
      expect(series.buckets[26].amount, closeTo(20, 0.001));
      expect(series.buckets[29].label, 'Jul 13');
      expect(series.buckets[29].amount, closeTo(5, 0.001));
      expect(series.total, closeTo(35, 0.001));
    });

    test('previous 30 days calculated correctly', () {
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 10, status: 'SETTLED', createdAt: '2026-07-13'),
        // Previous 30-day window
        _tx(id: 2, netAmount: 8, status: 'SETTLED', createdAt: '2026-06-10'),
        _tx(id: 3, netAmount: 12, status: 'SETTLED', createdAt: '2026-06-12'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.month,
        now: _now,
      );

      expect(series.total, closeTo(10, 0.001));
      expect(series.previousTotal, closeTo(20, 0.001));
      expect(series.growthPercent, closeTo(-50, 0.001));
    });
  });

  group('PharmacyRevenueCalculator — year', () {
    test('last 12 months: Aug 2025 – Jul 2026, future months null', () {
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 100, status: 'SETTLED', createdAt: '2026-01-15'),
        _tx(id: 2, netAmount: 200, status: 'SETTLED', createdAt: '2026-03-10'),
        _tx(id: 3, netAmount: 150, status: 'SETTLED', createdAt: '2026-07-01'),
        _tx(id: 4, netAmount: 50, status: 'SETTLED', createdAt: '2025-09-15'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.year,
        now: _now,
      );

      expect(series.buckets.length, 12);
      // now = Jul 2026, so last 12 months = Aug 2025 .. Jul 2026
      expect(series.buckets[0].label, 'Aug');  // Aug 2025
      expect(series.buckets[0].amount, closeTo(50, 0.001));
      expect(series.buckets[5].label, 'Jan');  // Jan 2026
      expect(series.buckets[5].amount, closeTo(100, 0.001));
      // Jul 2026 = last bucket (index 11)
      expect(series.buckets[11].label, 'Jul');
      expect(series.buckets[11].amount, closeTo(150, 0.001));
      expect(series.total, closeTo(500, 0.001));
    });
  });

  group('PharmacyRevenueCalculator — edge cases', () {
    test('isNewRevenue == true when previous total is zero and current > 0', () {
      final txs = [
        _tx(id: 1, netAmount: 50, status: 'SETTLED', createdAt: '2026-07-13'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.week,
        now: _now,
      );
      expect(series.isNewRevenue, isTrue);
      expect(series.growthPercent, isNull);
      expect(series.total, closeTo(50, 0.001));
      expect(series.previousTotal, 0);
    });

    test('empty current period returns total/count zero without throwing', () {
      final series = PharmacyRevenueCalculator.build(
        transactions: [],
        range: PharmacyRevenueRange.week,
        now: _now,
      );
      expect(series.total, 0);
      expect(series.transactionCount, 0);
      expect(series.previousTotal, 0);
      expect(series.isNewRevenue, isFalse);
      expect(series.growthPercent, isNull);
      expect(series.buckets.length, 7);
    });

    test('zero-valued elapsed buckets show 0 not null in week', () {
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 50, status: 'SETTLED', createdAt: '2026-07-10'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.week,
        now: _now,
      );
      expect(series.buckets[0].label, 'Jul 7');
      expect(series.buckets[0].amount, 0);
      expect(series.buckets[3].label, 'Jul 10');
      expect(series.buckets[3].amount, closeTo(50, 0.001));
      expect(series.buckets[6].label, 'Jul 13');
      expect(series.buckets[6].amount, 0);
    });
  });
}
