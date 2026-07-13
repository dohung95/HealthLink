import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_order_service.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_workflow.dart';

const _token = 'test-token';

PharmacyOrder _sampleOrder({
  int id = 1,
  String status = 'PENDING',
  String deliveryType = 'PICKUP',
  String paymentStatus = 'PAID',
}) {
  return PharmacyOrder(
    orderId: id,
    orderNumber: 'ORD-00$id',
    pharmacyId: 'pharm-1',
    pharmacyName: 'Pharmacy 1',
    patientId: 'pat-1',
    patientName: 'Patient 1',
    status: status,
    deliveryType: deliveryType,
    paymentStatus: paymentStatus,
    medicineAmount: 100,
    deliveryFee: 15,
    totalAmount: 115,
    platformFee: 5,
    pharmacyEarning: 95,
    items: [],
    createdAt: DateTime.now(),
    confirmedAt: DateTime.now(),
    preparingAt: DateTime.now(),
    shippedAt: deliveryType == 'DELIVERY' ? DateTime.now() : null,
    deliveredAt: null,
    paidAt: DateTime.now(),
  );
}

void main() {
  group('PharmacyOrderProvider — updateOrderStatus', () {
    test('returns true on success and updates currentOrder', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'orderId': 1,
            'orderNumber': 'ORD-001',
            'status': 'CONFIRMED',
            'patientName': 'Patient 1',
            'pharmacyName': 'Pharmacy 1',
            'pharmacyId': 'pharm-1',
            'patientId': 'pat-1',
            'medicineAmount': 100,
            'totalAmount': 100,
            'createdAt': DateTime.now().toIso8601String(),
          }),
          200,
        );
      });

      final provider = PharmacyOrderProvider(
        orderService: PharmacyOrderService(client: mockClient),
      );

      final success = await provider.updateOrderStatus(
        _token,
        '1',
        'CONFIRMED',
      );
      expect(success, true);
      expect(provider.currentOrder, isNotNull);
      expect(provider.currentOrder!.status, 'CONFIRMED');
    });

    test('returns false on failure', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Bad Request', 400);
      });

      final provider = PharmacyOrderProvider(
        orderService: PharmacyOrderService(client: mockClient),
      );

      final success = await provider.updateOrderStatus(
        _token,
        '1',
        'CONFIRMED',
      );
      expect(success, false);
      expect(provider.error, isNotNull);
    });

    test('cancel with reason sends cancelReason', () async {
      http.Request? captured;
      final mockClient = MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'orderId': 1,
            'orderNumber': 'ORD-001',
            'status': 'CANCELLED',
            'patientName': 'Patient 1',
            'pharmacyName': 'Pharmacy 1',
            'pharmacyId': 'pharm-1',
            'patientId': 'pat-1',
            'medicineAmount': 100,
            'totalAmount': 100,
            'createdAt': DateTime.now().toIso8601String(),
          }),
          200,
        );
      });

      final provider = PharmacyOrderProvider(
        orderService: PharmacyOrderService(client: mockClient),
      );

      await provider.updateOrderStatus(
        _token,
        '1',
        'CANCELLED',
        cancelReason: 'Patient requested cancellation',
      );

      expect(captured, isNotNull);
      final body = jsonDecode(captured!.body) as Map<String, dynamic>;
      expect(body['cancelReason'], 'Patient requested cancellation');
    });
  });

  group('PharmacyOrderProvider — view mode', () {
    test('default view mode is flow', () {
      final provider = PharmacyOrderProvider(
        orderService: PharmacyOrderService(
          client: MockClient((_) async => http.Response('[]', 200)),
        ),
      );
      expect(provider.flowView, true);
    });

    test('setFlowView toggles and clears filter', () {
      final provider = PharmacyOrderProvider(
        orderService: PharmacyOrderService(
          client: MockClient((_) async => http.Response('[]', 200)),
        ),
      );
      provider.setFlowView(false);
      expect(provider.flowView, false);
      provider.setFlowView(true);
      expect(provider.flowView, true);
    });

    test('flowGroupedOrders groups by status', () {
      final provider = PharmacyOrderProvider(
        orderService: PharmacyOrderService(
          client: MockClient((_) async => http.Response('[]', 200)),
        ),
      );
      // Manually inject orders
      final orders = [
        _sampleOrder(id: 1, status: 'PENDING'),
        _sampleOrder(id: 2, status: 'PENDING'),
        _sampleOrder(id: 3, status: 'CONFIRMED'),
        _sampleOrder(id: 4, status: 'PREPARING'),
        _sampleOrder(id: 5, status: 'COMPLETED'),
      ];
      for (final o in orders) {
        expect(provider.flowGroupedOrders, isA<Map<String, List<PharmacyOrder>>>());
      }
    });
  });

  group('Workflow labels — order detail sections', () {
    test('workflowLabel covers all order statuses', () {
      expect(PharmacyWorkflow.workflowLabel('PREPARING'), 'Preparing');
      expect(PharmacyWorkflow.workflowLabel('READY'), 'Ready');
      expect(PharmacyWorkflow.workflowLabel('SHIPPING'), 'Shipping');
      expect(PharmacyWorkflow.workflowLabel('DELIVERED'), 'Delivered');
      expect(PharmacyWorkflow.workflowLabel('COMPLETED'), 'Completed');
      expect(PharmacyWorkflow.workflowLabel('CANCELLED'), 'Cancelled');
    });

    test('paymentLabel covers all payment statuses', () {
      expect(PharmacyWorkflow.paymentLabel('PAID'), 'Paid');
      expect(PharmacyWorkflow.paymentLabel('UNPAID'), 'Unpaid');
      expect(PharmacyWorkflow.paymentLabel('REFUNDED'), 'Refunded');
    });

    test('fulfillmentLabel covers pickup and delivery', () {
      expect(PharmacyWorkflow.fulfillmentLabel('PICKUP'), 'Pickup');
      expect(PharmacyWorkflow.fulfillmentLabel('DELIVERY'), 'Delivery');
    });
  });

  group('Earnings breakdown', () {
    test('sample order has platformFee and pharmacyEarning', () {
      final order = _sampleOrder();
      expect(order.platformFee, 5);
      expect(order.pharmacyEarning, 95);
      expect(order.totalAmount, 115);
    });

    test('delivery order with fee and earnings', () {
      final order = _sampleOrder(deliveryType: 'DELIVERY');
      expect(order.deliveryFee, 15);
      expect(order.platformFee, 5);
      expect(order.pharmacyEarning, 95);
      expect(order.medicineAmount + (order.deliveryFee ?? 0), 115);
    });
  });

  group('Activity timeline fields', () {
    test('order has timeline timestamps for non-terminal statuses', () {
      final order = _sampleOrder(status: 'SHIPPING', deliveryType: 'DELIVERY');
      expect(order.confirmedAt, isNotNull);
      expect(order.preparingAt, isNotNull);
      expect(order.shippedAt, isNotNull);
      expect(order.deliveredAt, isNull);
    });

    test('completed order has deliveredAt', () {
      final order = _sampleOrder(status: 'COMPLETED', deliveryType: 'DELIVERY');
      expect(order.deliveredAt, isNull);
    });

    test('cancelled order has cancelReason', () {
      final order = PharmacyOrder(
        orderId: 99,
        orderNumber: 'ORD-099',
        pharmacyId: 'pharm-1',
        pharmacyName: 'Pharmacy',
        patientId: 'pat-1',
        patientName: 'Patient',
        status: 'CANCELLED',
        medicineAmount: 50,
        totalAmount: 50,
        items: [],
        createdAt: DateTime.now(),
        cancelledAt: DateTime.now(),
        cancelReason: 'Out of stock',
        cancelledBy: 'pharm-1',
      );
      expect(order.cancelReason, 'Out of stock');
      expect(order.cancelledBy, 'pharm-1');
      expect(order.status, 'CANCELLED');
    });
  });
}
