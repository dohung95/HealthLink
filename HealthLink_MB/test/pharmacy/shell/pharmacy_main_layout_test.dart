import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_main_layout.dart';

class _MockAuthProvider extends AuthProvider {
  @override
  bool get isPharmacy => true;

  @override
  String? get accessToken => 'mock-token';

  @override
  String? get userId => 'pharm-1';

  @override
  Map<String, dynamic>? get pharmacyProfile =>
      {'pharmacyId': 'pharm-1', 'name': 'Test Pharmacy'};
}

class _NoopWorkflowProvider extends PharmacyWorkflowProvider {
  _NoopWorkflowProvider();

  int _overridePendingRequests = 0;
  int _overridePendingOrders = 0;

  set pendingRequestsCountOverride(int v) => _overridePendingRequests = v;
  set pendingOrdersCountOverride(int v) => _overridePendingOrders = v;

  @override
  int get pendingRequestsCount => _overridePendingRequests;

  @override
  int get pendingOrdersCount => _overridePendingOrders;

  @override
  int get totalBadgeCount => _overridePendingOrders + _overridePendingRequests;

  @override
  void startPolling(String token, String pharmacyId) {
    // no-op in tests to avoid pending timer
  }

  @override
  void stopPolling() {}
}

Widget _buildTestApp({
  _NoopWorkflowProvider? workflowProvider,
}) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: _MockAuthProvider(),
        ),
        ChangeNotifierProvider<PharmacyWorkflowProvider>.value(
          value: workflowProvider ?? _NoopWorkflowProvider(),
        ),
        ChangeNotifierProvider<PharmacyOrderProvider>(
          create: (_) => PharmacyOrderProvider(),
        ),
        ChangeNotifierProvider<PharmacyRequestProvider>(
          create: (_) => PharmacyRequestProvider(),
        ),
        ChangeNotifierProvider<PharmacyInventoryProvider>(
          create: (_) => PharmacyInventoryProvider(),
        ),
      ],
      child: const PharmacyMainLayout(),
    ),
  );
}

void main() {
  group('PharmacyMainLayout shell', () {
    testWidgets('renders five navigation destinations', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Requests'), findsOneWidget);
      expect(find.text('Orders'), findsOneWidget);
      expect(find.text('Inventory'), findsOneWidget);
      expect(find.text('More'), findsOneWidget);
    });

    testWidgets('default selected index is Home (0)', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 0);
    });

    testWidgets('tapping Requests switches to tab index 1', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('Requests'));
      await tester.pump();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 1);
    });

    testWidgets('tapping Orders switches to tab index 2', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('Orders'));
      await tester.pump();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 2);
    });

    testWidgets('tapping Inventory switches to tab index 3', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('Inventory'));
      await tester.pump();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 3);
    });

    testWidgets('tapping More switches to tab index 4', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('More'));
      await tester.pump();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 4);
    });
  });

  group('badge counts on tabs', () {
    testWidgets('shows Badge widget when counts > 0', (tester) async {
      final provider = _NoopWorkflowProvider();
      provider.pendingRequestsCountOverride = 2;
      provider.pendingOrdersCountOverride = 3;

      await tester.pumpWidget(_buildTestApp(workflowProvider: provider));

      expect(find.byType(Badge), findsAtLeast(1));
    });

    testWidgets('no Badge when all counts are zero', (tester) async {
      final provider = _NoopWorkflowProvider();
      provider.pendingRequestsCountOverride = 0;
      provider.pendingOrdersCountOverride = 0;

      await tester.pumpWidget(_buildTestApp(workflowProvider: provider));

      expect(find.byType(Badge), findsNothing);
    });
  });

  group('notification bell', () {
    testWidgets('appBar has notification bell icon', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
    });
  });
}
