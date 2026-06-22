import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_patient.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';

class DoctorPatientDetailScreen extends StatefulWidget {
  const DoctorPatientDetailScreen({super.key, required this.patient});

  final DoctorPatient patient;

  @override
  State<DoctorPatientDetailScreen> createState() => _DoctorPatientDetailScreenState();
}

class _DoctorPatientDetailScreenState extends State<DoctorPatientDetailScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _history;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() { _isLoading = true; _error = null; });

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final history = await DoctorService.getPatientHistory(token, widget.patient.patientId);

      if (mounted) setState(() { _history = history; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _isLoading = false; });
    }
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
                    : RefreshIndicator(
                        onRefresh: _loadHistory,
                        color: DS.primary,
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(children: [
                              _buildPatientHeader(),
                              const SizedBox(height: 20),
                              _buildVitalsRow(),
                              const SizedBox(height: 20),
                              _buildContactCard(),
                              const SizedBox(height: 20),
                              _buildAllergiesCard(),
                              const SizedBox(height: 20),
                              _buildVisitHistoryCard(),
                              const SizedBox(height: 24),
                            ]),
                          ),
                        ),
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
            Container(width: 64, height: 64, decoration: const BoxDecoration(color: DS.secondary, shape: BoxShape.circle), child: Icon(Icons.error_outline, size: 28, color: DS.mutedForeground.withOpacity(0.6))),
            const SizedBox(height: 16),
            const Text('Failed to load patient history', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
            const SizedBox(height: 4),
            Text(_error ?? '', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
            const SizedBox(height: 24),
            ElevatedButton.icon(onPressed: _loadHistory, icon: const Icon(Icons.refresh, size: 18), label: const Text('Retry'), style: DS.primaryButtonStyle),
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

  Widget _buildVitalsRow() {
    final patient = widget.patient;
    final data = _history ?? {};
    final appointments = (data['appointments'] as List<dynamic>?) ?? [];
    final allergies = data['allergies'] as String? ?? '';
    final allergyList = allergies.isNotEmpty ? allergies.split(',').map((e) => e.trim()).toList() : <String>[];

    return Row(children: [
      Expanded(child: Container(
        padding: const EdgeInsets.all(12),
        decoration: DS.cardDecoration,
        child: Column(children: [
          const Icon(Icons.water_drop, size: 16, color: DS.rose500),
          const SizedBox(height: 4),
          Text(data['bloodType']?.toString() ?? patient.bloodType ?? '?', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: DS.foreground)),
          const Text('Blood Type', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
        ]),
      )),
      const SizedBox(width: 12),
      Expanded(child: Container(
        padding: const EdgeInsets.all(12),
        decoration: DS.cardDecoration,
        child: Column(children: [
          const Icon(Icons.medical_services_outlined, size: 16, color: DS.primary),
          const SizedBox(height: 4),
          Text('${appointments.length}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: DS.foreground)),
          const Text('Visits', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
        ]),
      )),
      const SizedBox(width: 12),
      Expanded(child: Container(
        padding: const EdgeInsets.all(12),
        decoration: DS.cardDecoration,
        child: Column(children: [
          const Icon(Icons.warning_amber, size: 16, color: DS.amber500),
          const SizedBox(height: 4),
          Text('${allergyList.length}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: DS.foreground)),
          const Text('Allergies', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
        ]),
      )),
    ]);
  }

  Widget _buildContactCard() {
    final patient = widget.patient;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const DoctorSectionLabel('Contact'),
        const SizedBox(height: 4),
        const Divider(height: 1, color: DS.border),
        DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: patient.phoneNumber ?? 'Not provided'),
        const Divider(height: 1, color: DS.border),
        DoctorInfoRow(icon: Icons.email_outlined, label: 'Email', value: patient.email ?? 'Not provided'),
      ]),
    );
  }

  Widget _buildAllergiesCard() {
    final data = _history ?? {};
    final allergies = data['allergies'] as String? ?? '';
    final allergyList = allergies.isNotEmpty ? allergies.split(',').map((e) => e.trim()).toList() : <String>[];

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

  Widget _buildVisitHistoryCard() {
    final data = _history ?? {};
    final appointments = (data['appointments'] as List<dynamic>?) ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const DoctorSectionLabel('Visit History'),
        const SizedBox(height: 12),
        if (appointments.isEmpty)
          const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('No visit history.', style: TextStyle(fontSize: 14, color: DS.mutedForeground))))
        else
          ...appointments.take(10).toList().asMap().entries.map((entry) {
            final index = entry.key;
            final visit = entry.value as Map<String, dynamic>;
            final isLast = index == appointments.length - 1 || index == 9;
            final date = DateTime.tryParse(visit['appointmentTime']?.toString() ?? '');
            final diagnosis = visit['diagnosis']?.toString();
            final prescription = visit['prescription']?.toString();

            return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Column(children: [
                Container(
                  width: 10,
                  height: 10,
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(color: DS.primary, shape: BoxShape.circle, boxShadow: [BoxShadow(color: DS.primary.withOpacity(0.15), blurRadius: 0, spreadRadius: 4)]),
                ),
                if (!isLast) Container(width: 1, height: 60, color: DS.border),
              ]),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_formatDate(date), style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                    const SizedBox(height: 2),
                    Text(diagnosis ?? 'Consultation', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground)),
                    if (prescription != null && prescription.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(6)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.medication_outlined, size: 12, color: DS.secondaryForeground),
                          const SizedBox(width: 4),
                          Flexible(child: Text(prescription, style: const TextStyle(fontSize: 12, color: DS.secondaryForeground), overflow: TextOverflow.ellipsis)),
                        ]),
                      ),
                    ],
                  ]),
                ),
              ),
            ]);
          }),
      ]),
    );
  }
}
