/// Một khung giờ khả dụng cho lịch tái khám (follow-up).
class FollowUpSlot {
  FollowUpSlot({
    required this.startTime,
    this.endTime,
    this.status,
    this.selectable = false,
    this.label,
    this.disabledReason,
  });

  factory FollowUpSlot.fromJson(Map<String, dynamic> json) {
    return FollowUpSlot(
      startTime: (json['startTime'] ?? '').toString(),
      endTime: json['endTime']?.toString(),
      status: json['status']?.toString(),
      selectable: json['selectable'] == true,
      label: json['label']?.toString(),
      disabledReason: json['disabledReason']?.toString(),
    );
  }

  final String startTime;
  final String? endTime;
  final String? status;
  final bool selectable;
  final String? label;
  final String? disabledReason;

  String get displayLabel => label ?? startTime;
}

/// Trạng thái thanh toán/tạo lịch tái khám hiện tại của một appointment.
class FollowUpStatus {
  FollowUpStatus({
    required this.status,
    this.followUpDate,
    this.followUpNotes,
    this.consultationType,
    this.followUpAppointmentId,
  });

  factory FollowUpStatus.fromJson(Map<String, dynamic> json) {
    return FollowUpStatus(
      status: (json['status'] ?? 'NONE').toString(),
      followUpDate: DateTime.tryParse(json['followUpDate']?.toString() ?? ''),
      followUpNotes: json['followUpNotes']?.toString(),
      consultationType: json['consultationType']?.toString(),
      followUpAppointmentId: json['followUpAppointmentId'] as int?,
    );
  }

  final String status; // NONE, PENDING_PAYMENT, PAID
  final DateTime? followUpDate;
  final String? followUpNotes;
  final String? consultationType;
  final int? followUpAppointmentId;

  bool get isNone => status.toUpperCase() == 'NONE' || status.isEmpty;
  bool get isPendingPayment => status.toUpperCase() == 'PENDING_PAYMENT';
  bool get isPaid => status.toUpperCase() == 'PAID';
}
