import 'package:flutter/foundation.dart';
import '../../models/partner/partner_wallet_models.dart';
import '../../models/pharmacy/pharmacy_revenue_series.dart';
import '../../services/partner/partner_wallet_service.dart';
import '../../utils/pharmacy/pharmacy_revenue_calculator.dart';

/// Factory type so tests can inject a mock service.
typedef PartnerWalletServiceFactory = PartnerWalletService Function(String partnerId);

/// Manages pharmacy revenue state: fetches transactions once, then re-buckets
/// locally when the range selection changes.
class PharmacyRevenueProvider extends ChangeNotifier {
  PharmacyRevenueProvider({PartnerWalletServiceFactory? serviceFactory})
      : _serviceFactory = serviceFactory ??
            ((partnerId) => PartnerWalletService(
                  partnerId: partnerId,
                  partnerType: 'PHARMACY',
                ));

  final PartnerWalletServiceFactory _serviceFactory;

  PharmacyRevenueRange _range = PharmacyRevenueRange.week;

  // Cached transaction list — loaded once per refresh.
  List<PartnerTransaction> _cachedTransactions = [];

  bool _loading = false;
  String? _error;
  DateTime? _updatedAt;
  // Guard against stale async completions.
  int _loadVersion = 0;

  // ── Getters ──────────────────────────────────────────────────────────

  PharmacyRevenueRange get range => _range;
  bool get loading => _loading;
  String? get error => _error;
  DateTime? get updatedAt => _updatedAt;
  bool get hasData => _cachedTransactions.isNotEmpty;

  /// Build the series from cached transactions using current range.
  PharmacyRevenueSeries get series {
    return PharmacyRevenueCalculator.build(
      transactions: _cachedTransactions,
      range: _range,
      now: DateTime.now(),
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /// Fetch all transactions from the API.
  /// Guards against duplicate in-flight requests.
  Future<void> load({
    required String token,
    required String pharmacyId,
    DateTime? now,
  }) async {
    if (_loading) return;
    _loading = true;
    _error = null;
    _loadVersion++;
    final version = _loadVersion;
    notifyListeners();

    try {
      final service = _serviceFactory(pharmacyId);
      try {
        final txs = await service.getTransactions(token);
        if (version != _loadVersion) {
          // Stale — discard silently; loading handled by newer request
          return;
        }
        _cachedTransactions = txs;
        _updatedAt = now ?? DateTime.now();
        _error = null;
      } finally {
        service.close();
      }
    } catch (e) {
      if (version != _loadVersion) {
        return; // stale error — ignore
      }
      _error = e.toString();
    }

    _loading = false;
    notifyListeners();
  }

  /// Re-fetch all transactions.
  /// Unlike [load], this bypasses the in-flight guard so an explicit
  /// refresh can supersede an earlier load. Existing cached data is
  /// preserved during the request — only replaced on success.
  Future<void> refresh({
    required String token,
    required String pharmacyId,
    DateTime? now,
  }) async {
    _loadVersion++;
    final version = _loadVersion;
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final service = _serviceFactory(pharmacyId);
      try {
        final txs = await service.getTransactions(token);
        if (version != _loadVersion) {
          return; // stale — keep existing cache
        }
        _cachedTransactions = txs;
        _updatedAt = now ?? DateTime.now();
        _error = null;
      } finally {
        service.close();
      }
    } catch (e) {
      if (version != _loadVersion) {
        return; // stale error — keep existing cache
      }
      _error = e.toString();
      // Cache intentionally preserved on failure
    }

    _loading = false;
    notifyListeners();
  }

  /// Switch range type.
  void selectRange(PharmacyRevenueRange value) {
    if (_range == value) return;
    _range = value;
    notifyListeners();
  }
}
