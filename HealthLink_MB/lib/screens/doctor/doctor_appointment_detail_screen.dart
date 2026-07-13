import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../services/doctor/doctor_clinical_result_service.dart';
import '../../services/patient/patient_service.dart';
import '../../services/patient/vitals/vital_sign_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_clinical_result.dart';
import '../../models/patient/patient_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/doctor/complete_appointment_sheet.dart';
import '../../widgets/doctor/clinical_results_section.dart';
import '../../widgets/doctor/clinical_result_detail_sheet.dart';
import '../../widgets/doctor/clinical_result_editor_sheet.dart';

List<String> _splitList(String? raw) {
  if (raw == null || raw.trim().isEmpty) return [];
  return raw.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
}

String _ageFromDob(DateTime? dob) {
  if (dob == null) return '';
  final now = DateTime.now();
  int age = now.year - dob.year;
  if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) age--;
  return '$age';
}

class DoctorAppointmentDetailScreen extends StatefulWidget {
  final DoctorAppointment appointment;

  const DoctorAppointmentDetailScreen({super.key, required this.appointment});

  @override
  State<DoctorAppointmentDetailScreen> createState() => _DoctorAppointmentDetailScreenState();
}

class _DoctorAppointmentDetailScreenState extends State<DoctorAppointmentDetailScreen> {
  late DoctorAppointment _appointment;
  PatientProfile? _profile;
  Map<String, dynamic>? _vitals;

  bool _isLoading = true;
  String? _error;

  List<DoctorClinicalResult> _clinicalResults = const [];
  bool _isLoadingClinicalResults = false;
  String? _clinicalResultsError;

