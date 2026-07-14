import 'dart:convert';

import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_revenue_provider.dart';
import 'package:HealthLink/services/partner/partner_wallet_service.dart';
import 'package:HealthLink/widgets/pharmacy/pharmacy_revenue_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';

class _MockAuth extends AuthProvider {
  @override
  bool get isPharmacy => true;

  @override
  String? get accessToken => 'mock-token';

  @override
  String? get userId => 'pharm-1';

  @override
  Map<String, dynamic>? get pharmacyProfile => {
    'pharmacyId': 'pharm-1',
    'name': 'Test Pharmacy',
  };
}

PharmacyRevenueProvider _makeProvider(List<Map<String, dynamic>> transactions) {
  final client = MockClient(
    (_) async => http.Response(jsonEncode(transactions), 200),
  );
  return PharmacyRevenueProvider(
    serviceFactory: (id) => PartnerWalletService(
      partnerId: id,
      partnerType: 'PHARMACY',
      client: client,
    ),
  );
}

Map<String, dynamic> _transaction({
  required int id,
  required double netAmount,
  required DateTime createdAt,
}) {
  return {
    'transactionId': id,
    'sourceType': 'PHARMACY_ORDER',
    'serviceType': 'PHARMACY_ORDER',
    'grossAmount': netAmount + 4,
    'netAmount': netAmount,
    'status': 'SETTLED',
    'createdAt': createdAt.toIso8601String(),
  };
}

Widget _buildApp(PharmacyRevenueProvider provider, {double width = 800}) {
  return MaterialApp(
    home: MediaQuery(
      data: MediaQueryData(size: Size(width, 800)),
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider<PharmacyRevenueProvider>.value(
            value: provider,
          ),
          ChangeNotifierProvider<AuthProvider>.value(value: _MockAuth()),
        ],
        child: const Scaffold(
          body: SingleChildScrollView(child: PharmacyRevenueCard()),
        ),
      ),
    ),
  );
}

Future<void> _load(
  WidgetTester tester,
  PharmacyRevenueProvider provider,
) async {
  await tester.pumpWidget(_buildApp(provider));
  await provider.load(token: 'tok', pharmacyId: 'pharm-1');
  await tester.pumpAndSettle();
}

