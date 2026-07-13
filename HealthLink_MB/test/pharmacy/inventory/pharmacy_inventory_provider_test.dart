import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_inventory_item.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_inventory_service.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';

const _token = 'test-token';
const _pharmacyId = 'pharm-1';

Map<String, dynamic> _sampleItemJson(int id, {bool active = true, int qty = 50, int reserved = 5}) => {
      'inventoryId': id,
      'medicineId': id * 100,
      'medicineName': 'Medicine $id',
      'dosageForm': 'Tablet',
      'unit': 'bottle',
      'quantity': qty,
      'reservedQuantity': reserved,
      'unitPrice': 10.0,
      'expiryDate': '2027-06-01',
      'active': active,
      'minimumStock': 10,
    };

Map<String, dynamic> _samplePageJson(List<Map<String, dynamic>> items,
    {int page = 0, int totalPages = 1, bool last = true}) => {
      'content': items,
      'totalElements': items.length,
      'totalPages': totalPages,
      'number': page,
      'size': 20,
      'last': last,
    };

PharmacyInventoryService _serviceWithClient(http.Client client) =>
    PharmacyInventoryService(client: client);

void main() {
  group('PharmacyInventoryProvider - filters', () {
    test('setFilter resets page and clears items', () {
      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(MockClient((_) async {
          return http.Response(jsonEncode(_samplePageJson([])), 200);
        })),
      );

      provider.setFilter(const InventoryFilter(category: 'Tablet'));
      expect(provider.filter.category, 'Tablet');
      expect(provider.page, 0);
      expect(provider.items, isEmpty);
    });

    test('setFilter with same filter does nothing', () {
      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(MockClient((_) async {
          return http.Response(jsonEncode(_samplePageJson([])), 200);
        })),
      );

      provider.setFilter(const InventoryFilter());
      expect(provider.page, 0);
    });

    test('passes filter params to service', () async {
      String? capturedQuery;
      final mockClient = MockClient((request) async {
        capturedQuery = request.url.queryParameters['query'];
        return http.Response(jsonEncode(_samplePageJson([
          _sampleItemJson(1),
        ])), 200);
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      provider.setFilter(const InventoryFilter(search: 'Aspirin'));
      await provider.refresh(_token, _pharmacyId);

      expect(capturedQuery, 'Aspirin');
    });

    test('passes lowStock filter to service', () async {
      bool? capturedLowStock;
      final mockClient = MockClient((request) async {
        capturedLowStock =
            request.url.queryParameters['lowStock'] == 'true' ? true : null;
        return http.Response(jsonEncode(_samplePageJson([_sampleItemJson(1, qty: 5)])), 200);
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      provider.setFilter(const InventoryFilter(lowStock: true));
      await provider.refresh(_token, _pharmacyId);

      expect(capturedLowStock, isTrue);
    });

    test('passes active filter to service', () async {
      bool? capturedActive;
      final mockClient = MockClient((request) async {
        capturedActive =
            request.url.queryParameters['active'] == 'true' ? true : null;
        return http.Response(jsonEncode(_samplePageJson([])), 200);
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      provider.setFilter(const InventoryFilter(activeOnly: true));
      await provider.refresh(_token, _pharmacyId);

      expect(capturedActive, isTrue);
    });

    test('passes expiringSoon filter to service', () async {
      bool? capturedExpiring;
      final mockClient = MockClient((request) async {
        capturedExpiring =
            request.url.queryParameters['expiringSoon'] == 'true' ? true : null;
        return http.Response(jsonEncode(_samplePageJson([])), 200);
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      provider.setFilter(const InventoryFilter(expiringSoon: true));
      await provider.refresh(_token, _pharmacyId);

      expect(capturedExpiring, isTrue);
    });
  });

  group('PharmacyInventoryProvider - paging', () {
    test('refresh replaces items', () async {
      int callCount = 0;
      final mockClient = MockClient((request) async {
        callCount++;
        return http.Response(
          jsonEncode(_samplePageJson(
            List.generate(2, (i) => _sampleItemJson(callCount * 10 + i)),
            page: callCount - 1,
            last: false,
          )),
          200,
        );
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );

      await provider.refresh(_token, _pharmacyId);
      expect(provider.items.length, 2);

      await provider.refresh(_token, _pharmacyId);
      expect(provider.items.length, 2,
          reason: 'refresh should replace, not append');
    });

    test('loadMore appends items', () async {
      int callCount = 0;
      final mockClient = MockClient((request) async {
        callCount++;
        return http.Response(
          jsonEncode(_samplePageJson(
            List.generate(2, (i) => _sampleItemJson(callCount * 10 + i)),
            page: callCount - 1,
            totalPages: 3,
            last: callCount >= 3,
          )),
          200,
        );
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );

      await provider.refresh(_token, _pharmacyId);
      expect(provider.items.length, 2);

      await provider.loadMore(_token, _pharmacyId);
      expect(provider.items.length, 4,
          reason: 'loadMore should append items');
      expect(provider.hasMore, isTrue);

      await provider.loadMore(_token, _pharmacyId);
      expect(provider.items.length, 6);
    });

    test('does not loadMore when already loading', () async {
      int callCount = 0;
      final mockClient = MockClient((request) async {
        callCount++;
        await Future.delayed(const Duration(milliseconds: 50));
        return http.Response(
          jsonEncode(_samplePageJson(
            List.generate(2, (i) => _sampleItemJson(callCount * 10 + i)),
            page: callCount - 1,
            last: false,
          )),
          200,
        );
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      await provider.refresh(_token, _pharmacyId);

      Future.wait([
        provider.loadMore(_token, _pharmacyId),
        provider.loadMore(_token, _pharmacyId),
      ]);
      await Future.delayed(const Duration(milliseconds: 100));

      expect(callCount, 2, reason: 'second loadMore should be skipped');
    });

    test('does not loadMore when hasMore is false', () async {
      int callCount = 0;
      final mockClient = MockClient((request) async {
        callCount++;
        return http.Response(
          jsonEncode(_samplePageJson(
            List.generate(2, (i) => _sampleItemJson(i)),
            page: 0,
            last: true,
          )),
          200,
        );
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      await provider.refresh(_token, _pharmacyId);
      expect(provider.hasMore, isFalse);

      await provider.loadMore(_token, _pharmacyId);
      expect(callCount, 1, reason: 'loadMore should not call service');
    });
  });

  group('PharmacyInventoryProvider - deduplication', () {
    test('loadMore does not add duplicate inventoryId items', () async {
      final mockClient = MockClient((request) async {
        final page =
            int.parse(request.url.queryParameters['page'] ?? '0');
        final items = List.generate(
          2,
          (i) => _sampleItemJson(i + 1),
        );
        return http.Response(
          jsonEncode(_samplePageJson(items,
              page: page, last: page >= 1, totalPages: 2)),
          200,
        );
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      await provider.refresh(_token, _pharmacyId);
      expect(provider.items.length, 2);

      await provider.loadMore(_token, _pharmacyId);
      expect(provider.items.length, 2,
          reason: 'should deduplicate by inventoryId');
    });
  });

  group('PharmacyInventoryProvider - edit refresh', () {
    test('updateItem replaces item in list', () async {
      final mockClient = MockClient((_) async {
        return http.Response(
          jsonEncode(_sampleItemJson(1)),
          200,
        );
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      provider.items.addAll([
        PharmacyInventoryItem(
          inventoryId: 1,
          medicineId: 100,
          medicineName: 'Old Name',
          quantity: 10,
          reservedQuantity: 0,
          active: true,
        ),
      ]);

      final updated = PharmacyInventoryItem(
        inventoryId: 1,
        medicineId: 100,
        medicineName: 'Updated Name',
        quantity: 20,
        reservedQuantity: 2,
        active: true,
      );
      final result = await provider.updateItem(_token, updated, _pharmacyId);
      expect(result, isTrue);
      expect(provider.items.length, 1);
      // Service returns the mock item (quantity 50), not the passed value
      expect(provider.items[0].quantity, 50);
    });

    test('updateItem calls service PATCH', () async {
      int? patchedInventoryId;
      Map<String, dynamic>? patchedBody;

      final mockClient = MockClient((request) async {
        if (request.method == 'PATCH') {
          patchedInventoryId =
              int.tryParse(request.url.pathSegments.last);
          patchedBody = jsonDecode(request.body) as Map<String, dynamic>;
        }
        return http.Response(
          jsonEncode(_sampleItemJson(1, qty: 30)),
          200,
        );
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      provider.items.addAll([
        PharmacyInventoryItem(
          inventoryId: 1,
          medicineId: 100,
          medicineName: 'Test',
          quantity: 10,
          reservedQuantity: 0,
          active: true,
        ),
      ]);

      await provider.updateItem(
        _token,
        PharmacyInventoryItem(
          inventoryId: 1,
          medicineId: 100,
          medicineName: 'Test',
          quantity: 30,
          reservedQuantity: 0,
          active: true,
        ),
        _pharmacyId,
      );

      expect(patchedInventoryId, 1);
      expect(patchedBody!['quantity'], 30);
    });
  });

  group('PharmacyInventoryProvider - lowStockCount and expiringCount', () {
    test('lowStockCount returns count of items below minimumStock', () {
      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(MockClient((_) async {
          return http.Response(jsonEncode(_samplePageJson([])), 200);
        })),
      );
      provider.items.addAll([
        PharmacyInventoryItem(
            inventoryId: 1,
            medicineId: 1,
            medicineName: 'A',
            quantity: 5,
            reservedQuantity: 0,
            minimumStock: 10,
            active: true),
        PharmacyInventoryItem(
            inventoryId: 2,
            medicineId: 2,
            medicineName: 'B',
            quantity: 20,
            reservedQuantity: 0,
            minimumStock: 10,
            active: true),
        PharmacyInventoryItem(
            inventoryId: 3,
            medicineId: 3,
            medicineName: 'C',
            quantity: 8,
            reservedQuantity: 0,
            minimumStock: 10,
            active: true),
      ]);

      expect(provider.lowStockCount, 2);
    });

    test('expiringCount returns count of items expiring within 30 days', () {
      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(MockClient((_) async {
          return http.Response(jsonEncode(_samplePageJson([])), 200);
        })),
      );
      final nearFuture =
          DateTime.now().add(const Duration(days: 15)).toIso8601String().substring(0, 10);
      final farFuture =
          DateTime.now().add(const Duration(days: 90)).toIso8601String().substring(0, 10);

      provider.items.addAll([
        PharmacyInventoryItem(
            inventoryId: 1,
            medicineId: 1,
            medicineName: 'A',
            quantity: 10,
            reservedQuantity: 0,
            expiryDate: nearFuture,
            active: true),
        PharmacyInventoryItem(
            inventoryId: 2,
            medicineId: 2,
            medicineName: 'B',
            quantity: 10,
            reservedQuantity: 0,
            expiryDate: farFuture,
            active: true),
      ]);

      expect(provider.expiringCount, 1);
    });
  });

  group('PharmacyInventoryProvider - error and loading states', () {
    test('sets error on service failure', () async {
      final mockClient = MockClient((_) async {
        throw Exception('Network error');
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );
      await provider.refresh(_token, _pharmacyId);

      expect(provider.error, isNotNull);
      expect(provider.loading, isFalse);
    });

    test('clearError resets error', () {
      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(MockClient((_) async {
          return http.Response(jsonEncode(_samplePageJson([])), 200);
        })),
      );
      provider.setError('test error');
      expect(provider.error, 'test error');

      provider.clearError();
      expect(provider.error, isNull);
    });

    test('loading is true during refresh', () async {
      final mockClient = MockClient((_) async {
        await Future.delayed(const Duration(milliseconds: 50));
        return http.Response(jsonEncode(_samplePageJson([])), 200);
      });

      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(mockClient),
      );

      final future = provider.refresh(_token, _pharmacyId);
      expect(provider.loading, isTrue);
      await future;
      expect(provider.loading, isFalse);
    });
  });

  group('PharmacyInventoryProvider - import result parsing', () {
    test('parseImportResult handles success', () {
      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(MockClient((_) async {
          return http.Response(jsonEncode(_samplePageJson([])), 200);
        })),
      );
      final result = provider.parseImportResult({
        'importedCount': 10,
        'updatedCount': 5,
        'skippedCount': 2,
        'rowErrors': [
          {
            'rowNumber': 3,
            'medicineId': 123,
            'medicineName': 'Paracetamol',
            'message': 'Invalid quantity',
          },
        ],
      });

      expect(result.importedCount, 10);
      expect(result.updatedCount, 5);
      expect(result.skippedCount, 2);
      expect(result.rowErrors.length, 1);
      expect(result.rowErrors[0].medicineName, 'Paracetamol');
    });

    test('parseImportResult handles empty result', () {
      final provider = PharmacyInventoryProvider(
        inventoryService: _serviceWithClient(MockClient((_) async {
          return http.Response(jsonEncode(_samplePageJson([])), 200);
        })),
      );
      final result = provider.parseImportResult({});
      expect(result.importedCount, 0);
      expect(result.rowErrors, isEmpty);
    });
  });
}
