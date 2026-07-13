import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import 'doctor_reviews_screen.dart';
import 'doctor_wallet_screen.dart';
import 'doctor_security_screen.dart';

class DoctorProfileScreen extends StatefulWidget {
  const DoctorProfileScreen({super.key});

  @override
  State<DoctorProfileScreen> createState() => _DoctorProfileScreenState();
}

class _DoctorProfileScreenState extends State<DoctorProfileScreen> {
  bool _isLoading = true;
  String? _error;
  DoctorProfile? _profile;
  Map<String, dynamic> _reviewStats = {};
  bool _uploadingAvatar = false;
  Map<String, bool> _services = {'online': false, 'homeVisit': false};
  final Map<String, bool> _serviceLoading = {};

  @override
  void initState() {
    super.initState();
    _loadData();
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
        DoctorService.getProfile(token),
        DoctorService.getReviewStats(token).catchError((_) => <String, dynamic>{}),
      ]);

      if (mounted) {
        final profile = results[0] as DoctorProfile;
        setState(() {
          _profile = profile;
          _reviewStats = results[1] as Map<String, dynamic>;
          _services = {
            'online': profile.availableTypes.contains('Online'),
            'homeVisit': profile.availableTypes.contains('HomeVisit'),
          };
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: DS.background,
        body: Center(child: CircularProgressIndicator(color: DS.primary)),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: DS.background,
        body: _buildErrorWidget(),
      );
    }

    final p = _profile!;

    return Scaffold(
      backgroundColor: DS.background,
      appBar: AppBar(
        backgroundColor: DS.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          // Chỉnh vị trí nút logout: dx < 0 = dịch sang TRÁI, dy > 0 = dịch XUỐNG
          Transform.translate(
            offset: const Offset(-10, 8),
            child: IconButton(
              icon: const Icon(Icons.power_settings_new, size: 35),
              tooltip: 'Logout',
              onPressed: _confirmLogout,
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: DS.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              _buildHeader(p),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    _buildStatsRow(p),
                    const SizedBox(height: 12),
                    _buildQuickActions(p),
                    const SizedBox(height: 12),
                    _buildServicesCard(),
                    const SizedBox(height: 20),
                    _buildProfessionalInfo(p),
                    const SizedBox(height: 20),
                    if (p.clinicName != null) ...[
                      _buildClinicCard(p),
                      const SizedBox(height: 20),
                    ],
                    _buildSettingsMenu(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
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
              child: Icon(Icons.error_outline, size: 28, color: DS.mutedForeground.withOpacity(0.6)),
            ),
            const SizedBox(height: 16),
            const Text('Failed to load profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
            const SizedBox(height: 4),
            Text(_error ?? '', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
            const SizedBox(height: 24),
            ElevatedButton.icon(onPressed: _loadData, icon: const Icon(Icons.refresh, size: 18), label: const Text('Retry'), style: DS.primaryButtonStyle),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(DoctorProfile p) {
    return DoctorCurvedHeader(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 32, 20, 24),
        child: Column(
          children: [
            GestureDetector(
              onTap: _uploadingAvatar ? null : _pickAndUploadAvatar,
              child: Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withOpacity(0.25), width: 4)),
                    child: DoctorPersonAvatar(
                      name: p.fullName ?? 'Doctor',
                      imageUrl: p.avatarUrl != null ? ApiConfig.normalizeUrl(p.avatarUrl!) : null,
                      size: 96,
                    ),
                  ),
                  if (_uploadingAvatar)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.black.withValues(alpha: 0.45)),
                        child: const Center(child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)),
                      ),
                    ),
                  Positioned(
                    right: 2, bottom: 2,
                    child: Container(
                      width: 28, height: 28,
                      decoration: BoxDecoration(
                        color: DS.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: const Icon(Icons.camera_alt_rounded, size: 14, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(_formatDoctorName(p.fullName), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: DS.primaryForeground)),
                if (p.verified == true) ...[const SizedBox(width: 6), const Icon(Icons.verified, size: 20, color: DS.primaryForeground)],
              ],
            ),
            Text(p.specialtyName ?? p.specialty ?? 'General Practitioner', style: TextStyle(fontSize: 14, color: DS.primaryForeground.withOpacity(0.8))),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow(DoctorProfile p) {
    final rating = (_reviewStats['averageRating'] as num?)?.toDouble() ?? p.averageRating ?? 0.0;
    final reviews = _reviewStats['totalReviews'] ?? p.totalReviews ?? 0;
    final years = p.yearsOfExperience ?? 0;

    return Row(
      children: [
        Expanded(child: _StatCard(child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.star, size: 16, color: DS.amber400),
            const SizedBox(width: 4),
            Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
          ]),
          const SizedBox(height: 2),
          const Text('Rating', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
        ]))),
        const SizedBox(width: 12),
        Expanded(
          child: GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DoctorReviewsScreen()),
            ),
            child: _StatCard(child: Column(children: [
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('$reviews', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right, size: 16, color: DS.mutedForeground),
              ]),
              const SizedBox(height: 2),
              const Text('Reviews', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
            ])),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(child: Column(children: [
          Text('$years', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
          const SizedBox(height: 2),
          const Text('Years Exp.', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
        ]))),
      ],
    );
  }

  Widget _buildQuickActions(DoctorProfile p) {
    return Row(
      children: [
        Expanded(
          child: _ActionTile(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Wallet',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => DoctorWalletScreen(doctorId: p.doctorId)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ActionTile(
            icon: Icons.lock_outline_rounded,
            label: 'Security',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DoctorSecurityScreen()),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfessionalInfo(DoctorProfile p) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Professional Information'),
          const SizedBox(height: 4),
          DoctorInfoRow(icon: Icons.email_outlined, label: 'Email', value: p.email ?? '-', boxSize: 40, iconSize: 22),
          const Divider(height: 1, color: DS.cardBorder),
          DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: p.phoneNumber ?? '-', boxSize: 40, iconSize: 22),
          const Divider(height: 1, color: DS.cardBorder),
          DoctorInfoRow(icon: Icons.school_outlined, label: 'Qualifications', value: p.qualifications ?? '-', boxSize: 40, iconSize: 22),
          const Divider(height: 1, color: DS.cardBorder),
          DoctorInfoRow(icon: Icons.account_balance_wallet_outlined, label: 'Consultation Fee', value: p.consultationFee != null ? '\$${p.consultationFee!.toStringAsFixed(0)}' : '-', boxSize: 40, iconSize: 22),
          if (p.bio != null && p.bio!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: DS.secondary.withOpacity(0.6), borderRadius: BorderRadius.circular(8)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Bio', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DS.mutedForeground)),
                  const SizedBox(height: 4),
                  Text(p.bio!, style: const TextStyle(fontSize: 14, height: 1.5, color: DS.foreground)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildClinicCard(DoctorProfile p) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: DS.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
            child: const Icon(Icons.business, size: 20, color: DS.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.clinicName ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DS.foreground)),
                if (p.clinicAddress != null) ...[const SizedBox(height: 2), Text(p.clinicAddress!, style: const TextStyle(fontSize: 14, color: DS.mutedForeground))],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesCard() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: DS.cardDecoration,
      child: Column(
        children: [
          _buildServiceRow(icon: Icons.public, label: 'Online', serviceKey: 'online'),
          const Divider(height: 1, color: DS.cardBorder, indent: 12, endIndent: 12),
          _buildServiceRow(icon: Icons.home_outlined, label: 'Home Visit', serviceKey: 'homeVisit'),
        ],
      ),
    );
  }

  Widget _buildServiceRow({required IconData icon, required String label, required String serviceKey}) {
    final value = _services[serviceKey] ?? false;
    final loading = _serviceLoading[serviceKey] ?? false;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 25, color: value ? DS.primary : DS.mutedForeground),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                Text(value ? 'Accepting new bookings' : 'Not accepting bookings', style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
              ],
            ),
          ),
          loading
              ? const SizedBox(
                  width: 20, height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary),
                )
              : Switch(
                  value: value,
                  onChanged: (_) => _toggleService(serviceKey),
                  activeColor: DS.primary,
                ),
        ],
      ),
    );
  }

  Future<void> _toggleService(String serviceKey) async {
    final newValue = !(_services[serviceKey] ?? false);
    final otherKeysAllOff = _services.keys
        .where((k) => k != serviceKey)
        .every((k) => !(_services[k] ?? false));

    if (otherKeysAllOff && !newValue) {
      showDoctorNotice(context, 'At least one service must be active', isError: true);
      return;
    }

    setState(() => _serviceLoading[serviceKey] = true);
    try {
      final token = context.read<AuthProvider>().accessToken ?? '';
      final result = await DoctorService.updateServices(token, {serviceKey: newValue});
      if (mounted) {
        setState(() => _services = {..._services, ...result});
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceAll('Exception: ', ''), isError: true);
      }
    } finally {
      if (mounted) setState(() => _serviceLoading[serviceKey] = false);
    }
  }

  Widget _buildSettingsMenu() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: DS.cardDecoration,
      child: Column(
        children: [
          DoctorMenuItem(icon: Icons.help_outline, label: 'Help & Support', onTap: () {
            showDoctorNotice(context, 'Support: support@healthlink.com');
          }),
        ],
      ),
    );
  }

  String _formatDoctorName(String? fullName) {
    if (fullName == null || fullName.isEmpty) return 'Dr. Doctor';
    String name = fullName.trim();
    final lowerName = name.toLowerCase();
    if (lowerName.startsWith('bs.')) name = name.substring(3).trim();
    else if (lowerName.startsWith('bs ')) name = name.substring(2).trim();
    else if (lowerName.startsWith('dr.')) name = name.substring(3).trim();
    else if (lowerName.startsWith('dr ')) name = name.substring(2).trim();
    return 'Dr. $name';
  }

  Future<void> _pickAndUploadAvatar() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        margin: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 36, height: 4, margin: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(color: DS.border, borderRadius: BorderRadius.circular(2))),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Text('Change Avatar', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: DS.foreground)),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined, color: DS.primary),
            title: const Text('Take a photo'),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: DS.primary),
            title: const Text('Choose from gallery'),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
    if (source == null) return;

    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85, maxWidth: 800);
    if (picked == null) return;

    setState(() => _uploadingAvatar = true);
    try {
      final token = context.read<AuthProvider>().accessToken ?? '';
      final newUrl = await DoctorService.uploadAvatar(token, picked.path);
      await _loadData();
      if (mounted) {
        await showDoctorNotice(context, 'Avatar updated successfully');
        // Update local avatar immediately without waiting for full reload
        if (_profile != null) {
          setState(() => _profile = DoctorProfile(
            doctorId: _profile!.doctorId, fullName: _profile!.fullName,
            email: _profile!.email, phoneNumber: _profile!.phoneNumber,
            specialty: _profile!.specialty, specialtyName: _profile!.specialtyName,
            qualifications: _profile!.qualifications,
            yearsOfExperience: _profile!.yearsOfExperience,
            bio: _profile!.bio, clinicName: _profile!.clinicName,
            clinicAddress: _profile!.clinicAddress, location: _profile!.location,
            consultationFee: _profile!.consultationFee,
            averageRating: _profile!.averageRating, totalReviews: _profile!.totalReviews,
            avatarUrl: newUrl, verified: _profile!.verified,
            scheduleStatus: _profile!.scheduleStatus,
            availableTypes: _profile!.availableTypes,
            bankAccount: _profile!.bankAccount, bankName: _profile!.bankName,
            paypalEmail: _profile!.paypalEmail,
            customCommissionRateOnline: _profile!.customCommissionRateOnline,
            customCommissionRateOffline: _profile!.customCommissionRateOffline,
          ));
        }
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceAll('Exception: ', ''), isError: true);
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _confirmLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: DS.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(35)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFBF33),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.priority_high_rounded, size: 35, color: Colors.white  ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Are you sure you want to log out of your account?',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, height: 1.5, color: DS.mutedForeground),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: DS.foreground,
                        side: const BorderSide(color: DS.cardBorder),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF1D9E75))),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1D9E75),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Log out', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (confirmed != true) return;

    await context.read<AuthProvider>().logout();
    if (mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
    }
  }

}

class _StatCard extends StatelessWidget {
  final Widget child;
  const _StatCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(padding: const EdgeInsets.all(10), decoration: DS.cardDecoration, child: child);
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _ActionTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        decoration: DS.cardDecoration,
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(color: DS.primary.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 20, color: DS.primary),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground)),
            ),
            const Icon(Icons.chevron_right, size: 18, color: DS.mutedForeground),
          ],
        ),
      ),
    );
  }
}