  @override
  void initState() {
    super.initState();
    _appointment = widget.appointment;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');

      final patientId = _appointment.patientId;
      final results = await Future.wait<dynamic>([
        DoctorService.getAppointmentDetail(token, _appointment.appointmentId),
        patientId != null
            ? PatientService.getPatientProfileById(token, patientId)
            : Future.value(null),
        VitalSignService.getLatestAppointmentVitalSign(token, _appointment.appointmentId),
      ]);

      if (mounted) {
        setState(() {
          _appointment = results[0] as DoctorAppointment;
          _profile = results[1] as PatientProfile?;
          _vitals = results[2] as Map<String, dynamic>?;
          _isLoading = false;
        });
        // Load riêng, không chặn toàn bộ appointment detail nếu API này lỗi.
        _loadClinicalResults();
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

  Future<void> _loadClinicalResults() async {
    setState(() {
      _isLoadingClinicalResults = true;
      _clinicalResultsError = null;
    });

    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');
      final results = await DoctorClinicalResultService(accessToken: token)
          .getAppointmentResults(_appointment.appointmentId);
      if (mounted) {
        setState(() {
          _clinicalResults = results;
          _isLoadingClinicalResults = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _clinicalResultsError = e.toString().replaceFirst('Exception: ', '');
          _isLoadingClinicalResults = false;
        });
      }
    }
  }

  // ── Status helpers ─────────────────────────────────────────────────────

  String get _status => _appointment.status?.toUpperCase() ?? 'PENDING';
  bool get _isCompleted => _status == 'COMPLETED';
  bool get _isCancelled => _status == 'CANCELLED' || _status == 'NO_SHOW';
  bool get _hasStarted => _status == 'IN_PROGRESS' || _appointment.consultationStartTime != null;
  bool get _hasTimeArrived {
    final t = _appointment.appointmentTime;
    return t != null && !t.isAfter(DateTime.now());
  }

  bool get _canStart => !_isCompleted && !_isCancelled && !_hasStarted && _hasTimeArrived;
  bool get _canJoinOrComplete => _hasStarted && !_isCompleted && !_isCancelled;

  /// Khớp `canManageClinicalResults` bên web (useAppointmentDetail.js): không cancelled,
  /// có patientId, và consultation đã start hoặc appointment đã completed.
  bool get _canManageClinicalResults =>
      !_isCancelled && _appointment.patientId != null && (_hasStarted || _isCompleted);

  String? get _startHint {
    if (_isCompleted) return 'Appointment already completed';
    if (_isCancelled) return 'Appointment was cancelled';
    if (_hasStarted) return 'Consultation already started';
    if (!_hasTimeArrived) return 'Appointment time has not arrived yet';
    return null;
  }

  String? get _joinCompleteHint {
    if (_isCompleted) return 'Appointment already completed';
    if (_isCancelled) return 'Appointment was cancelled';
    if (!_hasStarted) return 'Start consultation first';
    return null;
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  Future<void> _handleStart() async {
    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) return;
      await DoctorService.startConsultation(token, _appointment.appointmentId);
      if (mounted) {
        await showDoctorNotice(context, 'Consultation started');
        _load();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  void _handleJoinRoom() {
    showDoctorNotice(context, 'Connecting call with ${_appointment.patientName ?? "patient"}...');
  }

  void _handleComplete() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CompleteAppointmentSheet(
        appointmentId: _appointment.appointmentId,
        patientName: _appointment.patientName,
        onCompleted: _load,
      ),
    );
  }

  // ── Clinical Results ───────────────────────────────────────────────────

  void _openCreateClinicalResult() {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    showClinicalResultEditorSheet(
      context,
      appointmentId: _appointment.appointmentId,
      accessToken: token,
      onSaved: _loadClinicalResults,
    );
  }

  void _openEditClinicalResult(DoctorClinicalResult result) {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    showClinicalResultEditorSheet(
      context,
      appointmentId: _appointment.appointmentId,
      accessToken: token,
      existing: result,
      onSaved: _loadClinicalResults,
    );
  }

  void _openClinicalResultDetail(DoctorClinicalResult result) {
    showClinicalResultDetailSheet(
      context,
      result: result,
      canManage: _canManageClinicalResults,
      onEdit: () => _openEditClinicalResult(result),
      onPublish: () => _handlePublishClinicalResult(result),
      onDelete: () => _handleDeleteClinicalResult(result),
    );
  }

  Future<void> _handlePublishClinicalResult(DoctorClinicalResult result) async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    try {
      await DoctorClinicalResultService(accessToken: token).publishResult(result.documentId);
      if (mounted) {
        await showDoctorNotice(context, 'Clinical result published.');
        _loadClinicalResults();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  Future<void> _handleDeleteClinicalResult(DoctorClinicalResult result) async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    try {
      await DoctorClinicalResultService(accessToken: token).deleteResult(result.documentId);
      if (mounted) {
        await showDoctorNotice(context, 'Clinical result deleted.');
        _loadClinicalResults();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            DoctorBackHeader(
              title: _appointment.patientName ?? 'Appointment',
              onBack: () => Navigator.pop(context),
            ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
      bottomNavigationBar: _isLoading || _error != null
          ? null
          : SafeArea(top: false, child: _buildActionBar()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: DS.primary));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(color: DS.rose100, shape: BoxShape.circle),
                child: const Icon(Icons.error_outline, size: 28, color: DS.rose700),
              ),
              const SizedBox(height: 16),
              const Text('Failed to load appointment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
              const SizedBox(height: 4),
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _load,
                style: DS.primaryButtonStyle,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: DS.primary,
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 16),
            _buildStatusPanel(),
            const SizedBox(height: 16),
            _buildInfoCard(),
            const SizedBox(height: 16),
            _buildAllergiesCard(),
            const SizedBox(height: 16),
            _buildVitalsCard(),
            const SizedBox(height: 16),
            ClinicalResultsSection(
              results: _clinicalResults,
              isLoading: _isLoadingClinicalResults,
              error: _clinicalResultsError,
              canManage: _canManageClinicalResults,
              onRetry: _loadClinicalResults,
              onAdd: _openCreateClinicalResult,
              onOpen: _openClinicalResultDetail,
            ),
            const SizedBox(height: 16),
            _buildEmergencyContactCard(),
          ],
        ),
      ),
    );
  }

  // ── Sections ────────────────────────────────────────────────────────────

  Widget _buildHeader() {
    final name = _appointment.patientName ?? _profile?.fullName ?? 'Patient';
    final age = _ageFromDob(_profile?.dateOfBirth);
    final gender = _profile?.gender;
    final avatarUrl = _appointment.patientAvatar ?? _profile?.avatarUrl;
    final metaParts = [
      if (gender != null && gender.isNotEmpty) gender,
      if (age.isNotEmpty) '$age yrs',
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Row(
        children: [
          DoctorPersonAvatar(
            name: name,
            imageUrl: avatarUrl != null ? ApiConfig.normalizeUrl(avatarUrl) : null,
            size: 56,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: DS.foreground)),
                if (metaParts.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(metaParts.join(' · '), style: const TextStyle(fontSize: 13, color: DS.mutedForeground)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusPanel() {
    late final IconData icon;
    late final Color color;
    late final String title;
    late final String subtitle;

    if (_isCompleted) {
      icon = Icons.check_circle;
      color = DS.emerald600;
      title = 'Consultation Completed';
      subtitle = 'This appointment has been completed.';
    } else if (_isCancelled) {
      icon = Icons.cancel;
      color = DS.rose600;
      title = 'Appointment Cancelled';
      subtitle = (_appointment.cancelReason?.isNotEmpty ?? false)
          ? _appointment.cancelReason!
          : 'This appointment was cancelled.';
    } else if (_hasStarted) {
      icon = Icons.play_circle_fill;
      color = DS.primary;
      title = 'Consultation In Progress';
      subtitle = 'Use Join Room to connect, or Complete when you are done.';
    } else if (_hasTimeArrived) {
      icon = Icons.lock_clock;
      color = DS.amber600;
      title = 'Start Consultation First';
      subtitle = 'Tap Start below to unlock the consultation workspace.';
    } else {
      icon = Icons.lock_outline;
      color = DS.mutedForeground;
      title = 'Appointment Not Yet Started';
      subtitle = 'The consultation workspace will be available once the appointment time arrives.';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
      decoration: DS.cardDecoration,
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(icon, size: 24, color: color),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: DS.foreground), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 13, color: DS.mutedForeground), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    final reason = _appointment.symptoms;
    final phone = _appointment.patientPhone ?? _profile?.phoneNumber;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Visit Reason'),
          const SizedBox(height: 6),
          Text(
            (reason != null && reason.isNotEmpty) ? reason : 'Not provided',
            style: const TextStyle(fontSize: 14, color: DS.foreground),
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: DS.border),
          const SizedBox(height: 14),
          const DoctorSectionLabel('Phone'),
          const SizedBox(height: 6),
          Text(phone ?? 'Not provided', style: const TextStyle(fontSize: 14, color: DS.foreground)),
        ],
      ),
    );
  }

  Widget _buildAllergiesCard() {
    final list = _splitList(_profile?.allergies);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Allergies'),
          const SizedBox(height: 8),
          if (list.isEmpty)
            const Text('No known allergies', style: TextStyle(fontSize: 14, color: DS.mutedForeground))
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: list
                  .map((allergy) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: DS.amber50,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: DS.amber200),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.warning_amber, size: 12, color: DS.amber700),
                          const SizedBox(width: 4),
                          Text(allergy, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DS.amber700)),
                        ]),
                      ))
                  .toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildVitalsCard() {
    final v = _vitals;
    final heightCm = _profile?.heightCm;
    final weightKg = _profile?.weightKg;
    final bmi = (heightCm != null && weightKg != null && heightCm > 0)
        ? (weightKg / ((heightCm / 100) * (heightCm / 100))).toStringAsFixed(1)
        : null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Vitals'),
          const SizedBox(height: 10),
          if (v == null)
            const Text('No vitals recorded', style: TextStyle(fontSize: 13, color: DS.mutedForeground))
          else
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (v['heartRate'] != null) DoctorVitalBadge(icon: Icons.favorite_border, value: '${v['heartRate']}', unit: 'bpm'),
              if (v['bloodPressureSystolic'] != null)
                DoctorVitalBadge(
                  icon: Icons.monitor_heart_outlined,
                  value: '${v['bloodPressureSystolic']}/${v['bloodPressureDiastolic'] ?? '?'}',
                  unit: 'mmHg',
                ),
              if (v['oxygenSaturation'] != null) DoctorVitalBadge(icon: Icons.air, value: '${v['oxygenSaturation']}', unit: '%'),
              if (v['temperature'] != null) DoctorVitalBadge(icon: Icons.thermostat_outlined, value: '${v['temperature']}', unit: '°C'),
              if (v['respiratoryRate'] != null) DoctorVitalBadge(icon: Icons.waves, value: '${v['respiratoryRate']}', unit: 'br/pm'),
            ]),
          if (heightCm != null || weightKg != null) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: DS.border),
            const SizedBox(height: 8),
            const Text('BODY METRICS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.mutedForeground, letterSpacing: 0.5)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (heightCm != null) DoctorVitalBadge(icon: Icons.height, value: heightCm.toStringAsFixed(0), unit: 'cm'),
              if (weightKg != null) DoctorVitalBadge(icon: Icons.monitor_weight_outlined, value: weightKg.toStringAsFixed(0), unit: 'kg'),
              if (bmi != null) DoctorVitalBadge(icon: Icons.calculate_outlined, value: bmi),
            ]),
          ],
        ],
      ),
    );
  }

  Widget _buildEmergencyContactCard() {
    final profile = _profile;
    final hasContact = (profile?.emergencyContactName ?? '').isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Emergency Contact'),
          const SizedBox(height: 10),
          if (!hasContact)
            Row(children: [
              Icon(Icons.person_off_outlined, color: DS.mutedForeground.withValues(alpha: 0.5), size: 24),
              const SizedBox(width: 12),
              const Expanded(
                child: Text('No emergency contact on file', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
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
        ],
      ),
    );
  }

  // ── Action bar ──────────────────────────────────────────────────────────

  Widget _buildActionBar() {
    if (_isCompleted || _isCancelled) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(color: DS.card, border: Border(top: BorderSide(color: DS.cardBorder))),
        child: Row(children: [
          Icon(_isCompleted ? Icons.check_circle : Icons.cancel, size: 18, color: _isCompleted ? DS.emerald600 : DS.rose600),
          const SizedBox(width: 8),
          Text(
            _isCompleted ? 'This appointment is completed' : 'This appointment was cancelled',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.mutedForeground),
          ),
        ]),
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(color: DS.card, border: Border(top: BorderSide(color: DS.cardBorder))),
      child: Row(
        children: [
          Expanded(
            child: _actionSlot(
              label: 'Start',
              icon: Icons.play_circle_outline,
              color: DS.primary,
              enabled: _canStart,
              hint: _startHint,
              onTap: _handleStart,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _actionSlot(
              label: 'Join Room',
              icon: Icons.meeting_room_outlined,
              color: DS.sky600,
              enabled: _canJoinOrComplete,
              hint: _joinCompleteHint,
              onTap: _handleJoinRoom,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _actionSlot(
              label: 'Complete',
              icon: Icons.check_circle_outline,
              color: DS.emerald600,
              enabled: _canJoinOrComplete,
              hint: _joinCompleteHint,
              onTap: _handleComplete,
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionSlot({
    required String label,
    required IconData icon,
    required Color color,
    required bool enabled,
    String? hint,
    required VoidCallback onTap,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: double.infinity,
          child: DoctorActionButton(
            label: label,
            icon: icon,
            color: enabled ? color : DS.mutedForeground,
            filled: enabled,
            onTap: enabled ? onTap : () {},
          ),
        ),
        if (!enabled && hint != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              hint,
              style: const TextStyle(fontSize: 10, color: DS.mutedForeground),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
    );
  }
}
