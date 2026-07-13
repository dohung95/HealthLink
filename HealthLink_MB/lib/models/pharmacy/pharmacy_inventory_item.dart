class PharmacyInventoryItem {
  final int? inventoryId;
  final int medicineId;
  final String medicationName;
  final int quantityInStock;
  final int? reorderLevel;
  final double? unitPrice;
  final String? unit;
  final String? expiryDate;
  final String? manufacturer;

  const PharmacyInventoryItem({
    this.inventoryId,
    required this.medicineId,
    required this.medicationName,
    required this.quantityInStock,
    this.reorderLevel,
    this.unitPrice,
    this.unit,
    this.expiryDate,
    this.manufacturer,
  });

  factory PharmacyInventoryItem.fromJson(Map<String, dynamic> json) {
    return PharmacyInventoryItem(
      inventoryId: json['inventoryId'] as int?,
      medicineId: json['medicineId'] as int? ?? 0,
      medicationName: json['medicationName'] as String? ?? '',
      quantityInStock: json['quantityInStock'] as int? ?? 0,
      reorderLevel: json['reorderLevel'] as int?,
      unitPrice: (json['unitPrice'] as num?)?.toDouble(),
      unit: json['unit'] as String?,
      expiryDate: json['expiryDate'] as String?,
      manufacturer: json['manufacturer'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'inventoryId': inventoryId,
      'medicineId': medicineId,
      'medicationName': medicationName,
      'quantityInStock': quantityInStock,
      'reorderLevel': reorderLevel,
      'unitPrice': unitPrice,
      'unit': unit,
      'expiryDate': expiryDate,
      'manufacturer': manufacturer,
    };
  }
}
