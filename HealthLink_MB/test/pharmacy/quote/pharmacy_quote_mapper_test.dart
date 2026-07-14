import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_inventory_item.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order_item.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_quote_draft.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_quote_mapper.dart';

void main() {
  group('PharmacyQuoteMapper - toSubmissionItem', () {
    test('derives frequency for new non-prescription timings', () {
      for (final entry in {
        1: (['MORNING'], 'QD'),
        2: (['MORNING', 'EVENING'], 'BID'),
        3: (['MORNING', 'AFTERNOON', 'EVENING'], 'TID'),
      }.entries) {
        final payload = PharmacyQuoteMapper.toSubmissionItem(QuoteLineItem(
          medicineId: entry.key,
          medicationName: 'Medicine ${entry.key}',
          timing: entry.value.$1,
        ));
        expect(payload['frequency'], entry.value.$2);
      }
    });

    test('preserves prescription frequency and legacy timings', () {
      final payload = PharmacyQuoteMapper.toSubmissionItem(QuoteLineItem(
        medicineId: 1,
        medicationName: 'Prescription medicine',
        frequency: 'QHS',
        timing: ['NIGHT'],
        locked: true,
      ));

      expect(payload['frequency'], 'QHS');
      expect(payload['timing'], 'NIGHT');
    });

    test('preserves an unchanged legacy non-prescription item', () {
      final payload = PharmacyQuoteMapper.toSubmissionItem(QuoteLineItem(
        medicineId: 2,
        medicationName: 'Legacy medicine',
        frequency: 'QHS',
        timing: ['NIGHT'],
      ));

      expect(payload['frequency'], 'QHS');
      expect(payload['timing'], 'NIGHT');
    });

    test('derives frequency after a legacy timing is edited', () {
      final payload = PharmacyQuoteMapper.toSubmissionItem(QuoteLineItem(
        medicineId: 3,
        medicationName: 'Edited legacy medicine',
        frequency: 'QHS',
        timing: ['MORNING'],
      ));

      expect(payload['frequency'], 'QD');
      expect(payload['timing'], 'MORNING');
    });

    test('rejects a new item without editable timing before submission', () {
      expect(
        () => PharmacyQuoteMapper.toSubmissionItem(QuoteLineItem(
          medicineId: 4,
          medicationName: 'Unscheduled medicine',
        )),
        throwsArgumentError,
      );
    });

    test('maps prescription source IDs correctly', () {
      final item = QuoteLineItem(
        medicineId: 1,
        inventoryId: 10,
        medicationName: 'Paracetamol',
        unit: 'tablet',
        unitPrice: 5000,
        quantity: 20,
        totalSupplyDays: 10,
        route: 'ORAL',
        frequency: 'BID',
        timing: ['MORNING', 'EVENING'],
        notes: 'After meals',
        sourcePrescriptionHeaderId: 100,
        sourcePrescriptionItemId: 200,
        locked: true,
      );

      final payload = PharmacyQuoteMapper.toSubmissionItem(item);

      expect(payload['medicineId'], 1);
      expect(payload['sourcePrescriptionHeaderId'], 100);
      expect(payload['sourcePrescriptionItemId'], 200);
      expect(payload['quantity'], 20);
      expect(payload['totalSupplyDays'], 10);
      expect(payload['route'], 'ORAL');
      expect(payload['frequency'], 'BID');
      expect(payload['timing'], 'MORNING,EVENING');
      expect(payload['notes'], 'After meals');
      expect(payload.containsKey('medicationName'), isFalse);
      expect(payload.containsKey('unitPrice'), false);
      expect(payload.containsKey('unit'), false);
      expect(payload.containsKey('inventoryId'), false);
    });

    test('maps no-prescription item without source IDs', () {
      final item = QuoteLineItem(
        medicineId: 2,
        inventoryId: 20,
        medicationName: 'Amoxicillin',
        unit: 'capsule',
        unitPrice: 8000,
        quantity: 14,
        totalSupplyDays: 7,
        timing: ['MORNING'],
      );

      final payload = PharmacyQuoteMapper.toSubmissionItem(item);

      expect(payload['medicineId'], 2);
      expect(payload['sourcePrescriptionHeaderId'], null);
      expect(payload['sourcePrescriptionItemId'], null);
      expect(payload['quantity'], 14);
      expect(payload['totalSupplyDays'], 7);
    });

    test('converts timing list to comma-separated string', () {
      final item = QuoteLineItem(
        medicineId: 3,
        medicationName: 'Vitamin C',
        quantity: 30,
        totalSupplyDays: 30,
        timing: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
      );

      final payload = PharmacyQuoteMapper.toSubmissionItem(item);
      expect(payload['timing'], 'MORNING,AFTERNOON,EVENING,NIGHT');
    });

    test('handles empty timing list', () {
      final item = QuoteLineItem(
        medicineId: 4,
        medicationName: 'Ibuprofen',
        quantity: 10,
        totalSupplyDays: 5,
        timing: [],
      );

      expect(
        () => PharmacyQuoteMapper.toSubmissionItem(item),
        throwsArgumentError,
      );
    });

    test('handles null timing list', () {
      final item = QuoteLineItem(
        medicineId: 5,
        medicationName: 'Aspirin',
        quantity: 10,
        totalSupplyDays: 5,
      );

      expect(
        () => PharmacyQuoteMapper.toSubmissionItem(item),
        throwsArgumentError,
      );
    });
  });

  group('PharmacyQuoteMapper - fromInventoryItem', () {
    test('maps inventory item to line item with canonical unit/price', () {
      final inventory = PharmacyInventoryItem(
        inventoryId: 10,
        medicineId: 1,
        medicineName: 'Paracetamol 500mg',
        unit: 'tablet',
        quantity: 100,
        reservedQuantity: 10,
        unitPrice: 5000,
        active: true,
      );

      final lineItem = PharmacyQuoteMapper.fromInventoryItem(inventory);

      expect(lineItem.inventoryId, 10);
      expect(lineItem.medicineId, 1);
      expect(lineItem.medicationName, 'Paracetamol 500mg');
      expect(lineItem.unit, 'tablet');
      expect(lineItem.unitPrice, 5000);
      expect(lineItem.quantity, 1);
      expect(lineItem.totalSupplyDays, 30);
      expect(lineItem.locked, false);
    });

    test('handles inventory item with null fields', () {
      final inventory = PharmacyInventoryItem(
        inventoryId: null,
        medicineId: 0,
        medicineName: 'Generic Medicine',
      );

      final lineItem = PharmacyQuoteMapper.fromInventoryItem(inventory);

      expect(lineItem.inventoryId, isNull);
      expect(lineItem.medicineId, 0);
      expect(lineItem.medicationName, 'Generic Medicine');
      expect(lineItem.unit, isNull);
      expect(lineItem.unitPrice, isNull);
    });
  });

  group('PharmacyQuoteMapper - fromOrderItem', () {
    test('keeps a medicineId-only order item editable', () {
      final orderItem = PharmacyOrderItem(
        orderItemId: 1,
        medicineId: 1,
        medicationName: 'Paracetamol',
        totalSupplyDays: 10,
        quantity: 20,
        unit: 'tablet',
        unitPrice: 5000,
        totalPrice: 100000,
        frequency: 'BID',
        timing: 'MORNING,EVENING',
        route: 'ORAL',
        notes: 'After meals',
      );

      final lineItem = PharmacyQuoteMapper.fromOrderItem(orderItem);

      expect(lineItem.medicineId, 1);
      expect(lineItem.medicationName, 'Paracetamol');
      expect(lineItem.quantity, 20);
      expect(lineItem.totalSupplyDays, 10);
      expect(lineItem.route, 'ORAL');
      expect(lineItem.frequency, 'BID');
      expect(lineItem.timing, ['MORNING', 'EVENING']);
      expect(lineItem.notes, 'After meals');
      expect(lineItem.locked, false);
    });

    test('locks an order item with prescription source markers', () {
      final orderItem = PharmacyOrderItem(
        orderItemId: 1,
        medicineId: 1,
        sourcePrescriptionHeaderId: 100,
        sourcePrescriptionItemId: 200,
        medicationName: 'Paracetamol',
        totalSupplyDays: 10,
        quantity: 20,
        frequency: 'BID',
        timing: 'MORNING,EVENING',
      );

      final lineItem = PharmacyQuoteMapper.fromOrderItem(orderItem);

      expect(lineItem.locked, true);
      expect(lineItem.sourcePrescriptionHeaderId, 100);
      expect(lineItem.sourcePrescriptionItemId, 200);
    });

    test('marks item without medicineId as unlocked', () {
      final orderItem = PharmacyOrderItem(
        orderItemId: 1,
        medicationName: 'Custom Supplement',
        quantity: 1,
        totalSupplyDays: 30,
      );

      final lineItem = PharmacyQuoteMapper.fromOrderItem(orderItem);
      expect(lineItem.medicineId, isNull);
      expect(lineItem.locked, false);
    });

    test('splits timing string into list', () {
      final orderItem = PharmacyOrderItem(
        orderItemId: 1,
        medicationName: 'Test',
        quantity: 1,
        totalSupplyDays: 1,
        timing: 'MORNING,AFTERNOON',
      );

      final lineItem = PharmacyQuoteMapper.fromOrderItem(orderItem);
      expect(lineItem.timing, ['MORNING', 'AFTERNOON']);
    });

    test('handles null timing', () {
      final orderItem = PharmacyOrderItem(
        orderItemId: 1,
        medicationName: 'Test',
        quantity: 1,
        totalSupplyDays: 1,
      );

      final lineItem = PharmacyQuoteMapper.fromOrderItem(orderItem);
      expect(lineItem.timing, isEmpty);
    });
  });

  group('PharmacyQuoteMapper - payload builders', () {
    test('builds create order payload correctly', () {
      final items = [
        QuoteLineItem(
          medicineId: 1,
          medicationName: 'Paracetamol',
          quantity: 20,
          totalSupplyDays: 10,
          timing: ['MORNING'],
        ),
      ];

      final payload = PharmacyQuoteMapper.toCreateOrderPayload(
        items,
        deliveryType: 'DELIVERY',
        deliveryFee: 15000,
        estimatedDeliveryMinutes: 120,
        notes: 'Please deliver in the morning',
      );

      expect(payload['items'], isA<List>());
      expect(payload['deliveryType'], 'DELIVERY');
      expect(payload['deliveryFee'], 15000);
      expect(payload['estimatedDeliveryMinutes'], 120);
      expect(payload['notes'], 'Please deliver in the morning');
    });

    test('builds update quote payload correctly', () {
      final items = [
        QuoteLineItem(
          medicineId: 1,
          medicationName: 'Paracetamol',
          quantity: 30,
          totalSupplyDays: 15,
          timing: ['MORNING'],
        ),
      ];

      final payload = PharmacyQuoteMapper.toUpdateQuotePayload(
        items,
        deliveryFee: 20000,
        estimatedDeliveryMinutes: 120,
      );

      expect(payload['items'], isA<List>());
      expect(payload['deliveryFee'], 20000);
      expect(payload['estimatedDeliveryMinutes'], 120);
    });

    test('handles pickup (no delivery fee/ETA)', () {
      final items = [
        QuoteLineItem(
          medicineId: 1,
          medicationName: 'Paracetamol',
          quantity: 10,
          totalSupplyDays: 5,
          timing: ['MORNING'],
        ),
      ];

      final payload = PharmacyQuoteMapper.toCreateOrderPayload(
        items,
        deliveryType: 'PICKUP',
      );

      expect(payload['deliveryType'], 'PICKUP');
      expect(payload.containsKey('deliveryFee'), false);
      expect(payload.containsKey('estimatedDeliveryMinutes'), false);
    });

    test('pickup payload omits estimatedDeliveryMinutes', () {
      final items = [
        QuoteLineItem(
          medicineId: 1,
          medicationName: 'Paracetamol',
          quantity: 10,
          totalSupplyDays: 5,
          timing: ['MORNING'],
        ),
      ];

      final payload = PharmacyQuoteMapper.toCreateOrderPayload(
        items,
        deliveryType: 'PICKUP',
      );

      expect(payload.containsKey('estimatedDeliveryMinutes'), false);
    });

    test('submission item excludes unit and unitPrice', () {
      final item = QuoteLineItem(
        medicineId: 1,
        medicationName: 'Paracetamol',
        unit: 'tablet',
        unitPrice: 5000,
        quantity: 10,
        totalSupplyDays: 5,
        timing: ['MORNING'],
      );

      final payload = PharmacyQuoteMapper.toSubmissionItem(item);

      expect(payload.containsKey('medicationName'), isFalse);
      expect(payload.containsKey('unit'), isFalse);
      expect(payload.containsKey('unitPrice'), isFalse);
      expect(payload.containsKey('inventoryId'), isFalse);
      expect(payload['medicineId'], 1);
      expect(payload['quantity'], 10);
    });
  });
}
