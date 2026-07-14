import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_inventory_item.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order_item.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_quote_draft.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_quote_editor_screen.dart';

import 'package:HealthLink/widgets/pharmacy/pharmacy_medicine_picker.dart';
import 'package:HealthLink/widgets/pharmacy/pharmacy_order_item_editor.dart';
import 'package:HealthLink/widgets/pharmacy/quote/pharmacy_quote_delivery_step.dart';
import 'package:HealthLink/widgets/pharmacy/quote/pharmacy_quote_review_step.dart';

class _FakeLoadingOrderProvider extends PharmacyOrderProvider {
  @override
  bool get isLoading => true;
}

class _FakeAuthProvider extends AuthProvider {
  @override
  String? get accessToken => 'test-token';
}

class _FakeOrderWithDataProvider extends PharmacyOrderProvider {
  final PharmacyOrder testOrder;
  _FakeOrderWithDataProvider(this.testOrder);

  @override
  PharmacyOrder? get currentOrder => testOrder;

  @override
  bool get isLoading => false;

  @override
  String? get error => null;
}

class _FakeRefreshOrderProvider extends PharmacyOrderProvider {
  int refreshCount = 0;

  @override
  Future<void> refreshOrders(String token, String pharmacyId) async {
    refreshCount++;
  }
}

class _FakeRefreshWorkflowProvider extends PharmacyWorkflowProvider {
  int refreshCount = 0;

  @override
  Future<void> refresh(String token, String pharmacyId) async {
    refreshCount++;
  }
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
  test('selects update error from the order provider', () {
    expect(
      pharmacyQuoteSubmissionError(
        isUpdate: true,
        requestError: 'request error',
        orderError: 'order error',
      ),
      'order error',
    );
  });

  test('refreshes shared order and workflow state after an update', () async {
    final orderProvider = _FakeRefreshOrderProvider();
    final workflowProvider = _FakeRefreshWorkflowProvider();

    await refreshPharmacyQuoteState(
      orderProvider: orderProvider,
      workflowProvider: workflowProvider,
      token: 'token',
      pharmacyId: 'pharmacy-1',
    );

    expect(orderProvider.refreshCount, 1);
    expect(workflowProvider.refreshCount, 1);
  });

