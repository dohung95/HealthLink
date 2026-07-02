import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../services/patient/patient_service.dart';
import '../../services/patient/vitals/vital_sign_service.dart';
import '../../models/doctor/doctor_patient.dart';
import '../../models/patient/patient_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/doctor/patient_prescription_detail_view.dart';

class DoctorPatientDetailScreen extends StatefulWidget {
  const DoctorPatientDetailScreen({super.key, required this.patient});

  final DoctorPatient patient;

  @override
  State<DoctorPatientDetailScreen> createState() => _DoctorPatientDetailScreenState();
}

class _DoctorPatientDetailScreenState extends State<DoctorPatientDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _history;
  PatientProfile? _patientProfile;

  bool _loadingVitals = true;
  Map<String, dynamic>? _latestVitals;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
    _loadVitals();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final results = await Future.wait([
        DoctorService.getPatientHistory(token, widget.patient.patientId),
        PatientService.getPatientProfileById(token, widget.patient.patientId),
      ]);

      if (mounted) {
        setState(() {
          _history = results[0] as Map<String, dynamic>;
          _patientProfile = results[1] as PatientProfile;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadVitals() async {
    setState(() => _loadingVitals = true);
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) return;

      final list = await VitalSignService.getPatientVitalSigns(token, widget.patient.patientId);
      if (mounted) {
        setState(() {
          _latestVitals = list.isNotEmpty ? Map<String, dynamic>.from(list.last as Map) : null;
          _loadingVitals = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingVitals = false);
    }
  }

  Future<void> _handleRefresh() => Future.wait([_loadData(), _loadVitals()]);

  List<String> _splitList(String? raw) {
    if (raw == null || raw.trim().isEmpty) return [];
    return raw.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
  }

  DateTime? _dynDate(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }

  String _ageFromDob(DateTime? dob) {
    if (dob == null) return '?';
    final now = DateTime.now();
    int age = now.year - dob.year;
    if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) age--;
    return '$age';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Unknown';
    return DateFormat('MMM d, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        children: [
          DoctorBackHeader(title: 'Patient Details', onBack: () => Navigator.pop(context)),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: DS.primary))
                : _error != null
                    ? _buildErrorWidget()
                    : Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                            child: _buildPatientHeader(),
                          ),
                          const SizedBox(height: 12),
                          TabBar(
                            controller: _tabController,
                            labelColor: DS.primary,
                            unselectedLabelColor: DS.mutedForeground,
                            indicatorColor: DS.primary,
                            labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            tabs: const [
                              Tab(text: 'Overview'),
                              Tab(text: 'Prescriptions'),
                              Tab(text: 'Documents'),
                            ],
                          ),
                          Expanded(
                            child: TabBarView(
                              controller: _tabController,
                              children: [
                                _buildOverviewTab(),
                                _buildPrescriptionsTab(),
                                _buildDocumentsTab(),
                              ],
                            ),
                          ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(color: DS.secondary, shape: BoxShape.circle),
              child: Icon(Icons.error_outline, size: 28, color: DS.mutedForeground.withValues(alpha: 0.6)),
            ),
            const SizedBox(height: 16),
            const Text('Failed to load patient history', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
            const SizedBox(height: 4),
            Text(_error ?? '', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
            const SizedBox(height: 24),
            ElevatedButton.icon(onPressed: _handleRefresh, icon: const Icon(Icons.refresh, size: 18), label: const Text('Retry'), style: DS.primaryButtonStyle),
          ],
        ),
      ),
    );
  }

  Widget _buildPatientHeader() {
    final patient = widget.patient;

    return Column(children: [
      DoctorPersonAvatar(
        name: patient.fullName ?? 'Patient',
        imageUrl: patient.avatarUrl != null ? ApiConfig.normalizeUrl(patient.avatarUrl!) : null,
        size: 80,
      ),
      const SizedBox(height: 12),
      Text(patient.fullName ?? 'Unknown', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: DS.foreground)),
      const SizedBox(height: 4),
      Text('${_ageFromDob(patient.dateOfBirth)} years · ${patient.gender ?? 'Unknown'}', style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
      const SizedBox(height: 16),
      Row(children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Calling ${patient.fullName}...'), behavior: SnackBarBehavior.floating));
            },
            icon: const Icon(Icons.phone_outlined, size: 16),
            label: const Text('Call'),
            style: DS.outlineButtonStyle,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.chat_bubble_outline, size: 16),
            label: const Text('Chat'),
            style: DS.primaryButtonStyle,
          ),
        ),
      ]),
    ]);
  }

  // ── Overview ────────────────────────────────────────────────────────────

  Widget _buildOverviewTab() {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: DS.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          _buildStatsStrip(),
          const SizedBox(height: 20),
          _buildPatientInfoCard(),
          const SizedBox(height: 20),
          _buildAllergiesCard(),
          const SizedBox(height: 20),
          _buildEmergencyContactCard(),
          const SizedBox(height: 20),
          _buildVitalsCard(),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }

  Widget _statCard(IconData icon, String label, String value, Color color) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 3),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        decoration: DS.cardDecoration,
        child: Column(children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: DS.foreground)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, color: DS.mutedForeground), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }

  Widget _buildStatsStrip() {
    final data = _history ?? {};
    final appointments = (data['appointments'] as List<dynamic>?) ?? [];
    final completedVisits = appointments.where((a) => (a as Map)['status']?.toString().toLowerCase() == 'completed').length;
    final prescriptionsCount = (data['prescriptions'] as List<dynamic>?)?.length ?? 0;
    final chronicCount = _splitList(data['chronicConditions']?.toString()).length;
    final allergyCount = _splitList(data['allergies']?.toString()).length;

    return Row(children: [
      _statCard(Icons.calendar_month, 'Visits', '$completedVisits', DS.primary),
      _statCard(Icons.medication_outlined, 'Prescriptions', '$prescriptionsCount', DS.emerald600),
      _statCard(Icons.monitor_heart_outlined, 'Chronic', '$chronicCount', DS.amber600),
      _statCard(Icons.warning_amber, 'Allergies', '$allergyCount', DS.rose600),
    ]);
  }

  Widget _buildPatientInfoCard() {
    final data = _history ?? {};
    final dob = _dynDate(data['dateOfBirth']) ?? widget.patient.dateOfBirth;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const DoctorSectionLabel('Patient Information'),
        const SizedBox(height: 4),
        const Divider(height: 1, color: DS.border),
        DoctorInfoRow(icon: Icons.wc_outlined, label: 'Gender', value: data['gender']?.toString() ?? widget.patient.gender ?? 'Not provided'),
        const Divider(height: 1, color: DS.border),
        DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: data['phoneNumber']?.toString() ?? widget.patient.phoneNumber ?? 'Not provided'),
        const Divider(height: 1, color: DS.border),
        DoctorInfoRow(icon: Icons.bloodtype_outlined, label: 'Blood Type', value: data['bloodType']?.toString() ?? widget.patient.bloodType ?? 'Not provided'),
        const Divider(height: 1, color: DS.border),
        DoctorInfoRow(icon: Icons.cake_outlined, label: 'Date of Birth', value: _formatDate(dob)),
      ]),
    );
  }

  Widget _buildAllergiesCard() {
    final data = _history ?? {};
    final allergyList = _splitList(data['allergies']?.toString());

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const DoctorSectionLabel('Allergies'),
        const SizedBox(height: 8),
        if (allergyList.isEmpty)
          const Text('No known allergies.', style: TextStyle(fontSize: 14, color: DS.mutedForeground))
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: allergyList.map((allergy) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: DS.amber50, borderRadius: BorderRadius.circular(6), border: Border.all(color: DS.amber200)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.warning_amber, size: 12, color: DS.amber700),
                const SizedBox(width: 4),
                Text(allergy, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DS.amber700)),
              ]),
            )).toList(),
          ),
      ]),
    );
  }

  Widget _buildEmergencyContactCard() {
    final profile = _patientProfile;
    final hasContact = profile?.emergencyContactName?.isNotEmpty == true;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const DoctorSectionLabel('Emergency Contact'),
        const SizedBox(height: 10),
        if (!hasContact)
          Row(children: [
            Icon(Icons.add_circle_outline, color: DS.mutedForeground.withValues(alpha: 0.5), size: 28),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('No emergency contact', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground)),
                Text('Patient has not provided one yet', style: TextStyle(fontSize: 12, color: DS.mutedForeground)),
              ]),
            ),
          ])
        else ...[
          DoctorInfoRow(icon: Icons.person_outline, label: 'Name', value: profile!.emergencyContactName!),
          if ((profile.emergencyContactRelationship ?? '').isNotEmpty) ...[
            const Divider(height: 1, color: DS.border),
            DoctorInfoRow(icon: Icons.badge_outlined, label: 'Relationship', value: profile.emergencyContactRelationship!),
          ],
          const Divider(height: 1, color: DS.border),
          DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: profile.emergencyContactPhone ?? 'Not provided'),
        ],
      ]),
    );
  }

  Widget _vitalBadge(IconData icon, String value, String? unit) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: DS.primary),
        const SizedBox(width: 4),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: DS.foreground)),
        if (unit != null) ...[
          const SizedBox(width: 2),
          Text(unit, style: const TextStyle(fontSize: 10, color: DS.mutedForeground)),
        ],
      ]),
    );
  }

  Widget _buildVitalsCard() {
    final heightCm = _patientProfile?.heightCm ?? (_history?['heightCm'] as num?)?.toDouble();
    final weightKg = _patientProfile?.weightKg ?? (_history?['weightKg'] as num?)?.toDouble();
    final bmi = (heightCm != null && weightKg != null && heightCm > 0)
        ? (weightKg / ((heightCm / 100) * (heightCm / 100))).toStringAsFixed(1)
        : null;
    final v = _latestVitals;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const DoctorSectionLabel('Vital Signs'),
        const SizedBox(height: 10),
        if (_loadingVitals)
          const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary))))
        else if (v == null)
          const Text('No vitals recorded', style: TextStyle(fontSize: 13, color: DS.mutedForeground))
        else
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (v['heartRate'] != null) _vitalBadge(Icons.favorite_border, '${v['heartRate']}', 'bpm'),
            if (v['bloodPressureSystolic'] != null) _vitalBadge(Icons.monitor_heart_outlined, '${v['bloodPressureSystolic']}/${v['bloodPressureDiastolic'] ?? '?'}', 'mmHg'),
            if (v['oxygenSaturation'] != null) _vitalBadge(Icons.air, '${v['oxygenSaturation']}', '%'),
            if (v['temperature'] != null) _vitalBadge(Icons.thermostat_outlined, '${v['temperature']}', '°C'),
            if (v['respiratoryRate'] != null) _vitalBadge(Icons.waves, '${v['respiratoryRate']}', 'br/pm'),
          ]),
        if (heightCm != null || weightKg != null) ...[
          const SizedBox(height: 12),
          const Divider(height: 1, color: DS.border),
          const SizedBox(height: 8),
          const Text('BODY METRICS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.mutedForeground, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (heightCm != null) _vitalBadge(Icons.height, heightCm.toStringAsFixed(0), 'cm'),
            if (weightKg != null) _vitalBadge(Icons.monitor_weight_outlined, weightKg.toStringAsFixed(0), 'kg'),
            if (bmi != null) _vitalBadge(Icons.calculate_outlined, bmi, null),
          ]),
        ],
      ]),
    );
  }

  // ── Prescriptions ───────────────────────────────────────────────────────

  Widget _buildPrescriptionsTab() {
    final prescriptions = (_history?['prescriptions'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: DS.primary,
      child: prescriptions.isEmpty
          ? SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 60),
                child: Center(
                  child: Column(children: [
                    Icon(Icons.medication_outlined, size: 48, color: DS.mutedForeground.withValues(alpha: 0.4)),
                    const SizedBox(height: 12),
                    const Text('No prescriptions found', style: TextStyle(color: DS.mutedForeground)),
                  ]),
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: prescriptions.length,
              itemBuilder: (context, index) => _PatientPrescriptionRow(
                data: prescriptions[index],
                onTap: () => _openPrescriptionDetail(prescriptions[index]),
              ),
            ),
    );
  }

  void _openPrescriptionDetail(Map<String, dynamic> prescription) {
    final appointments = (_history?['appointments'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PatientPrescriptionDetailView(
        prescription: prescription,
        appointments: appointments,
      ),
    );
  }

  // ── Documents ───────────────────────────────────────────────────────────

  Widget _buildDocumentsTab() {
    final docs = (_history?['documentsByCategory'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    if (docs.isEmpty) {
      return const Center(child: Text('No documents found.', style: TextStyle(color: DS.mutedForeground)));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: docs.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final doc = docs[index];
        final count = doc['documentCount'] ?? 0;
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: DS.cardDecoration,
          child: Row(children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(color: DS.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.folder_outlined, color: DS.primary, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(doc['category']?.toString() ?? 'Documents', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground))),
            Text('$count document${count == 1 ? '' : 's'}', style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
          ]),
        );
      },
    );
  }
}

