/// Model cho cài đặt giờ nhắc uống thuốc của bệnh nhân.
class MedicineReminderSettings {
  /// Giờ nhắc buổi sáng, định dạng "HH:mm" (VD: "08:00")
  final String morningTime;

  /// Giờ nhắc buổi chiều, định dạng "HH:mm" (VD: "12:00")
  final String afternoonTime;

  /// Giờ nhắc buổi tối, định dạng "HH:mm" (VD: "18:00")
  final String eveningTime;

  /// Bật/tắt thông báo nhắc uống thuốc
  final bool enabled;

  const MedicineReminderSettings({
    required this.morningTime,
    required this.afternoonTime,
    required this.eveningTime,
    required this.enabled,
  });

  factory MedicineReminderSettings.fromJson(Map<String, dynamic> json) {
    return MedicineReminderSettings(
      morningTime: json['morningTime'] as String? ?? '08:00',
      afternoonTime: json['afternoonTime'] as String? ?? '12:00',
      eveningTime: json['eveningTime'] as String? ?? '18:00',
      enabled: json['enabled'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'morningTime': morningTime,
      'afternoonTime': afternoonTime,
      'eveningTime': eveningTime,
      'enabled': enabled,
    };
  }

  /// Tạo bản sao với một số trường được thay đổi
  MedicineReminderSettings copyWith({
    String? morningTime,
    String? afternoonTime,
    String? eveningTime,
    bool? enabled,
  }) {
    return MedicineReminderSettings(
      morningTime: morningTime ?? this.morningTime,
      afternoonTime: afternoonTime ?? this.afternoonTime,
      eveningTime: eveningTime ?? this.eveningTime,
      enabled: enabled ?? this.enabled,
    );
  }
}
