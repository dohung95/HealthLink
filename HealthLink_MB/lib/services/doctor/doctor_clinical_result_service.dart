import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;

import '../../config/api_config.dart';
import '../../models/doctor/doctor_clinical_result.dart';

/// Draft form state dùng để tạo/cập nhật một clinical result (chưa publish).
class ClinicalResultDraft {
  ClinicalResultDraft({
    this.category,
    this.testName,
    this.labFacilityName,
    this.documentDate,
    this.doctorAssessment,
    this.patientSummary,
    this.rows = const [],
    this.file,
  });

  final String? category;
  final String? testName;
  final String? labFacilityName;
  final DateTime? documentDate;
  final String? doctorAssessment;
  final String? patientSummary;
  final List<ClinicalResultRow> rows;
  final PlatformFile? file;
}

/// Service gọi API Clinical Results phía Doctor (`/api/doctor/...`).
/// Không đổi backend — endpoint và hành vi khớp với `doctorClinicalResultApi.js` (web).
class DoctorClinicalResultService {
  DoctorClinicalResultService({required this.accessToken});

  final String accessToken;

  Map<String, String> get _jsonHeaders => {
        'Authorization': 'Bearer $accessToken',
        'Accept': 'application/json',
      };

  static String _parseError(http.Response response, String fallback) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        return (data['message'] ?? data['Message'] ?? data['title'] ?? fallback).toString();
      }
    } catch (_) {}
    return fallback;
  }

  Future<List<DoctorClinicalResult>> getAppointmentResults(int appointmentId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/doctor/appointments/$appointmentId/clinical-results');
    final res = await http.get(uri, headers: _jsonHeaders).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_parseError(res, 'Can not load clinical results.'));
    }

    final data = jsonDecode(res.body);
    if (data is! List) return const [];

    return data
        .whereType<Map>()
        .map((e) => DoctorClinicalResult.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<DoctorClinicalResult> createResult({
    required int appointmentId,
    required ClinicalResultDraft draft,
  }) {
    final uri = Uri.parse('${ApiConfig.baseUrl}/doctor/appointments/$appointmentId/clinical-results');
    return _submitMultipart(uri: uri, method: 'POST', draft: draft);
  }

  Future<DoctorClinicalResult> updateResult({
    required int documentId,
    required ClinicalResultDraft draft,
  }) {
    final uri = Uri.parse('${ApiConfig.baseUrl}/doctor/clinical-results/$documentId');
    return _submitMultipart(uri: uri, method: 'PUT', draft: draft);
  }

  Future<DoctorClinicalResult> publishResult(int documentId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/doctor/clinical-results/$documentId/publish');
    final res = await http.post(uri, headers: _jsonHeaders).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw Exception(_parseError(res, 'Can not publish clinical result.'));
    }

    return DoctorClinicalResult.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<void> deleteResult(int documentId) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/doctor/clinical-results/$documentId');
    final res = await http.delete(uri, headers: _jsonHeaders).timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 204) {
      throw Exception(_parseError(res, 'Can not delete clinical result.'));
    }
  }

  Future<DoctorClinicalResult> _submitMultipart({
    required Uri uri,
    required String method,
    required ClinicalResultDraft draft,
  }) async {
    final request = http.MultipartRequest(method, uri);
    request.headers.addAll({
      'Authorization': 'Bearer $accessToken',
      'Accept': 'application/json',
    });

    _addIfNotBlank(request, 'category', draft.category);
    _addIfNotBlank(request, 'testName', draft.testName);
    _addIfNotBlank(request, 'labFacilityName', draft.labFacilityName);
    _addIfNotBlank(request, 'doctorAssessment', draft.doctorAssessment);
    _addIfNotBlank(request, 'patientSummary', draft.patientSummary);

    if (draft.documentDate != null) {
      request.fields['documentDate'] = _formatDate(draft.documentDate!);
    }

    final validRows = draft.rows
        .where((r) => r.testName.trim().isNotEmpty || r.resultValue.trim().isNotEmpty)
        .toList();
    if (validRows.isNotEmpty) {
      request.fields['structuredResultsJson'] = jsonEncode(validRows.map((r) => r.toJson()).toList());
    }

    // Backend defaults clinicalStatus=DRAFT / publishNow=false khi không gửi.
    // Publish thực sự luôn qua endpoint /publish riêng (xem publishResult()).

    final file = draft.file;
    if (file != null) {
      if (file.path != null) {
        request.files.add(
          await http.MultipartFile.fromPath('file', file.path!, filename: file.name),
        );
      } else if (file.bytes != null) {
        request.files.add(
          http.MultipartFile.fromBytes('file', file.bytes!, filename: file.name),
        );
      } else {
        throw Exception('Can not read selected file.');
      }
    }

    final streamed = await request.send().timeout(ApiConfig.receiveTimeout);
    final response = await http.Response.fromStream(streamed);

    if (response.statusCode != 200) {
      throw Exception(_parseError(response, 'Can not save clinical result.'));
    }

    return DoctorClinicalResult.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  void _addIfNotBlank(http.MultipartRequest request, String key, String? value) {
    final clean = value?.trim();
    if (clean != null && clean.isNotEmpty) {
      request.fields[key] = clean;
    }
  }

  String _formatDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
