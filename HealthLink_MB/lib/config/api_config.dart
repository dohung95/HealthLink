/// Cấu hình API toàn bộ ứng dụng.
/// Thay đổi [baseUrl] theo môi trường:
///   - Android Emulator : http://10.0.2.2:8096
///   - Thiết bị thật   : http://<IP_máy_tính>:8096
///   - Production       : https://api.healthlink.com
class ApiConfig {
  ApiConfig._(); // Không cho khởi tạo

  static const String paypalClientId = 'Abj_ov73E4EuBjVPEu23yN-oPJUu-7AQMrsMaVmcCTmQI9JlkK-HJ_nd7Hy7gtxE8O68hmJbbCrKP27b';

  // ── Base URL ──────────────────────────────────────────────────────────────
  // Đặt cờ này thành true khi code được chạy bởi nhóm của bạn
  // Đặt thành false khi BẠN chạy trên máy thật của mình (kèm lệnh adb reverse)
  static const bool isTeamConfig = false;

  // true = Android Emulator (dùng 10.0.2.2)
  // false = máy thật USB (dùng 127.0.0.1 + adb reverse)
  static const bool isEmulator = true;

  static const String baseUrl = isTeamConfig
      ? 'http://192.168.120.6:8096/api'
      : isEmulator
          ? 'http://10.0.2.2:8096/api'
          : 'http://127.0.0.1:8096/api';

  static const String wsUrl = isTeamConfig
      ? 'ws://10.0.0.2:8096/ws/websocket'
      : isEmulator
          ? 'ws://10.0.2.2:8096/ws/websocket'
          : 'ws://127.0.0.1:8096/ws/websocket';

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

  // ── Doctor Schedule (self-management) ────────────────────────────────────
  static const String mySchedule = '$baseUrl/doctors/schedule';
  static String deleteSchedule(int id) => '$baseUrl/doctors/schedule/$id';
  static const String scheduleCalendar = '$baseUrl/doctors/schedule/calendar';
  static const String scheduleChangeRequests = '$baseUrl/doctors/schedule/change-requests';
  static const String complianceStatus = '$baseUrl/doctors/compliance/status';
  static const String scheduleDayOff = '$baseUrl/doctors/schedule/day-off';

  // ── Doctor Profile Endpoints ───────────────────────────────────────────────
  /// GET /api/account/doctors/profile – Lấy profile của bác sĩ đang đăng nhập.
  static const String doctorProfile = '$baseUrl/account/doctors/profile';
  static const String doctorAvatar  = '$baseUrl/account/doctors/avatar';

  // ── Doctor Auth Endpoints ────────────────────────────────────────────────
  /// POST /api/account/doctors/auth/password/request-change – Yêu cầu đổi mật khẩu (gửi OTP)
  static const String doctorRequestPasswordChange =
      '$baseUrl/account/doctors/auth/password/request-change';

  /// PUT /api/account/doctors/auth/password/change – Đổi mật khẩu với OTP
  static const String doctorChangePassword =
      '$baseUrl/account/doctors/auth/password/change';

  /// POST /api/account/doctors/auth/email/request-change – Yêu cầu đổi email (gửi OTP về email mới)
  static const String doctorRequestEmailChange =
      '$baseUrl/account/doctors/auth/email/request-change';

  /// POST /api/account/doctors/auth/email/verify-change – Xác nhận OTP và đổi email
  static const String doctorVerifyEmailChange =
      '$baseUrl/account/doctors/auth/email/verify-change';

  // ── Doctor Wallet Endpoints ──────────────────────────────────────────────
  /// GET /api/payment/partner/{doctorId}/balance?type=DOCTOR – Lấy số dư ví
  static String doctorWalletBalance(String doctorId) =>
      '$baseUrl/payment/partner/$doctorId/balance?type=DOCTOR';

  /// GET /api/payment/partner/{doctorId}/transactions – Lấy lịch sử giao dịch
  static String doctorTransactions(String doctorId) =>
      '$baseUrl/payment/partner/$doctorId/transactions';

