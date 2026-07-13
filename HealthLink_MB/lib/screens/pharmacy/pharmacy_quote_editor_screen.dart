import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/pharmacy/pharmacy_quote_draft.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';
import '../../providers/pharmacy/pharmacy_order_provider.dart';
import '../../providers/pharmacy/pharmacy_request_provider.dart';
import '../../utils/pharmacy/pharmacy_quote_mapper.dart';
import '../../widgets/pharmacy/pharmacy_medicine_picker.dart';
import '../../widgets/pharmacy/pharmacy_order_item_editor.dart';

enum QuoteEditorMode { createFromRequest, updateQuote }

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
  final _formKey = GlobalKey<FormState>();
  final List<QuoteLineItem> _items = [];
  bool _isDirty = false;
  bool _isSubmitting = false;
  bool _hasLoaded = false;

  String? _deliveryType;
  final _deliveryFeeCtrl = TextEditingController();
  final _deliveryAddressCtrl = TextEditingController();
  final _deliveryPhoneCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  DateTime? _estimatedDeliveryTime;

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

    _deliveryType = order.deliveryType;
    if (order.deliveryFee != null) {
      _deliveryFeeCtrl.text = order.deliveryFee!.toStringAsFixed(2);
    }
    if (order.deliveryAddress != null) {
      _deliveryAddressCtrl.text = order.deliveryAddress!;
    }
    if (order.deliveryPhoneNumber != null) {
      _deliveryPhoneCtrl.text = order.deliveryPhoneNumber!;
    }
    _estimatedDeliveryTime = order.estimatedDeliveryTime;

    final items = order.items
        .map((oi) => PharmacyQuoteMapper.fromOrderItem(oi))
        .toList();
    _items.addAll(items);
    if (items.isNotEmpty) _isDirty = true;
  }

  void _addItem(QuoteLineItem item) {
    setState(() {
      _items.add(item);
      _isDirty = true;
    });
  }

  void _updateItem(int index, QuoteLineItem item) {
    setState(() {
      _items[index] = item;
      _isDirty = true;
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

  bool _validate() {
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one medicine')),
      );
      return false;
    }
    for (final item in _items) {
      if (item.quantity <= 0) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Quantity must be > 0')));
        return false;
      }
      if (item.totalSupplyDays <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Total supply days must be > 0')));
        return false;
      }
    }
    if (_deliveryType == 'DELIVERY') {
      if (_deliveryFeeCtrl.text.isEmpty) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Delivery fee required')));
        return false;
      }
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_validate()) return;

    setState(() => _isSubmitting = true);
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) {
      setState(() => _isSubmitting = false);
      return;
    }

    final deliveryFee = double.tryParse(_deliveryFeeCtrl.text);
    final provider = context.read<PharmacyRequestProvider>();

    bool success = false;
    try {
      if (widget.mode == QuoteEditorMode.createFromRequest &&
          widget.requestId != null) {
        final payload = PharmacyQuoteMapper.toCreateOrderPayload(
          _items,
          deliveryType: _deliveryType,
          deliveryAddress: _deliveryAddressCtrl.text.isNotEmpty
              ? _deliveryAddressCtrl.text
              : null,
          deliveryFee: deliveryFee,
          estimatedDeliveryTime: _estimatedDeliveryTime,
          deliveryPhoneNumber: _deliveryPhoneCtrl.text.isNotEmpty
              ? _deliveryPhoneCtrl.text
              : null,
          notes: _notesCtrl.text.isNotEmpty ? _notesCtrl.text : null,
        );
        success = await provider.createOrderFromRequest(
          auth.accessToken!,
          widget.requestId!,
          payload['items'] as List<Map<String, dynamic>>,
          deliveryType: payload['deliveryType'] as String?,
          deliveryAddress: payload['deliveryAddress'] as String?,
          deliveryFee: payload['deliveryFee'] as double?,
          estimatedDeliveryTime: payload['estimatedDeliveryTime'] as String?,
          deliveryPhoneNumber: payload['deliveryPhoneNumber'] as String?,
          notes: payload['notes'] as String?,
        );
      } else if (widget.mode == QuoteEditorMode.updateQuote &&
          widget.orderId != null) {
        final payload = PharmacyQuoteMapper.toUpdateQuotePayload(
          _items,
          deliveryFee: deliveryFee,
          estimatedDeliveryTime: _estimatedDeliveryTime,
        );
        final orderProvider = context.read<PharmacyOrderProvider>();
        success = await orderProvider.updateQuote(
          auth.accessToken!,
          widget.orderId!,
          payload['items'] as List<Map<String, dynamic>>,
          deliveryFee: payload['deliveryFee'] as double?,
          estimatedDeliveryTime: payload['estimatedDeliveryTime'] as String?,
        );
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.error ?? 'Submission failed'),
          ),
        );
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
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSummarySection(theme),
            const SizedBox(height: 16),
            if (widget.mode == QuoteEditorMode.createFromRequest)
              _buildPrescriptionsSection(theme),
            const SizedBox(height: 16),
            _buildMedicinesSection(theme),
            const SizedBox(height: 16),
            _buildDeliverySection(theme),
            const SizedBox(height: 16),
            _buildNotesSection(theme),
            const SizedBox(height: 80),
          ],
        ),
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

  Widget _buildDeliverySection(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Delivery',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _deliveryType,
              decoration: const InputDecoration(
                labelText: 'Delivery Type',
                isDense: true,
                border: OutlineInputBorder(),
              ),
              items: ['PICKUP', 'DELIVERY']
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: (v) => setState(() => _deliveryType = v),
            ),
            if (_deliveryType == 'DELIVERY') ...[
              const SizedBox(height: 8),
              TextFormField(
                controller: _deliveryFeeCtrl,
                decoration: const InputDecoration(
                  labelText: 'Delivery Fee',
                  prefixText: '\$',
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                onChanged: (_) => _markDirty(),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _deliveryAddressCtrl,
                decoration: const InputDecoration(
                  labelText: 'Delivery Address',
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => _markDirty(),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _deliveryPhoneCtrl,
                decoration: const InputDecoration(
                  labelText: 'Delivery Phone',
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
                onChanged: (_) => _markDirty(),
              ),
            ],
          ],
        ),
      ),
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
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.mode == QuoteEditorMode.createFromRequest
                    ? 'Submit Quote'
                    : 'Update Quote'),
          ),
        ),
      ),
    );
  }

  void _markDirty() {
    if (!_isDirty) setState(() => _isDirty = true);
  }
}
