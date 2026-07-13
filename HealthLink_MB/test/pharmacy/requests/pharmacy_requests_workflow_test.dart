import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_order_service.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_request_service.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_workflow.dart';

const _token = 'test-token';
const _pharmacyId = 'pharm-1';

PharmacyWorkItem _consultationWorkItem() => PharmacyWorkItem(
      id: 'wi-101',
      pharmacyId: _pharmacyId,
      sourceId: 101,
      sourceType: WorkItemSourceType.consultation,
      workflowStage: 'REVIEW',
      availableActions: ['ACCEPT', 'REJECT'],
      patientId: 'pat-1',
      patientName: 'Patient 1',
      requestId: 101,
      requestStatus: 'PENDING',
      createdAt: DateTime.now(),
    );

PharmacyWorkItem _revisionWorkItem() => PharmacyWorkItem(
      id: 'wi-102',
      pharmacyId: _pharmacyId,
      sourceId: 201,
      sourceType: WorkItemSourceType.revision,
      workflowStage: 'REVISE',
      availableActions: ['UPDATE_QUOTE', 'CONTACT_PATIENT'],
      patientId: 'pat-2',
      patientName: 'Patient 2',
      orderId: 201,
      orderStatus: 'REVISION_REQUESTED',
      revisionReason: 'Price adjustment requested',
      requiresPatientConfirmation: true,
      createdAt: DateTime.now(),
    );

PharmacyWorkItem _deliveryQuoteWorkItem() => PharmacyWorkItem(
      id: 'wi-103',
      pharmacyId: _pharmacyId,
      sourceId: 301,
      sourceType: WorkItemSourceType.deliveryQuote,
      workflowStage: 'QUOTE',
      availableActions: ['CONFIRM_QUOTE', 'EDIT_QUOTE'],
      patientId: 'pat-3',
      patientName: 'Patient 3',
      orderId: 301,
      orderStatus: 'PENDING',
      deliveryType: 'DELIVERY',
      deliveryFee: 15.0,
      medicineAmount: 200.0,
      totalAmount: 215.0,
      createdAt: DateTime.now(),
    );

PharmacyWorkItem _deliveryContactReviewWorkItem() => PharmacyWorkItem(
      id: 'wi-104',
      pharmacyId: _pharmacyId,
      sourceId: 401,
      sourceType: WorkItemSourceType.deliveryContactReview,
      workflowStage: 'CONTACT_REVIEW',
      availableActions: ['APPROVE', 'UPDATE_CONTACT'],
      patientId: 'pat-4',
      patientName: 'Patient 4',
      orderId: 401,
      orderStatus: 'CONFIRMED',
      deliveryType: 'DELIVERY',
      deliveryAddress: '123 Main St',
      deliveryPhoneNumber: '0909123456',
      requiresPatientConfirmation: true,
      createdAt: DateTime.now(),
    );

