import 'package:flutter/material.dart';

enum PharmacyQuoteStep { medicines, delivery, review }

class PharmacyQuoteStepHeader extends StatelessWidget {
  final PharmacyQuoteStep currentStep;

  const PharmacyQuoteStepHeader({
    super.key,
    required this.currentStep,
  });

  @override
  Widget build(BuildContext context) {
    const steps = [
      (step: PharmacyQuoteStep.medicines, label: 'Medicines'),
      (step: PharmacyQuoteStep.delivery, label: 'Delivery'),
      (step: PharmacyQuoteStep.review, label: 'Review'),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: steps.map((entry) {
        final active = entry.step == currentStep;
        return Semantics(
          label: entry.label,
          selected: active,
          child: Chip(
            avatar: Icon(
              active ? Icons.radio_button_checked : Icons.circle_outlined,
              size: 16,
            ),
            label: Text(entry.label),
            backgroundColor: active
                ? Theme.of(context).colorScheme.primaryContainer
                : null,
          ),
        );
      }).toList(),
    );
  }
}
