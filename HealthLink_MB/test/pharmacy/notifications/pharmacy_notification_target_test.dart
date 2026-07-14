import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_notification_target.dart';

void main() {
  group('PharmacyNotificationTarget.resolve', () {
    test('request action URL maps to Requests with request detail', () {
      final target = PharmacyNotificationTarget.resolve('/pharmacy-requests/73', null, null);
      expect(target, equals(const NotificationTarget(
        tabIndex: PharmacyNotificationTarget.tabRequests,
        detailType: 'request',
        detailId: '73',
      )));
    });

    test('order action URL maps to Orders with order detail', () {
      final target = PharmacyNotificationTarget.resolve('/pharmacy-orders/91', null, null);
      expect(target, equals(const NotificationTarget(
        tabIndex: PharmacyNotificationTarget.tabOrders,
        detailType: 'order',
        detailId: '91',
      )));
    });

    test('request page order action URL maps to Requests with request-order detail', () {
      final target = PharmacyNotificationTarget.resolve(
        '/pharmacy-page/requests?orderId=91',
        null,
        null,
      );
      expect(target, equals(const NotificationTarget(
        tabIndex: PharmacyNotificationTarget.tabRequests,
        detailType: 'request-order',
        detailId: '91',
      )));
    });

    test('new pharmacy request type maps to request detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'NEW_PHARMACY_REQUEST', 73);
      expect(target.detailType, 'request');
      expect(target.detailId, '73');
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
    });

    test('new order type maps to order detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'NEW_ORDER', 91);
      expect(target.detailType, 'order');
      expect(target.detailId, '91');
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
    });

    test('order status type maps to order detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'ORDER_STATUS', 91);
      expect(target.detailType, 'order');
      expect(target.detailId, '91');
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
    });

    test('cancel order type maps to order detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'CANCEL_ORDER', 91);
      expect(target.detailType, 'order');
      expect(target.detailId, '91');
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
    });

    test('stock warning with related ID maps to inventory detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'STOCK_WARNING', 15);
      expect(target.detailType, 'inventory');
      expect(target.detailId, '15');
      expect(target.tabIndex, PharmacyNotificationTarget.tabInventory);
    });

    test('stock warning without related ID maps to low-stock inventory detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'STOCK_WARNING', null);
      expect(target.detailType, 'inventory-low-stock');
      expect(target.detailId, isNull);
      expect(target.tabIndex, PharmacyNotificationTarget.tabInventory);
    });

    test('recognized action URL takes precedence over notification type', () {
      final target = PharmacyNotificationTarget.resolve(
        '/pharmacy-page/requests?orderId=91',
        'ORDER_STATUS',
        999,
      );
      expect(target.detailType, 'request-order');
      expect(target.detailId, '91');
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
    });

    test('requestId maps to Requests tab with detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'NEW_PHARMACY_REQUEST', 42);
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
      expect(target.detailId, '42');
      expect(target.detailType, 'request');
    });

    test('orderId maps to Orders tab with detail', () {
      final target = PharmacyNotificationTarget.resolve(null, 'NEW_ORDER', 99);
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
      expect(target.detailId, '99');
      expect(target.detailType, 'order');
    });

    test('requestId takes precedence over orderId', () {
      final target = PharmacyNotificationTarget.resolve(null, 'NEW_PHARMACY_REQUEST', 1);
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
      expect(target.detailId, '1');
    });

    test('actionUrl with pharmacy-requests resolves correctly', () {
      final target = PharmacyNotificationTarget.resolve('/api/pharmacy-requests/77', null, null);
      expect(target.tabIndex, PharmacyNotificationTarget.tabRequests);
      expect(target.detailId, '77');
      expect(target.detailType, 'request');
    });

    test('actionUrl with pharmacy-orders resolves correctly', () {
      final target = PharmacyNotificationTarget.resolve('/api/pharmacy-orders/123', null, null);
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
      expect(target.detailId, '123');
      expect(target.detailType, 'order');
    });

    test('actionUrl with pharmacy-orders and query params', () {
      final target = PharmacyNotificationTarget.resolve(
        '/api/pharmacy-orders/456?source=notification',
        null,
        null,
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabOrders);
      expect(target.detailId, '456');
    });

    test('actionUrl with inventory resolves to Inventory tab', () {
      final target = PharmacyNotificationTarget.resolve(
        '/api/pharmacy/inventory/low-stock',
        null,
        null,
      );
      expect(target.tabIndex, PharmacyNotificationTarget.tabInventory);
      expect(target.detailId, isNull);
    });

    test('STOCK_WARNING type resolves to Inventory tab', () {
      final target = PharmacyNotificationTarget.resolve(null, 'STOCK_WARNING', null);
      expect(target.tabIndex, PharmacyNotificationTarget.tabInventory);
    });

    test('unknown actionUrl falls back to Home tab', () {
      final target = PharmacyNotificationTarget.resolve('/api/some/unknown/path', null, null);
      expect(target.tabIndex, PharmacyNotificationTarget.tabHome);
    });

    test('no params falls back to Home tab', () {
      final target = PharmacyNotificationTarget.resolve(null, null, null);
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

  group('NotificationAttention identity', () {
    test('equal targets with different sequences are distinct events', () {
      const target = NotificationTarget(tabIndex: PharmacyNotificationTarget.tabRequests);
      const first = NotificationAttention(target: target, sequence: 1);
      const second = NotificationAttention(target: target, sequence: 2);

      expect(first, isNot(same(second)));
      expect(first.target, equals(second.target));
      expect(first.sequence, isNot(second.sequence));
    });
  });
}
