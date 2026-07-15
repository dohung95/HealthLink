import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';

import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_notification_center_sheet.dart';
import 'package:HealthLink/services/notification/notification_service.dart';

const _token = 'test-token';

class _MockAuthProvider extends AuthProvider {
  @override
  String? get accessToken => _token;
}

http.Response _jsonResponse(Object body, int statusCode) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    statusCode,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

Map<String, dynamic> _notification({
  required int id,
  String title = 'Notification',
  String message = 'Message',
  bool read = false,
  String type = 'NEW_PHARMACY_REQUEST',
  int? relatedId,
  String? actionUrl,
}) {
  return {
    'notificationId': id,
    'title': title,
    'message': message,
    'type': type,
    'priority': 'NORMAL',
    'read': read,
    'relatedId': relatedId,
    'actionUrl': actionUrl,
    'createdAt': '2026-07-14T09:30:00',
  };
}

Map<String, dynamic> _page(
  List<Map<String, dynamic>> content, {
  int page = 0,
  int totalPages = 1,
}) {
  return {
    'content': content,
    'number': page,
    'size': 20,
    'totalPages': totalPages,
    'totalElements': content.length,
  };
}

Widget _buildApp({
  required NotificationService Function(String token) serviceFactory,
  ValueChanged<int>? onUnreadCountChanged,
}) {
  return MaterialApp(
    home: ChangeNotifierProvider<AuthProvider>.value(
      value: _MockAuthProvider(),
      child: Scaffold(
        body: PharmacyNotificationCenterSheet(
          serviceFactory: serviceFactory,
          onUnreadCountChanged: onUnreadCountChanged,
        ),
      ),
    ),
  );
}

NotificationService _serviceFor(http.Client client, String token) {
  return NotificationService(accessToken: token, client: client);
}

