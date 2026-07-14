import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';

import 'package:HealthLink/models/pharmacy/pharmacy_order.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_orders_screen.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_order_service.dart';
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

/// A test AuthProvider that returns fixed token/pharmacy info.
class _TestAuth extends AuthProvider {
  @override
  String? get accessToken => 'test-token';

  @override
  String? get userId => 'pharm-1';

  @override
  Map<String, dynamic>? get pharmacyProfile => {'pharmacyId': 'pharm-1'};
}

Widget _ordersApp(MockClient client) {
  final provider = PharmacyOrderProvider(
    orderService: PharmacyOrderService(client: client),
  );
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _TestAuth()),
        ChangeNotifierProvider<PharmacyOrderProvider>.value(value: provider),
      ],
      child: const PharmacyOrdersScreen(),
    ),
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
        'READY',
      );
    });

    test('PREPARING -> READY (delivery)', () {
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: 'PREPARING',
          deliveryType: 'DELIVERY',
        ),
        'READY',
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

    test('pickup order at PREPARING goes to READY', () {
      final order = _order(status: 'PREPARING', deliveryType: 'PICKUP');
      expect(PharmacyWorkflow.canProgressOrder(order), true);
      expect(
        PharmacyWorkflow.getNextOrderStatus(
          status: order.status,
          deliveryType: order.deliveryType!,
        ),
        'READY',
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

    test('PENDING payment blocks PREPARING progression', () {
      final order = _order(
        status: 'PREPARING',
        deliveryType: 'PICKUP',
        paymentStatus: 'PENDING',
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

  group('nextTransition returns correct transitions', () {
    test('PREPARING paid -> READY transition', () {
      final transition = PharmacyWorkflow.nextTransition(
        _order(status: 'PREPARING', paymentStatus: 'PAID'),
      );
      expect(transition, isNotNull);
      expect(transition!.targetStatus, 'READY');
      expect(transition.label, 'Mark ready');
      expect(transition.confirmationTitle, 'Mark order ready?');
    });

    test('PREPARING unpaid returns null', () {
      expect(
        PharmacyWorkflow.nextTransition(
          _order(status: 'PREPARING', paymentStatus: 'PENDING'),
        ),
        isNull,
      );
    });

    test('PREPARING with patient confirmation returns null', () {
      expect(
        PharmacyWorkflow.nextTransition(
          _order(
            status: 'PREPARING',
            paymentStatus: 'PAID',
            requiresPatientConfirmation: true,
          ),
        ),
        isNull,
      );
    });

    test('READY pickup -> COMPLETED transition', () {
      final transition = PharmacyWorkflow.nextTransition(
        _order(status: 'READY', deliveryType: 'PICKUP', paymentStatus: 'PAID'),
      );
      expect(transition, isNotNull);
      expect(transition!.targetStatus, 'COMPLETED');
      expect(transition.label, 'Complete pickup');
      expect(transition.confirmationTitle, 'Complete pickup?');
    });

    test('READY delivery -> SHIPPING transition', () {
      final transition = PharmacyWorkflow.nextTransition(
        _order(status: 'READY', deliveryType: 'DELIVERY', paymentStatus: 'PAID'),
      );
      expect(transition, isNotNull);
      expect(transition!.targetStatus, 'SHIPPING');
      expect(transition.label, 'Start delivery');
      expect(transition.confirmationTitle, 'Start delivery?');
    });

    test('SHIPPING delivery -> DELIVERED transition', () {
      final transition = PharmacyWorkflow.nextTransition(
        _order(status: 'SHIPPING', deliveryType: 'DELIVERY', paymentStatus: 'PAID'),
      );
      expect(transition, isNotNull);
      expect(transition!.targetStatus, 'DELIVERED');
      expect(transition.label, 'Mark delivered');
      expect(transition.confirmationTitle, 'Mark order delivered?');
    });

    test('DELIVERED delivery -> COMPLETED transition', () {
      final transition = PharmacyWorkflow.nextTransition(
        _order(status: 'DELIVERED', deliveryType: 'DELIVERY', paymentStatus: 'PAID'),
      );
      expect(transition, isNotNull);
      expect(transition!.targetStatus, 'COMPLETED');
      expect(transition.label, 'Complete order');
      expect(transition.confirmationTitle, 'Complete order?');
    });

    test('terminal COMPLETED returns null', () {
      expect(
        PharmacyWorkflow.nextTransition(
          _order(status: 'COMPLETED', paymentStatus: 'PAID'),
        ),
        isNull,
      );
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

  group('Flow/History swipe regression', () {
    testWidgets('switching tabs never duplicates orders or fires extra API calls', (
      tester,
    ) async {
      var apiCallCount = 0;

      final mockClient = MockClient((request) async {
        apiCallCount++;
        return http.Response(jsonEncode([
          {
            'orderId': 1,
            'orderNumber': 'ORD-001',
            'pharmacyId': 'pharm-1',
            'pharmacyName': 'Pharmacy',
            'patientId': 'pat-1',
            'patientName': 'Patient 1',
            'status': 'PREPARING',
            'paymentStatus': 'PAID',
            'medicineAmount': 100,
            'totalAmount': 100,
            'items': [],
            'createdAt': DateTime.now().toIso8601String(),
          },
          {
            'orderId': 2,
            'orderNumber': 'ORD-002',
            'pharmacyId': 'pharm-1',
            'pharmacyName': 'Pharmacy',
            'patientId': 'pat-2',
            'patientName': 'Patient 2',
            'status': 'COMPLETED',
            'paymentStatus': 'PAID',
            'medicineAmount': 50,
            'totalAmount': 50,
            'items': [],
            'createdAt': DateTime.now().toIso8601String(),
          },
        ]), 200);
      });

      await tester.pumpWidget(_ordersApp(mockClient));
      await tester.pumpAndSettle();

      // Initial load should have made one call
      expect(apiCallCount, 1);

      // PREPARING order should appear once in Flow; COMPLETED not in Flow
      expect(find.text('ORD-001'), findsOneWidget);
      expect(find.text('ORD-002'), findsNothing);

      // Switch to History tab
      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      // COMPLETED order should appear once in History
      expect(find.text('ORD-002'), findsOneWidget);

      // API call count still 1 (no refetch on tab change)
      expect(apiCallCount, 1);

      // Round trip Flow -> History -> Flow three times
      for (var i = 0; i < 3; i++) {
        await tester.tap(find.text('Flow'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('History'));
        await tester.pumpAndSettle();
      }

      // Still no additional API calls after tab switches
      expect(apiCallCount, 1);

      // Each order appears once (no duplicates after all tab switches)
      // We're on History tab now, ORD-002 should appear once
      expect(find.text('ORD-002'), findsOneWidget);

      // Switch to Flow to verify ORD-001 appears once
      await tester.tap(find.text('Flow'));
      await tester.pumpAndSettle();
      expect(find.text('ORD-001'), findsOneWidget);
      expect(find.text('ORD-002'), findsNothing);
    });

    testWidgets('history filters work locally without API calls', (
      tester,
    ) async {
      var apiCallCount = 0;

      final mockClient = MockClient((request) async {
        apiCallCount++;
        return http.Response(jsonEncode([
          {
            'orderId': 1,
            'orderNumber': 'ORD-001',
            'pharmacyId': 'pharm-1',
            'pharmacyName': 'Pharmacy',
            'patientId': 'pat-1',
            'patientName': 'Patient 1',
            'status': 'COMPLETED',
            'paymentStatus': 'PAID',
            'medicineAmount': 100,
            'totalAmount': 100,
            'items': [],
            'createdAt': DateTime.now().toIso8601String(),
          },
          {
            'orderId': 2,
            'orderNumber': 'ORD-002',
            'pharmacyId': 'pharm-1',
            'pharmacyName': 'Pharmacy',
            'patientId': 'pat-2',
            'patientName': 'Patient 2',
            'status': 'CANCELLED',
            'paymentStatus': 'REFUNDED',
            'medicineAmount': 50,
            'totalAmount': 50,
            'items': [],
            'createdAt': DateTime.now().toIso8601String(),
          },
        ]), 200);
      });

      await tester.pumpWidget(_ordersApp(mockClient));
      await tester.pumpAndSettle();

      expect(apiCallCount, 1);

      // Switch to History tab
      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      // Both terminal orders visible
      expect(find.text('ORD-001'), findsOneWidget);
      expect(find.text('ORD-002'), findsOneWidget);

      // Tap COMPLETED filter
      await tester.tap(find.widgetWithText(FilterChip, 'COMPLETED'));
      await tester.pumpAndSettle();

      // No additional API call
      expect(apiCallCount, 1);

      // Only COMPLETED order visible
      expect(find.text('ORD-001'), findsOneWidget);
      expect(find.text('ORD-002'), findsNothing);

      // Tap CANCELLED filter
      await tester.tap(find.widgetWithText(FilterChip, 'CANCELLED'));
      await tester.pumpAndSettle();

      // Still no additional API call
      expect(apiCallCount, 1);

      // Only CANCELLED order visible
      expect(find.text('ORD-001'), findsNothing);
      expect(find.text('ORD-002'), findsOneWidget);

      // Switch back to Flow — should see no orders (both are terminal)
      await tester.tap(find.text('Flow'));
      await tester.pumpAndSettle();

      expect(find.text('ORD-001'), findsNothing);
      expect(find.text('ORD-002'), findsNothing);

      // API call count still 1
      expect(apiCallCount, 1);
    });
  });
}
