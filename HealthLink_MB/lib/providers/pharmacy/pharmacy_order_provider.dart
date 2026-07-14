import 'package:flutter/foundation.dart';
import '../../models/pharmacy/pharmacy_order.dart';
import '../../services/pharmacy/pharmacy_order_service.dart';

class PharmacyOrderProvider extends ChangeNotifier {
  final PharmacyOrderService _orderService;
  List<PharmacyOrder> _orders = [];
  PharmacyOrder? _currentOrder;
  bool _isLoading = false;
  String? _error;
  String _activeFilter = 'ALL';
  bool _flowView = true;

  PharmacyOrderProvider({PharmacyOrderService? orderService})
      : _orderService = orderService ?? PharmacyOrderService();

  List<PharmacyOrder> get orders => _orders;
  PharmacyOrder? get currentOrder => _currentOrder;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get activeFilter => _activeFilter;
  bool get flowView => _flowView;

  List<PharmacyOrder> get historyOrders {
    final terminal = _orders.where(
      (order) => order.status == 'COMPLETED' || order.status == 'CANCELLED',
    );
    if (_activeFilter == 'ALL') return terminal.toList(growable: false);
    return terminal
        .where((order) => order.status == _activeFilter)
        .toList(growable: false);
  }

  void setFlowView(bool flowView) {
    if (_flowView == flowView) return;
    _flowView = flowView;
    if (flowView) _activeFilter = 'ALL';
    notifyListeners();
  }

  Map<String, List<PharmacyOrder>> get flowGroupedOrders {
    final activeStatuses = {
      'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'DELIVERED',
    };
    final active = _orders.where((o) => activeStatuses.contains(o.status)).toList();
    final grouped = <String, List<PharmacyOrder>>{};
    for (final order in active) {
      grouped.putIfAbsent(order.status, () => []).add(order);
    }
    final orderedKeys = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'DELIVERED'];
    final result = <String, List<PharmacyOrder>>{};
    for (final key in orderedKeys) {
      if (grouped.containsKey(key)) {
        result[key] = grouped[key]!;
      }
    }
    return result;
  }

  void setFilter(String filter) {
    if (_activeFilter == filter) return;
    _activeFilter = filter;
    notifyListeners();
  }

  List<PharmacyOrder> _deduplicateById(Iterable<PharmacyOrder> input) {
    final unique = <int, PharmacyOrder>{};
    for (final order in input) {
      unique[order.orderId] = order;
    }
    return unique.values.toList(growable: false);
  }

  Future<void> fetchOrders(String token, String pharmacyId) async {
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final loaded = await _orderService.getOrders(token, pharmacyId);
      _orders = _deduplicateById(loaded);
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> refreshOrders(String token, String pharmacyId) async {
    _isLoading = true;
    _error = null;
    // Keep old snapshot visible during loading
    notifyListeners();

    try {
      final loaded = await _orderService.getOrders(token, pharmacyId);
      _orders = _deduplicateById(loaded);
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchOrderDetail(String token, String orderId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentOrder = await _orderService.getOrderById(token, orderId);
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> updateOrderStatus(
    String token,
    String orderId,
    String status, {
    String? pharmacistNotes,
    String? estimatedDeliveryTime,
    String? cancelReason,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentOrder = await _orderService.updateOrderStatus(
        token,
        orderId,
        status,
        pharmacistNotes: pharmacistNotes,
        estimatedDeliveryTime: estimatedDeliveryTime,
        cancelReason: cancelReason,
      );
      final index = _orders.indexWhere((o) => o.orderId.toString() == orderId);
      if (index >= 0) {
        _orders[index] = _currentOrder!;
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateQuote(
    String token,
    String orderId,
    List<Map<String, dynamic>> items, {
    double? deliveryFee,
    int? estimatedDeliveryMinutes,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentOrder = await _orderService.updateOrderQuote(
        token,
        orderId,
        items,
        deliveryFee: deliveryFee,
        estimatedDeliveryMinutes: estimatedDeliveryMinutes,
      );
      final index = _orders.indexWhere((o) => o.orderId.toString() == orderId);
      if (index >= 0) {
        _orders[index] = _currentOrder!;
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearCurrentOrder() {
    _currentOrder = null;
    notifyListeners();
  }
}
