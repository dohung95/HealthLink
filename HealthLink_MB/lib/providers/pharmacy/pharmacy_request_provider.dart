import 'package:flutter/foundation.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../services/pharmacy/pharmacy_request_service.dart';

class PharmacyRequestProvider extends ChangeNotifier {
  final PharmacyRequestService _requestService;
  PharmacyConsultationRequest? _currentRequest;
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _prescriptions = [];
  String? _chatRoomId;

  PharmacyRequestProvider({PharmacyRequestService? requestService})
      : _requestService = requestService ?? PharmacyRequestService();

  PharmacyConsultationRequest? get currentRequest => _currentRequest;
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Map<String, dynamic>> get prescriptions => _prescriptions;
  String? get chatRoomId => _chatRoomId;

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
