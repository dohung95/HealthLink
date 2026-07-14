import 'package:intl/intl.dart';
import 'package:flutter/material.dart';

import '../../config/doctor_theme.dart';
import '../../models/doctor/doctor_clinical_result.dart';
import 'doctor_widgets.dart';

/// Section "Clinical Results" hiển thị trong Doctor Appointment Detail —
/// danh sách kết quả xét nghiệm/chẩn đoán bác sĩ đã tạo cho appointment này.
class ClinicalResultsSection extends StatelessWidget {
  final List<DoctorClinicalResult> results;
  final bool isLoading;
  final String? error;
  final bool canManage;
  final VoidCallback onRetry;
  final VoidCallback onAdd;
  final ValueChanged<DoctorClinicalResult> onOpen;

  const ClinicalResultsSection({
    super.key,
    required this.results,
    required this.isLoading,
    required this.error,
    required this.canManage,
    required this.onRetry,
    required this.onAdd,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const DoctorSectionLabel('Clinical Results'),
              if (results.isNotEmpty) ...[
                const SizedBox(width: 6),
                Text('(${results.length})', style: const TextStyle(fontSize: 11, color: DS.mutedForeground)),
              ],
              const Spacer(),
              if (canManage)
                InkWell(
                  onTap: onAdd,
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.add_circle_outline, size: 20, color: DS.primary),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _buildBody(),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary))),
      );
    }

    if (error != null) {
      return Column(
        children: [
          const Icon(Icons.error_outline, size: 22, color: DS.rose600),
          const SizedBox(height: 6),
          const Text('Failed to load clinical results', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('Retry'),
          ),
        ],
      );
    }

    if (results.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('No clinical results yet', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground)),
          SizedBox(height: 4),
          Text(
            'Add a lab report, imaging result, or follow-up test result for this appointment.',
            style: TextStyle(fontSize: 12, color: DS.mutedForeground),
          ),
        ],
      );
    }

    return Column(
      children: [
        for (int i = 0; i < results.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          _ResultCard(result: results[i], onTap: () => onOpen(results[i])),
        ],
      ],
    );
  }
}

class _ResultCard extends StatelessWidget {
  final DoctorClinicalResult result;
  final VoidCallback onTap;

  const _ResultCard({required this.result, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final subtitleParts = [
      if ((result.labFacilityName ?? '').isNotEmpty) result.labFacilityName!,
      if (result.documentDate != null) DateFormat('dd/MM/yyyy').format(result.documentDate!),
    ];

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: DS.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: DS.cardBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.assignment_outlined, size: 18, color: DS.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if ((result.category ?? '').isNotEmpty) ...[
                        _Chip(text: result.category!, color: DS.mutedForeground, bg: DS.secondary),
                        const SizedBox(width: 6),
                      ],
                      _StatusChip(published: result.isPublished),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    result.displayName,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subtitleParts.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        subtitleParts.join(' · '),
                        style: const TextStyle(fontSize: 12, color: DS.mutedForeground),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  if (result.abnormalCount > 0 || result.hasAttachment)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Row(
                        children: [
                          if (result.abnormalCount > 0) ...[
                            const Icon(Icons.warning_amber_rounded, size: 13, color: DS.amber600),
                            const SizedBox(width: 3),
                            Text(
                              '${result.abnormalCount} abnormal',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: DS.amber700),
                            ),
                            const SizedBox(width: 10),
                          ],
                          if (result.hasAttachment)
                            const Icon(Icons.attach_file, size: 14, color: DS.mutedForeground),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 20, color: DS.mutedForeground),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final bool published;
  const _StatusChip({required this.published});

  @override
  Widget build(BuildContext context) {
    return _Chip(
      text: published ? 'PUBLISHED' : 'DRAFT',
      color: published ? DS.emerald700 : DS.mutedForeground,
      bg: published ? DS.emerald100 : DS.secondary,
    );
  }
}

class _Chip extends StatelessWidget {
  final String text;
  final Color color;
  final Color bg;
  const _Chip({required this.text, required this.color, required this.bg});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color, letterSpacing: 0.3)),
    );
  }
}
