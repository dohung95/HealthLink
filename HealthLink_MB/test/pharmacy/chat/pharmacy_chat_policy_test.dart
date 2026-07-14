import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_chat_policy.dart';

void main() {
  group('PharmacyChatPolicy.canEditWorkItem', () {
    PharmacyWorkItem _makeItem({
      String? requestType,
      String? chatRoomId,
      List<String> availableActions = const [],
    }) {
      return PharmacyWorkItem.fromJson({
        'workItemId': 'REQ-41',
        'sourceId': 41,
        'sourceType': 'REVISION',
        'workflowStage': 'REVISION_REQUESTED',
        if (requestType != null) 'requestType': requestType,
        if (chatRoomId != null) 'chatRoomId': chatRoomId,
        'availableActions': availableActions,
        'patientId': 'patient-1',
        'patientName': 'Patient',
        'createdAt': '2026-07-14T10:00:00',
      });
    }

    test('consultation with CHAT action and room is editable', () {
      final item = _makeItem(
        requestType: 'CONSULTATION',
        chatRoomId: 'room-41',
        availableActions: ['UPDATE_QUOTE', 'CHAT'],
      );
      expect(PharmacyChatPolicy.canEditWorkItem(item), isTrue);
    });

    test('missing chatRoomId is not editable', () {
      final item = _makeItem(
        requestType: 'CONSULTATION',
        availableActions: ['CHAT'],
      );
      expect(PharmacyChatPolicy.canEditWorkItem(item), isFalse);
    });

    test('non-consultation request type is not editable', () {
      final item = _makeItem(
        requestType: 'ORDER_REQUEST',
        chatRoomId: 'room-41',
        availableActions: ['CHAT'],
      );
      expect(PharmacyChatPolicy.canEditWorkItem(item), isFalse);
    });

    test('no CHAT action is not editable', () {
      final item = _makeItem(
        requestType: 'CONSULTATION',
        chatRoomId: 'room-41',
        availableActions: ['UPDATE_QUOTE'],
      );
      expect(PharmacyChatPolicy.canEditWorkItem(item), isFalse);
    });

    test('post-quote work item (no CHAT action) is not editable', () {
      final item = _makeItem(
        requestType: 'CONSULTATION',
        chatRoomId: 'room-41',
        availableActions: ['VIEW_ORDER'],
      );
      expect(PharmacyChatPolicy.canEditWorkItem(item), isFalse);
    });

    test('empty chatRoomId string is not editable', () {
      final item = _makeItem(
        requestType: 'CONSULTATION',
        chatRoomId: '',
        availableActions: ['CHAT'],
      );
      expect(PharmacyChatPolicy.canEditWorkItem(item), isFalse);
    });

    test('case insensitive requestType and CHAT action', () {
      final item = _makeItem(
        requestType: 'consultation',
        chatRoomId: 'room-41',
        availableActions: ['chat'],
      );
      expect(PharmacyChatPolicy.canEditWorkItem(item), isTrue);
    });
  });
}
