import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_follow_up.dart';
import '../../services/doctor/doctor_service.dart';
import '../../services/doctor/doctor_follow_up_service.dart';
import '../../services/patient/patient_pharmacy/medicine_service.dart';
import '../../services/patient/vitals/vital_sign_service.dart';
import '../../config/doctor_theme.dart';
import 'doctor_widgets.dart';

class CompleteAppointmentSheet extends StatefulWidget {
  final int appointmentId;
  final String? patientName;
  final VoidCallback onCompleted;

  const CompleteAppointmentSheet({
    super.key,
    required this.appointmentId,
    this.patientName,
    required this.onCompleted,
  });

  @override
  State<CompleteAppointmentSheet> createState() => _CompleteAppointmentSheetState();
}

class _MedicationRow {
  final String id;
  final Map<String, dynamic> medicine;
  final quantityCtrl = TextEditingController();
  final supplyDaysCtrl = TextEditingController();
  final notesCtrl = TextEditingController();
  String? frequency;
  String? route;
  final Set<String> timings = {'MORNING'};

  _MedicationRow(this.id, this.medicine);

  void dispose() {
    quantityCtrl.dispose();
    supplyDaysCtrl.dispose();
    notesCtrl.dispose();
  }
}

class _CompleteAppointmentSheetState extends State<CompleteAppointmentSheet> {
  static const _frequencyOptions = [
    {'value': 'QD', 'label': 'QD (1x daily)'},
    {'value': 'BID', 'label': 'BID (2x daily)'},
    {'value': 'TID', 'label': 'TID (3x daily)'},
    {'value': 'QID', 'label': 'QID (4x daily)'},
  ];
  static const _routeOptions = ['Oral', 'Topical', 'Injection', 'Inhalation'];
  static const _timingOptions = ['MORNING', 'AFTERNOON', 'EVENING'];

  final _diagnosisCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _medQueryCtrl = TextEditingController();

  int _rowCounter = 0;
  final List<_MedicationRow> _rows = [];

  List<dynamic> _searchResults = [];
  bool _isSearching = false;
  bool _isSaving = false;
  String? _error;
  Timer? _debounce;

  // ── Readiness checklist (khớp `CompleteConfirmModal` bên web) ────────────
  bool _loadingChecklist = true;
  Map<String, dynamic>? _latestVital;
  DoctorAppointment? _appointmentDetail;
  FollowUpStatus? _followUpStatus;
  bool _copyPrescription = true;

  @override
  void initState() {
    super.initState();
    _loadChecklistData();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _diagnosisCtrl.dispose();
    _notesCtrl.dispose();
    _medQueryCtrl.dispose();
    for (final r in _rows) {
      r.dispose();
    }
    super.dispose();
  }

