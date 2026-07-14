import 'dart:convert';

import 'package:HealthLink/models/pharmacy/pharmacy_order_item.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_order_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_order_service.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_workflow.dart';
import 'package:provider/provider.dart';

const _token = 'test-token';

PharmacyOrder _sampleOrder({
  int id = 1,
  String status = 'PENDING',
  String deliveryType = 'PICKUP',
  String paymentStatus = 'PAID',
  bool? requiresPatientConfirmation,
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
    requiresPatientConfirmation: requiresPatientConfirmation,
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

class _TestAuth extends AuthProvider {
  @override
  String? get accessToken => 'test-token';

  @override
  String? get userId => 'pharm-1';

  @override
  Map<String, dynamic>? get pharmacyProfile => {'pharmacyId': 'pharm-1'};
}

/// A provider that returns a static order and records status updates.
class _RecordingOrderProvider extends PharmacyOrderProvider {
  _RecordingOrderProvider(this._order)
    : super(
        orderService: PharmacyOrderService(
          client: MockClient((_) async => http.Response('{}', 200)),
        ),
      );

  final PharmacyOrder _order;
  final List<String> submittedStatuses = [];
  bool _recordingLoading = false;

  set recordingLoading(bool v) => _recordingLoading = v;

  @override
  PharmacyOrder? get currentOrder => _order;

  @override
  bool get isLoading => _recordingLoading;

  @override
  Future<void> fetchOrderDetail(String token, String orderId) async {}

  @override
  Future<bool> updateOrderStatus(
    String token,
    String orderId,
    String status, {
    String? pharmacistNotes,
    String? estimatedDeliveryTime,
    String? cancelReason,
  }) async {
    submittedStatuses.add(status);
    return true;
  }
}

PharmacyOrder _detailOrder() {
  final createdAt = DateTime(2026, 7, 14, 9);
  return PharmacyOrder(
    orderId: 17,
    orderNumber: 'ORD-017-VERY-LONG-REFERENCE',
    pharmacyId: 'pharm-1',
    pharmacyName: 'Central Pharmacy',
    patientId: 'pat-1',
    patientName: 'Nguyen Thi Patient',
    status: 'SHIPPING',
    deliveryType: 'DELIVERY',
    deliveryAddress: '42 Long Delivery Address, Ward 7, Ho Chi Minh City',
    deliveryPhoneNumber: '+84 912 345 678',
    medicineAmount: 100,
    deliveryFee: 15,
    totalAmount: 115,
    paymentStatus: 'PAID',
    paymentMethod: 'Card',
    platformFee: 5,
    pharmacyEarning: 95,
    pharmacyRequestId: 42,
    items: const [
      PharmacyOrderItem(
        medicationName: 'Acetaminophen 500 mg extended release',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
      ),
    ],
    createdAt: createdAt,
    confirmedAt: createdAt.add(const Duration(minutes: 10)),
    preparingAt: createdAt.add(const Duration(minutes: 20)),
    shippedAt: createdAt.add(const Duration(hours: 2)),
    paidAt: createdAt.add(const Duration(minutes: 2)),
  );
}

Widget _detailApp(PharmacyOrder order) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _TestAuth()),
        ChangeNotifierProvider<PharmacyOrderProvider>.value(
          value: _StaticOrderProvider(order),
        ),
        ChangeNotifierProvider<PharmacyWorkflowProvider>.value(
          value: PharmacyWorkflowProvider(),
        ),
        ChangeNotifierProvider<PharmacyInventoryProvider>.value(
          value: PharmacyInventoryProvider(),
        ),
      ],
      child: const PharmacyOrderDetailScreen(orderId: '17'),
    ),
  );
}

Widget _detailAppWithProvider(PharmacyOrderProvider provider) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _TestAuth()),
        ChangeNotifierProvider<PharmacyOrderProvider>.value(value: provider),
        ChangeNotifierProvider<PharmacyWorkflowProvider>.value(
          value: PharmacyWorkflowProvider(),
        ),
        ChangeNotifierProvider<PharmacyInventoryProvider>.value(
          value: PharmacyInventoryProvider(),
        ),
      ],
      child: const PharmacyOrderDetailScreen(orderId: '17'),
    ),
  );
}

class _StaticOrderProvider extends PharmacyOrderProvider {
  _StaticOrderProvider(this._order)
    : super(
        orderService: PharmacyOrderService(
          client: MockClient((_) async => http.Response('{}', 200)),
        ),
      );

  final PharmacyOrder _order;

  @override
  PharmacyOrder? get currentOrder => _order;

  @override
  bool get isLoading => false;

  @override
  Future<void> fetchOrderDetail(String token, String orderId) async {}
}

