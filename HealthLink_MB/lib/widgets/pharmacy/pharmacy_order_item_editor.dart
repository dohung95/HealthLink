import 'package:flutter/material.dart';
import '../../models/pharmacy/pharmacy_quote_draft.dart';
import '../../utils/pharmacy/pharmacy_medication_schedule.dart';

const List<String> _routeOptions = ['Oral', 'Topical', 'Injection', 'Inhalation'];

class PharmacyOrderItemEditor extends StatefulWidget {
  final QuoteLineItem item;
  final ValueChanged<QuoteLineItem> onChanged;
  final VoidCallback? onRemove;

  const PharmacyOrderItemEditor({
    super.key,
    required this.item,
    required this.onChanged,
    this.onRemove,
  });

  @override
  State<PharmacyOrderItemEditor> createState() => _PharmacyOrderItemEditorState();
}

class _PharmacyOrderItemEditorState extends State<PharmacyOrderItemEditor> {
  late TextEditingController _qtyCtrl;
  late TextEditingController _daysCtrl;
  late TextEditingController _notesCtrl;

  QuoteLineItem get _item => widget.item;

  @override
  void initState() {
    super.initState();
    _qtyCtrl = TextEditingController(text: _item.quantity.toString());
    _daysCtrl = TextEditingController(text: _item.totalSupplyDays.toString());
    _notesCtrl = TextEditingController(text: _item.notes ?? '');
  }

  @override
  void didUpdateWidget(PharmacyOrderItemEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.item.quantity != _item.quantity) {
      _qtyCtrl.text = _item.quantity.toString();
    }
    if (oldWidget.item.totalSupplyDays != _item.totalSupplyDays) {
      _daysCtrl.text = _item.totalSupplyDays.toString();
    }
    if (oldWidget.item.notes != _item.notes) {
      _notesCtrl.text = _item.notes ?? '';
    }
  }

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _daysCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _emit(QuoteLineItem updated) {
    widget.onChanged(updated);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(_item.medicationName,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600)),
                ),
                if (_item.unit != null || _item.unitPrice != null)
                  Text(
                    _formatUnitPrice(),
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.primary),
                  ),
                if (widget.onRemove != null && !_item.locked)
                  IconButton(
                    icon: Icon(Icons.remove_circle_outline,
                        color: theme.colorScheme.error, size: 20),
                    onPressed: widget.onRemove,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _qtyCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Quantity',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (v) {
                      final qty = int.tryParse(v) ?? 1;
                      if (qty > 0) _emit(_item.copyWith(quantity: qty));
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _daysCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Total Supply Days',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (v) {
                      final days = int.tryParse(v) ?? 30;
                      if (days > 0) _emit(_item.copyWith(totalSupplyDays: days));
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _item.route,
                    decoration: const InputDecoration(
                      labelText: 'Route',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    items: _routeOptions
                        .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                        .toList(),
                    onChanged: (v) => _emit(_item.copyWith(route: v)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Frequency: ${_frequencyLabel()}'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                ...PharmacyMedicationSchedule.supportedTimings.map((t) {
                final selected = _item.timing.contains(t);
                return FilterChip(
                  label: Text(t, style: const TextStyle(fontSize: 12)),
                  selected: selected,
                  onSelected: _item.locked ? null : (v) => _toggleTiming(t, v),
                  visualDensity: VisualDensity.compact,
                );
              }),
                if (_hasLegacyNight)
                  const InputChip(
                    label: Text('Night (legacy)'),
                    onPressed: null,
                  ),
              ],
            ),
            const SizedBox(height: 4),
            TextFormField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                labelText: 'Pharmacist Note',
                isDense: true,
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
              onChanged: (v) => _emit(_item.copyWith(notes: v)),
            ),
          ],
        ),
      ),
    );
  }

  String _formatUnitPrice() {
    if (_item.unitPrice == null) return '';
    final price = '\$${_item.unitPrice!.toStringAsFixed(0)}';
    if (_item.unit != null) return '$price /${_item.unit}';
    return price;
  }

  bool get _hasLegacyNight => _item.timing.any(
        (timing) => timing.trim().toUpperCase() == 'NIGHT',
      );

  String _frequencyLabel() {
    if (_item.locked || _hasLegacyNight) return _item.frequency ?? 'Not set';
    try {
      return PharmacyMedicationSchedule.deriveFrequency(_item.timing);
    } on ArgumentError {
      return 'Select timing';
    }
  }

  void _toggleTiming(String timing, bool selected) {
    final updated = _item.timing
        .where((value) =>
            PharmacyMedicationSchedule.supportedTimings.contains(
              value.trim().toUpperCase(),
            ))
        .map((value) => value.trim().toUpperCase())
        .toSet()
        .toList();
    if (selected) {
      updated.add(timing);
    } else {
      updated.remove(timing);
    }
    _emit(_item.copyWith(timing: updated));
  }
}
