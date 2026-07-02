import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../config/api_config.dart';

class PatientReviewService {
  static const String _baseUrl = '${ApiConfig.baseUrl}/patient/reviews';

  /// Check if the patient can review a specific appointment
  static Future<bool> canReview(String token, int appointmentId) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/can-review/$appointmentId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['canReview'] ?? false;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Get an existing review by appointment ID
  static Future<Map<String, dynamic>?> getReviewByAppointment(String token, int appointmentId) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/appointment/$appointmentId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Submit a new review
  static Future<Map<String, dynamic>> submitReview({
    required String token,
    required int appointmentId,
    required int rating,
    required String comment,
    required bool isAnonymous,
  }) async {
    final response = await http.post(
      Uri.parse(_baseUrl),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: json.encode({
        'appointmentId': appointmentId,
        'rating': rating,
        'comment': comment,
        'anonymous': isAnonymous,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      final errorData = json.decode(response.body);
      throw Exception(errorData['message'] ?? 'Failed to submit review');
    }
  }
}
