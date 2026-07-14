import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_order_service.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_request_service.dart';

const _token = 'test-token';
const _pharmacyId = 'pharm-1';

Map<String, dynamic> _sampleRequestJson(int id) => {
      'requestId': id,
      'patientId': 'pat-$id',
      'patientName': 'Patient $id',
      'status': 'PENDING',
      'createdAt': '2026-07-13T10:00:00.000Z',
    };

Map<String, dynamic> _sampleOrderJson(int id) => {
      'orderId': id,
      'orderNumber': 'ORD-$id',
      'pharmacyId': _pharmacyId,
      'pharmacyName': 'Pharmacy 1',
      'patientId': 'pat-$id',
      'patientName': 'Patient $id',
      'status': 'PENDING',
      'medicineAmount': 100.0,
      'totalAmount': 100.0,
      'items': [],
      'createdAt': '2026-07-13T10:00:00.000Z',
    };

void main() {
  group('PharmacyRequestService', () {
    test('decodes request list with UTF-8 characters', () async {
      final vietnameseName = 'Nguyễn Văn A';
      final requestJson = _sampleRequestJson(1);
      requestJson['patientName'] = vietnameseName;

      final mockClient = MockClient((request) async {
        expect(request.url.toString(), contains('pharmacy-requests'));
        return http.Response(
          jsonEncode([requestJson]),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = PharmacyRequestService(client: mockClient);
      final requests = await service.getRequests(_token, _pharmacyId);
      expect(requests.length, 1);
      expect(requests[0].patientName, vietnameseName);
    });

    test('decodes request list from page wrapper', () async {
      final payload = {
        'content': [
          _sampleRequestJson(1),
          _sampleRequestJson(2),
        ],
        'totalElements': 2,
        'totalPages': 1,
      };

      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode(payload), 200);
      });

      final service = PharmacyRequestService(client: mockClient);
      final requests = await service.getRequests(_token, _pharmacyId);
      expect(requests.length, 2);
    });

    test('create order sends the strict backend item contract', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        final items = body['items'] as List<dynamic>;
        final item = items.single as Map<String, dynamic>;

        expect(body['estimatedDeliveryMinutes'], 45);
        expect(body['estimatedDeliveryMinutes'], isA<int>());
        expect(body.containsKey('estimatedDeliveryTime'), isFalse);
        expect(item, {
          'medicineId': 12,
          'quantity': 2,
          'totalSupplyDays': 30,
          'route': 'ORAL',
          'frequency': 'TID',
          'timing': 'MORNING,AFTERNOON,EVENING',
        });
        expect(item.containsKey('medicationName'), isFalse);
        expect(item.containsKey('unit'), isFalse);
        expect(item.containsKey('unitPrice'), isFalse);

        return http.Response(jsonEncode(_sampleOrderJson(41)), 201);
      });

      final service = PharmacyRequestService(client: mockClient);
      final result = await service.createOrderFromRequest(
        _token,
        '41',
        [
          {
            'medicineId': 12,
            'quantity': 2,
            'totalSupplyDays': 30,
            'route': 'ORAL',
            'frequency': 'TID',
            'timing': 'MORNING,AFTERNOON,EVENING',
          },
        ],
        deliveryFee: 25000,
        estimatedDeliveryMinutes: 45,
      );

      expect(result['orderId'], 41);
    });
  });

  group('PharmacyOrderService', () {
    test('decodes order list with UTF-8 characters', () async {
      final vietnameseName = 'Trần Thị B';
      final orderJson = _sampleOrderJson(1);
      orderJson['patientName'] = vietnameseName;

      final mockClient = MockClient((request) async {
        expect(request.url.toString(), contains('pharmacy-orders'));
        return http.Response(
          jsonEncode([orderJson]),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });

      final service = PharmacyOrderService(client: mockClient);
      final orders = await service.getOrders(_token, _pharmacyId);
      expect(orders.length, 1);
      expect(orders[0].patientName, vietnameseName);
    });

    test('orders request does not send unsupported pagination parameters', () async {
      var calls = 0;
      final mockClient = MockClient((request) async {
        calls++;
        expect(request.url.queryParameters.containsKey('page'), isFalse);
        expect(request.url.queryParameters.containsKey('size'), isFalse);
        return http.Response(jsonEncode([
          _sampleOrderJson(1),
          _sampleOrderJson(2),
        ]), 200);
      });

      final service = PharmacyOrderService(client: mockClient);
      final orders = await service.getOrders(_token, _pharmacyId);

      expect(calls, 1);
      expect(orders.map((order) => order.orderId), [1, 2]);
    });

    test('loading single order by id works', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode(_sampleOrderJson(42)), 200);
      });

      final service = PharmacyOrderService(client: mockClient);
      final order = await service.getOrderById(_token, '42');
      expect(order.orderId, 42);
    });

    test('update quote sends the same strict item contract', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'PUT');
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        final item = (body['items'] as List<dynamic>).single
            as Map<String, dynamic>;

        expect(body['estimatedDeliveryMinutes'], 90);
        expect(body['estimatedDeliveryMinutes'], isA<int>());
        expect(body.containsKey('estimatedDeliveryTime'), isFalse);
        expect(item.containsKey('medicationName'), isFalse);
        expect(item['medicineId'], 12);
        expect(item['timing'], 'MORNING,EVENING');

        return http.Response(jsonEncode(_sampleOrderJson(42)), 200);
      });

      final service = PharmacyOrderService(client: mockClient);
      final result = await service.updateOrderQuote(
        _token,
        '42',
        [
          {
            'medicineId': 12,
            'quantity': 2,
            'totalSupplyDays': 30,
            'frequency': 'BID',
            'timing': 'MORNING,EVENING',
          },
        ],
        deliveryFee: 20000,
        estimatedDeliveryMinutes: 90,
      );

      expect(result.orderId, 42);
    });
  });
}
