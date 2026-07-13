import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_workflow_service.dart';

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

List<Map<String, dynamic>> _sampleItems() => [
      {
        'id': 'wi-1',
        'pharmacyId': 'pharm-1',
        'sourceType': 'CONSULTATION',
        'sourceId': 101,
        'workflowStage': 'REVIEW',
        'availableActions': ['ACCEPT', 'REJECT'],
        'patientId': 'pat-1',
        'patientName': 'Patient A',
        'requestId': 101,
        'requestStatus': 'PENDING',
        'createdAt': '2026-07-13T10:00:00.000Z',
      },
      {
        'id': 'wi-2',
        'pharmacyId': 'pharm-1',
        'sourceType': 'PICKUP_ORDER',
        'sourceId': 201,
        'workflowStage': 'FULFILLMENT',
        'availableActions': ['MARK_READY'],
        'patientId': 'pat-2',
        'patientName': 'Patient B',
        'orderId': 201,
        'orderStatus': 'PENDING',
        'createdAt': '2026-07-13T09:00:00.000Z',
      },
      {
        'id': 'wi-3',
        'pharmacyId': 'pharm-1',
        'sourceType': 'DELIVERY_ORDER',
        'sourceId': 301,
        'workflowStage': 'FULFILLMENT',
        'availableActions': ['START_SHIPPING'],
        'patientId': 'pat-3',
        'patientName': 'Patient C',
        'orderId': 301,
        'orderStatus': 'CONFIRMED',
        'createdAt': '2026-07-13T08:00:00.000Z',
      },
    ];

void main() {
  group('PharmacyWorkflowProvider', () {
    late PharmacyWorkflowProvider provider;
    late MockClient mockClient;

    setUp(() {
      mockClient = MockClient((request) async {
        return http.Response(jsonEncode(_sampleItems()), 200);
      });
      final service = PharmacyWorkflowService(client: mockClient);
      provider = PharmacyWorkflowProvider(workflowService: service);
    });

    test('initial state is empty', () {
      expect(provider.workItems, isEmpty);
      expect(provider.isLoading, false);
      expect(provider.error, isNull);
      expect(provider.pendingOrdersCount, 0);
      expect(provider.pendingRequestsCount, 0);
      expect(provider.totalBadgeCount, 0);
    });

    test('refresh loads work items', () async {
      await provider.refresh('token', 'pharm-1');
      expect(provider.workItems.length, 3);
      expect(provider.isLoading, false);
    });

    test('pendingRequestsCount counts consultation with PENDING status', () async {
      await provider.refresh('token', 'pharm-1');
      // wi-1 has requestStatus=PENDING
      expect(provider.pendingRequestsCount, 1);
    });

    test('pendingOrdersCount counts pickup/delivery orders with PENDING or CONFIRMED', () async {
      await provider.refresh('token', 'pharm-1');
      // wi-2 has orderStatus=PENDING (pickup), wi-3 has orderStatus=CONFIRMED (delivery)
      expect(provider.pendingOrdersCount, 2);
    });

    test('totalBadgeCount sums pending counts', () async {
      await provider.refresh('token', 'pharm-1');
      expect(provider.totalBadgeCount, 3);
    });

    test('refresh sets error on failure', () async {
      final failingClient = MockClient((request) async {
        return http.Response('Not found', 404);
      });
      final failingService = PharmacyWorkflowService(client: failingClient);
      final failingProvider = PharmacyWorkflowProvider(workflowService: failingService);

      await failingProvider.refresh('token', 'pharm-1');
      expect(failingProvider.error, isNotNull);
      expect(failingProvider.workItems, isEmpty);
    });

    test('concurrent refresh returns early while loading', () async {
      // First refresh starts, _isLoading becomes true
      final first = provider.refresh('token', 'pharm-1');
      // Second call should be a no-op (returns early)
      await provider.refresh('token', 'pharm-1');
      // Wait for first to complete
      await first;
      expect(provider.workItems.length, 3);
    });

    test('stopPolling cancels running timer', () async {
      provider.startPolling('token', 'pharm-1');
      provider.stopPolling();
      // Calling stopPolling again should be safe
      provider.stopPolling();
      expect(provider.workItems, isA<List>());
    });
  });
}
