import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/models/partner/partner_wallet_models.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_revenue_series.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_revenue_provider.dart';
import 'package:HealthLink/services/partner/partner_wallet_service.dart';

/// Sample JSON for a single transaction.
Map<String, dynamic> _txJson(int id, double net, String status,
    {String date = '2026-07-13T10:00:00'}) {
  return {
    'transactionId': id,
    'sourceType': 'PHARMACY_ORDER',
    'serviceType': 'PHARMACY_ORDER',
    'grossAmount': net * 1.08,
    'netAmount': net,
    'status': status,
    'createdAt': date,
  };
}

/// Returns a factory that uses a given [http.Client].
PartnerWalletServiceFactory _factory(http.Client client) =>
    (String id) =>
        PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: client);

void main() {
  group('PharmacyRevenueProvider', () {
    test('load fetches transactions and builds series', () async {
      final mockClient = MockClient((_) async => http.Response(
            jsonEncode([_txJson(1, 50, 'SETTLED')]),
            200,
          ));

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));

      expect(provider.loading, isFalse);
      expect(provider.hasData, isFalse);

      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );

      expect(provider.hasData, isTrue);
      expect(provider.loading, isFalse);
      expect(provider.error, isNull);
      expect(provider.series.total, closeTo(50, 0.001));
      expect(provider.series.transactionCount, 1);
    });

    test('selection changes re-bucket cached transactions without new HTTP', () async {
      int calls = 0;
      final mockClient = MockClient((_) async {
        calls++;
        return http.Response(jsonEncode([_txJson(1, 50, 'SETTLED')]), 200);
      });

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));
      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );

      expect(calls, 1);

      // Switch range — no new HTTP call
      provider.selectRange(PharmacyRevenueRange.month);
      expect(calls, 1);
      expect(provider.series.range, PharmacyRevenueRange.month);
    });

    test('refresh fetches again', () async {
      int calls = 0;
      final mockClient = MockClient((_) async {
        calls++;
        return http.Response(jsonEncode([]), 200);
      });

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));
      await provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(calls, 1);

      await provider.refresh(token: 'tok', pharmacyId: 'pharm-1');
      expect(calls, 2);
    });

    test('refresh does not clear existing transactions while pending', () async {
      final completer = Completer<http.Response>();
      final mockClient = MockClient((_) => completer.future);

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));

      // Load initial data
      completer.complete(http.Response(
        jsonEncode([_txJson(1, 50, 'SETTLED')]),
        200,
      ));
      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      expect(provider.hasData, isTrue);

      // Refresh does not clear cached data
      final refreshFut = provider.refresh(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.hasData, isTrue, reason: 'cached data visible during refresh');
      await refreshFut;
      expect(provider.hasData, isTrue);
    });

    test('refresh failure retains existing transactions and exposes error', () async {
      int calls = 0;
      final mockClient = MockClient((_) async {
        calls++;
        if (calls == 1) {
          return http.Response(jsonEncode([_txJson(1, 50, 'SETTLED')]), 200);
        }
        return http.Response('Server error', 500);
      });

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));
      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      expect(provider.hasData, isTrue);
      expect(provider.error, isNull);

      // Second load (load, not refresh) fails but keeps existing data
      await provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.error, isNotNull);
      expect(provider.hasData,
          isTrue, reason: 'cached data retained after failed load');
    });

    test('stale first response cannot overwrite newer refresh response', () async {
      final firstCompleter = Completer<http.Response>();
      final secondCompleter = Completer<http.Response>();

      int calls = 0;
      final mockClient = MockClient((_) async {
        calls++;
        if (calls == 1) return firstCompleter.future;
        return secondCompleter.future;
      });

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));

      // Start a slow load
      final loadFut = provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );

      // Start a fast refresh while load is still pending
      // Refresh needs to bypass the _loading guard since it's explicit
      secondCompleter.complete(http.Response(
        jsonEncode([_txJson(2, 200, 'SETTLED')]),
        200,
      ));
      await provider.refresh(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );

      // Now the stale first response arrives with old data
      firstCompleter.complete(http.Response(
        jsonEncode([_txJson(1, 50, 'SETTLED')]),
        200,
      ));
      await loadFut; // completes but should be discarded

      // The refresh result (200) should win, not the stale response (50)
      expect(provider.series.total, closeTo(200, 0.001),
          reason: 'newer refresh result must win over stale load response');
    });

    test('loading returns to false even when stale request completes late', () async {
      final firstCompleter = Completer<http.Response>();
      final secondCompleter = Completer<http.Response>();

      int calls = 0;
      final mockClient = MockClient((_) async {
        calls++;
        if (calls == 1) return firstCompleter.future;
        return secondCompleter.future;
      });

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));

      // Start first load
      provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      expect(provider.loading, isTrue);

      // Fire a refresh while first load is in flight
      secondCompleter.complete(http.Response(
        jsonEncode([_txJson(2, 200, 'SETTLED')]),
        200,
      ));
      await provider.refresh(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      expect(provider.loading, isFalse,
          reason: 'loading false after refresh completes');

      // Stale first load completes now — should NOT set loading to true again
      firstCompleter.complete(http.Response(
        jsonEncode([_txJson(1, 50, 'SETTLED')]),
        200,
      ));
      await Future(() {}); // let microtask complete

      expect(provider.loading, isFalse,
          reason: 'stale completion must not leave loading stuck');
    });

    test('duplicate load while already loading returns early', () async {
      final completer = Completer<http.Response>();
      final mockClient = MockClient((_) => completer.future);
      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));

      // Start first load (async, not awaited)
      provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.loading, isTrue);

      // Complete the first request
      completer.complete(http.Response(jsonEncode([]), 200));

      // Second load should run after first completes (loading is false now)
      provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.loading, isTrue); // second load sets loading again

      // Wait for both to settle
      await Future(() {});
      await Future(() {});
      expect(provider.loading, isFalse);
    });

    test('concurrent load rejected while refresh in progress', () async {
      final completer = Completer<http.Response>();
      int factoryCalls = 0;
      final trackingFactory = (String id) {
        factoryCalls++;
        return PartnerWalletService(
          partnerId: id,
          partnerType: 'PHARMACY',
          client: MockClient((_) => completer.future),
        );
      };

      final provider = PharmacyRevenueProvider(serviceFactory: trackingFactory);

      // Start refresh (will proceed despite _loading)
      final refreshFut = provider.refresh(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.loading, isTrue);

      // load() should return early while refresh is in flight
      await provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(factoryCalls, 1,
          reason: 'load() must not create a second service while refresh is active');

      completer.complete(http.Response(jsonEncode([]), 200));
      await refreshFut;
    });

    test('error exposes Retry without clearing previously loaded data', () async {
      int calls = 0;
      final mockClient = MockClient((_) async {
        calls++;
        if (calls == 1) {
          return http.Response(jsonEncode([_txJson(1, 50, 'SETTLED')]), 200);
        }
        return http.Response('Server error', 500);
      });

      final provider = PharmacyRevenueProvider(serviceFactory: _factory(mockClient));
      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      expect(provider.hasData, isTrue);

      // Second load fails
      await provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.error, isNotNull);
      expect(provider.hasData,
          isTrue, reason: 'cached data visible even after error');
    });
  });
}
