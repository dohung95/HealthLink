import 'package:flutter/material.dart';

class PharmacyQuoteDeliveryStep extends StatelessWidget {
  final String? fulfillmentType;
  final String? address;
  final String? phone;
  final double? latitude;
  final double? longitude;
  final TextEditingController feeController;
  final TextEditingController etaController;
  final ValueChanged<String> onFeeChanged;
  final ValueChanged<String> onEtaChanged;

  const PharmacyQuoteDeliveryStep({
    super.key,
    required this.fulfillmentType,
    required this.address,
    required this.phone,
    required this.latitude,
    required this.longitude,
    required this.feeController,
    required this.etaController,
    required this.onFeeChanged,
    required this.onEtaChanged,
  });

  bool get isPickup => fulfillmentType?.toUpperCase() == 'PICKUP';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Patient fulfillment',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        _readOnlyField('Delivery type', fulfillmentType ?? 'Not set'),
        const SizedBox(height: 8),
        _readOnlyField('Delivery address', address ?? 'Not set'),
        const SizedBox(height: 8),
        _readOnlyField('Delivery phone', phone ?? 'Not set'),
        const SizedBox(height: 8),
        _readOnlyField(
          'Delivery coordinates',
          latitude != null && longitude != null
              ? '$latitude, $longitude'
              : 'Not set',
        ),
        if (!isPickup) ...[
          const SizedBox(height: 16),
          TextFormField(
            controller: feeController,
            decoration: const InputDecoration(
              labelText: 'Delivery fee',
              prefixText: '\$',
              border: OutlineInputBorder(),
            ),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: onFeeChanged,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: etaController,
            decoration: const InputDecoration(
              labelText: 'Estimated delivery time',
              hintText: '2026-07-15T14:00',
              border: OutlineInputBorder(),
            ),
            onChanged: onEtaChanged,
          ),
        ],
      ],
    );
  }

  Widget _readOnlyField(String label, String value) {
    return InputDecorator(
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        isDense: true,
      ),
      child: Text(value),
    );
  }
}
