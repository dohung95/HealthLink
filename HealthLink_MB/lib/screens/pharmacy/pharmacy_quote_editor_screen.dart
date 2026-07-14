import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/pharmacy/pharmacy_quote_draft.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';
import '../../providers/pharmacy/pharmacy_order_provider.dart';
import '../../providers/pharmacy/pharmacy_request_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';
import '../../utils/pharmacy/pharmacy_quote_eta.dart';
import '../../utils/pharmacy/pharmacy_quote_mapper.dart';
import '../../widgets/pharmacy/pharmacy_medicine_picker.dart';
import '../../widgets/pharmacy/pharmacy_order_item_editor.dart';
import '../../widgets/pharmacy/quote/pharmacy_quote_delivery_step.dart';
import '../../widgets/pharmacy/quote/pharmacy_quote_review_step.dart';
import '../../widgets/pharmacy/quote/pharmacy_quote_step_header.dart';

export '../../widgets/pharmacy/quote/pharmacy_quote_step_header.dart'
    show PharmacyQuoteStep;

enum QuoteEditorMode { createFromRequest, updateQuote }

String pharmacyQuoteSubmissionError({
  required bool isUpdate,
  String? requestError,
  String? orderError,
}) {
  return (isUpdate ? orderError : requestError) ?? 'Submission failed';
}

Future<void> refreshPharmacyQuoteState({
  required PharmacyOrderProvider orderProvider,
  required PharmacyWorkflowProvider workflowProvider,
  required String token,
  required String pharmacyId,
}) async {
  await Future.wait([
    orderProvider.refreshOrders(token, pharmacyId),
    workflowProvider.refresh(token, pharmacyId),
  ]);
}

class PharmacyQuoteEditorScreen extends StatefulWidget {
  final QuoteEditorMode mode;
  final String? requestId;
  final String? orderId;

  const PharmacyQuoteEditorScreen({
    super.key,
    required this.mode,
    this.requestId,
    this.orderId,
  });

  @override
  State<PharmacyQuoteEditorScreen> createState() =>
      _PharmacyQuoteEditorScreenState();
}

