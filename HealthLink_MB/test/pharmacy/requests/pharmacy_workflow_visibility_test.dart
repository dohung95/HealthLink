import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_workflow.dart';

PharmacyWorkItem _item({
  required String id,
  required int sourceId,
  required WorkItemSourceType sourceType,
  required String workflowStage,
  String? requestStatus,
  String? orderStatus,
  DateTime? createdAt,
  int? requestId,
  int? orderId,
}) {
  return PharmacyWorkItem(
    id: id,
    pharmacyId: 'pharm-1',
    sourceId: sourceId,
    sourceType: sourceType,
    workflowStage: workflowStage,
    availableActions: [],
    patientId: 'pat-1',
    patientName: 'Patient',
    requestId: requestId,
    orderId: orderId,
    requestStatus: requestStatus,
    orderStatus: orderStatus,
    createdAt: createdAt ?? DateTime.now(),
  );
}

void main() {
  group('PharmacyWorkflow.actionableRequests', () {
    test('excludes cancelled and rejected requests', () {
      final items = [
        _item(
          id: '1',
          sourceId: 1,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'CANCELLED',
        ),
        _item(
          id: '2',
          sourceId: 2,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'REJECTED',
        ),
        _item(
          id: '3',
          sourceId: 3,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'PENDING',
        ),
      ];

      final visible = PharmacyWorkflow.actionableRequests(items);

      expect(visible.map((item) => item.requestStatus),
          isNot(contains('CANCELLED')));
      expect(visible.map((item) => item.requestStatus),
          isNot(contains('REJECTED')));
      expect(visible.length, 1);
      expect(visible.first.id, '3');
    });

    test('excludes terminal order statuses', () {
      final items = [
        _item(
          id: '1',
          sourceId: 1,
          sourceType: WorkItemSourceType.deliveryOrder,
          workflowStage: 'FULFILLMENT',
          orderStatus: 'DELIVERED',
        ),
        _item(
          id: '2',
          sourceId: 2,
          sourceType: WorkItemSourceType.deliveryOrder,
          workflowStage: 'FULFILLMENT',
          orderStatus: 'COMPLETED',
        ),
        _item(
          id: '3',
          sourceId: 3,
          sourceType: WorkItemSourceType.deliveryOrder,
          workflowStage: 'FULFILLMENT',
          orderStatus: 'CANCELLED',
        ),
        _item(
          id: '4',
          sourceId: 4,
          sourceType: WorkItemSourceType.deliveryOrder,
          workflowStage: 'FULFILLMENT',
          orderStatus: 'REFUNDED',
        ),
        _item(
          id: '5',
          sourceId: 5,
          sourceType: WorkItemSourceType.pickupOrder,
          workflowStage: 'FULFILLMENT',
          orderStatus: 'READY',
        ),
      ];

      final visible = PharmacyWorkflow.actionableRequests(items);

      expect(visible.map((item) => item.orderStatus),
          isNot(containsAll(['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'])));
      expect(visible.length, 1);
      expect(visible.first.id, '5');
    });

    test('sorts by createdAt ascending (oldest first)', () {
      final now = DateTime.now();
      final oldest = now.subtract(const Duration(hours: 3));
      final middle = now.subtract(const Duration(hours: 2));
      final newest = now.subtract(const Duration(hours: 1));

      // Provide in reverse order: newest, oldest, middle
      final items = [
        _item(
          id: '3',
          sourceId: 3,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'PENDING',
          createdAt: newest,
        ),
        _item(
          id: '1',
          sourceId: 1,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'PENDING',
          createdAt: oldest,
        ),
        _item(
          id: '2',
          sourceId: 2,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'PENDING',
          createdAt: middle,
        ),
      ];

      final visible = PharmacyWorkflow.actionableRequests(items);

      expect(visible.map((item) => item.id), orderedEquals(['1', '2', '3']));
      expect(visible.map((item) => item.createdAt), orderedEquals([
        oldest,
        middle,
        newest,
      ]));
    });

    test('handles mixed case statuses via toUpperCase', () {
      final items = [
        _item(
          id: '1',
          sourceId: 1,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'cancelled', // lowercase
        ),
        _item(
          id: '2',
          sourceId: 2,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'PENDING',
        ),
      ];

      final visible = PharmacyWorkflow.actionableRequests(items);
      expect(visible.length, 1);
      expect(visible.first.id, '2');
    });

    test('handles null statuses without throwing', () {
      final items = [
        _item(
          id: '1',
          sourceId: 1,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: null,
          orderStatus: null,
        ),
      ];

      // Should not throw, and should include items with null statuses
      final visible = PharmacyWorkflow.actionableRequests(items);
      expect(visible.length, 1);
    });

    test('returns empty list for all terminal items', () {
      final items = [
        _item(
          id: '1',
          sourceId: 1,
          sourceType: WorkItemSourceType.consultation,
          workflowStage: 'REVIEW',
          requestStatus: 'CANCELLED',
        ),
        _item(
          id: '2',
          sourceId: 2,
          sourceType: WorkItemSourceType.deliveryOrder,
          workflowStage: 'FULFILLMENT',
          orderStatus: 'COMPLETED',
        ),
      ];

      expect(PharmacyWorkflow.actionableRequests(items), isEmpty);
    });

    test('returns empty list for no items', () {
      expect(PharmacyWorkflow.actionableRequests([]), isEmpty);
    });
  });
}
