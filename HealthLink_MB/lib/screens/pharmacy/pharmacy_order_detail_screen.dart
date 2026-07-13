import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_order_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';
import '../../models/pharmacy/pharmacy_order.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../models/chat/conversation.dart';
import '../../widgets/pharmacy/order_status_chip.dart';
import '../../utils/pharmacy/pharmacy_workflow.dart';
import '../chat/chat_room_screen.dart';
import 'pharmacy_quote_editor_screen.dart';

class PharmacyOrderDetailScreen extends StatefulWidget {
  final String orderId;
  const PharmacyOrderDetailScreen({super.key, required this.orderId});

  @override
  State<PharmacyOrderDetailScreen> createState() =>
      _PharmacyOrderDetailScreenState();
}

class _PharmacyOrderDetailScreenState
    extends State<PharmacyOrderDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDetail());
  }

  Future<void> _loadDetail() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken != null) {
      await context
          .read<PharmacyOrderProvider>()
          .fetchOrderDetail(auth.accessToken!, widget.orderId);
    }
  }

  Future<void> _updateStatus(String newStatus,
      {String? cancelReason}) async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
    final success =
        await context.read<PharmacyOrderProvider>().updateOrderStatus(
              auth.accessToken!,
              widget.orderId,
              newStatus,
              cancelReason: cancelReason,
            );
    if (success && mounted) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Order $newStatus')),
      );
      final orderProvider = context.read<PharmacyOrderProvider>();
      final workflowProvider = context.read<PharmacyWorkflowProvider>();
      final inventoryProvider = context.read<PharmacyInventoryProvider>();
      await Future.wait([
        orderProvider.fetchOrderDetail(auth.accessToken!, widget.orderId),
        orderProvider.refreshOrders(auth.accessToken!, pharmacyId),
        workflowProvider.refresh(auth.accessToken!, pharmacyId),
        if (newStatus == 'READY')
          inventoryProvider.refresh(auth.accessToken!),
      ]);
    }
  }

  void _showStatusActionSheet(PharmacyOrder order) {
    final actions = _getAvailableActions(order);
    if (actions.isEmpty) return;

    final isPickupCompletion = order.deliveryType == 'PICKUP' &&
        order.status == 'READY';

    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Update Status',
                  style: Theme.of(ctx).textTheme.titleMedium),
            ),
            ...actions.map((a) => ListTile(
                  leading: Icon(a.icon, color: a.color),
                  title: Text(a.label),
                  onTap: () async {
                    Navigator.pop(ctx);
                    if (a.value == 'CANCELLED') {
                      _showCancelDialog();
                    } else if (isPickupCompletion && a.value == 'COMPLETED') {
                      _showPickupCompleteDialog(order);
                    } else {
                      await _updateStatus(a.value);
                    }
                  },
                )),
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
    final workItem = workflowProvider.workItems.where((w) =>
        w.sourceId == order.orderId &&
        (w.sourceType == WorkItemSourceType.pickupOrder ||
            w.sourceType == WorkItemSourceType.deliveryOrder)).toList();
    if (workItem.isEmpty) return null;
    final item = workItem.first;
    if (item.availableActions.isEmpty) return null;

    final actions = <_StatusAction>[];
    for (final a in item.availableActions) {
      switch (a.toUpperCase()) {
        case 'MARK_READY':
          actions.add(_StatusAction('Mark Ready', 'READY',
              Icons.check_circle_outline, Colors.teal));
          break;
        case 'START_SHIPPING':
          actions.add(_StatusAction('Start Shipping', 'SHIPPING',
              Icons.local_shipping, Colors.orange));
          break;
        case 'CANCEL':
          actions.add(_StatusAction(
              'Cancel', 'CANCELLED', Icons.cancel, Colors.red));
          break;
        case 'CONFIRM':
          actions.add(_StatusAction(
              'Confirm', 'CONFIRMED', Icons.check_circle, Colors.green));
          break;
        case 'DELIVER':
          actions.add(_StatusAction('Mark Delivered', 'DELIVERED',
              Icons.check_circle, Colors.green));
          break;
        case 'COMPLETE':
          actions.add(_StatusAction(
              'Mark Complete', 'COMPLETED', Icons.task_alt, Colors.green));
          break;
      }
    }
    return actions.isNotEmpty ? actions : null;
  }

  List<_StatusAction> _fallbackActions(PharmacyOrder order) {
    final canProgress = PharmacyWorkflow.canProgressOrder(order);
    if (!canProgress) return [];

    final next = PharmacyWorkflow.getNextOrderStatus(
      status: order.status,
      deliveryType: order.deliveryType ?? 'PICKUP',
    );

    if (next == null) return [];

    switch (next) {
      case 'COMPLETED':
        return [
          _StatusAction('Mark Complete', 'COMPLETED',
              Icons.task_alt, Colors.green),
        ];
      case 'SHIPPING':
        return [
          _StatusAction('Start Shipping', 'SHIPPING',
              Icons.local_shipping, Colors.orange),
        ];
      case 'DELIVERED':
        return [
          _StatusAction('Mark Delivered', 'DELIVERED',
              Icons.check_circle, Colors.green),
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
              child: const Text('Back')),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.pop(ctx);
                _updateStatus('CANCELLED',
                    cancelReason: controller.text.trim());
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
          'Total: \$${order.totalAmount.toStringAsFixed(2)}',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
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
    final canEditQuote = order != null &&
        (order.status == 'PENDING' || order.status == 'REVISION_REQUESTED');
    final hasStatusActions = order != null &&
        (_actionsFromWorkItem(order) != null ||
            _fallbackActions(order).isNotEmpty);
    final hasOrderActions = canEditQuote || hasStatusActions;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Detail'),
        actions: [
          if (hasOrderActions)
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
                          title: Text('Update Status'))),
                if (canEditQuote)
                  const PopupMenuItem(
                      value: 'quote',
                      child: ListTile(
                          leading: Icon(Icons.edit),
                          title: Text('Edit Quote'))),
              ],
            ),
        ],
      ),
      body: provider.isLoading && provider.currentOrder == null
          ? const Center(child: CircularProgressIndicator())
          : provider.currentOrder == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(provider.error ?? 'Order not found'),
                      FilledButton.tonal(
                          onPressed: _loadDetail,
                          child: const Text('Retry')),
                    ],
                  ),
                )
              : _buildContent(order!, theme),
      floatingActionButton: order != null &&
              order.pharmacyRequestId != null &&
              order.status != 'CANCELLED' &&
              order.status != 'COMPLETED'
          ? FloatingActionButton(
              heroTag: 'chat_fab',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChatRoomScreen(
                      conversation: Conversation(
                        id: 'request-${order.pharmacyRequestId!}',
                        partnerId: order.patientId,
                        partnerName: order.patientName,
                        lastMessage: '',
                        lastMessageTime: DateTime.now(),
                        isLastMessageRead: true,
                      ),
                    ),
                  ),
                );
              },
              child: const Icon(Icons.chat),
            )
          : null,
    );
  }

  Widget _buildContent(PharmacyOrder order, ThemeData theme) {
    final dateFmt = DateFormat('dd/MM/yyyy HH:mm');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(order.orderNumber,
                    style: theme.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold)),
              ),
              OrderStatusChip(status: order.status),
            ],
          ),
          const SizedBox(height: 4),
          Text('Created: ${dateFmt.format(order.createdAt)}',
              style: theme.textTheme.bodySmall),
          const Divider(height: 24),

          Text('WORKFLOW',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: theme.colorScheme.primary)),
          const SizedBox(height: 4),
          _infoRow('Status', PharmacyWorkflow.workflowLabel(order.status)),
          _infoRow('Fulfillment',
              PharmacyWorkflow.fulfillmentLabel(order.deliveryType ?? 'PICKUP')),
          const Divider(height: 16),

          Text('PATIENT',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: theme.colorScheme.primary)),
          const SizedBox(height: 4),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(order.patientName),
            subtitle: order.pharmacyPhone != null
                ? Text(order.pharmacyPhone!)
                : null,
          ),
          const Divider(height: 16),

          if (order.deliveryType != null) ...[
            Text('DELIVERY',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            _infoRow('Type', order.deliveryType!),
            if (order.deliveryAddress != null)
              _infoRow('Address', order.deliveryAddress!),
            if (order.deliveryPhoneNumber != null)
              _infoRow('Phone', order.deliveryPhoneNumber!),
            if (order.deliveryFee != null)
              _infoRow('Delivery fee', '\$${order.deliveryFee!.toStringAsFixed(2)}'),
            const Divider(height: 16),
          ],

          Text('PAYMENT',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: theme.colorScheme.primary)),
          const SizedBox(height: 4),
          _infoRow('Status',
              PharmacyWorkflow.paymentLabel(order.paymentStatus ?? 'UNPAID')),
          if (order.paymentMethod != null)
            _infoRow('Method', order.paymentMethod!),
          if (order.paidAt != null)
            _infoRow('Paid at', dateFmt.format(order.paidAt!)),
          const Divider(height: 16),

          Text('ITEMS',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: theme.colorScheme.primary)),
          const SizedBox(height: 4),
          ...order.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.medicationName,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w500)),
                          if (item.unitPrice != null)
                            Text(
                                'Qty: ${item.quantity} × \$${item.unitPrice!.toStringAsFixed(2)}',
                                style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                    if (item.totalPrice != null)
                      Text('\$${item.totalPrice!.toStringAsFixed(2)}',
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
              )),
          const Divider(height: 16),

          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Medicine total', style: theme.textTheme.bodyMedium),
            Text('\$${order.medicineAmount.toStringAsFixed(2)}',
                style: theme.textTheme.bodyMedium),
          ]),
          if (order.deliveryFee != null) ...[
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Delivery fee', style: theme.textTheme.bodyMedium),
              Text('\$${order.deliveryFee!.toStringAsFixed(2)}',
                  style: theme.textTheme.bodyMedium),
            ]),
          ],
          const Divider(),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('TOTAL',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            Text('\$${order.totalAmount.toStringAsFixed(2)}',
                style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary)),
          ]),

          if (order.platformFee != null || order.pharmacyEarning != null) ...[
            const Divider(height: 16),
            Text('EARNINGS',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            if (order.platformFee != null)
              _infoRow(
                  'Platform fee', '\$${order.platformFee!.toStringAsFixed(2)}'),
            if (order.pharmacyEarning != null)
              _infoRow('Pharmacy earning',
                  '\$${order.pharmacyEarning!.toStringAsFixed(2)}'),
          ],
          const Divider(height: 24),

          Text('ACTIVITY TIMELINE',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: theme.colorScheme.primary)),
          const SizedBox(height: 8),
          _timelineItem(theme, 'Created', order.createdAt),
          _timelineItem(theme, 'Confirmed', order.confirmedAt),
          _timelineItem(theme, 'Preparing', order.preparingAt),
          _timelineItem(theme, 'Shipped', order.shippedAt),
          _timelineItem(theme, 'Delivered', order.deliveredAt),
          _timelineItem(theme, 'Paid', order.paidAt),
          if (order.cancelReason != null)
            _timelineItem(theme, 'Cancelled: ${order.cancelReason}',
                order.cancelledAt,
                color: Colors.red),

          if (order.notes != null || order.pharmacistNotes != null) ...[
            const Divider(height: 24),
            if (order.pharmacistNotes != null) ...[
              const SizedBox(height: 8),
              Text('PHARMACIST NOTES',
                  style: theme.textTheme.labelLarge),
              const SizedBox(height: 4),
              Text(order.pharmacistNotes!, style: theme.textTheme.bodyMedium),
            ],
          ],

          if (order.status == 'CANCELLED' || order.status == 'COMPLETED') ...[
            const Divider(height: 24),
            _buildChatButton(theme, order),
          ],

          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildChatButton(ThemeData theme, PharmacyOrder order) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ChatRoomScreen(
                conversation: Conversation(
                  id: 'request-${order.pharmacyRequestId ?? order.orderId}',
                  partnerId: order.patientId,
                  partnerName: order.patientName,
                  lastMessage: '',
                  lastMessageTime: DateTime.now(),
                  isLastMessageRead: true,
                ),
              ),
            ),
          );
        },
        icon: const Icon(Icons.chat),
        label: const Text('Chat with Patient'),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 100,
              child:
                  Text('$label:', style: const TextStyle(fontWeight: FontWeight.w500))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _timelineItem(ThemeData theme, String label, DateTime? dt,
      {Color? color}) {
    final c = color ?? theme.colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: dt != null ? c : theme.colorScheme.surfaceContainerHighest,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label, style: theme.textTheme.bodyMedium),
          ),
          if (dt != null)
            Text(DateFormat('dd/MM HH:mm').format(dt),
                style: theme.textTheme.bodySmall),
        ],
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
}

class _StatusAction {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatusAction(this.label, this.value, this.icon, this.color);
}
