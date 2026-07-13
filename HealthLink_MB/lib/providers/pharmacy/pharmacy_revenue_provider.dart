import 'package:flutter/foundation.dart';
import '../../models/partner/partner_wallet_models.dart';
import '../../models/pharmacy/pharmacy_revenue_series.dart';
import '../../services/partner/partner_wallet_service.dart';
import '../../utils/pharmacy/pharmacy_revenue_calculator.dart';

/// Factory type so tests can inject a mock service.
typedef PartnerWalletServiceFactory = PartnerWalletService Function(String partnerId);

/// Manages pharmacy revenue state: fetches transactions once, then re-buckets
/// locally when the range or month/year selection changes.
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

  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  bool _loading = false;
  String? _error;
  DateTime? _updatedAt;
  // Guard against stale async completions.
  int _loadVersion = 0;

  // ── Getters ──────────────────────────────────────────────────────────

  PharmacyRevenueRange get range => _range;
  int get selectedMonth => _selectedMonth;
  int get selectedYear => _selectedYear;
  bool get loading => _loading;
  String? get error => _error;
  DateTime? get updatedAt => _updatedAt;
  bool get hasData => _cachedTransactions.isNotEmpty;

  /// Build the series from cached transactions using current range/selection.
  PharmacyRevenueSeries get series {
    return PharmacyRevenueCalculator.build(
      transactions: _cachedTransactions,
      range: _range,
      now: DateTime.now(),
      selectedMonth: _selectedMonth,
      selectedYear: _selectedYear,
    );
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /// Fetch all transactions from the API.
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
        if (version != _loadVersion) return; // stale
        _cachedTransactions = txs;
        _updatedAt = now ?? DateTime.now();
        _error = null;
      } finally {
        service.close();
      }
    } catch (e) {
      if (version != _loadVersion) return;
      _error = e.toString();
    }

    _loading = false;
    notifyListeners();
  }

  /// Re-fetch all transactions.
  Future<void> refresh({
    required String token,
    required String pharmacyId,
    DateTime? now,
  }) async {
    // Clear cache so UI shows loading state
    _cachedTransactions = [];
    _loadVersion++;
    notifyListeners();
    await load(token: token, pharmacyId: pharmacyId, now: now);
  }

  /// Switch range type and optionally reset month/year.
  void selectRange(PharmacyRevenueRange value) {
    if (_range == value) return;
    _range = value;
    final now = DateTime.now();
    _selectedMonth = now.month;
    _selectedYear = now.year;
    notifyListeners();
  }

  void selectMonth(int month, int year) {
    _selectedMonth = month;
    _selectedYear = year;
    notifyListeners();
  }

  void selectYear(int year) {
    _selectedYear = year;
    notifyListeners();
  }
}
