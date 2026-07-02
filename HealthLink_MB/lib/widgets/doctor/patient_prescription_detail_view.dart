import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../config/doctor_theme.dart';

/// Read-only prescription detail used from the patient detail screen —
/// mirrors the web's PrescriptionDetailModal + AdminFormSection: diagnosis /
/// doctor notes / treatment plan are sourced from the linked appointment
/// (richer than the prescription record alone), plus a read-only medication
/// list and a Print button. Unlike [PrescriptionDetailSheet] (used by the
/// standalone Prescriptions screen) this view has no Patient Information
/// section, since it's already shown on the page the sheet is opened from.
class PatientPrescriptionDetailView extends StatelessWidget {
  final Map<String, dynamic> prescription;
  final List<Map<String, dynamic>> appointments;

  const PatientPrescriptionDetailView({
    super.key,
    required this.prescription,
    required this.appointments,
  });

  Map<String, dynamic>? get _matchedAppointment {
    final appointmentId = prescription['appointmentId']?.toString();
    if (appointmentId == null) return null;
    for (final a in appointments) {
      if (a['appointmentID']?.toString() == appointmentId) return a;
    }
    return null;
  }

  String _stripHtml(String? value) {
    if (value == null) return '';
    return value.replaceAll(RegExp(r'<[^>]*>'), '').trim();
  }

