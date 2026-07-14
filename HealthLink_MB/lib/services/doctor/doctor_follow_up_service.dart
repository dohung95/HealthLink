import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';
import '../../models/doctor/doctor_follow_up.dart';

/// Service quản lý lịch tái khám (follow-up) phía Doctor.
/// Endpoint khớp với `useFollowUp.js` bên web — không đổi backend.
class DoctorFollowUpService {
  DoctorFollowUpService({required this.accessToken});

  final String accessToken;

  Map<String, String> get _jsonHeaders => {
        'Authorization': 'Bearer $accessToken',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

  String? _extractErrorMessage(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        return decoded['message']?.toString() ?? decoded['error']?.toString();
      }
    } catch (_) {}
    return null;
  }

  /// Lấy danh sách khung giờ khả dụng cho ngày [date] (yyyy-MM-dd).
  Future<List<FollowUpSlot>> getSlots({
    required String date,
    String? consultationType,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/doctor/appointments/follow-up/slots').replace(
      queryParameters: {
        'date': date,
        if (consultationType != null) 'consultationType': consultationType,
      },
    );

    final res = await http.get(uri, headers: _jsonHeaders).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_extractErrorMessage(res.body) ?? 'Failed to load follow-up slots.');
    }

    final data = jsonDecode(res.body);
    if (data is! Map<String, dynamic>) return const [];
    final rawSlots = data['slots'] as List? ?? const [];
    return rawSlots
        .whereType<Map>()
        .map((e) => FollowUpSlot.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Lưu (tạo/cập nhật) thông tin tái khám cho appointment [appointmentId].
  /// [followUpDate] phải ở dạng ISO (yyyy-MM-ddTHH:mm:ss).
  Future<void> saveFollowUp({
    required int appointmentId,
    required String followUpDate,
    String? followUpNotes,
    required String consultationType,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/appointments/$appointmentId/follow-up');
    final res = await http
        .put(
          uri,
          headers: _jsonHeaders,
          body: jsonEncode({
            'followUpDate': followUpDate,
            'followUpNotes': followUpNotes,
            'consultationType': consultationType,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_extractErrorMessage(res.body) ?? 'Failed to save follow-up.');
    }
  }

  /// Huỷ lựa chọn tái khám hiện tại (chưa gửi yêu cầu thanh toán).
  Future<void> cancelFollowUpSelection(int appointmentId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/appointments/$appointmentId/follow-up');
    final res = await http
        .put(
          uri,
          headers: _jsonHeaders,
          body: jsonEncode({'followUpDate': null, 'followUpNotes': null}),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_extractErrorMessage(res.body) ?? 'Failed to cancel follow-up.');
    }
  }

  /// Gửi yêu cầu thanh toán tái khám tới bệnh nhân.
  Future<void> sendPaymentRequest(int appointmentId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/follow-up/$appointmentId/send-payment-request');
    final res = await http.post(uri, headers: _jsonHeaders).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_extractErrorMessage(res.body) ?? 'Failed to send payment request.');
    }
  }

  /// Huỷ yêu cầu thanh toán đang chờ bệnh nhân xác nhận.
  Future<void> denyFollowUp(int appointmentId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/follow-up/$appointmentId/deny');
    final res = await http.post(uri, headers: _jsonHeaders).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_extractErrorMessage(res.body) ?? 'Failed to cancel payment request.');
    }
  }

  /// Lấy trạng thái thanh toán tái khám hiện tại.
  Future<FollowUpStatus> getStatus(int appointmentId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/follow-up/$appointmentId/status');
    final res = await http.get(uri, headers: _jsonHeaders).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_extractErrorMessage(res.body) ?? 'Failed to load follow-up status.');
    }

    final data = jsonDecode(res.body);
    if (data is! Map<String, dynamic>) {
      return FollowUpStatus(status: 'NONE');
    }
    return FollowUpStatus.fromJson(data);
  }
}
