/// Model cho giao dịch hoa hồng (commission) của Doctor
class CommissionTransaction {
  const CommissionTransaction({
    required this.transactionId,
    required this.patientName,
    required this.appointmentType,
    required this.grossAmount,
    required this.commissionRate,
    required this.commissionAmount,
    required this.netAmount,
    required this.status,
    required this.createdAt,
    this.appointmentId,
    this.appointmentDate,
  });

  factory CommissionTransaction.fromJson(Map<String, dynamic> json) {
    return CommissionTransaction(
      transactionId: _toInt(json['transactionId'] ?? json['id']),
      patientName: (json['patientName'] ?? json['patient'] ?? 'Unknown').toString(),
      appointmentType: (json['appointmentType'] ?? json['type'] ?? 'CONSULTATION').toString(),
      grossAmount: _toDouble(json['grossAmount'] ?? json['amount']),
      commissionRate: _toDouble(json['commissionRate'] ?? json['rate'] ?? 0.15),
      commissionAmount: _toDouble(json['commissionAmount'] ?? json['commission']),
      netAmount: _toDouble(json['netAmount'] ?? json['net']),
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      appointmentId: _toIntNullable(json['appointmentId']),
      appointmentDate: DateTime.tryParse((json['appointmentDate'] ?? '').toString()),
    );
  }

  final int transactionId;
  final String patientName;
  final String appointmentType;
  final double grossAmount;
  final double commissionRate;
  final double commissionAmount;
  final double netAmount;
  final String status;
  final DateTime createdAt;
  final int? appointmentId;
  final DateTime? appointmentDate;

  /// Commission rate as percentage string
  String get commissionRatePercent => '${(commissionRate * 100).toStringAsFixed(0)}%';

  /// Status display text
  String get displayStatus {
    switch (status) {
      case 'COMPLETED':
        return 'Completed';
      case 'PENDING':
        return 'Pending';
      case 'ELIGIBLE':
        return 'Eligible';
      case 'WITHDRAWN':
        return 'Withdrawn';
      default:
        return status;
    }
  }

  /// Appointment type display
  String get displayType {
    switch (appointmentType.toUpperCase()) {
      case 'VIDEO':
        return 'Video Call';
      case 'AUDIO':
        return 'Voice Call';
      case 'CHAT':
        return 'Chat';
      case 'CONSULTATION':
        return 'Consultation';
      default:
        return appointmentType;
    }
  }
}

/// Paged response for transactions
class PagedTransactions {
  const PagedTransactions({
    required this.items,
    required this.page,
    required this.size,
    required this.totalPages,
    required this.totalElements,
  });

  factory PagedTransactions.fromJson(Map<String, dynamic> json) {
    final content = (json['content'] as List?) ?? [];
    return PagedTransactions(
      items: content
          .whereType<Map<String, dynamic>>()
          .map(CommissionTransaction.fromJson)
          .toList(),
      page: _toInt(json['number'] ?? json['page'] ?? 0),
      size: _toInt(json['size'] ?? 20),
      totalPages: _toInt(json['totalPages'] ?? 1),
      totalElements: _toInt(json['totalElements'] ?? content.length),
    );
  }

  factory PagedTransactions.empty() {
    return const PagedTransactions(
      items: [],
      page: 0,
      size: 20,
      totalPages: 1,
      totalElements: 0,
    );
  }

  final List<CommissionTransaction> items;
  final int page;
  final int size;
  final int totalPages;
  final int totalElements;

  bool get hasMore => page < totalPages - 1;
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

int? _toIntNullable(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

double _toDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0.0;
}
