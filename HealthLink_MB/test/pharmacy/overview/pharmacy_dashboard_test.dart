import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_dashboard_screen.dart';

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
  _NoopWorkflowProvider({this.errorOverride});

  final String? errorOverride;

  @override
  String? get error => errorOverride;

  @override
  void startPolling(String token, String pharmacyId) {}

  @override
  void stopPolling() {}
}

Widget _buildTestApp({
  PharmacyWorkflowProvider? workflowProvider,
  PharmacyOrderProvider? orderProvider,
  PharmacyInventoryProvider? inventoryProvider,
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
        ChangeNotifierProvider<PharmacyOrderProvider>.value(
          value: orderProvider ?? PharmacyOrderProvider(),
        ),
        ChangeNotifierProvider<PharmacyRequestProvider>(
          create: (_) => PharmacyRequestProvider(),
        ),
        ChangeNotifierProvider<PharmacyInventoryProvider>.value(
          value: inventoryProvider ?? PharmacyInventoryProvider(),
        ),
      ],
      child: const PharmacyDashboardScreen(),
    ),
  );
}

void main() {
  group('PharmacyDashboardScreen - metrics', () {
    testWidgets('renders welcome message', (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pump();

      expect(find.textContaining('Welcome'), findsOneWidget);
    });

    testWidgets('renders metric cards', (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pump();

      expect(find.text('Active Orders'), findsOneWidget);
      expect(find.text('Attention Requests'), findsOneWidget);
      expect(find.text('Inventory Risk'), findsOneWidget);
      expect(find.text('Completion'), findsOneWidget);
      expect(find.text('Revenue'), findsOneWidget);
    });

    testWidgets('shows zero defaults when no data', (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pump();

      expect(find.text('0'), findsWidgets);
    });
  });

  group('PharmacyDashboardScreen - error state', () {
    testWidgets('shows error when workflow fails and no data',
        (tester) async {
      final provider = _NoopWorkflowProvider(errorOverride: 'Failed to load');
      await tester.pumpWidget(MaterialApp(
        home: MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(
              value: _MockAuthProvider(),
            ),
            ChangeNotifierProvider<PharmacyWorkflowProvider>.value(
              value: provider,
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
          child: const PharmacyDashboardScreen(),
        ),
      ));

      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });
  });
}
