/// Model bệnh nhân của bác sĩ
class DoctorPatient {
  final String patientId;
  final String? fullName;
  final String? email;
  final String? phoneNumber;
  final String? avatarUrl;
  final String? gender;
  final DateTime? dateOfBirth;
  final String? bloodType;
  final DateTime? lastAppointmentTime;
  final DateTime? nextAppointmentTime;
  final int totalAppointments;
  final int completedAppointments;
  final String? latestStatus;

  const DoctorPatient({
    required this.patientId,
    this.fullName,
    this.email,
    this.phoneNumber,
    this.avatarUrl,
    this.gender,
    this.dateOfBirth,
    this.bloodType,
    this.lastAppointmentTime,
    this.nextAppointmentTime,
    this.totalAppointments = 0,
    this.completedAppointments = 0,
    this.latestStatus,
  });

  factory DoctorPatient.fromJson(Map<String, dynamic> json) {
    return DoctorPatient(
      patientId: json['patientId']?.toString() ?? json['patientID']?.toString() ?? '',
      fullName: json['fullName'] as String? ?? json['patientName'] as String?,
      email: json['email'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      gender: json['gender'] as String?,
      dateOfBirth: _parseDateTime(json['dateOfBirth']),
      bloodType: json['bloodType'] as String?,
      lastAppointmentTime: _parseDateTime(json['lastAppointmentTime']),
      nextAppointmentTime: _parseDateTime(json['nextAppointmentTime']),
      totalAppointments: json['totalAppointments'] as int? ?? 0,
      completedAppointments: json['completedAppointments'] as int? ?? 0,
      latestStatus: json['latestStatus'] as String?,
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

  /// Tính tuổi từ ngày sinh
  int? get age {
    if (dateOfBirth == null) return null;
    final now = DateTime.now();
    int age = now.year - dateOfBirth!.year;
    if (now.month < dateOfBirth!.month ||
        (now.month == dateOfBirth!.month && now.day < dateOfBirth!.day)) {
      age--;
    }
    return age;
  }
}

/// Response phân trang danh sách bệnh nhân
class DoctorPatientPage {
  final List<DoctorPatient> patients;
  final int totalElements;
  final int totalPages;
  final int currentPage;
  final int pageSize;
  final bool hasNext;
  final bool hasPrevious;

  const DoctorPatientPage({
    required this.patients,
    this.totalElements = 0,
    this.totalPages = 0,
    this.currentPage = 0,
    this.pageSize = 10,
    this.hasNext = false,
    this.hasPrevious = false,
  });

  factory DoctorPatientPage.fromJson(Map<String, dynamic> json) {
    final content = json['content'] as List<dynamic>? ?? json['items'] as List<dynamic>? ?? [];

    return DoctorPatientPage(
      patients: content.map((e) => DoctorPatient.fromJson(e as Map<String, dynamic>)).toList(),
      totalElements: json['totalElements'] as int? ?? json['total'] as int? ?? content.length,
      totalPages: json['totalPages'] as int? ?? 1,
      currentPage: json['number'] as int? ?? json['page'] as int? ?? 0,
      pageSize: json['size'] as int? ?? json['pageSize'] as int? ?? 10,
      hasNext: json['hasNext'] as bool? ?? !(json['last'] as bool? ?? true),
      hasPrevious: json['hasPrevious'] as bool? ?? !(json['first'] as bool? ?? true),
    );
  }
}
