import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/api_config.dart';

class AppointmentService {
  AppointmentService({required this.accessToken});

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
    } catch (_) {
      // Neu backend khong tra JSON thi dung fallback.
    }

    return fallback;
  }

  Future<PagedAppointments> getPatientAppointmentsPage({
    required String patientId,
    int page = 1,
    int size = 5,
  }) async {
    final uri = Uri.parse(ApiConfig.patientAppointmentsPage(patientId)).replace(
      queryParameters: {
        'page': '$page',
        'size': '$size',
      },
    );

    final response = await http
        .get(uri, headers: _headers)
        .timeout(
      ApiConfig.receiveTimeout,
      onTimeout: () {
        throw Exception('Request timed out. Please check backend connection.');
      },
    );

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Unable to load appointments.'));
    }

    final data = jsonDecode(response.body);

    if (data is! Map<String, dynamic>) {
      return PagedAppointments.empty();
    }

    final rawItems = (data['items'] as List?) ?? [];

    return PagedAppointments(
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(PatientAppointment.fromJson)
          .toList(),
      page: _toInt(data['page'], page),
      pageSize: _toInt(data['pageSize'], size),
      totalItems: _toInt(data['totalItems'], rawItems.length),
      totalPages: _toInt(data['totalPages'], 1),
    );
  }

  Future<void> cancelAppointment({
    required int appointmentId,
    String cancelReason = 'Patient request',
  }) async {
    final response = await http
        .put(
      Uri.parse(ApiConfig.cancelAppointment(appointmentId)),
      headers: _headers,
      body: jsonEncode({
        'cancelReason': cancelReason,
        'cancelledBy': 'Patient',
      }),
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Failed to cancel appointment.'));
    }
  }

  Future<void> rescheduleAppointment({
    required int appointmentId,
    required String newAppointmentTime,
  }) async {
    final response = await http
        .put(
      Uri.parse(ApiConfig.rescheduleAppointment(appointmentId)),
      headers: _headers,
      body: jsonEncode({
        'newAppointmentTime': newAppointmentTime,
      }),
    )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode != 200) {
      throw Exception(parseError(response, 'Failed to reschedule appointment.'));
    }
  }
}

class PagedAppointments {
  PagedAppointments({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.totalItems,
    required this.totalPages,
  });

  factory PagedAppointments.empty() {
    return PagedAppointments(
      items: [],
      page: 1,
      pageSize: 5,
      totalItems: 0,
      totalPages: 1,
    );
  }

  final List<PatientAppointment> items;
  final int page;
  final int pageSize;
  final int totalItems;
  final int totalPages;
}

class PatientAppointment {
  PatientAppointment({
    required this.appointmentId,
    required this.patientId,
    required this.patientName,
    required this.doctorId,
    required this.doctorName,
    required this.specialtyName,
    required this.consultationType,
    required this.status,
    required this.appointmentTime,
    this.consultationEndTime,
  });

  factory PatientAppointment.fromJson(Map<String, dynamic> json) {
    return PatientAppointment(
      appointmentId: _toInt(
        json['appointmentId'] ?? json['appointmentID'],
        0,
      ),
      patientId: (json['patientId'] ?? json['patientID'] ?? '').toString(),
      patientName: (json['patientName'] ?? 'Unknown Patient').toString(),
      doctorId: (json['doctorId'] ?? json['doctorID'] ?? '').toString(),
      doctorName: (json['doctorName'] ?? 'Unknown Doctor').toString(),
      specialtyName: (json['specialtyName'] ?? json['specialty'] ?? '').toString(),
      consultationType: (json['consultationType'] ?? '').toString(),
      status: (json['status'] ?? 'Unknown').toString(),
      appointmentTime: DateTime.tryParse(
        (json['appointmentTime'] ?? '').toString(),
      ) ??
          DateTime.now(),
      consultationEndTime: DateTime.tryParse(
        (json['consultationEndTime'] ?? json['endTime'] ?? '').toString(),
      ),
    );
  }

  final int appointmentId;
  final String patientId;
  final String patientName;
  final String doctorId;
  final String doctorName;
  final String specialtyName;
  final String consultationType;
  final String status;
  final DateTime appointmentTime;
  final DateTime? consultationEndTime;

  String get normalizedStatus => status.trim().toLowerCase();

  bool get isActive {
    return normalizedStatus == 'scheduled' || normalizedStatus == 'confirmed';
  }

  bool get isScheduled => isActive;

  bool get isCompleted => normalizedStatus == 'completed';

  bool get isCancelled {
    return normalizedStatus == 'cancelled' || normalizedStatus == 'canceled';
  }

  bool get isChat => consultationType.trim().toLowerCase() == 'chat';

  bool get isVideo {
    final value = consultationType.trim().toLowerCase();
    return value == 'video' || value == 'video call';
  }

  DateTime get effectiveEndTime {
    return consultationEndTime ?? appointmentTime.add(const Duration(minutes: 30));
  }

  bool isExpired(DateTime now) {
    return isActive && effectiveEndTime.isBefore(now);
  }

  String displayStatus(DateTime now) {
    if (isCancelled) return 'Cancelled';
    if (isCompleted) return 'Completed';
    if (isExpired(now)) return 'Expired';
    if (normalizedStatus == 'confirmed') return 'Confirmed';
    if (normalizedStatus == 'scheduled') return 'Scheduled';

    return status;
  }

  bool isJoinable(DateTime now) {
    final s = status.trim().toLowerCase();
    return s == 'in_consultation' || s == 'inconsultation' || s == 'in_progress';
//     return isActive &&
//         !isExpired(now) &&
//         !now.isBefore(appointmentTime) &&
//         now.isBefore(effectiveEndTime);
  }

  bool canCancel(DateTime now) {
    return isActive && !isExpired(now) && appointmentTime.isAfter(now);
  }

  bool canReschedule(DateTime now) {
    final twoHoursFromNow = now.add(const Duration(hours: 2));
    return isActive && !isExpired(now) && appointmentTime.isAfter(twoHoursFromNow);
  }
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}