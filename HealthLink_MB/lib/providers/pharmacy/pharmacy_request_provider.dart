import 'package:flutter/foundation.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../services/pharmacy/pharmacy_request_service.dart';

class PharmacyRequestProvider extends ChangeNotifier {
  final PharmacyRequestService _requestService;
  List<PharmacyConsultationRequest> _requests = [];
  PharmacyConsultationRequest? _currentRequest;
  bool _isLoading = false;
  String? _error;
  String _activeFilter = 'ALL';
  String? _sourceTypeFilter;
  List<Map<String, dynamic>> _prescriptions = [];
  String? _chatRoomId;
  List<PharmacyWorkItem> _workItems = [];
  bool _workItemsLoading = false;

  PharmacyRequestProvider({PharmacyRequestService? requestService})
      : _requestService = requestService ?? PharmacyRequestService();

  List<PharmacyConsultationRequest> get requests => _requests;
  PharmacyConsultationRequest? get currentRequest => _currentRequest;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get activeFilter => _activeFilter;
  String? get sourceTypeFilter => _sourceTypeFilter;
  List<Map<String, dynamic>> get prescriptions => _prescriptions;
  String? get chatRoomId => _chatRoomId;
  List<PharmacyWorkItem> get workItems => _workItems;
  bool get workItemsLoading => _workItemsLoading;

  void setFilter(String filter) {
    if (_activeFilter == filter && _sourceTypeFilter == null) return;
    _activeFilter = filter;
    _sourceTypeFilter = null;
    _requests = [];
    notifyListeners();
  }

  void setSourceTypeFilter(String? sourceType) {
    if (_sourceTypeFilter == sourceType) return;
    _sourceTypeFilter = sourceType;
    _activeFilter = 'ALL';
    _requests = [];
    notifyListeners();
  }

  Future<void> fetchRequests(String token, String pharmacyId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _requests = await _requestService.getRequests(
        token,
        pharmacyId,
        status: _activeFilter,
      );
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchWorkItems(String token, String pharmacyId) async {
    _workItemsLoading = true;
    notifyListeners();

    try {
      _workItems = await _requestService.getWorkItems(token, pharmacyId);
    } catch (e) {
      debugPrint('Failed to fetch work items: $e');
    }

    _workItemsLoading = false;
    notifyListeners();
  }

  List<PharmacyWorkItem> get filteredWorkItems {
    if (_sourceTypeFilter == null || _sourceTypeFilter == 'ALL') {
      return _workItems;
    }
    return _workItems
        .where((w) => w.sourceType.value == _sourceTypeFilter)
        .toList();
  }

  Future<void> fetchRequestDetail(String token, String requestId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentRequest =
          await _requestService.getRequestById(token, requestId);
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> updateRequestStatus(
    String token,
    String requestId,
    String status, {
    String? pharmacyNotes,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentRequest = await _requestService.updateRequestStatus(
        token,
        requestId,
        status,
        pharmacyNotes: pharmacyNotes,
      );
      final index =
          _requests.indexWhere((r) => r.requestId.toString() == requestId);
      if (index >= 0) {
        _requests[index] = _currentRequest!;
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

  Future<void> fetchPrescriptions(String token, String requestId) async {
    try {
      _prescriptions =
          await _requestService.getPrescriptions(token, requestId);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<bool> createOrderFromRequest(
    String token,
    String requestId,
    List<Map<String, dynamic>> items, {
    String? deliveryType,
    String? deliveryAddress,
    double? deliveryFee,
    String? estimatedDeliveryTime,
    String? deliveryPhoneNumber,
    String? notes,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _requestService.createOrderFromRequest(
        token,
        requestId,
        items,
        deliveryType: deliveryType,
        deliveryAddress: deliveryAddress,
        deliveryFee: deliveryFee,
        estimatedDeliveryTime: estimatedDeliveryTime,
        deliveryPhoneNumber: deliveryPhoneNumber,
        notes: notes,
      );
      await fetchRequestDetail(token, requestId);
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

  Future<void> fetchChatRoomId(String token, String requestId) async {
    try {
      _chatRoomId =
          await _requestService.getChatRoomId(token, requestId);
      notifyListeners();
    } catch (e) {
      // Silently fail, chat may not be available
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearCurrentRequest() {
    _currentRequest = null;
    _prescriptions = [];
    _chatRoomId = null;
    notifyListeners();
  }
}
