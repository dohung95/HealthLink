import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';
import '../services/appointments/appointment_service.dart';
import '../services/patient_service.dart';

class PatientHomeScreen extends StatefulWidget {
  const PatientHomeScreen({
    super.key,
    required this.onOpenAppointments,
  });

  final VoidCallback onOpenAppointments;

  @override
  State<PatientHomeScreen> createState() => _PatientHomeScreenState();
}

class _PatientHomeScreenState extends State<PatientHomeScreen> {
  bool _loadingUpcoming = true;
  String? _upcomingError;
  List<PatientAppointment> _upcomingAppointments = [];

  bool _loadingStats = true;
  int _upcomingCount = 0;
  int _healthRecordCount = 0;
  int _prescriptionCount = 0;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadHomeData();
    });
  }

  Future<void> _loadHomeData() async {
    await Future.wait([
      _loadUpcomingAppointments(),
      _loadStats(),
    ]);
  }

  Future<void> _loadStats() async {
    final auth = context.read<AuthProvider>();

    if (!auth.isAuthenticated ||
        auth.accessToken == null ||
        auth.userId == null ||
        auth.userId!.isEmpty) {
      if (!mounted) return;

      setState(() {
        _loadingStats = false;
        _upcomingCount = 0;
        _healthRecordCount = 0;
        _prescriptionCount = 0;
      });

      return;
    }

    if (!mounted) return;

    setState(() {
      _loadingStats = true;
    });

    try {
      final token = auth.accessToken!;
      final patientId = auth.userId!;

      final results = await Future.wait<int>([
        _loadUpcomingCount(token, patientId),
        PatientService.getHealthRecordCount(token, patientId),
        PatientService.getPrescriptionCount(token, patientId),
      ]);

      if (!mounted) return;

      setState(() {
        _upcomingCount = results[0];
        _healthRecordCount = results[1];
        _prescriptionCount = results[2];
      });
    } catch (e) {
      debugPrint('[HOME] Stats error: $e');

      if (!mounted) return;

      setState(() {
        _upcomingCount = _upcomingAppointments.length;
        _healthRecordCount = 0;
        _prescriptionCount = 0;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingStats = false;
        });
      }
    }
  }

  Future<int> _loadUpcomingCount(String token, String patientId) async {
    final service = AppointmentService(accessToken: token);

    final result = await service.getPatientAppointmentsPage(
      patientId: patientId,
      page: 1,
      size: 50,
    );

    final now = DateTime.now();

    return result.items.where((appointment) {
      return appointment.isScheduled &&
          appointment.appointmentTime.isAfter(now);
    }).length;
  }

  Future<void> _loadUpcomingAppointments() async {
    final auth = context.read<AuthProvider>();

    if (!auth.isAuthenticated ||
        auth.accessToken == null ||
        auth.userId == null ||
        auth.userId!.isEmpty) {
      if (!mounted) return;

      setState(() {
        _loadingUpcoming = false;
        _upcomingAppointments = [];
        _upcomingError = null;
      });

      return;
    }

    if (!mounted) return;

    setState(() {
      _loadingUpcoming = true;
      _upcomingError = null;
    });

    try {
      debugPrint('[HOME] Loading upcoming appointments for patient: ${auth.userId}');

      final service = AppointmentService(accessToken: auth.accessToken!);

      final result = await service.getPatientAppointmentsPage(
        patientId: auth.userId!,
        page: 1,
        size: 10,
      );

      debugPrint('[HOME] Loaded appointments: ${result.items.length}');

      final now = DateTime.now();

      final upcoming = result.items
          .where((appointment) {
        return appointment.isScheduled &&
            appointment.appointmentTime.isAfter(now);
      })
          .toList()
        ..sort((a, b) => a.appointmentTime.compareTo(b.appointmentTime));

      if (!mounted) return;

      setState(() {
        _upcomingAppointments = upcoming;
        _upcomingCount = upcoming.length;
      });
    } catch (e) {
      debugPrint('[HOME] Upcoming appointments error: $e');

      if (!mounted) return;

      setState(() {
        _upcomingError = e.toString().replaceFirst('Exception: ', '');
        _upcomingAppointments = [];
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingUpcoming = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Tự động điều chỉnh giao diện nếu xoay ngang màn hình hoặc dùng Tablet (>= 768px)
    final bool isDesktop = MediaQuery.of(context).size.width >= 768;

    return Column(
      children: [
        _buildHeader(isDesktop),
        Expanded(
          child: RefreshIndicator(
            color: Theme.of(context).colorScheme.primary,
            onRefresh: () async {
              await context.read<AuthProvider>().fetchProfile();
              await _loadHomeData();
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.symmetric(
                horizontal: isDesktop ? 24.0 : 16.0,
                vertical: 16.0,
              ),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 1280),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsRow(),
                  const SizedBox(height: 24),
                  _buildUpcomingAppointmentCard(),
                  const SizedBox(height: 24),
                  _buildQuickActionsGrid(),
                ],
              ),
            ),
          ),
        ),
        ),
      ],
    );
  }

  // --- 1. Header (Avatar, Tên, Chuông thông báo) ---
  Widget _buildHeader(bool isDesktop) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? 24.0 : 16.0,
        vertical: isDesktop ? 16.0 : 12.0,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: () {
                    Scaffold.of(context).openDrawer();
                  },
                  child: Container(
                    width: isDesktop ? 48 : 40,
                    height: isDesktop ? 48 : 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(100),
                      child: _buildAvatarWidget(context, isDesktop),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _greeting(),
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: isDesktop ? 14 : 12,
                        color: Theme.of(context).colorScheme.outline,
                      ),
                    ),
                    Text(
                      context.watch<AuthProvider>().displayName ?? 'User',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: isDesktop ? 24 : 20,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Row(
              children: [
                if (isDesktop)
                  IconButton(
                    icon: const Icon(Icons.search),
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    onPressed: () {},
                  ),
                Stack(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.notifications_outlined),
                        color: Theme.of(context).colorScheme.primary,
                        onPressed: () {},
                      ),
                    ),
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.error,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- Helper: Avatar widget với fallback ---
  Widget _buildAvatarWidget(BuildContext context, bool isDesktop) {
    final avatarUrl = context.watch<AuthProvider>().avatarUrl;
    final normalizedUrl = ApiConfig.normalizeUrl(avatarUrl);
    final size = isDesktop ? 48.0 : 40.0;

    if (normalizedUrl != null) {
      return Image.network(
        normalizedUrl,
        fit: BoxFit.cover,
        width: size,
        height: size,
        errorBuilder: (_, __, ___) => Icon(
          Icons.account_circle,
          size: size,
          color: Theme.of(context).colorScheme.outline,
        ),
      );
    }
    return Icon(
      Icons.account_circle,
      size: size,
      color: Theme.of(context).colorScheme.outline,
    );
  }

  // --- Helper: Lời chào theo giờ ---
  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Hello, Good Morning';
    if (hour < 18) return 'Hi, Good Afternoon,';
    return 'Have a good night';
  }

  // --- 2. Hàng Thống Kê ---
  Widget _buildStatsRow() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double itemWidth = (constraints.maxWidth - 24) / 3;
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildStatItem(
              itemWidth,
              _loadingStats ? '...' : '$_upcomingCount',
              'Upcoming',
              Theme.of(context).colorScheme.primary,
              false,
            ),
            _buildStatItem(
              itemWidth,
              _loadingStats ? '...' : '$_healthRecordCount',
              'New Records',
              Theme.of(context).colorScheme.secondary,
              _healthRecordCount > 0,
            ),
            _buildStatItem(
              itemWidth,
              _loadingStats ? '...' : '$_prescriptionCount',
              'Prescriptions',
              Theme.of(context).colorScheme.secondary,
              false,
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatItem(double width, String value, String title, Color valueColor, bool hasBadge) {
    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (hasBadge)
            Positioned(
              top: -10,
              right: -10,
              child: Opacity(
                opacity: 0.2,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondary, shape: BoxShape.circle),
                ),
              ),
            ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value,
                style: TextStyle(fontFamily: 'Inter', fontSize: 32, fontWeight: FontWeight.bold, color: valueColor),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 3. Thẻ Lịch Hẹn Sắp Tới ---
  Widget _buildUpcomingAppointmentCard() {
    final colors = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Upcoming Appointments',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: colors.onSurface,
          ),
        ),
        const SizedBox(height: 12),

        if (_loadingUpcoming)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colors.surface.withOpacity(0.95),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: colors.outlineVariant),
            ),
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          )
        else if (_upcomingError != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colors.errorContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              _upcomingError!,
              style: TextStyle(
                color: colors.onErrorContainer,
                fontWeight: FontWeight.w600,
              ),
            ),
          )
        else if (_upcomingAppointments.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colors.surface.withOpacity(0.95),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colors.outlineVariant),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.event_available_outlined,
                    size: 42,
                    color: colors.outline,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'No upcoming appointments',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Book an appointment to start consulting with a doctor.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              children: _upcomingAppointments.take(3).map((appointment) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildUpcomingAppointmentItem(appointment),
                );
              }).toList(),
            ),
      ],
    );
  }

  Widget _buildUpcomingAppointmentItem(PatientAppointment appointment) {
    final colors = Theme.of(context).colorScheme;
    final isToday = _isSameDay(appointment.appointmentTime, DateTime.now());

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surface.withOpacity(0.95),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: colors.onSurface.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: colors.primary,
                child: Text(
                  _doctorInitials(appointment.doctorName),
                  style: TextStyle(
                    color: colors.onPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appointment.doctorName,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: colors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      appointment.specialtyName.isEmpty
                          ? appointment.consultationType
                          : '${appointment.specialtyName} • ${appointment.consultationType}',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 13,
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isToday
                      ? colors.primary.withOpacity(0.12)
                      : colors.surfaceVariant,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(
                  isToday ? 'Today' : 'Upcoming',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: isToday ? colors.primary : colors.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.surfaceVariant,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.schedule,
                  color: colors.secondary,
                  size: 20,
                ),
                const SizedBox(width: 12),

                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _formatAppointmentTime(appointment.appointmentTime),
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: colors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatAppointmentDate(appointment.appointmentTime),
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: colors.primary,
                    side: BorderSide(color: colors.outlineVariant),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: () {
                    widget.onOpenAppointments();
                  },
                  icon: const Icon(Icons.edit_calendar_outlined, size: 16),
                  label: const Text('More'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.primary,
                    foregroundColor: colors.onPrimary,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('You can join when the consultation starts.'),
                      ),
                    );
                  },
                  icon: Icon(
                    appointment.isChat
                        ? Icons.chat_bubble_outline
                        : Icons.videocam_outlined,
                    size: 16,
                  ),
                  label: Text(
                    appointment.isChat ? 'Chat' : 'Join Room',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 4. Các nút thao tác nhanh ---
  Widget _buildQuickActionsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final bool isWide = constraints.maxWidth > 600;
            return GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: isWide ? 4 : 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.1,
              children: [
                _buildQuickActionButton(Icons.calendar_month, 'Book Appointment', Theme.of(context).colorScheme.surface, Theme.of(context).colorScheme.primary),
                _buildQuickActionButton(Icons.medical_information, 'Health Records', Theme.of(context).colorScheme.secondary, Theme.of(context).colorScheme.onSecondary),
                _buildQuickActionButton(Icons.share, 'Share Records', Theme.of(context).colorScheme.secondary.withOpacity(0.1), Theme.of(context).colorScheme.secondary),
                _buildQuickActionButton(Icons.chat, 'Chat with Doctor', Theme.of(context).colorScheme.surface, Theme.of(context).colorScheme.primary),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildQuickActionButton(IconData icon, String title, Color iconBgColor, Color iconColor) {
    return InkWell(
      onTap: () {},
      borderRadius: BorderRadius.circular(12),
        child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface.withOpacity(0.95),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
          boxShadow: [
            BoxShadow(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(color: iconBgColor, shape: BoxShape.circle),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onSurface)),
          ],
        ),
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _doctorInitials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.isEmpty) return 'DR';
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }

    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }

  String _formatAppointmentTime(DateTime date) {
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    final end = date.add(const Duration(minutes: 30));
    final endHour = end.hour.toString().padLeft(2, '0');
    final endMinute = end.minute.toString().padLeft(2, '0');

    return '$hour:$minute - $endHour:$endMinute';
  }

  String _formatAppointmentDate(DateTime date) {
    const weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}