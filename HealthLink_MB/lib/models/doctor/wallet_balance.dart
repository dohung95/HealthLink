/// Model cho balance của Doctor wallet
class WalletBalance {
  const WalletBalance({
    required this.pendingBalance,
    required this.eligibleForWithdrawal,
    this.totalEarnings,
    this.totalWithdrawn,
  });

  factory WalletBalance.fromJson(Map<String, dynamic> json) {
    return WalletBalance(
      pendingBalance: _toDouble(json['pendingBalance']),
      eligibleForWithdrawal: _toDouble(json['eligibleForWithdrawal']),
      totalEarnings: _toDoubleNullable(json['totalEarnings']),
      totalWithdrawn: _toDoubleNullable(json['totalWithdrawn']),
    );
  }

  /// Số tiền đang chờ xử lý (chưa đủ điều kiện rút)
  final double pendingBalance;

  /// Số tiền đủ điều kiện rút
  final double eligibleForWithdrawal;

  /// Tổng thu nhập (optional)
  final double? totalEarnings;

  /// Tổng đã rút (optional)
  final double? totalWithdrawn;

  /// Tổng số dư = pending + eligible
  double get totalBalance => pendingBalance + eligibleForWithdrawal;

  /// Có thể rút tiền không
  bool get canWithdraw => eligibleForWithdrawal > 0;
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