  /// GET /api/payment/partner/{doctorId}/settlements – Lấy lịch sử rút tiền
  static String doctorSettlements(String doctorId) =>
      '$baseUrl/payment/partner/$doctorId/settlements';

  /// POST /api/payment/partner/{doctorId}/settle?type=DOCTOR – Yêu cầu rút tiền
  static String doctorSettle(String doctorId) =>
      '$baseUrl/payment/partner/$doctorId/settle?type=DOCTOR';

  // ── Prescription Endpoints ────────────────────────────────────────────────
  static String prescriptionsByPatientId(String patientId) => '$baseUrl/prescriptions/patient/$patientId';

  // ── Pharmacy Endpoints ──────────────────────────────────────────────────
  static const String pharmacyRecommendations = '$baseUrl/account/pharmacy/public/recommendations';
  static const String pharmacyRequests = '$baseUrl/pharmacy-requests';
  static String pharmacyRequestById(String id) => '$baseUrl/pharmacy-requests/$id';
  static String pharmacyRequestsByPatient(String patientId) => '$baseUrl/pharmacy-requests/patient/$patientId';
  static const String pharmacyOrders = '$baseUrl/pharmacy-orders';
  static String pharmacyOrderById(String id) => '$baseUrl/pharmacy-orders/$id';
  static String pharmacyOrdersByPatient(String patientId) => '$baseUrl/pharmacy-orders/patient/$patientId';
  static String cancelPharmacyOrder(String orderId) => '$baseUrl/pharmacy-orders/$orderId/cancel';

  // ── Medicine Store (Retail) Endpoints ───────────────────────────────────
  /// GET /api/medicines?keyword=&category=&dosageForm= – Tìm kiếm thuốc
  static const String medicines = '$baseUrl/medicines';
  /// POST /api/account/pharmacy/public/recommendations/cart – Gợi ý nhà thuốc theo giỏ hàng
  static const String retailCartRecommendations = '$baseUrl/account/pharmacy/public/recommendations/cart';
  /// POST /api/pharmacy-orders/retail – Tạo đơn bán lẻ
  static const String retailOrders = '$baseUrl/pharmacy-orders/retail';

  // ── Geocoding Endpoints ────────────────────────────────────────────────
  /// POST /api/geocoding/geocode – Chuyển địa chỉ thành tọa độ
  static const String geocode = '$baseUrl/geocoding/geocode';
  /// POST /api/geocoding/reverse – Chuyển tọa độ thành địa chỉ
  static const String reverseGeocode = '$baseUrl/geocoding/reverse';


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

  //Home Visit
  static const String homeVisitDoctorSearch = '$baseUrl/home-visit/doctors/search';
  static const String homeVisitServices = '$baseUrl/home-visit/services';
  static String homeVisitSlots(String doctorId) => '$baseUrl/home-visit/doctors/$doctorId/home-visit-slots';
  static const String homeVisitSelectSession = '$baseUrl/home-visit/select-session';
  static const String createHomeVisitPayPalOrder = '$baseUrl/payment/home-visit/paypal/create';
  static const String captureHomeVisitPayPalPayment = '$baseUrl/payment/home-visit/paypal/capture';
  static const String homeVisitScanInfo = '$baseUrl/home-visit/scan-info';
  static const String homeVisitGeocode = '$baseUrl/home-visit/geocode';

  //Upload medical records
  static const String healthRecordAutoDocument = '$baseUrl/health-records/documents/auto';
  static const String myHealthRecords = '$baseUrl/health-records/my';
  static String shareHealthRecord(int recordId) => '$baseUrl/health-records/$recordId/share';

  //Share health record
  static const String myHealthRecordShares = '$baseUrl/health-records/shares/my';
  static String revokeHealthRecordShare(int shareId) => '$baseUrl/health-records/shares/$shareId/revoke';

  // ── Chat Endpoints ────────────────────────────────────────────────────────
  /// GET /api/chat/rooms/me – Lấy danh sách phòng chat của user hiện tại.
  static const String chatRooms         = '$baseUrl/chat/rooms/me';

