class HomeVisitDoctorOption {
  const HomeVisitDoctorOption({
    required this.doctorId,
    required this.fullName,
    required this.specialtyName,
    required this.consultationFee,
    required this.distanceKm,
    required this.estimatedTravelMinutes,
    required this.homeVisitFee,
    required this.travelFee,
    required this.homeVisitTotal,
    required this.temporaryTotal,
  });

  factory HomeVisitDoctorOption.fromJson(Map<String, dynamic> json) {
    return HomeVisitDoctorOption(
      doctorId: (json['doctorId'] ?? json['doctorID'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      specialtyName: (json['specialtyName'] ?? json['specialty'] ?? '').toString(),
      consultationFee: _toDouble(json['consultationFee'], 0),
      distanceKm: _toDouble(json['distanceKm'], 0),
      estimatedTravelMinutes: _toInt(json['estimatedTravelMinutes'], 0),
      homeVisitFee: _toDouble(json['homeVisitFee'], 0),
      travelFee: _toDouble(json['travelFee'], 0),
      homeVisitTotal: _toDouble(json['homeVisitTotal'] ?? json['totalFee'], 0),
      temporaryTotal: _toDouble(json['temporaryTotal'], 0),
    );
  }

  final String doctorId;
  final String fullName;
  final String specialtyName;
  final double consultationFee;
  final double distanceKm;
  final int estimatedTravelMinutes;
  final double homeVisitFee;
  final double travelFee;
  final double homeVisitTotal;
  final double temporaryTotal;
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double _toDouble(dynamic value, double fallback) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}