import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/pharmacy/pharmacy_order.dart';

class PharmacyOrderService {
  PharmacyOrderService._();

  static const Map<String, String> _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  static Map<String, String> _authHeaders(String token) => {
        ..._jsonHeaders,
        'Authorization': 'Bearer $token',
      };

  static Future<List<PharmacyOrder>> getOrders(
    String token,
    String pharmacyId, {
    String? status,
    int page = 0,
    int size = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
    };
    if (status != null && status != 'ALL') {
      queryParams['status'] = status;
    }
    final uri = Uri.parse(ApiConfig.pharmacyOrdersByPharmacy(pharmacyId))
        .replace(queryParameters: queryParams);
    final res = await http
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
    throw HttpException(
        'Failed to load orders', Uri.parse(ApiConfig.pharmacyOrdersByPharmacy(pharmacyId)));
  }

  static Future<PharmacyOrder> getOrderById(String token, String orderId) async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.pharmacyOrderById(orderId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyOrder.fromJson(data);
    }
    throw HttpException(
        'Failed to load order', Uri.parse(ApiConfig.pharmacyOrderById(orderId)));
  }

  static Future<PharmacyOrder> updateOrderStatus(
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
      if (estimatedDeliveryTime != null) 'estimatedDeliveryTime': estimatedDeliveryTime,
      if (cancelReason != null) 'cancelReason': cancelReason,
    };
    final res = await http
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
    throw HttpException(
        'Failed to update order status',
        Uri.parse(ApiConfig.pharmacyOrderUpdateStatus(orderId)));
  }

  static Future<PharmacyOrder> updateOrderQuote(
    String token,
    String orderId,
    List<Map<String, dynamic>> items, {
    double? deliveryFee,
    String? estimatedDeliveryTime,
  }) async {
    final body = <String, dynamic>{
      'items': items,
      if (deliveryFee != null) 'deliveryFee': deliveryFee,
      if (estimatedDeliveryTime != null) 'estimatedDeliveryTime': estimatedDeliveryTime,
    };
    final res = await http
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
    throw HttpException(
        'Failed to update quote',
        Uri.parse(ApiConfig.pharmacyOrderUpdateQuote(orderId)));
  }
}
