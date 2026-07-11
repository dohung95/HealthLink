class DoctorScheduleEntry {
  final int scheduleId;
  final int dayOfWeek; // 0=Sun, 1=Mon ... 6=Sat
  final String startTime; // "HH:mm"
  final String endTime;
  final String? consultationType;
  final int slotDuration;
  final int maxPatients;
  final String? location;
  final String? notes;
  final String? shiftType; // MORNING / AFTERNOON / EVENING
  final String? scheduleStatus;
  final bool available;

  const DoctorScheduleEntry({
    required this.scheduleId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.consultationType,
    required this.slotDuration,
    required this.maxPatients,
    this.location,
    this.notes,
    this.shiftType,
    this.scheduleStatus,
    this.available = true,
  });

  factory DoctorScheduleEntry.fromJson(Map<String, dynamic> j) => DoctorScheduleEntry(
        scheduleId: j['scheduleId'] as int? ?? 0,
        dayOfWeek: j['dayOfWeek'] as int? ?? 0,
        startTime: _hm(j['startTime']),
        endTime: _hm(j['endTime']),
        consultationType: j['consultationType'] as String?,
        slotDuration: j['slotDuration'] as int? ?? 30,
        maxPatients: j['maxPatients'] as int? ?? 1,
        location: j['location'] as String?,
        notes: j['notes'] as String?,
        shiftType: j['shiftType'] as String?,
        scheduleStatus: j['scheduleStatus'] as String?,
        available: j['available'] as bool? ?? true,
      );

  static String _hm(dynamic v) {
    if (v == null) return '00:00';
    final parts = v.toString().split(':');
    return '${parts[0].padLeft(2, '0')}:${(parts.length > 1 ? parts[1] : '00').padLeft(2, '0')}';
  }
}

class DoctorScheduleData {
  final String? doctorId;
  final String? doctorName;
  final String doctorScheduleStatus; // APPROVED / PENDING / REJECTED
  final double totalMonthlyHours;
  final double requiredMonthlyHours;
  final bool needsScheduleReconfirmation;
  final List<DoctorScheduleEntry> schedules;
  final List<DoctorScheduleException> exceptions;

  const DoctorScheduleData({
    this.doctorId,
    this.doctorName,
    required this.doctorScheduleStatus,
    required this.totalMonthlyHours,
    required this.requiredMonthlyHours,
    required this.needsScheduleReconfirmation,
    required this.schedules,
    required this.exceptions,
  });

  factory DoctorScheduleData.fromJson(Map<String, dynamic> j) => DoctorScheduleData(
        doctorId: j['doctorId'] as String?,
        doctorName: j['doctorName'] as String?,
        doctorScheduleStatus: j['doctorScheduleStatus'] as String? ?? 'PENDING',
        totalMonthlyHours: (j['totalMonthlyHours'] as num?)?.toDouble() ?? 0,
        requiredMonthlyHours: (j['requiredMonthlyHours'] as num?)?.toDouble() ?? 80,
        needsScheduleReconfirmation: j['needsScheduleReconfirmation'] as bool? ?? false,
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
  final String exceptionDate; // "yyyy-MM-dd"
  final String exceptionType; // DayOff / Modified / AddSlot
  final String? startTime;
  final String? endTime;
  final String? reason;
  final bool recurring;
  final String? recurringUntil;
  final bool adminCreated;

  const DoctorScheduleException({
    required this.exceptionId,
    required this.exceptionDate,
    required this.exceptionType,
    this.startTime,
    this.endTime,
    this.reason,
    this.recurring = false,
    this.recurringUntil,
    required this.adminCreated,
  });

  factory DoctorScheduleException.fromJson(Map<String, dynamic> j) => DoctorScheduleException(
        exceptionId: j['exceptionId'] as int? ?? 0,
        exceptionDate: j['exceptionDate'] as String? ?? '',
        exceptionType: j['exceptionType'] as String? ?? 'DayOff',
        startTime: j['startTime'] as String?,
        endTime: j['endTime'] as String?,
        reason: j['reason'] as String?,
        recurring: j['recurring'] as bool? ?? false,
        recurringUntil: j['recurringUntil'] as String?,
        adminCreated: j['adminCreated'] as bool? ?? false,
      );
}

class ScheduleBlock {
  final String startTime;
  final String endTime;
  final String? consultationType;
  final String? shiftType;

