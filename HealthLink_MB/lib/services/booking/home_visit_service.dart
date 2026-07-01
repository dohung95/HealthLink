import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';
import '../../models/booking/home_visit_doctor_option.dart';
import '../../models/booking/home_visit_extra_service.dart';
import '../../models/booking/home_visit_session_slot.dart';

class HomeVisitService {
  HomeVisitService({required this.accessToken});

  final String accessToken;

  Map<String, String> get _headers => {
    'Authorization': 'Bearer $accessToken',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  String _parseError(http.Response response, String fallback) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        return (data['message'] ?? data['Message'] ?? data['title'] ?? fallback).toString();
      }
    } catch (_) {}
    return fallback;
  }

  Future<List<HomeVisitDoctorOption>> searchDoctors({
    required double visitLatitude,
    required double visitLongitude,
    String? specialtyName,
  }) async {
    final response = await http.post(
      Uri.parse(ApiConfig.homeVisitDoctorSearch),
      headers: _headers,
      body: jsonEncode({
        'visitLatitude': visitLatitude,
        'visitLongitude': visitLongitude,
        if (specialtyName != null && specialtyName.trim().isNotEmpty)
          'specialtyName': specialtyName.trim(),
      }),
    ).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      print('HomeVisit Search Error: status=${response.statusCode}, body=${response.body}');
      throw Exception(_parseError(response, 'Can not find home visit doctors.'));
    }


    final data = jsonDecode(response.body);
    if (data is! List) return [];

    return data
        .whereType<Map<String, dynamic>>()
        .map(HomeVisitDoctorOption.fromJson)
        .where((item) => item.doctorId.isNotEmpty)
        .toList();
  }

  Future<List<HomeVisitExtraService>> getServices() async {
    final response = await http.get(
      Uri.parse(ApiConfig.homeVisitServices),
      headers: _headers,
    ).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(_parseError(response, 'Can not load home visit services.'));
    }

    final data = jsonDecode(response.body);
    if (data is! List) return [];

    return data
        .whereType<Map<String, dynamic>>()
        .map(HomeVisitExtraService.fromJson)
        .where((item) => item.serviceId != 0)
        .toList();
  }

  Future<List<HomeVisitSessionSlot>> getSlots({
    required String doctorId,
    required double visitLatitude,
    required double visitLongitude,
    required List<int> homeVisitServiceIds,
  }) async {
    final response = await http.post(
      Uri.parse(ApiConfig.homeVisitSlots(doctorId)),
      headers: _headers,
      body: jsonEncode({
        'visitLatitude': visitLatitude,
        'visitLongitude': visitLongitude,
        'homeVisitServiceIds': homeVisitServiceIds,
      }),
    ).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(_parseError(response, 'Can not load home visit slots.'));
    }

    final data = jsonDecode(response.body);
    if (data is! List) return [];

    return data
        .whereType<Map<String, dynamic>>()
        .map(HomeVisitSessionSlot.fromJson)
        .toList();
  }

  Future<String> selectSession({
    required String doctorId,
    required int scheduleId,
    required String bookingDate,
    required String startTime,
    required String endTime,
    required List<int> homeVisitServiceIds,
    required String visitAddress,
    required double visitLatitude,
    required double visitLongitude,
    required String contactPhone,
    required String reasonForHomeVisit,
    String specialNotes = '',
  }) async {
    final response = await http.post(
      Uri.parse(ApiConfig.homeVisitSelectSession),
      headers: _headers,
      body: jsonEncode({
        'doctorId': doctorId,
        'scheduleId': scheduleId,
        'bookingDate': bookingDate,
        'startTime': startTime,
        'endTime': endTime,
        'homeVisitServiceIds': homeVisitServiceIds,
        'visitAddress': visitAddress,
        'visitLatitude': visitLatitude,
        'visitLongitude': visitLongitude,
        'contactPhone': contactPhone,
        'reasonForHomeVisit': reasonForHomeVisit,
        'specialNotes': specialNotes,
      }),
    ).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(_parseError(response, 'Failed to select home visit session.'));
    }

    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      return (data['draftId'] ?? data['id'] ?? '').toString();
    }
    return '';
  }

  Future<Map<String, dynamic>> createPayPalOrder(Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse(ApiConfig.createHomeVisitPayPalOrder),
      headers: _headers,
      body: jsonEncode(payload),
    ).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(_parseError(response, 'Can not create home visit PayPal order.'));
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> capturePayPalPayment(Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse(ApiConfig.captureHomeVisitPayPalPayment),
      headers: _headers,
      body: jsonEncode(payload),
    ).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(_parseError(response, 'Home visit payment failed.'));
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}