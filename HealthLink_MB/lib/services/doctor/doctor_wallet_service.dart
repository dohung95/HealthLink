import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/doctor/wallet_balance.dart';
import '../../models/doctor/commission_transaction.dart';
import '../../models/doctor/settlement.dart';

/// Service xử lý các API liên quan đến Wallet của Doctor
class DoctorWalletService {
  DoctorWalletService({
    required this.accessToken,
    required this.doctorId,
  });

  final String accessToken;
  final String doctorId;

  Map<String, String> get _headers => {
        'Authorization': 'Bearer $accessToken',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

  /// Lấy số dư ví
  Future<WalletBalance> getBalance() async {
    final response = await http
        .get(
          Uri.parse(ApiConfig.doctorWalletBalance(doctorId)),
          headers: _headers,
        )
        .timeout(ApiConfig.receiveTimeout);

    if (response.statusCode == 200) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (data is Map<String, dynamic>) {
        return WalletBalance.fromJson(data);
      }
    }

    throw Exception(_parseError(response, 'Unable to load wallet balance'));
  }

  /// Lấy lịch sử giao dịch
  Future<PagedTransactions> getTransactions({
    int page = 0,
    int size = 20,
  }) async {
    final uri = Uri.parse(ApiConfig.doctorTransactions(doctorId)).replace(
      queryParameters: {
        'page': '$page',
        'size': '$size',
      },
    );

    final response = await http
        .get(uri, headers: _headers)
        .timeout(ApiConfig.receiveTimeout);

    if (response.statusCode == 200) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));

      // Handle different response formats
      if (data is Map<String, dynamic>) {
        // Standard Spring Page response
        if (data.containsKey('content')) {
          return PagedTransactions.fromJson(data);
        }
        // Single balance/summary response - wrap in paged
        return PagedTransactions.empty();
      } else if (data is List) {
        // Raw list response
        return PagedTransactions(
          items: data
              .whereType<Map<String, dynamic>>()
              .map(CommissionTransaction.fromJson)
              .toList(),
          page: page,
          size: size,
          totalPages: 1,
          totalElements: data.length,
        );
      }

      return PagedTransactions.empty();
    }

    throw Exception(_parseError(response, 'Unable to load transactions'));
  }

  /// Lấy lịch sử rút tiền
  Future<PagedSettlements> getSettlements({
    int page = 0,
    int size = 20,
  }) async {
    final uri = Uri.parse(ApiConfig.doctorSettlements(doctorId)).replace(
      queryParameters: {
        'page': '$page',
        'size': '$size',
      },
    );

    final response = await http
        .get(uri, headers: _headers)
        .timeout(ApiConfig.receiveTimeout);

    if (response.statusCode == 200) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));

      if (data is Map<String, dynamic>) {
        if (data.containsKey('content')) {
          return PagedSettlements.fromJson(data);
        }
        return PagedSettlements.empty();
      } else if (data is List) {
        return PagedSettlements(
          items: data
              .whereType<Map<String, dynamic>>()
              .map(Settlement.fromJson)
              .toList(),
          page: page,
          size: size,
          totalPages: 1,
          totalElements: data.length,
        );
      }

      return PagedSettlements.empty();
    }

    throw Exception(_parseError(response, 'Unable to load settlements'));
  }

  /// Yêu cầu rút tiền
  Future<Settlement> requestWithdrawal({
    required double amount,
    String? paypalEmail,
    String? notes,
  }) async {
    final body = <String, dynamic>{
      'amount': amount,
    };

    if (paypalEmail != null && paypalEmail.isNotEmpty) {
      body['paypalEmail'] = paypalEmail;
    }

    if (notes != null && notes.isNotEmpty) {
      body['notes'] = notes;
    }

    final response = await http
        .post(
          Uri.parse(ApiConfig.doctorSettle(doctorId)),
          headers: _headers,
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (data is Map<String, dynamic>) {
        return Settlement.fromJson(data);
      }
      // Return a basic settlement if response doesn't contain full data
      return Settlement(
        settlementId: 0,
        amount: amount,
        status: 'PENDING',
        createdAt: DateTime.now(),
        paypalEmail: paypalEmail,
        notes: notes,
      );
    }

    throw Exception(_parseError(response, 'Unable to process withdrawal request'));
  }

  String _parseError(http.Response response, String fallback) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        return (data['message'] ?? data['error'] ?? data['title'] ?? fallback)
            .toString();
      }
    } catch (_) {}
    return fallback;
  }
}
