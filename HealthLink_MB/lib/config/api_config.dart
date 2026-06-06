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

  // ── Patient Profile Endpoints ─────────────────────────────────────────────
  /// GET /api/account/patient/profile – Lấy profile của bản thân.
  static const String patientProfile = '$baseUrl/account/patient/profile';

  // ── Chat Endpoints ────────────────────────────────────────────────────────
  /// GET /api/chat/rooms/me – Lấy danh sách phòng chat của user hiện tại.
  static const String chatRooms         = '$baseUrl/chat/rooms/me';

  /// POST /api/chat/rooms – Tạo hoặc lấy phòng chat giữa 2 user.
  static const String chatRoomCreate    = '$baseUrl/chat/rooms';

  /// GET /api/chat/rooms/{id} – Lấy thông tin một phòng chat.
  static String chatRoomById(String id) => '$baseUrl/chat/rooms/$id';

  /// GET /api/chat/rooms/{id}/messages – Lấy lịch sử tin nhắn.
  static String chatMessages(String id) => '$baseUrl/chat/rooms/$id/messages';

  /// POST /api/chat/messages – Gửi tin nhắn mới.
  static const String chatSendMessage   = '$baseUrl/chat/messages';

  /// PATCH /api/chat/rooms/{id}/read – Đánh dấu đã đọc.
  static String chatMarkAsRead(String id) => '$baseUrl/chat/rooms/$id/read';

  // ── HTTP Config ───────────────────────────────────────────────────────────
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  // ── Helper ────────────────────────────────────────────────────────────────
  /// Chuẩn hóa URL ảnh (chuyển đổi localhost thành 127.0.0.1 cho giả lập/device,
  /// và thêm host cho các đường dẫn tương đối).
  static String? normalizeUrl(String? url) {
    if (url == null || url.isEmpty) return null;
    
    String finalUrl = url;
    
    // Nếu là đường dẫn tương đối (ví dụ: /avatars/doctor01.jpg)
    if (finalUrl.startsWith('/')) {
      final host = baseUrl.replaceAll('/api', '');
      finalUrl = '$host$finalUrl';
    }
    
    // Thay thế localhost thành 127.0.0.1 để tránh lỗi phân giải DNS trên thiết bị di động
    finalUrl = finalUrl.replaceAll('localhost', '127.0.0.1');
    
    return finalUrl;
  }
}

