/// Model thông tin profile bác sĩ
class DoctorProfile {
  final String doctorId;
  final String? fullName;
  final String? email;
  final String? phoneNumber;
  final String? specialty;
  final String? specialtyName;
  final String? qualifications;
  final int? yearsOfExperience;
  final String? bio;
  final String? clinicName;
  final String? clinicAddress;
  final String? location;
  final double? consultationFee;
  final double? averageRating;
  final int? totalReviews;
  final String? avatarUrl;
  final bool? verified;
  final String? scheduleStatus;
  final String? bankAccount;
  final String? bankName;
  final String? paypalEmail;
  final double? customCommissionRateOnline;
  final double? customCommissionRateOffline;

  const DoctorProfile({
    required this.doctorId,
    this.fullName,
    this.email,
    this.phoneNumber,
    this.specialty,
    this.specialtyName,
    this.qualifications,
    this.yearsOfExperience,
    this.bio,
    this.clinicName,
    this.clinicAddress,
    this.location,
    this.consultationFee,
    this.averageRating,
    this.totalReviews,
    this.avatarUrl,
    this.verified,
    this.scheduleStatus,
    this.bankAccount,
    this.bankName,
    this.paypalEmail,
    this.customCommissionRateOnline,
    this.customCommissionRateOffline,
  });

  factory DoctorProfile.fromJson(Map<String, dynamic> json) {
    return DoctorProfile(
      doctorId: json['doctorId']?.toString() ?? json['doctorID']?.toString() ?? '',
      fullName: json['fullName'] as String?,
      email: json['email'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      specialty: json['specialty'] as String?,
      specialtyName: json['specialtyName'] as String? ?? json['specialty'] as String?,
      qualifications: json['qualifications'] as String?,
      yearsOfExperience: json['yearsOfExperience'] as int?,
      bio: json['bio'] as String? ?? json['description'] as String?,
      clinicName: json['clinicName'] as String? ?? json['hospital'] as String?,
      clinicAddress: json['clinicAddress'] as String? ?? json['workingAddress'] as String?,
      location: json['location'] as String?,
      consultationFee: (json['consultationFee'] as num?)?.toDouble(),
      averageRating: (json['averageRating'] as num?)?.toDouble(),
      totalReviews: json['totalReviews'] as int?,
      avatarUrl: json['avatarUrl'] as String?,
      verified: json['verified'] as bool?,
      scheduleStatus: json['scheduleStatus'] as String?,
      bankAccount: json['bankAccount'] as String?,
      bankName: json['bankName'] as String?,
      paypalEmail: json['paypalEmail'] as String?,
      customCommissionRateOnline: (json['customCommissionRateOnline'] as num?)?.toDouble(),
      customCommissionRateOffline: (json['customCommissionRateOffline'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'doctorId': doctorId,
      'fullName': fullName,
      'email': email,
      'phoneNumber': phoneNumber,
      'specialty': specialty,
      'specialtyName': specialtyName,
      'qualifications': qualifications,
      'yearsOfExperience': yearsOfExperience,
      'bio': bio,
      'clinicName': clinicName,
      'clinicAddress': clinicAddress,
      'location': location,
      'consultationFee': consultationFee,
      'averageRating': averageRating,
      'totalReviews': totalReviews,
      'avatarUrl': avatarUrl,
      'verified': verified,
      'scheduleStatus': scheduleStatus,
      'bankAccount': bankAccount,
      'bankName': bankName,
      'paypalEmail': paypalEmail,
      'customCommissionRateOnline': customCommissionRateOnline,
      'customCommissionRateOffline': customCommissionRateOffline,
    };
  }
}
