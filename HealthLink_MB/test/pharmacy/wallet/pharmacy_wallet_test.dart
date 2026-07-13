import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/services/partner/partner_wallet_service.dart';

const _token = 'test-token';
const _pharmacyId = 'pharm-1';

Map<String, dynamic> _sampleBalanceJson() => {
      'partnerId': _pharmacyId,
      'partnerType': 'PHARMACY',
      'partnerName': 'Test Pharmacy',
      'pendingBalance': 150.0,
      'totalEarnings': 500.0,
      'eligibleForWithdrawal': true,
      'withdrawalStatus': 'Eligible',
    };

Map<String, dynamic> _sampleTxJson(int id) => {
      'transactionId': id,
      'sourceType': 'PHARMACY_ORDER',
      'recipientType': 'PHARMACY',
      'recipientId': _pharmacyId,
      'recipientName': 'Test Pharmacy',
      'serviceType': 'PHARMACY_ORDER',
      'grossAmount': 100.0,
      'netAmount': 85.0,
      'status': 'SETTLED',
      'createdAt': '2026-07-13T10:00:00',
    };

Map<String, dynamic> _sampleSettlementJson(int id) => {
      'settlementId': id,
      'settlementNumber': 'STL-$id',
      'recipientType': 'PHARMACY',
      'recipientId': _pharmacyId,
      'recipientName': 'Test Pharmacy',
      'grossAmount': 100.0,
      'netAmount': 85.0,
      'status': 'COMPLETED',
      'paypalEmail': 'pharmacy@test.com',
      'createdAt': '2026-07-13T10:00:00',
    };

void main() {
  group('PartnerWalletService balance', () {
    test('fetches wallet balance with PHARMACY type', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.toString(), contains('balance'));
        expect(request.url.queryParameters['type'], 'PHARMACY');
        return http.Response(jsonEncode(_sampleBalanceJson()), 200);
      });
      final service = PartnerWalletService(
        partnerId: _pharmacyId,
        partnerType: 'PHARMACY',
        client: mockClient,
      );
      final balance = await service.getBalance(_token);
      expect(balance.pendingBalance, 150.0);
      expect(balance.eligibleForWithdrawal, true);
      expect(balance.totalEarnings, 500.0);
      expect(balance.partnerName, 'Test Pharmacy');
    });

    test('throws on failed balance fetch', () async {
      final mockClient = MockClient((_) async =>
          http.Response('Not found', 404));
      final service = PartnerWalletService(
        partnerId: _pharmacyId,
        partnerType: 'PHARMACY',
        client: mockClient,
      );
      expect(() => service.getBalance(_token), throwsException);
    });
  });

  group('PartnerWalletService transactions', () {
    test('returns transaction list', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.toString(), contains('transactions'));
        return http.Response(
          jsonEncode([_sampleTxJson(1), _sampleTxJson(2)]),
          200,
        );
      });
      final service = PartnerWalletService(
        partnerId: _pharmacyId,
        partnerType: 'PHARMACY',
        client: mockClient,
      );
      final txs = await service.getTransactions(_token);
      expect(txs.length, 2);
      expect(txs[0].transactionId, 1);
      expect(txs[0].serviceType, 'PHARMACY_ORDER');
    });

    test('handles empty transaction list', () async {
      final mockClient = MockClient((_) async =>
          http.Response(jsonEncode([]), 200));
      final service = PartnerWalletService(
        partnerId: _pharmacyId,
        partnerType: 'PHARMACY',
        client: mockClient,
      );
      final txs = await service.getTransactions(_token);
      expect(txs, isEmpty);
    });
  });

  group('PartnerWalletService settlements', () {
    test('returns settlement list', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.toString(), contains('settlements'));
        return http.Response(
          jsonEncode([_sampleSettlementJson(1)]),
          200,
        );
      });
      final service = PartnerWalletService(
        partnerId: _pharmacyId,
        partnerType: 'PHARMACY',
        client: mockClient,
      );
      final settlements = await service.getSettlements(_token);
      expect(settlements.length, 1);
      expect(settlements[0].paypalEmail, 'pharmacy@test.com');
      expect(settlements[0].status, 'COMPLETED');
    });
  });

  group('PartnerWalletService withdrawal', () {
    test('sends withdrawal with amount, paypalEmail, pin, notes', () async {
      http.Response? capturedResponse;
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.toString(), contains('settle'));
        expect(request.url.queryParameters['type'], 'PHARMACY');
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['amount'], 50.0);
        expect(body['paypalEmail'], 'pharmacy@test.com');
        expect(body['pin'], '123456');
        expect(body['notes'], 'Test withdrawal');
        capturedResponse = http.Response(
          jsonEncode(_sampleSettlementJson(3)),
          201,
        );
        return capturedResponse!;
      });
      final service = PartnerWalletService(
        partnerId: _pharmacyId,
        partnerType: 'PHARMACY',
        client: mockClient,
      );
      final result = await service.requestWithdrawal(
        _token,
        amount: 50.0,
        paypalEmail: 'pharmacy@test.com',
        pin: '123456',
        notes: 'Test withdrawal',
      );
      expect(result.settlementNumber, 'STL-3');
    });

    test('throws on withdrawal without registered paypal', () async {
      final mockClient = MockClient((_) async =>
          http.Response('No PayPal email registered', 400));
      final service = PartnerWalletService(
        partnerId: _pharmacyId,
        partnerType: 'PHARMACY',
        client: mockClient,
      );
      expect(
        () => service.requestWithdrawal(
          _token,
          amount: 50.0,
          paypalEmail: 'pharmacy@test.com',
          pin: '123456',
        ),
        throwsException,
      );
    });
  });
}
