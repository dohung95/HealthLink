/// Model lịch hẹn cho bác sĩ
class DoctorAppointment {
  final int appointmentId;
  final String? patientId;
  final String? patientName;
  final String? patientAvatar;
  final String? patientPhone;
  final String? patientEmail;
  final DateTime? appointmentTime;
  final DateTime? endTime;
  final String? consultationType; // VIDEO, AUDIO, CHAT, OFFLINE
  final String? status; // SCHEDULED, IN_CONSULTATION, COMPLETED, CANCELLED (matches HealthLink_BE Appointment.status)
  final String? symptoms;
  final String? notes;
  final double? fee;
  final String? cancelReason;
  final DateTime? createdAt;

  // Consultation info
  final DateTime? consultationStartTime;
  final DateTime? consultationEndTime;
  final String? diagnosis;
  final String? consultationNotes;

  // Follow-up info
  final DateTime? followUpDate;
  final String? followUpNotes;
  final String? followUpConsultationType;
  final int? followUpAppointmentId;

  const DoctorAppointment({
    required this.appointmentId,
    this.patientId,
    this.patientName,
    this.patientAvatar,
    this.patientPhone,
    this.patientEmail,
    this.appointmentTime,
    this.endTime,
    this.consultationType,
    this.status,
    this.symptoms,
    this.notes,
    this.fee,
    this.cancelReason,
    this.createdAt,
    this.consultationStartTime,
    this.consultationEndTime,
    this.diagnosis,
    this.consultationNotes,
    this.followUpDate,
    this.followUpNotes,
    this.followUpConsultationType,
    this.followUpAppointmentId,
  });

  factory DoctorAppointment.fromJson(Map<String, dynamic> json) {
    return DoctorAppointment(
      appointmentId: json['appointmentId'] as int? ?? json['appointmentID'] as int? ?? 0,
      patientId: json['patientId']?.toString() ?? json['patientID']?.toString(),
      patientName: json['patientName'] as String? ?? json['patient']?['fullName'] as String?,
      patientAvatar: json['patientAvatar'] as String? ?? json['patient']?['avatarUrl'] as String?,
      patientPhone: json['patientPhone'] as String? ?? json['patient']?['phoneNumber'] as String?,
      patientEmail: json['patientEmail'] as String? ?? json['patient']?['email'] as String?,
      appointmentTime: _parseDateTime(json['appointmentTime']),
      endTime: _parseDateTime(json['endTime']),
      consultationType: json['consultationType'] as String?,
      status: json['status'] as String?,
      symptoms: json['symptoms'] as String? ?? json['reason'] as String?,
      notes: json['notes'] as String?,
      fee: (json['fee'] as num?)?.toDouble(),
      cancelReason: json['cancelReason'] as String?,
      createdAt: _parseDateTime(json['createdAt']),
      consultationStartTime: _parseDateTime(json['consultationStartTime'] ?? json['consultation']?['startTime']),
      consultationEndTime: _parseDateTime(json['consultationEndTime'] ?? json['consultation']?['endTime']),
      diagnosis: json['diagnosis'] as String? ?? json['consultation']?['diagnosis'] as String?,
      consultationNotes: json['consultationNotes'] as String? ?? json['consultation']?['notes'] as String?,
      followUpDate: _parseDateTime(json['followUpDate'] ?? json['consultation']?['followUpDate']),
      followUpNotes: json['followUpNotes'] as String? ?? json['consultation']?['followUpNotes'] as String?,
      followUpConsultationType: json['followUpConsultationType'] as String? ??
          json['followUpType'] as String? ??
          json['consultation']?['followUpConsultationType'] as String?,
      followUpAppointmentId: json['followUpAppointmentId'] as int? ??
          json['consultation']?['followUpAppointmentId'] as int?,
    );
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) {
      try {
        return DateTime.parse(value);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'appointmentId': appointmentId,
      'patientId': patientId,
      'patientName': patientName,
      'patientAvatar': patientAvatar,
      'appointmentTime': appointmentTime?.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'consultationType': consultationType,
      'status': status,
      'symptoms': symptoms,
      'notes': notes,
      'fee': fee,
      'cancelReason': cancelReason,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  /// Kiểm tra lịch hẹn có phải hôm nay không
  bool get isToday {
    if (appointmentTime == null) return false;
    final now = DateTime.now();
    return appointmentTime!.year == now.year &&
        appointmentTime!.month == now.month &&
        appointmentTime!.day == now.day;
  }

  /// Kiểm tra lịch hẹn đã qua chưa
  bool get isPast {
    if (appointmentTime == null) return false;
    return appointmentTime!.isBefore(DateTime.now());
  }

  /// Lấy màu theo trạng thái
  String get statusColor {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return 'blue';
      case 'IN_CONSULTATION':
        return 'orange';
      case 'COMPLETED':
        return 'green';
      case 'CANCELLED':
        return 'red';
      default:
        return 'grey';
    }
  }

  /// Lấy icon theo loại tư vấn
  String get consultationTypeIcon {
    switch (consultationType?.toUpperCase()) {
      case 'VIDEO':
        return 'videocam';
      case 'AUDIO':
        return 'call';
      case 'CHAT':
        return 'chat';
      case 'OFFLINE':
        return 'person';
      default:
        return 'event';
    }
  }
}

/// Response cho danh sách lịch hẹn hàng ngày
class DoctorDailyAppointments {
  final DateTime date;
  final List<DoctorAppointment> appointments;
  final int totalCount;
  final int completedCount;
  final int pendingCount;

  const DoctorDailyAppointments({
    required this.date,
    required this.appointments,
    this.totalCount = 0,
    this.completedCount = 0,
    this.pendingCount = 0,
  });

  factory DoctorDailyAppointments.fromJson(Map<String, dynamic> json) {
    final appointmentsList = (json['appointments'] as List<dynamic>?)
            ?.map((e) => DoctorAppointment.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    // Parse counts from backend response
    final counts = json['counts'] as Map<String, dynamic>?;
    final totalCount = counts?['all'] as int? ??
        json['totalCount'] as int? ??
        appointmentsList.length;
    final completedCount =
        counts?['completed'] as int? ?? json['completedCount'] as int? ?? 0;
    final pendingCount = counts?['scheduled'] as int? ??
        counts?['inprogress'] as int? ??
        json['pendingCount'] as int? ??
        0;

    return DoctorDailyAppointments(
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      appointments: appointmentsList,
      totalCount: totalCount,
      completedCount: completedCount,
      pendingCount: pendingCount,
    );
  }
}
