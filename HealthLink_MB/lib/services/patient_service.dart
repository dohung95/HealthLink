import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/patient_profile.dart';

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
}
