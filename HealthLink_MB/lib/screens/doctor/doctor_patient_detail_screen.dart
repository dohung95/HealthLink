import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../services/patient/patient_service.dart';
import '../../services/patient/vitals/vital_sign_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_patient.dart';
import '../../models/patient/patient_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import 'doctor_appointment_detail_screen.dart';

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

  static const int _timelinePageSize = 7;
  int _timelinePage = 1;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
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
                              Tab(text: 'Timeline'),
                            ],
                          ),
                          Expanded(
                            child: TabBarView(
                              controller: _tabController,
                              children: [
                                _buildOverviewTab(),
                                _buildTimelineTab(),
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
      Text(
        patient.email ?? patient.phoneNumber ?? 'No contact listed',
        style: const TextStyle(fontSize: 14, color: DS.mutedForeground),
      ),
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
          Icon(icon, size: 26, color: color),
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
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(children: [
                DoctorInfoRow(icon: Icons.wc_outlined, label: 'Gender', value: data['gender']?.toString() ?? widget.patient.gender ?? 'Not provided'),
                const Divider(height: 1, color: DS.border),
                DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: data['phoneNumber']?.toString() ?? widget.patient.phoneNumber ?? 'Not provided'),
              ]),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(children: [
                DoctorInfoRow(icon: Icons.bloodtype_outlined, label: 'Blood Type', value: data['bloodType']?.toString() ?? widget.patient.bloodType ?? 'Not provided'),
                const Divider(height: 1, color: DS.border),
                DoctorInfoRow(icon: Icons.cake_outlined, label: 'Date of Birth', value: _formatDate(dob)),
              ]),
            ),
          ],
        ),
      ]),
    );
  }

  Widget _buildEmergencyContactCard() {
    final profile = _patientProfile;
    final hasContact = profile?.emergencyContactName?.isNotEmpty == true;
    final allergyList = _splitList((_history ?? {})['allergies']?.toString());

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const DoctorSectionLabel('Emergency Contact'),
        const SizedBox(height: 10),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: !hasContact
                    ? Row(children: [
                        Icon(Icons.add_circle_outline, color: DS.mutedForeground.withValues(alpha: 0.5), size: 28),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('No emergency contact', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground)),
                            Text('Patient has not provided one yet', style: TextStyle(fontSize: 12, color: DS.mutedForeground)),
                          ]),
                        ),
                      ])
                    : Column(children: [
                        DoctorInfoRow(icon: Icons.person_outline, label: 'Name', value: profile!.emergencyContactName!),
                        if ((profile.emergencyContactRelationship ?? '').isNotEmpty) ...[
                          const Divider(height: 1, color: DS.border),
                          DoctorInfoRow(icon: Icons.badge_outlined, label: 'Relationship', value: profile.emergencyContactRelationship!),
                        ],
                        const Divider(height: 1, color: DS.border),
                        DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: profile.emergencyContactPhone ?? 'Not provided'),
                      ]),
              ),
              const SizedBox(width: 12),
              Expanded(child: _buildAllergiesColumn(allergyList)),
            ],
          ),
        ),
      ]),
    );
  }

  Widget _buildAllergiesColumn(List<String> allergyList) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 130),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 10),
          decoration: BoxDecoration(
            color: DS.amber50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: DS.amber200),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.center, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.warning_amber_rounded, size: 14, color: DS.amber700),
              const SizedBox(width: 4),
              const Text('Allergies', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: DS.amber700)),
            ]),
            const SizedBox(height: 6),
            if (allergyList.isEmpty)
              const Text('None', style: TextStyle(fontSize: 12, color: DS.mutedForeground))
            else
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 6,
                runSpacing: 6,
                children: allergyList.map((allergy) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: DS.amber700, borderRadius: BorderRadius.circular(6)),
                  child: Text(allergy, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white)),
                )).toList(),
              ),
          ]),
        ),
      ),
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

  Widget _buildVitalsRows(List<Widget> badges) {
    if (badges.isEmpty) return const SizedBox.shrink();
    final rows = <Widget>[];
    for (var i = 0; i < badges.length; i += 3) {
      final rowItems = badges.sublist(i, i + 3 > badges.length ? badges.length : i + 3);
      rows.add(Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var j = 0; j < rowItems.length; j++) ...[
            if (j > 0) const SizedBox(width: 8),
            rowItems[j],
          ],
        ],
      ));
    }
    return Column(
      children: [
        for (var i = 0; i < rows.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          rows[i],
        ],
      ],
    );
  }

  Widget _buildVitalsCard() {
    final heightCm = _patientProfile?.heightCm ?? (_history?['heightCm'] as num?)?.toDouble();
    final weightKg = _patientProfile?.weightKg ?? (_history?['weightKg'] as num?)?.toDouble();
    final bmi = (heightCm != null && weightKg != null && heightCm > 0)
        ? (weightKg / ((heightCm / 100) * (heightCm / 100))).toStringAsFixed(1)
        : null;
    final v = _latestVitals;

    final vitalBadges = <Widget>[
      if (v != null && v['heartRate'] != null) _vitalBadge(Icons.favorite_border, '${v['heartRate']}', 'bpm'),
      if (v != null && v['bloodPressureSystolic'] != null) _vitalBadge(Icons.monitor_heart_outlined, '${v['bloodPressureSystolic']}/${v['bloodPressureDiastolic'] ?? '?'}', 'mmHg'),
      if (v != null && v['oxygenSaturation'] != null) _vitalBadge(Icons.air, '${v['oxygenSaturation']}', '%'),
      if (v != null && v['temperature'] != null) _vitalBadge(Icons.thermostat_outlined, '${v['temperature']}', '°C'),
      if (v != null && v['respiratoryRate'] != null) _vitalBadge(Icons.waves, '${v['respiratoryRate']}', 'br/pm'),
    ];

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
          _buildVitalsRows(vitalBadges),
        if (heightCm != null || weightKg != null) ...[
          const SizedBox(height: 12),
          const Divider(height: 1, color: DS.border),
          const SizedBox(height: 8),
          const Text('BODY METRICS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.mutedForeground, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            if (heightCm != null) _vitalBadge(Icons.height, heightCm.toStringAsFixed(0), 'cm'),
            if (weightKg != null) _vitalBadge(Icons.monitor_weight_outlined, weightKg.toStringAsFixed(0), 'kg'),
            if (bmi != null) _vitalBadge(Icons.calculate_outlined, bmi, null),
          ]),
        ],
      ]),
    );
  }

  // ── Timeline ────────────────────────────────────────────────────────────

  List<Map<String, dynamic>> _completedAppointments() {
    final appointments = (_history?['appointments'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((a) => a['status']?.toString().toLowerCase() == 'completed')
        .toList();
    appointments.sort((a, b) {
      final da = _dynDate(a['appointmentTime']) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final db = _dynDate(b['appointmentTime']) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return db.compareTo(da);
    });
    return appointments;
  }

  Widget _buildTimelineTab() {
    final all = _completedAppointments();
    final totalPages = all.isEmpty ? 1 : ((all.length - 1) ~/ _timelinePageSize) + 1;
    final page = _timelinePage.clamp(1, totalPages);
    final pageItems = all.skip((page - 1) * _timelinePageSize).take(_timelinePageSize).toList();

    return RefreshIndicator(
      onRefresh: () async {
        setState(() => _timelinePage = 1);
        await _handleRefresh();
      },
      color: DS.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const DoctorSectionLabel('Timeline'),
          const SizedBox(height: 12),
          if (all.isEmpty)
            const Text('No completed appointments yet.', style: TextStyle(fontSize: 13, color: DS.mutedForeground))
          else ...[
            ...pageItems.map((item) => _TimelineRow(
                  data: item,
                  onView: () => _openAppointmentDetail(item),
                )),
            if (totalPages > 1) ...[
              const SizedBox(height: 8),
              const Divider(height: 1, color: DS.border),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                TextButton.icon(
                  onPressed: page > 1 ? () => setState(() => _timelinePage = page - 1) : null,
                  icon: const Icon(Icons.chevron_left, size: 16),
                  label: const Text('Prev'),
                ),
                Text('$page / $totalPages', style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                TextButton.icon(
                  onPressed: page < totalPages ? () => setState(() => _timelinePage = page + 1) : null,
                  icon: const Icon(Icons.chevron_right, size: 16),
                  label: const Text('Next'),
                ),
              ]),
            ],
          ],
        ]),
      ),
    );
  }

  void _openAppointmentDetail(Map<String, dynamic> item) {
    final appointment = DoctorAppointment.fromJson(item);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DoctorAppointmentDetailScreen(appointment: appointment)),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onView;

  const _TimelineRow({required this.data, required this.onView});

  String _formatDateTime(dynamic raw) {
    if (raw == null) return 'N/A';
    final dt = DateTime.tryParse(raw.toString());
    if (dt == null) return 'N/A';
    return DateFormat('MMM d, yyyy · h:mm a').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final type = data['consultationType']?.toString() ?? 'Consultation';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_formatDateTime(data['appointmentTime']), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground)),
        const SizedBox(height: 8),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(6)),
            child: Text(type, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: DS.mutedForeground)),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: DS.emerald600.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
            child: const Text('Completed', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: DS.emerald600)),
          ),
          const Spacer(),
          TextButton(onPressed: onView, child: const Text('View')),
        ]),
      ]),
    );
  }
}
