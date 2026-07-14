import 'package:flutter/foundation.dart';
import '../../models/pharmacy/pharmacy_inventory_item.dart';
import '../../services/pharmacy/pharmacy_inventory_service.dart';

class InventoryFilter {
  final String? search;
  final String? category;
  final String? dosageForm;
  final bool? activeOnly;
  final bool? lowStock;
  final bool? expiringSoon;

  const InventoryFilter({
    this.search,
    this.category,
    this.dosageForm,
    this.activeOnly,
    this.lowStock,
    this.expiringSoon,
  });

  InventoryFilter copyWith({
    String? search,
    String? category,
    String? dosageForm,
    bool? activeOnly,
    bool? lowStock,
    bool? expiringSoon,
  }) {
    return InventoryFilter(
      search: search ?? this.search,
      category: category ?? this.category,
      dosageForm: dosageForm ?? this.dosageForm,
      activeOnly: activeOnly ?? this.activeOnly,
      lowStock: lowStock ?? this.lowStock,
      expiringSoon: expiringSoon ?? this.expiringSoon,
    );
  }

  PharmacyInventoryFilter toServiceFilter({int page = 0, int size = 20}) {
    return PharmacyInventoryFilter(
      page: page,
      size: size,
      search: search,
      category: category,
      dosageForm: dosageForm,
      activeOnly: activeOnly,
      lowStock: lowStock,
      expiringSoon: expiringSoon,
    );
  }
}

class PharmacyInventoryProvider extends ChangeNotifier {
  final PharmacyInventoryService _inventoryService;

  PharmacyInventoryService get service => _inventoryService;
  List<PharmacyInventoryItem> _items = [];
  InventoryFilter _filter = const InventoryFilter();
  int _page = 0;
  bool _hasMore = true;
  bool _isLoading = false;
  String? _error;

  PharmacyInventoryProvider({PharmacyInventoryService? inventoryService})
      : _inventoryService = inventoryService ?? PharmacyInventoryService();

  List<PharmacyInventoryItem> get items => _items;
  InventoryFilter get filter => _filter;
  int get page => _page;
  bool get hasMore => _hasMore;
  bool get loading => _isLoading;
  String? get error => _error;

  int get lowStockCount =>
      _items.where((item) => item.minimumStock != null && item.quantity < item.minimumStock!).length;

  int get expiringCount => _items.where((item) {
        if (item.expiryDate == null) return false;
        try {
          final expiry = DateTime.parse(item.expiryDate!);
          return expiry.difference(DateTime.now()).inDays <= 30;
        } catch (_) {
          return false;
        }
      }).length;

  void setFilter(InventoryFilter filter) {
    if (_filter.search == filter.search &&
        _filter.category == filter.category &&
        _filter.dosageForm == filter.dosageForm &&
        _filter.activeOnly == filter.activeOnly &&
        _filter.lowStock == filter.lowStock &&
        _filter.expiringSoon == filter.expiringSoon) {
      return;
    }
    _filter = filter;
    _page = 0;
    _hasMore = true;
    _items = [];
    _error = null;
    notifyListeners();
  }

  void setError(String message) {
    _error = message;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> refresh(String token) async {
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    _page = 0;
    _hasMore = true;
    notifyListeners();

    try {
      final result = await _inventoryService.getInventory(
        token,
        filter: _filter.toServiceFilter(page: _page),
      );
      _items = result.items;
      _hasMore = result.hasMore;
      _page++;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> loadMore(String token) async {
    if (_isLoading || !_hasMore) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _inventoryService.getInventory(
        token,
        filter: _filter.toServiceFilter(page: _page),
      );
      final existingIds = _items.map((e) => e.inventoryId).toSet();
      for (final item in result.items) {
        if (!existingIds.contains(item.inventoryId)) {
          _items.add(item);
        }
      }
      _hasMore = result.hasMore;
      _page++;
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> updateItem(
    String token,
    PharmacyInventoryItem updatedItem,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _inventoryService.updateItem(
        token,
        updatedItem.inventoryId!,
        quantity: updatedItem.quantity,
        reservedQuantity: updatedItem.reservedQuantity,
        unitPrice: updatedItem.unitPrice,
        unit: updatedItem.unit,
        expiryDate: updatedItem.expiryDate,
        active: updatedItem.active,
      );
      final index = _items.indexWhere((i) => i.inventoryId == result.inventoryId);
      if (index >= 0) {
        _items[index] = result;
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

  PharmacyInventoryImportResult parseImportResult(Map<String, dynamic> json) {
    return PharmacyInventoryImportResult.fromJson(json);
  }
}
