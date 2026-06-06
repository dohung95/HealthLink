/// Cấu hình API toàn bộ ứng dụng.
/// Thay đổi [baseUrl] theo môi trường:
///   - Android Emulator : http://10.0.2.2:8096
///   - Thiết bị thật   : http://<IP_máy_tính>:8096
///   - Production       : https://api.healthlink.com
class ApiConfig {
  ApiConfig._(); // Không cho khởi tạo

  // ── Base URL ──────────────────────────────────────────────────────────────
  static const String baseUrl = 'http://127.0.0.1:8096/api';

  // ── Auth Endpoints ────────────────────────────────────────────────────────
  static const String login          = '$baseUrl/auth/login';
  static const String register       = '$baseUrl/auth/register';
  static const String logout         = '$baseUrl/auth/logout';
  static const String forgotPassword = '$baseUrl/auth/forgot-password';
  static const String resetPassword  = '$baseUrl/auth/reset-password';
  static const String refreshToken   = '$baseUrl/auth/refresh';

  // ── HTTP Config ───────────────────────────────────────────────────────────
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
