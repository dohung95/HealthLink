import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';

class PharmacyRequestService {
  final http.Client _client;

  PharmacyRequestService({http.Client? client})
      : _client = client ?? http.Client();

  static const Map<String, String> _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  Map<String, String> _authHeaders(String token) => {
        ..._jsonHeaders,
        'Authorization': 'Bearer $token',
      };

  void close() => _client.close();

  Future<List<PharmacyConsultationRequest>> getRequests(
    String token,
    String pharmacyId, {
    String? status,
  }) async {
    final queryParams = <String, String>{};
    if (status != null && status != 'ALL') {
      queryParams['status'] = status;
    }
    final uri = Uri.parse(ApiConfig.pharmacyRequestsByPharmacy(pharmacyId))
        .replace(
            queryParameters:
                queryParams.isNotEmpty ? queryParams : null);
    final res = await _client
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data
            .map((e) => PharmacyConsultationRequest.fromJson(
                e as Map<String, dynamic>))
            .toList();
      } else if (data is Map<String, dynamic>) {
        final content = data['data'] as List<dynamic>? ??
            data['content'] as List<dynamic>? ??
            [];
        return content
            .map((e) => PharmacyConsultationRequest.fromJson(
                e as Map<String, dynamic>))
            .toList();
      }
      return [];
    }
    throw Exception('Failed to load requests (${res.statusCode}): ${res.body}');
  }

  Future<PharmacyConsultationRequest> getRequestById(
      String token, String requestId) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.pharmacyRequestById(requestId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyConsultationRequest.fromJson(data);
    }
    throw Exception('Failed to load request (${res.statusCode}): ${res.body}');
  }

  Future<PharmacyConsultationRequest> updateRequestStatus(
    String token,
    String requestId,
    String status, {
    String? pharmacyNotes,
  }) async {
    final body = <String, dynamic>{
      'status': status,
      if (pharmacyNotes != null) 'pharmacyNotes': pharmacyNotes,
    };
    final res = await _client
        .patch(
          Uri.parse(ApiConfig.pharmacyRequestUpdateStatus(requestId)),
          headers: _authHeaders(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyConsultationRequest.fromJson(data);
    }
    throw Exception('Failed to update request status (${res.statusCode}): ${res.body}');
  }

  Future<List<Map<String, dynamic>>> getPrescriptions(
      String token, String requestId) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.pharmacyRequestPrescriptions(requestId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data.cast<Map<String, dynamic>>();
      }
      return [];
    }
    throw Exception('Failed to load prescriptions (${res.statusCode}): ${res.body}');
  }

  Future<Map<String, dynamic>> createOrderFromRequest(
    String token,
    String requestId,
    List<Map<String, dynamic>> items, {
    String? deliveryType,
    String? deliveryAddress,
    double? deliveryFee,
    String? estimatedDeliveryTime,
    String? deliveryPhoneNumber,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'items': items,
      if (deliveryType != null) 'deliveryType': deliveryType,
      if (deliveryAddress != null) 'deliveryAddress': deliveryAddress,
      if (deliveryFee != null) 'deliveryFee': deliveryFee,
      if (estimatedDeliveryTime != null)
        'estimatedDeliveryTime': estimatedDeliveryTime,
      if (deliveryPhoneNumber != null)
        'deliveryPhoneNumber': deliveryPhoneNumber,
      if (notes != null) 'notes': notes,
    };
    final res = await _client
        .post(
          Uri.parse(ApiConfig.pharmacyRequestCreateOrder(requestId)),
          headers: _authHeaders(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to create order from request (${res.statusCode}): ${res.body}');
  }

  Future<List<PharmacyWorkItem>> getWorkItems(
      String token, String pharmacyId) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.pharmacyWorkItems(pharmacyId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data
            .map((e) =>
                PharmacyWorkItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    }
    throw Exception(
        'Failed to load work items (${res.statusCode}): ${res.body}');
  }

  Future<String?> getChatRoomId(
      String token, String requestId) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.pharmacyRequestChatRoom(requestId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['chatRoomId']?.toString() ??
          data['roomId']?.toString();
    }
    return null;
  }
}
