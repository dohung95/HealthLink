import '../../models/pharmacy/pharmacy_order.dart';

class PharmacyWorkflow {
  PharmacyWorkflow._();

  static const _terminalStatuses = {'COMPLETED', 'CANCELLED'};

  static const Map<String, String> _statusLabels = {
    'PENDING': 'Pending',
    'CONFIRMED': 'Confirmed',
    'PREPARING': 'Preparing',
    'READY': 'Ready',
    'SHIPPING': 'Shipping',
    'DELIVERED': 'Delivered',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'REVISION_REQUESTED': 'Revision Requested',
  };

  static const Map<String, String> _paymentLabels = {
    'UNPAID': 'Unpaid',
    'PENDING': 'Pending',
    'PAID': 'Paid',
    'REFUNDED': 'Refunded',
    'PARTIALLY_PAID': 'Partially Paid',
  };

  static const Map<String, String> _fulfillmentLabels = {
    'PICKUP': 'Pickup',
    'DELIVERY': 'Delivery',
  };

  /// Returns the canonical next status or null if at a terminal state.
  static String? getNextOrderStatus({
    required String status,
    required String deliveryType,
  }) {
    if (_terminalStatuses.contains(status)) return null;

    final isDelivery = deliveryType.toUpperCase() == 'DELIVERY';

    if (status == 'READY') {
      return isDelivery ? 'SHIPPING' : 'COMPLETED';
    }
    if (status == 'SHIPPING' && isDelivery) return 'DELIVERED';
    if (status == 'DELIVERED' && isDelivery) return 'COMPLETED';

    return null;
  }

  /// Returns false for terminal orders, patient-confirmation waits,
  /// and unpaid states the backend cannot progress.
  static bool canProgressOrder(PharmacyOrder order) {
    if (_terminalStatuses.contains(order.status)) return false;
    if (order.requiresPatientConfirmation == true) return false;
    if (order.paymentStatus == 'UNPAID') return false;
    return true;
  }

  static String workflowLabel(String status) {
    return _statusLabels[status] ?? status;
  }

  static String paymentLabel(String paymentStatus) {
    return _paymentLabels[paymentStatus] ?? paymentStatus;
  }

  static String fulfillmentLabel(String deliveryType) {
    return _fulfillmentLabels[deliveryType] ?? deliveryType;
  }

  /// Returns suggested actions for a given workflow stage.
  static List<String> availableActionsForStage(String stage) {
    switch (stage.toUpperCase()) {
      case 'REVIEW':
        return ['ACCEPT', 'REJECT'];
      case 'REVISE':
        return ['UPDATE_QUOTE', 'CONTACT_PATIENT'];
      case 'QUOTE':
        return ['CONFIRM_QUOTE', 'EDIT_QUOTE'];
      case 'CONTACT_REVIEW':
        return ['UPDATE_CONTACT', 'APPROVE'];
      case 'FULFILLMENT':
        return ['MARK_READY', 'START_SHIPPING', 'CANCEL'];
      default:
        return [];
    }
  }
}
