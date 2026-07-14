class NotificationTarget {
  final int tabIndex;
  final String? filter;
  final String? detailId;
  final String? detailType;

  const NotificationTarget({
    required this.tabIndex,
    this.filter,
    this.detailId,
    this.detailType,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NotificationTarget &&
          tabIndex == other.tabIndex &&
          filter == other.filter &&
          detailId == other.detailId &&
          detailType == other.detailType;

  @override
  int get hashCode =>
      tabIndex.hashCode ^ filter.hashCode ^ detailId.hashCode ^ detailType.hashCode;
}

class NotificationAttention {
  const NotificationAttention({
    required this.target,
    required this.sequence,
  });

  final NotificationTarget target;
  final int sequence;
}

class PharmacyNotificationTarget {
  static const int tabHome = 0;
  static const int tabRequests = 1;
  static const int tabOrders = 2;
  static const int tabInventory = 3;

  static NotificationTarget resolve([
    String? actionUrl,
    String? type,
    int? relatedId,
  ]) {
    final resolvedType = type?.toUpperCase();

    final actionTarget = _targetFromActionUrl(actionUrl);
    if (actionTarget != null) return actionTarget;

    if (resolvedType == 'NEW_PHARMACY_REQUEST' || resolvedType == 'REQUEST') {
      return NotificationTarget(
        tabIndex: tabRequests,
        detailId: relatedId?.toString(),
        detailType: 'request',
      );
    }

    if (resolvedType == 'NEW_ORDER' ||
        resolvedType == 'ORDER_STATUS' ||
        resolvedType == 'CANCEL_ORDER' ||
        resolvedType == 'ORDER') {
      return NotificationTarget(
        tabIndex: tabOrders,
        detailId: relatedId?.toString(),
        detailType: 'order',
      );
    }

    if (resolvedType == 'STOCK_WARNING') {
      return NotificationTarget(
        tabIndex: tabInventory,
        detailId: relatedId?.toString(),
        detailType: relatedId == null ? 'inventory-low-stock' : 'inventory',
      );
    }

    return NotificationTarget(tabIndex: tabHome);
  }

  static NotificationTarget? _targetFromActionUrl(String? actionUrl) {
    if (actionUrl == null) return null;
    final uri = Uri.tryParse(actionUrl);
    if (uri == null) return null;

    final path = uri.path;
    final requestId = _pathIdentifier(path, '/pharmacy-requests/');
    if (requestId != null) {
      return NotificationTarget(
        tabIndex: tabRequests,
        detailId: requestId,
        detailType: 'request',
      );
    }

    final orderId = _pathIdentifier(path, '/pharmacy-orders/');
    if (orderId != null) {
      return NotificationTarget(
        tabIndex: tabOrders,
        detailId: orderId,
        detailType: 'order',
      );
    }

    if (path.endsWith('/pharmacy-page/requests') ||
        path == '/pharmacy-page/requests') {
      final requestOrderId = uri.queryParameters['orderId'];
      if (requestOrderId != null && requestOrderId.isNotEmpty) {
        return NotificationTarget(
          tabIndex: tabRequests,
          detailId: requestOrderId,
          detailType: 'request-order',
        );
      }
      return NotificationTarget(tabIndex: tabRequests);
    }

    if (path.contains('/pharmacy/inventory')) {
      return NotificationTarget(tabIndex: tabInventory);
    }

    return null;
  }

  static String? _pathIdentifier(String path, String prefix) {
    final start = path.indexOf(prefix);
    if (start < 0) return null;
    final value = path.substring(start + prefix.length).split('/').first;
    return value.isEmpty ? null : value;
  }
}
