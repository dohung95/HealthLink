import 'pharmacy_order_item.dart';

class PharmacyOrder {
  final int orderId;
  final String orderNumber;
  final int? prescriptionHeaderId;
  final int? pharmacyRequestId;
  final String? doctorName;
  final String pharmacyId;
  final String pharmacyName;
  final String? pharmacyPhone;
  final String patientId;
  final String patientName;
  final String status;
  final String? deliveryType;
  final String? deliveryAddress;
  final double? deliveryLatitude;
  final double? deliveryLongitude;
  final String? deliveryPhoneNumber;
  final double medicineAmount;
  final double? deliveryFee;
  final double totalAmount;
  final String? paymentStatus;
  final String? paymentMethod;
  final String? notes;
  final String? pharmacistNotes;
  final List<PharmacyOrderItem> items;
  final DateTime? estimatedDeliveryTime;
  final DateTime? confirmedAt;
  final DateTime? preparingAt;
  final DateTime? shippedAt;
  final DateTime? deliveredAt;
  final DateTime? cancelledAt;
  final String? cancelReason;
  final String? cancelledBy;
  final DateTime? revisionRequestedAt;
  final String? revisionRequestNotes;
  final DateTime? revisionResolvedAt;
  final bool? requiresPatientConfirmation;
  final DateTime? paidAt;
  final DateTime createdAt;
  final double? platformFee;
  final double? pharmacyEarning;

  const PharmacyOrder({
    required this.orderId,
    required this.orderNumber,
    this.prescriptionHeaderId,
    this.pharmacyRequestId,
    this.doctorName,
    required this.pharmacyId,
    required this.pharmacyName,
    this.pharmacyPhone,
    required this.patientId,
    required this.patientName,
    required this.status,
    this.deliveryType,
    this.deliveryAddress,
    this.deliveryLatitude,
    this.deliveryLongitude,
    this.deliveryPhoneNumber,
    this.medicineAmount = 0,
    this.deliveryFee,
    this.totalAmount = 0,
    this.paymentStatus,
    this.paymentMethod,
    this.notes,
    this.pharmacistNotes,
    this.items = const [],
    this.estimatedDeliveryTime,
    this.confirmedAt,
    this.preparingAt,
    this.shippedAt,
    this.deliveredAt,
    this.cancelledAt,
    this.cancelReason,
    this.cancelledBy,
    this.revisionRequestedAt,
    this.revisionRequestNotes,
    this.revisionResolvedAt,
    this.requiresPatientConfirmation,
    this.paidAt,
    required this.createdAt,
    this.platformFee,
    this.pharmacyEarning,
  });

  factory PharmacyOrder.fromJson(Map<String, dynamic> json) {
    return PharmacyOrder(
      orderId: json['orderId'] as int? ?? 0,
      orderNumber: json['orderNumber'] as String? ?? '',
      prescriptionHeaderId: json['prescriptionHeaderId'] as int?,
      pharmacyRequestId: json['pharmacyRequestId'] as int?,
      doctorName: json['doctorName'] as String?,
      pharmacyId: json['pharmacyId'] as String? ?? '',
      pharmacyName: json['pharmacyName'] as String? ?? '',
      pharmacyPhone: json['pharmacyPhone'] as String?,
      patientId: json['patientId'] as String? ?? '',
      patientName: json['patientName'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      deliveryType: json['deliveryType'] as String?,
      deliveryAddress: json['deliveryAddress'] as String?,
      deliveryLatitude: (json['deliveryLatitude'] as num?)?.toDouble(),
      deliveryLongitude: (json['deliveryLongitude'] as num?)?.toDouble(),
      deliveryPhoneNumber: json['deliveryPhoneNumber'] as String?,
      medicineAmount: (json['medicineAmount'] as num?)?.toDouble() ?? 0,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble(),
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
      paymentStatus: json['paymentStatus'] as String?,
      paymentMethod: json['paymentMethod'] as String?,
      notes: json['notes'] as String?,
      pharmacistNotes: json['pharmacistNotes'] as String?,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => PharmacyOrderItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      estimatedDeliveryTime: _parseDateTime(json['estimatedDeliveryTime']),
      confirmedAt: _parseDateTime(json['confirmedAt']),
      preparingAt: _parseDateTime(json['preparingAt']),
      shippedAt: _parseDateTime(json['shippedAt']),
      deliveredAt: _parseDateTime(json['deliveredAt']),
      cancelledAt: _parseDateTime(json['cancelledAt']),
      cancelReason: json['cancelReason'] as String?,
      cancelledBy: json['cancelledBy'] as String?,
      revisionRequestedAt: _parseDateTime(json['revisionRequestedAt']),
      revisionRequestNotes: json['revisionRequestNotes'] as String?,
      revisionResolvedAt: _parseDateTime(json['revisionResolvedAt']),
      requiresPatientConfirmation:
          json['requiresPatientConfirmation'] as bool?,
      paidAt: _parseDateTime(json['paidAt']),
      createdAt: _parseDateTime(json['createdAt']) ?? DateTime.now(),
      platformFee: (json['platformFee'] as num?)?.toDouble(),
      pharmacyEarning: (json['pharmacyEarning'] as num?)?.toDouble(),
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
      'orderId': orderId,
      'orderNumber': orderNumber,
      'status': status,
      'patientName': patientName,
      'pharmacyName': pharmacyName,
      'medicineAmount': medicineAmount,
      'deliveryFee': deliveryFee,
      'totalAmount': totalAmount,
      'paymentStatus': paymentStatus,
    };
  }
}
