import 'package:flutter/material.dart';
import '../../providers/pharmacy/pharmacy_inventory_provider.dart';

class InventoryFilterSheet extends StatefulWidget {
  final InventoryFilter currentFilter;
  final ValueChanged<InventoryFilter> onApply;

  const InventoryFilterSheet({
    super.key,
    required this.currentFilter,
    required this.onApply,
  });

  @override
  State<InventoryFilterSheet> createState() => _InventoryFilterSheetState();
}

class _InventoryFilterSheetState extends State<InventoryFilterSheet> {
  late TextEditingController _searchCtrl;
  String? _category;
  bool _activeOnly = false;
  bool _lowStock = false;
  bool _expiringSoon = false;

  @override
  void initState() {
    super.initState();
    _searchCtrl =
        TextEditingController(text: widget.currentFilter.search ?? '');
    _category = widget.currentFilter.category;
    _activeOnly = widget.currentFilter.activeOnly ?? false;
    _lowStock = widget.currentFilter.lowStock ?? false;
    _expiringSoon = widget.currentFilter.expiringSoon ?? false;
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Filter Inventory',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _searchCtrl,
            decoration: const InputDecoration(
              labelText: 'Search medicine',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            title: const Text('Active only'),
            value: _activeOnly,
            onChanged: (v) => setState(() => _activeOnly = v),
          ),
          SwitchListTile(
            title: const Text('Low stock only'),
            value: _lowStock,
            onChanged: (v) => setState(() => _lowStock = v),
          ),
          SwitchListTile(
            title: const Text('Expiring soon'),
            value: _expiringSoon,
            onChanged: (v) => setState(() => _expiringSoon = v),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              widget.onApply(InventoryFilter(
                search: _searchCtrl.text.isNotEmpty ? _searchCtrl.text : null,
                category: _category,
                activeOnly: _activeOnly ? true : null,
                lowStock: _lowStock ? true : null,
                expiringSoon: _expiringSoon ? true : null,
              ));
              Navigator.pop(context);
            },
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }
}
