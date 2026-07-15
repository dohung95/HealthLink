abstract final class PharmacyMedicationSchedule {
  static const supportedTimings = <String>[
    'MORNING',
    'AFTERNOON',
    'EVENING',
  ];

  static List<String> normalizeTimings(Iterable<String> timings) {
    final normalized = <String>[];
    for (final timing in timings) {
      final value = timing.trim().toUpperCase();
      if (value.isEmpty || normalized.contains(value)) continue;
      normalized.add(value);
    }
    if (normalized.isEmpty ||
        normalized.any((value) => !supportedTimings.contains(value))) {
      throw ArgumentError('Select 1 to 3 supported timings');
    }
    return normalized;
  }

  static String deriveFrequency(Iterable<String> timings) {
    final normalized = normalizeTimings(timings);
    return const {1: 'QD', 2: 'BID', 3: 'TID'}[normalized.length]!;
  }
}
