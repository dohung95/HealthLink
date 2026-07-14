import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../utils/pharmacy/pharmacy_workflow.dart';
import '../../utils/pharmacy/pharmacy_notification_target.dart';
import '../../widgets/pharmacy/notification_attention_card.dart';
import 'pharmacy_request_detail_screen.dart';
import 'pharmacy_order_detail_screen.dart';

class PharmacyRequestsScreen extends StatefulWidget {
  const PharmacyRequestsScreen({super.key, this.notificationAttention});

  final ValueListenable<NotificationAttention?>? notificationAttention;

  @override
  State<PharmacyRequestsScreen> createState() => _PharmacyRequestsScreenState();
}

class _PharmacyRequestsScreenState extends State<PharmacyRequestsScreen> {
  static const _estimatedRowExtent = 128.0;

  final ScrollController _scrollController = ScrollController();
  final Map<String, BuildContext> _itemContexts = {};
  Timer? _attentionTimer;
  String? _highlightedId;
  String? _attentionMessage;
  @override
  void initState() {
    super.initState();
    _subscribeAttention();
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensureAuth());
  }

  @override
  void didUpdateWidget(covariant PharmacyRequestsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.notificationAttention != widget.notificationAttention) {
      _unsubscribeAttention(oldWidget.notificationAttention);
      _subscribeAttention();
    }
  }

  @override
  void dispose() {
    _unsubscribeAttention(widget.notificationAttention);
    _attentionTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _subscribeAttention() {
    widget.notificationAttention?.addListener(_onAttention);
    final attention = widget.notificationAttention?.value;
    if (attention != null) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _handleAttention(attention),
      );
    }
  }

  void _unsubscribeAttention(
    ValueListenable<NotificationAttention?>? notifier,
  ) {
    notifier?.removeListener(_onAttention);
  }

  void _onAttention() {
    final attention = widget.notificationAttention?.value;
    if (attention != null) _handleAttention(attention);
  }

  Future<void> _ensureAuth() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    if (auth.pharmacyProfile == null) {
      await auth.fetchProfile();
    }
  }

  Future<void> _refresh() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
    await context.read<PharmacyWorkflowProvider>().refresh(
      auth.accessToken!,
      pharmacyId,
    );
  }

  Future<void> _handleAttention(NotificationAttention attention) async {
    final target = attention.target;
    if (target.tabIndex != PharmacyNotificationTarget.tabRequests ||
        (target.detailType != 'request' &&
            target.detailType != 'request-order')) {
      return;
    }

    final item = await _findAttentionItem(attention, refreshIfMissing: true);
    if (!mounted ||
        widget.notificationAttention?.value?.sequence != attention.sequence) {
      return;
    }
    if (item == null) {
      _attentionTimer?.cancel();
      setState(() {
        _highlightedId = null;
        _attentionMessage = 'Related item is no longer active';
      });
      return;
    }

    final key = _attentionKey(item, target.detailType!);
    final items = PharmacyWorkflow.actionableRequests(
      context.read<PharmacyWorkflowProvider>().workItems,
    );
    setState(() {
      _attentionMessage = null;
      _highlightedId = key;
    });
    _scrollToItem(key, items.indexOf(item));
    _attentionTimer?.cancel();
    _attentionTimer = Timer(const Duration(seconds: 4), () {
      if (mounted &&
          widget.notificationAttention?.value?.sequence == attention.sequence) {
        setState(() => _highlightedId = null);
      }
    });
  }

  Future<PharmacyWorkItem?> _findAttentionItem(
    NotificationAttention attention, {
    required bool refreshIfMissing,
  }) async {
    PharmacyWorkItem? find() {
      final id = attention.target.detailId;
      if (id == null) return null;
      final items = PharmacyWorkflow.actionableRequests(
        context.read<PharmacyWorkflowProvider>().workItems,
      );
      return items.cast<PharmacyWorkItem?>().firstWhere(
        (item) => attention.target.detailType == 'request'
            ? item!.requestId.toString() == id
            : item!.orderId.toString() == id,
        orElse: () => null,
      );
    }

    final initial = find();
    if (initial != null || !refreshIfMissing) return initial;
    await _refresh();
    return find();
  }

  String _attentionKey(PharmacyWorkItem item, String detailType) {
    return detailType == 'request'
        ? 'request-${item.requestId}'
        : 'request-order-${item.orderId}';
  }

  void _scrollToItem(String key, int index) {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted || !_scrollController.hasClients) return;
      final position = _scrollController.position;
      final offset = (index * _estimatedRowExtent).clamp(
        0.0,
        position.maxScrollExtent,
      );
      await _scrollController.animateTo(
        offset,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
      if (!mounted) return;
      final itemContext = _itemContexts[key];
      if (itemContext != null && itemContext.mounted) {
        Scrollable.ensureVisible(itemContext);
      }
    });
  }

  /// Navigate to the appropriate detail screen for a work item.
  void _openDetail(PharmacyWorkItem item) {
    if (item.requestId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PharmacyRequestDetailScreen(
            requestId: item.requestId!.toString(),
          ),
        ),
      );
    } else if (item.orderId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) =>
              PharmacyOrderDetailScreen(orderId: item.orderId!.toString()),
        ),
      );
    }
    // Both absent: card is disabled, no navigation
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workflow = context.watch<PharmacyWorkflowProvider>();
    final items = PharmacyWorkflow.actionableRequests(workflow.workItems);
    final loading = workflow.isLoading && items.isEmpty;
    final error = workflow.error;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Requests & Work Items'),
        centerTitle: true,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null && items.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 48,
                    color: theme.colorScheme.error,
                  ),
                  const SizedBox(height: 12),
                  Text(error, style: TextStyle(color: theme.colorScheme.error)),
                  FilledButton.tonal(
                    onPressed: _refresh,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                if (_attentionMessage != null)
                  MaterialBanner(
                    content: Text(_attentionMessage!),
                    actions: const [SizedBox.shrink()],
                  ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refresh,
                    child: items.isEmpty
                        ? ListView(
                            // Keep list for RefreshIndicator to work
                            children: [
                              SizedBox(
                                height:
                                    MediaQuery.of(context).size.height * 0.6,
                                child: Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.assignment,
                                        size: 64,
                                        color: theme.colorScheme.outlineVariant,
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        'No requests requiring action',
                                        style: theme.textTheme.titleMedium,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            itemCount: items.length,
                            itemBuilder: (_, i) => Builder(
                              builder: (itemContext) {
                                _itemContexts[_attentionKey(
                                      items[i],
                                      items[i].requestId != null
                                          ? 'request'
                                          : 'request-order',
                                    )] =
                                    itemContext;
                                return _buildWorkItemCard(items[i], theme);
                              },
                            ),
                          ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildWorkItemCard(PharmacyWorkItem item, ThemeData theme) {
    final timeStr = _formatTimeAgo(item.createdAt);
    final workflow = PharmacyWorkflow.workflowLabel(item.workflowStage);
    final payment = item.paymentStatus != null
        ? PharmacyWorkflow.paymentLabel(item.paymentStatus!)
        : null;
    final fulfillment = item.deliveryType != null
        ? PharmacyWorkflow.fulfillmentLabel(item.deliveryType!)
        : null;

    String? subtitle;
    if (item.sourceType == WorkItemSourceType.revision) {
      subtitle = item.revisionReason;
    } else if (item.sourceType == WorkItemSourceType.deliveryQuote) {
      subtitle = 'Total: \$${item.totalAmount?.toStringAsFixed(2) ?? '—'}';
    }

    final hasNavigation = item.requestId != null || item.orderId != null;

    final key = _attentionKey(
      item,
      item.requestId != null ? 'request' : 'request-order',
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: NotificationAttentionCard(
        key: ValueKey(key),
        highlighted: _highlightedId == key,
        onTap: hasNavigation ? () => _openDetail(item) : null,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const CircleAvatar(
                          radius: 16,
                          child: Icon(Icons.person),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          item.patientName,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _workTypeChip(item.sourceType),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  if (workflow.isNotEmpty) ...[
                    _miniChip(theme, workflow, theme.colorScheme.primary),
                    const SizedBox(width: 4),
                  ],
                  if (payment != null) ...[
                    _miniChip(theme, payment, Colors.green),
                    const SizedBox(width: 4),
                  ],
                  if (fulfillment != null)
                    _miniChip(theme, fulfillment, Colors.indigo),
                ],
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(timeStr, style: theme.textTheme.bodySmall),
                  if (item.availableActions.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    Text(
                      item.availableActions.join(', '),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _workTypeChip(WorkItemSourceType sourceType) {
    final (label, color) = switch (sourceType) {
      WorkItemSourceType.consultation => ('Consultation', Colors.blue),
      WorkItemSourceType.revision => ('Revision', Colors.orange),
      WorkItemSourceType.deliveryQuote => ('Quote', Colors.teal),
      WorkItemSourceType.deliveryContactReview => (
        'Contact Review',
        Colors.purple,
      ),
      WorkItemSourceType.pickupOrder => ('Pickup', Colors.brown),
      WorkItemSourceType.deliveryOrder => ('Delivery', Colors.indigo),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _miniChip(ThemeData theme, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label, style: TextStyle(fontSize: 9, color: color)),
    );
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
