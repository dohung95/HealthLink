import 'package:flutter/material.dart';
import '../../models/pharmacy/pharmacy_inventory_item.dart';
import '../../models/pharmacy/pharmacy_quote_draft.dart';
import '../../utils/pharmacy/pharmacy_quote_mapper.dart';

class PharmacyMedicinePicker extends StatelessWidget {
  final List<PharmacyInventoryItem> inventoryItems;
  final bool isLoading;
  final ValueChanged<QuoteLineItem> onSelected;

  const PharmacyMedicinePicker({
    super.key,
    required this.inventoryItems,
    this.isLoading = false,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isLoading && inventoryItems.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (inventoryItems.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.inventory_2_outlined,
                  size: 48, color: theme.colorScheme.onSurfaceVariant),
              const SizedBox(height: 12),
              Text('No inventory items available',
                  style: theme.textTheme.bodyMedium),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: inventoryItems.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (_, i) {
        final item = inventoryItems[i];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: theme.colorScheme.primaryContainer,
            child: Icon(Icons.medication,
                color: theme.colorScheme.onPrimaryContainer, size: 20),
          ),
          title: Text(item.medicineName,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w500)),
          subtitle: Text(
            _formatItemSubtitle(item),
            style: theme.textTheme.bodySmall,
          ),
          trailing: Text(
            _formatPrice(item.unitPrice, item.unit),
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.primary),
          ),
          onTap: () => onSelected(PharmacyQuoteMapper.fromInventoryItem(item)),
        );
      },
    );
  }

  String _formatItemSubtitle(PharmacyInventoryItem item) {
    final parts = <String>[];
    if (item.dosageForm != null) parts.add(item.dosageForm!);
    if (item.strength != null) parts.add(item.strength!);
    if (item.inventoryId != null) {
      parts.add('Available: ${item.availableQuantity}');
    }
    return parts.join(' · ');
  }

  String _formatPrice(double? unitPrice, String? unit) {
    if (unitPrice == null) return '';
    final price = '\$${unitPrice.toStringAsFixed(0)}';
    if (unit != null) return '$price /$unit';
    return price;
  }
}
