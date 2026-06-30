class DoctorScheduleEntry {
  final int scheduleId;
  final int dayOfWeek; // 0=Sun, 1=Mon ... 6=Sat
  final String startTime; // "HH:mm"
  final String endTime;
  final String? consultationType;
  final int slotDuration;
  final int maxPatientsPerSlot;
  final String? location;
  final String? notes;
  final String? shift; // MORNING / AFTERNOON / EVENING

  const DoctorScheduleEntry({
    required this.scheduleId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.consultationType,
    required this.slotDuration,
    required this.maxPatientsPerSlot,
    this.location,
    this.notes,
    this.shift,
  });

  factory DoctorScheduleEntry.fromJson(Map<String, dynamic> j) => DoctorScheduleEntry(
        scheduleId: j['scheduleId'] as int? ?? 0,
        dayOfWeek: j['dayOfWeek'] as int? ?? 0,
        startTime: _hm(j['startTime']),
        endTime: _hm(j['endTime']),
        consultationType: j['consultationType'] as String?,
        slotDuration: j['slotDuration'] as int? ?? 30,
        maxPatientsPerSlot: j['maxPatientsPerSlot'] as int? ?? 1,
        location: j['location'] as String?,
        notes: j['notes'] as String?,
        shift: j['shift'] as String?,
      );

  static String _hm(dynamic v) {
    if (v == null) return '00:00';
    final parts = v.toString().split(':');
    return '${parts[0].padLeft(2, '0')}:${(parts.length > 1 ? parts[1] : '00').padLeft(2, '0')}';
  }
}

class DoctorScheduleData {
  final List<DoctorScheduleEntry> schedules;
  final List<DoctorScheduleException> exceptions;

  const DoctorScheduleData({required this.schedules, required this.exceptions});

  factory DoctorScheduleData.fromJson(Map<String, dynamic> j) => DoctorScheduleData(
        schedules: (j['schedules'] as List<dynamic>? ?? [])
            .map((e) => DoctorScheduleEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
        exceptions: (j['exceptions'] as List<dynamic>? ?? [])
            .map((e) => DoctorScheduleException.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class DoctorScheduleException {
  final int exceptionId;
  final String date; // "yyyy-MM-dd"
  final String status; // WORKING / DAY_OFF / MODIFIED
  final String? startTime;
  final String? endTime;
  final String? reason;
  final bool adminCreated;

  const DoctorScheduleException({
    required this.exceptionId,
    required this.date,
    required this.status,
    this.startTime,
    this.endTime,
    this.reason,
    required this.adminCreated,
  });

  factory DoctorScheduleException.fromJson(Map<String, dynamic> j) => DoctorScheduleException(
        exceptionId: j['exceptionId'] as int? ?? 0,
        date: j['date'] as String? ?? '',
        status: j['status'] as String? ?? 'WORKING',
        startTime: j['startTime'] as String?,
        endTime: j['endTime'] as String?,
        reason: j['reason'] as String?,
        adminCreated: j['adminCreated'] as bool? ?? false,
      );
}

class CalendarDay {
  final String date;
  final String status; // WORKING / DAY_OFF / MODIFIED / no schedule
  final List<DoctorScheduleEntry> slots;

  const CalendarDay({required this.date, required this.status, required this.slots});

  factory CalendarDay.fromJson(Map<String, dynamic> j) => CalendarDay(
        date: j['date'] as String? ?? '',
        status: j['status'] as String? ?? '',
        slots: (j['slots'] as List<dynamic>? ?? [])
            .map((e) => DoctorScheduleEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ScheduleChangeRequest {
  final int requestId;
  final int appointmentId;
  final String? patientName;
  final DateTime? appointmentTime;
  final String reason;
  final String status; // PENDING / APPROVED / REJECTED
  final DateTime? createdAt;

  const ScheduleChangeRequest({
    required this.requestId,
    required this.appointmentId,
    this.patientName,
    this.appointmentTime,
    required this.reason,
    required this.status,
    this.createdAt,
  });

  factory ScheduleChangeRequest.fromJson(Map<String, dynamic> j) => ScheduleChangeRequest(
        requestId: j['requestId'] as int? ?? 0,
        appointmentId: j['appointmentId'] as int? ?? 0,
        patientName: j['patientName'] as String?,
        appointmentTime: _parseDate(j['appointmentTime']),
        reason: j['reason'] as String? ?? '',
        status: j['status'] as String? ?? 'PENDING',
        createdAt: _parseDate(j['createdAt']),
      );

  static DateTime? _parseDate(dynamic v) {
    if (v == null) return null;
    try { return DateTime.parse(v.toString()); } catch (_) { return null; }
  }
}


class ComplianceStatus {
  final String? complianceMonth;
  final int requiredHours;
  final double scheduledHours;
  final double compliancePercentage;
  final String status; // COMPLIANT | IN_PROGRESS | PENDING | NON_COMPLIANT | EXEMPTED
  final bool scheduleActive;
  final String? statusMessage;
  final ComplianceStatus? nextMonthStatus;

  const ComplianceStatus({
    this.complianceMonth,
    required this.requiredHours,
    required this.scheduledHours,
    required this.compliancePercentage,
    required this.status,
    required this.scheduleActive,
    this.statusMessage,
    this.nextMonthStatus,
  });

  factory ComplianceStatus.fromJson(Map<String, dynamic> j) => ComplianceStatus(
        complianceMonth: j['complianceMonth'] as String?,
        requiredHours: (j['requiredHours'] as num?)?.toInt() ?? 0,
        scheduledHours: (j['scheduledHours'] as num?)?.toDouble() ?? 0,
        compliancePercentage: (j['compliancePercentage'] as num?)?.toDouble() ?? 0,
        status: j['status'] as String? ?? 'PENDING',
        scheduleActive: j['scheduleActive'] as bool? ?? false,
        statusMessage: j['statusMessage'] as String?,
        nextMonthStatus: j['nextMonthStatus'] != null
            ? ComplianceStatus.fromJson(j['nextMonthStatus'] as Map<String, dynamic>)
            : null,
      );
}