class _PharmacyQuoteEditorScreenState
    extends State<PharmacyQuoteEditorScreen> {
  final List<QuoteLineItem> _items = [];
  bool _isDirty = false;
  bool _isSubmitting = false;
  bool _hasLoaded = false;
  PharmacyQuoteStep _step = PharmacyQuoteStep.medicines;
  String? _validationError;
  String? _submitError;

  String? _deliveryType;
  final _deliveryFeeCtrl = TextEditingController();
  final _deliveryAddressCtrl = TextEditingController();
  final _deliveryPhoneCtrl = TextEditingController();
  final _etaCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  int? _estimatedDeliveryMinutes;
  double? _deliveryLatitudeValue;
  double? _deliveryLongitudeValue;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  @override
  void dispose() {
    _deliveryFeeCtrl.dispose();
    _deliveryAddressCtrl.dispose();
    _deliveryPhoneCtrl.dispose();
    _etaCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final requestProvider = context.read<PharmacyRequestProvider>();
    final orderProvider = context.read<PharmacyOrderProvider>();

    if (widget.mode == QuoteEditorMode.createFromRequest &&
        widget.requestId != null) {
      await requestProvider
          .fetchRequestDetail(auth.accessToken!, widget.requestId!);
      if (!mounted) return;
      await requestProvider
          .fetchPrescriptions(auth.accessToken!, widget.requestId!);
      _hydrateFromRequest();
    } else if (widget.mode == QuoteEditorMode.updateQuote &&
        widget.orderId != null) {
      await orderProvider
          .fetchOrderDetail(auth.accessToken!, widget.orderId!);
    }

    _hydrateFromOrder();
    if (mounted) setState(() => _hasLoaded = true);
  }

  void _hydrateFromOrder() {
    if (widget.mode != QuoteEditorMode.updateQuote) return;
    final order = context.read<PharmacyOrderProvider>().currentOrder;
    if (order == null) return;

    _deliveryType = order.deliveryType?.toUpperCase();
    _deliveryFeeCtrl.text = order.deliveryType?.toUpperCase() == 'PICKUP'
        ? '0'
        : (order.deliveryFee?.toStringAsFixed(2) ?? '');
    if (order.deliveryAddress != null) {
      _deliveryAddressCtrl.text = order.deliveryAddress!;
    }
    if (order.deliveryPhoneNumber != null) {
      _deliveryPhoneCtrl.text = order.deliveryPhoneNumber!;
    }
    final remaining = pharmacyRemainingEtaMinutes(
      order.estimatedDeliveryTime,
      DateTime.now(),
    );
    _estimatedDeliveryMinutes = remaining;
    _etaCtrl.text = remaining?.toString() ?? '';
    _deliveryLatitudeValue = order.deliveryLatitude;
    _deliveryLongitudeValue = order.deliveryLongitude;

    final items = order.items
        .map((oi) => PharmacyQuoteMapper.fromOrderItem(oi))
        .toList();
    _items.addAll(items);
    if (items.isNotEmpty) _isDirty = true;
  }

  void _hydrateFromRequest() {
    if (widget.mode != QuoteEditorMode.createFromRequest) return;
    final request = context.read<PharmacyRequestProvider>().currentRequest;
    if (request == null) return;
    _deliveryType =
        (request.deliveryType ?? request.preferredDeliveryType)?.toUpperCase();
    _deliveryAddressCtrl.text = request.deliveryAddress ?? '';
    _deliveryPhoneCtrl.text = request.deliveryPhoneNumber ?? '';
    _notesCtrl.text = request.additionalNotes ?? '';
    if (_deliveryType == 'PICKUP') {
      _deliveryFeeCtrl.text = '0';
      _estimatedDeliveryMinutes = null;
      _etaCtrl.clear();
    }
  }

  void _addItem(QuoteLineItem item) {
    setState(() {
      _items.add(item);
      _isDirty = true;
      _validationError = null;
    });
  }

  void _updateItem(int index, QuoteLineItem item) {
    setState(() {
      _items[index] = item;
      _isDirty = true;
      _validationError = null;
    });
  }

  void _removeItem(int index) {
    setState(() {
      _items.removeAt(index);
      _isDirty = true;
    });
  }

  Future<void> _showMedicinePicker() async {
    final auth = context.read<AuthProvider>();
    final inventoryProvider = context.read<PharmacyInventoryProvider>();

    if (inventoryProvider.items.isEmpty && auth.accessToken != null) {
      await inventoryProvider.refresh(auth.accessToken!);
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollCtrl) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: Text('Select Medicine',
                        style: Theme.of(ctx).textTheme.titleMedium),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: PharmacyMedicinePicker(
                inventoryItems: inventoryProvider.items,
                isLoading: inventoryProvider.loading,
                onSelected: (item) {
                  Navigator.pop(ctx);
                  _addItem(item);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _validateMedicines() {
    if (_items.isEmpty) {
      _validationError = 'Add at least one medicine';
      return false;
    }
    for (final item in _items) {
      if (item.quantity <= 0) {
        _validationError = 'Quantity must be > 0';
        return false;
      }
      if (item.totalSupplyDays <= 0) {
        _validationError = 'Total supply days must be > 0';
        return false;
      }
      if (!item.locked && item.timing.isEmpty) {
        _validationError = 'Select at least one medicine timing';
        return false;
      }
    }
    _validationError = null;
    return true;
  }

  bool _validateDelivery() {
    if (_deliveryType == 'PICKUP') {
      _validationError = null;
      return true;
    }
    if (_deliveryType != 'DELIVERY') {
      _validationError = 'Patient delivery type is not available';
      return false;
    }
    final fee = double.tryParse(_deliveryFeeCtrl.text);
    if (fee == null || fee < 0) {
      _validationError = 'Enter a non-negative delivery fee';
      return false;
    }
    final etaMsg = pharmacyEtaValidationMessage(_etaCtrl.text);
    if (etaMsg != null) {
      _validationError = etaMsg;
      return false;
    }
    _validationError = null;
    return true;
  }

  Future<void> _submit() async {
    if (!_validateMedicines() || !_validateDelivery()) {
      setState(() {});
      return;
    }

    setState(() => _isSubmitting = true);
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) {
      setState(() => _isSubmitting = false);
      return;
    }

    final isPickup = _deliveryType == 'PICKUP';
    final deliveryFee = isPickup ? 0.0 : double.parse(_deliveryFeeCtrl.text);
    final estimatedDeliveryTime = isPickup
        ? null
        : pharmacyEstimatedArrival(_estimatedDeliveryMinutes!, DateTime.now());
    final notes = _notesCtrl.text.isNotEmpty ? _notesCtrl.text : null;
    bool success = false;
    String? requestError;
    String? orderError;
    try {
      if (widget.mode == QuoteEditorMode.createFromRequest &&
          widget.requestId != null) {
        final provider = context.read<PharmacyRequestProvider>();
        final payload = PharmacyQuoteMapper.toCreateOrderPayload(
          _items,
          deliveryFee: deliveryFee,
          estimatedDeliveryTime: estimatedDeliveryTime,
          notes: notes,
        );
        success = await provider.createOrderFromRequest(
          auth.accessToken!,
          widget.requestId!,
          payload['items'] as List<Map<String, dynamic>>,
          deliveryFee: payload['deliveryFee'] as double?,
          estimatedDeliveryTime: payload['estimatedDeliveryTime'] as String?,
          notes: payload['notes'] as String?,
        );
        requestError = provider.error;
      } else if (widget.mode == QuoteEditorMode.updateQuote &&
          widget.orderId != null) {
        final payload = PharmacyQuoteMapper.toUpdateQuotePayload(
          _items,
          deliveryFee: deliveryFee,
          estimatedDeliveryTime: estimatedDeliveryTime,
        );
        final orderProvider = context.read<PharmacyOrderProvider>();
        final workflowProvider = context.read<PharmacyWorkflowProvider>();
        success = await orderProvider.updateQuote(
          auth.accessToken!,
          widget.orderId!,
          payload['items'] as List<Map<String, dynamic>>,
          deliveryFee: payload['deliveryFee'] as double?,
          estimatedDeliveryTime: payload['estimatedDeliveryTime'] as String?,
        );
        orderError = orderProvider.error;
        if (success) {
          final pharmacyId = auth.pharmacyProfile?['pharmacyId']?.toString() ??
              auth.userId;
          if (pharmacyId != null) {
            await refreshPharmacyQuoteState(
              orderProvider: orderProvider,
              workflowProvider: workflowProvider,
              token: auth.accessToken!,
              pharmacyId: pharmacyId,
            );
          }
        }
      }
    } catch (_) {
      success = false;
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.mode == QuoteEditorMode.createFromRequest
                ? 'Order created successfully'
                : 'Quote updated successfully'),
          ),
        );
        Navigator.pop(context, true);
      } else {
        setState(() {
          _submitError = pharmacyQuoteSubmissionError(
            isUpdate: widget.mode == QuoteEditorMode.updateQuote,
            requestError: requestError,
            orderError: orderError,
          );
        });
      }
    }
  }

  Future<bool> _onWillPop() async {
    if (!_isDirty) return true;
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Discard changes?'),
        content: const Text('You have unsaved changes. Discard them?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Keep editing')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Discard')),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = widget.mode == QuoteEditorMode.createFromRequest
        ? 'Create Order'
        : 'Update Quote';

    return PopScope(
      canPop: !_isDirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final navigator = Navigator.of(context);
        final shouldPop = await _onWillPop();
        if (shouldPop && mounted) navigator.pop();
      },
      child: Scaffold(
        appBar: AppBar(title: Text(title)),
        body: _buildBody(theme),
        bottomNavigationBar: _buildBottomBar(theme),
      ),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (widget.mode == QuoteEditorMode.updateQuote && !_hasLoaded) {
      final orderProvider = context.watch<PharmacyOrderProvider>();
      if (orderProvider.isLoading) {
        return const Center(child: CircularProgressIndicator());
      }
      if (orderProvider.error != null && orderProvider.currentOrder == null) {
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(orderProvider.error!),
              const SizedBox(height: 12),
              FilledButton.tonal(
                  onPressed: _loadData, child: const Text('Retry')),
            ],
          ),
        );
      }
    }

    if (widget.mode == QuoteEditorMode.createFromRequest && !_hasLoaded) {
      final requestProvider = context.watch<PharmacyRequestProvider>();
      if (requestProvider.isLoading) {
        return const Center(child: CircularProgressIndicator());
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PharmacyQuoteStepHeader(currentStep: _step),
          const SizedBox(height: 16),
          if (_step == PharmacyQuoteStep.medicines) ...[
            _buildSummarySection(theme),
            const SizedBox(height: 16),
            if (widget.mode == QuoteEditorMode.createFromRequest)
              _buildPrescriptionsSection(theme),
            const SizedBox(height: 16),
            _buildMedicinesSection(theme),
          ] else if (_step == PharmacyQuoteStep.delivery) ...[
            PharmacyQuoteDeliveryStep(
              fulfillmentType: _deliveryType,
              address: _deliveryAddressCtrl.text,
              phone: _deliveryPhoneCtrl.text,
              latitude: _deliveryLatitudeValue,
              longitude: _deliveryLongitudeValue,
              feeController: _deliveryFeeCtrl,
              etaController: _etaCtrl,
              onFeeChanged: (_) => _markDirty(),
              onEtaChanged: (value) {
                _estimatedDeliveryMinutes = int.tryParse(value);
                _markDirty();
              },
            ),
            const SizedBox(height: 16),
            _buildNotesSection(theme),
          ] else ...[
            PharmacyQuoteReviewStep(
              isCreate: widget.mode == QuoteEditorMode.createFromRequest,
              items: _items,
              fulfillmentType: _deliveryType,
              address: _deliveryAddressCtrl.text,
              phone: _deliveryPhoneCtrl.text,
              deliveryFee: _deliveryType == 'PICKUP'
                  ? 0
                  : (double.tryParse(_deliveryFeeCtrl.text) ?? 0),
              estimatedDeliveryMinutes:
                  _deliveryType == 'PICKUP' ? null : _estimatedDeliveryMinutes,
              latitude: _deliveryLatitudeValue,
              longitude: _deliveryLongitudeValue,
              notes: _notesCtrl.text,
              error: _submitError,
              isSubmitting: _isSubmitting,
              onSubmit: _submit,
            ),
          ],
          if (_validationError != null) ...[
            const SizedBox(height: 12),
            Text(
              _validationError!,
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ],
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildSummarySection(ThemeData theme) {
    String summaryText;
    if (widget.mode == QuoteEditorMode.createFromRequest) {
      final request =
          context.watch<PharmacyRequestProvider>().currentRequest;
      summaryText = request != null
          ? 'Request #${request.requestId} — ${request.patientName}'
          : 'Loading request...';
    } else {
      final order = context.watch<PharmacyOrderProvider>().currentOrder;
      summaryText = order != null
          ? 'Order #${order.orderNumber} — ${order.patientName}'
          : 'Loading order...';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Summary',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(summaryText, style: theme.textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }

  Widget _buildPrescriptionsSection(ThemeData theme) {
    final prescriptions =
        context.watch<PharmacyRequestProvider>().prescriptions;
    if (prescriptions.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Prescriptions',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...prescriptions.map((rx) {
              final rxItems = rx['items'] as List<dynamic>? ?? [];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Rx: ${rx['prescriptionNumber'] ?? rx['prescriptionHeaderId'] ?? ''}',
                      style: theme.textTheme.bodySmall
                          ?.copyWith(fontWeight: FontWeight.w500),
                    ),
                    ...rxItems.map((item) {
                      final m = item as Map<String, dynamic>;
                      return Padding(
                        padding: const EdgeInsets.only(left: 12, top: 2),
                        child: Text(
                          '${m['medicationName']} — Qty: ${m['quantity']}',
                          style: theme.textTheme.bodySmall,
                        ),
                      );
                    }),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildMedicinesSection(ThemeData theme) {
    final prescriptions =
        context.watch<PharmacyRequestProvider>().prescriptions;
    final hasPrescriptionItems = _items.any((i) => i.sourcePrescriptionHeaderId != null);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Medicines',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            if (widget.mode == QuoteEditorMode.updateQuote ||
                prescriptions.isEmpty ||
                hasPrescriptionItems)
              TextButton.icon(
                onPressed: _showMedicinePicker,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add'),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (_items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.medication_outlined,
                      size: 40, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(height: 8),
                  Text('No medicines added yet',
                      style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 8),
                  FilledButton.tonalIcon(
                    onPressed: _showMedicinePicker,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add Medicine'),
                  ),
                ],
              ),
            ),
          )
        else
          ..._items.asMap().entries.map((entry) {
            final i = entry.key;
            final item = entry.value;
            return PharmacyOrderItemEditor(
              key: ValueKey('item_${item.medicineId}_$i'),
              item: item,
              onChanged: (updated) => _updateItem(i, updated),
              onRemove: item.locked ? null : () => _removeItem(i),
            );
          }),
      ],
    );
  }

  Widget _buildNotesSection(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Notes',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                hintText: 'Additional notes...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              onChanged: (_) => _markDirty(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(ThemeData theme) {
    final isReview = _step == PharmacyQuoteStep.review;
    if (isReview) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: _isSubmitting ? null : _goBack,
              icon: const Icon(Icons.arrow_back),
              label: const Text('Back'),
            ),
          ),
        ),
      );
    }
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            if (_step != PharmacyQuoteStep.medicines)
              OutlinedButton.icon(
                onPressed: _isSubmitting ? null : _goBack,
                icon: const Icon(Icons.arrow_back),
                label: const Text('Back'),
              ),
            if (_step != PharmacyQuoteStep.medicines) const SizedBox(width: 12),
            Expanded(
              child: FilledButton.icon(
                onPressed: _isSubmitting ? null : _goNext,
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Next'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _goNext() {
    final valid = _step == PharmacyQuoteStep.medicines
        ? _validateMedicines()
        : _validateDelivery();
    setState(() {
      _validationError = valid ? null : _validationError;
      if (valid) {
        _submitError = null;
        _step = _step == PharmacyQuoteStep.medicines
            ? PharmacyQuoteStep.delivery
            : PharmacyQuoteStep.review;
      }
    });
  }

  void _goBack() {
    setState(() {
      _validationError = null;
      _submitError = null;
      _step = _step == PharmacyQuoteStep.review
          ? PharmacyQuoteStep.delivery
          : PharmacyQuoteStep.medicines;
    });
  }

  void _markDirty() {
    if (!_isDirty) setState(() => _isDirty = true);
  }
}
