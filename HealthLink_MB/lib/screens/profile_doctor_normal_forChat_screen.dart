import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../config/api_config.dart';
import '../providers/auth_provider.dart';

/// Model nhẹ dùng để ánh xạ DoctorProfileResponse từ backend.
class _DoctorProfile {
  final String doctorId;
  final String fullName;
  final String specialty;
  final String? qualifications;
  final int? yearsOfExperience;
  final String? languageSpoken;
  final String? location;
  final String? avatarUrl;
  final String? bio;
  final String? clinicName;
  final String? clinicAddress;
  final double? latitude;
  final double? longitude;
  final double? averageRating;
  final int? totalReviews;

  const _DoctorProfile({
    required this.doctorId,
    required this.fullName,
    required this.specialty,
    this.qualifications,
    this.yearsOfExperience,
    this.languageSpoken,
    this.location,
    this.avatarUrl,
    this.bio,
    this.clinicName,
    this.clinicAddress,
    this.latitude,
    this.longitude,
    this.averageRating,
    this.totalReviews,
  });

  factory _DoctorProfile.fromJson(Map<String, dynamic> json) => _DoctorProfile(
        doctorId: json['doctorId']?.toString() ?? '',
        fullName: json['fullName']?.toString() ?? 'Unknown Doctor',
        specialty: json['specialty']?.toString() ?? 'General',
        qualifications: json['qualifications']?.toString(),
        yearsOfExperience: (json['yearsOfExperience'] as num?)?.toInt(),
        languageSpoken: json['languageSpoken']?.toString(),
        location: json['location']?.toString(),
        avatarUrl: json['avatarUrl']?.toString(),
        bio: json['bio']?.toString(),
        clinicName: json['clinicName']?.toString(),
        clinicAddress: json['clinicAddress']?.toString(),
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        averageRating: (json['averageRating'] as num?)?.toDouble(),
        totalReviews: (json['totalReviews'] as num?)?.toInt(),
      );
}

/// Màn hình hiển thị hồ sơ cơ bản của Bác sĩ khi Patient xem từ phòng chat.
/// Nhận vào [doctorId] và [initialName] để hiển thị ngay lập tức trong lúc đang fetch.
class DoctorInfoScreen extends StatefulWidget {
  /// ID của bác sĩ cần xem hồ sơ (chính là conversation.partnerId).
  final String doctorId;

  /// Tên hiển thị tạm thời trong lúc chờ API (từ conversation.partnerName).
  final String initialName;

  const DoctorInfoScreen({
    super.key,
    required this.doctorId,
    required this.initialName,
  });

  @override
  State<DoctorInfoScreen> createState() => _DoctorInfoScreenState();
}

