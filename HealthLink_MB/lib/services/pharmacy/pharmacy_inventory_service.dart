import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/pharmacy/pharmacy_inventory_item.dart';
import '../../models/pharmacy/pharmacy_inventory_page.dart';

class PharmacyInventoryFilter {
  final int page;
  final int size;
  final String? search;
  final String? category;
  final String? dosageForm;
  final bool? activeOnly;
  final bool? lowStock;
  final bool? expiringSoon;

  const PharmacyInventoryFilter({
    this.page = 0,
    this.size = 20,
    this.search,
    this.category,
    this.dosageForm,
    this.activeOnly,
    this.lowStock,
    this.expiringSoon,
  });

  Map<String, String> toQueryParams() {
    final params = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
    };
    if (search != null && search!.isNotEmpty) params['query'] = search!;
    if (category != null && category!.isNotEmpty) params['categoryId'] = category!;
    if (dosageForm != null && dosageForm!.isNotEmpty) params['dosageForm'] = dosageForm!;
    if (activeOnly == true) params['active'] = 'true';
    if (lowStock == true) params['lowStock'] = 'true';
    if (expiringSoon == true) params['expiringSoon'] = 'true';
    return params;
  }
}

class PharmacyInventoryImportResult {
  final int importedCount;
  final int updatedCount;
  final int skippedCount;
  final List<PharmacyInventoryRowError> rowErrors;

  const PharmacyInventoryImportResult({
    this.importedCount = 0,
    this.updatedCount = 0,
    this.skippedCount = 0,
    this.rowErrors = const [],
  });

  factory PharmacyInventoryImportResult.fromJson(Map<String, dynamic> json) {
    return PharmacyInventoryImportResult(
      importedCount: json['importedCount'] as int? ?? 0,
      updatedCount: json['updatedCount'] as int? ?? 0,
      skippedCount: json['skippedCount'] as int? ?? 0,
      rowErrors: (json['rowErrors'] as List<dynamic>?)
              ?.map((e) => PharmacyInventoryRowError.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class PharmacyInventoryRowError {
  final int rowNumber;
  final int medicineId;
  final String medicineName;
  final String message;

  const PharmacyInventoryRowError({
    this.rowNumber = 0,
    this.medicineId = 0,
    this.medicineName = '',
    this.message = '',
  });

  factory PharmacyInventoryRowError.fromJson(Map<String, dynamic> json) {
    return PharmacyInventoryRowError(
      rowNumber: json['rowNumber'] as int? ?? 0,
      medicineId: json['medicineId'] as int? ?? 0,
      medicineName: json['medicineName'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }
}

class PharmacyInventoryService {
  final http.Client _client;

  PharmacyInventoryService({http.Client? client})
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

  Future<PharmacyInventoryPage> getInventory(
    String token,
    String pharmacyId, {
    PharmacyInventoryFilter? filter,
  }) async {
    final f = filter ?? const PharmacyInventoryFilter();
    final uri = Uri.parse(ApiConfig.pharmacyInventoryPage(pharmacyId))
        .replace(queryParameters: f.toQueryParams());
    final res = await _client
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return PharmacyInventoryPage.fromJson(
          jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Failed to load inventory');
  }

  Future<PharmacyInventoryItem> getItemById(
      String token, int inventoryId) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.pharmacyInventoryItemUpdate(inventoryId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return PharmacyInventoryItem.fromJson(
          jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Failed to load inventory item');
  }

  Future<PharmacyInventoryItem> updateItem(
    String token,
    int inventoryId, {
    int? quantity,
    int? reservedQuantity,
    double? unitPrice,
    String? unit,
    String? expiryDate,
    bool? active,
  }) async {
    final body = <String, dynamic>{
      if (quantity != null) 'quantity': quantity,
      if (reservedQuantity != null) 'reservedQuantity': reservedQuantity,
      if (unitPrice != null) 'unitPrice': unitPrice,
      if (unit != null) 'unit': unit,
      if (expiryDate != null) 'expiryDate': expiryDate,
      if (active != null) 'active': active,
    };
    final res = await _client
        .patch(
          Uri.parse(ApiConfig.pharmacyInventoryItemUpdate(inventoryId)),
          headers: _authHeaders(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return PharmacyInventoryItem.fromJson(
          jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Failed to update inventory item');
  }

  Future<Uint8List> downloadTemplate(String token) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.pharmacyInventoryTemplate),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return res.bodyBytes;
    }
    throw Exception('Failed to download template');
  }

  Future<PharmacyInventoryImportResult> importCsv(
      String token, List<int> fileBytes, String fileName) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse(ApiConfig.pharmacyInventoryImport),
    );
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(http.MultipartFile.fromBytes(
      'file',
      fileBytes,
      filename: fileName,
    ));

    final streamed = await request.send().timeout(ApiConfig.connectTimeout);
    final res = await http.Response.fromStream(streamed);

    if (res.statusCode == 200) {
      return PharmacyInventoryImportResult.fromJson(
          jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Failed to import CSV');
  }
}