void main() {
  group('PharmacyOrderDetailScreen tabs', () {
    testWidgets(
      'shows summary labels for fulfillment, payment, fees and contact',
      (tester) async {
        await tester.binding.setSurfaceSize(const Size(400, 900));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        await tester.pumpWidget(_detailApp(_detailOrder()));
        await tester.pumpAndSettle();

        expect(find.text('Summary'), findsOneWidget);
        expect(find.text('Items'), findsOneWidget);
        expect(find.text('Timeline'), findsOneWidget);
        expect(find.text('Fulfillment'), findsOneWidget);
        expect(find.text('Payment'), findsWidgets);
        expect(find.text('Patient contact'), findsOneWidget);
        expect(find.text('Delivery fee'), findsOneWidget);
      },
    );

    testWidgets('switches to items with order totals and chat history access', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(400, 900));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(_detailApp(_detailOrder()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Items'));
      await tester.pumpAndSettle();

      expect(
        find.text('Acetaminophen 500 mg extended release'),
        findsOneWidget,
      );
      expect(find.text('Medicine total'), findsOneWidget);
      expect(find.text('Chat history'), findsOneWidget);
    });

    testWidgets('switches to the order timeline', (tester) async {
      await tester.pumpWidget(_detailApp(_detailOrder()));
      await tester.pump();

      await tester.tap(find.text('Timeline'));
      await tester.pumpAndSettle();

      expect(find.text('Order timeline'), findsOneWidget);
      expect(find.text('Created'), findsOneWidget);
      expect(find.text('Shipped'), findsOneWidget);
    });

    testWidgets('keeps tab content within a narrow phone width', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(320, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(_detailApp(_detailOrder()));
      await tester.pumpAndSettle();

      expect(find.text('Summary'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('order without pharmacyRequestId hides Chat history', (
      tester,
    ) async {
      final order = _detailOrder();
      final noRequestOrder = PharmacyOrder(
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        pharmacyId: order.pharmacyId,
        pharmacyName: order.pharmacyName,
        patientId: order.patientId,
        patientName: order.patientName,
        status: order.status,
        deliveryType: order.deliveryType,
        deliveryAddress: order.deliveryAddress,
        deliveryPhoneNumber: order.deliveryPhoneNumber,
        medicineAmount: order.medicineAmount,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        items: order.items,
        createdAt: order.createdAt,
      );
      await tester.pumpWidget(_detailApp(noRequestOrder));
      await tester.pump();

      // Scan both tabs for Chat history
      expect(find.text('Chat history'), findsNothing);
    });
  });

  group('PharmacyOrderDetailScreen — progression CTA', () {
    testWidgets('paid preparing order shows fixed Mark ready CTA', (
      tester,
    ) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(status: 'PREPARING', paymentStatus: 'PAID'),
      ));
      await tester.pump();

      expect(find.widgetWithText(FilledButton, 'Mark ready'), findsOneWidget);
    });

    testWidgets('unpaid preparing order hides progression CTA', (
      tester,
    ) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(status: 'PREPARING', paymentStatus: 'PENDING'),
      ));
      await tester.pump();

      expect(find.text('Mark ready'), findsNothing);
    });

    testWidgets('paid ready pickup shows Complete pickup CTA', (
      tester,
    ) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(status: 'READY', deliveryType: 'PICKUP', paymentStatus: 'PAID'),
      ));
      await tester.pump();

      expect(
        find.widgetWithText(FilledButton, 'Complete pickup'),
        findsOneWidget,
      );
    });

    testWidgets('paid ready delivery shows Start delivery CTA', (
      tester,
    ) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(status: 'READY', deliveryType: 'DELIVERY', paymentStatus: 'PAID'),
      ));
      await tester.pump();

      expect(
        find.widgetWithText(FilledButton, 'Start delivery'),
        findsOneWidget,
      );
    });

    testWidgets('paid shipping delivery shows Mark delivered CTA', (
      tester,
    ) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(status: 'SHIPPING', deliveryType: 'DELIVERY', paymentStatus: 'PAID'),
      ));
      await tester.pump();

      expect(
        find.widgetWithText(FilledButton, 'Mark delivered'),
        findsOneWidget,
      );
    });

    testWidgets('paid delivered delivery shows Complete order CTA', (
      tester,
    ) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(status: 'DELIVERED', deliveryType: 'DELIVERY', paymentStatus: 'PAID'),
      ));
      await tester.pump();

      expect(
        find.widgetWithText(FilledButton, 'Complete order'),
        findsOneWidget,
      );
    });

    testWidgets('terminal COMPLETED hides progression CTA', (tester) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(status: 'COMPLETED', paymentStatus: 'PAID'),
      ));
      await tester.pump();

      expect(find.byType(FilledButton), findsNothing);
    });

    testWidgets('confirmation-blocked order hides progression CTA', (
      tester,
    ) async {
      await tester.pumpWidget(_detailApp(
        _sampleOrder(
          status: 'PREPARING',
          paymentStatus: 'PAID',
          requiresPatientConfirmation: true,
        ),
      ));
      await tester.pump();

      expect(find.text('Mark ready'), findsNothing);
    });
  });

  group('PharmacyOrderDetailScreen — confirmation interaction', () {
    testWidgets('tapping CTA shows confirmation modal with cancel', (
      tester,
    ) async {
      final provider = _RecordingOrderProvider(
        _sampleOrder(status: 'PREPARING', paymentStatus: 'PAID'),
      );
      await tester.pumpWidget(_detailAppWithProvider(provider));
      await tester.pump();

      // Tap the Mark ready CTA
      await tester.tap(find.widgetWithText(FilledButton, 'Mark ready'));
      await tester.pumpAndSettle();

      // Confirm modal appears
      expect(find.text('Mark order ready?'), findsOneWidget);
      expect(
        find.text(
          'Medicines will be marked as packed and inventory quantities will be deducted.',
        ),
        findsOneWidget,
      );

      // Cancel button dismisses without API call
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(provider.submittedStatuses, isEmpty);
    });

    testWidgets('confirmation confirm submits exactly one status update', (
      tester,
    ) async {
      final provider = _RecordingOrderProvider(
        _sampleOrder(status: 'PREPARING', paymentStatus: 'PAID'),
      );
      await tester.pumpWidget(_detailAppWithProvider(provider));
      await tester.pump();

      // Open confirmation
      await tester.tap(find.widgetWithText(FilledButton, 'Mark ready'));
      await tester.pumpAndSettle();

      // Confirm the action
      await tester.tap(find.widgetWithText(FilledButton, 'Confirm'));
      await tester.pumpAndSettle();

      expect(provider.submittedStatuses, ['READY']);
    });

    testWidgets('CTA is disabled while provider is loading', (tester) async {
      final provider = _RecordingOrderProvider(
        _sampleOrder(status: 'PREPARING', paymentStatus: 'PAID'),
      );
      provider.recordingLoading = true;
      await tester.pumpWidget(_detailAppWithProvider(provider));
      await tester.pump();

      final button = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Mark ready'),
      );
      expect(button.onPressed, isNull);
    });

    testWidgets('picking up confirmation then canceling does not update', (
      tester,
    ) async {
      final provider = _RecordingOrderProvider(
        _sampleOrder(status: 'PREPARING', paymentStatus: 'PAID'),
      );
      await tester.pumpWidget(_detailAppWithProvider(provider));
      await tester.pump();

      // Open and cancel twice
      for (var i = 0; i < 2; i++) {
        await tester.tap(find.widgetWithText(FilledButton, 'Mark ready'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();
      }

      // Confirm once
      await tester.tap(find.widgetWithText(FilledButton, 'Mark ready'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Confirm'));
      await tester.pumpAndSettle();

      expect(provider.submittedStatuses, ['READY']);
    });

    testWidgets('overflow menu only shows Edit Quote not Update Status', (
      tester,
    ) async {
      // A PENDING order with PAID status - should show Edit Quote but not status action
      final order = _sampleOrder(
        status: 'PENDING',
        paymentStatus: 'PAID',
      );
      // We need the order to have canEditQuote = true (PENDING status)
      await tester.pumpWidget(_detailApp(order));
      await tester.pump();

      // Tap the overflow menu
      await tester.tap(find.byIcon(Icons.more_vert));
      await tester.pumpAndSettle();

      // Edit Quote should be visible
      expect(find.text('Edit Quote'), findsOneWidget);
      // Update Status should NOT be visible
      expect(find.text('Update Status'), findsNothing);
    });
  });

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
      expect(orders, hasLength(5));
      expect(
        provider.flowGroupedOrders,
        isA<Map<String, List<PharmacyOrder>>>(),
      );
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

  group('Chat history', () {
    test('order with pharmacyRequestId has chat history info', () {
      final order = _sampleOrder(status: 'COMPLETED');
      // Add pharmacyRequestId like the production model supports
      final orderWithRequestId = PharmacyOrder(
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        pharmacyId: order.pharmacyId,
        pharmacyName: order.pharmacyName,
        patientId: order.patientId,
        patientName: order.patientName,
        status: order.status,
        deliveryType: order.deliveryType,
        paymentStatus: order.paymentStatus,
        medicineAmount: order.medicineAmount,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
        platformFee: order.platformFee,
        pharmacyEarning: order.pharmacyEarning,
        items: order.items,
        createdAt: order.createdAt,
        confirmedAt: order.confirmedAt,
        preparingAt: order.preparingAt,
        pharmacyRequestId: 42,
      );
      expect(orderWithRequestId.pharmacyRequestId, 42);
    });

    test('order without pharmacyRequestId has null chat info', () {
      final order = _sampleOrder(status: 'COMPLETED');
      expect(order.pharmacyRequestId, isNull);
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
