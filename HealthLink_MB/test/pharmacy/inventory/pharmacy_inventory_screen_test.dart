import 'dart:convert';

import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_inventory_screen.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_inventory_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class _MockAuthProvider extends AuthProvider {
  _MockAuthProvider() : super();

  @override
  String? get accessToken => 'mock-token';

  @override
  String? get userId => 'user-1';

  @override
  Map<String, dynamic>? get pharmacyProfile => {'pharmacyId': 'pharm-1'};
}

Map<String, dynamic> _inventoryItem({
  required int id,
  required String name,
  int quantity = 120,
  int reserved = 20,
  int? minimumStock = 50,
  String? expiryDate = '2099-12-31',
  bool active = true,
}) => {
  'inventoryId': id,
  'medicineId': id * 100,
  'medicineName': name,
  'genericName': 'Acetaminophen',
  'category': 'Analgesic',
  'dosageForm': 'Tablet',
  'unit': 'bottle',
  'quantity': quantity,
  'reservedQuantity': reserved,
  'unitPrice': 10.0,
  if (expiryDate != null) 'expiryDate': expiryDate,
  'active': active,
  if (minimumStock != null) 'minimumStock': minimumStock,
};

List<Map<String, dynamic>> _operationalItems() {
  final items = <Map<String, dynamic>>[
    _inventoryItem(id: 1, name: 'Normal item'),
    _inventoryItem(
      id: 2,
      name: 'Inactive item',
      quantity: 20,
      reserved: 8,
      minimumStock: 40,
      expiryDate: '2000-01-15',
      active: false,
    ),
    _inventoryItem(
      id: 3,
      name: 'Low stock item',
      quantity: 20,
      reserved: 8,
      minimumStock: 40,
      expiryDate: '2000-01-15',
    ),
    _inventoryItem(
      id: 4,
      name: 'Expiring item',
      quantity: 60,
      reserved: 10,
      minimumStock: 40,
      expiryDate: '2000-01-15',
    ),
    _inventoryItem(
      id: 5,
      name: 'No minimum item',
      minimumStock: null,
      expiryDate: null,
    ),
    for (var id = 6; id <= 9; id++)
      _inventoryItem(
        id: id,
        name: 'Additional low item $id',
        quantity: 20,
        reserved: 8,
        minimumStock: 40,
      ),
    for (var id = 10; id <= 48; id++)
      _inventoryItem(id: id, name: 'Additional item $id'),
  ];
  return items;
}

Map<String, dynamic> _pageJson(List<Map<String, dynamic>> items) => {
  'content': items,
  'totalElements': items.length,
  'totalPages': 1,
  'number': 0,
  'size': 50,
  'last': true,
};

Widget _buildTestApp(PharmacyInventoryProvider provider) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(value: _MockAuthProvider()),
      ChangeNotifierProvider<PharmacyInventoryProvider>.value(value: provider),
    ],
    child: const MaterialApp(home: PharmacyInventoryScreen()),
  );
}

PharmacyInventoryProvider _providerFor(List<Map<String, dynamic>> items) {
  final service = PharmacyInventoryService(
    client: MockClient(
      (_) async => http.Response(jsonEncode(_pageJson(items)), 200),
    ),
  );
  return PharmacyInventoryProvider(inventoryService: service);
}

