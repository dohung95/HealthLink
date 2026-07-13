import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';

class PartnerSecurityService {
  final http.Client _client;

  PartnerSecurityService({http.Client? client})
      : _client = client ?? http.Client();

  static const _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  Map<String, String> _authHeaders(String token) => {
        ..._jsonHeaders,
        'Authorization': 'Bearer $token',
      };

  void close() => _client.close();

  Future<Map<String, dynamic>> getPinStatus(String token) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.partnerPinStatus),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to get PIN status');
  }

  Future<void> requestPinOtp(String token) async {
    final res = await _client
        .post(
          Uri.parse(ApiConfig.partnerPinRequestOtp),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 200) {
      final body =
          res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic> : <String, dynamic>{};
      throw Exception(body['retryAfterSeconds'] != null
          ? 'Cooldown active: ${body['retryAfterSeconds']} seconds remaining'
          : 'Failed to request PIN OTP');
    }
  }

  Future<void> verifyPinOtp(String token, String otp) async {
    final res = await _client
        .post(
          Uri.parse(ApiConfig.partnerPinVerifyOtp),
          headers: _authHeaders(token),
          body: jsonEncode({'otp': otp}),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 204) {
      final body =
          res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic> : <String, dynamic>{};
      final code = body['code']?.toString() ?? 'UNKNOWN';
      throw Exception('PIN_OTP_ERROR:$code');
    }
  }

  Future<void> setPin(
    String token, {
    required String otp,
    required String pin,
    required String confirmPin,
  }) async {
    final res = await _client
        .put(
          Uri.parse(ApiConfig.partnerPinSet),
          headers: _authHeaders(token),
          body: jsonEncode({
            'otp': otp,
            'pin': pin,
            'confirmPin': confirmPin,
          }),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 204) {
      throw Exception('Failed to set PIN');
    }
  }

  Future<void> requestPasswordChangeOtp(String token) async {
    final res = await _client
        .post(
          Uri.parse(ApiConfig.pharmacyPasswordRequestOtp),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 200) {
      throw Exception('Failed to request password change OTP');
    }
  }

  Future<void> changePasswordWithOtp(
    String token, {
    required String otp,
    required String newPassword,
    required String confirmNewPassword,
  }) async {
    final res = await _client
        .put(
          Uri.parse(ApiConfig.pharmacyPasswordChangeWithOtp),
          headers: _authHeaders(token),
          body: jsonEncode({
            'otp': otp,
            'newPassword': newPassword,
            'confirmNewPassword': confirmNewPassword,
          }),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 204) {
      throw Exception('Failed to change password');
    }
  }
}
