import 'package:flutter/material.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';

class DeliveryContactReviewSheet extends StatefulWidget {
  final PharmacyWorkItem workItem;
  final Future<void> Function({
    required bool approved,
    String? notes,
  }) onSubmit;

  const DeliveryContactReviewSheet({
    super.key,
    required this.workItem,
    required this.onSubmit,
  });

  @override
  State<DeliveryContactReviewSheet> createState() =>
      _DeliveryContactReviewSheetState();
}

class _DeliveryContactReviewSheetState
    extends State<DeliveryContactReviewSheet> {
  final _notesCtrl = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit(bool approved) async {
    setState(() => _isSubmitting = true);
    try {
      await widget.onSubmit(
        approved: approved,
        notes: _notesCtrl.text.isNotEmpty ? _notesCtrl.text : null,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Submission failed')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final item = widget.workItem;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text('Review Delivery Contact',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Patient: ${item.patientName}',
                style: theme.textTheme.bodySmall),
            const Divider(height: 20),
            if (item.deliveryAddress != null) ...[
              _label(theme, 'Address'),
              Text(item.deliveryAddress!),
              const SizedBox(height: 8),
            ],
            if (item.deliveryPhoneNumber != null) ...[
              _label(theme, 'Phone'),
              Text(item.deliveryPhoneNumber!),
              const SizedBox(height: 8),
            ],
            if (item.notes != null) ...[
              _label(theme, 'Notes'),
              Text(item.notes!, style: theme.textTheme.bodySmall),
              const SizedBox(height: 8),
            ],
            if (item.deliveryLatitude != null &&
                item.deliveryLongitude != null) ...[
              _label(theme, 'Location'),
              Text(
                '${item.deliveryLatitude!.toStringAsFixed(4)}, '
                '${item.deliveryLongitude!.toStringAsFixed(4)}',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
            ],
            const Divider(),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                labelText: 'Review notes',
                hintText: 'Optional notes for this review',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed:
                        _isSubmitting ? null : () => _submit(false),
                    icon: const Icon(Icons.close, size: 18),
                    label: const Text('Reject'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed:
                        _isSubmitting ? null : () => _submit(true),
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2),
                          )
                        : const Icon(Icons.check, size: 18),
                    label: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(ThemeData theme, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Text(text,
          style: theme.textTheme.labelSmall
              ?.copyWith(color: theme.colorScheme.primary)),
    );
  }
}
