import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';
import '../../models/notification/notification_item.dart';

class NotificationService {
  NotificationService({
    required this.accessToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String accessToken;
  final http.Client _client;

  Map<String, String> get _headers => {
    'Authorization': 'Bearer $accessToken',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  Future<PagedNotifications> getNotifications({
    int page = 0,
    int size = 20,
  }) async {
    final uri = Uri.parse(ApiConfig.notifications).replace(
      queryParameters: {
        'page': '$page',
        'size': '$size',
      },
    );

    final response = await _client
        .get(uri, headers: _headers)
        .timeout(ApiConfig.receiveTimeout);

    if (response.statusCode != 200) {
      throw Exception(_parseError(response, 'Unable to load notifications.'));
    }

    final data = jsonDecode(utf8.decode(response.bodyBytes));

    if (data is! Map<String, dynamic>) {
      return PagedNotifications.empty();
    }

    final content = (data['content'] as List?) ?? [];

    return PagedNotifications(
      items: content
          .whereType<Map<String, dynamic>>()
          .map(NotificationItem.fromJson)
          .toList(),
      page: _toInt(data['number'], page),
      size: _toInt(data['size'], size),
      totalPages: _toInt(data['totalPages'], 1),
      totalElements: _toInt(data['totalElements'], content.length),
    );
  }

  Future<int> getUnreadCount() async {
    final response = await _client
        .get(
      Uri.parse(ApiConfig.notificationUnreadCount),
      headers: _headers,
    )
        .timeout(ApiConfig.receiveTimeout);

    if (response.statusCode != 200) {
      throw Exception(_parseError(response, 'Unable to load unread count.'));
    }

    final data = jsonDecode(utf8.decode(response.bodyBytes));

    if (data is Map<String, dynamic>) {
      return _toInt(data['unreadCount'], 0);
    }

    return 0;
  }

  Future<void> markAsRead(int notificationId) async {
    final response = await _client
        .patch(
      Uri.parse(ApiConfig.markNotificationAsRead(notificationId)),
      headers: _headers,
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(
        _parseError(response, 'Unable to mark notification as read.'),
      );
    }
  }

  Future<void> markAllAsRead() async {
    final response = await _client
        .patch(
      Uri.parse(ApiConfig.markAllNotificationsAsRead),
      headers: _headers,
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(
        _parseError(response, 'Unable to mark all notifications as read.'),
      );
    }
  }

  String _parseError(http.Response response, String fallback) {
    try {
      final data = jsonDecode(utf8.decode(response.bodyBytes));

      if (data is Map<String, dynamic>) {
        return (data['message'] ?? data['error'] ?? data['title'] ?? fallback)
            .toString();
      }
    } catch (_) {
      // Backend may return plain text.
    }

    return fallback;
  }
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();

  return int.tryParse(value?.toString() ?? '') ?? fallback;
}
