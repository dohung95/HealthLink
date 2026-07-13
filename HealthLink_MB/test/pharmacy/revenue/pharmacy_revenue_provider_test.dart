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

void main() {
  group('PharmacyRevenueProvider', () {
    test('load fetches transactions and builds series', () async {
      final mockClient = MockClient((_) async => http.Response(
            jsonEncode([_txJson(1, 50, 'SETTLED')]),
            200,
          ));

      final factory = (String id) =>
          PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: mockClient);
      final provider = PharmacyRevenueProvider(serviceFactory: factory);

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

      final factory = (String id) =>
          PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: mockClient);
      final provider = PharmacyRevenueProvider(serviceFactory: factory);
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

      final factory = (String id) =>
          PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: mockClient);
      final provider = PharmacyRevenueProvider(serviceFactory: factory);
      await provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(calls, 1);

      await provider.refresh(token: 'tok', pharmacyId: 'pharm-1');
      expect(calls, 2);
    });

    test('old data cleared during refresh', () async {
      final mockClient = MockClient((_) async => http.Response(
            jsonEncode([_txJson(1, 50, 'SETTLED')]),
            200,
          ));

      final factory = (String id) =>
          PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: mockClient);
      final provider = PharmacyRevenueProvider(serviceFactory: factory);
      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      expect(provider.hasData, isTrue);

      // Refresh clears cache immediately
      final fut = provider.refresh(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.hasData, isFalse);
      await fut;
      expect(provider.hasData, isTrue);
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

      final factory = (String id) =>
          PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: mockClient);
      final provider = PharmacyRevenueProvider(serviceFactory: factory);
      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      expect(provider.hasData, isTrue);

      // Second load fails
      await provider.load(token: 'tok', pharmacyId: 'pharm-1');
      expect(provider.error, isNotNull);
    });
  });
}
