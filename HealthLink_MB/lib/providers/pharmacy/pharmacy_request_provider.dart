import 'package:flutter/foundation.dart';
import '../../models/chat/conversation.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../services/pharmacy/pharmacy_request_service.dart';

class PharmacyRequestProvider extends ChangeNotifier {
  final PharmacyRequestService _requestService;
  PharmacyConsultationRequest? _currentRequest;
  bool _isLoading = false;
  String? _error;
  List<Map<String, dynamic>> _prescriptions = [];
  String? _chatRoomId;
  Conversation? _chatRoom;
  String? _chatError;

  PharmacyRequestProvider({PharmacyRequestService? requestService})
      : _requestService = requestService ?? PharmacyRequestService();

  PharmacyConsultationRequest? get currentRequest => _currentRequest;
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Map<String, dynamic>> get prescriptions => _prescriptions;
  String? get chatRoomId => _chatRoomId;
  Conversation? get chatRoom => _chatRoom;
  String? get chatError => _chatError;

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
    int? estimatedDeliveryMinutes,
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
        estimatedDeliveryMinutes: estimatedDeliveryMinutes,
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

  Future<void> fetchChatRoom(
      String token, String requestId, String currentUserId) async {
    _chatError = null;
    try {
      _chatRoom = await _requestService.getChatRoom(
          token, requestId, currentUserId);
      _chatRoomId = _chatRoom!.id;
    } catch (e) {
      _chatRoom = null;
      _chatRoomId = null;
      _chatError = e.toString();
    }
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearCurrentRequest() {
    _currentRequest = null;
    _prescriptions = [];
    _chatRoomId = null;
    _chatRoom = null;
    _chatError = null;
    notifyListeners();
  }
}
