import '../../models/pharmacy/pharmacy_inventory_item.dart';
import '../../models/pharmacy/pharmacy_order_item.dart';
import '../../models/pharmacy/pharmacy_quote_draft.dart';
import 'pharmacy_medication_schedule.dart';

class PharmacyQuoteMapper {
  PharmacyQuoteMapper._();

  static Map<String, dynamic> toSubmissionItem(QuoteLineItem item) {
    final map = <String, dynamic>{
      'medicineId': item.medicineId,
      'quantity': item.quantity,
      'totalSupplyDays': item.totalSupplyDays,
    };
    if (item.route != null) map['route'] = item.route;

    final hasLegacyNight = item.timing.any(
      (timing) => timing.trim().toUpperCase() == 'NIGHT',
    );
    final isPrescription = item.locked ||
        item.sourcePrescriptionHeaderId != null ||
        item.sourcePrescriptionItemId != null;
    if (isPrescription || hasLegacyNight) {
      if (item.frequency != null) map['frequency'] = item.frequency;
      if (item.timing.isNotEmpty) map['timing'] = item.timing.join(',');
    } else {
      final normalizedTimings =
          PharmacyMedicationSchedule.normalizeTimings(item.timing);
      map['frequency'] =
          PharmacyMedicationSchedule.deriveFrequency(normalizedTimings);
      map['timing'] = normalizedTimings.join(',');
    }
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

  static QuoteLineItem fromPrescriptionItem(
    Map<String, dynamic> item,
    int prescriptionHeaderId,
  ) {
    return QuoteLineItem(
      medicineId: item['medicineId'] as int?,
      sourcePrescriptionHeaderId: prescriptionHeaderId,
      sourcePrescriptionItemId: item['prescriptionItemId'] as int?,
      medicationName: item['medicationName'] as String? ?? '',
      unit: item['unit'] as String?,
      unitPrice: (item['unitPrice'] as num?)?.toDouble(),
      quantity: item['quantity'] as int? ?? 1,
      totalSupplyDays: item['totalSupplyDays'] as int? ?? 30,
      route: item['route'] as String?,
      frequency: item['frequency'] as String?,
      timing: item['timings'] != null
          ? (item['timings'] as List).cast<String>()
          : (item['timing'] != null
              ? [item['timing'] as String]
              : <String>[]),
      notes: item['notes'] as String?,
      locked: true,
    );
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
      sourcePrescriptionHeaderId: orderItem.sourcePrescriptionHeaderId,
      sourcePrescriptionItemId: orderItem.sourcePrescriptionItemId,
      medicationName: orderItem.medicationName,
      quantity: orderItem.quantity,
      totalSupplyDays: orderItem.totalSupplyDays ?? 30,
      route: orderItem.route,
      frequency: orderItem.frequency,
      timing: orderItem.timing != null && orderItem.timing!.isNotEmpty
          ? orderItem.timing!.split(',')
          : [],
      notes: orderItem.notes,
      locked: orderItem.sourcePrescriptionHeaderId != null ||
          orderItem.sourcePrescriptionItemId != null,
    );
  }

  static Map<String, dynamic> toCreateOrderPayload(
    List<QuoteLineItem> items, {
    String? deliveryType,
    String? deliveryAddress,
    double? deliveryFee,
    int? estimatedDeliveryMinutes,
    String? deliveryPhoneNumber,
    String? notes,
  }) {
    final payload = <String, dynamic>{
      'items': toSubmissionItems(items),
    };
    if (deliveryType != null) payload['deliveryType'] = deliveryType;
    if (deliveryAddress != null) payload['deliveryAddress'] = deliveryAddress;
    if (deliveryFee != null) payload['deliveryFee'] = deliveryFee;
    if (estimatedDeliveryMinutes != null) {
      payload['estimatedDeliveryMinutes'] = estimatedDeliveryMinutes;
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
    int? estimatedDeliveryMinutes,
  }) {
    final payload = <String, dynamic>{
      'items': toSubmissionItems(items),
    };
    if (deliveryFee != null) payload['deliveryFee'] = deliveryFee;
    if (estimatedDeliveryMinutes != null) {
      payload['estimatedDeliveryMinutes'] = estimatedDeliveryMinutes;
    }
    return payload;
  }
}
