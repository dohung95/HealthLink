import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/api_config.dart';
import '../../models/patient_profile.dart';
import 'edit_patient_profile_screen.dart';

class PatientProfileScreen extends StatelessWidget {
  const PatientProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final authProvider = context.watch<AuthProvider>();
    final profile = authProvider.patientProfile ?? {};

    return Scaffold(
      // Sử dụng màu nền hệ thống từ cấu trúc của bạn
      backgroundColor: colorScheme.background,

      // Top App Bar tùy chỉnh thay thế cho thẻ <header> của HTML
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 1,
        titleSpacing: 16,
        shape: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant.withOpacity(0.3),
            width: 1,
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: colorScheme.outlineVariant),
                color: colorScheme.surfaceVariant,
              ),
              child: Icon(
                Icons.person_outline,
                size: 18,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'My profile',
              style: theme.textTheme.titleMedium?.copyWith(
                color: colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: IconButton(
              icon: Icon(Icons.edit_outlined, color: colorScheme.primary),
              tooltip: 'Edit Profile',
              onPressed: () async {
                // Chúng ta sẽ cần tạo PatientProfile từ map `profile` để truyền đi
                final patientProfile = PatientProfile.fromJson(profile);
                
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => EditPatientProfileScreen(
                      currentProfile: patientProfile,
                    ),
                  ),
                );

                if (result == true || result != null) {
                  // Gọi API tải lại khi sửa thành công
                  if (context.mounted) {
                    context.read<AuthProvider>().fetchProfile();
                  }
                }
              },
            ),
          ),
        ],
      ),

      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 672),
            child: RefreshIndicator(
              color: colorScheme.primary,
              onRefresh: () => context.read<AuthProvider>().fetchProfile(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Header Area (Avatar & Identity Badge)
                  _buildHeaderArea(context, authProvider, profile),
                  const SizedBox(height: 24),

                  // 2. Vital Stats Row
                  _buildVitalStatsRow(context, profile),
                  const SizedBox(height: 24),

                  // 3. Personal Information (Bento Grid)
                  _buildIdentityMetricsGrid(context, profile),
                  const SizedBox(height: 24),

                  // 4. Contact & Location
                  _buildLocationDataCard(context, profile),
                  const SizedBox(height: 24),

                  // 5. Insurance Section
                  _buildInsuranceCard(context, profile),
                  const SizedBox(height: 24),

                  // 6. Medical Summary & History (Dossier)
                  _buildMedicalDossier(context, profile),
                  const SizedBox(height: 24),

                  // 7. Emergency Contact
                  _buildEmergencyContactCard(context, profile),
                  const SizedBox(height: 24), // Đệm khoảng cách cho phần bottom menu
                ],
              ),
            ),
            ),
          ),
        ),
      ),
    );
  }

  // --- WIDGET PHÂN ĐOẠN (REFOCUSED & DECOUPLED) ---

  Widget _buildHeaderArea(BuildContext context, AuthProvider auth, Map<String, dynamic> profile) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final avatarUrl = ApiConfig.normalizeUrl(auth.avatarUrl);
    final name = auth.displayName ?? 'Unknown';
    final patientId = profile['userId'] ?? 'Unknown ID';

    return Column(
      children: [
        Stack(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: colorScheme.primary, width: 2),
              ),
              child: CircleAvatar(
                radius: 44,
                backgroundColor: colorScheme.surfaceVariant,
                backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                child: avatarUrl == null ? Icon(Icons.person, size: 44, color: colorScheme.outline) : null,
              ),
            ),
            Positioned(
              bottom: 4,
              right: 4,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.5)),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2)],
                ),
                child: Center(
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: const BoxDecoration(
                      color: Colors.green, // Giữ màu xanh lá indicator trực tuyến
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            )
          ],
        ),
        const SizedBox(height: 16),
        Text(
          name,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'ID: $patientId',
          style: theme.textTheme.labelMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(100),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.verified, size: 16, color: colorScheme.primary),
              const SizedBox(width: 6),
              Text(
                'VERIFIED IDENTITY',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVitalStatsRow(BuildContext context, Map<String, dynamic> profile) {
    final bloodType = profile['bloodType']?.toString() ?? 'N/A';
    final height = profile['heightCm']?.toString() ?? 'N/A';
    final weight = profile['weightKg']?.toString() ?? 'N/A';

    return LayoutBuilder(
      builder: (context, constraints) {
        return Row(
          children: [
            _buildStatCard(context, Icons.water_drop, bloodType, 'Blood Type'),
            const SizedBox(width: 12),
            _buildStatCard(context, Icons.height, height, 'Height (cm)'),
            const SizedBox(width: 12),
            _buildStatCard(context, Icons.monitor_weight_outlined, weight, 'Weight (kg)'),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(BuildContext context, IconData icon, String value, String label) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.4)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: colorScheme.primary),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              textAlign: TextAlign.center,
              style: theme.textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIdentityMetricsGrid(BuildContext context, Map<String, dynamic> profile) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    // Format DOB if available (often comes as 'YYYY-MM-DDTHH:mm:ss' or similar)
    String dobStr = profile['dateOfBirth']?.toString() ?? 'N/A';
    if (dobStr.length > 10) dobStr = dobStr.substring(0, 10);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(context, Icons.badge_outlined, 'Identity Metrics'),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          childAspectRatio: 2.2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          children: [
            _buildGridItem(context, Icons.wc, 'Gender', profile['gender']?.toString() ?? 'N/A'),
            _buildGridItem(context, Icons.cake_outlined, 'DOB', dobStr),
            _buildGridItem(context, Icons.work_outline, 'Occupation', profile['occupation']?.toString() ?? 'N/A'),
            _buildGridItem(context, Icons.language, 'Language', profile['preferredLanguage']?.toString() ?? 'N/A'),
          ],
        ),
      ],
    );
  }

  Widget _buildGridItem(BuildContext context, IconData icon, String label, String value) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: colorScheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(
                label.toUpperCase(),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationDataCard(BuildContext context, Map<String, dynamic> profile) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    final address = profile['address']?.toString() ?? 'N/A';
    final cityCountry = [profile['city'], profile['country']].where((e) => e != null && e.toString().isNotEmpty).join(', ');
    final phone = profile['phoneNumber']?.toString() ?? 'N/A';

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: colorScheme.surfaceVariant.withOpacity(0.3),
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), topRight: Radius.circular(12)),
              border: Border(bottom: BorderSide(color: colorScheme.outlineVariant.withOpacity(0.3))),
            ),
            child: Row(
              children: [
                Icon(Icons.location_on_outlined, size: 16, color: colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'LOCATION DATA',
                  style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PRIMARY ADDRESS',
                  style: theme.textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant, fontSize: 10),
                ),
                const SizedBox(height: 4),
                Text(address, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                Text(cityCountry.isEmpty ? 'N/A' : cityCountry, style: theme.textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)),
                const SizedBox(height: 12),
                Divider(color: colorScheme.outlineVariant.withOpacity(0.3)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'CONTACT NUMBER',
                          style: theme.textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant, fontSize: 10),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          phone,
                          style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.primary, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    // IconButton(
                    //   style: IconButton.styleFrom(
                    //     shape: RoundedRectangleBorder(
                    //       borderRadius: BorderRadius.circular(8),
                    //       side: BorderSide(color: colorScheme.outlineVariant),
                    //     ),
                    //   ),
                    //   onPressed: () {},
                    //   icon: Icon(Icons.edit_outlined, size: 18, color: colorScheme.onSurfaceVariant),
                    // )
                  ],
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildInsuranceCard(BuildContext context, Map<String, dynamic> profile) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    final provider = profile['insuranceProvider']?.toString() ?? 'N/A';
    final policyNum = profile['insurancePolicyNumber']?.toString() ?? 'N/A';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.primary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.shield, color: colorScheme.onPrimary),
                  const SizedBox(width: 8),
                  Text(
                    provider,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: colorScheme.onPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text(
                'POLICY DESIGNATION',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.primaryContainer,
                  fontSize: 10,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                policyNum,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colorScheme.onPrimary,
                  fontFamily: 'monospace',
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: colorScheme.onPrimary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: colorScheme.onPrimary.withOpacity(0.3)),
            ),
            child: Icon(Icons.qr_code_2, color: colorScheme.onPrimary, size: 28),
          )
        ],
      ),
    );
  }

  Widget _buildMedicalDossier(BuildContext context, Map<String, dynamic> profile) {
    final colorScheme = Theme.of(context).colorScheme;

    final conditions = profile['chronicConditions']?.toString() ?? 'None';
    final allergies = profile['allergies']?.toString() ?? 'None';
    final medications = profile['currentMedications']?.toString() ?? 'None';
    final medicalSummary = profile['medicalHistorySummary']?.toString() ?? 'N/A';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(context, Icons.folder_shared_outlined, 'Medical Dossier'),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.4)),
          ),
          child: Column(
            children: [
              _buildDossierTile(context, Icons.history, 'History Summary', medicalSummary.length > 20 ? '${medicalSummary.substring(0, 20)}...' : medicalSummary, null),
              _buildDossierTile(context, Icons.coronavirus_outlined, 'Chronic Conditions', conditions, conditions != 'None' ? Colors.orange : null),
              _buildDossierTile(context, Icons.vaccines_outlined, 'Allergies', allergies, allergies != 'None' ? colorScheme.error : null, isBadge: allergies != 'None'),
              _buildDossierTile(context, Icons.medication_outlined, 'Current Medications', medications, null),
            ],
          ),
        )
      ],
    );
  }

  Widget _buildDossierTile(BuildContext context, IconData icon, String title, String subtitle, Color? customTint, {bool isBadge = false}) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    return InkWell(
      onTap: () {},
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: colorScheme.outlineVariant.withOpacity(0.2))),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: customTint?.withOpacity(0.1) ?? colorScheme.surfaceVariant.withOpacity(0.5),
              child: Icon(icon, size: 20, color: customTint ?? colorScheme.onSurfaceVariant),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  if (isBadge)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        subtitle.toUpperCase(),
                        style: theme.textTheme.labelSmall?.copyWith(color: colorScheme.error, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    )
                  else
                    Text(subtitle, style: theme.textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: colorScheme.outline),
          ],
        ),
      ),
    );
  }

  Widget _buildEmergencyContactCard(BuildContext context, Map<String, dynamic> profile) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    final ecName = profile['emergencyContactName']?.toString() ?? 'Not Provided';
    final ecRel = profile['emergencyContactRelationship']?.toString() ?? 'N/A';
    final ecPhone = profile['emergencyContactPhone']?.toString() ?? 'N/A';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.error.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, size: 16, color: colorScheme.error),
              const SizedBox(width: 6),
              Text(
                'EMERGENCY CONTACT',
                style: theme.textTheme.labelSmall?.copyWith(color: colorScheme.error, fontWeight: FontWeight.bold, letterSpacing: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: colorScheme.error.withOpacity(0.2)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PRIMARY PROXY',
                      style: theme.textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant, fontSize: 9),
                    ),
                    const SizedBox(height: 2),
                    Text(ecName, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: colorScheme.surfaceVariant, borderRadius: BorderRadius.circular(4)),
                          child: Text(ecRel, style: theme.textTheme.labelSmall?.copyWith(fontSize: 9)),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6.0),
                          child: Text('•', style: TextStyle(color: Colors.grey)),
                        ),
                        Text(ecPhone, style: theme.textTheme.bodySmall),
                      ],
                    )
                  ],
                ),
                CircleAvatar(
                  radius: 20,
                  backgroundColor: colorScheme.errorContainer,
                  child: IconButton(
                    onPressed: () {},
                    icon: Icon(Icons.call, size: 20, color: colorScheme.error),
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, IconData icon, String title) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(icon, size: 16, color: colorScheme.primary),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }
}

// Helper custom decorator để xử lý nhanh đường gạch phân cách ListView
class Bordervalue extends Decoration {
  final BorderSide bottom;
  const Bordervalue({required this.bottom});

  @override
  BoxPainter createBoxPainter([VoidCallback? onChanged]) => _BorderPainter(bottom);
}

class _BorderPainter extends BoxPainter {
  final BorderSide bottom;
  _BorderPainter(this.bottom);

  @override
  void paint(Canvas canvas, Offset offset, ImageConfiguration configuration) {
    final rect = offset & configuration.size!;
    final paint = bottom.toPaint();
    canvas.drawLine(rect.bottomLeft, rect.bottomRight, paint);
  }
}