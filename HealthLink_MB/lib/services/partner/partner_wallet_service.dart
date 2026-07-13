import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/partner/partner_payment_exception.dart';
import '../../models/partner/partner_wallet_models.dart';

class PartnerWalletService {
  final String partnerId;
  final String partnerType;
  final http.Client _client;

  PartnerWalletService({
    required this.partnerId,
    required this.partnerType,
    http.Client? client,
  }) : _client = client ?? http.Client();

  static const _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  Map<String, String> _authHeaders(String token) => {
        ..._jsonHeaders,
        'Authorization': 'Bearer $token',
      };

  void close() => _client.close();

  /// Parse a non-2xx response into a [PartnerPaymentException].
  PartnerPaymentException _parseError(int statusCode, String body) {
    try {
      final map = jsonDecode(body) as Map<String, dynamic>;
      final message = map['message']?.toString() ??
          'Unable to process withdrawal (HTTP $statusCode)';
      final code = map['code']?.toString();
      int? attemptsRemaining = map['attemptsRemaining'] as int?;
      DateTime? lockedUntil;
      if (map['lockedUntil'] != null) {
        lockedUntil = DateTime.tryParse(map['lockedUntil'].toString());
      }
      return PartnerPaymentException(
        statusCode: statusCode,
        message: message,
        code: code,
        attemptsRemaining: attemptsRemaining,
        lockedUntil: lockedUntil,
      );
    } catch (_) {
      return PartnerPaymentException(
        statusCode: statusCode,
        message: 'Unable to process withdrawal (HTTP $statusCode)',
      );
    }
  }

  Future<PartnerWalletBalance> getBalance(String token) async {
    final uri = Uri.parse(ApiConfig.partnerWalletBalance(partnerId))
        .replace(queryParameters: {'type': partnerType});
    final res = await _client
        .get(uri, headers: _authHeaders(token))
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      return PartnerWalletBalance.fromJson(
          jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw Exception('Failed to load wallet balance');
  }

  Future<List<PartnerTransaction>> getTransactions(String token) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.partnerWalletTransactions(partnerId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data
            .map((e) =>
                PartnerTransaction.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    }
    throw Exception('Failed to load transactions');
  }

  Future<List<PartnerSettlement>> getSettlements(String token) async {
    final res = await _client
        .get(
          Uri.parse(ApiConfig.partnerSettlements(partnerId)),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return data
            .map((e) =>
                PartnerSettlement.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    }
    throw Exception('Failed to load settlements');
  }

  Future<PartnerSettlement> requestWithdrawal(
    String token, {
    required double amount,
    required String paypalEmail,
    String? pin,
    String? notes,
  }) async {
    final uri = Uri.parse(ApiConfig.partnerSettle(partnerId))
        .replace(queryParameters: {'type': partnerType});
    final body = <String, dynamic>{
      'amount': amount,
      'paypalEmail': paypalEmail,
      if (pin != null) 'pin': pin,
      if (notes != null) 'notes': notes,
    };
    final res = await _client
        .post(
          uri,
          headers: _authHeaders(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);
    if (res.statusCode == 201 || res.statusCode == 200) {
      return PartnerSettlement.fromJson(
          jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw _parseError(res.statusCode, res.body);
  }
}
