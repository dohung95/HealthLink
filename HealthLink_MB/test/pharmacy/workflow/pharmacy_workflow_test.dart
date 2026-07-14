import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_workflow.dart';

PharmacyOrder _order({
  required String status,
  String deliveryType = 'PICKUP',
  String? paymentStatus = 'PAID',
  bool? requiresPatientConfirmation = false,
}) {
  return PharmacyOrder(
    orderId: 1,
    orderNumber: 'ORD-001',
    pharmacyId: 'pharm-1',
    pharmacyName: 'Pharmacy 1',
    patientId: 'pat-1',
    patientName: 'Patient 1',
    status: status,
    deliveryType: deliveryType,
    paymentStatus: paymentStatus,
    requiresPatientConfirmation: requiresPatientConfirmation,
    medicineAmount: 100,
    totalAmount: 100,
    items: [],
    createdAt: DateTime.now(),
  );
}

void main() {
  group('getNextOrderStatus', () {
    test('pickup: READY -> COMPLETED', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'READY',
          deliveryType: 'PICKUP',
        ),
        'COMPLETED',
      );
    });

    test('delivery: READY -> SHIPPING', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'READY',
          deliveryType: 'DELIVERY',
        ),
        'SHIPPING',
      );
    });

    test('delivery: SHIPPING -> DELIVERED', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'SHIPPING',
          deliveryType: 'DELIVERY',
        ),
        'DELIVERED',
      );
    });

    test('delivery: DELIVERED -> COMPLETED', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'DELIVERED',
          deliveryType: 'DELIVERY',
        ),
        'COMPLETED',
      );
    });

    test('COMPLETED terminal returns null', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'COMPLETED',
          deliveryType: 'PICKUP',
        ),
        isNull,
      );
    });

    test('CANCELLED terminal returns null', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'CANCELLED',
          deliveryType: 'PICKUP',
        ),
        isNull,
      );
    });

    test('PENDING returns null', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'PENDING',
          deliveryType: 'PICKUP',
        ),
        isNull,
      );
    });
  });

  group('canProgressOrder', () {
    test('COMPLETED order returns false', () {
      final order = _order(status: 'COMPLETED');
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('CANCELLED order returns false', () {
      final order = _order(status: 'CANCELLED');
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('order with requiresPatientConfirmation=true returns false', () {
      final order = _order(
        status: 'READY',
        requiresPatientConfirmation: true,
      );
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('unpaid delivery order returns false', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'DELIVERY',
        paymentStatus: 'UNPAID',
      );
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('unpaid pickup order returns false', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'PICKUP',
        paymentStatus: 'UNPAID',
      );
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('paid ready pickup order returns true', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'PICKUP',
        paymentStatus: 'PAID',
      );
      expect(PharmacyWorkflow.canProgressOrder(order), true);
    });

    test('paid ready delivery order returns true', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'DELIVERY',
        paymentStatus: 'PAID',
      );
      expect(PharmacyWorkflow.canProgressOrder(order), true);
    });

    test('null paymentStatus returns false for fulfillment status', () {
      final order = _order(
        status: 'READY',
        paymentStatus: null,
      );
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('null paymentStatus non-fulfillment status returns true', () {
      final order = _order(
        status: 'PENDING',
        paymentStatus: null,
      );
      expect(PharmacyWorkflow.canProgressOrder(order), true);
    });
  });

  group('workflowLabel', () {
    test('returns readable label for READY', () {
      expect(PharmacyWorkflow.workflowLabel('READY'), 'Ready');
    });

    test('returns readable label for SHIPPING', () {
      expect(PharmacyWorkflow.workflowLabel('SHIPPING'), 'Shipping');
    });

    test('returns readable label for COMPLETED', () {
      expect(PharmacyWorkflow.workflowLabel('COMPLETED'), 'Completed');
    });
  });

  group('paymentLabel', () {
    test('returns Việt Nam đồng for UNPAID', () {
      expect(PharmacyWorkflow.paymentLabel('UNPAID'), 'Unpaid');
    });

    test('returns readable label for PAID', () {
      expect(PharmacyWorkflow.paymentLabel('PAID'), 'Paid');
    });
  });

  group('fulfillmentLabel', () {
    test('returns readable for PICKUP', () {
      expect(PharmacyWorkflow.fulfillmentLabel('PICKUP'), 'Pickup');
    });

    test('returns readable for DELIVERY', () {
      expect(PharmacyWorkflow.fulfillmentLabel('DELIVERY'), 'Delivery');
    });
  });

  group('availableActionsForStage', () {
    test('returns actions for REVIEW stage', () {
      final actions = PharmacyWorkflow.availableActionsForStage('REVIEW');
      expect(actions, contains('ACCEPT'));
      expect(actions, contains('REJECT'));
    });

    test('returns actions for FULFILLMENT stage', () {
      final actions = PharmacyWorkflow.availableActionsForStage('FULFILLMENT');
      expect(actions, contains('MARK_READY'));
      expect(actions, contains('START_SHIPPING'));
    });

    test('returns empty for unknown stage', () {
      expect(PharmacyWorkflow.availableActionsForStage('UNKNOWN'), isEmpty);
    });
  });
}
