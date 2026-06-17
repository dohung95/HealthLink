import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';

class DoctorHomeScreen extends StatefulWidget {
  final VoidCallback? onViewAllAppointments;

  const DoctorHomeScreen({super.key, this.onViewAllAppointments});

  @override
  State<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends State<DoctorHomeScreen> {
  bool _isLoading = true;
  String? _error;
  DoctorProfile? _profile;
  List<DoctorAppointment> _todayAppointments = [];
  Map<String, dynamic> _stats = {};

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

      // Load profile
      final profile = await DoctorService.getProfile(token);

      // Load dashboard stats
      final stats = await DoctorService.getDashboardStats(token, profile.doctorId);

      if (mounted) {
        setState(() {
          _profile = profile;
          _stats = stats;
          _todayAppointments = (stats['appointments'] as List<DoctorAppointment>?) ?? [];
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
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildErrorWidget()
                : RefreshIndicator(
                    onRefresh: _loadData,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildHeader(theme),
                          const SizedBox(height: 24),
                          _buildStatsCards(theme),
                          const SizedBox(height: 24),
                          _buildTodayAppointments(theme),
                          const SizedBox(height: 16), // Bottom padding
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _buildErrorWidget() {
    final colors = context.doctorColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: colors.error),
            const SizedBox(height: 16),
            Text(
              'Failed to load data',
              style: TextStyle(fontSize: 18, color: colors.onSurfaceVariant),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: colors.onSurfaceVariant.withOpacity(0.7)),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    final greeting = _getGreeting();
    final today = DateFormat('EEEE, d MMMM yyyy').format(DateTime.now());

    return Row(
      children: [
        // Avatar
        CircleAvatar(
          radius: 30,
          backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
          backgroundImage: _profile?.avatarUrl != null
              ? NetworkImage(ApiConfig.normalizeUrl(_profile!.avatarUrl!) ?? '')
              : null,
          child: _profile?.avatarUrl == null
              ? Icon(Icons.person, size: 30, color: theme.colorScheme.primary)
              : null,
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$greeting,',
                style: TextStyle(
                  fontSize: 14,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              Text(
                _formatDoctorName(_profile?.fullName),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                today,
                style: TextStyle(
                  fontSize: 13,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Format tên bác sĩ - luôn dùng prefix "Dr."
  String _formatDoctorName(String? fullName) {
    if (fullName == null || fullName.isEmpty) return 'Dr. Doctor';

    String name = fullName.trim();
    final lowerName = name.toLowerCase();

    // Loại bỏ prefix cũ nếu có (BS., Dr., Bs., dr.)
    if (lowerName.startsWith('bs.')) {
      name = name.substring(3).trim();
    } else if (lowerName.startsWith('bs ')) {
      name = name.substring(2).trim();
    } else if (lowerName.startsWith('dr.')) {
      name = name.substring(3).trim();
    } else if (lowerName.startsWith('dr ')) {
      name = name.substring(2).trim();
    }

    return 'Dr. $name';
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  Widget _buildStatsCards(ThemeData theme) {
    final colors = context.doctorColors;
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          theme,
          icon: Icons.calendar_today,
          label: "Today's Appointments",
          value: '${_stats['todayAppointments'] ?? 0}',
          color: colors.statAppointments,
          bgColor: colors.statAppointmentsBg,
        ),
        _buildStatCard(
          theme,
          icon: Icons.check_circle_outline,
          label: 'Completed',
          value: '${_stats['completedToday'] ?? 0}',
          color: colors.statCompleted,
          bgColor: colors.statCompletedBg,
        ),
        _buildStatCard(
          theme,
          icon: Icons.pending_actions,
          label: 'Pending',
          value: '${_stats['pendingToday'] ?? 0}',
          color: colors.statPending,
          bgColor: colors.statPendingBg,
        ),
        _buildStatCard(
          theme,
          icon: Icons.star,
          label: 'Rating',
          value: (_stats['averageRating'] as num?)?.toStringAsFixed(1) ?? '0.0',
          subtitle: '${_stats['totalReviews'] ?? 0} reviews',
          color: colors.statRating,
          bgColor: colors.statRatingBg,
        ),
      ],
    );
  }

  Widget _buildStatCard(
    ThemeData theme, {
    required IconData icon,
    required String label,
    required String value,
    String? subtitle,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 24),
              const Spacer(),
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11,
                    color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTodayAppointments(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Today's Schedule",
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            if (_todayAppointments.isNotEmpty)
              TextButton(
                onPressed: widget.onViewAllAppointments,
                child: const Text('View All'),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (_todayAppointments.isEmpty)
          _buildEmptyAppointments(theme)
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _todayAppointments.take(5).length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              return _buildAppointmentCard(theme, _todayAppointments[index]);
            },
          ),
      ],
    );
  }

  Widget _buildEmptyAppointments(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(
            Icons.event_available,
            size: 48,
            color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
          ),
          const SizedBox(height: 12),
          Text(
            'No appointments today',
            style: TextStyle(
              fontSize: 16,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Enjoy your free time!',
            style: TextStyle(
              fontSize: 14,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentCard(ThemeData theme, DoctorAppointment appointment) {
    final colors = context.doctorColors;
    final timeFormat = DateFormat('HH:mm');
    final time = appointment.appointmentTime != null
        ? timeFormat.format(appointment.appointmentTime!)
        : '--:--';

    final statusColor = colors.getStatusColor(appointment.status);
    final statusBgColor = colors.getStatusBgColor(appointment.status);

    IconData typeIcon;
    switch (appointment.consultationType?.toUpperCase()) {
      case 'VIDEO':
        typeIcon = Icons.videocam;
        break;
      case 'AUDIO':
        typeIcon = Icons.call;
        break;
      case 'CHAT':
        typeIcon = Icons.chat;
        break;
      default:
        typeIcon = Icons.person;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: colors.cardShadow,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Time
          Container(
            width: 60,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            decoration: BoxDecoration(
              color: colors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Text(
                  time,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: colors.primary,
                  ),
                ),
                Icon(typeIcon, size: 20, color: colors.primary),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // Patient info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appointment.patientName ?? 'Unknown Patient',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  appointment.symptoms ?? 'No symptoms provided',
                  style: TextStyle(
                    fontSize: 13,
                    color: colors.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusBgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              appointment.status ?? 'PENDING',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
