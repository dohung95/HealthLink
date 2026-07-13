import '../../models/pharmacy/pharmacy_inventory_item.dart';
import '../../models/pharmacy/pharmacy_order_item.dart';
import '../../models/pharmacy/pharmacy_quote_draft.dart';

class PharmacyQuoteMapper {
  PharmacyQuoteMapper._();

  static Map<String, dynamic> toSubmissionItem(QuoteLineItem item) {
    final map = <String, dynamic>{
      'medicineId': item.medicineId,
      'medicationName': item.medicationName,
      'quantity': item.quantity,
      'totalSupplyDays': item.totalSupplyDays,
    };
    if (item.route != null) map['route'] = item.route;
    if (item.frequency != null) map['frequency'] = item.frequency;
    if (item.timing.isNotEmpty) map['timing'] = item.timing.join(',');
    if (item.notes != null) map['notes'] = item.notes;
    if (item.sourcePrescriptionHeaderId != null) {
      map['sourcePrescriptionHeaderId'] = item.sourcePrescriptionHeaderId;
    }
    if (item.sourcePrescriptionItemId != null) {
      map['sourcePrescriptionItemId'] = item.sourcePrescriptionItemId;
    }
    return map;
  }

  static List<Map<String, dynamic>> toSubmissionItems(
      List<QuoteLineItem> items) {
    return items.map(toSubmissionItem).toList();
  }

  static QuoteLineItem fromInventoryItem(PharmacyInventoryItem inventory) {
    return QuoteLineItem(
      medicineId: inventory.medicineId,
      inventoryId: inventory.inventoryId,
      medicationName: inventory.medicineName,
      unit: inventory.unit,
      unitPrice: inventory.unitPrice,
      quantity: 1,
      totalSupplyDays: 30,
    );
  }

  static QuoteLineItem fromOrderItem(PharmacyOrderItem orderItem) {
    return QuoteLineItem(
      medicineId: orderItem.medicineId,
      medicationName: orderItem.medicationName,
      quantity: orderItem.quantity,
      totalSupplyDays: orderItem.totalSupplyDays ?? 30,
      route: orderItem.route,
      frequency: orderItem.frequency,
      timing: orderItem.timing != null && orderItem.timing!.isNotEmpty
          ? orderItem.timing!.split(',')
          : [],
      notes: orderItem.notes,
      locked: orderItem.medicineId != null,
    );
  }

  static Map<String, dynamic> toCreateOrderPayload(
    List<QuoteLineItem> items, {
    String? deliveryType,
    String? deliveryAddress,
    double? deliveryFee,
    DateTime? estimatedDeliveryTime,
    String? deliveryPhoneNumber,
    String? notes,
  }) {
    final payload = <String, dynamic>{
      'items': toSubmissionItems(items),
    };
    if (deliveryType != null) payload['deliveryType'] = deliveryType;
    if (deliveryAddress != null) payload['deliveryAddress'] = deliveryAddress;
    if (deliveryFee != null) payload['deliveryFee'] = deliveryFee;
    if (estimatedDeliveryTime != null) {
      payload['estimatedDeliveryTime'] =
          estimatedDeliveryTime.toIso8601String();
    }
    if (deliveryPhoneNumber != null) {
      payload['deliveryPhoneNumber'] = deliveryPhoneNumber;
    }
    if (notes != null) payload['notes'] = notes;
    return payload;
  }

  static Map<String, dynamic> toUpdateQuotePayload(
    List<QuoteLineItem> items, {
    double? deliveryFee,
    DateTime? estimatedDeliveryTime,
  }) {
    final payload = <String, dynamic>{
      'items': toSubmissionItems(items),
    };
    if (deliveryFee != null) payload['deliveryFee'] = deliveryFee;
    if (estimatedDeliveryTime != null) {
      payload['estimatedDeliveryTime'] =
          estimatedDeliveryTime.toIso8601String();
    }
    return payload;
  }
}
