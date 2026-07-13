import 'package:intl/intl.dart';
import 'package:flutter/material.dart';

import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../models/doctor/doctor_clinical_result.dart';
import 'doctor_widgets.dart';
import 'document_viewer_screen.dart';

/// Mở bottom sheet xem chi tiết + hành động (Edit/Publish/Delete) cho một clinical result.
Future<void> showClinicalResultDetailSheet(
  BuildContext context, {
  required DoctorClinicalResult result,
  required bool canManage,
  required VoidCallback onEdit,
  required VoidCallback onPublish,
  required VoidCallback onDelete,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _ClinicalResultDetailSheet(
      result: result,
      canManage: canManage,
      onEdit: onEdit,
      onPublish: onPublish,
      onDelete: onDelete,
    ),
  );
}

Future<bool> _confirm(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  bool danger = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirmLabel, style: TextStyle(color: danger ? DS.rose600 : DS.primary, fontWeight: FontWeight.w700)),
        ),
      ],
    ),
  );
  return result ?? false;
}

class _ClinicalResultDetailSheet extends StatelessWidget {
  final DoctorClinicalResult result;
  final bool canManage;
  final VoidCallback onEdit;
  final VoidCallback onPublish;
  final VoidCallback onDelete;

  const _ClinicalResultDetailSheet({
    required this.result,
    required this.canManage,
    required this.onEdit,
    required this.onPublish,
    required this.onDelete,
  });

