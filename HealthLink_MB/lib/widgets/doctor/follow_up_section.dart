import 'package:intl/intl.dart';
import 'package:flutter/material.dart';

import '../../config/doctor_theme.dart';
import '../../models/doctor/doctor_follow_up.dart';
import 'doctor_widgets.dart';

/// Section "Follow-up" hiển thị trong Doctor Appointment Detail.
class FollowUpSection extends StatelessWidget {
  final bool isLoading;
  final String? error;
  final bool canManage;
  final FollowUpStatus? status;
  final DateTime? draftDate;
  final String? draftType;
  final VoidCallback onRetry;
  final VoidCallback onSchedule;
  final VoidCallback onSendPaymentRequest;
  final VoidCallback onCancelPending;
  final VoidCallback onReschedule;

  const FollowUpSection({
    super.key,
    required this.isLoading,
    required this.error,
    required this.canManage,
    required this.status,
    required this.draftDate,
    required this.draftType,
    required this.onRetry,
    required this.onSchedule,
    required this.onSendPaymentRequest,
    required this.onCancelPending,
    required this.onReschedule,
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
          const DoctorSectionLabel('Follow-up'),
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
          const Text('Failed to load follow-up status', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
          const SizedBox(height: 8),
          TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh, size: 16), label: const Text('Retry')),
        ],
      );
    }

    final s = status;
    final effectiveDate = s?.followUpDate ?? draftDate;
    final effectiveType = s?.consultationType ?? draftType;

    if (s == null || s.isNone) {
      if (effectiveDate == null) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('No follow-up scheduled', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground)),
            const SizedBox(height: 4),
            const Text(
              'Schedule a follow-up visit and send a payment request to the patient.',
              style: TextStyle(fontSize: 12, color: DS.mutedForeground),
            ),
            if (canManage) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  style: DS.outlineButtonStyle,
                  onPressed: onSchedule,
                  icon: const Icon(Icons.event_available, size: 16),
                  label: const Text('Schedule follow-up'),
                ),
              ),
            ],
          ],
        );
      }

      // Đã chọn ngày/giờ (draft) nhưng chưa gửi yêu cầu thanh toán.
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _summaryRow(effectiveDate, effectiveType),
          if (canManage) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: DS.outlineButtonStyle,
                    onPressed: onSchedule,
                    child: const Text('Edit'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    style: DS.primaryButtonStyle,
                    onPressed: onSendPaymentRequest,
                    child: const Text('Send payment request'),
                  ),
                ),
              ],
            ),
          ],
        ],
      );
    }

    if (s.isPendingPayment) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _summaryRow(effectiveDate, effectiveType),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.hourglass_top, size: 14, color: DS.amber600),
              const SizedBox(width: 6),
              const Text('Waiting for patient to pay...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.amber700)),
            ],
          ),
          if (canManage) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                style: DS.destructiveButtonStyle,
                onPressed: onCancelPending,
                child: const Text('Cancel request'),
              ),
            ),
          ],
        ],
      );
    }

    // PAID
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _summaryRow(effectiveDate, effectiveType),
        const SizedBox(height: 10),
        Row(
          children: [
            const Icon(Icons.check_circle, size: 14, color: DS.emerald600),
            const SizedBox(width: 6),
            const Text('Follow-up confirmed', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.emerald700)),
          ],
        ),
        if (canManage) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: DS.outlineButtonStyle,
              onPressed: onReschedule,
              icon: const Icon(Icons.event_repeat, size: 16),
              label: const Text('Reschedule'),
            ),
          ),
        ],
      ],
    );
  }

  Widget _summaryRow(DateTime? date, String? type) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: DS.background, borderRadius: BorderRadius.circular(8), border: Border.all(color: DS.cardBorder)),
      child: Row(
        children: [
          const Icon(Icons.event_note, size: 16, color: DS.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              date != null ? DateFormat('EEE, dd MMM yyyy · HH:mm').format(date) : 'No date selected',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground),
            ),
          ),
          if (type != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(6)),
              child: Text(type == 'HomeVisit' ? 'Home Visit' : 'Online', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: DS.mutedForeground)),
            ),
        ],
      ),
    );
  }
}