  String _formatDate(dynamic raw) {
    if (raw == null) return '—';
    final dt = DateTime.tryParse(raw.toString());
    if (dt == null) return raw.toString();
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'ACTIVE':
        return DS.emerald600;
      case 'ISSUED':
        return DS.amber600;
      default:
        return DS.mutedForeground;
    }
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'ACTIVE':
        return DS.emerald100;
      case 'ISSUED':
        return DS.amber100;
      default:
        return DS.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final appointment = _matchedAppointment;
    final diagnosis = _stripHtml(appointment?['diagnosis']?.toString() ?? prescription['diagnosis']?.toString());
    final doctorNotes = _stripHtml(appointment?['doctorNotes']?.toString());
    final treatmentPlan = _stripHtml(appointment?['treatmentPlan']?.toString());
    final status = (prescription['status']?.toString() ?? 'ISSUED').toUpperCase();
    final rxId = prescription['prescriptionHeaderId'] != null
        ? 'RX-${prescription['prescriptionHeaderId'].toString().padLeft(4, '0')}'
        : 'RX-0000';
    final items = (prescription['items'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: DS.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 18, 8, 14),
            decoration: const BoxDecoration(
              color: DS.card,
              border: Border(bottom: BorderSide(color: DS.cardBorder)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(rxId, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: DS.foreground)),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: _statusBg(status), borderRadius: BorderRadius.circular(20)),
                        child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _statusColor(status))),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.print_outlined, color: DS.mutedForeground),
                  onPressed: () => _printPrescription(diagnosis, doctorNotes, treatmentPlan, items),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: DS.mutedForeground),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Issued: ${_formatDate(prescription['createdAt'] ?? prescription['issueDate'])}', style: const TextStyle(fontSize: 13, color: DS.mutedForeground)),
                  const SizedBox(height: 16),

                  _field('Diagnosis', diagnosis),
                  _field('Doctor Notes', doctorNotes),
                  _field('Treatment Plan', treatmentPlan),

                  Text('Medications (${items.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: DS.foreground)),
                  const SizedBox(height: 10),
                  if (items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Text('No medication details available', style: TextStyle(color: DS.mutedForeground)),
                    )
                  else
                    ...items.map(_buildMedicationCard),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(String label, String value) {
    if (value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.mutedForeground, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: DS.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: DS.cardBorder)),
            child: Text(value, style: const TextStyle(fontSize: 14, color: DS.foreground, height: 1.4)),
          ),
        ],
      ),
    );
  }

  Widget _buildMedicationCard(Map<String, dynamic> item) {
    final dosage = item['dosage']?.toString();
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: DS.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: DS.cardBorder)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(item['medicationName']?.toString() ?? 'Medication', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700))),
              if (dosage != null && dosage.isNotEmpty)
                Text(dosage, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: DS.primary)),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              if ((item['route'] as String?)?.isNotEmpty == true) _pill(item['route'].toString(), filled: true),
              if ((item['frequency'] as String?)?.isNotEmpty == true) _pill(item['frequency'].toString()),
              if ((item['totalSupplyDays'])?.toString().isNotEmpty == true) _pill('${item['totalSupplyDays']} days'),
            ],
          ),
          if ((item['instructions'] as String?)?.isNotEmpty == true) ...[
            const SizedBox(height: 6),
            Text(item['instructions'].toString(), style: const TextStyle(fontSize: 13, color: DS.mutedForeground)),
          ],
          if ((item['notes'] as String?)?.isNotEmpty == true) ...[
            const SizedBox(height: 6),
            Text('Note: ${item['notes']}', style: const TextStyle(fontSize: 12, color: DS.mutedForeground, fontStyle: FontStyle.italic)),
          ],
        ],
      ),
    );
  }

  Widget _pill(String text, {bool filled = false}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: filled ? DS.primary.withValues(alpha: 0.1) : DS.secondary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: filled ? DS.primary : DS.mutedForeground)),
      );

  Future<void> _printPrescription(
    String diagnosis,
    String doctorNotes,
    String treatmentPlan,
    List<Map<String, dynamic>> items,
  ) async {
    final pdf = pw.Document();
    final doctorName = prescription['doctorName']?.toString() ?? 'Doctor';
    final patientName = prescription['patientName']?.toString() ?? 'Unknown Patient';
    final patientId = prescription['patientId']?.toString() ?? '—';
    final rxId = prescription['prescriptionHeaderId'] != null
        ? 'RX-${prescription['prescriptionHeaderId'].toString().padLeft(4, '0')}'
        : '';

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context pwContext) {
          return [
            pw.Container(
              alignment: pw.Alignment.center,
              padding: const pw.EdgeInsets.only(bottom: 16),
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(width: 2))),
              child: pw.Column(
                children: [
                  pw.Text('HEALTHLINK', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 4),
                  pw.Text(doctorName, style: const pw.TextStyle(fontSize: 10)),
                  pw.SizedBox(height: 16),
                  pw.Text('MEDICAL PRESCRIPTION', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, decoration: pw.TextDecoration.underline)),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            pw.Text('$rxId — Patient: $patientName (ID: $patientId)', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.Text('Date Issued: ${_formatDate(prescription['createdAt'] ?? prescription['issueDate'])}', style: const pw.TextStyle(fontSize: 12)),
            if (diagnosis.isNotEmpty) pw.Text('Diagnosis: $diagnosis', style: const pw.TextStyle(fontSize: 12)),
            pw.SizedBox(height: 20),

            pw.Text('Medication Details', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 10),
            pw.TableHelper.fromTextArray(
              context: pwContext,
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
              cellStyle: const pw.TextStyle(fontSize: 10),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey200),
              headers: ['Medication', 'Dosage', 'Route', 'Frequency', 'Notes'],
              data: items.map((item) => [
                    item['medicationName']?.toString() ?? '',
                    item['dosage']?.toString() ?? '',
                    item['route']?.toString() ?? '',
                    item['frequency']?.toString() ?? '',
                    item['notes']?.toString() ?? '',
                  ]).toList(),
            ),

            if (doctorNotes.isNotEmpty) ...[
              pw.SizedBox(height: 20),
              pw.Text('Doctor Notes', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 6),
              pw.Text(doctorNotes, style: const pw.TextStyle(fontSize: 10)),
            ],
            if (treatmentPlan.isNotEmpty) ...[
              pw.SizedBox(height: 12),
              pw.Text('Treatment Plan', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 6),
              pw.Text(treatmentPlan, style: const pw.TextStyle(fontSize: 10)),
            ],
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Prescription_${prescription['prescriptionHeaderId'] ?? 'Document'}.pdf',
    );
  }
}
