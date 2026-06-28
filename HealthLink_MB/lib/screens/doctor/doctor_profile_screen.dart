import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';

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
  bool _available = true;
  bool _uploadingAvatar = false;

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
        setState(() {
          _profile = results[0] as DoctorProfile;
          _reviewStats = results[1] as Map<String, dynamic>;
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
            const SizedBox(height: 4),
            Text(p.specialtyName ?? p.specialty ?? 'General Practitioner', style: TextStyle(fontSize: 14, color: DS.primaryForeground.withOpacity(0.8))),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: _showEditProfile,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit, size: 16, color: DS.foreground),
                    SizedBox(width: 8),
                    Text('Edit Profile', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                  ],
                ),
              ),
            ),
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
        Expanded(child: _StatCard(child: Column(children: [
          Text('$reviews', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
          const SizedBox(height: 2),
          const Text('Reviews', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
        ]))),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(child: Column(children: [
          Text('$years', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
          const SizedBox(height: 2),
          const Text('Years Exp.', style: TextStyle(fontSize: 11, color: DS.mutedForeground)),
        ]))),
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
          DoctorInfoRow(icon: Icons.email_outlined, label: 'Email', value: p.email ?? '-'),
          const Divider(height: 1, color: DS.cardBorder),
          DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: p.phoneNumber ?? '-'),
          const Divider(height: 1, color: DS.cardBorder),
          DoctorInfoRow(icon: Icons.school_outlined, label: 'Qualifications', value: p.qualifications ?? '-'),
          const Divider(height: 1, color: DS.cardBorder),
          DoctorInfoRow(icon: Icons.account_balance_wallet_outlined, label: 'Consultation Fee', value: p.consultationFee != null ? '\$${p.consultationFee!.toStringAsFixed(0)}' : '-'),
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

  Widget _buildSettingsMenu() {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: DS.cardDecoration,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                Container(width: 36, height: 36, decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.verified_outlined, size: 18, color: DS.mutedForeground)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Schedule Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                      Text(_available ? 'Available for consultations' : 'Unavailable', style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                    ],
                  ),
                ),
                Switch(
                  value: _available,
                  onChanged: (v) {
                    setState(() => _available = v);
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(v ? "You're now available" : 'Marked as unavailable'), behavior: SnackBarBehavior.floating));
                  },
                  activeColor: DS.primary,
                ),
              ],
            ),
          ),
          DoctorMenuItem(icon: Icons.help_outline, label: 'Help & Support', onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Support: help@healthlink.io'), behavior: SnackBarBehavior.floating));
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
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Avatar updated successfully'),
          backgroundColor: DS.primary,
        ));
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
            bankAccount: _profile!.bankAccount, bankName: _profile!.bankName,
            paypalEmail: _profile!.paypalEmail,
            customCommissionRateOnline: _profile!.customCommissionRateOnline,
            customCommissionRateOffline: _profile!.customCommissionRateOffline,
          ));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: DS.destructive,
        ));
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  void _showEditProfile() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _EditProfileSheet(profile: _profile!, onSaved: () { Navigator.pop(context); _loadData(); }),
    );
  }

}

class _StatCard extends StatelessWidget {
  final Widget child;
  const _StatCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(padding: const EdgeInsets.all(16), decoration: DS.cardDecoration, child: child);
  }
}

class _EditProfileSheet extends StatefulWidget {
  final DoctorProfile profile;
  final VoidCallback onSaved;
  const _EditProfileSheet({required this.profile, required this.onSaved});

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _phoneController;
  late TextEditingController _bioController;
  late TextEditingController _paypalEmailController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: widget.profile.phoneNumber);
    _bioController = TextEditingController(text: widget.profile.bio);
    _paypalEmailController = TextEditingController(text: widget.profile.paypalEmail);
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _bioController.dispose();
    _paypalEmailController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      await DoctorService.updateProfile(token, {
        'phoneNumber': _phoneController.text,
        'bio': _bioController.text,
        'paypalEmail': _paypalEmailController.text,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated'), behavior: SnackBarBehavior.floating));
        widget.onSaved();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), behavior: SnackBarBehavior.floating));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 40),
      decoration: const BoxDecoration(color: DS.card, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(padding: const EdgeInsets.only(top: 12), child: Container(width: 40, height: 4, decoration: BoxDecoration(color: DS.cardBorder, borderRadius: BorderRadius.circular(2)))),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Edit Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DS.foreground)),
                SizedBox(height: 4),
                Text('Update your contact details and payout email.', style: TextStyle(fontSize: 14, color: DS.mutedForeground)),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Phone', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                    const SizedBox(height: 8),
                    TextFormField(controller: _phoneController, keyboardType: TextInputType.phone, decoration: DS.inputDecoration(hintText: 'Enter phone number')),
                    const SizedBox(height: 16),
                    const Text('Bio', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                    const SizedBox(height: 8),
                    TextFormField(controller: _bioController, maxLines: 4, decoration: DS.inputDecoration(hintText: 'Write about yourself...')),
                    const SizedBox(height: 16),
                    const Text('PayPal Email', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _paypalEmailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: DS.inputDecoration(hintText: 'Email for receiving payments'),
                      validator: (v) { if (v != null && v.isNotEmpty && !v.contains('@')) return 'Please enter a valid email'; return null; },
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).padding.bottom + 20),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveProfile,
                style: DS.primaryButtonStyle,
                child: _isSaving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primaryForeground))
                    : const Text('Save Changes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
