import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_order_provider.dart';
import '../../models/pharmacy/pharmacy_order.dart';
import '../../widgets/pharmacy/order_status_chip.dart';
import 'pharmacy_order_detail_screen.dart';

class PharmacyOrdersScreen extends StatefulWidget {
  const PharmacyOrdersScreen({super.key});

  @override
  State<PharmacyOrdersScreen> createState() => _PharmacyOrdersScreenState();
}

class _PharmacyOrdersScreenState extends State<PharmacyOrdersScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<String> _statusFilters = [
    'ALL',
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'SHIPPING',
    'DELIVERED',
    'CANCELLED',
  ];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOrders());
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final provider = context.read<PharmacyOrderProvider>();
      if (provider.hasMore && !provider.isLoading) {
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
    await context
        .read<PharmacyOrderProvider>()
        .fetchOrders(auth.accessToken!, pharmacyId);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          _buildFilterChips(theme),
          Expanded(child: _buildOrdersList(theme)),
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
        separatorBuilder: (_, __) => const SizedBox(width: 6),
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

  Widget _buildOrdersList(ThemeData theme) {
    final provider = context.watch<PharmacyOrderProvider>();

    if (provider.isLoading && provider.orders.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && provider.orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(provider.error!,
                style: TextStyle(color: theme.colorScheme.error)),
            const SizedBox(height: 12),
            FilledButton.tonal(
                onPressed: _loadOrders, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (provider.orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long,
                size: 64, color: theme.colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text('No orders found', style: theme.textTheme.titleMedium),
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
                auth.pharmacyProfile?['pharmacyId']?.toString() ??
                    auth.userId!,
              );
        }
      },
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        itemCount: provider.orders.length + (provider.hasMore ? 1 : 0),
        itemBuilder: (_, i) {
          if (i >= provider.orders.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }
          final order = provider.orders[i];
          return _buildOrderCard(order, theme);
        },
      ),
    );
  }

  Widget _buildOrderCard(PharmacyOrder order, ThemeData theme) {
    final timeStr = order.createdAt != null
        ? DateFormat('HH:mm').format(order.createdAt)
        : '';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PharmacyOrderDetailScreen(
                  orderId: order.orderId.toString()),
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
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  OrderStatusChip(status: order.status),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.person_outline,
                      size: 16, color: theme.colorScheme.onSurfaceVariant),
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
                  Text('${order.items.length} items',
                      style: theme.textTheme.bodySmall),
                  if (timeStr.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    Icon(Icons.access_time,
                        size: 14, color: theme.colorScheme.onSurfaceVariant),
                    const SizedBox(width: 2),
                    Text(timeStr, style: theme.textTheme.bodySmall),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