  const ScheduleBlock({
    required this.startTime,
    required this.endTime,
    this.consultationType,
    this.shiftType,
  });

  factory ScheduleBlock.fromJson(Map<String, dynamic> j) => ScheduleBlock(
        startTime: DoctorScheduleEntry._hm(j['startTime']),
        endTime: DoctorScheduleEntry._hm(j['endTime']),
        consultationType: j['consultationType'] as String?,
        shiftType: j['shiftType'] as String?,
      );
}

class SlotInfo {
  final String startTime;
  final String endTime;
  final String status; // AVAILABLE / BOOKED / HELD
  final String? patientName;
  final int? appointmentId;
  final String? consultationType;

  const SlotInfo({
    required this.startTime,
    required this.endTime,
    required this.status,
    this.patientName,
    this.appointmentId,
    this.consultationType,
  });

  factory SlotInfo.fromJson(Map<String, dynamic> j) => SlotInfo(
        startTime: DoctorScheduleEntry._hm(j['startTime']),
        endTime: DoctorScheduleEntry._hm(j['endTime']),
        status: j['status'] as String? ?? 'AVAILABLE',
        patientName: j['patientName'] as String?,
        appointmentId: j['appointmentId'] as int?,
        consultationType: j['consultationType'] as String?,
      );
}

class CalendarDay {
  final String date;
  final String? dayName;
  final String status; // WORKING / DAY_OFF / MODIFIED / NO_SCHEDULE
  final bool hasOnline;
  final bool hasHomeVisit;
  final List<ScheduleBlock> scheduleBlocks;
  final List<SlotInfo> slots;

  const CalendarDay({
    required this.date,
    this.dayName,
    required this.status,
    this.hasOnline = false,
    this.hasHomeVisit = false,
    this.scheduleBlocks = const [],
    this.slots = const [],
  });

  factory CalendarDay.fromJson(Map<String, dynamic> j) => CalendarDay(
        date: j['date'] as String? ?? '',
        dayName: j['dayName'] as String?,
        status: j['status'] as String? ?? 'NO_SCHEDULE',
        hasOnline: j['hasOnline'] as bool? ?? false,
        hasHomeVisit: j['hasHomeVisit'] as bool? ?? false,
        scheduleBlocks: (j['scheduleBlocks'] as List<dynamic>? ?? [])
            .map((e) => ScheduleBlock.fromJson(e as Map<String, dynamic>))
            .toList(),
        slots: (j['slots'] as List<dynamic>? ?? [])
            .map((e) => SlotInfo.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  /// 'online' | 'homevisit' | 'mixed' | null — mirrors FE getVisitTypeClass().
  String? get visitTypeClass {
    if (status == 'DAY_OFF' || status == 'NO_SCHEDULE') return null;
    if (hasOnline && hasHomeVisit) return 'mixed';
    if (hasHomeVisit) return 'homevisit';
    if (hasOnline) return 'online';
    return null;
  }

  String get visitTypeLabel {
    switch (visitTypeClass) {
      case 'mixed':
        return 'Online + Home Visit';
      case 'homevisit':
        return 'Home Visit';
      case 'online':
        return 'Online';
      default:
        return '';
    }
  }
}

class ScheduleChangeRequest {
  final int requestId;
  final int appointmentId;
  final String? patientName;
  final DateTime? appointmentTime;
  final String reason;
  final String status; // PENDING / APPROVED / REJECTED
  final String? adminReason;
  final DateTime? createdAt;

  const ScheduleChangeRequest({
    required this.requestId,
    required this.appointmentId,
    this.patientName,
    this.appointmentTime,
    required this.reason,
    required this.status,
    this.adminReason,
    this.createdAt,
  });

  factory ScheduleChangeRequest.fromJson(Map<String, dynamic> j) => ScheduleChangeRequest(
        requestId: j['requestId'] as int? ?? 0,
        appointmentId: j['appointmentId'] as int? ?? 0,
        patientName: j['patientName'] as String?,
        appointmentTime: _parseDate(j['appointmentTime']),
        reason: j['reason'] as String? ?? '',
        status: j['status'] as String? ?? 'PENDING',
        adminReason: j['adminReason'] as String?,
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
