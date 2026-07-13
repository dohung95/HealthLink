import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:HealthLink/services/partner/partner_security_service.dart';

const _token = 'test-token';

void main() {
  group('PartnerSecurityService PIN OTP', () {
    test('request-otp succeeds', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.toString(), contains('request-otp'));
        return http.Response(
          jsonEncode({'message': 'OTP sent'}),
          200,
        );
      });
      final service = PartnerSecurityService(client: mockClient);
      await expectLater(
        service.requestPinOtp(_token),
        completes,
      );
    });

    test('request-otp enforces cooldown', () async {
      int callCount = 0;
      final mockClient = MockClient((request) async {
        callCount++;
        if (callCount == 1) {
          return http.Response(
            jsonEncode({'message': 'OTP sent'}),
            200,
          );
        }
        return http.Response(
          jsonEncode({
            'message': 'Please wait before requesting another withdrawal PIN OTP',
            'retryAfterSeconds': 45,
          }),
          429,
        );
      });
      final service = PartnerSecurityService(client: mockClient);
      await service.requestPinOtp(_token);
      try {
        await service.requestPinOtp(_token);
        fail('Expected exception');
      } catch (e) {
        expect(e.toString(), contains('Cooldown active'));
      }
    });

    test('verify-otp succeeds', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.toString(), contains('verify-otp'));
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['otp'], '123456');
        return http.Response('', 204);
      });
      final service = PartnerSecurityService(client: mockClient);
      await expectLater(
        service.verifyPinOtp(_token, '123456'),
        completes,
      );
    });

    test('verify-otp throws on invalid OTP', () async {
      final mockClient = MockClient((_) async =>
          http.Response(jsonEncode({'code': 'PIN_OTP_INVALID'}), 422));
      final service = PartnerSecurityService(client: mockClient);
      expect(
        () => service.verifyPinOtp(_token, '000000'),
        throwsException,
      );
    });

    test('verify-otp throws on expired OTP', () async {
      final mockClient = MockClient((_) async =>
          http.Response(jsonEncode({'code': 'PIN_OTP_EXPIRED'}), 422));
      final service = PartnerSecurityService(client: mockClient);
      expect(
        () => service.verifyPinOtp(_token, '123456'),
        throwsException,
      );
    });
  });

  group('PartnerSecurityService PIN set', () {
    test('set-pin succeeds after OTP verification', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'PUT');
        expect(request.url.toString(), endsWith('pin'));
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['otp'], '123456');
        expect(body['pin'], '654321');
        expect(body['confirmPin'], '654321');
        return http.Response('', 204);
      });
      final service = PartnerSecurityService(client: mockClient);
      await expectLater(
        service.setPin(_token, otp: '123456', pin: '654321', confirmPin: '654321'),
        completes,
      );
    });
  });

  group('PartnerSecurityService PIN status', () {
    test('getStatus returns configured and locked state', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.toString(), contains('pin'));
        expect(request.method, 'GET');
        return http.Response(
          jsonEncode({
            'configured': true,
            'locked': false,
            'lockedUntil': null,
          }),
          200,
        );
      });
      final service = PartnerSecurityService(client: mockClient);
      final status = await service.getPinStatus(_token);
      expect(status['configured'], true);
      expect(status['locked'], false);
    });
  });

  group('PartnerSecurityService password change', () {
    test('request-otp for password change succeeds', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.toString(), contains('request-otp'));
        return http.Response('OTP sent', 200);
      });
      final service = PartnerSecurityService(client: mockClient);
      await expectLater(
        service.requestPasswordChangeOtp(_token),
        completes,
      );
    });

    test('change password with OTP succeeds', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'PUT');
        expect(request.url.toString(), contains('change-with-otp'));
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['otp'], '123456');
        expect(body['newPassword'], 'NewPass123');
        expect(body['confirmNewPassword'], 'NewPass123');
        return http.Response('', 204);
      });
      final service = PartnerSecurityService(client: mockClient);
      await expectLater(
        service.changePasswordWithOtp(
          _token,
          otp: '123456',
          newPassword: 'NewPass123',
          confirmNewPassword: 'NewPass123',
        ),
        completes,
      );
    });
  });
}
