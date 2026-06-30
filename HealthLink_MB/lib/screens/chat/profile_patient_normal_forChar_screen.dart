import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/patient/patient_service.dart';
import '../../models/patient/patient_profile.dart';
import '../../config/api_config.dart';

class PatientInfoScreen extends StatefulWidget {
  final String patientId;
  final String initialName;

  const PatientInfoScreen({
    super.key,
    required this.patientId,
    required this.initialName,
  });

  @override
  State<PatientInfoScreen> createState() => _PatientInfoScreenState();
}

class _PatientInfoScreenState extends State<PatientInfoScreen> {
  late Future<PatientProfile> _profileFuture;

  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    _profileFuture = PatientService.getPatientProfileById(auth.accessToken!, widget.patientId);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface.withOpacity(0.9),
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: colorScheme.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Patient Information',
          style: textTheme.titleLarge?.copyWith(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
      ),
      body: FutureBuilder<PatientProfile>(
        future: _profileFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Failed to load patient information.',
                style: TextStyle(color: colorScheme.error),
              ),
            );
          }

          final profile = snapshot.data!;
          return Stack(
            children: [
              SingleChildScrollView(
                padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 48.0),
                child: Center(
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: Column(
                      children: [
                        _buildPrimaryInfoCard(context, colorScheme, textTheme, profile),
                        const SizedBox(height: 16),
                        _buildMetricsRow(context, colorScheme, textTheme, profile),
                        const SizedBox(height: 16),
                        _buildHistorySummary(context, colorScheme, textTheme, profile),
                        const SizedBox(height: 16),
                        _buildMedicalDossier(context, colorScheme, textTheme, profile),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                height: 24,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        colorScheme.surface,
                        colorScheme.surface.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- 1. Primary Info Card (Bento Style) ---
  Widget _buildPrimaryInfoCard(BuildContext context, ColorScheme colorScheme, TextTheme textTheme, PatientProfile profile) {
    String dobStr = 'Not provided';
    if (profile.dateOfBirth != null) {
      dobStr = '${profile.dateOfBirth!.year}-${profile.dateOfBirth!.month.toString().padLeft(2, '0')}-${profile.dateOfBirth!.day.toString().padLeft(2, '0')}';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(colorScheme),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: colorScheme.surfaceVariant.withOpacity(0.5),
                  shape: BoxShape.circle,
                ),
                clipBehavior: Clip.hardEdge,
                child: profile.avatarUrl != null && profile.avatarUrl!.isNotEmpty
                    ? Image.network(ApiConfig.normalizeUrl(profile.avatarUrl)!, fit: BoxFit.cover)
                    : Icon(Icons.person, size: 32, color: colorScheme.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.fullName,
                      style: textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurface,
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w600,
                        fontSize: 18,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ID: #${profile.userId.length > 8 ? profile.userId.substring(0, 8).toUpperCase() : profile.userId.toUpperCase()}',
                      style: textTheme.labelMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Divider(color: colorScheme.outlineVariant.withOpacity(0.3), height: 1),
          ),
          Row(
            children: [
              Expanded(child: _buildInfoField('Date of Birth', dobStr, colorScheme, textTheme)),
              Expanded(child: _buildInfoField('Gender', profile.gender ?? 'Not provided', colorScheme, textTheme)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildInfoField('Occupation', profile.occupation ?? 'Not provided', colorScheme, textTheme)),
              Expanded(child: _buildInfoField('Location', [profile.city, profile.country].where((e) => e != null && e.isNotEmpty).join(', ').isEmpty ? 'Not provided' : [profile.city, profile.country].where((e) => e != null && e.isNotEmpty).join(', '), colorScheme, textTheme)),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoField('Preferred Language', profile.preferredLanguage ?? 'Not provided', colorScheme, textTheme),
        ],
      ),
    );
  }

  Widget _buildInfoField(String label, String value, ColorScheme colorScheme, TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant, fontSize: 11),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  // --- 2. Physical Metrics Row ---
  Widget _buildMetricsRow(BuildContext context, ColorScheme colorScheme, TextTheme textTheme, PatientProfile profile) {
    return Row(
      children: [
        _buildMetricItem('bloodtype', Icons.bloodtype, 'Blood Type', profile.bloodType ?? '--', '', colorScheme, textTheme),
        const SizedBox(width: 8),
        _buildMetricItem('height', Icons.height, 'Height', profile.heightCm?.toStringAsFixed(1) ?? '--', ' cm', colorScheme, textTheme),
        const SizedBox(width: 8),
        _buildMetricItem('weight', Icons.monitor_weight, 'Weight', profile.weightKg?.toStringAsFixed(1) ?? '--', ' kg', colorScheme, textTheme),
      ],
    );
  }

  Widget _buildMetricItem(String id, IconData icon, String label, String value, String unit, ColorScheme colorScheme, TextTheme textTheme) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: _cardDecoration(colorScheme),
        child: Column(
          children: [
            Icon(icon, color: colorScheme.tertiary, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant, fontSize: 11),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: textTheme.titleMedium?.copyWith(color: colorScheme.primary, fontWeight: FontWeight.w600),
                ),
                if (unit.isNotEmpty)
                  Text(
                    unit,
                    style: textTheme.labelSmall?.copyWith(color: colorScheme.primary, fontWeight: FontWeight.normal),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- 3. Medical History Summary ---
  Widget _buildHistorySummary(BuildContext context, ColorScheme colorScheme, TextTheme textTheme, PatientProfile profile) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(colorScheme),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.history_edu, color: colorScheme.outline, size: 20),
              const SizedBox(width: 8),
              Text(
                'History Summary',
                style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            profile.medicalHistorySummary?.isNotEmpty == true
                ? profile.medicalHistorySummary!
                : 'No medical history summary provided.',
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  // --- 4. Medical Dossier ---
  Widget _buildMedicalDossier(BuildContext context, ColorScheme colorScheme, TextTheme textTheme, PatientProfile profile) {
    final hasChronic = profile.chronicConditions?.isNotEmpty == true;
    final hasAllergies = profile.allergies?.isNotEmpty == true;
    final hasMedications = profile.currentMedications?.isNotEmpty == true;

    return Container(
      decoration: _cardDecoration(colorScheme),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 12),
            child: Row(
              children: [
                Icon(Icons.folder_shared_outlined, color: colorScheme.outline, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Medical Dossier',
                  style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface, fontSize: 16),
                ),
              ],
            ),
          ),
          Divider(color: colorScheme.outlineVariant.withOpacity(0.2), height: 1),

          // Item 1: Chronic Conditions
          _buildDossierItem(
            icon: Icons.monitor_heart_outlined,
            title: 'Chronic Conditions',
            iconBg: colorScheme.surfaceVariant,
            iconColor: colorScheme.primary,
            trailingWidget: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: hasChronic ? colorScheme.surfaceVariant : colorScheme.surface,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                hasChronic ? profile.chronicConditions! : 'None reported',
                style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
            ),
            colorScheme: colorScheme,
            textTheme: textTheme,
            showDivider: true,
          ),

          // Item 2: Allergies
          _buildDossierItem(
            icon: Icons.coronavirus_outlined,
            title: 'Allergies',
            iconBg: hasAllergies ? colorScheme.errorContainer : colorScheme.surfaceVariant,
            iconColor: hasAllergies ? colorScheme.error : colorScheme.onSurfaceVariant,
            trailingWidget: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: hasAllergies ? colorScheme.errorContainer.withOpacity(0.5) : colorScheme.surface,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                hasAllergies ? profile.allergies! : 'No Known Allergies',
                style: textTheme.labelMedium?.copyWith(color: hasAllergies ? colorScheme.error : colorScheme.onSurfaceVariant),
              ),
            ),
            colorScheme: colorScheme,
            textTheme: textTheme,
            showDivider: true,
          ),

          // Item 3: Current Medications
          _buildDossierItem(
            icon: Icons.medication_outlined,
            title: 'Current Medications',
            iconBg: colorScheme.surfaceVariant,
            iconColor: colorScheme.primary,
            trailingWidget: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  hasMedications ? profile.currentMedications! : 'None',
                  style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurface),
                ),
              ],
            ),
            colorScheme: colorScheme,
            textTheme: textTheme,
            showDivider: false,
          ),
        ],
      ),
    );
  }

  Widget _buildDossierItem({
    required IconData icon,
    required String title,
    required Color iconBg,
    required Color iconColor,
    required Widget trailingWidget,
    required ColorScheme colorScheme,
    required TextTheme textTheme,
    required bool showDivider,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {},
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: showDivider
                ? Border(bottom: BorderSide(color: colorScheme.outlineVariant.withOpacity(0.1)))
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
                    child: Icon(icon, color: iconColor, size: 20),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    title,
                    style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurface, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: trailingWidget,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Hàm hỗ trợ viền & đổ bóng chung (Soft Shadow) ---
  BoxDecoration _cardDecoration(ColorScheme colorScheme) {
    return BoxDecoration(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [
        BoxShadow(
          color: colorScheme.primary.withOpacity(0.05),
          blurRadius: 20,
          offset: const Offset(0, 4),
          spreadRadius: -2,
        ),
        BoxShadow(
          color: colorScheme.primary.withOpacity(0.02),
          blurRadius: 3,
          offset: const Offset(0, 0),
        ),
      ],
    );
  }
}