import 'package:flutter/foundation.dart';
import '../../models/pharmacy/pharmacy_order.dart';
import '../../services/pharmacy/pharmacy_order_service.dart';

class PharmacyOrderProvider extends ChangeNotifier {
  final PharmacyOrderService _orderService;
  List<PharmacyOrder> _orders = [];
  PharmacyOrder? _currentOrder;
  bool _isLoading = false;
  String? _error;
  int _currentPage = 0;
  bool _hasMore = true;
  String _activeFilter = 'ALL';

  PharmacyOrderProvider({PharmacyOrderService? orderService})
      : _orderService = orderService ?? PharmacyOrderService();

  List<PharmacyOrder> get orders => _orders;
  PharmacyOrder? get currentOrder => _currentOrder;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;
  String get activeFilter => _activeFilter;

  void setFilter(String filter) {
    if (_activeFilter == filter) return;
    _activeFilter = filter;
    _orders = [];
    _currentPage = 0;
    _hasMore = true;
    notifyListeners();
  }

  Future<void> fetchOrders(String token, String pharmacyId) async {
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final newOrders = await _orderService.getOrders(
        token,
        pharmacyId,
        status: _activeFilter,
        page: _currentPage,
      );
      if (_currentPage == 0) {
        _orders = newOrders;
      } else {
        _orders.addAll(newOrders);
      }
      _hasMore = newOrders.length >= 20;
      _currentPage++;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> refreshOrders(String token, String pharmacyId) async {
    _currentPage = 0;
    _hasMore = true;
    _orders = [];
    await fetchOrders(token, pharmacyId);
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
    String? estimatedDeliveryTime,
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
        estimatedDeliveryTime: estimatedDeliveryTime,
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
