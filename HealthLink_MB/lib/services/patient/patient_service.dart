import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../../config/api_config.dart';
import '../../models/patient/patient_profile.dart';

class PatientService {
  PatientService._();

  static Future<PatientProfile> getPatientProfileById(String token, String patientId) async {
    final res = await http.get(
      Uri.parse(ApiConfig.patientProfileById(patientId)),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PatientProfile.fromJson(data);
    }

    throw Exception('Failed to load patient profile.');
  }

  static Future<PatientProfile> updatePatientProfile(String token, Map<String, dynamic> data) async {
    final res = await http.put(
      Uri.parse(ApiConfig.patientProfile),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(data),
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final responseData = jsonDecode(res.body) as Map<String, dynamic>;
      return PatientProfile.fromJson(responseData);
    }

    throw Exception('Failed to update patient profile: ${res.body}');
  }

  static Future<String> uploadAvatar(String token, String filePath) async {
    final uri = Uri.parse(ApiConfig.patientAvatar);
    final request = http.MultipartRequest('POST', uri);
    request.headers['Authorization'] = 'Bearer $token';

    // Xác định MediaType dựa trên đuôi file (backend yêu cầu bắt đầu bằng "image/")
    final ext = filePath.split('.').last.toLowerCase();
    String mimeType = 'jpeg';
    if (ext == 'png') mimeType = 'png';
    else if (ext == 'gif') mimeType = 'gif';
    else if (ext == 'webp') mimeType = 'webp';

    request.files.add(await http.MultipartFile.fromPath(
      'file', 
      filePath,
      contentType: MediaType('image', mimeType),
    ));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final responseData = jsonDecode(response.body) as Map<String, dynamic>;
      return responseData['avatarUrl'] as String;
    }

    throw Exception('Failed to upload avatar: ${response.body}');
  }

  static Future<void> changePassword(String token, Map<String, dynamic> data) async {
    final res = await http.put(
      Uri.parse(ApiConfig.changePassword),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(data),
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception('Failed to change password: ${res.body}');
    }
  }

  static Future<void> requestEmailChange(String token, Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse(ApiConfig.requestEmailChange),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(data),
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception('Failed to request email change: ${res.body}');
    }
  }

  static Future<void> verifyEmailChange(String token, Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse(ApiConfig.verifyEmailChange),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(data),
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception('Failed to verify email change: ${res.body}');
    }
  }

  static Future<List<dynamic>> getPrescriptions(String token, String patientId) async {
    final res = await http.get(
      Uri.parse(ApiConfig.prescriptionsByPatientId(patientId)),
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(utf8.decode(res.bodyBytes)) as List<dynamic>;
    } else {
      throw Exception('Failed to load prescriptions: ${res.body}');
    }
  }

  static Future<int> getPrescriptionCount(String token, String patientId) async {
    final prescriptions = await getPrescriptions(token, patientId);
    return prescriptions.length;
  }

  static Future<int> getHealthRecordCount(String token, String patientId) async {
    final uri = Uri.parse(ApiConfig.myHealthRecords).replace(
      queryParameters: {
        'patientId': patientId,
        'page': '1',
        'size': '1',
      },
    );

    final res = await http.get(
      uri,
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(
      ApiConfig.receiveTimeout,
      onTimeout: () {
        throw Exception('Request timed out while loading health records.');
      },
    );

    if (res.statusCode != 200) {
      throw Exception('Failed to load health records: ${res.body}');
    }

    final data = jsonDecode(utf8.decode(res.bodyBytes));

    if (data is Map<String, dynamic>) {
      final totalItems = data['totalItems'];

      if (totalItems is int) return totalItems;
      if (totalItems is num) return totalItems.toInt();

      return int.tryParse(totalItems?.toString() ?? '') ?? 0;
    }

    return 0;
  }
}
