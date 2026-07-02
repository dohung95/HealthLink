import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_patient.dart';

/// Service xử lý các API cho Doctor
class DoctorService {
  DoctorService._();

  static const Map<String, String> _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  static Map<String, String> _authHeaders(String token) => {
        ..._jsonHeaders,
        'Authorization': 'Bearer $token',
      };

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  /// Lấy profile của bác sĩ đang đăng nhập
  static Future<DoctorProfile> getProfile(String token) async {
    final res = await http
        .get(
          Uri.parse('${ApiConfig.baseUrl}/account/doctors/profile'),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return DoctorProfile.fromJson(data);
    }

    throw Exception('Failed to load doctor profile: ${res.statusCode} - ${res.body}');
  }

  /// Cập nhật profile bác sĩ
  static Future<DoctorProfile> updateProfile(String token, Map<String, dynamic> data) async {
    final res = await http
        .put(
          Uri.parse('${ApiConfig.baseUrl}/account/doctors/profile'),
          headers: _authHeaders(token),
          body: jsonEncode(data),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final responseData = jsonDecode(res.body) as Map<String, dynamic>;
      return DoctorProfile.fromJson(responseData);
    }

    throw Exception('Failed to update profile: ${res.statusCode}');
  }

  /// Bật/tắt loại hình dịch vụ (Online / HomeVisit) mà bác sĩ nhận khám.
  /// Trả về map các field vừa cập nhật, vd: {'online': false}
  static Future<Map<String, bool>> updateServices(
    String token,
    Map<String, bool> toggles,
  ) async {
    final res = await http
        .patch(
          Uri.parse('${ApiConfig.baseUrl}/account/doctors/services'),
          headers: _authHeaders(token),
          body: jsonEncode(toggles),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data.map((key, value) => MapEntry(key, value as bool));
    }

    try {
      final data = jsonDecode(res.body);
      if (data is Map<String, dynamic>) {
        throw Exception(data['message'] ?? 'Update failed');
      }
    } catch (e) {
      if (e is Exception) rethrow;
    }
    throw Exception('Failed to update services: ${res.statusCode}');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // APPOINTMENTS
  // ══════════════════════════════════════════════════════════════════════════

  /// Lấy danh sách lịch hẹn của bác sĩ
  static Future<List<DoctorAppointment>> getAppointments(
    String token,
    String doctorId, {
    String? status,
    int page = 0,
    int size = 20,
  }) async {
    final queryParams = {
      'page': page.toString(),
      'size': size.toString(),
      if (status != null) 'status': status,
    };

    final uri = Uri.parse('${ApiConfig.baseUrl}/appointments/doctor/$doctorId')
        .replace(queryParameters: queryParams);

    final res = await http
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      // Có thể là List hoặc Page object
      if (data is List) {
        return data.map((e) => DoctorAppointment.fromJson(e as Map<String, dynamic>)).toList();
      } else if (data is Map<String, dynamic>) {
        final content = data['content'] as List<dynamic>? ?? data['items'] as List<dynamic>? ?? [];
        return content.map((e) => DoctorAppointment.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    }

    throw Exception('Failed to load appointments: ${res.statusCode}');
  }

  /// Lấy lịch hẹn hàng ngày của bác sĩ
  static Future<DoctorDailyAppointments> getDailyAppointments(
    String token,
    String doctorId, {
    DateTime? date,
    String status = 'All',
  }) async {
    final targetDate = date ?? DateTime.now();
    // Format date as yyyy-MM-dd (LocalDate format)
    final dateStr =
        '${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}';

    final uri =
        Uri.parse('${ApiConfig.baseUrl}/appointments/doctor/$doctorId/daily')
            .replace(queryParameters: {
      'date': dateStr,
      'status': status,
    });

    debugPrint('[DoctorService] Fetching daily appointments: $uri');

    final res = await http
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    debugPrint('[DoctorService] Response status: ${res.statusCode}');

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      debugPrint(
          '[DoctorService] Appointments count: ${(data['appointments'] as List?)?.length ?? 0}');

      if (data is Map<String, dynamic>) {
        return DoctorDailyAppointments.fromJson(data);
      } else if (data is List) {
        // Nếu API trả về list trực tiếp
        return DoctorDailyAppointments(
          date: targetDate,
          appointments: data
              .map((e) => DoctorAppointment.fromJson(e as Map<String, dynamic>))
              .toList(),
        );
      }
    }

    debugPrint('[DoctorService] Error response: ${res.body}');
    throw Exception('Failed to load daily appointments: ${res.statusCode}');
  }

  /// Lấy chi tiết một lịch hẹn
  static Future<DoctorAppointment> getAppointmentDetail(String token, int appointmentId) async {
    final res = await http
        .get(
          Uri.parse('${ApiConfig.baseUrl}/appointments/$appointmentId'),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return DoctorAppointment.fromJson(data);
    }

    throw Exception('Failed to load appointment detail: ${res.statusCode}');
  }

  /// Bắt đầu tư vấn
  static Future<void> startConsultation(String token, int appointmentId) async {
    final res = await http
        .put(
          Uri.parse('${ApiConfig.baseUrl}/appointments/$appointmentId/start'),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception('Failed to start consultation: ${res.statusCode}');
    }
  }

  /// Hoàn tất lịch hẹn
  static Future<void> completeAppointment(
    String token,
    int appointmentId, {
    String? diagnosis,
    String? notes,
  }) async {
    final res = await http
        .put(
          Uri.parse('${ApiConfig.baseUrl}/appointments/$appointmentId/complete'),
          headers: _authHeaders(token),
          body: jsonEncode({
            if (diagnosis != null) 'diagnosis': diagnosis,
            if (notes != null) 'notes': notes,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception('Failed to complete appointment: ${res.statusCode}');
    }
  }

  /// Cập nhật ghi chú tư vấn
  static Future<void> updateConsultationNotes(
    String token,
    int appointmentId, {
    required String diagnosis,
    required String notes,
  }) async {
    final res = await http
        .put(
          Uri.parse('${ApiConfig.baseUrl}/appointments/$appointmentId/notes'),
          headers: _authHeaders(token),
          body: jsonEncode({
            'diagnosis': diagnosis,
            'notes': notes,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception('Failed to update notes: ${res.statusCode}');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PATIENTS
  // ══════════════════════════════════════════════════════════════════════════

  /// Lấy danh sách bệnh nhân của bác sĩ
  /// [status] có thể là 'all', 'upcoming', 'recent'
  static Future<DoctorPatientPage> getPatients(
    String token, {
    String? search,
    String status = 'all',
    int page = 1,
    int pageSize = 12,
  }) async {
    final queryParams = {
      'page': page.toString(),
      'pageSize': pageSize.toString(),
      'status': status,
      if (search != null && search.isNotEmpty) 'search': search,
    };

    final uri = Uri.parse('${ApiConfig.baseUrl}/account/doctors/me/patients')
        .replace(queryParameters: queryParams);

    debugPrint('[DoctorService] Fetching patients: $uri');

    final res = await http
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    debugPrint('[DoctorService] Response status: ${res.statusCode}');

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      debugPrint('[DoctorService] Patients count: ${(data['patients'] as List?)?.length ?? 0}');
      return DoctorPatientPage.fromJson(data);
    }

    throw Exception('Failed to load patients: ${res.statusCode} - ${res.body}');
  }

  /// Lấy lịch sử khám của một bệnh nhân
  static Future<Map<String, dynamic>> getPatientHistory(
    String token,
    String patientId,
  ) async {
    final res = await http
        .get(
          Uri.parse('${ApiConfig.baseUrl}/account/doctors/me/patients/$patientId/history'),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }

    throw Exception('Failed to load patient history: ${res.statusCode}');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /// Lấy danh sách đơn thuốc của bác sĩ
  static Future<List<Map<String, dynamic>>> getPrescriptions(
    String token,
    String doctorId, {
    int page = 0,
    int size = 20,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/prescriptions/doctor/$doctorId')
        .replace(queryParameters: {
      'page': page.toString(),
      'size': size.toString(),
    });

    final res = await http
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      } else if (data is Map<String, dynamic>) {
        final content = data['content'] as List<dynamic>? ?? [];
        return content.cast<Map<String, dynamic>>();
      }
      return [];
    }

    throw Exception('Failed to load prescriptions: ${res.statusCode}');
  }

  /// Tạo đơn thuốc mới
  static Future<Map<String, dynamic>> createPrescription(
    String token,
    Map<String, dynamic> prescriptionData,
  ) async {
    final res = await http
        .post(
          Uri.parse('${ApiConfig.baseUrl}/prescriptions'),
          headers: _authHeaders(token),
          body: jsonEncode(prescriptionData),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }

    throw Exception('Failed to create prescription: ${res.statusCode}');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REVIEWS
  // ══════════════════════════════════════════════════════════════════════════

  /// Lấy danh sách đánh giá
  static Future<Map<String, dynamic>> getReviews(
    String token, {
    int page = 0,
    int size = 10,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/doctor/reviews')
        .replace(queryParameters: {
      'page': page.toString(),
      'size': size.toString(),
    });

    final res = await http
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }

    throw Exception('Failed to load reviews: ${res.statusCode}');
  }

  /// Lấy thống kê đánh giá
  static Future<Map<String, dynamic>> getReviewStats(String token) async {
    final res = await http
        .get(
          Uri.parse('${ApiConfig.baseUrl}/doctor/reviews/stats'),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }

    throw Exception('Failed to load review stats: ${res.statusCode}');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSWORD CHANGE (2-step OTP)
  // ══════════════════════════════════════════════════════════════════════════

  /// Step 1: Yêu cầu đổi mật khẩu - gửi OTP đến email
  /// Trả về message từ server (thường là "Verification code sent to your email")
  static Future<String> requestPasswordChange(String token) async {
    final res = await http
        .post(
          Uri.parse(ApiConfig.doctorRequestPasswordChange),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      // BE trả về plain text (không phải JSON) cho endpoint này, nên thử
      // decode JSON trước nhưng luôn có fallback dùng thẳng raw body.
      try {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic>) {
          return data['message']?.toString() ?? 'Verification code sent';
        }
        if (data is String && data.isNotEmpty) return data;
      } catch (_) {}
      return res.body.isNotEmpty ? res.body : 'Verification code sent';
    }

    // Parse error
    try {
      final data = jsonDecode(res.body);
      if (data is Map<String, dynamic>) {
        throw Exception(data['message'] ?? data['error'] ?? 'Request failed');
      }
    } catch (e) {
      if (e is Exception) rethrow;
    }

    throw Exception('Failed to request password change: ${res.statusCode}');
  }

  /// Step 2: Đổi mật khẩu với OTP verification
  static Future<void> changePassword(
    String token, {
    required String verificationCode,
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await http
        .put(
          Uri.parse(ApiConfig.doctorChangePassword),
          headers: _authHeaders(token),
          body: jsonEncode({
            'verificationCode': verificationCode,
            'currentPassword': currentPassword,
            'newPassword': newPassword,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return;
    }

    // Parse error
    try {
      final data = jsonDecode(res.body);
      if (data is Map<String, dynamic>) {
        throw Exception(
            data['message'] ?? data['error'] ?? 'Password change failed');
      }
    } catch (e) {
      if (e is Exception) rethrow;
    }

    throw Exception('Failed to change password: ${res.statusCode}');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL CHANGE (2-step OTP)
  // ══════════════════════════════════════════════════════════════════════════

  /// Step 1: Yêu cầu đổi email - xác minh mật khẩu, gửi OTP về email mới
  static Future<String> requestEmailChange(
    String token, {
    required String newEmail,
    required String password,
  }) async {
    final res = await http
        .post(
          Uri.parse(ApiConfig.doctorRequestEmailChange),
          headers: _authHeaders(token),
          body: jsonEncode({'newEmail': newEmail, 'password': password}),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      // BE trả về plain text (không phải JSON) cho endpoint này.
      try {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic>) {
          return data['message']?.toString() ?? 'Verification code sent';
        }
        if (data is String && data.isNotEmpty) return data;
      } catch (_) {}
      return res.body.isNotEmpty ? res.body : 'Verification code sent';
    }

    try {
      final data = jsonDecode(res.body);
      if (data is Map<String, dynamic>) {
        throw Exception(data['message'] ?? data['error'] ?? 'Request failed');
      }
    } catch (e) {
      if (e is Exception) rethrow;
    }

    throw Exception('Failed to request email change: ${res.statusCode}');
  }

  /// Step 2: Xác nhận OTP để hoàn tất đổi email
  static Future<void> verifyEmailChange(
    String token, {
    required String newEmail,
    required String verificationCode,
  }) async {
    final res = await http
        .post(
          Uri.parse(ApiConfig.doctorVerifyEmailChange),
          headers: _authHeaders(token),
          body: jsonEncode({'newEmail': newEmail, 'verificationCode': verificationCode}),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) return;

    try {
      final data = jsonDecode(res.body);
      if (data is Map<String, dynamic>) {
        throw Exception(data['message'] ?? data['error'] ?? 'Verification failed');
      }
    } catch (e) {
      if (e is Exception) rethrow;
    }

    throw Exception('Failed to verify email change: ${res.statusCode}');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD STATS
  // ══════════════════════════════════════════════════════════════════════════

  /// Lấy thống kê tổng hợp cho dashboard
  static Future<Map<String, dynamic>> getDashboardStats(
    String token,
    String doctorId,
  ) async {
    try {
      // Gọi song song nhiều API để lấy thống kê
      final results = await Future.wait([
        getDailyAppointments(token, doctorId).catchError((_) => DoctorDailyAppointments(
              date: DateTime.now(),
              appointments: [],
            )),
        getReviewStats(token).catchError((_) => <String, dynamic>{}),
      ]);

      final dailyAppointments = results[0] as DoctorDailyAppointments;
      final reviewStats = results[1] as Map<String, dynamic>;

      return {
        'todayAppointments': dailyAppointments.appointments.length,
        'completedToday': dailyAppointments.appointments
            .where((a) => a.status?.toUpperCase() == 'COMPLETED')
            .length,
        'pendingToday': dailyAppointments.appointments
            .where((a) => a.status?.toUpperCase() == 'PENDING' || a.status?.toUpperCase() == 'CONFIRMED')
            .length,
        'averageRating': reviewStats['averageRating'] ?? 0.0,
        'totalReviews': reviewStats['totalReviews'] ?? 0,
        'appointments': dailyAppointments.appointments,
      };
    } catch (e) {
      debugPrint('getDashboardStats error: $e');
      return {
        'todayAppointments': 0,
        'completedToday': 0,
        'pendingToday': 0,
        'averageRating': 0.0,
        'totalReviews': 0,
        'appointments': <DoctorAppointment>[],
      };
    }
  }

  static Future<String> uploadAvatar(String token, String filePath) async {
    final request = http.MultipartRequest('POST', Uri.parse(ApiConfig.doctorAvatar))
      ..headers['Authorization'] = 'Bearer $token'
      ..files.add(await http.MultipartFile.fromPath('file', filePath));

    final streamed = await request.send().timeout(ApiConfig.connectTimeout);
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is Map<String, dynamic>) {
        return data['avatarUrl'] as String? ?? data['url'] as String? ?? '';
      }
      return '';
    }
    throw Exception('Failed to upload avatar: ${res.statusCode}');
  }
}
