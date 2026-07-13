import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';

class PharmacyWorkflowService {
  final http.Client _client;

  PharmacyWorkflowService({http.Client? client})
      : _client = client ?? http.Client();

  static const Map<String, String> _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  Map<String, String> _authHeaders(String token) => {
        ..._jsonHeaders,
        'Authorization': 'Bearer $token',
      };

  Future<List<PharmacyWorkItem>> getWorkItems(
    String token,
    String pharmacyId,
  ) async {
    final uri = Uri.parse(ApiConfig.pharmacyWorkItems(pharmacyId));
    final res = await _client
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data
            .map((e) => PharmacyWorkItem.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map<String, dynamic>) {
        final content = data['content'] as List<dynamic>? ??
            data['data'] as List<dynamic>? ??
            data['items'] as List<dynamic>? ??
            [];
        return content
            .map((e) => PharmacyWorkItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    }
    throw Exception('Failed to load work items');
  }

  void close() => _client.close();
}
