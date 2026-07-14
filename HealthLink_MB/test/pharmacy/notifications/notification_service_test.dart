import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/services/notification/notification_service.dart';

const _token = 'test-token';

http.Response _jsonResponse(Object body, int statusCode) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    statusCode,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

void main() {
  group('NotificationService', () {
    test(
      'parses the backend Page response and preserves notification fields',
      () async {
        final client = MockClient(
          (request) async => _jsonResponse({
            'content': [
              {
                'notificationId': 41,
                'title': 'New pharmacy request',
                'message': 'Nguyễn An sent a request.',
                'type': 'NEW_PHARMACY_REQUEST',
                'priority': 'NORMAL',
                'read': false,
                'relatedId': 73,
                'actionUrl': '/pharmacy-requests/73',
                'createdAt': '2026-07-14T09:30:00',
              },
            ],
            'number': 0,
            'size': 20,
            'totalPages': 1,
            'totalElements': 1,
          }, 200),
        );

        final result = await NotificationService(
          accessToken: _token,
          client: client,
        ).getNotifications();

        expect(result.page, 0);
        expect(result.size, 20);
        expect(result.totalPages, 1);
        expect(result.totalElements, 1);
        expect(result.items.single.notificationId, 41);
        expect(result.items.single.message, 'Nguyễn An sent a request.');
        expect(result.items.single.relatedId, 73);
        expect(result.items.single.actionUrl, '/pharmacy-requests/73');
        expect(result.items.single.type, 'NEW_PHARMACY_REQUEST');
        expect(result.items.single.priority, 'NORMAL');
        expect(result.items.single.read, isFalse);
        expect(result.items.single.createdAt, DateTime(2026, 7, 14, 9, 30));
      },
    );

    test('reads the unread count from the backend response', () async {
      final service = NotificationService(
        accessToken: _token,
        client: MockClient(
          (request) async => _jsonResponse({'unreadCount': 6}, 200),
        ),
      );

      expect(await service.getUnreadCount(), 6);
    });

    test('uses the injected client for notification mutations', () async {
      final methods = <String>[];
      final client = MockClient((request) async {
        methods.add(request.method);
        return _jsonResponse({}, 200);
      });
      final service = NotificationService(accessToken: _token, client: client);

      await service.getNotifications();
      await service.getUnreadCount();
      await service.markAsRead(41);
      await service.markAllAsRead();

      expect(methods, ['GET', 'GET', 'PATCH', 'PATCH']);
    });

    test(
      'throws the backend error message for a failed notification response',
      () async {
        final service = NotificationService(
          accessToken: _token,
          client: MockClient(
            (request) async =>
                _jsonResponse({'message': 'Không thể tải thông báo.'}, 500),
          ),
        );

        expect(
          () => service.getNotifications(),
          throwsA(
            predicate(
              (error) => error.toString().contains('Không thể tải thông báo.'),
            ),
          ),
        );
      },
    );

    test(
      'uses the fallback for a failed notification response without a message',
      () async {
        final service = NotificationService(
          accessToken: _token,
          client: MockClient((request) async => _jsonResponse({}, 503)),
        );

        expect(
          () => service.getNotifications(),
          throwsA(
            predicate(
              (error) =>
                  error.toString().contains('Unable to load notifications.'),
            ),
          ),
        );
      },
    );
  });
}
