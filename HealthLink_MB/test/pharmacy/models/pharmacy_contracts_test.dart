import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';

Map<String, dynamic> _consultationJson() => {
      'id': 'wi-001',
      'pharmacyId': 'pharm-1',
      'sourceType': 'CONSULTATION',
      'sourceId': 101,
      'workflowStage': 'REVIEW',
      'availableActions': ['ACCEPT', 'REJECT'],
      'patientId': 'pat-1',
      'patientName': 'Nguyen Van A',
      'requestId': 101,
      'requestStatus': 'PENDING',
      'createdAt': '2026-07-13T10:00:00.000Z',
    };

Map<String, dynamic> _revisionJson() => {
      'id': 'wi-002',
      'pharmacyId': 'pharm-1',
      'sourceType': 'REVISION',
      'sourceId': 201,
      'workflowStage': 'REVISE',
      'availableActions': ['UPDATE_QUOTE', 'CONTACT_PATIENT'],
      'patientId': 'pat-2',
      'patientName': 'Tran Thi B',
      'orderId': 301,
      'orderStatus': 'REVISION_REQUESTED',
      'revisionReason': 'Patient requested price adjustment',
      'revisionRequestedAt': '2026-07-13T09:00:00.000Z',
      'requiresPatientConfirmation': true,
      'paymentStatus': 'UNPAID',
      'medicineAmount': 150.00,
      'deliveryFee': 15.00,
      'totalAmount': 165.00,
      'createdAt': '2026-07-13T08:00:00.000Z',
    };

Map<String, dynamic> _deliveryQuoteJson() => {
      'id': 'wi-003',
      'pharmacyId': 'pharm-1',
      'sourceType': 'DELIVERY_QUOTE',
      'sourceId': 301,
      'workflowStage': 'QUOTE',
      'availableActions': ['CONFIRM_QUOTE', 'EDIT_QUOTE'],
      'patientId': 'pat-3',
      'patientName': 'Le Van C',
      'orderId': 301,
      'orderStatus': 'PENDING',
      'deliveryType': 'DELIVERY',
      'deliveryFee': 20.00,
      'medicineAmount': 200.00,
      'totalAmount': 220.00,
      'requiresPatientConfirmation': false,
      'paymentStatus': 'UNPAID',
      'createdAt': '2026-07-13T07:00:00.000Z',
    };

Map<String, dynamic> _deliveryContactReviewJson() => {
      'id': 'wi-004',
      'pharmacyId': 'pharm-1',
      'sourceType': 'DELIVERY_CONTACT_REVIEW',
      'sourceId': 401,
      'workflowStage': 'CONTACT_REVIEW',
      'availableActions': ['UPDATE_CONTACT', 'APPROVE'],
      'patientId': 'pat-4',
      'patientName': 'Pham Thi D',
      'orderId': 401,
      'orderStatus': 'CONFIRMED',
      'deliveryType': 'DELIVERY',
      'deliveryAddress': '123 Main St, District 1',
      'deliveryPhoneNumber': '0909123456',
      'deliveryLatitude': 10.7769,
      'deliveryLongitude': 106.7009,
      'notes': 'Please call before delivery',
      'requiresPatientConfirmation': true,
      'createdAt': '2026-07-13T06:00:00.000Z',
    };

Map<String, dynamic> _pickupOrderJson() => {
      'id': 'wi-005',
      'pharmacyId': 'pharm-1',
      'sourceType': 'PICKUP_ORDER',
      'sourceId': 501,
      'workflowStage': 'FULFILLMENT',
      'availableActions': ['MARK_READY', 'CANCEL'],
      'patientId': 'pat-5',
      'patientName': 'Hoang Van E',
      'orderId': 501,
      'orderStatus': 'PREPARING',
      'deliveryType': 'PICKUP',
      'medicineAmount': 80.00,
      'totalAmount': 80.00,
      'paymentStatus': 'PAID',
      'paidAmount': 80.00,
      'requiresPatientConfirmation': false,
      'createdAt': '2026-07-13T05:00:00.000Z',
    };

Map<String, dynamic> _deliveryOrderJson() => {
      'id': 'wi-006',
      'pharmacyId': 'pharm-1',
      'sourceType': 'DELIVERY_ORDER',
      'sourceId': 601,
      'workflowStage': 'FULFILLMENT',
      'availableActions': ['START_SHIPPING', 'CANCEL'],
      'patientId': 'pat-6',
      'patientName': 'Ngo Thi F',
      'orderId': 601,
      'orderStatus': 'READY',
      'deliveryType': 'DELIVERY',
      'deliveryFee': 15.00,
      'medicineAmount': 120.00,
      'totalAmount': 135.00,
      'deliveryAddress': '456 Elm St, District 2',
      'deliveryPhoneNumber': '0909988776',
      'paymentStatus': 'PAID',
      'paidAmount': 135.00,
      'requiresPatientConfirmation': false,
      'createdAt': '2026-07-13T04:00:00.000Z',
    };

