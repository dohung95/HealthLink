class QuoteLineItem {
  int? medicineId;
  int? inventoryId;
  String medicationName;
  String? unit;
  double? unitPrice;
  int quantity;
  int totalSupplyDays;
  String? route;
  String? frequency;
  List<String> timing;
  String? notes;
  int? sourcePrescriptionHeaderId;
  int? sourcePrescriptionItemId;
  bool locked;

  QuoteLineItem({
    this.medicineId,
    this.inventoryId,
    required this.medicationName,
    this.unit,
    this.unitPrice,
    this.quantity = 1,
    this.totalSupplyDays = 30,
    this.route,
    this.frequency,
    this.timing = const [],
    this.notes,
    this.sourcePrescriptionHeaderId,
    this.sourcePrescriptionItemId,
    this.locked = false,
  });

  QuoteLineItem copyWith({
    int? medicineId,
    int? inventoryId,
    String? medicationName,
    String? unit,
    double? unitPrice,
    int? quantity,
    int? totalSupplyDays,
    String? route,
    String? frequency,
    List<String>? timing,
    String? notes,
    int? sourcePrescriptionHeaderId,
    int? sourcePrescriptionItemId,
    bool? locked,
  }) {
    return QuoteLineItem(
      medicineId: medicineId ?? this.medicineId,
      inventoryId: inventoryId ?? this.inventoryId,
      medicationName: medicationName ?? this.medicationName,
      unit: unit ?? this.unit,
      unitPrice: unitPrice ?? this.unitPrice,
      quantity: quantity ?? this.quantity,
      totalSupplyDays: totalSupplyDays ?? this.totalSupplyDays,
      route: route ?? this.route,
      frequency: frequency ?? this.frequency,
      timing: timing ?? this.timing,
      notes: notes ?? this.notes,
      sourcePrescriptionHeaderId:
          sourcePrescriptionHeaderId ?? this.sourcePrescriptionHeaderId,
      sourcePrescriptionItemId:
          sourcePrescriptionItemId ?? this.sourcePrescriptionItemId,
      locked: locked ?? this.locked,
    );
  }
}
