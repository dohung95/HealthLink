import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/pharmacy/pharmacy_inventory_item.dart';

class InventoryEditSheet extends StatefulWidget {
  final PharmacyInventoryItem item;
  final ValueChanged<PharmacyInventoryItem> onSave;

  const InventoryEditSheet({
    super.key,
    required this.item,
    required this.onSave,
  });

  @override
  State<InventoryEditSheet> createState() => _InventoryEditSheetState();
}

class _InventoryEditSheetState extends State<InventoryEditSheet> {
  late TextEditingController _qtyCtrl;
  late TextEditingController _minStockCtrl;
  late TextEditingController _expiryCtrl;
  late bool _active;

  @override
  void initState() {
    super.initState();
    _qtyCtrl =
        TextEditingController(text: widget.item.quantity.toString());
    _minStockCtrl = TextEditingController(
        text: (widget.item.minimumStock ?? 0).toString());
    _expiryCtrl =
        TextEditingController(text: widget.item.expiryDate ?? '');
    _active = widget.item.active;
  }

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _minStockCtrl.dispose();
    _expiryCtrl.dispose();
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
          Text('Edit ${widget.item.medicineName}',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _qtyCtrl,
            decoration: const InputDecoration(
              labelText: 'On-hand quantity',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _minStockCtrl,
            decoration: const InputDecoration(
              labelText: 'Minimum stock',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _expiryCtrl,
            decoration: const InputDecoration(
              labelText: 'Expiry date (yyyy-MM-dd)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            title: const Text('Active'),
            value: _active,
            onChanged: (v) => setState(() => _active = v),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              final qty = int.tryParse(_qtyCtrl.text) ?? 0;
              final minStock = int.tryParse(_minStockCtrl.text) ?? 0;
              final expiry =
                  _expiryCtrl.text.isNotEmpty ? _expiryCtrl.text : null;

              widget.onSave(widget.item.copyWith(
                quantity: qty,
                minimumStock: minStock,
                expiryDate: expiry,
                active: _active,
              ));
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