class _DoctorInfoScreenState extends State<DoctorInfoScreen> {
  _DoctorProfile? _profile;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDoctorProfile();
  }

  /// Gọi API public để lấy hồ sơ bác sĩ theo ID.
  /// Endpoint: GET /api/account/doctors/public/{doctorId}
  /// Không yêu cầu auth vì là public endpoint.
  Future<void> _fetchDoctorProfile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = context.read<AuthProvider>().accessToken;
      final url = Uri.parse('${ApiConfig.baseUrl}/account/doctors/public/${widget.doctorId}');

      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.connectTimeout);

      if (!mounted) return;

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final profile = _DoctorProfile.fromJson(json);
        setState(() {
          _profile = profile;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Unable to load doctor profile (${response.statusCode}).\nID: ${widget.doctorId}';
          _isLoading = false;
        });
      }
    } catch (e, stack) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Error: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: colorScheme.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Doctor Profile',
          style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface),
        ),
      ),
      body: _buildBody(context, colorScheme, textTheme),
      bottomNavigationBar: _profile != null
          ? _buildBookingBar(colorScheme, textTheme)
          : null,
    );
  }

  Widget _buildBody(BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    // --- Trạng thái Loading ---
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              'Loading profile for ${widget.initialName}...',
              style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      );
    }

    // --- Trạng thái Error ---
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 56, color: colorScheme.error),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _fetchDoctorProfile,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    // --- Trạng thái có dữ liệu ---
    final profile = _profile!;
    final avatarUrl = ApiConfig.normalizeUrl(profile.avatarUrl);

    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // --- 1. Hero: Avatar + Name + Specialty ---
              Stack(
                alignment: Alignment.bottomRight,
                children: [
                  Container(
                    width: 128,
                    height: 128,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: colorScheme.surface, width: 4),
                      boxShadow: [
                        BoxShadow(
                          color: colorScheme.primary.withValues(alpha: 0.25),
                          blurRadius: 24,
                          spreadRadius: -8,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(100),
                      child: avatarUrl != null && avatarUrl.isNotEmpty
                          ? Image.network(
                              avatarUrl,
                              fit: BoxFit.cover,
                              alignment: Alignment.topCenter,
                              errorBuilder: (_, __, _e) =>
                                  Icon(Icons.person, size: 64, color: colorScheme.outlineVariant),
                            )
                          : Icon(Icons.person, size: 64, color: colorScheme.outlineVariant),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                profile.fullName,
                textAlign: TextAlign.center,
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                profile.specialty,
                style: textTheme.titleMedium?.copyWith(
                  color: colorScheme.primary,
                ),
              ),
              if (profile.qualifications != null && profile.qualifications!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  profile.qualifications!,
                  style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
              const SizedBox(height: 8),

              // Rating
              if (profile.averageRating != null)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.star_rounded, color: Colors.amber, size: 20),
                    const SizedBox(width: 4),
                    Text(
                      profile.averageRating!.toStringAsFixed(1),
                      style: textTheme.labelLarge?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (profile.totalReviews != null) ...[
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Text('•', style: TextStyle(color: colorScheme.outline)),
                      ),
                      Text(
                        '${profile.totalReviews} reviews',
                        style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ],
                ),
              const SizedBox(height: 24),

              // --- 2. Quick Stats ---
              Row(
                children: [
                  _buildStatCard(
                    context,
                    icon: Icons.medical_services_outlined,
                    value: profile.yearsOfExperience != null
                        ? '${profile.yearsOfExperience}+'
                        : 'N/A',
                    label: 'Years Exp.',
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    context,
                    icon: Icons.language_outlined,
                    value: profile.languageSpoken ?? 'N/A',
                    label: 'Languages',
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    context,
                    icon: Icons.location_on_outlined,
                    value: (profile.location != null && profile.location!.isNotEmpty)
                        ? profile.location!
                        : 'N/A',
                    label: 'Location',
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // --- 3. Bio Section ---
              if (profile.bio != null && profile.bio!.isNotEmpty)
                _buildSection(
                  context,
                  icon: Icons.contact_page_outlined,
                  title: 'About',
                  child: Text(
                    profile.bio!,
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                      height: 1.6,
                    ),
                  ),
                ),
              if (profile.bio != null && profile.bio!.isNotEmpty)
                const SizedBox(height: 24),

              // --- 4. Clinic Information ---
              if ((profile.clinicName != null && profile.clinicName!.isNotEmpty) ||
                  (profile.clinicAddress != null && profile.clinicAddress!.isNotEmpty))
                _buildSection(
                  context,
                  icon: Icons.local_hospital_outlined,
                  title: 'Clinic Information',
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.apartment_outlined, color: colorScheme.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (profile.clinicName != null && profile.clinicName!.isNotEmpty)
                              Text(
                                profile.clinicName!,
                                style: textTheme.titleSmall?.copyWith(color: colorScheme.onSurface),
                              ),
                            if (profile.clinicAddress != null && profile.clinicAddress!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                profile.clinicAddress!,
                                style: textTheme.bodyMedium?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  /// Card hiển thị một chỉ số thống kê (Years, Languages, Location).
  Widget _buildStatCard(BuildContext context, {
    required IconData icon,
    required String value,
    required String label,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colorScheme.outline.withValues(alpha: 0.15)),
        ),
        child: Column(
          children: [
            Icon(icon, color: colorScheme.primary, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: textTheme.titleSmall?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  /// Section có tiêu đề và icon, bọc content bên trong.
  Widget _buildSection(BuildContext context, {
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: colorScheme.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  /// Bottom bar nút đặt lịch hẹn với bác sĩ.
  Widget _buildBookingBar(ColorScheme colorScheme, TextTheme textTheme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(top: BorderSide(color: colorScheme.outline.withValues(alpha: 0.2))),
      ),
      child: SafeArea(
        child: Align(
          alignment: Alignment.center,
          heightFactor: 1.0,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 480),
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: colorScheme.primary,
                foregroundColor: colorScheme.onPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                elevation: 2,
              ),
              onPressed: () {
                // TODO: Navigate sang màn hình đặt lịch với doctorId
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Booking feature coming soon!')),
                );
              },
              icon: const Icon(Icons.calendar_month_outlined, size: 20),
              label: const Text('Book Appointment'),
            ),
          ),
        ),
      ),
    );
  }
}