  group('PharmacyQuoteEditorScreen - createFromRequest', () {
    testWidgets('starts on Medicines and exposes the three wizard steps',
        (tester) async {
      await tester.pumpWidget(_buildTestApp(
        child: const PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.createFromRequest,
          requestId: '101',
        ),
      ));

      expect(find.text('Medicines'), findsWidgets);
      expect(find.text('Delivery'), findsOneWidget);
      expect(find.text('Review'), findsOneWidget);
      expect(find.text('Create order'), findsNothing);
      expect(find.text('Next'), findsOneWidget);
    });

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
      expect(find.text('Medicines'), findsWidgets);
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

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Add at least one medicine'), findsOneWidget);
    });

    testWidgets('does not overflow at a narrow viewport', (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_buildTestApp(
        child: const PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.createFromRequest,
          requestId: '101',
        ),
      ));

      expect(tester.takeException(), isNull);
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

  group('PharmacyQuoteDeliveryStep', () {
    testWidgets('pickup shows patient fields and hides fee and ETA controls',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyQuoteDeliveryStep(
            fulfillmentType: 'PICKUP',
            address: 'Patient address',
            phone: '0900000000',
            latitude: 10.1,
            longitude: 106.2,
            feeController: TextEditingController(text: '0'),
            etaController: TextEditingController(),
            onFeeChanged: (_) {},
            onEtaChanged: (_) {},
          ),
        ),
      ));

      expect(find.text('Patient address'), findsOneWidget);
      expect(find.text('0900000000'), findsOneWidget);
      expect(find.byType(TextFormField), findsNothing);
    });

    testWidgets('delivery exposes only fee and ETA as editable fields',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyQuoteDeliveryStep(
            fulfillmentType: 'DELIVERY',
            address: 'Patient address',
            phone: '0900000000',
            latitude: 10.1,
            longitude: 106.2,
            feeController: TextEditingController(),
            etaController: TextEditingController(),
            onFeeChanged: (_) {},
            onEtaChanged: (_) {},
          ),
        ),
      ));

      expect(find.byType(TextFormField), findsNWidgets(2));
      expect(find.text('Patient address'), findsOneWidget);
      expect(find.text('0900000000'), findsOneWidget);
    });

    testWidgets('ETA field shows minutes suffix',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyQuoteDeliveryStep(
            fulfillmentType: 'DELIVERY',
            address: 'addr',
            phone: '0900000000',
            latitude: null,
            longitude: null,
            feeController: TextEditingController(),
            etaController: TextEditingController(),
            onFeeChanged: (_) {},
            onEtaChanged: (_) {},
          ),
        ),
      ));

      expect(find.text('Estimated delivery time'), findsOneWidget);
      expect(find.text('minutes'), findsOneWidget);
    });

    testWidgets('ETA input filters non-digit characters', (tester) async {
      int? etaValue;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PharmacyQuoteDeliveryStep(
            fulfillmentType: 'DELIVERY',
            address: 'addr',
            phone: '0900000000',
            latitude: null,
            longitude: null,
            feeController: TextEditingController(),
            etaController: TextEditingController(),
            onFeeChanged: (_) {},
            onEtaChanged: (v) => etaValue = int.tryParse(v),
          ),
        ),
      ));

      final etaField = find.widgetWithText(TextFormField, 'Estimated delivery time');
      await tester.tap(etaField);
      await tester.enterText(etaField, '45abc');
      await tester.pumpAndSettle();

      expect(etaValue, 45);
    });
  });

  group('PharmacyQuoteReviewStep - regression', () {
    testWidgets('renders all content at narrow viewport', (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: const Text('Create Order')),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: PharmacyQuoteReviewStep(
              isCreate: true,
              items: [
                QuoteLineItem(
                  medicineId: 1,
                  medicationName: 'Paracetamol',
                  quantity: 20,
                  totalSupplyDays: 10,
                  timing: ['MORNING'],
                ),
              ],
              fulfillmentType: 'DELIVERY',
              address: '123 Main St',
              phone: '0900000000',
              deliveryFee: 15000,
              estimatedDeliveryMinutes: 45,
              latitude: null,
              longitude: null,
              notes: '',
              error: null,
              isSubmitting: false,
              onSubmit: () {},
            ),
          ),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: null,
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Back'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ));

      expect(find.text('Review quote'), findsOneWidget);
      expect(find.text('Estimated arrival: 45 minutes'), findsOneWidget);
      expect(find.text('Delivery coordinates: Not set'), findsOneWidget);
      expect(find.text('Notes: None'), findsOneWidget);
      expect(find.text('Back'), findsOneWidget);
      expect(find.text('Create order'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('PharmacyQuoteEditorScreen - back from review', () {
    testWidgets('tap Back from Review returns to Delivery', (tester) async {
      final order = PharmacyOrder(
        orderId: 1,
        orderNumber: 'ORD-001',
        pharmacyId: 'ph-1',
        pharmacyName: 'Test Pharmacy',
        patientId: 'pat-1',
        patientName: 'Test Patient',
        status: 'PENDING',
        deliveryType: 'DELIVERY',
        deliveryFee: 15.0,
        deliveryAddress: '123 Main St',
        deliveryPhoneNumber: '0900000000',
        estimatedDeliveryTime: DateTime.now().add(const Duration(minutes: 60)),
        items: [
          PharmacyOrderItem(
            orderItemId: 1,
            medicineId: 1,
            medicationName: 'Paracetamol',
            quantity: 20,
            totalSupplyDays: 10,
            timing: 'MORNING',
            unitPrice: 5000,
            totalPrice: 100000,
          ),
        ],
        createdAt: DateTime.now(),
      );

      final orderProvider = _FakeOrderWithDataProvider(order);
      final authProvider = _FakeAuthProvider();

      await tester.pumpWidget(_buildTestApp(
        authProvider: authProvider,
        orderProvider: orderProvider,
        child: const PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.updateQuote,
          orderId: '201',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Update Quote'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Delivery fee'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Review quote'), findsOneWidget);

      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Delivery fee'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Review quote'), findsOneWidget);
    });
  });
}
