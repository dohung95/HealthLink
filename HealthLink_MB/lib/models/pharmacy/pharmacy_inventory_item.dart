class PharmacyInventoryItem {
  final int? inventoryId;
  final int medicineId;
  final String medicineName;
  final String? genericName;
  final String? dosageForm;
  final String? category;
  final String? strength;
  final String? unit;
  final int quantity;
  final int reservedQuantity;
  final double? unitPrice;
  final String? expiryDate;
  final bool active;
  final int? minimumStock;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const PharmacyInventoryItem({
    this.inventoryId,
    required this.medicineId,
    required this.medicineName,
    this.genericName,
    this.dosageForm,
    this.category,
    this.strength,
    this.unit,
    this.quantity = 0,
    this.reservedQuantity = 0,
    this.unitPrice,
    this.expiryDate,
    this.active = true,
    this.minimumStock,
    this.createdAt,
    this.updatedAt,
  });

  int get availableQuantity => quantity - reservedQuantity;

  bool get isLowStock => minimumStock != null && quantity < minimumStock!;

  bool get isExpiringSoon {
    if (expiryDate == null) return false;
    try {
      final expiry = DateTime.parse(expiryDate!);
      return expiry.difference(DateTime.now()).inDays <= 30;
    } catch (_) {
      return false;
    }
  }

  factory PharmacyInventoryItem.fromJson(Map<String, dynamic> json) {
    return PharmacyInventoryItem(
      inventoryId: json['inventoryId'] as int?,
      medicineId: json['medicineId'] as int? ?? 0,
      medicineName: json['medicineName'] as String? ??
          json['medicationName'] as String? ??
          '',
      genericName: json['genericName'] as String?,
      dosageForm: json['dosageForm'] as String?,
      category: json['category'] as String?,
      strength: json['strength'] as String?,
      unit: json['unit'] as String?,
      quantity: json['quantity'] as int? ??
          json['quantityInStock'] as int? ??
          json['onHandQuantity'] as int? ??
          0,
      reservedQuantity: json['reservedQuantity'] as int? ?? 0,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ??
          (json['price'] as num?)?.toDouble(),
      expiryDate: json['expiryDate'] as String?,
      active: json['active'] as bool? ?? true,
      minimumStock: json['minimumStock'] as int? ??
          json['reorderLevel'] as int?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (inventoryId != null) 'inventoryId': inventoryId,
      'medicineId': medicineId,
      'medicineName': medicineName,
      if (genericName != null) 'genericName': genericName,
      if (dosageForm != null) 'dosageForm': dosageForm,
      if (category != null) 'category': category,
      if (strength != null) 'strength': strength,
      if (unit != null) 'unit': unit,
      'quantity': quantity,
      'reservedQuantity': reservedQuantity,
      if (unitPrice != null) 'unitPrice': unitPrice,
      if (expiryDate != null) 'expiryDate': expiryDate,
      'active': active,
      if (minimumStock != null) 'minimumStock': minimumStock,
    };
  }

  PharmacyInventoryItem copyWith({
    int? quantity,
    int? reservedQuantity,
    double? unitPrice,
    String? unit,
    String? expiryDate,
    bool? active,
    int? minimumStock,
  }) {
    return PharmacyInventoryItem(
      inventoryId: inventoryId,
      medicineId: medicineId,
      medicineName: medicineName,
      genericName: genericName,
      dosageForm: dosageForm,
      category: category,
      strength: strength,
      unit: unit ?? this.unit,
      quantity: quantity ?? this.quantity,
      reservedQuantity: reservedQuantity ?? this.reservedQuantity,
      unitPrice: unitPrice ?? this.unitPrice,
      expiryDate: expiryDate ?? this.expiryDate,
      active: active ?? this.active,
      minimumStock: minimumStock ?? this.minimumStock,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
