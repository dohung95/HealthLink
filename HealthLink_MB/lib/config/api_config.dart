/// Cấu hình API toàn bộ ứng dụng.
/// Thay đổi [baseUrl] theo môi trường:
///   - Android Emulator : http://10.0.2.2:8096
///   - Thiết bị thật   : http://<IP_máy_tính>:8096
///   - Production       : https://api.healthlink.com
class ApiConfig {
  ApiConfig._(); // Không cho khởi tạo

  static const String paypalClientId = 'Abj_ov73E4EuBjVPEu23yN-oPJUu-7AQMrsMaVmcCTmQI9JlkK-HJ_nd7Hy7gtxE8O68hmJbbCrKP27b';

  // ── Base URL ──────────────────────────────────────────────────────────────
  static const String baseUrl = 'http://192.168.0.90:8096/api';
  static const String wsUrl   = 'ws://10.0.2.2:8096/ws/websocket';

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
  static String patientProfileById(String id) => '$baseUrl/account/patient/profile/$id';
  static const String patientAvatar = '$baseUrl/account/patient/avatar';
  static const String changePassword = '$baseUrl/account/patient/auth/password/change';
  static const String requestEmailChange = '$baseUrl/account/patient/auth/email/request-change';
  static const String verifyEmailChange = '$baseUrl/account/patient/auth/email/verify-change';
  static String doctorSchedules(String doctorId) => '$baseUrl/account/doctors/$doctorId/schedules';

  // ── Prescription Endpoints ────────────────────────────────────────────────
  static String prescriptionsByPatientId(String patientId) => '$baseUrl/prescriptions/patient/$patientId';

  // Booking / Doctor Directory Endpoints
  static const String doctorSearch      = '$baseUrl/account/doctors/search';
  static const String doctorSpecialties = '$baseUrl/account/doctors/specialties';
  static const String availableSlots    = '$baseUrl/appointments/available-slots';
  static const String holdSlot          = '$baseUrl/appointments/hold-slot';
  static const String appointments      = '$baseUrl/appointments';
  static String patientAppointmentsPage(String patientId) => '$appointments/patient/$patientId/page';
  static const String createAppointmentPayPalOrder = '$baseUrl/payment/appointments/paypal/create';
  static const String captureAppointmentPayPalPayment = '$baseUrl/payment/appointments/paypal/capture';
  static String cancelAppointment(int appointmentId) => '$appointments/$appointmentId/cancel';
  static String rescheduleAppointment(int appointmentId) => '$appointments/$appointmentId/reschedule';
  static String releaseHold(int holdId) => '$baseUrl/appointments/hold-slot/$holdId';
  static String doctorPublicProfile(String doctorId) => '$baseUrl/account/doctors/public/$doctorId';

  //Upload medical records
  static const String healthRecordAutoDocument = '$baseUrl/health-records/documents/auto';
  static const String myHealthRecords = '$baseUrl/health-records/my';
  static String shareHealthRecord(int recordId) => '$baseUrl/health-records/$recordId/share';

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

  /// POST /api/chat/upload – Tải lên file đa phương tiện.
  static const String chatMediaUpload   = '$baseUrl/chat/upload';

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
    // Base64 data URI — dùng nguyên
    if (url.startsWith('data:')) return url;

    String finalUrl = url;

    // Nếu là đường dẫn tương đối (bắt đầu bằng /) — thêm host
    if (finalUrl.startsWith('/')) {
      final host = baseUrl.replaceAll('/api', '');
      finalUrl = '$host$finalUrl';
    }

    // Replace localhost if baseUrl uses something else (e.g., 10.0.2.2 for Android Emulator)
    if (finalUrl.contains('localhost')) {
      final baseUri = Uri.parse(baseUrl);
      finalUrl = finalUrl.replaceAll('localhost', baseUri.host);
    }

    // Mã hóa URL để xử lý ký tự Unicode và đặc biệt trong tên file
    // Uri.encodeFull giữ nguyên cấu trúc URL (://, /, ?) nhưng mã hóa ký tự không an toàn
    try {
      finalUrl = Uri.encodeFull(finalUrl);
    } catch (_) {
      // Nếu encode lỗi, dùng nguyên bản
    }

    return finalUrl;
  }
}