void main() {
  group('PharmacyRevenueCard', () {
    testWidgets('uses growth-first layout without revenue summary header', (
      tester,
    ) async {
      final now = DateTime.now();
      final provider = _makeProvider([
        _transaction(id: 1, netAmount: 50, createdAt: now),
        _transaction(
          id: 2,
          netAmount: 25,
          createdAt: now.subtract(const Duration(days: 7)),
        ),
      ]);

      await _load(tester, provider);

      expect(find.text('NET REVENUE'), findsNothing);
      expect(find.textContaining('transactions'), findsNothing);
      expect(find.text('Week'), findsOneWidget);
      expect(find.text('Month'), findsOneWidget);
      expect(find.text('Year'), findsOneWidget);
      expect(find.text('vs previous week'), findsOneWidget);

      expect(
        tester.getRect(find.byType(Card)).height,
        greaterThanOrEqualTo(240),
      );
      expect(
        tester
            .getSize(find.byKey(const ValueKey('pharmacy-revenue-chart')))
            .height,
        inInclusiveRange(150, 170),
      );
      expect(
        tester.getCenter(find.text('vs previous week')).dx,
        lessThan(tester.getCenter(find.text('Week')).dx),
      );
    });

    testWidgets('wraps the range control below growth on narrow screens', (
      tester,
    ) async {
      final provider = _makeProvider([]);
      await tester.pumpWidget(_buildApp(provider, width: 320));
      await tester.pumpAndSettle();

      expect(
        tester.getCenter(find.text('Week')).dy,
        greaterThan(tester.getCenter(find.text('No previous comparison')).dy),
      );
    });

    testWidgets('shows tooltip and semantics only after tapping a real bar', (
      tester,
    ) async {
      final now = DateTime.now();
      final provider = _makeProvider([
        _transaction(id: 1, netAmount: 50, createdAt: now),
        _transaction(id: 2, netAmount: 25, createdAt: now),
      ]);

      await _load(tester, provider);

      expect(find.text('\$75.00'), findsNothing);
      final bar = find.bySemanticsLabel(RegExp(r'\$75\.00 \| 2 transactions'));
      expect(bar, findsOneWidget);

      await tester.tap(bar);
      await tester.pumpAndSettle();

      expect(find.textContaining('\$75.00 | 2 transactions'), findsOneWidget);
    });

    testWidgets(
      'future month and year buckets show labels without tappable bars',
      (tester) async {
        final provider = _makeProvider([
          _transaction(id: 1, netAmount: 10, createdAt: DateTime.now()),
        ]);
        await _load(tester, provider);

        await tester.tap(find.text('Month'));
        await tester.pumpAndSettle();
        expect(find.text('W4'), findsOneWidget);

        await tester.tap(find.text('Year'));
        await tester.pumpAndSettle();
        final futureMonth = _monthAfter(DateTime.now().month);
        expect(find.text(futureMonth), findsOneWidget);
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Tooltip &&
                widget.triggerMode == TooltipTriggerMode.tap,
          ),
          findsNWidgets(DateTime.now().month),
        );
      },
    );

    testWidgets('shows positive growth and selected range comparison suffix', (
      tester,
    ) async {
      final now = DateTime.now();
      final provider = _makeProvider([
        _transaction(id: 1, netAmount: 100, createdAt: now),
        _transaction(
          id: 2,
          netAmount: 50,
          createdAt: now.subtract(const Duration(days: 7)),
        ),
      ]);

      await _load(tester, provider);

      expect(find.byIcon(Icons.trending_up), findsOneWidget);
      expect(find.text('+100.0%'), findsOneWidget);
      expect(find.text('vs previous week'), findsOneWidget);
    });

    testWidgets('shows negative growth', (tester) async {
      final now = DateTime.now();
      final provider = _makeProvider([
        _transaction(id: 1, netAmount: 50, createdAt: now),
        _transaction(
          id: 2,
          netAmount: 100,
          createdAt: now.subtract(const Duration(days: 7)),
        ),
      ]);

      await _load(tester, provider);

      expect(find.byIcon(Icons.trending_down), findsOneWidget);
      expect(find.text('-50.0%'), findsOneWidget);
    });

    testWidgets('shows NEW when current revenue has no previous comparison', (
      tester,
    ) async {
      final provider = _makeProvider([
        _transaction(id: 1, netAmount: 50, createdAt: DateTime.now()),
      ]);

      await _load(tester, provider);

      expect(find.text('NEW'), findsOneWidget);
      expect(find.text('vs previous week'), findsOneWidget);
    });

    testWidgets('shows no previous comparison and empty-period message', (
      tester,
    ) async {
      final provider = _makeProvider([]);
      await _load(tester, provider);

      expect(find.text('No previous comparison'), findsOneWidget);
      expect(find.text('No revenue in this period'), findsOneWidget);
    });

    testWidgets('moves month and year navigation above the chart', (
      tester,
    ) async {
      final provider = _makeProvider([]);
      await _load(tester, provider);

      await tester.tap(find.text('Month'));
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.chevron_left), findsOneWidget);
      expect(
        tester.getCenter(find.byIcon(Icons.chevron_left)).dy,
        lessThan(
          tester
              .getCenter(find.byKey(const ValueKey('pharmacy-revenue-chart')))
              .dy,
        ),
      );

      await tester.tap(find.text('Year'));
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.chevron_right), findsOneWidget);
      expect(find.text('vs previous year'), findsOneWidget);
    });

    testWidgets('error keeps compact Retry action', (tester) async {
      final client = MockClient((_) async => http.Response('err', 500));
      final provider = PharmacyRevenueProvider(
        serviceFactory: (id) => PartnerWalletService(
          partnerId: id,
          partnerType: 'PHARMACY',
          client: client,
        ),
      );
      await tester.pumpWidget(_buildApp(provider));
      await provider.load(token: 'tok', pharmacyId: 'pharm-1');
      await tester.pumpAndSettle();

      expect(find.text('Retry'), findsOneWidget);
    });
  });
}

String _monthAfter(int month) {
  const labels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return labels[month == 12 ? 0 : month];
}
