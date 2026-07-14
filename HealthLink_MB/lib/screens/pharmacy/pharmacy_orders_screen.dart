import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_order_provider.dart';
import '../../models/pharmacy/pharmacy_order.dart';
import '../../widgets/pharmacy/order_status_chip.dart';
import '../../utils/pharmacy/pharmacy_notification_target.dart';
import '../../widgets/pharmacy/notification_attention_card.dart';
import 'pharmacy_order_detail_screen.dart';

class PharmacyOrdersScreen extends StatefulWidget {
  const PharmacyOrdersScreen({super.key, this.notificationAttention});

  final ValueListenable<NotificationAttention?>? notificationAttention;

  @override
  State<PharmacyOrdersScreen> createState() => _PharmacyOrdersScreenState();
}

class _PharmacyOrdersScreenState extends State<PharmacyOrdersScreen>
    with SingleTickerProviderStateMixin {
  static const _estimatedRowExtent = 116.0;

  late final TabController _tabController;
  final ScrollController _scrollController = ScrollController();
  final ScrollController _flowScrollController = ScrollController();
  final Map<String, BuildContext> _itemContexts = {};
  Timer? _attentionTimer;
  String? _highlightedId;
  String? _attentionMessage;
  final List<String> _statusFilters = ['ALL', 'COMPLETED', 'CANCELLED'];

  @override
  void initState() {
    super.initState();
    _subscribeAttention();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOrders());
  }

  @override
  void dispose() {
    _unsubscribeAttention(widget.notificationAttention);
    _attentionTimer?.cancel();
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _flowScrollController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant PharmacyOrdersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.notificationAttention != widget.notificationAttention) {
      _unsubscribeAttention(oldWidget.notificationAttention);
      _subscribeAttention();
    }
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

  void _onTabChanged() {
    final provider = context.read<PharmacyOrderProvider>();
    final isFlow = _tabController.index == 0;
    if (provider.flowView != isFlow) {
      provider.setFlowView(isFlow);
      final auth = context.read<AuthProvider>();
      if (auth.accessToken != null) {
        provider.fetchOrders(
          auth.accessToken!,
          auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!,
        );
      }
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final provider = context.read<PharmacyOrderProvider>();
      if (!provider.flowView && provider.hasMore && !provider.isLoading) {
        final auth = context.read<AuthProvider>();
        if (auth.accessToken != null) {
          provider.fetchOrders(
            auth.accessToken!,
            auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!,
          );
        }
      }
    }
  }

  Future<void> _loadOrders() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
    await context.read<PharmacyOrderProvider>().fetchOrders(
      auth.accessToken!,
      pharmacyId,
    );
  }

  Future<void> _refreshOrders() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    await context.read<PharmacyOrderProvider>().refreshOrders(
      auth.accessToken!,
      auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!,
    );
  }

  List<PharmacyOrder> _flowOrders(PharmacyOrderProvider provider) {
    return provider.flowGroupedOrders.values
        .expand((orders) => orders)
        .toList();
  }

  List<PharmacyOrder> _historyOrders(PharmacyOrderProvider provider) {
    return provider.orders
        .where(
          (order) => order.status == 'COMPLETED' || order.status == 'CANCELLED',
        )
        .toList();
  }

  Future<void> _handleAttention(NotificationAttention attention) async {
    final target = attention.target;
    if (target.tabIndex != PharmacyNotificationTarget.tabOrders ||
        target.detailType != 'order' ||
        target.detailId == null) {
      return;
    }

    final provider = context.read<PharmacyOrderProvider>();
    var flow = _flowOrders(provider);
    var history = _historyOrders(provider);
    var isFlowTarget = flow.any(
      (order) => order.orderId.toString() == target.detailId,
    );
    var item = (isFlowTarget ? flow : history)
        .cast<PharmacyOrder?>()
        .firstWhere(
          (order) => order!.orderId.toString() == target.detailId,
          orElse: () => null,
        );

    if (item == null) {
      await _refreshOrders();
      if (!mounted ||
          widget.notificationAttention?.value?.sequence != attention.sequence) {
        return;
      }
      flow = _flowOrders(provider);
      history = _historyOrders(provider);
      isFlowTarget = flow.any(
        (order) => order.orderId.toString() == target.detailId,
      );
      item = (isFlowTarget ? flow : history).cast<PharmacyOrder?>().firstWhere(
        (order) => order!.orderId.toString() == target.detailId,
        orElse: () => null,
      );
    }

    if (item == null) {
      setState(() => _attentionMessage = 'Related item is no longer active');
      return;
    }

    if (provider.flowView != isFlowTarget) {
      provider.setFlowView(isFlowTarget);
      _tabController.animateTo(isFlowTarget ? 0 : 1);
    }

    final key = 'order-${item.orderId}';
    setState(() {
      _attentionMessage = null;
      _highlightedId = key;
    });
    _scrollToItem(
      key,
      (isFlowTarget ? flow : history).indexOf(item),
      isFlowTarget ? _flowScrollController : _scrollController,
    );
    _attentionTimer?.cancel();
    _attentionTimer = Timer(const Duration(seconds: 4), () {
      if (mounted &&
          widget.notificationAttention?.value?.sequence == attention.sequence) {
        setState(() => _highlightedId = null);
      }
    });
  }

  void _scrollToItem(String key, int index, ScrollController controller) {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted || !controller.hasClients) return;
      final position = controller.position;
      final offset = (index * _estimatedRowExtent).clamp(
        0.0,
        position.maxScrollExtent,
      );
      await controller.animateTo(
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Orders'), centerTitle: true),
      body: Column(
        children: [
          if (_attentionMessage != null)
            MaterialBanner(
              content: Text(_attentionMessage!),
              actions: const [SizedBox.shrink()],
            ),
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Flow'),
              Tab(text: 'History'),
            ],
          ),
          if (!context.watch<PharmacyOrderProvider>().flowView)
            _buildFilterChips(theme),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [_buildFlowView(theme), _buildHistoryList(theme)],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(ThemeData theme) {
    final provider = context.watch<PharmacyOrderProvider>();
    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _statusFilters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 6),
        itemBuilder: (_, i) {
          final filter = _statusFilters[i];
          final isSelected = provider.activeFilter == filter;
          return FilterChip(
            label: Text(filter),
            selected: isSelected,
            onSelected: (_) {
              provider.setFilter(filter);
              final auth = context.read<AuthProvider>();
              if (auth.accessToken != null) {
                provider.fetchOrders(
                  auth.accessToken!,
                  auth.pharmacyProfile?['pharmacyId']?.toString() ??
                      auth.userId!,
                );
              }
            },
          );
        },
      ),
    );
  }

  Widget _buildFlowView(ThemeData theme) {
    final provider = context.watch<PharmacyOrderProvider>();

    if (provider.isLoading && provider.orders.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && provider.orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(
              provider.error!,
              style: TextStyle(color: theme.colorScheme.error),
            ),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: _loadOrders,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final grouped = provider.flowGroupedOrders;
    if (grouped.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.receipt_long,
              size: 64,
              color: theme.colorScheme.outlineVariant,
            ),
            const SizedBox(height: 12),
            Text('No active orders', style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        final auth = context.read<AuthProvider>();
        if (auth.accessToken != null) {
          await context.read<PharmacyOrderProvider>().refreshOrders(
            auth.accessToken!,
            auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!,
          );
        }
      },
      child: ListView(
        controller: _flowScrollController,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        children: [
          for (final entry in grouped.entries) ...[
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Row(
                children: [
                  OrderStatusChip(status: entry.key),
                  const SizedBox(width: 8),
                  Text(
                    '${entry.value.length}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            for (final order in entry.value)
              Builder(
                builder: (itemContext) {
                  _itemContexts['order-${order.orderId}'] = itemContext;
                  return _buildOrderCard(order, theme);
                },
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildHistoryList(ThemeData theme) {
    final provider = context.watch<PharmacyOrderProvider>();

    if (provider.isLoading && provider.orders.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && provider.orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(
              provider.error!,
              style: TextStyle(color: theme.colorScheme.error),
            ),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: _loadOrders,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final terminal = provider.orders
        .where((o) => o.status == 'COMPLETED' || o.status == 'CANCELLED')
        .toList();

    if (terminal.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.receipt_long,
              size: 64,
              color: theme.colorScheme.outlineVariant,
            ),
            const SizedBox(height: 12),
            Text('No history yet', style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        final auth = context.read<AuthProvider>();
        if (auth.accessToken != null) {
          await context.read<PharmacyOrderProvider>().refreshOrders(
            auth.accessToken!,
            auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!,
          );
        }
      },
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        itemCount: terminal.length + (provider.hasMore ? 1 : 0),
        itemBuilder: (_, i) {
          if (i >= terminal.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }
          final order = terminal[i];
          return Builder(
            builder: (itemContext) {
              _itemContexts['order-${order.orderId}'] = itemContext;
              return _buildOrderCard(order, theme);
            },
          );
        },
      ),
    );
  }

  Widget _buildOrderCard(PharmacyOrder order, ThemeData theme) {
    final timeStr = DateFormat('HH:mm').format(order.createdAt);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: NotificationAttentionCard(
        key: ValueKey('order-${order.orderId}'),
        highlighted: _highlightedId == 'order-${order.orderId}',
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  PharmacyOrderDetailScreen(orderId: order.orderId.toString()),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    order.orderNumber,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  OrderStatusChip(status: order.status),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    Icons.person_outline,
                    size: 16,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(order.patientName, style: theme.textTheme.bodyMedium),
                  const Spacer(),
                  Text(
                    '\$${order.totalAmount.toStringAsFixed(2)}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(
                    '${order.items.length} items',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(width: 12),
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 2),
                  Text(timeStr, style: theme.textTheme.bodySmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
