class PharmacyOrderItem {
  final int? orderItemId;
  final int? medicineId;
  final String medicationName;
  final int? totalSupplyDays;
  final int quantity;
  final String? unit;
  final String? frequency;
  final String? timing;
  final String? route;
  final double? unitPrice;
  final double? totalPrice;
  final String? notes;

  const PharmacyOrderItem({
    this.orderItemId,
    this.medicineId,
    required this.medicationName,
    this.totalSupplyDays,
    required this.quantity,
    this.unit,
    this.frequency,
    this.timing,
    this.route,
    this.unitPrice,
    this.totalPrice,
    this.notes,
  });

  factory PharmacyOrderItem.fromJson(Map<String, dynamic> json) {
    return PharmacyOrderItem(
      orderItemId: json['orderItemId'] as int?,
      medicineId: json['medicineId'] as int?,
      medicationName: json['medicationName'] as String? ?? '',
      totalSupplyDays: json['totalSupplyDays'] as int?,
      quantity: json['quantity'] as int? ?? 1,
      unit: json['unit'] as String?,
      frequency: json['frequency'] as String?,
      timing: json['timing'] as String?,
      route: json['route'] as String?,
      unitPrice: (json['unitPrice'] as num?)?.toDouble(),
      totalPrice: (json['totalPrice'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'medicineId': medicineId,
      'medicationName': medicationName,
      'totalSupplyDays': totalSupplyDays,
      'quantity': quantity,
      'unit': unit,
      'frequency': frequency,
      'timing': timing,
      'route': route,
      'unitPrice': unitPrice,
    };
  }
}
