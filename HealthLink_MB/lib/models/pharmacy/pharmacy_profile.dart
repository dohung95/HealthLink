class PharmacyProfile {
  final String pharmacyId;
  final String name;
  final String? email;
  final String? phoneNumber;
  final String? avatarUrl;
  final String? description;
  final String? address;
  final String? city;
  final String? district;
  final String? ward;
  final double? latitude;
  final double? longitude;
  final String? openTime;
  final String? closeTime;
  final bool open24Hours;
  final String? workingDays;
  final bool deliveryAvailable;
  final double? deliveryFee;
  final double? deliveryRadius;
  final bool verified;
  final bool active;
  final double? averageRating;
  final int? totalReviews;
  final double? totalEarnings;
  final double? pendingSettlement;
  final bool isOnline;
  final String? paypalEmail;

  const PharmacyProfile({
    required this.pharmacyId,
    required this.name,
    this.email,
    this.phoneNumber,
    this.avatarUrl,
    this.description,
    this.address,
    this.city,
    this.district,
    this.ward,
    this.latitude,
    this.longitude,
    this.openTime,
    this.closeTime,
    this.open24Hours = false,
    this.workingDays,
    this.deliveryAvailable = true,
    this.deliveryFee,
    this.deliveryRadius,
    this.verified = false,
    this.active = true,
    this.averageRating,
    this.totalReviews,
    this.totalEarnings,
    this.pendingSettlement,
    this.isOnline = true,
    this.paypalEmail,
  });

  factory PharmacyProfile.fromJson(Map<String, dynamic> json) {
    return PharmacyProfile(
      pharmacyId: json['pharmacyId']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      description: json['description'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      district: json['district'] as String?,
      ward: json['ward'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      openTime: json['openTime']?.toString(),
      closeTime: json['closeTime']?.toString(),
      open24Hours: json['open24Hours'] as bool? ?? false,
      workingDays: json['workingDays'] as String?,
      deliveryAvailable: json['deliveryAvailable'] as bool? ?? true,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble(),
      deliveryRadius: (json['deliveryRadius'] as num?)?.toDouble(),
      verified: json['verified'] as bool? ?? false,
      active: json['active'] as bool? ?? true,
      averageRating: (json['averageRating'] as num?)?.toDouble(),
      totalReviews: json['totalReviews'] as int?,
      totalEarnings: (json['totalEarnings'] as num?)?.toDouble(),
      pendingSettlement: (json['pendingSettlement'] as num?)?.toDouble(),
      isOnline: json['isOnline'] as bool? ?? true,
      paypalEmail: json['paypalEmail']?.toString(),
    );
  }

  Map<String, dynamic> toUpdateJson() {
    return {
      'phoneNumber': phoneNumber,
      'description': description,
      'openTime': openTime,
      'closeTime': closeTime,
      'workingDays': workingDays,
      'deliveryFee': deliveryFee,
      'deliveryRadius': deliveryRadius,
      'deliveryAvailable': deliveryAvailable,
    };
  }
}
