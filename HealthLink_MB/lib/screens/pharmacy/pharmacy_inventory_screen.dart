import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';
import '../../models/pharmacy/pharmacy_inventory_item.dart';
import '../../widgets/pharmacy/inventory_filter_sheet.dart';
import '../../widgets/pharmacy/inventory_edit_sheet.dart';
import '../../widgets/pharmacy/inventory_import_sheet.dart';

class PharmacyInventoryScreen extends StatefulWidget {
  const PharmacyInventoryScreen({super.key});

  @override
  State<PharmacyInventoryScreen> createState() =>
      _PharmacyInventoryScreenState();
}

class _PharmacyInventoryScreenState extends State<PharmacyInventoryScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInventory());
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final provider = context.read<PharmacyInventoryProvider>();
      if (provider.hasMore && !provider.loading) {
        final auth = context.read<AuthProvider>();
        if (auth.accessToken != null) {
          provider.loadMore(auth.accessToken!);
        }
      }
    }
  }

  Future<void> _loadInventory() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    await context
        .read<PharmacyInventoryProvider>()
        .refresh(auth.accessToken!);
  }

  void _showFilterSheet() {
    final provider = context.read<PharmacyInventoryProvider>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => InventoryFilterSheet(
        currentFilter: provider.filter,
        onApply: (filter) {
          provider.setFilter(filter);
          final auth = context.read<AuthProvider>();
          if (auth.accessToken != null) {
            provider.refresh(auth.accessToken!);
          }
        },
      ),
    );
  }

  void _showEditSheet(PharmacyInventoryItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => InventoryEditSheet(
        item: item,
        onSave: (updated) async {
          final auth = context.read<AuthProvider>();
          if (auth.accessToken == null) return;
          final ok = await context
              .read<PharmacyInventoryProvider>()
              .updateItem(auth.accessToken!, updated);
          if (ok && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Item updated')),
            );
          }
        },
      ),
    );
  }

  void _showImportSheet() {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => InventoryImportSheet(
        token: auth.accessToken!,
        service: context.read<PharmacyInventoryProvider>().service,
        onImportComplete: _loadInventory,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
          ),
          IconButton(
            icon: const Icon(Icons.upload_file),
            onPressed: _showImportSheet,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(theme),
          _buildSummaryBar(theme),
          Expanded(child: _buildInventoryList(theme)),
        ],
      ),
    );
  }

  Widget _buildSearchBar(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: TextField(
        controller: _searchCtrl,
        decoration: InputDecoration(
          hintText: 'Search medicine...',
          prefixIcon: const Icon(Icons.search),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
          suffixIcon: _searchCtrl.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchCtrl.clear();
                    _applySearch('');
                  },
                )
              : null,
        ),
        onChanged: _onSearchChanged,
      ),
    );
  }

  String? _debounceTimer;

  void _onSearchChanged(String value) {
    _debounceTimer = value;
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_debounceTimer == value) {
        _applySearch(value);
      }
    });
  }

  void _applySearch(String query) {
    final provider = context.read<PharmacyInventoryProvider>();      provider.setFilter(provider.filter.copyWith(
        search: query.isNotEmpty ? query : null,
      ));
      final auth = context.read<AuthProvider>();
      if (auth.accessToken != null) {
        provider.refresh(auth.accessToken!);
      }
  }

  Widget _buildSummaryBar(ThemeData theme) {
    final provider = context.watch<PharmacyInventoryProvider>();
    if (provider.items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        children: [
          Text('${provider.items.length} items',
              style: theme.textTheme.bodySmall),
          if (provider.lowStockCount > 0) ...[
            const SizedBox(width: 12),
            Text('${provider.lowStockCount} low stock',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.error)),
          ],
          if (provider.expiringCount > 0) ...[
            const SizedBox(width: 12),
            Text('${provider.expiringCount} expiring',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: Colors.orange)),
          ],
        ],
      ),
    );
  }

  Widget _buildInventoryList(ThemeData theme) {
    final provider = context.watch<PharmacyInventoryProvider>();

    if (provider.loading && provider.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && provider.items.isEmpty) {
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
                onPressed: _loadInventory, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (provider.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2,
                size: 64, color: theme.colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text('No inventory items found',
                style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadInventory,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        itemCount: provider.items.length + (provider.hasMore ? 1 : 0),
        itemBuilder: (_, i) {
          if (i >= provider.items.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }
          return _buildItemCard(provider.items[i], theme);
        },
      ),
    );
  }

  Widget _buildItemCard(PharmacyInventoryItem item, ThemeData theme) {
    final avail = item.availableQuantity;
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showEditSheet(item),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.medicineName,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (!item.active)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.grey.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Inactive',
                          style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ),
                  if (item.isLowStock)
                    Container(
                      margin: const EdgeInsets.only(left: 4),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.error.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('Low Stock',
                          style: TextStyle(
                              fontSize: 11,
                              color: theme.colorScheme.error,
                              fontWeight: FontWeight.w600)),
                    ),
                  if (item.isExpiringSoon)
                    Container(
                      margin: const EdgeInsets.only(left: 4),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Expiring',
                          style: TextStyle(
                              fontSize: 11,
                              color: Colors.orange,
                              fontWeight: FontWeight.w600)),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _stat('On hand', '${item.quantity}', theme),
                  const SizedBox(width: 16),
                  _stat('Reserved', '${item.reservedQuantity}', theme),
                  const SizedBox(width: 16),
                  _stat('Available', '$avail', theme,
                      color: avail > 0
                          ? theme.colorScheme.primary
                          : theme.colorScheme.error),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  if (item.unit != null)
                    Text('${item.unit}',
                        style: theme.textTheme.bodySmall),
                  if (item.unitPrice != null) ...[
                    if (item.unit != null) const SizedBox(width: 12),
                    Text('\$${item.unitPrice!.toStringAsFixed(2)}',
                        style: theme.textTheme.bodySmall
                            ?.copyWith(fontWeight: FontWeight.w600)),
                  ],
                  const Spacer(),
                  if (item.expiryDate != null)
                    Text('Exp: ${item.expiryDate}',
                        style: theme.textTheme.bodySmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stat(String label, String value, ThemeData theme, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        Text(value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            )),
      ],
    );
  }
}
