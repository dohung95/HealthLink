import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/auth/login_request.dart';
import '../../models/auth/login_response.dart';
import '../../models/auth/register_request.dart';

/// Service gọi REST API cho toàn bộ tính năng Auth.
/// Tương đương file auth.js trong HealthLink_FE.
class AuthService {
  AuthService._();

  /// Headers mặc định cho request JSON.
  static const Map<String, String> _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  /// Parse thông báo lỗi từ JSON response body backend.
  static String _parseErrorMessage(http.Response res, String fallback) {
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>;

      // Ưu tiên theo thứ tự: validationErrors → errors → message → title
      if (data['validationErrors'] != null) {
        final errs = data['validationErrors'] as Map<String, dynamic>;
        return errs.values.expand((v) => v is List ? v : [v]).join(', ');
      }
      if (data['ValidationErrors'] != null) {
        final errs = data['ValidationErrors'] as Map<String, dynamic>;
        return errs.values.expand((v) => v is List ? v : [v]).join(', ');
      }
      if (data['errors'] != null) {
        final errs = data['errors'] as Map<String, dynamic>;
        return errs.values.expand((v) => v is List ? v : [v]).join(', ');
      }
      return (data['message'] ?? data['Message'] ?? data['title'] ?? fallback).toString();
    } catch (_) {
      return fallback;
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  /// Đăng nhập bằng email + password.
  /// Throws [Exception] với thông báo lỗi từ backend nếu thất bại.
  static Future<LoginResponse> login(LoginRequest request) async {
    final res = await http
        .post(
          Uri.parse(ApiConfig.login),
          headers: _jsonHeaders,
          body: jsonEncode(request.toJson()),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return LoginResponse.fromJson(data);
    }

    throw Exception(_parseErrorMessage(res, 'Invalid email or password'));
  }

  // ── Register ───────────────────────────────────────────────────────────────

  /// Đăng ký tài khoản mới.
  /// Throws [Exception] nếu backend trả lỗi validation hoặc email đã tồn tại.
  static Future<void> register(RegisterRequest request) async {
    final res = await http
        .post(
          Uri.parse(ApiConfig.register),
          headers: _jsonHeaders,
          body: jsonEncode(request.toJson()),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200 || res.statusCode == 201) return;

    throw Exception(_parseErrorMessage(res, 'Registration failed. Please try again.'));
  }

  // ── Forgot Password ────────────────────────────────────────────────────────

  /// Gửi email đặt lại mật khẩu.
  /// Backend luôn trả 200 dù email không tồn tại (bảo mật – không tiết lộ email có hay không).
  static Future<void> forgotPassword(String email) async {
    final res = await http
        .post(
          Uri.parse(ApiConfig.forgotPassword),
          headers: _jsonHeaders,
          body: jsonEncode({'email': email}),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) return;

    throw Exception(_parseErrorMessage(res, 'Failed to send reset email.'));
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  /// Logout bảo mật: blacklist token trên server.
  /// Luôn thành công về mặt client dù backend lỗi.
  static Future<void> logout(String accessToken) async {
    try {
      await http
          .post(
            Uri.parse(ApiConfig.logout),
            headers: {..._jsonHeaders, 'Authorization': 'Bearer $accessToken'},
          )
          .timeout(ApiConfig.connectTimeout);
    } catch (_) {
      // Bỏ qua lỗi server khi logout – token local sẽ bị xóa dù sao
    }
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────

  /// Làm mới access token bằng refresh token.
  /// Trả null nếu refresh token đã hết hạn.
  static Future<LoginResponse?> refreshAccessToken(String refreshToken) async {
    try {
      final res = await http
          .post(
            Uri.parse(ApiConfig.refreshToken),
            headers: _jsonHeaders,
            body: jsonEncode({'refreshToken': refreshToken}),
          )
          .timeout(ApiConfig.connectTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        return LoginResponse.fromJson(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
