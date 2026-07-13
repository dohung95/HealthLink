import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_main_layout.dart';

class _FakeAuthProvider extends AuthProvider {
  @override
  bool get isPharmacy => true;

  @override
  String? get accessToken => 'fake-token';

  @override
  String? get userId => 'pharm-1';

  @override
  Map<String, dynamic>? get pharmacyProfile =>
      {'pharmacyId': 'pharm-1', 'name': 'Fake Pharmacy'};
}

class _FakeWorkflowProvider extends PharmacyWorkflowProvider {
  _FakeWorkflowProvider();

  @override
  void startPolling(String token, String pharmacyId) {}

  @override
  void stopPolling() {}
}

Widget _buildTestApp() {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: _FakeAuthProvider(),
        ),
        ChangeNotifierProvider<PharmacyWorkflowProvider>(
          create: (_) => _FakeWorkflowProvider(),
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
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Pharmacy mobile flow', () {
    testWidgets('shell renders with all 5 tabs', (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Requests'), findsOneWidget);
      expect(find.text('Orders'), findsOneWidget);
      expect(find.text('Inventory'), findsOneWidget);
      expect(find.text('More'), findsOneWidget);
    });

    testWidgets('dashboard shows metric cards', (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      expect(find.text('Active Orders'), findsOneWidget);
      expect(find.text('Attention Requests'), findsOneWidget);
      expect(find.text('Inventory Risk'), findsOneWidget);
      expect(find.text('Completion'), findsOneWidget);
      expect(find.text('Revenue'), findsOneWidget);
    });

    testWidgets('tapping Requests tab navigates to requests screen',
        (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Requests'));
      await tester.pumpAndSettle();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 1);
    });

    testWidgets('tapping Orders tab navigates to orders screen',
        (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Orders'));
      await tester.pumpAndSettle();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 2);
    });

    testWidgets('tapping Inventory tab navigates to inventory screen',
        (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Inventory'));
      await tester.pumpAndSettle();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 3);
    });

    testWidgets('tapping More tab navigates to more screen',
        (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('More'));
      await tester.pumpAndSettle();

      final navBar =
          tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 4);
    });

    testWidgets('notification bell is present in app bar',
        (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
    });

    testWidgets('dashboard date is displayed', (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      expect(find.textContaining('Welcome'), findsOneWidget);
    });
  });
}