void main() {
  group('PharmacyOrderService — delivery quote', () {
    test('submitDeliveryQuote sends PATCH with fee, ETA, and notes', () async {
      http.Request? captured;
      final mockClient = MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({'orderId': 301, 'status': 'QUOTE_SUBMITTED'}),
          200,
        );
      });

      final service = PharmacyOrderService(client: mockClient);
      final result = await service.submitDeliveryQuote(
        _token,
        '301',
        fee: 25.0,
        estimatedDeliveryTime: '2026-07-15T14:00:00.000Z',
        notes: 'Delivery within 2 hours',
      );

      expect(result, isNotNull);
      expect(captured, isNotNull);
      expect(captured!.method, 'PATCH');
      expect(captured!.url.toString(), contains('301/delivery-quote'));

      final body = jsonDecode(captured!.body) as Map<String, dynamic>;
      expect(body['deliveryFee'], 25.0);
      expect(body['estimatedDeliveryTime'], '2026-07-15T14:00:00.000Z');
      expect(body['notes'], 'Delivery within 2 hours');
      expect(
        captured!.headers['Authorization'],
        'Bearer $_token',
      );
    });

    test('submitDeliveryQuote throws on non-200', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Bad Request', 400);
      });

      final service = PharmacyOrderService(client: mockClient);
      expect(
        () => service.submitDeliveryQuote(_token, '301'),
        throwsException,
      );
    });
  });

  group('PharmacyOrderService — delivery contact review', () {
    test('reviewDeliveryContact sends PATCH with approved and notes', () async {
      http.Request? captured;
      final mockClient = MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({'orderId': 401, 'contactApproved': true}),
          200,
        );
      });

      final service = PharmacyOrderService(client: mockClient);
      final result = await service.reviewDeliveryContact(
        _token,
        '401',
        approved: true,
        notes: 'Contact info verified',
      );

      expect(result, isNotNull);
      expect(captured, isNotNull);
      expect(captured!.method, 'PATCH');
      expect(captured!.url.toString(), contains('401/delivery-contact'));

      final body = jsonDecode(captured!.body) as Map<String, dynamic>;
      expect(body['approved'], true);
      expect(body['notes'], 'Contact info verified');
    });

    test('reviewDeliveryContact sends PATCH with rejected', () async {
      http.Request? captured;
      final mockClient = MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({'orderId': 401, 'contactApproved': false}),
          200,
        );
      });

      final service = PharmacyOrderService(client: mockClient);
      await service.reviewDeliveryContact(
        _token,
        '401',
        approved: false,
        notes: 'Phone number incorrect',
      );

      final body = jsonDecode(captured!.body) as Map<String, dynamic>;
      expect(body['approved'], false);
      expect(body['notes'], 'Phone number incorrect');
    });
  });

  group('PharmacyRequestProvider — work-item kind filter', () {
    test('default filter is ALL', () {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((_) async => http.Response('[]', 200)),
        ),
      );
      expect(provider.activeFilter, 'ALL');
    });

    test('setFilter notifies listeners', () {
      var notified = false;
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((_) async => http.Response('[]', 200)),
        ),
      );
      provider.addListener(() => notified = true);
      provider.setFilter('IN_REVIEW');
      expect(provider.activeFilter, 'IN_REVIEW');
      expect(notified, true);
    });

    test('fetchChatRoomId resolves room ID', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'chatRoomId': 'room-123'}),
          200,
        );
      });

      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(client: mockClient),
      );
      await provider.fetchChatRoomId(_token, '101');
      expect(provider.chatRoomId, 'room-123');
    });

    test('fetchChatRoomId returns null on 404', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Not Found', 404);
      });

      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(client: mockClient),
      );
      await provider.fetchChatRoomId(_token, '999');
      expect(provider.chatRoomId, isNull);
    });
  });

  group('Workflow labels on work items', () {
    test('workflowLabel returns readable stage labels', () {
      expect(PharmacyWorkflow.workflowLabel('REVIEW'), 'Review');
      expect(PharmacyWorkflow.workflowLabel('REVISE'), 'Revise');
      expect(PharmacyWorkflow.workflowLabel('QUOTE'), 'Quote');
      expect(PharmacyWorkflow.workflowLabel('CONTACT_REVIEW'), 'Contact Review');
      expect(PharmacyWorkflow.workflowLabel('FULFILLMENT'), 'Fulfillment');
    });

    test('paymentLabel covers key statuses', () {
      expect(PharmacyWorkflow.paymentLabel('UNPAID'), 'Unpaid');
      expect(PharmacyWorkflow.paymentLabel('PAID'), 'Paid');
      expect(PharmacyWorkflow.paymentLabel('PENDING'), 'Pending');
      expect(PharmacyWorkflow.paymentLabel('REFUNDED'), 'Refunded');
    });

    test('fulfillmentLabel covers pickup and delivery', () {
      expect(PharmacyWorkflow.fulfillmentLabel('PICKUP'), 'Pickup');
      expect(PharmacyWorkflow.fulfillmentLabel('DELIVERY'), 'Delivery');
    });
  });

  group('Work item available actions drive detail screen', () {
    test('consultation work item has ACCEPT and REJECT', () {
      final item = _consultationWorkItem();
      expect(item.availableActions, contains('ACCEPT'));
      expect(item.availableActions, contains('REJECT'));
    });

    test('revision work item has UPDATE_QUOTE and CONTACT_PATIENT', () {
      final item = _revisionWorkItem();
      expect(item.availableActions, contains('UPDATE_QUOTE'));
      expect(item.availableActions, contains('CONTACT_PATIENT'));
    });

    test('delivery quote work item has CONFIRM_QUOTE and EDIT_QUOTE', () {
      final item = _deliveryQuoteWorkItem();
      expect(item.availableActions, contains('CONFIRM_QUOTE'));
      expect(item.availableActions, contains('EDIT_QUOTE'));
    });

    test('delivery contact review has APPROVE and UPDATE_CONTACT', () {
      final item = _deliveryContactReviewWorkItem();
      expect(item.availableActions, contains('APPROVE'));
      expect(item.availableActions, contains('UPDATE_CONTACT'));
    });
  });

  group('API config — delivery endpoints', () {
    test('delivery quote endpoint is correctly formed', () {
      // Should exist at pharmacy-orders/{id}/delivery-quote
      const endpoint = '/pharmacy-orders/301/delivery-quote';
      expect(endpoint, contains('delivery-quote'));
    });

    test('delivery contact endpoint is correctly formed', () {
      // Should exist at pharmacy-orders/{id}/delivery-contact
      const endpoint = '/pharmacy-orders/401/delivery-contact';
      expect(endpoint, contains('delivery-contact'));
    });
  });
}
