import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;

import '../../config/api_config.dart';

class HealthRecordService {
  HealthRecordService({required this.accessToken});

  final String accessToken;

  Map<String, String> get _headers => {
    'Authorization': 'Bearer $accessToken',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  static String parseError(http.Response response, String fallback) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        return (data['message'] ?? data['Message'] ?? data['title'] ?? fallback)
            .toString();
      }
    } catch (_) {}

    return fallback;
  }

  Future<PagedHealthRecords> getMyRecords({
    required String patientId,
    int page = 1,
    int size = 5,
    String sort = 'newest',
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final uri = Uri.parse(ApiConfig.myHealthRecords).replace(
      queryParameters: {
        'patientId': patientId,
        'page': '$page',
        'size': '$size',
        'sort': sort,
        if (fromDate != null) 'fromDate': _formatDate(fromDate),
        if (toDate != null) 'toDate': _formatDate(toDate),
      },
    );

    final response = await http
        .get(uri, headers: _headers)
        .timeout(ApiConfig.receiveTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not load health records.'));
    }

    final data = jsonDecode(response.body);

    if (data is! Map<String, dynamic>) {
      return PagedHealthRecords.empty();
    }

    final rawItems = (data['items'] as List?) ?? [];

    return PagedHealthRecords(
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(HealthRecordModel.fromJson)
          .toList(),
      page: _toInt(data['page'], page),
      pageSize: _toInt(data['pageSize'], size),
      totalItems: _toInt(data['totalItems'], rawItems.length),
      totalPages: _toInt(data['totalPages'], 1),
    );
  }

  Future<MedicalDocumentModel> uploadDocumentAutoRecord({
    required String patientId,
    required PlatformFile file,
    required String category,
    required String description,
    required DateTime documentDate,
  }) async {
    final uri = Uri.parse(ApiConfig.healthRecordAutoDocument).replace(
      queryParameters: {
        'patientId': patientId,
      },
    );

    final request = http.MultipartRequest('POST', uri);

    request.headers.addAll({
      'Authorization': 'Bearer $accessToken',
      'Accept': 'application/json',
    });

    request.fields['category'] = category;
    request.fields['description'] = description;
    request.fields['documentDate'] = _formatDate(documentDate);

    if (file.path != null) {
      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          file.path!,
          filename: file.name,
        ),
      );
    } else if (file.bytes != null) {
      request.files.add(
        http.MultipartFile.fromBytes(
          'file',
          file.bytes!,
          filename: file.name,
        ),
      );
    } else {
      throw Exception('Can not read selected file.');
    }

    final streamed = await request.send().timeout(ApiConfig.receiveTimeout);
    final response = await http.Response.fromStream(streamed);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(parseError(response, 'Can not upload document.'));
    }

    final data = jsonDecode(response.body);

    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid upload response.');
    }

    return MedicalDocumentModel.fromJson(data);
  }

  Future<void> deleteDocument({
    required int recordId,
    required int documentId,
    required String patientId,
  }) async {
    final uri = Uri.parse(
      '${ApiConfig.baseUrl}/health-records/$recordId/documents/$documentId',
    ).replace(
      queryParameters: {
        'patientId': patientId,
      },
    );

    final response = await http
        .delete(uri, headers: _headers)
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 204) {
      throw Exception(parseError(response, 'Can not delete document.'));
    }
  }
}

class PagedHealthRecords {
  PagedHealthRecords({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.totalItems,
    required this.totalPages,
  });

  factory PagedHealthRecords.empty() {
    return PagedHealthRecords(
      items: [],
      page: 1,
      pageSize: 5,
      totalItems: 0,
      totalPages: 1,
    );
  }

  final List<HealthRecordModel> items;
  final int page;
  final int pageSize;
  final int totalItems;
  final int totalPages;
}

class HealthRecordModel {
  HealthRecordModel({
    required this.healthRecordId,
    required this.patientId,
    required this.patientName,
    required this.title,
    required this.description,
    required this.recordType,
    required this.recordDate,
    required this.lastUpdated,
    required this.createdAt,
    required this.documents,
  });

  factory HealthRecordModel.fromJson(Map<String, dynamic> json) {
    final rawDocs = (json['documents'] as List?) ?? [];

    return HealthRecordModel(
      healthRecordId: _toInt(json['healthRecordId'], 0),
      patientId: (json['patientId'] ?? '').toString(),
      patientName: (json['patientName'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      recordType: (json['recordType'] ?? '').toString(),
      recordDate: _parseDate(json['recordDate']),
      lastUpdated: _parseDate(json['lastUpdated']),
      createdAt: _parseDate(json['createdAt']),
      documents: rawDocs
          .whereType<Map<String, dynamic>>()
          .map(MedicalDocumentModel.fromJson)
          .toList(),
    );
  }

  final int healthRecordId;
  final String patientId;
  final String patientName;
  final String title;
  final String description;
  final String recordType;
  final DateTime? recordDate;
  final DateTime? lastUpdated;
  final DateTime? createdAt;
  final List<MedicalDocumentModel> documents;

  DateTime? get displayDate => recordDate ?? createdAt ?? lastUpdated;
}

class MedicalDocumentModel {
  MedicalDocumentModel({
    required this.documentId,
    required this.healthRecordId,
    required this.documentName,
    required this.documentType,
    required this.fileLocation,
    required this.category,
    required this.description,
    required this.documentDate,
    required this.uploadedAt,
    required this.fileSize,
    required this.mimeType,
    required this.thumbnailUrl,
  });

  factory MedicalDocumentModel.fromJson(Map<String, dynamic> json) {
    return MedicalDocumentModel(
      documentId: _toInt(json['documentId'], 0),
      healthRecordId: _toInt(json['healthRecordId'], 0),
      documentName: (json['documentName'] ?? '').toString(),
      documentType: (json['documentType'] ?? '').toString(),
      fileLocation: (json['fileLocation'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      documentDate: _parseDate(json['documentDate']),
      uploadedAt: _parseDate(json['uploadedAt']),
      fileSize: _toInt(json['fileSize'], 0),
      mimeType: (json['mimeType'] ?? '').toString(),
      thumbnailUrl: (json['thumbnailUrl'] ?? '').toString(),
    );
  }

  final int documentId;
  final int healthRecordId;
  final String documentName;
  final String documentType;
  final String fileLocation;
  final String category;
  final String description;
  final DateTime? documentDate;
  final DateTime? uploadedAt;
  final int fileSize;
  final String mimeType;
  final String thumbnailUrl;

  String? get viewUrl => ApiConfig.normalizeUrl(fileLocation);
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

String _formatDate(DateTime date) {
  final y = date.year.toString().padLeft(4, '0');
  final m = date.month.toString().padLeft(2, '0');
  final d = date.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}