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
      // 3 eligible * netAmount, REFUNDED should be excluded
      expect(series.transactionCount, 3);
      expect(series.total, closeTo(60, 0.001));
    });
  });

  group('PharmacyRevenueCalculator — week', () {
    test('emits 7 buckets Jul 7–Jul 13 and compares with Jun 30–Jul 6', () {
      final txs = <PartnerTransaction>[
        // Current week
        _tx(id: 1, netAmount: 10, status: 'SETTLED', createdAt: '2026-07-07'),
        _tx(id: 2, netAmount: 20, status: 'SETTLED', createdAt: '2026-07-10'),
        _tx(id: 3, netAmount: 30, status: 'SETTLED', createdAt: '2026-07-13'),
        // Previous week
        _tx(id: 4, netAmount: 5, status: 'SETTLED', createdAt: '2026-07-01'),
        _tx(id: 5, netAmount: 15, status: 'SETTLED', createdAt: '2026-07-04'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.week,
        now: _now,
      );

      expect(series.buckets.length, 7);
      expect(series.buckets[0].label, 'Tue'); // Jul 7
      expect(series.buckets[6].label, 'Mon'); // Jul 13
      // Jul 7 has $10
      expect(series.buckets[0].amount, closeTo(10, 0.001));
      // Jul 13 (today) has $30
      expect(series.buckets[6].amount, closeTo(30, 0.001));
      expect(series.total, closeTo(60, 0.001));
      expect(series.previousTotal, closeTo(20, 0.001));
      expect(series.transactionCount, 3);
    });

    test('correctly labels days from Sat to Fri when now is Friday', () {
      // now = Friday Jul 10 → week goes Jul 4 (Sat) through Jul 10 (Fri)
      final now = DateTime(2026, 7, 10);
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 10, status: 'SETTLED', createdAt: '2026-07-07'),
        _tx(id: 2, netAmount: 20, status: 'SETTLED', createdAt: '2026-07-09'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.week,
        now: now,
      );

      expect(series.buckets.length, 7);
      // Week runs Jul 4 (Sat) .. Jul 10 (Fri); no bucket is future
      expect(series.buckets[0].label, 'Sat');  // Jul 4
      expect(series.buckets[3].label, 'Tue');  // Jul 7 — $10
      expect(series.buckets[3].amount, closeTo(10, 0.001));
      expect(series.buckets[5].label, 'Thu');  // Jul 9 — $20
      expect(series.buckets[5].amount, closeTo(20, 0.001));
      expect(series.buckets[6].label, 'Fri');  // Jul 10 — today
      expect(series.total, closeTo(30, 0.001));
    });
  });

  group('PharmacyRevenueCalculator — month', () {
    test('current July: W1=1-7, W2=8-14 (partial), W3=null, W4=null', () {
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 10, status: 'SETTLED', createdAt: '2026-07-03'),
        _tx(id: 2, netAmount: 20, status: 'SETTLED', createdAt: '2026-07-10'),
        _tx(id: 3, netAmount: 5, status: 'SETTLED', createdAt: '2026-07-13'), // still in W2
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.month,
        now: _now,
      );

      expect(series.buckets.length, 4);
      expect(series.buckets[0].label, 'W1');
      expect(series.buckets[0].amount, closeTo(10, 0.001));
      expect(series.buckets[1].label, 'W2');
      expect(series.buckets[1].amount, closeTo(25, 0.001));
      expect(series.buckets[2].label, 'W3');
      expect(series.buckets[2].amount, isNull); // future
      expect(series.buckets[2].isFuture, isTrue);
      expect(series.buckets[3].label, 'W4');
      expect(series.buckets[3].amount, isNull); // future
      expect(series.total, closeTo(35, 0.001));
    });

    test('historical June: 4 full numeric buckets, compares with May', () {
      final now = DateTime(2026, 7, 13, 12);
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 10, status: 'SETTLED', createdAt: '2026-06-05'),
        _tx(id: 2, netAmount: 20, status: 'SETTLED', createdAt: '2026-06-12'),
        _tx(id: 3, netAmount: 5, status: 'SETTLED', createdAt: '2026-06-20'),
        _tx(id: 4, netAmount: 15, status: 'SETTLED', createdAt: '2026-06-28'),
        // Previous month (May) revenue
        _tx(id: 5, netAmount: 8, status: 'SETTLED', createdAt: '2026-05-10'),
        _tx(id: 6, netAmount: 12, status: 'SETTLED', createdAt: '2026-05-22'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.month,
        now: now,
        selectedMonth: 6, // June
      );

      expect(series.total, closeTo(50, 0.001));
      expect(series.previousTotal, closeTo(20, 0.001));
      expect(series.buckets.length, 4);
      // All four June weeks have amounts (none are future)
      expect(series.buckets[0].amount, closeTo(10, 0.001));
      expect(series.buckets[1].amount, closeTo(20, 0.001));
      expect(series.buckets[2].amount, closeTo(5, 0.001));
      expect(series.buckets[3].amount, closeTo(15, 0.001));
      // Growth
      expect(series.growthPercent, closeTo(150, 0.001)); // (50-20)/20*100 = 150%
      expect(series.isNewRevenue, isFalse);
    });
  });

  group('PharmacyRevenueCalculator — year', () {
    test('current year: 12 labels, Aug-Dec null, compares Jan-Jul with previous Jan-Jul', () {
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 100, status: 'SETTLED', createdAt: '2026-01-15'),
        _tx(id: 2, netAmount: 200, status: 'SETTLED', createdAt: '2026-03-10'),
        _tx(id: 3, netAmount: 150, status: 'SETTLED', createdAt: '2026-07-01'),
        // Previous year
        _tx(id: 4, netAmount: 50, status: 'SETTLED', createdAt: '2025-02-15'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.year,
        now: _now,
      );

      expect(series.buckets.length, 12);
      expect(series.buckets[0].label, 'Jan');
      expect(series.buckets[0].amount, closeTo(100, 0.001));
      expect(series.buckets[6].label, 'Jul');
      expect(series.buckets[6].amount, closeTo(150, 0.001));
      // Aug-Dec are future
      expect(series.buckets[7].amount, isNull); // Aug
      expect(series.buckets[11].amount, isNull); // Dec
      expect(series.total, closeTo(450, 0.001));
      expect(series.previousTotal, closeTo(50, 0.001));
    });

    test('historical year compares full selected year with full preceding year', () {
      final txs = <PartnerTransaction>[
        // 2025 (selected)
        _tx(id: 1, netAmount: 100, status: 'SETTLED', createdAt: '2025-06-15'),
        _tx(id: 2, netAmount: 200, status: 'SETTLED', createdAt: '2025-11-20'),
        // 2024 (previous)
        _tx(id: 3, netAmount: 50, status: 'SETTLED', createdAt: '2024-03-10'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.year,
        now: _now,
        selectedYear: 2025,
      );

      expect(series.total, closeTo(300, 0.001));
      expect(series.previousTotal, closeTo(50, 0.001));
      // All 12 months are full
      expect(series.buckets.every((b) => b.amount != null), isTrue);
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
      // Buckets are still emitted
      expect(series.buckets.length, 7);
    });

    test('zero-valued elapsed buckets show 0 not null', () {
      // now = Jul 13 (Mon) → week is Jul 7 (Tue) .. Jul 13 (Mon)
      // transaction is on Jul 10 (Fri) = buckets[3]
      final txs = <PartnerTransaction>[
        _tx(id: 1, netAmount: 50, status: 'SETTLED', createdAt: '2026-07-10'),
      ];
      final series = PharmacyRevenueCalculator.build(
        transactions: txs,
        range: PharmacyRevenueRange.week,
        now: _now,
      );
      // Jul 7 (Tue, index 0) — no transactions
      expect(series.buckets[0].amount, 0);
      // Jul 10 (Fri, index 3) — has the $50 transaction
      expect(series.buckets[3].amount, closeTo(50, 0.001));
      // Jul 13 (Mon, index 6) — today, no transaction
      expect(series.buckets[6].amount, 0);
    });
  });
}