  bool get _showActions => canManage && !result.isPublished;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: DS.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMeta(),
                  const SizedBox(height: 16),
                  if (result.rows.isNotEmpty)
                    _buildStructuredResults()
                  else if ((result.testResults ?? '').isNotEmpty)
                    _buildLegacyResult(),
                  if (result.rows.isNotEmpty || (result.testResults ?? '').isNotEmpty) const SizedBox(height: 16),
                  if ((result.doctorAssessment ?? '').isNotEmpty) ...[
                    _buildTextCard('Assessment', result.doctorAssessment!),
                    const SizedBox(height: 12),
                  ],
                  if ((result.patientSummary ?? '').isNotEmpty) ...[
                    _buildTextCard('Patient summary', result.patientSummary!),
                    const SizedBox(height: 12),
                  ],
                  if (result.hasAttachment) _buildAttachment(context),
                ],
              ),
            ),
          ),
          if (_showActions) _buildFooter(context),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 8, 14),
      decoration: const BoxDecoration(
        color: DS.card,
        border: Border(bottom: BorderSide(color: DS.cardBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(result.displayName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: DS.foreground)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    if ((result.category ?? '').isNotEmpty) ...[
                      _tag(result.category!, DS.mutedForeground, DS.secondary),
                      const SizedBox(width: 6),
                    ],
                    _tag(
                      result.isPublished ? 'PUBLISHED' : 'DRAFT',
                      result.isPublished ? DS.emerald700 : DS.mutedForeground,
                      result.isPublished ? DS.emerald100 : DS.secondary,
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close, color: DS.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _tag(String text, Color color, Color bg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
        child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color)),
      );

  Widget _buildMeta() {
    final parts = <String>[
      if ((result.labFacilityName ?? '').isNotEmpty) result.labFacilityName!,
      if (result.documentDate != null) DateFormat('dd/MM/yyyy').format(result.documentDate!),
      if (result.isPublished && result.publishedAt != null)
        'Published ${DateFormat('dd/MM/yyyy HH:mm').format(result.publishedAt!)}',
    ];
    if (parts.isEmpty) return const SizedBox.shrink();
    return Text(parts.join(' · '), style: const TextStyle(fontSize: 12, color: DS.mutedForeground));
  }

  Widget _buildStructuredResults() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Results'),
          const SizedBox(height: 10),
          for (int i = 0; i < result.rows.length; i++) ...[
            if (i > 0) const Divider(height: 18, color: DS.border),
            _buildResultRow(result.rows[i]),
          ],
          if (result.abnormalCount > 0) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded, size: 15, color: DS.amber600),
                const SizedBox(width: 4),
                Text(
                  '${result.abnormalCount} abnormal value${result.abnormalCount > 1 ? 's' : ''}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.amber700),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildResultRow(ClinicalResultRow row) {
    final flagColor = switch (row.flag) {
      'CRITICAL' => DS.rose700,
      'HIGH' || 'LOW' => DS.amber700,
      'NORMAL' => DS.emerald700,
      _ => DS.mutedForeground,
    };
    final flagBg = switch (row.flag) {
      'CRITICAL' => DS.rose100,
      'HIGH' || 'LOW' => DS.amber100,
      'NORMAL' => DS.emerald100,
      _ => DS.secondary,
    };

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(row.testName.isEmpty ? 'Test' : row.testName,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground)),
              if (row.referenceRange.isNotEmpty)
                Text('Ref: ${row.referenceRange}', style: const TextStyle(fontSize: 11, color: DS.mutedForeground)),
            ],
          ),
        ),
        Text(
          [row.resultValue, row.unit].where((s) => s.isNotEmpty).join(' '),
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: flagColor),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(color: flagBg, borderRadius: BorderRadius.circular(6)),
          child: Text(row.flag, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: flagColor)),
        ),
      ],
    );
  }

  Widget _buildLegacyResult() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Result'),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(result.testResults ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: DS.foreground)),
              if ((result.resultUnit ?? '').isNotEmpty) ...[
                const SizedBox(width: 4),
                Text(result.resultUnit!, style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTextCard(String label, String text) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DoctorSectionLabel(label),
          const SizedBox(height: 6),
          Text(text, style: const TextStyle(fontSize: 13, color: DS.foreground, height: 1.4)),
        ],
      ),
    );
  }

  Widget _buildAttachment(BuildContext context) {
    final url = ApiConfig.normalizeUrl(result.fileLocation);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Attachment'),
          const SizedBox(height: 8),
          InkWell(
            onTap: url == null
                ? null
                : () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => DocumentViewerScreen(
                          url: url,
                          title: result.displayName,
                        ),
                      ),
                    );
                  },
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: DS.background, borderRadius: BorderRadius.circular(10), border: Border.all(color: DS.cardBorder)),
              child: Row(
                children: [
                  const Icon(Icons.insert_drive_file_outlined, color: DS.primary),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text('Open attachment', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground)),
                  ),
                  const Icon(Icons.open_in_new, size: 16, color: DS.mutedForeground),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).viewInsets.bottom > 0 ? 12 : 24),
      decoration: const BoxDecoration(color: DS.card, border: Border(top: BorderSide(color: DS.cardBorder))),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              style: DS.outlineButtonStyle,
              onPressed: () {
                Navigator.pop(context);
                onEdit();
              },
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: const Text('Edit'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              style: DS.destructiveButtonStyle,
              onPressed: () async {
                final confirmed = await _confirm(
                  context,
                  title: 'Delete Clinical Result',
                  message: 'Delete this draft? This cannot be undone.',
                  confirmLabel: 'Delete',
                  danger: true,
                );
                if (confirmed && context.mounted) {
                  Navigator.pop(context);
                  onDelete();
                }
              },
              icon: const Icon(Icons.delete_outline, size: 16),
              label: const Text('Delete'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              style: DS.primaryButtonStyle,
              onPressed: () async {
                final confirmed = await _confirm(
                  context,
                  title: 'Publish Clinical Result',
                  message: 'This result will be visible to the patient. Continue?',
                  confirmLabel: 'Publish',
                );
                if (confirmed && context.mounted) {
                  Navigator.pop(context);
                  onPublish();
                }
              },
              icon: const Icon(Icons.send_outlined, size: 16),
              label: const Text('Publish'),
            ),
          ),
        ],
      ),
    );
  }
}
