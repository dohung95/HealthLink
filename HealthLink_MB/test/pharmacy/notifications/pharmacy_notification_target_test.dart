import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_notification_target.dart';

void main() {
  group('PharmacyNotificationTarget.resolve', () {
    test('requestId maps to Requests tab with detail', () {
      final target = PharmacyNotificationTarget.resolve(requestId: 42);
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
      expect(target.detailId, '42');
      expect(target.detailType, 'request');
    });

    test('orderId maps to Orders tab with detail', () {
      final target = PharmacyNotificationTarget.resolve(orderId: 99);
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
      expect(target.detailId, '99');
      expect(target.detailType, 'order');
    });

    test('requestId takes precedence over orderId', () {
      final target = PharmacyNotificationTarget.resolve(
        requestId: 1,
        orderId: 2,
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
      expect(target.detailId, '1');
    });

    test('actionUrl with pharmacy-requests resolves correctly', () {
      final target = PharmacyNotificationTarget.resolve(
        actionUrl: '/api/pharmacy-requests/77',
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
      expect(target.detailId, '77');
      expect(target.detailType, 'request');
    });

    test('actionUrl with pharmacy-orders resolves correctly', () {
      final target = PharmacyNotificationTarget.resolve(
        actionUrl: '/api/pharmacy-orders/123',
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
      expect(target.detailId, '123');
      expect(target.detailType, 'order');
    });

    test('actionUrl with pharmacy-orders and query params', () {
      final target = PharmacyNotificationTarget.resolve(
        actionUrl: '/api/pharmacy-orders/456?source=notification',
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
      expect(target.detailId, '456');
    });

    test('actionUrl with inventory resolves to Inventory tab', () {
      final target = PharmacyNotificationTarget.resolve(
        actionUrl: '/api/pharmacy/inventory/low-stock',
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabInventory);
      expect(target.detailId, isNull);
    });

    test('STOCK_WARNING type resolves to Inventory tab', () {
      final target = PharmacyNotificationTarget.resolve(type: 'STOCK_WARNING');
      expect(target.tabIndex, PharmacyNotificationTarget.tabInventory);
    });

    test('unknown actionUrl falls back to Home tab', () {
      final target = PharmacyNotificationTarget.resolve(
        actionUrl: '/api/some/unknown/path',
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabHome);
    });

    test('no params falls back to Home tab', () {
      final target = PharmacyNotificationTarget.resolve();
      expect(target.tabIndex, PharmacyNotificationTarget.tabHome);
    });
  });

  group('NotificationTarget equality', () {
    test('same fields are equal', () {
      final a = NotificationTarget(tabIndex: 1, detailId: '42');
      final b = NotificationTarget(tabIndex: 1, detailId: '42');
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('different tabIndex are not equal', () {
      final a = NotificationTarget(tabIndex: 0);
      final b = NotificationTarget(tabIndex: 1);
      expect(a, isNot(equals(b)));
    });
  });
}
