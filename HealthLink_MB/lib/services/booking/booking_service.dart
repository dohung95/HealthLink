import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import '../../config/api_config.dart';

class BookingService {
  BookingService({required this.accessToken});

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
        return (data['message'] ?? data['Message'] ?? data['title'] ?? fallback).toString();
      }
    } catch (_) {
      // Giu nguyen fallback neu backend khong tra JSON.
    }
    return fallback;
  }

  Future<List<String>> getSpecialties() async {
    final response = await http
        .get(Uri.parse(ApiConfig.doctorSpecialties), headers: _headers)
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not load specialties.'));
    }

    final data = jsonDecode(response.body);
    if (data is! List) return [];

    return data
        .map((item) {
          if (item is Map<String, dynamic>) {
            return (item['name'] ?? item['specialtyName'] ?? item['specialty'] ?? '').toString();
          }
          return item.toString();
        })
        .where((item) => item.trim().isNotEmpty)
        .toSet()
        .toList()
      ..sort();
  }

  Future<BookingDoctor> getDoctorById(String doctorId) async {
    final response = await http
        .get(Uri.parse(ApiConfig.doctorPublicProfile(doctorId)), headers: _headers)
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not load doctor information.'));
    }

    final data = jsonDecode(response.body);
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid doctor data format.');
    }

    return BookingDoctor.fromJson(data);
  }

  Future<PagedDoctors> searchDoctors({
    String? specialty,
    String? name,
    String? location,
    int page = 1,
    int pageSize = 10,
  }) async {
    final uri = Uri.parse(ApiConfig.doctorSearch).replace(
      queryParameters: {
        'page': '$page',
        'pageSize': '$pageSize',
        if (specialty != null && specialty.trim().isNotEmpty) 'specialty': specialty.trim(),
        if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
        if (location != null && location.trim().isNotEmpty) 'location': location.trim(),
      },
    );

    final response = await http.get(uri, headers: _headers).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not load doctors.'));
    }

    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      final rawItems = (data['items'] ?? data['content'] ?? data['data'] ?? []) as List? ?? [];
      return PagedDoctors(
        items: rawItems
            .whereType<Map<String, dynamic>>()
            .map(BookingDoctor.fromJson)
            .where((doctor) => doctor.doctorId.isNotEmpty)
            .toList(),
        page: _toInt(data['page'], page),
        pageSize: _toInt(data['pageSize'] ?? data['size'], pageSize),
        totalPages: _toInt(data['totalPages'], 1),
        totalItems: _toInt(data['totalItems'] ?? data['totalElements'], rawItems.length),
      );
    }

    if (data is List) {
      final doctors = data
          .whereType<Map<String, dynamic>>()
          .map(BookingDoctor.fromJson)
          .where((doctor) => doctor.doctorId.isNotEmpty)
          .toList();
      return PagedDoctors(
        items: doctors,
        page: page,
        pageSize: pageSize,
        totalPages: 1,
        totalItems: doctors.length,
      );
    }

    return PagedDoctors.empty();
  }

  Future<AvailableSlotsResult> getAvailableSlots({
    required String doctorId,
    required String date,
    required String consultationType,
  }) async {
    final uri = Uri.parse(ApiConfig.availableSlots).replace(
      queryParameters: {
        'doctorId': doctorId,
        'date': date,
        'consultationType': consultationType,
      },
    );

    final response = await http.get(uri, headers: _headers).timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not load available slots.'));
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final rawSlots = (data['slots'] as List?) ?? [];
    return AvailableSlotsResult(
      doctorId: (data['doctorId'] ?? doctorId).toString(),
      date: (data['date'] ?? date).toString(),
      bookingWindowDays: _toInt(data['bookingWindowDays'], 30),
      slots: rawSlots.whereType<Map<String, dynamic>>().map(BookingSlot.fromJson).toList(),
    );
  }

  Future<SlotHold> holdSlot({
    required String doctorId,
    required String patientId,
    required String appointmentTime,
    required String consultationType,
  }) async {
    final response = await http
        .post(
          Uri.parse(ApiConfig.holdSlot),
          headers: _headers,
          body: jsonEncode({
            'doctorId': doctorId,
            'patientId': patientId,
            'appointmentTime': appointmentTime,
            'consultationType': consultationType,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not hold this time slot.'));
    }

    return SlotHold.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<void> releaseHold(int holdId) async {
    final response = await http
        .delete(Uri.parse(ApiConfig.releaseHold(holdId)), headers: _headers)
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode == 204 || response.statusCode == 404) return;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(parseError(response, 'Can not release this slot hold.'));
    }
  }

  Future<Map<String, dynamic>> createAppointment({
    required String patientId,
    required String doctorId,
    required String appointmentTime,
    required String consultationType,
    required String symptoms,
    String notes = '',
  }) async {
    final response = await http
        .post(
          Uri.parse(ApiConfig.appointments),
          headers: _headers,
          body: jsonEncode({
            'patientId': patientId,
            'doctorId': doctorId,
            'appointmentTime': appointmentTime,
            'consultationType': consultationType,
            'symptoms': symptoms,
            'notes': notes,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(parseError(response, 'Can not create appointment.'));
    }

    final data = jsonDecode(response.body);
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }

  Future<UploadedMedicalDocument> uploadDocumentAutoRecord({
    required String patientId,
    required PlatformFile file,
    required String category,
    required String description,
    required String documentDate,
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
    request.fields['documentDate'] = documentDate;

    if (file.path != null) {
      request.files.add(
        await http.MultipartFile.fromPath('file', file.path!),
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

    final streamedResponse =
    await request.send().timeout(ApiConfig.receiveTimeout);

    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(parseError(response, 'Can not upload document.'));
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return UploadedMedicalDocument.fromJson(data);
  }

  Future<void> shareHealthRecordWithDoctor({
    required int recordId,
    required String patientId,
    required String doctorId,
    required List<int> documentIds,
    int? appointmentId,
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
        'permissionLevel': 'View',
        'expiryDate': null,
        'sharedDocumentIds': documentIds,
        'allowMerge': true,
        'appointmentId': appointmentId,
      }),
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(parseError(response, 'Can not share document with doctor.'));
    }
  }

  Future<Map<String, dynamic>> createAppointmentPayPalOrder({
    required String patientId,
    required String doctorId,
    required String appointmentTime,
    required String consultationType,
    required String symptoms,
    String notes = '',
    String currency = 'USD',
  }) async {
    final response = await http
        .post(
      Uri.parse(ApiConfig.createAppointmentPayPalOrder),
      headers: _headers,
      body: jsonEncode({
        'patientId': patientId,
        'doctorId': doctorId,
        'appointmentTime': appointmentTime,
        'consultationType': consultationType,
        'symptoms': symptoms,
        'notes': notes,
        'currency': currency,
      }),
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not create PayPal order.'));
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> captureAppointmentPayPalPayment({
    required String orderId,
    required String patientId,
    required String doctorId,
    required String appointmentTime,
    required String consultationType,
    required String symptoms,
    String notes = '',
    String paymentMethod = 'EWallet',
    String currency = 'USD',
  }) async {
    final response = await http
        .post(
      Uri.parse(ApiConfig.captureAppointmentPayPalPayment),
      headers: _headers,
      body: jsonEncode({
        'orderId': orderId,
        'patientId': patientId,
        'doctorId': doctorId,
        'appointmentTime': appointmentTime,
        'consultationType': consultationType,
        'symptoms': symptoms,
        'notes': notes,
        'paymentMethod': paymentMethod,
        'currency': currency,
      }),
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Payment failed.'));
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<List<DoctorWorkingSchedule>> getDoctorSchedules(String doctorId) async {
    final response = await http
        .get(
      Uri.parse(ApiConfig.doctorSchedules(doctorId)),
      headers: _headers,
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Can not load doctor schedules.'));
    }

    final data = jsonDecode(response.body);

    if (data is! List) {
      return [];
    }

    return data
        .whereType<Map<String, dynamic>>()
        .map(DoctorWorkingSchedule.fromJson)
        .where((item) => item.isBookable)
        .toList();
  }
}

class PagedDoctors {
  PagedDoctors({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.totalItems,
  });

  factory PagedDoctors.empty() => PagedDoctors(
        items: const [],
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 0,
      );

  final List<BookingDoctor> items;
  final int page;
  final int pageSize;
  final int totalPages;
  final int totalItems;
}

class BookingDoctor {
  BookingDoctor({
    required this.doctorId,
    required this.fullName,
    required this.specialtyName,
    required this.yearsOfExperience,
    required this.languageSpoken,
    required this.location,
    required this.avatarUrl,
    required this.bio,
    required this.consultationFee,
    required this.averageRating,
    required this.totalReviews,
    required this.availableTypes,
  });

  factory BookingDoctor.fromJson(Map<String, dynamic> json) {
    final types = (json['availableTypes'] as List?)?.map((item) => item.toString()).toList() ?? const <String>[];
    return BookingDoctor(
      doctorId: (json['doctorId'] ?? json['doctorID'] ?? json['id'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['name'] ?? 'Unknown Doctor').toString(),
      specialtyName: (json['specialtyName'] ?? json['specialty'] ?? '').toString(),
      yearsOfExperience: _toInt(json['yearsOfExperience'], 0),
      languageSpoken: (json['languageSpoken'] ?? json['languages'] ?? '').toString(),
      location: (json['location'] ?? '').toString(),
      avatarUrl: ApiConfig.normalizeUrl((json['avatarUrl'] ?? '').toString()) ?? '',
      bio: (json['bio'] ?? json['description'] ?? '').toString(),
      consultationFee: _toDouble(json['consultationFee'] ?? json['fee'], 0),
      averageRating: _toDouble(json['averageRating'], 0),
      totalReviews: _toInt(json['totalReviews'], 0),
      availableTypes: types,
    );
  }

  final String doctorId;
  final String fullName;
  final String specialtyName;
  final int yearsOfExperience;
  final String languageSpoken;
  final String location;
  final String avatarUrl;
  final String bio;
  final double consultationFee;
  final double averageRating;
  final int totalReviews;
  final List<String> availableTypes;

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty).toList();
    if (parts.isEmpty) return 'DR';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'.toUpperCase();
  }

}

class AvailableSlotsResult {
  AvailableSlotsResult({
    required this.doctorId,
    required this.date,
    required this.bookingWindowDays,
    required this.slots,
  });

  final String doctorId;
  final String date;
  final int bookingWindowDays;
  final List<BookingSlot> slots;
}

class BookingSlot {
  BookingSlot({
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.selectable,
    this.holdId,
  });

  factory BookingSlot.fromJson(Map<String, dynamic> json) => BookingSlot(
        startTime: (json['startTime'] ?? '').toString(),
        endTime: (json['endTime'] ?? '').toString(),
        status: (json['status'] ?? '').toString(),
        selectable: json['selectable'] == true,
      );

  final String startTime;
  final String endTime;
  final String status;
  final bool selectable;
  final int? holdId;

  BookingSlot copyWith({String? status, bool? selectable, int? holdId, bool clearHold = false}) {
    return BookingSlot(
      startTime: startTime,
      endTime: endTime,
      status: status ?? this.status,
      selectable: selectable ?? this.selectable,
      holdId: clearHold ? null : holdId ?? this.holdId,
    );
  }
}

class SlotHold {
  SlotHold({required this.holdId, required this.expiresAt, required this.status});

  factory SlotHold.fromJson(Map<String, dynamic> json) => SlotHold(
        holdId: _toInt(json['holdId'], 0),
        expiresAt: (json['expiresAt'] ?? '').toString(),
        status: (json['status'] ?? '').toString(),
      );

  final int holdId;
  final String expiresAt;
  final String status;
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double _toDouble(dynamic value, double fallback) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

class UploadedMedicalDocument {
  UploadedMedicalDocument({
    required this.documentId,
    required this.healthRecordId,
    required this.documentName,
  });

  factory UploadedMedicalDocument.fromJson(Map<String, dynamic> json) {
    return UploadedMedicalDocument(
      documentId: _toInt(json['documentId'], 0),
      healthRecordId: _toInt(json['healthRecordId'], 0),
      documentName: (json['documentName'] ?? '').toString(),
    );
  }

  final int documentId;
  final int healthRecordId;
  final String documentName;
}

class DoctorWorkingSchedule {
  DoctorWorkingSchedule({
    required this.scheduleId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    required this.slotDuration,
    required this.consultationType,
    required this.available,
    required this.scheduleStatus,
  });

  factory DoctorWorkingSchedule.fromJson(Map<String, dynamic> json) {
    return DoctorWorkingSchedule(
      scheduleId: _toInt(json['scheduleId'], 0),
      dayOfWeek: _toInt(json['dayOfWeek'], 0),
      startTime: (json['startTime'] ?? '').toString(),
      endTime: (json['endTime'] ?? '').toString(),
      slotDuration: _toInt(json['slotDuration'], 30),
      consultationType: (json['consultationType'] ?? '').toString(),
      available: json['available'] == true,
      scheduleStatus: (json['scheduleStatus'] ?? '').toString(),
    );
  }

  final int scheduleId;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final int slotDuration;
  final String consultationType;
  final bool available;
  final String scheduleStatus;

  bool get isApproved {
    final normalized = scheduleStatus.trim().toUpperCase();

    // Nếu backend/database chưa có scheduleStatus thì tạm coi là APPROVED
    // để không làm mất toàn bộ lịch hiện có.
    return normalized.isEmpty || normalized == 'APPROVED';
  }

  bool get isBookable => available && isApproved;
}