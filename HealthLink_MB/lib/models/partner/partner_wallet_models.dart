class PartnerWalletBalance {
  final String partnerId;
  final String partnerType;
  final String partnerName;
  final double pendingBalance;
  final double? totalEarnings;
  final bool eligibleForWithdrawal;
  final String? withdrawalStatus;

  const PartnerWalletBalance({
    required this.partnerId,
    required this.partnerType,
    required this.partnerName,
    required this.pendingBalance,
    this.totalEarnings,
    required this.eligibleForWithdrawal,
    this.withdrawalStatus,
  });

  double get totalBalance => pendingBalance;

  bool get canWithdraw => eligibleForWithdrawal;

  factory PartnerWalletBalance.fromJson(Map<String, dynamic> json) {
    return PartnerWalletBalance(
      partnerId: json['partnerId']?.toString() ?? '',
      partnerType: json['partnerType']?.toString() ?? '',
      partnerName: json['partnerName']?.toString() ?? '',
      pendingBalance: _toDouble(json['pendingBalance']),
      totalEarnings: _toDoubleNullable(json['totalEarnings']),
      eligibleForWithdrawal: json['eligibleForWithdrawal'] as bool? ?? false,
      withdrawalStatus: json['withdrawalStatus']?.toString(),
    );
  }
}

class PartnerTransaction {
  final int transactionId;
  final String sourceType;
  final String serviceType;
  final double grossAmount;
  final double netAmount;
  final String status;
  final DateTime createdAt;

  const PartnerTransaction({
    required this.transactionId,
    required this.sourceType,
    required this.serviceType,
    required this.grossAmount,
    required this.netAmount,
    required this.status,
    required this.createdAt,
  });

  factory PartnerTransaction.fromJson(Map<String, dynamic> json) {
    return PartnerTransaction(
      transactionId: _toInt(json['transactionId'] ?? json['id']),
      sourceType: json['sourceType']?.toString() ?? '',
      serviceType: json['serviceType']?.toString() ?? '',
      grossAmount: _toDouble(json['grossAmount']),
      netAmount: _toDouble(json['netAmount']),
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  String get displayStatus {
    switch (status) {
      case 'SETTLED':
        return 'Settled';
      case 'PENDING':
        return 'Pending';
      case 'REFUNDED':
        return 'Refunded';
      default:
        return status;
    }
  }
}

class PartnerSettlement {
  final int settlementId;
  final String settlementNumber;
  final double grossAmount;
  final double netAmount;
  final String status;
  final String? paypalEmail;
  final DateTime createdAt;
  final DateTime? processedAt;
  final String? notes;

  const PartnerSettlement({
    required this.settlementId,
    required this.settlementNumber,
    required this.grossAmount,
    required this.netAmount,
    required this.status,
    this.paypalEmail,
    required this.createdAt,
    this.processedAt,
    this.notes,
  });

  factory PartnerSettlement.fromJson(Map<String, dynamic> json) {
    return PartnerSettlement(
      settlementId: _toInt(json['settlementId'] ?? json['id']),
      settlementNumber: json['settlementNumber']?.toString() ?? '',
      grossAmount: _toDouble(json['grossAmount']),
      netAmount: _toDouble(json['netAmount']),
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      paypalEmail: json['paypalEmail']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      processedAt:
          DateTime.tryParse(json['processedAt']?.toString() ?? ''),
      notes: json['notes']?.toString(),
    );
  }

  String get displayStatus {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PROCESSING':
        return 'Processing';
      case 'COMPLETED':
        return 'Completed';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  bool get isPending => status == 'PENDING' || status == 'PROCESSING';
  bool get isCompleted => status == 'COMPLETED';
}

double _toDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0.0;
}

double? _toDoubleNullable(dynamic value) {
  if (value == null) return null;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
