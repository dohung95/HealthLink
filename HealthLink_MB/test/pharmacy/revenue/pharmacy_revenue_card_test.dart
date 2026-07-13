import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_revenue_provider.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/services/partner/partner_wallet_service.dart';
import 'package:HealthLink/widgets/pharmacy/pharmacy_revenue_card.dart';

class _MockAuth extends AuthProvider {
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

/// Helper to create a provider with mock HTTP returning [body].
PharmacyRevenueProvider _makeProvider(String body) {
  final mc = MockClient((_) async => http.Response(body, 200));
  return PharmacyRevenueProvider(
    serviceFactory: (id) =>
        PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: mc),
  );
}

Widget _buildApp(PharmacyRevenueProvider provider) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<PharmacyRevenueProvider>.value(value: provider),
        ChangeNotifierProvider<AuthProvider>.value(value: _MockAuth()),
      ],
      child: const Scaffold(
        body: SingleChildScrollView(child: PharmacyRevenueCard()),
      ),
    ),
  );
}

void main() {
  group('PharmacyRevenueCard', () {
    testWidgets('shows NET REVENUE, total, transaction count',
        (tester) async {
      final body = jsonEncode([
        {
          'transactionId': 1,
          'sourceType': 'PHARMACY_ORDER',
          'serviceType': 'PHARMACY_ORDER',
          'grossAmount': 54.0,
          'netAmount': 50.0,
          'status': 'SETTLED',
          'createdAt': '2026-07-13T10:00:00',
        },
        {
          'transactionId': 2,
          'sourceType': 'PHARMACY_ORDER',
          'serviceType': 'PHARMACY_ORDER',
          'grossAmount': 27.0,
          'netAmount': 25.0,
          'status': 'VESTED',
          'createdAt': '2026-07-10T10:00:00',
        },
      ]);
      final provider = _makeProvider(body);
      await tester.pumpWidget(_buildApp(provider));
      await provider.load(
        token: 'tok',
        pharmacyId: 'pharm-1',
        now: DateTime(2026, 7, 13),
      );
      await tester.pumpAndSettle();

      expect(find.text('NET REVENUE'), findsOneWidget);
      expect(find.text('2 transactions'), findsOneWidget);
    });

    testWidgets('shows Week/Month/Year segmented buttons', (tester) async {
      final provider = _makeProvider(jsonEncode([]));
      await tester.pumpWidget(_buildApp(provider));
      await tester.pump();

      expect(find.text('Week'), findsOneWidget);
      expect(find.text('Month'), findsOneWidget);
      expect(find.text('Year'), findsOneWidget);
    });

    testWidgets('tapping Month shows month selector with chevrons',
        (tester) async {
      final provider = _makeProvider(jsonEncode([]));
      await tester.pumpWidget(_buildApp(provider));
      await tester.pump();

      // Tap Month
      await tester.tap(find.text('Month'));
      await tester.pump();

      // Should show month chevrons
      expect(find.byIcon(Icons.chevron_left), findsWidgets);
      expect(find.byIcon(Icons.chevron_right), findsWidgets);
    });

    testWidgets('zero data shows No revenue data', (tester) async {
      final provider = _makeProvider(jsonEncode([]));
      await tester.pumpWidget(_buildApp(provider));
      await tester.pump();

      expect(find.text('No revenue data'), findsOneWidget);
    });

    testWidgets('error shows Retry text', (tester) async {
      final provider = PharmacyRevenueProvider(
        serviceFactory: (_) =>
            PartnerWalletService(partnerId: 'x', partnerType: 'PHARMACY'),
      );
      // Manually trigger error by passing unreachable client
      final mc = MockClient((_) async => http.Response('err', 500));
      final errProvider = PharmacyRevenueProvider(
        serviceFactory: (id) =>
            PartnerWalletService(partnerId: id, partnerType: 'PHARMACY', client: mc),
      );
      await tester.pumpWidget(_buildApp(errProvider));
      // Attempt load will fail
      errProvider.load(token: 'tok', pharmacyId: 'pharm-1');
      await tester.pumpAndSettle();

      // The footer should show error state
      expect(find.text('Retry'), findsWidgets);
    });
  });
}
