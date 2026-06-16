class NotificationItem {
  const NotificationItem({
    required this.notificationId,
    required this.title,
    required this.message,
    required this.type,
    required this.priority,
    required this.read,
    required this.createdAt,
    this.actionUrl,
    this.relatedId,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      notificationId: _toInt(
        json['notificationId'] ?? json['id'],
        0,
      ),
      title: (json['title'] ?? 'Notification').toString(),
      message: (json['message'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      priority: (json['priority'] ?? 'NORMAL').toString(),
      read: json['read'] == true,
      createdAt: DateTime.tryParse(
        (json['createdAt'] ?? '').toString(),
      ) ??
          DateTime.now(),
      actionUrl: json['actionUrl']?.toString(),
      relatedId: _nullableInt(json['relatedId']),
    );
  }

  final int notificationId;
  final String title;
  final String message;
  final String type;
  final String priority;
  final bool read;
  final DateTime createdAt;
  final String? actionUrl;
  final int? relatedId;

  bool get isHighPriority => priority.toUpperCase() == 'HIGH';

  String get displayType {
    switch (type.toUpperCase()) {
      case 'APPOINTMENT_REMINDER':
        return 'Appointment';
      case 'NEW_APPOINTMENT':
        return 'Appointment';
      case 'PRESCRIPTION_ISSUED':
      case 'NEW_PRESCRIPTION':
        return 'Prescription';
      case 'INVOICE_PAID':
        return 'Payment';
      case 'ORDER_STATUS':
        return 'Order';
      default:
        return type.replaceAll('_', ' ');
    }
  }
}

class PagedNotifications {
  const PagedNotifications({
    required this.items,
    required this.page,
    required this.size,
    required this.totalPages,
    required this.totalElements,
  });

  factory PagedNotifications.empty() {
    return const PagedNotifications(
      items: [],
      page: 0,
      size: 20,
      totalPages: 1,
      totalElements: 0,
    );
  }

  final List<NotificationItem> items;
  final int page;
  final int size;
  final int totalPages;
  final int totalElements;
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();

  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

int? _nullableInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();

  return int.tryParse(value.toString());
}