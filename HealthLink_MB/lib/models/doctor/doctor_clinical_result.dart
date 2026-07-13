import 'dart:convert';

const List<String> clinicalResultCategoryOptions = [
  'Blood Test',
  'Imaging',
  'Urine Test',
  'Pathology',
  'Microbiology',
  'Other',
];

const List<String> clinicalResultFlagOptions = [
  'UNKNOWN',
  'NORMAL',
  'LOW',
  'HIGH',
  'CRITICAL',
];

const Set<String> _abnormalFlags = {'LOW', 'HIGH', 'CRITICAL'};

class ClinicalResultRow {
  ClinicalResultRow({
    this.testName = '',
    this.resultValue = '',
    this.unit = '',
    this.referenceRange = '',
    this.flag = 'UNKNOWN',
    this.confidence,
  });

  factory ClinicalResultRow.fromJson(Map<String, dynamic> json) {
    return ClinicalResultRow(
      testName: (json['testName'] ?? '').toString(),
      resultValue: (json['resultValue'] ?? '').toString(),
      unit: (json['unit'] ?? '').toString(),
      referenceRange: (json['referenceRange'] ?? '').toString(),
      flag: (json['flag'] ?? 'UNKNOWN').toString().isEmpty
          ? 'UNKNOWN'
          : json['flag'].toString(),
      confidence: json['confidence'] is num ? (json['confidence'] as num).toDouble() : null,
    );
  }

  final String testName;
  final String resultValue;
  final String unit;
  final String referenceRange;
  final String flag;
  final double? confidence;

  bool get isAbnormal => _abnormalFlags.contains(flag);

  ClinicalResultRow copyWith({
    String? testName,
    String? resultValue,
    String? unit,
    String? referenceRange,
    String? flag,
    double? confidence,
  }) {
    return ClinicalResultRow(
      testName: testName ?? this.testName,
      resultValue: resultValue ?? this.resultValue,
      unit: unit ?? this.unit,
      referenceRange: referenceRange ?? this.referenceRange,
      flag: flag ?? this.flag,
      confidence: confidence ?? this.confidence,
    );
  }

  Map<String, dynamic> toJson() => {
        'testName': testName,
        'resultValue': resultValue,
        'unit': unit,
        'referenceRange': referenceRange,
        'flag': flag,
        'confidence': confidence,
      };
}

class DoctorClinicalResult {
  DoctorClinicalResult({
    required this.documentId,
    this.healthRecordId,
    this.documentName,
    this.documentType,
    this.fileLocation,
    this.category,
    this.description,
    this.testResults,
    this.referenceRange,
    this.testStatus,
    this.documentDate,
    this.uploadedAt,
    this.appointmentId,
    this.doctorId,
    this.doctorName,
    this.sourceType,
    this.visibilityStatus,
    this.publishedAt,
    this.labFacilityName,
    this.testName,
    this.resultUnit,
    required this.clinicalStatus,
    this.structuredResultsJson,
    this.doctorAssessment,
    this.patientSummary,
    this.rows = const [],
  });

  factory DoctorClinicalResult.fromJson(Map<String, dynamic> json) {
    final rawStructured = json['structuredResultsJson']?.toString();
    List<ClinicalResultRow> parsedRows = const [];
    if (rawStructured != null && rawStructured.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawStructured);
        if (decoded is List) {
          parsedRows = decoded
              .whereType<Map>()
              .map((e) => ClinicalResultRow.fromJson(Map<String, dynamic>.from(e)))
              .toList();
        }
      } catch (_) {
        parsedRows = const [];
      }
    }

    return DoctorClinicalResult(
      documentId: _toInt(json['documentId'] ?? json['documentID'], 0),
      healthRecordId: json['healthRecordId'] != null ? _toInt(json['healthRecordId'], 0) : null,
      documentName: json['documentName']?.toString(),
      documentType: json['documentType']?.toString(),
      fileLocation: json['fileLocation']?.toString(),
      category: json['category']?.toString(),
      description: json['description']?.toString(),
      testResults: json['testResults']?.toString(),
      referenceRange: json['referenceRange']?.toString(),
      testStatus: json['testStatus']?.toString(),
      documentDate: _parseDate(json['documentDate']),
      uploadedAt: _parseDate(json['uploadedAt']),
      appointmentId: json['appointmentId'] ?? json['appointmentID'],
      doctorId: json['doctorId']?.toString(),
      doctorName: json['doctorName']?.toString(),
      sourceType: json['sourceType']?.toString(),
      visibilityStatus: json['visibilityStatus']?.toString(),
      publishedAt: _parseDate(json['publishedAt']),
      labFacilityName: json['labFacilityName']?.toString(),
      testName: json['testName']?.toString(),
      resultUnit: json['resultUnit']?.toString(),
      clinicalStatus: (json['clinicalStatus'] ?? 'DRAFT').toString(),
      structuredResultsJson: rawStructured,
      doctorAssessment: json['doctorAssessment']?.toString(),
      patientSummary: json['patientSummary']?.toString(),
      rows: parsedRows,
    );
  }

  final int documentId;
  final int? healthRecordId;
  final String? documentName;
  final String? documentType;
  final String? fileLocation;
  final String? category;
  final String? description;
  final String? testResults;
  final String? referenceRange;
  final String? testStatus;
  final DateTime? documentDate;
  final DateTime? uploadedAt;
  final int? appointmentId;
  final String? doctorId;
  final String? doctorName;
  final String? sourceType;
  final String? visibilityStatus;
  final DateTime? publishedAt;
  final String? labFacilityName;
  final String? testName;
  final String? resultUnit;
  final String clinicalStatus;
  final String? structuredResultsJson;
  final String? doctorAssessment;
  final String? patientSummary;
  final List<ClinicalResultRow> rows;

  bool get isPublished => clinicalStatus.toUpperCase() == 'PUBLISHED';
  bool get isDraft => !isPublished;
  bool get hasAttachment => fileLocation != null && fileLocation!.trim().isNotEmpty;
  bool get hasPublishableContent =>
      rows.isNotEmpty ||
      (testResults?.trim().isNotEmpty ?? false) ||
      hasAttachment ||
      (doctorAssessment?.trim().isNotEmpty ?? false);
  int get abnormalCount => rows.where((r) => r.isAbnormal).length;
  String get displayName {
    if (testName != null && testName!.trim().isNotEmpty) return testName!.trim();
    if (documentName != null && documentName!.trim().isNotEmpty) return documentName!.trim();
    return 'Clinical Result';
  }
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