void main() {
  group('PharmacyWorkItem fromJson', () {
    test('parses consultation source type', () {
      final item = PharmacyWorkItem.fromJson(_consultationJson());
      expect(item.id, 'wi-001');
      expect(item.sourceType, WorkItemSourceType.consultation);
      expect(item.workflowStage, 'REVIEW');
      expect(item.availableActions, ['ACCEPT', 'REJECT']);
      expect(item.patientName, 'Nguyen Van A');
      expect(item.requestId, 101);
      expect(item.requestStatus, 'PENDING');
    });

    test('parses revision source type', () {
      final item = PharmacyWorkItem.fromJson(_revisionJson());
      expect(item.id, 'wi-002');
      expect(item.sourceType, WorkItemSourceType.revision);
      expect(item.orderId, 301);
      expect(item.orderStatus, 'REVISION_REQUESTED');
      expect(item.revisionReason, 'Patient requested price adjustment');
      expect(item.revisionRequestedAt, isNotNull);
      expect(item.requiresPatientConfirmation, true);
      expect(item.paymentStatus, 'UNPAID');
      expect(item.medicineAmount, 150.0);
      expect(item.deliveryFee, 15.0);
      expect(item.totalAmount, 165.0);
    });

    test('parses delivery quote source type', () {
      final item = PharmacyWorkItem.fromJson(_deliveryQuoteJson());
      expect(item.id, 'wi-003');
      expect(item.sourceType, WorkItemSourceType.deliveryQuote);
      expect(item.deliveryType, 'DELIVERY');
      expect(item.deliveryFee, 20.0);
      expect(item.medicineAmount, 200.0);
      expect(item.totalAmount, 220.0);
      expect(item.paymentStatus, 'UNPAID');
      expect(item.requiresPatientConfirmation, false);
    });

    test('parses delivery-contact review source type', () {
      final item = PharmacyWorkItem.fromJson(_deliveryContactReviewJson());
      expect(item.id, 'wi-004');
      expect(item.sourceType, WorkItemSourceType.deliveryContactReview);
      expect(item.deliveryAddress, '123 Main St, District 1');
      expect(item.deliveryPhoneNumber, '0909123456');
      expect(item.deliveryLatitude, 10.7769);
      expect(item.deliveryLongitude, 106.7009);
      expect(item.notes, 'Please call before delivery');
      expect(item.requiresPatientConfirmation, true);
    });

    test('parses pickup order source type', () {
      final item = PharmacyWorkItem.fromJson(_pickupOrderJson());
      expect(item.id, 'wi-005');
      expect(item.sourceType, WorkItemSourceType.pickupOrder);
      expect(item.deliveryType, 'PICKUP');
      expect(item.paymentStatus, 'PAID');
      expect(item.paidAmount, 80.0);
      expect(item.medicineAmount, 80.0);
      expect(item.totalAmount, 80.0);
    });

    test('parses delivery order source type', () {
      final item = PharmacyWorkItem.fromJson(_deliveryOrderJson());
      expect(item.id, 'wi-006');
      expect(item.sourceType, WorkItemSourceType.deliveryOrder);
      expect(item.deliveryAddress, '456 Elm St, District 2');
      expect(item.deliveryPhoneNumber, '0909988776');
      expect(item.paymentStatus, 'PAID');
      expect(item.paidAmount, 135.0);
      expect(item.deliveryFee, 15.0);
    });

    test('preserves identifiers across all source types', () {
      for (final json in [
        _consultationJson(),
        _revisionJson(),
        _deliveryQuoteJson(),
        _deliveryContactReviewJson(),
        _pickupOrderJson(),
        _deliveryOrderJson(),
      ]) {
        final item = PharmacyWorkItem.fromJson(json);
        expect(item.id, json['id']);
        expect(item.pharmacyId, json['pharmacyId']);
        expect(item.sourceId, json['sourceId']);
        expect(item.patientId, json['patientId']);
        expect(item.patientName, json['patientName']);
      }
    });
  });

  group('PharmacyWorkItem toJson roundtrip', () {
    test('roundtrips for consultation', () {
      final original = PharmacyWorkItem.fromJson(_consultationJson());
      final json = original.toJson();
      final restored = PharmacyWorkItem.fromJson(json);
      expect(restored.id, original.id);
      expect(restored.sourceType, original.sourceType);
      expect(restored.workflowStage, original.workflowStage);
      expect(restored.patientName, original.patientName);
      expect(restored.requestId, original.requestId);
    });

    test('roundtrips for delivery order', () {
      final original = PharmacyWorkItem.fromJson(_deliveryOrderJson());
      final json = original.toJson();
      final restored = PharmacyWorkItem.fromJson(json);
      expect(restored.id, original.id);
      expect(restored.sourceType, original.sourceType);
      expect(restored.orderId, original.orderId);
      expect(restored.deliveryAddress, original.deliveryAddress);
      expect(restored.paidAmount, original.paidAmount);
    });
  });
}
