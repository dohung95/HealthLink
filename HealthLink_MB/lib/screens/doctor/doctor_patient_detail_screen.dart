import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_patient.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';

/// Full detail screen for a patient - similar to web DoctorPatientDetailView
class DoctorPatientDetailScreen extends StatefulWidget {
  const DoctorPatientDetailScreen({
    super.key,
    required this.patient,
  });

  final DoctorPatient patient;

  @override
  State<DoctorPatientDetailScreen> createState() =>
      _DoctorPatientDetailScreenState();
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
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final history = await DoctorService.getPatientHistory(
        token,
        widget.patient.patientId,
      );

      if (mounted) {
        setState(() {
          _history = history;
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

  @override
  Widget build(BuildContext context) {
    final colors = context.doctorColors;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Patient Details'),
        backgroundColor: colors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadHistory,
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: colors.primary))
          : _error != null
              ? _buildErrorWidget(colors)
              : RefreshIndicator(
                  onRefresh: _loadHistory,
                  color: colors.primary,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildPatientHero(colors),
                        const SizedBox(height: 20),
                        _buildPatientInfo(colors),
                        const SizedBox(height: 20),
                        _buildMedicalSummary(colors),
                        const SizedBox(height: 20),
                        _buildAppointmentHistory(colors),
                        const SizedBox(height: 20),
                        _buildPrescriptions(colors),
                        const SizedBox(height: 20),
                        _buildDocuments(colors),
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildErrorWidget(DoctorColors colors) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: colors.error),
            const SizedBox(height: 16),
            Text(
              'Failed to load patient history',
              style: TextStyle(fontSize: 18, color: colors.onSurfaceVariant),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colors.onSurfaceVariant.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadHistory,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPatientHero(DoctorColors colors) {
    final patient = widget.patient;
    final data = _history ?? {};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: colors.cardShadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: colors.primary, width: 2),
            ),
            child: CircleAvatar(
              radius: 36,
              backgroundColor: colors.primary.withOpacity(0.1),
              backgroundImage: patient.avatarUrl != null
                  ? NetworkImage(
                      ApiConfig.normalizeUrl(patient.avatarUrl!) ?? '')
                  : null,
              child: patient.avatarUrl == null
                  ? Text(
                      (patient.fullName ?? 'P').substring(0, 1).toUpperCase(),
                      style: TextStyle(
                        color: colors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 28,
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 16),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PATIENT',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  data['fullName']?.toString() ??
                      patient.fullName ??
                      'Unknown',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  patient.email ?? patient.phoneNumber ?? 'No contact listed',
                  style: TextStyle(
                    fontSize: 14,
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPatientInfo(DoctorColors colors) {
    final patient = widget.patient;
    final data = _history ?? {};
    final appointments =
        (data['appointments'] as List<dynamic>?) ?? [];
    final completedAppointments = appointments
        .where((a) =>
            (a['status']?.toString().toLowerCase() ?? '') == 'completed')
        .length;
    final prescriptions =
        (data['prescriptions'] as List<dynamic>?) ?? [];

    return _buildSection(
      colors,
      title: 'Patient Information',
      child: GridView.count(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 2.5,
        children: [
          _buildInfoField('Phone', patient.phoneNumber, colors),
          _buildInfoField('Gender', patient.gender, colors),
          _buildInfoField(
            'Blood Type',
            data['bloodType']?.toString() ?? patient.bloodType,
            colors,
          ),
          _buildInfoField(
            'DOB',
            patient.dateOfBirth != null
                ? DateFormat('dd/MM/yyyy').format(patient.dateOfBirth!)
                : null,
            colors,
          ),
          _buildInfoField('Completed Visits', '$completedAppointments', colors),
          _buildInfoField('Prescriptions', '${prescriptions.length}', colors),
        ],
      ),
    );
  }

  Widget _buildMedicalSummary(DoctorColors colors) {
    final data = _history ?? {};

    return _buildSection(
      colors,
      title: 'Medical Summary',
      child: Column(
        children: [
          _buildInfoFieldFull(
            'History',
            data['medicalHistorySummary']?.toString(),
            colors,
          ),
          const SizedBox(height: 10),
          _buildInfoFieldFull(
            'Allergies',
            data['allergies']?.toString(),
            colors,
          ),
          const SizedBox(height: 10),
          _buildInfoFieldFull(
            'Chronic Conditions',
            data['chronicConditions']?.toString(),
            colors,
          ),
          const SizedBox(height: 10),
          _buildInfoFieldFull(
            'Current Medications',
            data['currentMedications']?.toString(),
            colors,
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentHistory(DoctorColors colors) {
    final appointments =
        (_history?['appointments'] as List<dynamic>?) ?? [];
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');

    return _buildSection(
      colors,
      title: 'Appointment History',
      child: appointments.isEmpty
          ? _buildEmptyContent('No appointments found', colors)
          : Column(
              children: appointments.take(10).map((apt) {
                final date = DateTime.tryParse(
                    apt['appointmentTime']?.toString() ?? '');
                final status = apt['status']?.toString() ?? 'Unknown';
                final consultationType =
                    apt['consultationType']?.toString() ?? 'Consultation';
                final diagnosis = apt['diagnosis']?.toString();
                final statusColor = colors.getStatusColor(status);
                final statusBgColor = colors.getStatusBgColor(status);

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      // Icon
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          _getConsultationIcon(consultationType),
                          color: statusColor,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              date != null
                                  ? dateFormat.format(date)
                                  : 'Unknown date',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$consultationType - $status',
                              style: TextStyle(
                                fontSize: 13,
                                color: colors.onSurfaceVariant,
                              ),
                            ),
                            if (diagnosis != null && diagnosis.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                'Diagnosis: $diagnosis',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colors.onSurfaceVariant,
                                  fontStyle: FontStyle.italic,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Status badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _buildPrescriptions(DoctorColors colors) {
    final prescriptions =
        (_history?['prescriptions'] as List<dynamic>?) ?? [];
    final dateFormat = DateFormat('dd MMM yyyy');

    return _buildSection(
      colors,
      title: 'Prescriptions',
      child: prescriptions.isEmpty
          ? _buildEmptyContent('No prescriptions found', colors)
          : Column(
              children: prescriptions.take(10).map((prescription) {
                final issueDate = DateTime.tryParse(
                    prescription['issueDate']?.toString() ?? '');
                final diagnosis =
                    prescription['diagnosis']?.toString() ?? 'No diagnosis';
                final status = prescription['status']?.toString() ?? 'Issued';
                final medications = prescription['medications'] as List? ??
                    prescription['items'] as List? ??
                    [];

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      // Icon
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: colors.infoBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.medication_outlined,
                          color: colors.info,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              issueDate != null
                                  ? dateFormat.format(issueDate)
                                  : 'Unknown date',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$diagnosis - $status',
                              style: TextStyle(
                                fontSize: 13,
                                color: colors.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${medications.length} medication(s)',
                              style: TextStyle(
                                fontSize: 12,
                                color: colors.onSurfaceVariant.withOpacity(0.7),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _buildDocuments(DoctorColors colors) {
    final documentsByCategory =
        (_history?['documentsByCategory'] as List<dynamic>?) ?? [];

    return _buildSection(
      colors,
      title: 'Documents',
      child: documentsByCategory.isEmpty
          ? _buildEmptyContent('No documents found', colors)
          : Column(
              children: documentsByCategory.map((category) {
                final categoryName =
                    category['category']?.toString() ?? 'Unknown';
                final documentCount = category['documentCount'] as int? ?? 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      // Icon
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: colors.warningBg,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.folder_outlined,
                          color: colors.warning,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              categoryName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$documentCount document(s)',
                              style: TextStyle(
                                fontSize: 13,
                                color: colors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Arrow
                      Icon(
                        Icons.chevron_right,
                        color: colors.onSurfaceVariant,
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _buildSection(
    DoctorColors colors, {
    required String title,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: colors.cardShadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: colors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildInfoField(String label, String? value, DoctorColors colors) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: colors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value ?? 'N/A',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoFieldFull(String label, String? value, DoctorColors colors) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: colors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value ?? 'N/A',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyContent(String message, DoctorColors colors) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Text(
          message,
          style: TextStyle(
            color: colors.onSurfaceVariant,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  IconData _getConsultationIcon(String? type) {
    switch (type?.toUpperCase()) {
      case 'VIDEO':
        return Icons.videocam_outlined;
      case 'AUDIO':
        return Icons.call_outlined;
      case 'CHAT':
        return Icons.chat_outlined;
      default:
        return Icons.event_outlined;
    }
  }
}
