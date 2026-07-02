import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../config/api_config.dart';
import 'health_records_service.dart';

class ShareHealthRecordService {
  ShareHealthRecordService({required this.accessToken});

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

  Future<HealthRecordShareModel> shareWithDoctor({
    required int recordId,
    required String patientId,
    required String doctorId,
    required String permissionLevel,
    DateTime? expiryDate,
    List<int>? sharedDocumentIds,
  }) async {
    final uri = Uri.parse(ApiConfig.shareHealthRecord(recordId)).replace(
      queryParameters: {
        'patientId': patientId,
      },
    );

    final response = await http
        .post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'doctorId': doctorId,
        'permissionLevel': permissionLevel,
        'expiryDate': expiryDate == null
            ? null
            : '${_formatDate(expiryDate)}T23:59:59',
        'sharedDocumentIds': sharedDocumentIds,
        'allowMerge': false,
        'appointmentId': null,
      }),
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(
        parseError(response, 'Can not share health record.'),
      );
    }

    final data = jsonDecode(response.body);

    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid share response.');
    }

    return HealthRecordShareModel.fromJson(data);
  }

  Future<PagedHealthRecordShares> getMyShares({
    required String patientId,
    int page = 1,
    int size = 5,
  }) async {
    final uri = Uri.parse(ApiConfig.myHealthRecordShares).replace(
      queryParameters: {
        'patientId': patientId,
        'page': '$page',
        'size': '$size',
      },
    );

    final response = await http
        .get(uri, headers: _headers)
        .timeout(ApiConfig.receiveTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not load shared records.'));
    }

    final data = jsonDecode(response.body);

    if (data is! Map<String, dynamic>) {
      return PagedHealthRecordShares.empty();
    }

    final rawItems = (data['items'] as List?) ?? [];

    return PagedHealthRecordShares(
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(HealthRecordShareModel.fromJson)
          .toList(),
      page: _toInt(data['page'], page),
      pageSize: _toInt(data['pageSize'], size),
      totalItems: _toInt(data['totalItems'], rawItems.length),
      totalPages: _toInt(data['totalPages'], 1),
    );
  }

  Future<HealthRecordShareModel> revokeShare({
    required int shareId,
    required String patientId,
    String revokeReason = 'Patient revoked access',
  }) async {
    final uri = Uri.parse(ApiConfig.revokeHealthRecordShare(shareId)).replace(
      queryParameters: {
        'patientId': patientId,
      },
    );

    final response = await http
        .put(
      uri,
      headers: _headers,
      body: jsonEncode({
        'revokeReason': revokeReason,
      }),
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not revoke share.'));
    }

    final data = jsonDecode(response.body);

    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid revoke response.');
    }

    return HealthRecordShareModel.fromJson(data);
  }
}

class PagedHealthRecordShares {
  PagedHealthRecordShares({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.totalItems,
    required this.totalPages,
  });

  factory PagedHealthRecordShares.empty() {
    return PagedHealthRecordShares(
      items: [],
      page: 1,
      pageSize: 5,
      totalItems: 0,
      totalPages: 1,
    );
  }

  final List<HealthRecordShareModel> items;
  final int page;
  final int pageSize;
  final int totalItems;
  final int totalPages;
}

class HealthRecordShareModel {
  HealthRecordShareModel({
    required this.shareId,
    required this.healthRecordId,
    required this.recordTitle,
    required this.patientId,
    required this.patientName,
    required this.doctorId,
    required this.doctorName,
    required this.permissionLevel,
    required this.consentGivenAt,
    required this.expiryDate,
    required this.revoked,
    required this.revokedAt,
    required this.revokeReason,
    required this.sharedDocumentIds,
    required this.documents,
    required this.appointmentId,
  });

  factory HealthRecordShareModel.fromJson(Map<String, dynamic> json) {
    final rawDocs = (json['documents'] as List?) ?? [];

    return HealthRecordShareModel(
      shareId: _toInt(json['shareId'], 0),
      healthRecordId: _toInt(json['healthRecordId'], 0),
      recordTitle: (json['recordTitle'] ?? '').toString(),
      patientId: (json['patientId'] ?? '').toString(),
      patientName: (json['patientName'] ?? '').toString(),
      doctorId: (json['doctorId'] ?? '').toString(),
      doctorName: (json['doctorName'] ?? '').toString(),
      permissionLevel: (json['permissionLevel'] ?? 'View').toString(),
      consentGivenAt: _parseDate(json['consentGivenAt']),
      expiryDate: _parseDate(json['expiryDate']),
      revoked: json['revoked'] == true,
      revokedAt: _parseDate(json['revokedAt']),
      revokeReason: (json['revokeReason'] ?? '').toString(),
      sharedDocumentIds: _parseDocumentIds(json['sharedDocumentIds']),
      documents: rawDocs
          .whereType<Map<String, dynamic>>()
          .map(MedicalDocumentModel.fromJson)
          .toList(),
      appointmentId: _toNullableInt(json['appointmentId']),
    );
  }

  final int shareId;
  final int healthRecordId;
  final String recordTitle;
  final String patientId;
  final String patientName;
  final String doctorId;
  final String doctorName;
  final String permissionLevel;
  final DateTime? consentGivenAt;
  final DateTime? expiryDate;
  final bool revoked;
  final DateTime? revokedAt;
  final String revokeReason;
  final List<int> sharedDocumentIds;
  final List<MedicalDocumentModel> documents;
  final int? appointmentId;

  bool get isEntireRecordShared => sharedDocumentIds.isEmpty;

  bool get isExpired {
    if (expiryDate == null) return false;
    return expiryDate!.isBefore(DateTime.now());
  }

  String get statusLabel {
    if (revoked) return 'Revoked';
    if (isExpired) return 'Expired';
    return 'Active';
  }
}

List<int> _parseDocumentIds(dynamic value) {
  if (value == null) return [];

  final text = value.toString().trim();

  if (text.isEmpty) return [];

  return text
      .split(',')
      .map((item) => int.tryParse(item.trim()))
      .whereType<int>()
      .toList();
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

int? _toNullableInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
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