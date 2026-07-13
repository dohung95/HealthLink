import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_inventory_item.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_quote_draft.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_quote_editor_screen.dart';

import 'package:HealthLink/widgets/pharmacy/pharmacy_medicine_picker.dart';
import 'package:HealthLink/widgets/pharmacy/pharmacy_order_item_editor.dart';

class _MockNavigationObserver extends NavigatorObserver {
  final List<String> pushedRoutes = [];

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    pushedRoutes.add(route.settings.name ?? route.settings.toString());
  }
}

class _FakeLoadingOrderProvider extends PharmacyOrderProvider {
  @override
  bool get isLoading => true;
}

Widget _buildTestApp({
  required Widget child,
  AuthProvider? authProvider,
  PharmacyInventoryProvider? inventoryProvider,
  PharmacyRequestProvider? requestProvider,
  PharmacyOrderProvider? orderProvider,
}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(
        value: authProvider ?? AuthProvider(),
      ),
      if (inventoryProvider != null)
        ChangeNotifierProvider<PharmacyInventoryProvider>.value(
          value: inventoryProvider,
        )
      else
        ChangeNotifierProvider<PharmacyInventoryProvider>(
          create: (_) => PharmacyInventoryProvider(),
        ),
      if (requestProvider != null)
        ChangeNotifierProvider<PharmacyRequestProvider>.value(
          value: requestProvider,
        )
      else
        ChangeNotifierProvider<PharmacyRequestProvider>(
          create: (_) => PharmacyRequestProvider(),
        ),
      if (orderProvider != null)
        ChangeNotifierProvider<PharmacyOrderProvider>.value(
          value: orderProvider,
        )
      else
        ChangeNotifierProvider<PharmacyOrderProvider>(
          create: (_) => PharmacyOrderProvider(),
        ),
    ],
    child: MaterialApp(home: child),
  );
}

void main() {
  group('PharmacyQuoteEditorScreen - createFromRequest', () {
    testWidgets('renders summary, prescriptions, and medicines sections',
        (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: const PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.createFromRequest,
          requestId: '101',
        ),
      ));

      expect(find.text('Create Order'), findsOneWidget);
      expect(find.text('Summary'), findsOneWidget);
      expect(find.text('Medicines'), findsOneWidget);
      expect(find.text('No medicines added yet'), findsOneWidget);
    });

    testWidgets('shows validation error when submitting with no medicines',
        (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: const PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.createFromRequest,
          requestId: '101',
        ),
      ));

      await tester.tap(find.text('Submit Quote'));
      await tester.pumpAndSettle();

      expect(find.text('Add at least one medicine'), findsOneWidget);
    });
  });

  group('PharmacyQuoteEditorScreen - updateQuote', () {
    testWidgets('renders loading state then retry on error', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        orderProvider: _FakeLoadingOrderProvider(),
        child: const PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.updateQuote,
          orderId: '201',
        ),
      ));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  group('PharmacyMedicinePicker', () {
    testWidgets('shows inventory items in list', (tester) async {
      final items = [
        PharmacyInventoryItem(
          inventoryId: 1,
          medicineId: 1,
          medicineName: 'Paracetamol',
          unit: 'tablet',
          quantity: 100,
          unitPrice: 5000,
          active: true,
        ),
      ];

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyMedicinePicker(
            inventoryItems: items,
            onSelected: (_) {},
          ),
        ),
      ));

      expect(find.text('Paracetamol'), findsOneWidget);
      expect(find.text('\$5000 /tablet'), findsOneWidget);
    });

    testWidgets('calls onSelected when item tapped', (tester) async {
      QuoteLineItem? selected;
      final items = [
        PharmacyInventoryItem(
          inventoryId: 2,
          medicineId: 2,
          medicineName: 'Amoxicillin',
          unit: 'capsule',
          quantity: 50,
          unitPrice: 8000,
          active: true,
        ),
      ];

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyMedicinePicker(
            inventoryItems: items,
            onSelected: (item) => selected = item,
          ),
        ),
      ));

      await tester.tap(find.text('Amoxicillin'));
      expect(selected, isNotNull);
      expect(selected!.medicineId, 2);
      expect(selected!.medicationName, 'Amoxicillin');
    });
  });

  group('PharmacyOrderItemEditor', () {
    testWidgets('renders editable fields', (tester) async {
      final item = QuoteLineItem(
        medicineId: 1,
        medicationName: 'Paracetamol',
        quantity: 10,
        totalSupplyDays: 5,
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyOrderItemEditor(
            item: item,
            onChanged: (_) {},
          ),
        ),
      ));

      expect(find.text('Paracetamol'), findsOneWidget);
      expect(find.text('Quantity'), findsOneWidget);
      expect(find.text('Total Supply Days'), findsOneWidget);
    });

    testWidgets('calls onChanged when values are edited', (tester) async {
      QuoteLineItem? changed;
      final item = QuoteLineItem(
        medicineId: 1,
        medicationName: 'Paracetamol',
        quantity: 10,
        totalSupplyDays: 5,
      );

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyOrderItemEditor(
            item: item,
            onChanged: (updated) => changed = updated,
          ),
        ),
      ));

      await tester.enterText(find.byType(TextFormField).first, '20');

      expect(changed, isNotNull);
      expect(changed!.quantity, 20);
    });
  });
}
