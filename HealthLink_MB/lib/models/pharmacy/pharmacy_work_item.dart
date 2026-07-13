enum WorkItemSourceType {
  consultation,
  revision,
  deliveryQuote,
  deliveryContactReview,
  pickupOrder,
  deliveryOrder;

  static WorkItemSourceType fromString(String value) {
    switch (value.toUpperCase()) {
      case 'CONSULTATION':
        return WorkItemSourceType.consultation;
      case 'REVISION':
        return WorkItemSourceType.revision;
      case 'DELIVERY_QUOTE':
        return WorkItemSourceType.deliveryQuote;
      case 'DELIVERY_CONTACT_REVIEW':
        return WorkItemSourceType.deliveryContactReview;
      case 'PICKUP_ORDER':
        return WorkItemSourceType.pickupOrder;
      case 'DELIVERY_ORDER':
        return WorkItemSourceType.deliveryOrder;
      default:
        return WorkItemSourceType.consultation;
    }
  }

  String get value {
    switch (this) {
      case WorkItemSourceType.consultation:
        return 'CONSULTATION';
      case WorkItemSourceType.revision:
        return 'REVISION';
      case WorkItemSourceType.deliveryQuote:
        return 'DELIVERY_QUOTE';
      case WorkItemSourceType.deliveryContactReview:
        return 'DELIVERY_CONTACT_REVIEW';
      case WorkItemSourceType.pickupOrder:
        return 'PICKUP_ORDER';
      case WorkItemSourceType.deliveryOrder:
        return 'DELIVERY_ORDER';
    }
  }
}

class PharmacyWorkItem {
  final String id;
  final String pharmacyId;
  final int sourceId;
  final WorkItemSourceType sourceType;
  final String workflowStage;
  final List<String> availableActions;
  final String patientId;
  final String patientName;
  final int? requestId;
  final int? orderId;
  final String? requestStatus;
  final String? orderStatus;
  final bool? requiresPatientConfirmation;
  final String? paymentStatus;
  final double? paidAmount;
  final String? revisionReason;
  final DateTime? revisionRequestedAt;
  final String? deliveryType;
  final double? deliveryFee;
  final double? medicineAmount;
  final double? totalAmount;
  final String? deliveryAddress;
  final String? deliveryPhoneNumber;
  final double? deliveryLatitude;
  final double? deliveryLongitude;
  final String? notes;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const PharmacyWorkItem({
    required this.id,
    required this.pharmacyId,
    required this.sourceId,
    required this.sourceType,
    required this.workflowStage,
    required this.availableActions,
    required this.patientId,
    required this.patientName,
    this.requestId,
    this.orderId,
    this.requestStatus,
    this.orderStatus,
    this.requiresPatientConfirmation,
    this.paymentStatus,
    this.paidAmount,
    this.revisionReason,
    this.revisionRequestedAt,
    this.deliveryType,
    this.deliveryFee,
    this.medicineAmount,
    this.totalAmount,
    this.deliveryAddress,
    this.deliveryPhoneNumber,
    this.deliveryLatitude,
    this.deliveryLongitude,
    this.notes,
    required this.createdAt,
    this.updatedAt,
  });

  factory PharmacyWorkItem.fromJson(Map<String, dynamic> json) {
    return PharmacyWorkItem(
      id: json['id'] as String? ?? '',
      pharmacyId: json['pharmacyId'] as String? ?? '',
      sourceId: json['sourceId'] as int? ?? 0,
      sourceType:
          WorkItemSourceType.fromString(json['sourceType'] as String? ?? ''),
      workflowStage: json['workflowStage'] as String? ?? '',
      availableActions: (json['availableActions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      patientId: json['patientId'] as String? ?? '',
      patientName: json['patientName'] as String? ?? '',
      requestId: json['requestId'] as int?,
      orderId: json['orderId'] as int?,
      requestStatus: json['requestStatus'] as String?,
      orderStatus: json['orderStatus'] as String?,
      requiresPatientConfirmation:
          json['requiresPatientConfirmation'] as bool?,
      paymentStatus: json['paymentStatus'] as String?,
      paidAmount: (json['paidAmount'] as num?)?.toDouble(),
      revisionReason: json['revisionReason'] as String?,
      revisionRequestedAt: _parseDateTime(json['revisionRequestedAt']),
      deliveryType: json['deliveryType'] as String?,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble(),
      medicineAmount: (json['medicineAmount'] as num?)?.toDouble(),
      totalAmount: (json['totalAmount'] as num?)?.toDouble(),
      deliveryAddress: json['deliveryAddress'] as String?,
      deliveryPhoneNumber: json['deliveryPhoneNumber'] as String?,
      deliveryLatitude: (json['deliveryLatitude'] as num?)?.toDouble(),
      deliveryLongitude: (json['deliveryLongitude'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
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

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'pharmacyId': pharmacyId,
      'sourceId': sourceId,
      'sourceType': sourceType.value,
      'workflowStage': workflowStage,
      'availableActions': availableActions,
      'patientId': patientId,
      'patientName': patientName,
      'requestId': requestId,
      'orderId': orderId,
      'requestStatus': requestStatus,
      'orderStatus': orderStatus,
      'requiresPatientConfirmation': requiresPatientConfirmation,
      'paymentStatus': paymentStatus,
      'paidAmount': paidAmount,
      'revisionReason': revisionReason,
      'revisionRequestedAt': revisionRequestedAt?.toIso8601String(),
      'deliveryType': deliveryType,
      'deliveryFee': deliveryFee,
      'medicineAmount': medicineAmount,
      'totalAmount': totalAmount,
      'deliveryAddress': deliveryAddress,
      'deliveryPhoneNumber': deliveryPhoneNumber,
      'deliveryLatitude': deliveryLatitude,
      'deliveryLongitude': deliveryLongitude,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}
