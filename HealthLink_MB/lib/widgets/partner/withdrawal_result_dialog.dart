import 'package:flutter/material.dart';

/// Result dialog shown after a withdrawal request completes successfully.
///
/// Displays a checkmark, a success message ("Withdrawal successful" for
/// COMPLETED status, "Withdrawal submitted" otherwise), and a "Done" button
/// that pops the dialog and optionally calls [onDone].
class WithdrawalResultDialog extends StatelessWidget {
  const WithdrawalResultDialog({
    super.key,
    required this.isCompleted,
    this.amount,
    this.onDone,
  });

  /// Whether the settlement was immediately completed.
  final bool isCompleted;

  /// The withdrawn amount, shown when non-null.
  final double? amount;

  /// Called when the user presses Done.
  final VoidCallback? onDone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_circle,
                size: 36,
                color: Colors.green.shade600,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isCompleted ? 'Withdrawal successful' : 'Withdrawal submitted',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            if (amount != null) ...[
              const SizedBox(height: 8),
              Text(
                '\$${amount!.toStringAsFixed(2)}',
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              isCompleted
                  ? 'Funds have been sent to your PayPal account.'
                  : 'Your withdrawal request is being processed.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  onDone?.call();
                },
                child: const Text('Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
