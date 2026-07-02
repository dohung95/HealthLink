import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../models/patient/patient_profile.dart';
import '../../services/patient/patient_service.dart';
import '../../config/doctor_theme.dart';

/// Bottom sheet xem chi tiết một đơn thuốc do bác sĩ kê — bố cục tương tự
/// trang "Prescriptions" trên web (RX-ID + status, Diagnosis, Doctor Notes,
/// Patient Information, Medications + Print).
class PrescriptionDetailSheet extends StatefulWidget {
  final Map<String, dynamic> prescription;
  final String token;
  final String? doctorName;
  final String? doctorSpecialty;

  const PrescriptionDetailSheet({
    super.key,
    required this.prescription,
    required this.token,
    this.doctorName,
    this.doctorSpecialty,
  });

  @override
  State<PrescriptionDetailSheet> createState() => _PrescriptionDetailSheetState();
}

class _PrescriptionDetailSheetState extends State<PrescriptionDetailSheet> {
  PatientProfile? _patientProfile;
  bool _loadingProfile = false;
  bool _patientInfoExpanded = false;

  @override
  void initState() {
    super.initState();
    _loadPatientProfile();
  }

  Future<void> _loadPatientProfile() async {
    final patientId = widget.prescription['patientId']?.toString();
    if (patientId == null || patientId.isEmpty) return;

    setState(() => _loadingProfile = true);
    try {
      final profile = await PatientService.getPatientProfileById(widget.token, patientId);
      if (mounted) setState(() => _patientProfile = profile);
    } catch (_) {
      // Falls back to the patientName already embedded in the prescription.
    } finally {
      if (mounted) setState(() => _loadingProfile = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'ACTIVE':
        return DS.emerald600;
      case 'ISSUED':
        return DS.amber600;
      case 'EXPIRED':
        return DS.mutedForeground;
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

  String _formatDate(dynamic raw) {
    if (raw == null) return '—';
    try {
      final dt = raw is DateTime ? raw : DateTime.parse(raw.toString());
      final date = '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
      return date;
    } catch (_) {
      return raw.toString();
    }
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.prescription;
    final status = (p['status']?.toString() ?? 'ISSUED').toUpperCase();
    final items = (p['items'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final rxId = p['prescriptionHeaderId'] != null
        ? 'RX-${p['prescriptionHeaderId'].toString().padLeft(4, '0')}'
        : 'RX-0000';
    final patientName = _patientProfile?.fullName ?? p['patientName']?.toString() ?? 'Unknown Patient';
    final patientId = p['patientId']?.toString() ?? '—';

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
                  onPressed: () => _printPrescription(p, items, patientName, patientId),
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
                  Text('Issued: ${_formatDate(p['createdAt'] ?? p['issueDate'])}', style: const TextStyle(fontSize: 13, color: DS.mutedForeground)),
                  const SizedBox(height: 16),

                  if ((p['diagnosis'] as String?)?.isNotEmpty == true) ...[
                    _sectionLabel('DIAGNOSIS'),
                    const SizedBox(height: 6),
                    _card(Text(p['diagnosis'].toString(), style: const TextStyle(fontSize: 14, color: DS.foreground))),
                    const SizedBox(height: 16),
                  ],

                  if ((p['notes'] as String?)?.isNotEmpty == true) ...[
                    _sectionLabel('DOCTOR NOTES'),
                    const SizedBox(height: 6),
                    _card(Text(p['notes'].toString(), style: const TextStyle(fontSize: 14, color: DS.foreground, height: 1.4))),
                    const SizedBox(height: 16),
                  ],

                  _sectionLabel('PATIENT INFORMATION'),
                  const SizedBox(height: 6),
                  _card(
                    _loadingProfile
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                                SizedBox(width: 10),
                                Text('Loading patient...', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
                              ],
                            ),
                          )
        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              InkWell(
                                onTap: _patientProfile == null
                                    ? null
                                    : () => setState(() => _patientInfoExpanded = !_patientInfoExpanded),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(color: DS.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
                                      child: Center(
                                        child: Text(_initials(patientName), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: DS.primary)),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(patientName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: DS.foreground)),
                                          Text('PID: $patientId', style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                                        ],
                                      ),
                                    ),
                                    if (_patientProfile != null)
                                      Icon(
                                        _patientInfoExpanded ? Icons.expand_less : Icons.expand_more,
                                        color: DS.mutedForeground,
                                      ),
                                  ],
                                ),
                              ),
                              if (_patientProfile != null && _patientInfoExpanded) ...[
                                const Divider(height: 24, color: DS.cardBorder),
                                Wrap(
                                  runSpacing: 8,
                                  children: [
                                    if (_patientProfile?.email?.isNotEmpty == true) _infoRow(Icons.mail_outline, _patientProfile!.email!),
                                    if (_patientProfile?.phoneNumber?.isNotEmpty == true) _infoRow(Icons.call_outlined, _patientProfile!.phoneNumber!),
                                    if (_patientProfile?.dateOfBirth != null) _infoRow(Icons.cake_outlined, _formatDate(_patientProfile!.dateOfBirth)),
                                    if (_patientProfile?.gender?.isNotEmpty == true) _infoRow(Icons.wc_outlined, _patientProfile!.gender!),
                                  ],
                                ),
                              ],
                            ],
                          ),
                  ),
                  const SizedBox(height: 16),

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

  Widget _sectionLabel(String text) => Text(
        text,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.mutedForeground, letterSpacing: 0.5),
      );

  Widget _card(Widget child) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: DS.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: DS.cardBorder)),
        child: child,
      );

  Widget _infoRow(IconData icon, String text) => SizedBox(
        width: 220,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: DS.mutedForeground),
            const SizedBox(width: 6),
            Flexible(child: Text(text, style: const TextStyle(fontSize: 13, color: DS.foreground), overflow: TextOverflow.ellipsis)),
          ],
        ),
      );

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
    Map<String, dynamic> prescription,
    List<Map<String, dynamic>> items,
    String patientName,
    String patientId,
  ) async {
    final pdf = pw.Document();
    final profile = _patientProfile;

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
                  pw.Text('${widget.doctorName ?? 'Doctor'}${widget.doctorSpecialty != null ? ', ${widget.doctorSpecialty}' : ''}', style: const pw.TextStyle(fontSize: 10)),
                  pw.SizedBox(height: 16),
                  pw.Text('MEDICAL PRESCRIPTION', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, decoration: pw.TextDecoration.underline)),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            pw.Text('Patient Information', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 6),
            pw.Text('Name: $patientName', style: const pw.TextStyle(fontSize: 11)),
            pw.Text('Patient ID: $patientId', style: const pw.TextStyle(fontSize: 11)),
            if (profile?.email?.isNotEmpty == true) pw.Text('Email: ${profile!.email}', style: const pw.TextStyle(fontSize: 11)),
            if (profile?.phoneNumber?.isNotEmpty == true) pw.Text('Phone: ${profile!.phoneNumber}', style: const pw.TextStyle(fontSize: 11)),
            if (profile?.dateOfBirth != null) pw.Text('DOB: ${_formatDate(profile!.dateOfBirth)}', style: const pw.TextStyle(fontSize: 11)),
            pw.SizedBox(height: 16),

            pw.Text('Date Issued: ${_formatDate(prescription['createdAt'] ?? prescription['issueDate'])}', style: const pw.TextStyle(fontSize: 12)),
            if ((prescription['diagnosis'] as String?)?.isNotEmpty == true)
              pw.Text('Diagnosis: ${prescription['diagnosis']}', style: const pw.TextStyle(fontSize: 12)),
            pw.SizedBox(height: 20),

            pw.Text('Prescribed Medications', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
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

            if ((prescription['notes'] as String?)?.isNotEmpty == true) ...[
              pw.SizedBox(height: 20),
              pw.Text("Doctor's Advice", style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 8),
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 1)),
                child: pw.Text(prescription['notes'].toString(), style: const pw.TextStyle(fontSize: 10)),
              ),
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
