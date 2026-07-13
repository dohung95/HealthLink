/// Model cho balance của Doctor wallet
class WalletBalance {
  const WalletBalance({
    required this.pendingBalance,
    required this.eligibleForWithdrawal,
    this.totalEarnings,
    this.withdrawalStatus,
  });

  factory WalletBalance.fromJson(Map<String, dynamic> json) {
    return WalletBalance(
      pendingBalance: _toDouble(json['pendingBalance']),
      eligibleForWithdrawal: json['eligibleForWithdrawal'] == true,
      totalEarnings: _toDoubleNullable(json['totalEarnings']),
      withdrawalStatus: json['withdrawalStatus'] as String?,
    );
  }

  /// Số dư hiện tại có thể rút (khi đủ điều kiện)
  final double pendingBalance;

  /// true nếu pendingBalance >= $10.00 (đủ điều kiện rút tiền) — khớp PartnerBalanceResponse.eligibleForWithdrawal (BE)
  final bool eligibleForWithdrawal;

  /// Tổng thu nhập tích lũy từ trước đến nay (optional)
  final double? totalEarnings;

  /// Thông báo mô tả trạng thái đủ điều kiện rút tiền (từ BE)
  final String? withdrawalStatus;

  /// Có thể rút tiền không
  bool get canWithdraw => eligibleForWithdrawal;
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
