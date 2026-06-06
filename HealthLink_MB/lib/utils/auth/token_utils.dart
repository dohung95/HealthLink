import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Tiện ích lưu/tải/xóa token từ SharedPreferences.
/// Dùng chung cho AuthProvider và AuthService.
class TokenUtils {
  TokenUtils._();

  static const String _keyAccessToken  = 'auth_access_token';
  static const String _keyRefreshToken = 'auth_refresh_token';
  static const String _keyUserId       = 'auth_user_id';

  // ── Lưu tokens ─────────────────────────────────────────────────────────────

  /// Lưu access token, refresh token và userId vào SharedPreferences.
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    String? userId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAccessToken,  accessToken);
    await prefs.setString(_keyRefreshToken, refreshToken);
    if (userId != null) await prefs.setString(_keyUserId, userId);
  }

  // ── Tải tokens ─────────────────────────────────────────────────────────────

  /// Tải access token từ SharedPreferences, trả null nếu chưa lưu.
  static Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAccessToken);
  }

  /// Tải refresh token từ SharedPreferences.
  static Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyRefreshToken);
  }

  /// Tải userId từ SharedPreferences.
  static Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyUserId);
  }

  // ── Xóa tokens ─────────────────────────────────────────────────────────────

  /// Xóa toàn bộ thông tin auth khi logout.
  static Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
    await prefs.remove(_keyUserId);
  }

  // ── Decode JWT ─────────────────────────────────────────────────────────────

  /// Decode JWT payload mà không cần thư viện bên ngoài.
  /// Trả về Map<String, dynamic> hoặc null nếu token không hợp lệ.
  static Map<String, dynamic>? decodeJwtPayload(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      // JWT dùng base64url – cần padding về base64 chuẩn
      String payload = parts[1];
      final rem = payload.length % 4;
      if (rem != 0) payload = payload.padRight(payload.length + (4 - rem), '=');
      payload = payload.replaceAll('-', '+').replaceAll('_', '/');

      final decoded = utf8.decode(base64.decode(payload));
      return jsonDecode(decoded) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Kiểm tra token đã hết hạn chưa.
  /// Trả true nếu còn hạn, false nếu đã hết hạn hoặc không hợp lệ.
  static bool isTokenValid(String token) {
    final payload = decodeJwtPayload(token);
    if (payload == null) return false;
    final exp = payload['exp'];
    if (exp == null) return false;
    final expiry = DateTime.fromMillisecondsSinceEpoch((exp as int) * 1000);
    return expiry.isAfter(DateTime.now());
  }

  /// Trích xuất role từ JWT payload (hỗ trợ cả .NET long claim key và short key).
  static List<String> extractRoles(Map<String, dynamic> payload) {
    const longKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
    dynamic roleValue = payload[longKey] ?? payload['role'] ?? payload['roles'];
    if (roleValue == null) return [];
    if (roleValue is List) return roleValue.map((e) => e.toString()).toList();
    return [roleValue.toString()];
  }
}
