import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/l10n/app_localizations.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_request_detail_screen.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_request_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

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

class _NoopWorkflow extends PharmacyWorkflowProvider {
  @override
  void startPolling(String token, String pharmacyId) {}
  @override
  void stopPolling() {}
}

Widget _buildTestApp({
  required PharmacyRequestProvider requestProvider,
}) {
  return MaterialApp(
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: _MockAuth(),
        ),
        ChangeNotifierProvider<PharmacyWorkflowProvider>.value(
          value: _NoopWorkflow(),
        ),
        ChangeNotifierProvider<PharmacyRequestProvider>.value(
          value: requestProvider,
        ),
      ],
      child: const PharmacyRequestDetailScreen(requestId: '1'),
    ),
  );
}

void main() {
  group('PharmacyRequestDetailScreen — chat visibility', () {
    testWidgets('IN_REVIEW status shows Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            if (request.url.toString().contains('chat-room')) {
              return http.Response('{"chatRoomId":"room-1"}', 404);
            }
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"IN_REVIEW","pharmacyId":"pharm-1",'
              '"requestType":"CONSULTATION",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      // Set current request to IN_REVIEW
      provider.clearCurrentRequest();
      // Manually set via internal path
      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsOneWidget);
      expect(find.text('Create Order'), findsOneWidget);
    });

    testWidgets('IN_REVIEW order request does not show Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async => http.Response(
                '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
                '"status":"IN_REVIEW","requestType":"ORDER_REQUEST",'
                '"pharmacyId":"pharm-1","createdAt":"2026-07-13T10:00:00"}',
                200,
              )),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
    });

    testWidgets('PENDING status does not show Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"PENDING","pharmacyId":"pharm-1",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
      expect(find.text('Reject'), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
    });

    testWidgets('ORDER_CREATED status does not show Chat button', (
      tester,
    ) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"ORDER_CREATED","pharmacyId":"pharm-1",'
              '"pharmacyOrderId":42,'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
      expect(find.text('View Order'), findsOneWidget);
    });

    testWidgets('CANCELLED status does not show Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"CANCELLED","pharmacyId":"pharm-1",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
    });

    testWidgets('SnackBar shown when chat room not available', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            if (request.url.toString().contains('chat-room')) {
              return http.Response('Not Found', 404);
            }
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"IN_REVIEW","pharmacyId":"pharm-1",'
              '"requestType":"CONSULTATION",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      // Tap Chat button
      await tester.tap(find.text('Chat'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(find.text('Exception: Failed to load chat room (404)'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