void main() {
  group('PharmacyNotificationCenterSheet', () {
    testWidgets('renders valid backend data instead of Retry', (tester) async {
      final client = MockClient(
        (_) async => _jsonResponse(
          _page([
            _notification(
              id: 41,
              title: 'New pharmacy request',
              message: 'Nguyễn An đã gửi yêu cầu.',
              relatedId: 73,
              actionUrl: '/pharmacy-requests/73',
            ),
          ]),
          200,
        ),
      );

      await tester.pumpWidget(
        _buildApp(serviceFactory: (token) => _serviceFor(client, token)),
      );
      await tester.pumpAndSettle();

      expect(find.text('New pharmacy request'), findsOneWidget);
      expect(find.text('Nguyễn An đã gửi yêu cầu.'), findsOneWidget);
      expect(find.text('Retry'), findsNothing);
    });

    testWidgets('shows a centered progress indicator during first load', (
      tester,
    ) async {
      final response = Completer<http.Response>();
      final client = MockClient((_) => response.future);

      await tester.pumpWidget(
        _buildApp(serviceFactory: (token) => _serviceFor(client, token)),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      response.complete(_jsonResponse(_page([]), 200));
      await tester.pumpAndSettle();
    });

    testWidgets('shows No notifications for an empty page', (tester) async {
      final client = MockClient((_) async => _jsonResponse(_page([]), 200));

      await tester.pumpWidget(
        _buildApp(serviceFactory: (token) => _serviceFor(client, token)),
      );
      await tester.pumpAndSettle();

      expect(find.text('No notifications'), findsOneWidget);
      expect(find.text('Retry'), findsNothing);
    });

    testWidgets('shows the first-page error message and Retry', (tester) async {
      final client = MockClient(
        (_) async =>
            _jsonResponse({'message': 'Unable to load notifications.'}, 500),
      );

      await tester.pumpWidget(
        _buildApp(serviceFactory: (token) => _serviceFor(client, token)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Unable to load notifications.'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('notification-first-page-retry')),
        findsOneWidget,
      );
    });

    testWidgets('loads page 1 at the list end using totalPages', (
      tester,
    ) async {
      final requestedPages = <String>[];
      final client = MockClient((request) async {
        final page = request.url.queryParameters['page']!;
        requestedPages.add(page);
        if (page == '0') {
          return _jsonResponse(
            _page(
              List.generate(
                8,
                (index) => _notification(
                  id: index + 1,
                  title: 'Page 0 item ${index + 1}',
                ),
              ),
              totalPages: 2,
            ),
            200,
          );
        }
        return _jsonResponse(
          _page(
            [_notification(id: 99, title: 'Page 1 item')],
            page: 1,
            totalPages: 2,
          ),
          200,
        );
      });

      await tester.pumpWidget(
        _buildApp(serviceFactory: (token) => _serviceFor(client, token)),
      );
      await tester.pumpAndSettle();
      expect(requestedPages, ['0']);
      expect(find.text('Page 1 item'), findsNothing);

      await tester.drag(find.byType(ListView), const Offset(0, -1000));
      await tester.pumpAndSettle();

      expect(requestedPages, ['0', '1']);
      expect(find.text('Page 1 item'), findsOneWidget);
    });

    testWidgets(
      'keeps existing items and shows footer Retry on load-more error',
      (tester) async {
        final requestedPages = <String>[];
        final client = MockClient((request) async {
          final page = request.url.queryParameters['page']!;
          requestedPages.add(page);
          if (page == '0') {
            return _jsonResponse(
              _page(
                List.generate(
                  8,
                  (index) => _notification(
                    id: index + 1,
                    title: 'Existing item ${index + 1}',
                  ),
                ),
                totalPages: 2,
              ),
              200,
            );
          }
          return _jsonResponse({
            'message': 'Unable to load more notifications.',
          }, 500);
        });

        await tester.pumpWidget(
          _buildApp(serviceFactory: (token) => _serviceFor(client, token)),
        );
        await tester.pumpAndSettle();

        await tester.drag(find.byType(ListView), const Offset(0, -1000));
        await tester.pumpAndSettle();

        expect(requestedPages, ['0', '1']);
        expect(find.text('Existing item 8'), findsOneWidget);
        expect(
          find.byKey(const ValueKey('notification-load-more-retry')),
          findsOneWidget,
        );
        expect(find.text('Unable to load more notifications.'), findsOneWidget);
        expect(
          find.byKey(const ValueKey('notification-first-page-retry')),
          findsNothing,
        );
      },
    );

    testWidgets(
      'does not optimistically mark one read and reports new count after success',
      (tester) async {
        final markRead = Completer<http.Response>();
        final callbacks = <int>[];
        final client = MockClient((request) async {
          if (request.method == 'PATCH') return markRead.future;
          return _jsonResponse(
            _page([
              _notification(id: 1, title: 'Unread item'),
              _notification(id: 2, title: 'Read item', read: true),
            ]),
            200,
          );
        });

        await tester.pumpWidget(
          _buildApp(
            serviceFactory: (token) => _serviceFor(client, token),
            onUnreadCountChanged: callbacks.add,
          ),
        );
        await tester.pumpAndSettle();

        final indicator = find.byKey(const ValueKey('unread-indicator-1'));
        expect(indicator, findsOneWidget);
        await tester.tap(find.text('Unread item'));
        await tester.pump();
        expect(indicator, findsOneWidget);
        expect(callbacks, isEmpty);

        markRead.complete(_jsonResponse({}, 200));
        await tester.pumpAndSettle();

        expect(find.byKey(const ValueKey('unread-indicator-1')), findsNothing);
        expect(callbacks, [0]);
      },
    );

    testWidgets('marks all read only after success and reports zero', (
      tester,
    ) async {
      final markAllRead = Completer<http.Response>();
      final callbacks = <int>[];
      final client = MockClient((request) async {
        if (request.method == 'PATCH') return markAllRead.future;
        return _jsonResponse(
          _page([
            _notification(id: 1, title: 'Unread one'),
            _notification(id: 2, title: 'Unread two'),
          ]),
          200,
        );
      });

      await tester.pumpWidget(
        _buildApp(
          serviceFactory: (token) => _serviceFor(client, token),
          onUnreadCountChanged: callbacks.add,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Mark all read'), findsOneWidget);
      await tester.tap(find.text('Mark all read'));
      await tester.pump();
      expect(find.byKey(const ValueKey('unread-indicator-1')), findsOneWidget);
      expect(find.byKey(const ValueKey('unread-indicator-2')), findsOneWidget);
      expect(callbacks, isEmpty);

      markAllRead.complete(_jsonResponse({}, 200));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('unread-indicator-1')), findsNothing);
      expect(find.byKey(const ValueKey('unread-indicator-2')), findsNothing);
      expect(find.text('Mark all read'), findsNothing);
      expect(callbacks, [0]);
    });

    testWidgets(
      'keeps one unread indicator and shows a SnackBar on read failure',
      (tester) async {
        final client = MockClient((request) async {
          if (request.method == 'PATCH') {
            return _jsonResponse({'message': 'Read failed.'}, 500);
          }
          return _jsonResponse(
            _page([_notification(id: 1, title: 'Unread item')]),
            200,
          );
        });

        await tester.pumpWidget(
          _buildApp(serviceFactory: (token) => _serviceFor(client, token)),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Unread item'));
        await tester.pumpAndSettle();

        expect(
          find.byKey(const ValueKey('unread-indicator-1')),
          findsOneWidget,
        );
        expect(find.text('Read failed.'), findsOneWidget);
      },
    );
  });
}
