import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_inventory_service.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_inventory_screen.dart';

class _MockAuthProvider extends AuthProvider {
  _MockAuthProvider() : super();

  @override
  String? get accessToken => 'mock-token';

  @override
  String? get userId => 'user-1';

  @override
  Map<String, dynamic>? get pharmacyProfile => {'pharmacyId': 'pharm-1'};
}

Map<String, dynamic> _sampleItemJson(int id) => {
      'inventoryId': id,
      'medicineId': id * 100,
      'medicineName': 'Medicine $id',
      'dosageForm': 'Tablet',
      'unit': 'bottle',
      'quantity': 50,
      'reservedQuantity': 5,
      'unitPrice': 10.0,
      'expiryDate': '2027-06-01',
      'active': true,
      'minimumStock': 10,
    };

Map<String, dynamic> _pageJson(List<Map<String, dynamic>> items) => {
      'content': items,
      'totalElements': items.length,
      'totalPages': 1,
      'number': 0,
      'size': 20,
      'last': true,
    };

Widget _buildTestApp(PharmacyInventoryProvider provider) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(
        value: _MockAuthProvider(),
      ),
      ChangeNotifierProvider<PharmacyInventoryProvider>.value(
        value: provider,
      ),
    ],
    child: const MaterialApp(
      home: PharmacyInventoryScreen(),
    ),
  );
}

void main() {
  group('PharmacyInventoryScreen - states', () {
    testWidgets('shows loading indicator when loading and empty',
        (tester) async {
      final mockClient = MockClient((_) async {
        await Future.delayed(const Duration(seconds: 1));
        return http.Response(jsonEncode(_pageJson([])), 200);
      });

      final service = PharmacyInventoryService(client: mockClient);
      final provider = PharmacyInventoryProvider(inventoryService: service);

      provider.refresh('token', 'pharm-1');
      await tester.pumpWidget(_buildTestApp(provider));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Drain pending timers to clean up
      await tester.pump(const Duration(seconds: 2));
    });

    testWidgets('shows empty state when no items and done loading',
        (tester) async {
      final mockClient = MockClient((_) async {
        return http.Response(jsonEncode(_pageJson([])), 200);
      });

      final service = PharmacyInventoryService(client: mockClient);
      final provider = PharmacyInventoryProvider(inventoryService: service);

      await tester.pumpWidget(_buildTestApp(provider));
      await tester.pump();
      // Let the async load complete
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No inventory items found'), findsOneWidget);
    });

    testWidgets('shows error state with retry button', (tester) async {
      final mockClient = MockClient((_) async {
        throw Exception('Network error');
      });

      final service = PharmacyInventoryService(client: mockClient);
      final provider = PharmacyInventoryProvider(inventoryService: service);

      await tester.pumpWidget(_buildTestApp(provider));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows inventory items in a list', (tester) async {
      final mockClient = MockClient((_) async {
        return http.Response(
          jsonEncode(_pageJson([
            _sampleItemJson(1),
            _sampleItemJson(2),
          ])),
          200,
        );
      });

      final service = PharmacyInventoryService(client: mockClient);
      final provider = PharmacyInventoryProvider(inventoryService: service);

      await tester.pumpWidget(_buildTestApp(provider));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Medicine 1'), findsOneWidget);
      expect(find.text('Medicine 2'), findsOneWidget);
    });
  });
}