class _PatientPrescriptionRow extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onTap;

  const _PatientPrescriptionRow({required this.data, required this.onTap});

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

  String _formatDate(dynamic raw) {
    if (raw == null) return '—';
    final dt = DateTime.tryParse(raw.toString());
    if (dt == null) return raw.toString();
    return DateFormat('dd MMM yyyy').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final status = (data['status']?.toString() ?? 'ISSUED').toUpperCase();
    final rxId = data['prescriptionHeaderId'] != null
        ? 'RX-${data['prescriptionHeaderId'].toString().padLeft(4, '0')}'
        : 'RX-0000';
    final items = data['items'] as List<dynamic>? ?? [];
    final diagnosis = data['diagnosis']?.toString() ?? '';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: DS.cardDecoration,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(_formatDate(data['createdAt'] ?? data['issueDate']), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.primary)),
            const Spacer(),
            Container(width: 8, height: 8, decoration: BoxDecoration(color: _statusColor(status), shape: BoxShape.circle)),
          ]),
          const SizedBox(height: 4),
          Text(rxId, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: DS.foreground)),
          const SizedBox(height: 2),
          Text(diagnosis.isNotEmpty ? diagnosis : '${items.length} medication(s)', style: const TextStyle(fontSize: 13, color: DS.mutedForeground), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }
}
