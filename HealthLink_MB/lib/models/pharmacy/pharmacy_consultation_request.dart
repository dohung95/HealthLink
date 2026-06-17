class PharmacyConsultationRequest {
  final int requestId;
  final String patientId;
  final String patientName;
  final String? pharmacyId;
  final String? pharmacyName;
  final String? pharmacyUserId;
  final String? symptoms;
  final String? description;
  final String? allergies;
  final List<String>? attachments;
  final String? additionalNotes;
  final String? preferredDeliveryType;
  final String? requestType;
  final String? deliveryType;
  final String? deliveryAddress;
  final String? deliveryPhoneNumber;
  final String status;
  final String? chatRoomId;
  final String? pharmacyNotes;
  final String? patientFollowUpNotes;
  final List<int>? prescriptionHeaderIds;
  final int? pharmacyOrderId;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const PharmacyConsultationRequest({
    required this.requestId,
    required this.patientId,
    required this.patientName,
    this.pharmacyId,
    this.pharmacyName,
    this.pharmacyUserId,
    this.symptoms,
    this.description,
    this.allergies,
    this.attachments,
    this.additionalNotes,
    this.preferredDeliveryType,
    this.requestType,
    this.deliveryType,
    this.deliveryAddress,
    this.deliveryPhoneNumber,
    required this.status,
    this.chatRoomId,
    this.pharmacyNotes,
    this.patientFollowUpNotes,
    this.prescriptionHeaderIds,
    this.pharmacyOrderId,
    required this.createdAt,
    this.updatedAt,
  });

  factory PharmacyConsultationRequest.fromJson(Map<String, dynamic> json) {
    return PharmacyConsultationRequest(
      requestId: json['requestId'] as int? ?? 0,
      patientId: json['patientId'] as String? ?? '',
      patientName: json['patientName'] as String? ?? '',
      pharmacyId: json['pharmacyId'] as String?,
      pharmacyName: json['pharmacyName'] as String?,
      pharmacyUserId: json['pharmacyUserId'] as String?,
      symptoms: json['symptoms'] as String?,
      description: json['description'] as String?,
      allergies: json['allergies'] as String?,
      attachments: (json['attachments'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      additionalNotes: json['additionalNotes'] as String?,
      preferredDeliveryType: json['preferredDeliveryType'] as String?,
      requestType: json['requestType'] as String?,
      deliveryType: json['deliveryType'] as String?,
      deliveryAddress: json['deliveryAddress'] as String?,
      deliveryPhoneNumber: json['deliveryPhoneNumber'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      chatRoomId: json['chatRoomId'] as String?,
      pharmacyNotes: json['pharmacyNotes'] as String?,
      patientFollowUpNotes: json['patientFollowUpNotes'] as String?,
      prescriptionHeaderIds: (json['prescriptionHeaderIds'] as List<dynamic>?)
          ?.map((e) => e as int)
          .toList(),
      pharmacyOrderId: json['pharmacyOrderId'] as int?,
      createdAt: _parseDateTime(json['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDateTime(json['updatedAt']),
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) {
      try {
        return DateTime.parse(value);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}
