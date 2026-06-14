import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';

class PharmacyService {
  PharmacyService._();

  static Future<List<dynamic>> getRecommendations(String token, {bool? deliveryOnly, String? prescriptionHeaderId, double? lat, double? lng}) async {
    final Map<String, String> queryParams = {};
    if (deliveryOnly != null) queryParams['deliveryOnly'] = deliveryOnly.toString();
    if (prescriptionHeaderId != null) queryParams['prescriptionHeaderId'] = prescriptionHeaderId;
    if (lat != null) queryParams['lat'] = lat.toString();
    if (lng != null) queryParams['lng'] = lng.toString();

    final uri = Uri.parse(ApiConfig.pharmacyRecommendations).replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);
    
    final res = await http.get(
      uri,
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is List) return decoded;
      if (decoded is Map<String, dynamic> && decoded['data'] is List) return decoded['data'];
      return [];
    }
    throw Exception('Failed to load pharmacy recommendations: ${res.body}');
  }

  static Future<Map<String, dynamic>> createConsultationRequest(String token, Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse(ApiConfig.pharmacyRequests),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(data),
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    }
    throw Exception('Failed to create consultation request: ${res.body}');
  }

  static Future<Map<String, dynamic>> getConsultationRequestById(String token, String requestId) async {
    final res = await http.get(
      Uri.parse(ApiConfig.pharmacyRequestById(requestId)),
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    }
    throw Exception('Failed to load consultation request: ${res.body}');
  }

  static Future<List<dynamic>> getConsultationRequestsByPatient(String token, String patientId) async {
    final res = await http.get(
      Uri.parse(ApiConfig.pharmacyRequestsByPatient(patientId)),
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is List) return decoded;
      return [];
    }
    throw Exception('Failed to load consultation requests: ${res.body}');
  }

  static Future<List<dynamic>> getOrdersByPatient(String token, String patientId, {String? status}) async {
    final Map<String, String> queryParams = {};
    if (status != null && status != 'ALL') {
      queryParams['status'] = status;
    }

    final uri = Uri.parse(ApiConfig.pharmacyOrdersByPatient(patientId)).replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);
    
    final res = await http.get(
      uri,
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is List) return decoded;
      return [];
    }
    throw Exception('Failed to load orders: ${res.body}');
  }

  static Future<Map<String, dynamic>> getOrderById(String token, String orderId) async {
    final res = await http.get(
      Uri.parse(ApiConfig.pharmacyOrderById(orderId)),
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    }
    throw Exception('Failed to load order: ${res.body}');
  }

  static Future<Map<String, dynamic>> cancelOrder(String token, String orderId, String cancelReason) async {
    final res = await http.post(
      Uri.parse(ApiConfig.cancelPharmacyOrder(orderId)),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'cancelReason': cancelReason}),
    ).timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    }
    throw Exception('Failed to cancel order: ${res.body}');
  }
}
