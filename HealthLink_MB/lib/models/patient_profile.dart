class PatientProfile {
  final String userId;
  final String fullName;
  final DateTime? dateOfBirth;
  final String? gender;
  final String? occupation;
  final String? city;
  final String? country;
  final String? preferredLanguage;
  final String? bloodType;
  final double? heightCm;
  final double? weightKg;
  final String? avatarUrl;
  final String? medicalHistorySummary;
  final String? allergies;
  final String? chronicConditions;
  final String? currentMedications;

  PatientProfile({
    required this.userId,
    required this.fullName,
    this.dateOfBirth,
    this.gender,
    this.occupation,
    this.city,
    this.country,
    this.preferredLanguage,
    this.bloodType,
    this.heightCm,
    this.weightKg,
    this.avatarUrl,
    this.medicalHistorySummary,
    this.allergies,
    this.chronicConditions,
    this.currentMedications,
  });

  factory PatientProfile.fromJson(Map<String, dynamic> json) {
    return PatientProfile(
      userId: json['userId'] ?? '',
      fullName: json['fullName'] ?? 'Unknown',
      dateOfBirth: json['dateOfBirth'] != null ? DateTime.tryParse(json['dateOfBirth']) : null,
      gender: json['gender'],
      occupation: json['occupation'],
      city: json['city'],
      country: json['country'],
      preferredLanguage: json['preferredLanguage'],
      bloodType: json['bloodType'],
      heightCm: (json['heightCm'] as num?)?.toDouble(),
      weightKg: (json['weightKg'] as num?)?.toDouble(),
      avatarUrl: json['avatarUrl'],
      medicalHistorySummary: json['medicalHistorySummary'],
      allergies: json['allergies'],
      chronicConditions: json['chronicConditions'],
      currentMedications: json['currentMedications'],
    );
  }
}
