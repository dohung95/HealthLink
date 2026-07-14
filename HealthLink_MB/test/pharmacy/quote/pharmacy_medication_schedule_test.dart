import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_medication_schedule.dart';

void main() {
  test('supports morning, afternoon, and evening timings only', () {
    expect(PharmacyMedicationSchedule.supportedTimings,
        ['MORNING', 'AFTERNOON', 'EVENING']);
  });

  test('derives QD BID and TID from distinct timings', () {
    expect(PharmacyMedicationSchedule.deriveFrequency(['MORNING']), 'QD');
    expect(PharmacyMedicationSchedule.deriveFrequency(
        ['MORNING', 'EVENING']), 'BID');
    expect(PharmacyMedicationSchedule.deriveFrequency(
        ['MORNING', 'AFTERNOON', 'EVENING']), 'TID');
  });

  test('normalizes duplicate and differently cased timings before counting', () {
    expect(
      PharmacyMedicationSchedule.deriveFrequency(
          [' morning ', 'MORNING', 'evening']),
      'BID',
    );
  });

  test('rejects empty and legacy NIGHT timings for new schedules', () {
    expect(
      () => PharmacyMedicationSchedule.deriveFrequency([]),
      throwsArgumentError,
    );
    expect(
      () => PharmacyMedicationSchedule.deriveFrequency(['NIGHT']),
      throwsArgumentError,
    );
  });
}
