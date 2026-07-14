import '../../models/pharmacy/pharmacy_work_item.dart';

class PharmacyChatPolicy {
  static bool canEditWorkItem(PharmacyWorkItem item) {
    return item.requestType?.toUpperCase() == 'CONSULTATION' &&
        item.chatRoomId?.trim().isNotEmpty == true &&
        item.availableActions.map((value) => value.toUpperCase()).contains('CHAT');
  }
}
