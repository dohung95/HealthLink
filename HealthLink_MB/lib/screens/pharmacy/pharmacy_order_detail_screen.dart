import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/pharmacy/pharmacy_order.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';
import '../../providers/pharmacy/pharmacy_order_provider.dart';
import '../../providers/pharmacy/pharmacy_request_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';
import '../../utils/pharmacy/pharmacy_workflow.dart';
import '../../widgets/pharmacy/order_status_chip.dart';
import '../chat/chat_room_screen.dart';
import 'pharmacy_quote_editor_screen.dart';

class PharmacyOrderDetailScreen extends StatefulWidget {
  const PharmacyOrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<PharmacyOrderDetailScreen> createState() =>
      _PharmacyOrderDetailScreenState();
}

class _PharmacyOrderDetailScreenState extends State<PharmacyOrderDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDetail());
  }

  Future<void> _loadDetail() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken != null) {
      await context.read<PharmacyOrderProvider>().fetchOrderDetail(
        auth.accessToken!,
        widget.orderId,
      );
    }
  }

  Future<void> _updateStatus(String newStatus, {String? cancelReason}) async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
    final success = await context
        .read<PharmacyOrderProvider>()
        .updateOrderStatus(
          auth.accessToken!,
          widget.orderId,
          newStatus,
          cancelReason: cancelReason,
        );
    if (success && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Order $newStatus')));
      final orderProvider = context.read<PharmacyOrderProvider>();
      final workflowProvider = context.read<PharmacyWorkflowProvider>();
      final inventoryProvider = context.read<PharmacyInventoryProvider>();
      await Future.wait([
        orderProvider.fetchOrderDetail(auth.accessToken!, widget.orderId),
        orderProvider.refreshOrders(auth.accessToken!, pharmacyId),
        workflowProvider.refresh(auth.accessToken!, pharmacyId),
        if (newStatus == 'READY') inventoryProvider.refresh(auth.accessToken!),
      ]);
    }
  }

  void _showStatusActionSheet(PharmacyOrder order) {
    final actions = _getAvailableActions(order);
    if (actions.isEmpty) return;

    final isPickupCompletion =
        order.deliveryType == 'PICKUP' && order.status == 'READY';
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Update Status',
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
            ),
            ...actions.map(
              (action) => ListTile(
                leading: Icon(action.icon, color: action.color),
                title: Text(action.label),
                onTap: () async {
                  Navigator.pop(ctx);
                  if (action.value == 'CANCELLED') {
                    _showCancelDialog();
                  } else if (isPickupCompletion &&
                      action.value == 'COMPLETED') {
                    _showPickupCompleteDialog(order);
                  } else {
                    await _updateStatus(action.value);
                  }
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  List<_StatusAction> _getAvailableActions(PharmacyOrder order) {
    final workflowActions = _actionsFromWorkItem(order);
    if (workflowActions != null) return workflowActions;
    return _fallbackActions(order);
  }

  List<_StatusAction>? _actionsFromWorkItem(PharmacyOrder order) {
    final workflowProvider = context.read<PharmacyWorkflowProvider>();
    final matches = workflowProvider.workItems.where(
      (item) =>
          item.sourceId == order.orderId &&
          (item.sourceType == WorkItemSourceType.pickupOrder ||
              item.sourceType == WorkItemSourceType.deliveryOrder),
    );
    if (matches.isEmpty || matches.first.availableActions.isEmpty) return null;

    final actions = <_StatusAction>[];
    for (final action in matches.first.availableActions) {
      switch (action.toUpperCase()) {
        case 'MARK_READY':
          actions.add(
            const _StatusAction(
              'Mark Ready',
              'READY',
              Icons.check_circle_outline,
              Colors.teal,
            ),
          );
          break;
        case 'START_SHIPPING':
          actions.add(
            const _StatusAction(
              'Start Shipping',
              'SHIPPING',
              Icons.local_shipping,
              Colors.orange,
            ),
          );
          break;
        case 'CANCEL':
          actions.add(
            const _StatusAction(
              'Cancel',
              'CANCELLED',
              Icons.cancel,
              Colors.red,
            ),
          );
          break;
        case 'CONFIRM':
          actions.add(
            const _StatusAction(
              'Confirm',
              'CONFIRMED',
              Icons.check_circle,
              Colors.green,
            ),
          );
          break;
        case 'DELIVER':
          actions.add(
            const _StatusAction(
              'Mark Delivered',
              'DELIVERED',
              Icons.check_circle,
              Colors.green,
            ),
          );
          break;
        case 'COMPLETE':
          actions.add(
            const _StatusAction(
              'Mark Complete',
              'COMPLETED',
              Icons.task_alt,
              Colors.green,
            ),
          );
          break;
      }
    }
    return actions.isEmpty ? null : actions;
  }

  List<_StatusAction> _fallbackActions(PharmacyOrder order) {
    if (!PharmacyWorkflow.canProgressOrder(order)) return [];
    final next = PharmacyWorkflow.getNextOrderStatus(
      status: order.status,
      deliveryType: order.deliveryType ?? 'PICKUP',
    );
    switch (next) {
      case 'COMPLETED':
        return const [
          _StatusAction(
            'Mark Complete',
            'COMPLETED',
            Icons.task_alt,
            Colors.green,
          ),
        ];
      case 'SHIPPING':
        return const [
          _StatusAction(
            'Start Shipping',
            'SHIPPING',
            Icons.local_shipping,
            Colors.orange,
          ),
        ];
      case 'DELIVERED':
        return const [
          _StatusAction(
            'Mark Delivered',
            'DELIVERED',
            Icons.check_circle,
            Colors.green,
          ),
        ];
      default:
        return [];
    }
  }

  void _showCancelDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Order'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Cancel reason',
            hintText: 'Required',
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Back'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.pop(ctx);
                _updateStatus(
                  'CANCELLED',
                  cancelReason: controller.text.trim(),
                );
              }
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Cancel Order'),
          ),
        ],
      ),
    );
  }

  void _showPickupCompleteDialog(PharmacyOrder order) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Pickup'),
        content: Text(
          'Mark order ${order.orderNumber} as picked up?\n\n'
          'Patient: ${order.patientName}\n'
          'Items: ${order.items.length}\n'
          'Total: ${_currency(order.totalAmount)}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _updateStatus('COMPLETED');
            },
            child: const Text('Confirm Pickup'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<PharmacyOrderProvider>();
    final order = provider.currentOrder;
    final canEditQuote =
        order != null &&
        (order.status == 'PENDING' || order.status == 'REVISION_REQUESTED');
    final hasStatusActions =
        order != null &&
        (_actionsFromWorkItem(order) != null ||
            _fallbackActions(order).isNotEmpty);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Detail'),
        actions: [
          if (canEditQuote || hasStatusActions)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) {
                if (value == 'quote') {
                  _showQuoteDialog(order);
                } else if (value == 'status') {
                  _showStatusActionSheet(order);
                }
              },
              itemBuilder: (_) => [
                if (hasStatusActions)
                  const PopupMenuItem(
                    value: 'status',
                    child: ListTile(
                      leading: Icon(Icons.update),
                      title: Text('Update Status'),
                    ),
                  ),
                if (canEditQuote)
                  const PopupMenuItem(
                    value: 'quote',
                    child: ListTile(
                      leading: Icon(Icons.edit),
                      title: Text('Edit Quote'),
                    ),
                  ),
              ],
            ),
        ],
      ),
      body: provider.isLoading && order == null
          ? const Center(child: CircularProgressIndicator())
          : order == null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(provider.error ?? 'Order not found'),
                  FilledButton.tonal(
                    onPressed: _loadDetail,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : _buildContent(order, theme),
    );
  }

  Widget _buildContent(PharmacyOrder order, ThemeData theme) {
    final dateFmt = DateFormat('dd/MM/yyyy HH:mm');
    return DefaultTabController(
      length: 3,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final title = Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderNumber,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Created ${dateFmt.format(order.createdAt)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                );
                if (constraints.maxWidth < 360) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      title,
                      const SizedBox(height: 8),
                      OrderStatusChip(status: order.status),
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: title),
                    const SizedBox(width: 12),
                    OrderStatusChip(status: order.status),
                  ],
                );
              },
            ),
          ),
          const TabBar(
            tabs: [
              Tab(text: 'Summary'),
              Tab(text: 'Items'),
              Tab(text: 'Timeline'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildSummaryTab(order, theme, dateFmt),
                _buildItemsTab(order, theme),
                _buildTimelineTab(order, theme),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryTab(
    PharmacyOrder order,
    ThemeData theme,
    DateFormat dateFmt,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle(theme, 'Order'),
        _detailRow(
          'Order status',
          PharmacyWorkflow.workflowLabel(order.status),
        ),
        _detailRow(
          'Fulfillment',
          PharmacyWorkflow.fulfillmentLabel(order.deliveryType ?? 'PICKUP'),
        ),
        const Divider(height: 28),
        _sectionTitle(theme, 'Patient'),
        _detailRow('Patient', order.patientName),
        if (order.deliveryPhoneNumber != null)
          _detailRow('Patient contact', order.deliveryPhoneNumber!),
        if (order.deliveryAddress != null)
          _detailRow('Delivery address', order.deliveryAddress!),
        const Divider(height: 28),
        _sectionTitle(theme, 'Payment'),
        _detailRow(
          'Payment',
          PharmacyWorkflow.paymentLabel(order.paymentStatus ?? 'UNPAID'),
        ),
        if (order.paymentMethod != null)
          _detailRow('Method', order.paymentMethod!),
        if (order.paidAt != null)
          _detailRow('Paid at', dateFmt.format(order.paidAt!)),
        if (order.deliveryFee != null)
          _detailRow('Delivery fee', _currency(order.deliveryFee!)),
        if (order.notes != null || order.pharmacistNotes != null) ...[
          const Divider(height: 28),
          _sectionTitle(theme, 'Notes'),
          if (order.notes != null) _detailRow('Patient notes', order.notes!),
          if (order.pharmacistNotes != null)
            _detailRow('Pharmacist notes', order.pharmacistNotes!),
        ],
        if (order.pharmacyRequestId != null) ...[
          const Divider(height: 28),
          _buildChatHistoryButton(theme, order),
        ],
      ],
    );
  }

  Widget _buildItemsTab(PharmacyOrder order, ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle(theme, 'Items'),
        if (order.items.isEmpty)
          Text(
            'No items in this order.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          )
        else
          ...order.items.map(
            (item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.medicationName,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Text(
                          item.unitPrice == null
                              ? 'Quantity ${item.quantity}'
                              : 'Quantity ${item.quantity} x ${_currency(item.unitPrice!)}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                      if (item.totalPrice != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          _currency(item.totalPrice!),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        const Divider(height: 28),
        _amountRow(theme, 'Medicine total', _currency(order.medicineAmount)),
        if (order.deliveryFee != null)
          _amountRow(theme, 'Delivery fee', _currency(order.deliveryFee!)),
        const Divider(height: 20),
        _amountRow(
          theme,
          'Total',
          _currency(order.totalAmount),
          emphasized: true,
        ),
        if (order.platformFee != null || order.pharmacyEarning != null) ...[
          const Divider(height: 28),
          _sectionTitle(theme, 'Earnings'),
          if (order.platformFee != null)
            _amountRow(theme, 'Platform fee', _currency(order.platformFee!)),
          if (order.pharmacyEarning != null)
            _amountRow(
              theme,
              'Pharmacy earning',
              _currency(order.pharmacyEarning!),
              emphasized: true,
            ),
        ],
        if (order.pharmacyRequestId != null) ...[
          const Divider(height: 28),
          _buildChatHistoryButton(theme, order),
        ],
      ],
    );
  }

  Widget _buildTimelineTab(PharmacyOrder order, ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle(theme, 'Order timeline'),
        const SizedBox(height: 4),
        _timelineItem(theme, 'Created', order.createdAt),
        _timelineItem(theme, 'Confirmed', order.confirmedAt),
        _timelineItem(theme, 'Preparing', order.preparingAt),
        _timelineItem(theme, 'Shipped', order.shippedAt),
        _timelineItem(theme, 'Delivered', order.deliveredAt),
        _timelineItem(theme, 'Paid', order.paidAt),
        if (order.cancelReason != null)
          _timelineItem(
            theme,
            'Cancelled: ${order.cancelReason}',
            order.cancelledAt,
            color: theme.colorScheme.error,
          ),
      ],
    );
  }

  Widget _buildChatHistoryButton(ThemeData theme, PharmacyOrder order) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => _openChatHistory(order),
        icon: const Icon(Icons.history),
        label: const Text('Chat history'),
      ),
    );
  }

  Future<void> _openChatHistory(PharmacyOrder order) async {
    if (order.pharmacyRequestId == null) return;
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;

    final requestProvider = context.read<PharmacyRequestProvider>();
    await requestProvider.fetchChatRoom(
      auth.accessToken!,
      order.pharmacyRequestId.toString(),
      auth.userId!,
    );
    if (!mounted) return;

    final room = requestProvider.chatRoom;
    if (room != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ChatRoomScreen(
            conversation: room,
            readOnly: true,
            title: 'Chat history',
            readOnlyMessage: 'This pharmacy conversation is read-only.',
          ),
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            requestProvider.chatError ?? 'Chat room is not available',
          ),
          action: SnackBarAction(
            label: 'Retry',
            onPressed: () => _openChatHistory(order),
          ),
        ),
      );
    }
  }

  Widget _sectionTitle(ThemeData theme, String label) {
    return Text(
      label,
      style: theme.textTheme.labelLarge?.copyWith(
        color: theme.colorScheme.primary,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final labelText = Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w600),
          );
          final valueText = Text(value, textAlign: TextAlign.end);
          if (constraints.maxWidth < 360) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [labelText, const SizedBox(height: 2), valueText],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 2, child: labelText),
              const SizedBox(width: 12),
              Expanded(flex: 3, child: valueText),
            ],
          );
        },
      ),
    );
  }

  Widget _amountRow(
    ThemeData theme,
    String label,
    String amount, {
    bool emphasized = false,
  }) {
    final style = emphasized
        ? theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)
        : theme.textTheme.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              amount,
              textAlign: TextAlign.end,
              style: style?.copyWith(
                color: emphasized ? theme.colorScheme.primary : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineItem(
    ThemeData theme,
    String label,
    DateTime? timestamp, {
    Color? color,
  }) {
    final markerColor = color ?? theme.colorScheme.primary;
    final marker = Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: timestamp == null
            ? theme.colorScheme.surfaceContainerHighest
            : markerColor,
      ),
    );
    final date = timestamp == null
        ? null
        : Text(
            DateFormat('dd/MM HH:mm').format(timestamp),
            style: theme.textTheme.bodySmall,
          );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < 360) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    marker,
                    const SizedBox(width: 12),
                    Expanded(child: Text(label)),
                  ],
                ),
                if (date != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 24, top: 2),
                    child: date,
                  ),
              ],
            );
          }
          return Row(
            children: [
              marker,
              const SizedBox(width: 12),
              Expanded(child: Text(label)),
              if (date != null) ...[const SizedBox(width: 12), date],
            ],
          );
        },
      ),
    );
  }

  void _showQuoteDialog(PharmacyOrder order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.updateQuote,
          orderId: widget.orderId,
        ),
      ),
    );
  }

  static String _currency(double amount) => '\$${amount.toStringAsFixed(2)}';
}

class _StatusAction {
  const _StatusAction(this.label, this.value, this.icon, this.color);

  final String label;
  final String value;
  final IconData icon;
  final Color color;
}
