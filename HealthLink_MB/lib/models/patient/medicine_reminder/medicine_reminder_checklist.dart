/// Model cho một mục thuốc trong danh sách nhắc uống hôm nay.
class ReminderItem {
  final int prescriptionItemId;
  final String medicationName;
  final String? dosage;
  final double? quantity;
  final String? unit;
  final String? instructions;
  final bool checked;

  const ReminderItem({
    required this.prescriptionItemId,
    required this.medicationName,
    this.dosage,
    this.quantity,
    this.unit,
    this.instructions,
    required this.checked,
  });

  factory ReminderItem.fromJson(Map<String, dynamic> json) {
    return ReminderItem(
      prescriptionItemId: json['prescriptionItemId'] as int,
      medicationName: json['medicationName'] as String? ?? '',
      dosage: json['dosage'] as String?,
      quantity: (json['quantity'] as num?)?.toDouble(),
      unit: json['unit'] as String?,
      instructions: json['instructions'] as String?,
      checked: json['checked'] as bool? ?? false,
    );
  }

  /// Tạo bản sao với trạng thái checked khác
  ReminderItem copyWith({bool? checked}) {
    return ReminderItem(
      prescriptionItemId: prescriptionItemId,
      medicationName: medicationName,
      dosage: dosage,
      quantity: quantity,
      unit: unit,
      instructions: instructions,
      checked: checked ?? this.checked,
    );
  }

  /// Chuỗi mô tả tóm tắt (liều, số lượng, đơn vị, hướng dẫn)
  String get subtitle {
    final parts = <String>[];
    if (dosage != null && dosage!.isNotEmpty) parts.add(dosage!);
    if (quantity != null) {
      final qStr = quantity! % 1 == 0
          ? quantity!.toInt().toString()
          : quantity!.toString();
      parts.add('$qStr ${unit ?? ''}');
    }
    if (instructions != null && instructions!.isNotEmpty) {
      parts.add(instructions!);
    }
    return parts.join(' - ');
  }
}

/// Model cho một nhóm thuốc theo đơn thuốc (Prescription).
class ReminderPrescriptionGroup {
  final int prescriptionHeaderId;
  final String? doctorName;
  final List<ReminderItem> items;

  const ReminderPrescriptionGroup({
    required this.prescriptionHeaderId,
    this.doctorName,
    required this.items,
  });

  factory ReminderPrescriptionGroup.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return ReminderPrescriptionGroup(
      prescriptionHeaderId: json['prescriptionHeaderId'] as int,
      doctorName: json['doctorName'] as String?,
      items: rawItems
          .map((e) => ReminderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Model cho toàn bộ checklist thuốc theo một buổi (Sáng / Chiều / Tối).
class MedicineReminderChecklist {
  final String date;
  final String timing;
  final int totalCount;
  final int checkedCount;
  final bool complete;
  final List<ReminderPrescriptionGroup> prescriptions;

  const MedicineReminderChecklist({
    required this.date,
    required this.timing,
    required this.totalCount,
    required this.checkedCount,
    required this.complete,
    required this.prescriptions,
  });

  factory MedicineReminderChecklist.fromJson(Map<String, dynamic> json) {
    final rawPrescriptions = json['prescriptions'] as List<dynamic>? ?? [];
    return MedicineReminderChecklist(
      date: json['date'] as String? ?? '',
      timing: json['timing'] as String? ?? '',
      totalCount: json['totalCount'] as int? ?? 0,
      checkedCount: json['checkedCount'] as int? ?? 0,
      complete: json['complete'] as bool? ?? false,
      prescriptions: rawPrescriptions
          .map((e) =>
              ReminderPrescriptionGroup.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
