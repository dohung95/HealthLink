import 'package:flutter/foundation.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../services/pharmacy/pharmacy_request_service.dart';

class PharmacyRequestProvider extends ChangeNotifier {
  List<PharmacyConsultationRequest> _requests = [];
  PharmacyConsultationRequest? _currentRequest;
  bool _isLoading = false;
  String? _error;
  String _activeFilter = 'ALL';
  List<Map<String, dynamic>> _prescriptions = [];
  String? _chatRoomId;

  List<PharmacyConsultationRequest> get requests => _requests;
  PharmacyConsultationRequest? get currentRequest => _currentRequest;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get activeFilter => _activeFilter;
  List<Map<String, dynamic>> get prescriptions => _prescriptions;
  String? get chatRoomId => _chatRoomId;

  void setFilter(String filter) {
    if (_activeFilter == filter) return;
    _activeFilter = filter;
    _requests = [];
    notifyListeners();
  }

  Future<void> fetchRequests(String token, String pharmacyId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _requests = await PharmacyRequestService.getRequests(
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

  Future<void> fetchRequestDetail(String token, String requestId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentRequest =
          await PharmacyRequestService.getRequestById(token, requestId);
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
      _currentRequest = await PharmacyRequestService.updateRequestStatus(
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
          await PharmacyRequestService.getPrescriptions(token, requestId);
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
      await PharmacyRequestService.createOrderFromRequest(
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
          await PharmacyRequestService.getChatRoomId(token, requestId);
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
