import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/pharmacy/pharmacy_order.dart';

class PharmacyOrderService {
  final http.Client _client;

  PharmacyOrderService({http.Client? client})
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

  Future<List<PharmacyOrder>> getOrders(
    String token,
    String pharmacyId, {
    String? status,
  }) async {
    final queryParams = <String, String>{};
    if (status != null && status != 'ALL') {
      queryParams['status'] = status;
    }
    final uri = Uri.parse(ApiConfig.pharmacyOrdersByPharmacy(pharmacyId))
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    final res = await _client
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data
            .map((e) => PharmacyOrder.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map<String, dynamic>) {
        final content = data['content'] as List<dynamic>? ??
            data['data'] as List<dynamic>? ??
            data['items'] as List<dynamic>? ??
            [];
        return content
            .map((e) => PharmacyOrder.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    }
    throw Exception('Failed to load orders');
  }

  Future<PharmacyOrder> getOrderById(String token, String orderId) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.pharmacyOrderById(orderId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyOrder.fromJson(data);
    }
    throw Exception('Failed to load order');
  }

  Future<PharmacyOrder> updateOrderStatus(
    String token,
    String orderId,
    String status, {
    String? pharmacistNotes,
    String? estimatedDeliveryTime,
    String? cancelReason,
  }) async {
    final body = <String, dynamic>{
      'status': status,
      if (pharmacistNotes != null) 'pharmacistNotes': pharmacistNotes,
      if (estimatedDeliveryTime !=
          null) 'estimatedDeliveryTime': estimatedDeliveryTime,
      if (cancelReason != null) 'cancelReason': cancelReason,
    };
    final res = await _client
        .patch(
      Uri.parse(ApiConfig.pharmacyOrderUpdateStatus(orderId)),
      headers: _authHeaders(token),
      body: jsonEncode(body),
    )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyOrder.fromJson(data);
    }
    throw Exception('Failed to update order status');
  }

  Future<PharmacyOrder> updateOrderQuote(
    String token,
    String orderId,
    List<Map<String, dynamic>> items, {
    double? deliveryFee,
    int? estimatedDeliveryMinutes,
  }) async {
    final body = <String, dynamic>{
      'items': items,
      if (deliveryFee != null) 'deliveryFee': deliveryFee,
      if (estimatedDeliveryMinutes != null) 'estimatedDeliveryMinutes': estimatedDeliveryMinutes,
    };
    final res = await _client
        .put(
          Uri.parse(ApiConfig.pharmacyOrderUpdateQuote(orderId)),
          headers: _authHeaders(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyOrder.fromJson(data);
    }
    throw Exception('Failed to update quote');
  }

  Future<Map<String, dynamic>> submitDeliveryQuote(
    String token,
    String orderId, {
    double? fee,
    String? estimatedDeliveryTime,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      if (fee != null) 'deliveryFee': fee,
      if (estimatedDeliveryTime != null) 'estimatedDeliveryTime': estimatedDeliveryTime,
      if (notes != null) 'notes': notes,
    };
    final res = await _client
        .patch(
          Uri.parse(ApiConfig.pharmacyOrderDeliveryQuote(orderId)),
          headers: _authHeaders(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to submit delivery quote');
  }

  Future<Map<String, dynamic>> reviewDeliveryContact(
    String token,
    String orderId, {
    required bool approved,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'approved': approved,
      if (notes != null) 'notes': notes,
    };
    final res = await _client
        .patch(
          Uri.parse(ApiConfig.pharmacyOrderDeliveryContactReview(orderId)),
          headers: _authHeaders(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to review delivery contact');
  }
}
