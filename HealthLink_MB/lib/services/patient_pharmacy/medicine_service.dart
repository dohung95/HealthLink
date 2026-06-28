import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';

/// Service gọi API tìm kiếm thuốc cho tab Cửa hàng (Medicine Store).
class MedicineService {
  MedicineService._();

  /// Tìm kiếm thuốc với các bộ lọc tùy chọn.
  /// Trả về danh sách Map chứa thông tin thuốc.
  static Future<List<dynamic>> searchMedicines(
    String token, {
    String? keyword,
    String? category,
    String? dosageForm,
  }) async {
    final Map<String, String> queryParams = {};
    if (keyword != null && keyword.isNotEmpty) {
      queryParams['keyword'] = keyword;
    }
    if (category != null && category.isNotEmpty) {
      queryParams['category'] = category;
    }
    if (dosageForm != null && dosageForm.isNotEmpty) {
      queryParams['dosageForm'] = dosageForm;
    }

    final uri = Uri.parse(ApiConfig.medicines).replace(
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

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
      if (decoded is Map<String, dynamic> && decoded['data'] is List) {
        return decoded['data'];
      }
      return [];
    }
    throw Exception('Failed to search medicines: ${res.body}');
  }
}