  Future<void> _loadChecklistData() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) {
      setState(() => _loadingChecklist = false);
      return;
    }

    Map<String, dynamic>? vital;
    try {
      vital = await VitalSignService.getLatestAppointmentVitalSign(token, widget.appointmentId);
    } catch (_) {}

    DoctorAppointment? detail;
    try {
      detail = await DoctorService.getAppointmentDetail(token, widget.appointmentId);
    } catch (_) {}

    FollowUpStatus? followUp;
    try {
      followUp = await DoctorFollowUpService(accessToken: token).getStatus(widget.appointmentId);
    } catch (_) {}

    if (!mounted) return;
    setState(() {
      _latestVital = vital;
      _appointmentDetail = detail;
      _followUpStatus = followUp;
      // Nạp sẵn diagnosis/notes đã lưu trước đó (vd: từ tab Notes trong màn
      // chi tiết) nếu người dùng chưa gõ gì trong sheet này.
      if (_diagnosisCtrl.text.isEmpty && _appointmentDetail?.diagnosis != null) {
        _diagnosisCtrl.text = _appointmentDetail!.diagnosis!;
      }
      if (_notesCtrl.text.isEmpty && _appointmentDetail?.consultationNotes != null) {
        _notesCtrl.text = _appointmentDetail!.consultationNotes!;
      }
      _loadingChecklist = false;
    });
  }

  bool get _isHomeVisit =>
      (_appointmentDetail?.consultationType ?? '').toUpperCase().contains('HOME');

  /// Backend bỏ qua yêu cầu vitals cho HomeVisit (xem
  /// `FollowUpAppointmentServiceImpl.completeAppointment`).
  bool get _vitalsSubmitted => _isHomeVisit || _latestVital != null;

  bool get _notesSaved =>
      _diagnosisCtrl.text.trim().isNotEmpty ||
      _notesCtrl.text.trim().isNotEmpty ||
      (_appointmentDetail?.diagnosis?.trim().isNotEmpty ?? false) ||
      (_appointmentDetail?.consultationNotes?.trim().isNotEmpty ?? false);

  bool get _prescriptionReady => _rows.isEmpty || _rows.every(_rowIsValid);

  bool get _hasConfiguredFollowUp =>
      _followUpStatus?.followUpDate != null || _appointmentDetail?.followUpDate != null;

  bool get _followUpPendingPayment => _followUpStatus?.isPendingPayment ?? false;

  bool get _canComplete =>
      !_loadingChecklist &&
      _vitalsSubmitted &&
      _notesSaved &&
      _prescriptionReady &&
      !_followUpPendingPayment;

  void _onQueryChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => _searchMedicine(query));
  }

  Future<void> _searchMedicine(String query) async {
    if (query.trim().isEmpty) {
      if (mounted) setState(() => _searchResults = []);
      return;
    }
    final auth = context.read<AuthProvider>();
    final token = auth.accessToken;
    if (token == null) return;

    setState(() => _isSearching = true);
    try {
      final results = await MedicineService.searchMedicines(token, keyword: query.trim());
      if (mounted) setState(() => _searchResults = results);
    } catch (_) {
      if (mounted) setState(() => _searchResults = []);
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  String _medicineDisplayName(Map<String, dynamic> m) {
    final brand = (m['brandName'] ?? '').toString();
    final generic = (m['genericName'] ?? m['name'] ?? '').toString();
    if (brand.isNotEmpty && generic.isNotEmpty && brand.toLowerCase() != generic.toLowerCase()) {
      return '$brand ($generic)';
    }
    return brand.isNotEmpty ? brand : (generic.isNotEmpty ? generic : 'Unnamed medicine');
  }

  void _addMedicine(Map<String, dynamic> medicine) {
    final id = medicine['medicineId'];
    if (_rows.any((r) => r.medicine['medicineId'] == id)) {
      showDoctorNotice(context, 'Medicine already added');
      return;
    }
    setState(() {
      _rows.add(_MedicationRow('row-${_rowCounter++}', medicine));
      _medQueryCtrl.clear();
      _searchResults = [];
    });
  }

  void _removeRow(_MedicationRow row) {
    setState(() {
      _rows.remove(row);
      row.dispose();
    });
  }

  bool _rowIsValid(_MedicationRow row) {
    final qty = int.tryParse(row.quantityCtrl.text.trim());
    final days = int.tryParse(row.supplyDaysCtrl.text.trim());
    return qty != null && qty >= 1 && days != null && days >= 1 && row.timings.isNotEmpty;
  }

  Future<void> _handleSubmit() async {
    if (!_canComplete) return;

    for (final row in _rows) {
      if (!_rowIsValid(row)) {
        setState(() => _error = 'Please fill quantity, supply days, and at least one timing for every medication.');
        return;
      }
    }

    setState(() {
      _error = null;
      _isSaving = true;
    });

    final auth = context.read<AuthProvider>();
    final token = auth.accessToken;
    if (token == null) {
      setState(() => _isSaving = false);
      return;
    }

    final diagnosis = _diagnosisCtrl.text.trim();
    final notes = _notesCtrl.text.trim();

    try {
      if (diagnosis.isNotEmpty || notes.isNotEmpty) {
        await DoctorService.updateConsultationNotes(
          token,
          widget.appointmentId,
          diagnosis: diagnosis,
          doctorNotes: notes,
        );
      }

      if (_rows.isNotEmpty) {
        await DoctorService.createPrescription(token, {
          'appointmentId': widget.appointmentId,
          if (diagnosis.isNotEmpty) 'diagnosis': diagnosis,
          if (notes.isNotEmpty) 'notes': notes,
          'items': _rows.map((row) => {
                'medicineId': row.medicine['medicineId'],
                'quantity': int.parse(row.quantityCtrl.text.trim()),
                'totalSupplyDays': int.parse(row.supplyDaysCtrl.text.trim()),
                'unit': row.medicine['unit'],
                if (row.frequency != null) 'frequency': row.frequency,
                'timings': row.timings.toList(),
                if (row.route != null) 'route': row.route,
                if (row.notesCtrl.text.trim().isNotEmpty) 'notes': row.notesCtrl.text.trim(),
              }).toList(),
        });
      }

      await DoctorService.completeAppointment(
        token,
        widget.appointmentId,
        copyPrescription: _hasConfiguredFollowUp && _copyPrescription,
      );

      if (mounted) {
        widget.onCompleted();
        Navigator.pop(context);
        showDoctorNotice(context, 'Appointment completed');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: DS.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildChecklist(),
                  const SizedBox(height: 20),
                  _sectionLabel('Diagnosis'),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _diagnosisCtrl,
                    onChanged: (_) => setState(() {}),
                    decoration: DS.inputDecoration(hintText: 'e.g. Seasonal flu'),
                  ),
                  const SizedBox(height: 16),
                  _sectionLabel('Doctor notes'),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _notesCtrl,
                    maxLines: 3,
                    onChanged: (_) => setState(() {}),
                    decoration: DS.inputDecoration(hintText: 'Consultation notes for the patient record'),
                  ),
                  const SizedBox(height: 20),
                  _sectionLabel('Prescription (optional)'),
                  const SizedBox(height: 6),
                  _buildMedicineSearch(),
                  const SizedBox(height: 12),
                  ..._rows.map(_buildMedicationRow),
                  if (_hasConfiguredFollowUp) ...[
                    const SizedBox(height: 16),
                    _buildCopyPrescriptionToggle(),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: DS.rose100,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(_error!, style: const TextStyle(color: DS.rose700, fontSize: 13)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          _buildFooter(),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) => Text(
        text,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground),
      );

  /// Checklist sẵn sàng hoàn tất — khớp `CompleteConfirmModal` bên web
  /// (Vitals/Notes/Prescription bắt buộc, Follow-up chỉ mang tính thông tin).
  Widget _buildChecklist() {
    if (_loadingChecklist) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary))),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: DS.background, borderRadius: BorderRadius.circular(10), border: Border.all(color: DS.cardBorder)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ChecklistRow(icon: Icons.favorite_border, label: 'Patient Vitals', done: _vitalsSubmitted),
          _ChecklistRow(icon: Icons.article_outlined, label: 'Consultation Notes', done: _notesSaved),
          _ChecklistRow(icon: Icons.medication_outlined, label: 'Prescription', done: _prescriptionReady),
          _ChecklistRow(icon: Icons.event_available, label: 'Follow-up', done: _hasConfiguredFollowUp, optional: true),
          if (_followUpPendingPayment) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: DS.amber100, borderRadius: BorderRadius.circular(8)),
              child: const Row(
                children: [
                  Icon(Icons.hourglass_top, size: 16, color: DS.amber700),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Follow-up payment pending. Waiting for patient to pay before you can complete.',
                      style: TextStyle(fontSize: 12, color: DS.amber700),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCopyPrescriptionToggle() {
    return InkWell(
      onTap: () => setState(() => _copyPrescription = !_copyPrescription),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: DS.background, borderRadius: BorderRadius.circular(10), border: Border.all(color: DS.cardBorder)),
        child: Row(
          children: [
            Checkbox(
              value: _copyPrescription,
              activeColor: DS.primary,
              onChanged: (v) => setState(() => _copyPrescription = v ?? true),
            ),
            const SizedBox(width: 4),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Copy prescription', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground)),
                  Text('Copy latest prescription to the follow-up appointment', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
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
                const Text('Complete Appointment', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: DS.foreground)),
                if (widget.patientName != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(widget.patientName!, style: const TextStyle(fontSize: 13, color: DS.mutedForeground)),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: _isSaving ? null : () => Navigator.pop(context),
            icon: const Icon(Icons.close, color: DS.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _buildMedicineSearch() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _medQueryCtrl,
          onChanged: _onQueryChanged,
          decoration: DS.inputDecoration(
            hintText: 'Search medicines, brands, or generics...',
            prefixIcon: const Icon(Icons.search, size: 20, color: DS.mutedForeground),
            suffixIcon: _isSearching
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : null,
          ),
        ),
        if (_searchResults.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 6),
            constraints: const BoxConstraints(maxHeight: 220),
            decoration: DS.cardDecoration,
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.symmetric(vertical: 4),
              itemCount: _searchResults.length,
              separatorBuilder: (_, _) => const Divider(height: 1, color: DS.cardBorder),
              itemBuilder: (context, index) {
                final medicine = Map<String, dynamic>.from(_searchResults[index] as Map);
                final strength = medicine['strength']?.toString();
                return ListTile(
                  dense: true,
                  title: Text(_medicineDisplayName(medicine), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: (medicine['dosageForm'] != null || strength != null)
                      ? Text(
                          [medicine['dosageForm'], strength].where((e) => e != null && e.toString().isNotEmpty).join(' · '),
                          style: const TextStyle(fontSize: 12, color: DS.mutedForeground),
                        )
                      : null,
                  trailing: const Icon(Icons.add_circle_outline, color: DS.primary, size: 20),
                  onTap: () => _addMedicine(medicine),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildMedicationRow(_MedicationRow row) {
    final strength = row.medicine['strength']?.toString();
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  strength != null && strength.isNotEmpty
                      ? '${_medicineDisplayName(row.medicine)} · $strength'
                      : _medicineDisplayName(row.medicine),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground),
                ),
              ),
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                icon: const Icon(Icons.delete_outline, size: 18, color: DS.rose600),
                onPressed: () => _removeRow(row),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: row.quantityCtrl,
                  keyboardType: TextInputType.number,
                  decoration: DS.inputDecoration(hintText: 'Quantity *'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: row.supplyDaysCtrl,
                  keyboardType: TextInputType.number,
                  decoration: DS.inputDecoration(hintText: 'Supply days *'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: row.frequency,
                  decoration: DS.inputDecoration(hintText: 'Frequency'),
                  items: _frequencyOptions
                      .map((f) => DropdownMenuItem(value: f['value'], child: Text(f['label']!, overflow: TextOverflow.ellipsis)))
                      .toList(),
                  onChanged: (v) => setState(() => row.frequency = v),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: row.route,
                  decoration: DS.inputDecoration(hintText: 'Route'),
                  items: _routeOptions.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                  onChanged: (v) => setState(() => row.route = v),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text('Timing *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.mutedForeground)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            children: _timingOptions.map((t) {
              final selected = row.timings.contains(t);
              return FilterChip(
                label: Text(t[0] + t.substring(1).toLowerCase(), style: const TextStyle(fontSize: 12)),
                selected: selected,
                selectedColor: DS.primary.withValues(alpha: 0.15),
                checkmarkColor: DS.primary,
                labelStyle: TextStyle(color: selected ? DS.primary : DS.mutedForeground),
                onSelected: (v) => setState(() {
                  v ? row.timings.add(t) : row.timings.remove(t);
                }),
              );
            }).toList(),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: row.notesCtrl,
            decoration: DS.inputDecoration(hintText: 'Instructions (optional)'),
          ),
        ],
      ),
    );
  }

  String? get _completeHint {
    if (_isSaving || _loadingChecklist) return null;
    if (_followUpPendingPayment) return 'Waiting for patient to pay the follow-up request.';
    if (!_vitalsSubmitted) return 'Patient has not submitted vitals for this appointment yet.';
    if (!_notesSaved) return 'Add a diagnosis or consultation notes first.';
    if (!_prescriptionReady) return 'Fill quantity, supply days, and timing for every medication.';
    return null;
  }

  Widget _buildFooter() {
    final hint = _completeHint;
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).viewInsets.bottom > 0 ? 12 : 24),
      decoration: const BoxDecoration(
        color: DS.card,
        border: Border(top: BorderSide(color: DS.cardBorder)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (hint != null) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(hint, style: const TextStyle(fontSize: 12, color: DS.rose600), textAlign: TextAlign.center),
            ),
          ],
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: DS.outlineButtonStyle,
                  onPressed: _isSaving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  style: DS.primaryButtonStyle,
                  onPressed: (_isSaving || !_canComplete) ? null : _handleSubmit,
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Complete Appointment'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool done;
  final bool optional;

  const _ChecklistRow({
    required this.icon,
    required this.label,
    required this.done,
    this.optional = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = done ? DS.emerald600 : (optional ? DS.amber600 : DS.rose600);
    final bg = done ? DS.emerald100 : (optional ? DS.amber100 : DS.rose100);
    final statusText = done ? 'Ready' : (optional ? 'Optional' : 'Not ready');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
        child: Row(
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 8),
            Expanded(child: Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: DS.foreground))),
            Text(statusText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      ),
    );
  }
}
