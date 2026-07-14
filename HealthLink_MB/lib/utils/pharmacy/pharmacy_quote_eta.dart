const int pharmacyMinEtaMinutes = 1;
const int pharmacyMaxEtaMinutes = 720;

bool pharmacyEtaMinutesInRange(int? minutes) {
  return minutes != null &&
      minutes >= pharmacyMinEtaMinutes &&
      minutes <= pharmacyMaxEtaMinutes;
}

DateTime pharmacyEstimatedArrival(int minutes, DateTime now) {
  if (!pharmacyEtaMinutesInRange(minutes)) {
    throw ArgumentError.value(minutes, 'minutes', 'must be between 1 and 720');
  }
  return now.add(Duration(minutes: minutes));
}

int? pharmacyRemainingEtaMinutes(DateTime? eta, DateTime now) {
  if (eta == null || !eta.isAfter(now)) return null;
  final seconds = eta.difference(now).inSeconds;
  final roundedMinutes = (seconds / 60).ceil();
  return pharmacyEtaMinutesInRange(roundedMinutes)
      ? roundedMinutes
      : null;
}

String? pharmacyEtaValidationMessage(String raw) {
  if (raw.trim().isEmpty) {
    return 'Enter estimated delivery time in minutes';
  }
  final minutes = int.tryParse(raw);
  if (!pharmacyEtaMinutesInRange(minutes)) {
    return 'Delivery time must be between 1 and 720 minutes';
  }
  return null;
}
