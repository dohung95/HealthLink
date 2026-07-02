import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/doctor/doctor_schedule.dart';

class DoctorScheduleService {
  DoctorScheduleService._();

  static Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      };

  static Future<DoctorScheduleData> getMySchedule(String token) async {
    final res = await http
        .get(Uri.parse(ApiConfig.mySchedule), headers: _headers(token))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      return DoctorScheduleData.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Failed to load schedule: ${res.statusCode}');
  }

  static Future<void> createSchedule(String token, Map<String, dynamic> data) async {
    final res = await http
        .post(Uri.parse(ApiConfig.mySchedule),
            headers: _headers(token), body: jsonEncode(data))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 200 && res.statusCode != 201) {
      final msg = _errorMsg(res.body);
      throw Exception(msg);
    }
  }

  static Future<void> deleteSchedule(String token, int scheduleId) async {
    final res = await http
        .delete(Uri.parse(ApiConfig.deleteSchedule(scheduleId)), headers: _headers(token))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 200 && res.statusCode != 204) {
      throw Exception('Failed to delete schedule: ${res.statusCode}');
    }
  }

  static Future<List<CalendarDay>> getCalendarView(
      String token, String startDate, String endDate) async {
    final uri = Uri.parse(ApiConfig.scheduleCalendar)
        .replace(queryParameters: {'startDate': startDate, 'endDate': endDate});
    final res = await http
        .get(uri, headers: _headers(token))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      final list = jsonDecode(res.body) as List<dynamic>;
      return list.map((e) => CalendarDay.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load calendar: ${res.statusCode}');
  }

  static Future<List<ScheduleChangeRequest>> getChangeRequests(String token) async {
    final res = await http
        .get(Uri.parse(ApiConfig.scheduleChangeRequests), headers: _headers(token))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      final list = jsonDecode(res.body) as List<dynamic>;
      return list.map((e) => ScheduleChangeRequest.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load change requests: ${res.statusCode}');
  }

  static Future<void> createChangeRequest(
      String token, int appointmentId, String reason) async {
    final res = await http
        .post(Uri.parse(ApiConfig.scheduleChangeRequests),
            headers: _headers(token),
            body: jsonEncode({'appointmentId': appointmentId, 'reason': reason}))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 200 && res.statusCode != 201) {
      final msg = _errorMsg(res.body);
      throw Exception(msg);
    }
  }

  /// Self-register a day off on a future date that already has a working schedule.
  static Future<void> createDayOff(
      String token, String exceptionDate, String reason) async {
    final res = await http
        .post(Uri.parse(ApiConfig.scheduleDayOff),
            headers: _headers(token),
            body: jsonEncode({'exceptionDate': exceptionDate, 'reason': reason}))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode != 200 && res.statusCode != 201) {
      final msg = _errorMsg(res.body);
      throw Exception(msg);
    }
  }

  static Future<ComplianceStatus> getComplianceStatus(String token) async {
    final res = await http
        .get(Uri.parse(ApiConfig.complianceStatus), headers: _headers(token))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      return ComplianceStatus.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Failed to load compliance: ${res.statusCode}');
  }

  static String _errorMsg(String body) {
    try {
      final d = jsonDecode(body) as Map<String, dynamic>;
      return d['message'] as String? ?? d['error'] as String? ?? body;
    } catch (_) {
      return body;
    }
  }
}
