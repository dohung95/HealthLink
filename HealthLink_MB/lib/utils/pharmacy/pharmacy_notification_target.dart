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

class PharmacyNotificationTarget {
  static const int tabHome = 0;
  static const int tabRequests = 1;
  static const int tabOrders = 2;
  static const int tabInventory = 3;

  static NotificationTarget resolve({
    String? actionUrl,
    int? requestId,
    int? orderId,
    String? type,
  }) {
    if (requestId != null) {
      return NotificationTarget(
        tabIndex: tabRequests,
        detailId: requestId.toString(),
        detailType: 'request',
      );
    }

    if (orderId != null) {
      return NotificationTarget(
        tabIndex: tabOrders,
        detailId: orderId.toString(),
        detailType: 'order',
      );
    }

    if (actionUrl != null) {
      if (actionUrl.contains('/pharmacy-requests/')) {
        final id = _extractId(actionUrl, '/pharmacy-requests/');
        return NotificationTarget(
          tabIndex: tabRequests,
          detailId: id,
          detailType: 'request',
        );
      }
      if (actionUrl.contains('/pharmacy-orders/')) {
        final id = _extractId(actionUrl, '/pharmacy-orders/');
        return NotificationTarget(
          tabIndex: tabOrders,
          detailId: id,
          detailType: 'order',
        );
      }
      if (actionUrl.contains('/pharmacy/inventory')) {
        return NotificationTarget(tabIndex: tabInventory);
      }
    }

    if (type == 'STOCK_WARNING') {
      return NotificationTarget(tabIndex: tabInventory);
    }

    return NotificationTarget(tabIndex: tabHome);
  }

  static String? _extractId(String url, String prefix) {
    final idx = url.indexOf(prefix);
    if (idx < 0) return null;
    final after = url.substring(idx + prefix.length);
    final end = after.indexOf(RegExp(r'[/?#]'));
    return (end > 0 ? after.substring(0, end) : after);
  }
}