Future<void> _pumpInventoryScreen(
  WidgetTester tester,
  List<Map<String, dynamic>> items,
) async {
  await tester.pumpWidget(_buildTestApp(_providerFor(items)));
  await tester.pump();
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => Intl.defaultLocale = 'en_US');

  group('PharmacyInventoryScreen - states', () {
    testWidgets('shows loading indicator when loading and empty', (
      tester,
    ) async {
      final mockClient = MockClient((_) async {
        await Future<void>.delayed(const Duration(seconds: 1));
        return http.Response(jsonEncode(_pageJson([])), 200);
      });
      final provider = PharmacyInventoryProvider(
        inventoryService: PharmacyInventoryService(client: mockClient),
      );

      provider.refresh('token');
      await tester.pumpWidget(_buildTestApp(provider));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await tester.pump(const Duration(seconds: 2));
    });

    testWidgets('shows empty state when no items and done loading', (
      tester,
    ) async {
      await _pumpInventoryScreen(tester, []);

      expect(find.text('No inventory items found'), findsOneWidget);
    });

    testWidgets('shows error state with retry button', (tester) async {
      final provider = PharmacyInventoryProvider(
        inventoryService: PharmacyInventoryService(
          client: MockClient((_) async => throw Exception('Network error')),
        ),
      );

      await tester.pumpWidget(_buildTestApp(provider));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows inventory items in a list', (tester) async {
      await _pumpInventoryScreen(tester, _operationalItems());

      expect(find.text('Normal item'), findsOneWidget);
      expect(find.text('Inactive item'), findsOneWidget);
    });
  });

  group('PharmacyInventoryScreen - operational list', () {
    testWidgets('renders three equal summary metrics', (tester) async {
      await _pumpInventoryScreen(tester, _operationalItems());

      expect(find.text('48'), findsOneWidget);
      expect(find.text('items'), findsOneWidget);
      expect(find.text('6'), findsOneWidget);
      expect(find.text('low stock'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('expiring'), findsOneWidget);

      final totalWidth = tester
          .getSize(find.byKey(const ValueKey('inventory-summary-total')))
          .width;
      final lowStockWidth = tester
          .getSize(find.byKey(const ValueKey('inventory-summary-low-stock')))
          .width;
      final expiringWidth = tester
          .getSize(find.byKey(const ValueKey('inventory-summary-expiring')))
          .width;
      expect(totalWidth, lowStockWidth);
      expect(lowStockWidth, expiringWidth);
    });

    testWidgets('renders the approved inventory row hierarchy', (tester) async {
      await _pumpInventoryScreen(tester, _operationalItems());

      final normalRow = find.byKey(const ValueKey('inventory-1'));
      expect(normalRow, findsOneWidget);
      Finder inNormalRow(Finder matcher) =>
          find.descendant(of: normalRow, matching: matcher);

      expect(inNormalRow(find.text('Normal item')), findsOneWidget);
      expect(
        inNormalRow(find.text('Acetaminophen | Analgesic | Tablet')),
        findsOneWidget,
      );
      expect(inNormalRow(find.text('AVAILABLE')), findsOneWidget);
      expect(inNormalRow(find.text('100')), findsOneWidget);
      expect(inNormalRow(find.text('On hand')), findsOneWidget);
      expect(inNormalRow(find.text('Reserved')), findsOneWidget);
      expect(inNormalRow(find.text('Min stock')), findsOneWidget);
      expect(inNormalRow(find.text('Price')), findsOneWidget);
      expect(inNormalRow(find.text('Expiry')), findsOneWidget);
      expect(inNormalRow(find.text(r'$10.00')), findsOneWidget);
      expect(
        inNormalRow(
          find.text(DateFormat.yMMMd().format(DateTime.parse('2099-12-31'))),
        ),
        findsOneWidget,
      );

      final identity = tester
          .getTopLeft(inNormalRow(find.text('Normal item')))
          .dy;
      final metadata = tester
          .getTopLeft(
            inNormalRow(find.text('Acetaminophen | Analgesic | Tablet')),
          )
          .dy;
      final progress = tester
          .getTopLeft(inNormalRow(find.byType(LinearProgressIndicator)))
          .dy;
      final stockMetrics = tester
          .getTopLeft(inNormalRow(find.text('On hand')))
          .dy;
      final priceExpiry = tester.getTopLeft(inNormalRow(find.text('Price'))).dy;
      expect(identity, lessThan(metadata));
      expect(metadata, lessThan(progress));
      expect(progress, lessThan(stockMetrics));
      expect(stockMetrics, lessThan(priceExpiry));
    });

    testWidgets(
      'uses inactive then low stock then expiring status precedence',
      (tester) async {
        await _pumpInventoryScreen(tester, _operationalItems());

        for (final entry in const {
          2: 'Inactive',
          3: 'Low stock',
          4: 'Expiring',
        }.entries) {
          final row = find.byKey(ValueKey('inventory-${entry.key}'));
          await tester.scrollUntilVisible(
            row,
            160,
            scrollable: find.byType(Scrollable).first,
          );
          expect(
            find.descendant(of: row, matching: find.text(entry.value)),
            findsOneWidget,
          );
        }
      },
    );

    testWidgets('hides stock progress when minimum stock is missing', (
      tester,
    ) async {
      await _pumpInventoryScreen(tester, [_operationalItems()[4]]);

      final noMinimumRow = find.byKey(const ValueKey('inventory-5'));
      expect(noMinimumRow, findsOneWidget);
      expect(
        find.descendant(
          of: noMinimumRow,
          matching: find.byType(LinearProgressIndicator),
        ),
        findsNothing,
      );
    });

    testWidgets('opens the existing edit sheet when a row is tapped', (
      tester,
    ) async {
      await _pumpInventoryScreen(tester, _operationalItems());

      await tester.tap(find.text('Normal item'));
      await tester.pumpAndSettle();

      expect(find.text('Edit Normal item'), findsOneWidget);
    });

    testWidgets('does not overflow at operational mobile widths', (
      tester,
    ) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));

      for (final size in const [Size(390, 844), Size(320, 700)]) {
        await tester.binding.setSurfaceSize(size);
        await _pumpInventoryScreen(tester, _operationalItems());

        expect(tester.takeException(), isNull, reason: 'at $size');
        expect(find.byType(ErrorWidget), findsNothing, reason: 'at $size');
      }
    });
  });
}
