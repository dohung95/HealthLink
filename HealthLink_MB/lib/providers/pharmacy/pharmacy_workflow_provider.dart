import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../services/pharmacy/pharmacy_workflow_service.dart';
import '../../utils/pharmacy/pharmacy_workflow.dart';

class PharmacyWorkflowProvider extends ChangeNotifier {
  final PharmacyWorkflowService _workflowService;
  List<PharmacyWorkItem> _workItems = [];
  bool _isLoading = false;
  String? _error;
  Timer? _pollTimer;

  PharmacyWorkflowProvider({PharmacyWorkflowService? workflowService})
      : _workflowService = workflowService ?? PharmacyWorkflowService();

  List<PharmacyWorkItem> get workItems => _workItems;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get pendingOrdersCount => _workItems
      .where((w) =>
          (w.sourceType == WorkItemSourceType.pickupOrder ||
              w.sourceType == WorkItemSourceType.deliveryOrder) &&
          (w.orderStatus == 'PENDING' || w.orderStatus == 'CONFIRMED'))
      .length;

  int get pendingRequestsCount =>
      PharmacyWorkflow.actionableRequests(_workItems).length;

  int get totalBadgeCount => pendingOrdersCount + pendingRequestsCount;

  Future<void> refresh(String token, String pharmacyId) async {
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _workItems = await _workflowService.getWorkItems(token, pharmacyId);
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  void startPolling(String token, String pharmacyId) {
    stopPolling();
    refresh(token, pharmacyId);
    _pollTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => refresh(token, pharmacyId),
    );
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
