import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../config/api_config.dart';
import '../../../models/patient/medicine_reminder/medicine_reminder_settings.dart';
import '../../../models/patient/medicine_reminder/medicine_reminder_checklist.dart';

/// Service gọi API nhắc uống thuốc cho bệnh nhân.
class MedicineReminderService {
  final String accessToken;

  const MedicineReminderService({required this.accessToken});

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $accessToken',
      };

  /// Lấy cài đặt giờ nhắc của bệnh nhân hiện tại.
  Future<MedicineReminderSettings> getSettings() async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.medicineReminderSettings),
          headers: _headers,
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      return MedicineReminderSettings.fromJson(json);
    }
    throw Exception('Failed to load reminder settings: ${res.statusCode}');
  }

  /// Cập nhật cài đặt giờ nhắc.
  Future<MedicineReminderSettings> updateSettings(
      MedicineReminderSettings settings) async {
    final res = await http
        .put(
          Uri.parse(ApiConfig.medicineReminderSettings),
          headers: _headers,
          body: jsonEncode(settings.toJson()),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      return MedicineReminderSettings.fromJson(json);
    }
    throw Exception('Failed to update reminder settings: ${res.statusCode} ${res.body}');
  }

  /// Lấy danh sách thuốc cần uống hôm nay theo buổi.
  /// [timing]: "MORNING" | "AFTERNOON" | "EVENING"
  Future<MedicineReminderChecklist> getTodayChecklist(String timing) async {
    final uri = Uri.parse(ApiConfig.medicineReminderToday)
        .replace(queryParameters: {'timing': timing});

    final res = await http
        .get(uri, headers: _headers)
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      return MedicineReminderChecklist.fromJson(json);
    }
    throw Exception('Failed to load checklist: ${res.statusCode}');
  }

  /// Tích hoặc bỏ tích một thuốc trong danh sách.
  Future<MedicineReminderChecklist> updateIntakeCheck({
    required int prescriptionItemId,
    required String timing,
    required String intakeDate,
    required bool checked,
  }) async {
    final res = await http
        .patch(
          Uri.parse(ApiConfig.medicineReminderIntakeCheck),
          headers: _headers,
          body: jsonEncode({
            'prescriptionItemId': prescriptionItemId,
            'timing': timing,
            'intakeDate': intakeDate,
            'checked': checked,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      return MedicineReminderChecklist.fromJson(json);
    }
    throw Exception('Failed to update intake check: ${res.statusCode}');
  }

  /// Đánh dấu đã uống hết tất cả thuốc trong một buổi.
  /// [timing]: "MORNING" | "AFTERNOON" | "EVENING"
  Future<MedicineReminderChecklist> completeTiming(String timing) async {
    final res = await http
        .patch(
          Uri.parse(ApiConfig.medicineReminderComplete(timing)),
          headers: _headers,
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      return MedicineReminderChecklist.fromJson(json);
    }
    throw Exception('Failed to complete timing: ${res.statusCode}');
  }
}
