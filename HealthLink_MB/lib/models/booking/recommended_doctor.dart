class RecommendedDoctor {
  const RecommendedDoctor({
    required this.doctorId,
    required this.doctorName,
    required this.specialty,
    required this.consultationFee,
    required this.manualSelectionFee,
    required this.selectionMode,
    this.avatarUrl,
    this.reason,
  });

  final String doctorId;
  final String doctorName;
  final String specialty;
  final double consultationFee;
  final double manualSelectionFee;
  final String selectionMode;
  final String? avatarUrl;
  final String? reason;

  factory RecommendedDoctor.fromJson(Map<String, dynamic> json) {
    return RecommendedDoctor(
      doctorId: (json['doctorId'] ?? '').toString(),
      doctorName: (json['doctorName'] ?? '').toString(),
      specialty: (json['specialty'] ?? '').toString(),
      consultationFee: (json['consultationFee'] as num?)?.toDouble() ?? 0,
      manualSelectionFee: (json['manualSelectionFee'] as num?)?.toDouble() ?? 0,
      selectionMode: (json['selectionMode'] ?? 'AUTO_ASSIGNED').toString(),
      avatarUrl: json['avatarUrl']?.toString(),
      reason: json['reason']?.toString(),
    );
  }
}