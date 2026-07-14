import '../../models/pharmacy/pharmacy_order.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';

class PharmacyOrderTransition {
  const PharmacyOrderTransition({
    required this.targetStatus,
    required this.label,
    required this.confirmationTitle,
    required this.confirmationMessage,
  });

  final String targetStatus;
  final String label;
  final String confirmationTitle;
  final String confirmationMessage;
}

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
    // Workflow stage labels
    'REVIEW': 'Review',
    'REVISE': 'Revise',
    'QUOTE': 'Quote',
    'CONTACT_REVIEW': 'Contact Review',
    'FULFILLMENT': 'Fulfillment',
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

    if (status == 'PREPARING') return 'READY';
    if (status == 'READY') {
      return isDelivery ? 'SHIPPING' : 'COMPLETED';
    }
    if (status == 'SHIPPING' && isDelivery) return 'DELIVERED';
    if (status == 'DELIVERED' && isDelivery) return 'COMPLETED';

    return null;
  }

  /// Returns false for terminal orders, patient-confirmation waits,
  /// and unpaid/non-paid states the backend cannot progress.
  static bool canProgressOrder(PharmacyOrder order) {
    if (_terminalStatuses.contains(order.status)) return false;
    if (order.requiresPatientConfirmation == true) return false;

    const fulfillmentStatuses = {
      'PREPARING',
      'READY',
      'SHIPPING',
      'DELIVERED',
    };
    if (fulfillmentStatuses.contains(order.status) &&
        order.paymentStatus != 'PAID') {
      return false;
    }
    return true;
  }

  /// Returns the next canonical [PharmacyOrderTransition] for a given order,
  /// or null if the order cannot progress.
  static PharmacyOrderTransition? nextTransition(PharmacyOrder order) {
    if (!canProgressOrder(order)) return null;

    final next = getNextOrderStatus(
      status: order.status,
      deliveryType: order.deliveryType ?? 'PICKUP',
    );
    if (next == null) return null;

    final isDelivery = (order.deliveryType ?? 'PICKUP').toUpperCase() == 'DELIVERY';

    switch (next) {
      case 'READY':
        return const PharmacyOrderTransition(
          targetStatus: 'READY',
          label: 'Mark ready',
          confirmationTitle: 'Mark order ready?',
          confirmationMessage:
            'Medicines will be marked as packed and inventory quantities will be deducted.',
        );
      case 'SHIPPING':
        return const PharmacyOrderTransition(
          targetStatus: 'SHIPPING',
          label: 'Start delivery',
          confirmationTitle: 'Start delivery?',
          confirmationMessage:
            'Confirm that this order has left the pharmacy for delivery.',
        );
      case 'DELIVERED':
        return const PharmacyOrderTransition(
          targetStatus: 'DELIVERED',
          label: 'Mark delivered',
          confirmationTitle: 'Mark order delivered?',
          confirmationMessage:
            'Confirm that the order has been delivered to the patient.',
        );
      case 'COMPLETED':
        if (isDelivery) {
          return const PharmacyOrderTransition(
            targetStatus: 'COMPLETED',
            label: 'Complete order',
            confirmationTitle: 'Complete order?',
            confirmationMessage:
              'Confirm that delivery is complete and this order can be closed.',
          );
        }
        return const PharmacyOrderTransition(
          targetStatus: 'COMPLETED',
          label: 'Complete pickup',
          confirmationTitle: 'Complete pickup?',
          confirmationMessage:
            'Confirm that the patient has collected this order.',
        );
      default:
        return null;
    }
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

  /// Filters and sorts work items to only those requiring pharmacy action.
  /// Excludes terminal requests (CANCELLED, REJECTED) and terminal orders
  /// (DELIVERED, COMPLETED, CANCELLED, REFUNDED). Results are sorted oldest-first.
  static List<PharmacyWorkItem> actionableRequests(
    Iterable<PharmacyWorkItem> items,
  ) {
    const terminalRequests = {'CANCELLED', 'REJECTED'};
    const terminalOrders = {
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    };

    final result = items.where((item) {
      final requestStatus = item.requestStatus?.toUpperCase();
      final orderStatus = item.orderStatus?.toUpperCase();
      return !terminalRequests.contains(requestStatus) &&
          !terminalOrders.contains(orderStatus);
    }).toList();

    result.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return result;
  }
}
