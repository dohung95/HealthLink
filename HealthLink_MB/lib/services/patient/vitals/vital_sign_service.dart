import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../config/api_config.dart';

class VitalSignService {
  VitalSignService._();

  static Map<String, String> _headers(String token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  static String _parseError(http.Response response, String defaultMessage) {
    try {
      final body = json.decode(utf8.decode(response.bodyBytes));
      return body['message'] ?? defaultMessage;
    } catch (_) {
      return defaultMessage;
    }
  }

  /// GET /api/vital-signs/appointment/{appointmentId}/latest
  static Future<Map<String, dynamic>?> getLatestAppointmentVitalSign(
      String token, int appointmentId) async {
    final uri = Uri.parse(
        '${ApiConfig.baseUrl}/vital-signs/appointment/$appointmentId/latest');
    final response = await http.get(uri, headers: _headers(token));

    if (response.statusCode == 200) {
      if (response.body.trim().isEmpty) return null;
      return json.decode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    } else if (response.statusCode == 404) {
      return null;
    }
    throw Exception(
        _parseError(response, 'Failed to get latest vital signs'));
  }

  /// GET /api/vital-signs/patient/{patientId}
  static Future<List<dynamic>> getPatientVitalSigns(
      String token, String patientId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/vital-signs/patient/$patientId');
    final response = await http.get(uri, headers: _headers(token));

    if (response.statusCode == 200) {
      if (response.body.trim().isEmpty) return [];
      final decoded = json.decode(utf8.decode(response.bodyBytes));
      return decoded is List ? decoded : [];
    } else if (response.statusCode == 404) {
      return [];
    }
    throw Exception(_parseError(response, 'Failed to get patient vital signs'));
  }

  /// POST /api/vital-signs
  static Future<Map<String, dynamic>> createVitalSign(
      String token, Map<String, dynamic> payload) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/vital-signs');
    final response = await http.post(
      uri,
      headers: _headers(token),
      body: json.encode(payload),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    }
    throw Exception(_parseError(response, 'Failed to create vital sign'));
  }
}
