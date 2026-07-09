class HomeVisitDoctorOption {
  const HomeVisitDoctorOption({
    required this.doctorId,
    required this.fullName,
    required this.specialtyName,
    required this.consultationFee,
    required this.distanceKm,
    required this.estimatedTravelMinutes,
    required this.homeVisitFee,
    required this.homeVisitConsultationFee,
    required this.travelFee,
    required this.homeVisitTotal,
    required this.temporaryTotal,
  });

  factory HomeVisitDoctorOption.fromJson(Map<String, dynamic> json) {
    final consultationFee = _toDouble(json['consultationFee'], 0);
    final homeVisitConsultationFee = _toDouble(
      json['homeVisitConsultationFee'],
      consultationFee * 1.5,
    );
    final homeVisitTotal = _toDouble(json['homeVisitTotal'] ?? json['totalFee'], 0);

    return HomeVisitDoctorOption(
      doctorId: (json['doctorId'] ?? json['doctorID'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      specialtyName: (json['specialtyName'] ?? json['specialty'] ?? '').toString(),
      consultationFee: consultationFee,
      homeVisitConsultationFee: homeVisitConsultationFee,
      distanceKm: _toDouble(json['distanceKm'], 0),
      estimatedTravelMinutes: _toInt(json['estimatedTravelMinutes'], 0),
      homeVisitFee: _toDouble(json['homeVisitFee'], 0),
      travelFee: _toDouble(json['travelFee'], 0),
      homeVisitTotal: homeVisitTotal,
      temporaryTotal: _toDouble(
        json['temporaryTotal'],
        homeVisitConsultationFee + homeVisitTotal,
      ),
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
  final double homeVisitConsultationFee;

  double get displayDoctorFee =>
      homeVisitConsultationFee > 0 ? homeVisitConsultationFee : consultationFee;

  double get displayTemporaryTotal =>
      temporaryTotal > 0 ? temporaryTotal : displayDoctorFee + homeVisitTotal;
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