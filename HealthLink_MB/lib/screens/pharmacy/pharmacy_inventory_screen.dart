import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';
import '../../models/pharmacy/pharmacy_inventory_item.dart';
import '../../widgets/pharmacy/inventory_filter_sheet.dart';
import '../../widgets/pharmacy/inventory_edit_sheet.dart';
import '../../widgets/pharmacy/inventory_import_sheet.dart';
import '../../utils/pharmacy/pharmacy_notification_target.dart';
import '../../widgets/pharmacy/notification_attention_card.dart';

class PharmacyInventoryScreen extends StatefulWidget {
  const PharmacyInventoryScreen({super.key, this.notificationAttention});

  final ValueListenable<NotificationAttention?>? notificationAttention;

  @override
  State<PharmacyInventoryScreen> createState() =>
      _PharmacyInventoryScreenState();
}

class _PharmacyInventoryScreenState extends State<PharmacyInventoryScreen> {
  static const _estimatedRowExtent = 216.0;

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchCtrl = TextEditingController();
  final Map<String, BuildContext> _itemContexts = {};
  Timer? _attentionTimer;
  String? _highlightedId;
  String? _attentionMessage;

  @override
  void initState() {
    super.initState();
    _subscribeAttention();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInventory());
  }

  @override
  void dispose() {
    _unsubscribeAttention(widget.notificationAttention);
    _attentionTimer?.cancel();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant PharmacyInventoryScreen oldWidget) {
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
    await context.read<PharmacyInventoryProvider>().refresh(auth.accessToken!);
  }

  Future<void> _handleAttention(NotificationAttention attention) async {
    final target = attention.target;
    if (target.tabIndex != PharmacyNotificationTarget.tabInventory ||
        (target.detailType != 'inventory' &&
            target.detailType != 'inventory-low-stock')) {
      return;
    }

    final provider = context.read<PharmacyInventoryProvider>();
    PharmacyInventoryItem? item;
    if (target.detailType == 'inventory-low-stock') {
      provider.setFilter(provider.filter.copyWith(lowStock: true));
      await _loadInventory();
      item = provider.items.cast<PharmacyInventoryItem?>().firstWhere(
        (candidate) => candidate!.isLowStock,
        orElse: () => null,
      );
    } else {
      item = provider.items.cast<PharmacyInventoryItem?>().firstWhere(
        (candidate) => candidate!.inventoryId.toString() == target.detailId,
        orElse: () => null,
      );
      if (item == null) {
        await _loadInventory();
        item = provider.items.cast<PharmacyInventoryItem?>().firstWhere(
          (candidate) => candidate!.inventoryId.toString() == target.detailId,
          orElse: () => null,
        );
      }
    }

    if (!mounted ||
        widget.notificationAttention?.value?.sequence != attention.sequence) {
      return;
    }
    if (item == null || item.inventoryId == null) {
      _attentionTimer?.cancel();
      setState(() {
        _highlightedId = null;
        _attentionMessage = 'Related item is no longer active';
      });
      return;
    }

    final key = 'inventory-${item.inventoryId}';
    setState(() {
      _attentionMessage = null;
      _highlightedId = key;
    });
    _scrollToItem(key, provider.items.indexOf(item));
    _attentionTimer?.cancel();
    _attentionTimer = Timer(const Duration(seconds: 4), () {
      if (mounted &&
          widget.notificationAttention?.value?.sequence == attention.sequence) {
        setState(() => _highlightedId = null);
      }
    });
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
          final ok = await context.read<PharmacyInventoryProvider>().updateItem(
            auth.accessToken!,
            updated,
          );
          if (ok && mounted) {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(const SnackBar(content: Text('Item updated')));
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
          if (_attentionMessage != null)
            MaterialBanner(
              content: Text(_attentionMessage!),
              actions: const [SizedBox.shrink()],
            ),
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
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
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
    final provider = context.read<PharmacyInventoryProvider>();
    provider.setFilter(
      provider.filter.copyWith(search: query.isNotEmpty ? query : null),
    );
    final auth = context.read<AuthProvider>();
    if (auth.accessToken != null) {
      provider.refresh(auth.accessToken!);
    }
  }

  Widget _buildSummaryBar(ThemeData theme) {
    final provider = context.watch<PharmacyInventoryProvider>();
    if (provider.items.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: theme.colorScheme.surfaceContainerLow,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: IntrinsicHeight(
        child: Row(
          children: [
            Expanded(
              child: _summaryMetric(
                key: const ValueKey('inventory-summary-total'),
                value: '${provider.items.length}',
                label: 'items',
                color: theme.colorScheme.onSurface,
                theme: theme,
              ),
            ),
            const VerticalDivider(width: 1),
            Expanded(
              child: _summaryMetric(
                key: const ValueKey('inventory-summary-low-stock'),
                value: '${provider.lowStockCount}',
                label: 'low stock',
                color: theme.colorScheme.error,
                theme: theme,
              ),
            ),
            const VerticalDivider(width: 1),
            Expanded(
              child: _summaryMetric(
                key: const ValueKey('inventory-summary-expiring'),
                value: '${provider.expiringCount}',
                label: 'expiring',
                color: Colors.amber.shade800,
                theme: theme,
              ),
            ),
          ],
        ),
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
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(
              provider.error!,
              style: TextStyle(color: theme.colorScheme.error),
            ),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: _loadInventory,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (provider.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.inventory_2,
              size: 64,
              color: theme.colorScheme.outlineVariant,
            ),
            const SizedBox(height: 12),
            Text(
              'No inventory items found',
              style: theme.textTheme.titleMedium,
            ),
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
          final item = provider.items[i];
          final key = 'inventory-${item.inventoryId}';
          return Builder(
            builder: (itemContext) {
              _itemContexts[key] = itemContext;
              return _buildItemCard(item, theme);
            },
          );
        },
      ),
    );
  }

  Widget _buildItemCard(PharmacyInventoryItem item, ThemeData theme) {
    final key = 'inventory-${item.inventoryId}';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: NotificationAttentionCard(
        key: ValueKey(key),
        highlighted: _highlightedId == key,
        onTap: () => _showEditSheet(item),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: LayoutBuilder(
            builder: (context, constraints) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _identityRow(item, theme, constraints.maxWidth),
                const SizedBox(height: 8),
                _metadataRow(item, theme),
                if (item.minimumStock != null && item.minimumStock! > 0) ...[
                  const SizedBox(height: 10),
                  _stockProgress(item, theme),
                ],
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _stat('On hand', '${item.quantity}', theme),
                    ),
                    Expanded(
                      child: _stat(
                        'Reserved',
                        '${item.reservedQuantity}',
                        theme,
                      ),
                    ),
                    Expanded(
                      child: _stat(
                        'Min stock',
                        item.minimumStock?.toString() ?? 'Not set',
                        theme,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _stat(
                        'Price',
                        _formatPrice(item.unitPrice),
                        theme,
                      ),
                    ),
                    Expanded(
                      child: _stat(
                        'Expiry',
                        _formatExpiry(item.expiryDate),
                        theme,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _summaryMetric({
    required Key key,
    required String value,
    required String label,
    required Color color,
    required ThemeData theme,
  }) {
    return Container(
      key: key,
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(label, style: theme.textTheme.bodySmall?.copyWith(color: color)),
        ],
      ),
    );
  }

  Widget _identityRow(
    PharmacyInventoryItem item,
    ThemeData theme,
    double width,
  ) {
    final identity = Text(
      item.medicineName,
      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    );
    final available = _availableMetric(item, theme);
    const chevron = ExcludeSemantics(child: Icon(Icons.chevron_right));

    if (width < 360) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: identity),
              chevron,
            ],
          ),
          const SizedBox(height: 6),
          Align(alignment: Alignment.centerRight, child: available),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: identity),
        const SizedBox(width: 12),
        available,
        const SizedBox(width: 4),
        chevron,
      ],
    );
  }

  Widget _availableMetric(PharmacyInventoryItem item, ThemeData theme) {
    final available = item.availableQuantity;
    final color = available > 0
        ? theme.colorScheme.primary
        : theme.colorScheme.error;
    return Semantics(
      label: 'Available $available ${item.unit ?? ''}',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            'AVAILABLE',
            style: theme.textTheme.labelSmall?.copyWith(color: color),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$available',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (item.unit != null) ...[
                const SizedBox(width: 4),
                Text(item.unit!, style: theme.textTheme.bodySmall),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _metadataRow(PharmacyInventoryItem item, ThemeData theme) {
    final metadata = [
      item.genericName,
      item.category,
      item.dosageForm,
    ].whereType<String>().where((value) => value.isNotEmpty).join(' | ');
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            metadata.isEmpty ? 'Not set' : metadata,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        if (_statusLabel(item) case final label?) ...[
          const SizedBox(width: 8),
          _statusBadge(label, item, theme),
        ],
      ],
    );
  }

  Widget _stockProgress(PharmacyInventoryItem item, ThemeData theme) {
    final minimum = item.minimumStock!;
    final color = !item.active
        ? Colors.grey
        : item.isLowStock
        ? theme.colorScheme.error
        : theme.colorScheme.primary;
    return Semantics(
      label: 'Stock health ${item.quantity} of $minimum',
      child: LinearProgressIndicator(
        value: (item.quantity / minimum).clamp(0.0, 1.0).toDouble(),
        color: color,
        backgroundColor: color.withValues(alpha: 0.16),
      ),
    );
  }

  String? _statusLabel(PharmacyInventoryItem item) {
    if (!item.active) return 'Inactive';
    if (item.isLowStock) return 'Low stock';
    if (item.isExpiringSoon) return 'Expiring';
    return null;
  }

  Widget _statusBadge(
    String label,
    PharmacyInventoryItem item,
    ThemeData theme,
  ) {
    final color = !item.active
        ? Colors.grey
        : item.isLowStock
        ? theme.colorScheme.error
        : Colors.amber.shade800;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  String _formatPrice(double? price) {
    if (price == null) return 'Not set';
    return NumberFormat.currency(symbol: r'$', decimalDigits: 2).format(price);
  }

  String _formatExpiry(String? expiryDate) {
    if (expiryDate == null) return 'Not set';
    final expiry = DateTime.tryParse(expiryDate);
    return expiry == null ? 'Not set' : DateFormat.yMMMd().format(expiry);
  }

  Widget _stat(String label, String value, ThemeData theme, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
