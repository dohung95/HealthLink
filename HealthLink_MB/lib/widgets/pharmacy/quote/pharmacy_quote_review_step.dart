import 'package:flutter/material.dart';
import '../../../models/pharmacy/pharmacy_quote_draft.dart';

class PharmacyQuoteReviewStep extends StatelessWidget {
  final bool isCreate;
  final List<QuoteLineItem> items;
  final String? fulfillmentType;
  final String? address;
  final String? phone;
  final double deliveryFee;
  final DateTime? eta;
  final String notes;
  final String? error;
  final bool isSubmitting;
  final VoidCallback onSubmit;

  const PharmacyQuoteReviewStep({
    super.key,
    required this.isCreate,
    required this.items,
    required this.fulfillmentType,
    required this.address,
    required this.phone,
    required this.deliveryFee,
    required this.eta,
    required this.notes,
    required this.error,
    required this.isSubmitting,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Review quote', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Text('Medicines: ${items.length}'),
        const SizedBox(height: 8),
        Text('Fulfillment: ${fulfillmentType ?? 'Not set'}'),
        Text('Address: ${address ?? 'Not set'}'),
        Text('Phone: ${phone ?? 'Not set'}'),
        Text('Fee: \$${deliveryFee.toStringAsFixed(2)}'),
        if (eta != null) Text('ETA: ${eta!.toIso8601String()}'),
        if (notes.isNotEmpty) Text('Notes: $notes'),
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: isSubmitting ? null : onSubmit,
            icon: isSubmitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check),
            label: Text(isCreate ? 'Create order' : 'Update quote'),
          ),
        ),
      ],
    );
  }
}
