class PatientProfile {
  final String userId;
  final String fullName;
  final String? email;
  final DateTime? dateOfBirth;
  final String? gender;
  final String? occupation;
  final String? address;
  final String? city;
  final String? country;
  final String? preferredLanguage;
  final String? preferredContactMethod;
  final String? phoneNumber;
  final String? bloodType;
  final double? heightCm;
  final double? weightKg;
  final String? avatarUrl;
  final String? medicalHistorySummary;
  final String? allergies;
  final String? chronicConditions;
  final String? currentMedications;
  final String? insuranceProvider;
  final String? insurancePolicyNumber;
  final String? emergencyContactName;
  final String? emergencyContactPhone;
  final String? emergencyContactRelationship;

  PatientProfile({
    required this.userId,
    required this.fullName,
    this.email,
    this.dateOfBirth,
    this.gender,
    this.occupation,
    this.address,
    this.city,
    this.country,
    this.preferredLanguage,
    this.preferredContactMethod,
    this.phoneNumber,
    this.bloodType,
    this.heightCm,
    this.weightKg,
    this.avatarUrl,
    this.medicalHistorySummary,
    this.allergies,
    this.chronicConditions,
    this.currentMedications,
    this.insuranceProvider,
    this.insurancePolicyNumber,
    this.emergencyContactName,
    this.emergencyContactPhone,
    this.emergencyContactRelationship,
  });

  factory PatientProfile.fromJson(Map<String, dynamic> json) {
    return PatientProfile(
      userId: json['userId'] ?? '',
      fullName: json['fullName'] ?? 'Unknown',
      email: json['email'],
      dateOfBirth: json['dateOfBirth'] != null ? DateTime.tryParse(json['dateOfBirth']) : null,
      gender: json['gender'],
      occupation: json['occupation'],
      address: json['address'],
      city: json['city'],
      country: json['country'],
      preferredLanguage: json['preferredLanguage'],
      preferredContactMethod: json['preferredContactMethod'],
      phoneNumber: json['phoneNumber'],
      bloodType: json['bloodType'],
      heightCm: (json['heightCm'] as num?)?.toDouble(),
      weightKg: (json['weightKg'] as num?)?.toDouble(),
      avatarUrl: json['avatarUrl'],
      medicalHistorySummary: json['medicalHistorySummary'],
      allergies: json['allergies'],
      chronicConditions: json['chronicConditions'],
      currentMedications: json['currentMedications'],
      insuranceProvider: json['insuranceProvider'],
      insurancePolicyNumber: json['insurancePolicyNumber'],
      emergencyContactName: json['emergencyContactName'],
      emergencyContactPhone: json['emergencyContactPhone'],
      emergencyContactRelationship: json['emergencyContactRelationship'],
    );
  }
}