  /// POST /api/chat/rooms – Tạo hoặc lấy phòng chat giữa 2 user.
  static const String chatRoomCreate    = '$baseUrl/chat/rooms';

  /// GET /api/chat/rooms/{id} – Lấy thông tin một phòng chat.
  static String chatRoomById(String id) => '$baseUrl/chat/rooms/$id';

  /// GET /api/chat/rooms/{id}/messages – Lấy lịch sử tin nhắn.
  static String chatMessages(String id, {int page = 0, int size = 25}) => '$baseUrl/chat/rooms/$id/messages?page=$page&size=$size';

  /// GET /api/chat/rooms/{id}/messages/search – Tìm kiếm tin nhắn
  static String chatMessagesSearch(String id, String query) => '$baseUrl/chat/rooms/$id/messages/search?query=${Uri.encodeQueryComponent(query)}';

  /// GET /api/chat/rooms/{id}/media – Lấy tất cả tin nhắn media.
  static String chatMedia(String id) => '$baseUrl/chat/rooms/$id/media';

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

  // Notifications
  static const String notifications = '$baseUrl/notifications';
  static const String notificationUnreadCount =
      '$baseUrl/notifications/unread-count';

  // ── Pharmacy-Facing Endpoints (PHARMACY role) ──────────────────────────
  static const String pharmacyProfile = '$baseUrl/account/pharmacy/profile';
  static const String pharmacyAvatar = '$baseUrl/account/pharmacy/avatar';
  static const String pharmacyChangePassword = '$baseUrl/account/pharmacy/auth/password/change';
  static String pharmacyOrdersByPharmacy(String id) => '$baseUrl/pharmacy-orders/pharmacy/$id';
  static String pharmacyOrderUpdateStatus(String id) => '$baseUrl/pharmacy-orders/$id/status';
  static String pharmacyOrderUpdateQuote(String id) => '$baseUrl/pharmacy-orders/$id/quote';
  static String pharmacyRequestsByPharmacy(String id) => '$baseUrl/pharmacy-requests/pharmacy/$id';
  static String pharmacyRequestUpdateStatus(String id) => '$baseUrl/pharmacy-requests/$id/status';
  static String pharmacyRequestPrescriptions(String id) => '$baseUrl/pharmacy-requests/$id/prescriptions';
  static String pharmacyRequestCreateOrder(String id) => '$baseUrl/pharmacy-requests/$id/order';
  static String pharmacyWorkItems(String id) => '$baseUrl/pharmacy-work-items/pharmacy/$id';
  static String pharmacyRequestChatRoom(String id) => '$baseUrl/pharmacy-requests/$id/chat-room';

  static String markNotificationAsRead(int notificationId) =>
      '$baseUrl/notifications/$notificationId/read';

  static const String markAllNotificationsAsRead =
      '$baseUrl/notifications/mark-all-read';

  static String deleteNotification(int notificationId) =>
      '$baseUrl/notifications/$notificationId';

  // ── Medicine Reminder Endpoints ───────────────────────────────────────────
  /// GET/PUT /api/medicine-reminders/settings – Lấy và cập nhật cài đặt giờ nhắc
  static const String medicineReminderSettings =
      '$baseUrl/medicine-reminders/settings';

  /// GET /api/medicine-reminders/today?timing= – Lấy danh sách thuốc hôm nay theo buổi
  static const String medicineReminderToday =
      '$baseUrl/medicine-reminders/today';

  /// PATCH /api/medicine-reminders/intake-checks – Tích/bỏ tích một thuốc
  static const String medicineReminderIntakeCheck =
      '$baseUrl/medicine-reminders/intake-checks';

  /// PATCH /api/medicine-reminders/today/{timing}/complete – Đánh dấu đã uống hết cả buổi
  static String medicineReminderComplete(String timing) =>
      '$baseUrl/medicine-reminders/today/$timing/complete';
}
