/// Model cho yêu cầu rút tiền (settlement) của Doctor
class Settlement {
  const Settlement({
    required this.settlementId,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.paypalEmail,
    this.notes,
    this.processedAt,
    this.adminNotes,
  });

  factory Settlement.fromJson(Map<String, dynamic> json) {
    return Settlement(
      settlementId: _toInt(json['settlementId'] ?? json['id']),
      amount: _toDouble(json['amount']),
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
      paypalEmail: json['paypalEmail']?.toString(),
      notes: json['notes']?.toString(),
      processedAt: DateTime.tryParse((json['processedAt'] ?? '').toString()),
      adminNotes: json['adminNotes']?.toString(),
    );
  }

  final int settlementId;
  final double amount;
  final String status;
  final DateTime createdAt;
  final String? paypalEmail;
  final String? notes;
  final DateTime? processedAt;
  final String? adminNotes;

  /// Status display text
  String get displayStatus {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PROCESSING':
        return 'Processing';
      case 'COMPLETED':
        return 'Completed';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  /// Check if settlement is still pending
  bool get isPending => status == 'PENDING' || status == 'PROCESSING';

  /// Check if settlement was successful
  bool get isCompleted => status == 'COMPLETED';

  /// Check if settlement failed
  bool get isFailed => status == 'REJECTED' || status == 'CANCELLED';
}

/// Paged response for settlements
class PagedSettlements {
  const PagedSettlements({
    required this.items,
    required this.page,
    required this.size,
    required this.totalPages,
    required this.totalElements,
  });

  factory PagedSettlements.fromJson(Map<String, dynamic> json) {
    final content = (json['content'] as List?) ?? [];
    return PagedSettlements(
      items: content
          .whereType<Map<String, dynamic>>()
          .map(Settlement.fromJson)
          .toList(),
      page: _toInt(json['number'] ?? json['page'] ?? 0),
      size: _toInt(json['size'] ?? 20),
      totalPages: _toInt(json['totalPages'] ?? 1),
      totalElements: _toInt(json['totalElements'] ?? content.length),
    );
  }

  factory PagedSettlements.empty() {
    return const PagedSettlements(
      items: [],
      page: 0,
      size: 20,
      totalPages: 1,
      totalElements: 0,
    );
  }

  final List<Settlement> items;
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

double _toDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0.0;
}
