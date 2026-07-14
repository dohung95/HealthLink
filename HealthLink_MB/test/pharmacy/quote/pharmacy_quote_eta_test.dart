import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_quote_eta.dart';

void main() {
  final now = DateTime(2026, 7, 14, 18, 0, 0);

  test('builds an arrival from submission time', () {
    expect(
      pharmacyEstimatedArrival(45, now),
      DateTime(2026, 7, 14, 18, 45, 0),
    );
  });

  test('rounds remaining partial minutes up', () {
    final eta = now.add(const Duration(seconds: 90));
    expect(pharmacyRemainingEtaMinutes(eta, now), 2);
  });

  test('returns null for an expired ETA', () {
    expect(
      pharmacyRemainingEtaMinutes(
        now.subtract(const Duration(seconds: 1)),
        now,
      ),
      isNull,
    );
  });

  test('returns null when remaining ETA exceeds 720 minutes', () {
    expect(
      pharmacyRemainingEtaMinutes(
        now.add(const Duration(minutes: 721)),
        now,
      ),
      isNull,
    );
  });

  test('accepts only the inclusive 1 to 720 range', () {
    expect(pharmacyEtaMinutesInRange(null), isFalse);
    expect(pharmacyEtaMinutesInRange(0), isFalse);
    expect(pharmacyEtaMinutesInRange(1), isTrue);
    expect(pharmacyEtaMinutesInRange(720), isTrue);
    expect(pharmacyEtaMinutesInRange(721), isFalse);
  });
}
