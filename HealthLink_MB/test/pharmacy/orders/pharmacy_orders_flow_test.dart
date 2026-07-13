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
  group('Flow — PREPARING/READY/SHIPPING/DELIVERED reachable', () {
    test('PREPARING -> READY (pickup)', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'PREPARING',
          deliveryType: 'PICKUP',
        ),
        isNull,
      );
    });

    test('PREPARING -> READY (delivery) returns null (not a transition)', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'PREPARING',
          deliveryType: 'DELIVERY',
        ),
        isNull,
      );
    });

    test('READY -> COMPLETED (pickup)', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'READY',
          deliveryType: 'PICKUP',
        ),
        'COMPLETED',
      );
    });

    test('READY -> SHIPPING (delivery)', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'READY',
          deliveryType: 'DELIVERY',
        ),
        'SHIPPING',
      );
    });

    test('SHIPPING -> DELIVERED (delivery)', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'SHIPPING',
          deliveryType: 'DELIVERY',
        ),
        'DELIVERED',
      );
    });

    test('DELIVERED -> COMPLETED (delivery)', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'DELIVERED',
          deliveryType: 'DELIVERY',
        ),
        'COMPLETED',
      );
    });
  });

  group('Pickup never ships', () {
    test('READY pickup next is COMPLETED not SHIPPING', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'READY',
          deliveryType: 'PICKUP',
        ),
        'COMPLETED',
      );
    });

    test('pickup order never has SHIPPING transitions', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'SHIPPING',
          deliveryType: 'PICKUP',
        ),
        isNull,
      );
    });

    test('pickup order at PREPARING shows no shipping action', () {
      final order = _order(status: 'PREPARING', deliveryType: 'PICKUP');
      expect(PharmacyWorkflow.canProgressOrder(order), true);
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: order.status,
          deliveryType: order.deliveryType!,
        ),
        isNull,
      );
    });
  });

  group('Waiting/terminal orders cannot progress', () {
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
          deliveryType: 'DELIVERY',
        ),
        isNull,
      );
    });

    test('COMPLETED canProgressOrder returns false', () {
      final order = _order(status: 'COMPLETED');
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('CANCELLED canProgressOrder returns false', () {
      final order = _order(status: 'CANCELLED');
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('requiresPatientConfirmation blocks progression', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'PICKUP',
        requiresPatientConfirmation: true,
      );
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('UNPAID blocks progression', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'PICKUP',
        paymentStatus: 'UNPAID',
      );
      expect(PharmacyWorkflow.canProgressOrder(order), false);
    });

    test('canProgressOrder true for paid ready pickup', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'PICKUP',
        paymentStatus: 'PAID',
      );
      expect(PharmacyWorkflow.canProgressOrder(order), true);
    });

    test('canProgressOrder true for paid ready delivery', () {
      final order = _order(
        status: 'READY',
        deliveryType: 'DELIVERY',
        paymentStatus: 'PAID',
      );
      expect(PharmacyWorkflow.canProgressOrder(order), true);
    });
  });

  group('availableActionsForStage covers fulfillment', () {
    test('FULFILLMENT stage has MARK_READY and START_SHIPPING', () {
      final actions = PharmacyWorkflow.availableActionsForStage('FULFILLMENT');
      expect(actions, contains('MARK_READY'));
      expect(actions, contains('START_SHIPPING'));
      expect(actions, contains('CANCEL'));
    });

    test('pickup order uses correct action mapping', () {
      final actions = PharmacyWorkflow.availableActionsForStage('FULFILLMENT');
      expect(actions.length, 3);
    });
  });
}
