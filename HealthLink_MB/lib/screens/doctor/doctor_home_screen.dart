import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../services/notification/notification_service.dart';
import '../../services/notification/notification_realtime_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../models/notification/notification_item.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import 'doctor_notification_center_sheet.dart';

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

  int _unreadCount = 0;
  NotificationService? _notificationService;
  StreamSubscription<NotificationItem>? _notificationSubscription;

  @override
  void initState() {
    super.initState();
    _loadData();
    _initNotifications();
  }

  @override
  void dispose() {
    _notificationSubscription?.cancel();
    super.dispose();
  }

  void _initNotifications() {
    final auth = context.read<AuthProvider>();
    final token = auth.accessToken;
    if (token == null) return;

    _notificationService = NotificationService(accessToken: token);
    _loadUnreadCount();

    NotificationRealtimeService.instance.connect(token: token);
    _notificationSubscription =
        NotificationRealtimeService.instance.stream.listen((notification) {
      if (mounted) setState(() => _unreadCount++);
    });
  }

  Future<void> _loadUnreadCount() async {
    if (_notificationService == null) return;
    try {
      final count = await _notificationService!.getUnreadCount();
      if (mounted) setState(() => _unreadCount = count);
    } catch (_) {}
  }

  void _showNotificationSheet() {
    if (_notificationService == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DoctorNotificationCenterSheet(
        service: _notificationService!,
        onChanged: _loadUnreadCount,
      ),
    );
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

      final profile = await DoctorService.getProfile(token);
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

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  String _withDoctorPrefix(String? name) {
    if (name == null || name.isEmpty) return 'Dr. Doctor';
    final clean = name.replaceAll(RegExp(r'^\s*(dr\.?|bs\.?|bác sĩ)\s*', caseSensitive: false), '').trim();
    return 'Dr. $clean';
  }

  String _badgeCount(int n) => n > 99 ? '99+' : '$n';

  String _formatDate(DateTime date) {
    final weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${weekdays[date.weekday % 7]}, ${date.day} ${months[date.month - 1]} ${date.year}';
  }

  String _getInitials(String name) {
    final clean = name.replaceAll(RegExp(r'^\s*(dr\.?|bs\.?)\s*', caseSensitive: false), '').trim();
    final parts = clean.split(RegExp(r'\s+'));
    final first = parts.isNotEmpty ? parts[0] : '';
    final second = parts.length > 1 ? parts[1] : '';
    return '${first.isNotEmpty ? first[0] : ''}${second.isNotEmpty ? second[0] : ''}'.toUpperCase();
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
        body: Center(
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
              const Text('Failed to load data', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
              const SizedBox(height: 4),
              Text(_error ?? '', style: const TextStyle(fontSize: 14, color: DS.mutedForeground), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadData,
                style: DS.primaryButtonStyle,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: DS.background,
      body: RefreshIndicator(
        color: DS.primary,
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // === HEADER ===
              DoctorCurvedHeader(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
                            ),
                            child: CircleAvatar(
                              radius: 24,
                              backgroundColor: Colors.white.withOpacity(0.2),
                              backgroundImage: _profile?.avatarUrl != null
                                  ? NetworkImage(ApiConfig.normalizeUrl(_profile!.avatarUrl!) ?? '')
                                  : null,
                              child: _profile?.avatarUrl == null
                                  ? Text(
                                      _getInitials(_profile?.fullName ?? 'D'),
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 16),
                                    )
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${_greeting()},', style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8))),
                                Text(_withDoctorPrefix(_profile?.fullName), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                          ),
                          _NotificationBell(
                            unreadCount: _unreadCount,
                            onTap: _showNotificationSheet,
                            badgeCount: _badgeCount,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(_formatDate(DateTime.now()), style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8))),
                    ],
                  ),
                ),
              ),

              // === MAIN CONTENT ===
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stats Grid
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.45,
                      children: [
                        DoctorStatCard(
                          icon: Icons.calendar_today,
                          label: "Today's Appointments",
                          value: '${_stats['todayAppointments'] ?? 0}',
                          backgroundColor: DS.primary.withOpacity(0.15),
                          iconColor: DS.primary,
                        ),
                        DoctorStatCard(
                          icon: Icons.check_circle_outline,
                          label: 'Completed',
                          value: '${_stats['completedToday'] ?? 0}',
                          backgroundColor: DS.emerald100,
                          iconColor: DS.emerald600,
                        ),
                        DoctorStatCard(
                          icon: Icons.schedule,
                          label: 'Pending',
                          value: '${_stats['pendingToday'] ?? 0}',
                          backgroundColor: DS.amber100,
                          iconColor: DS.amber600,
                        ),
                        DoctorStatCard(
                          icon: Icons.star,
                          label: 'Rating',
                          value: (_stats['averageRating'] as num?)?.toStringAsFixed(1) ?? '0.0',
                          backgroundColor: DS.sky100,
                          iconColor: DS.sky600,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Section header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const DoctorSectionLabel("TODAY'S SCHEDULE"),
                        if (_todayAppointments.isNotEmpty)
                          GestureDetector(
                            onTap: widget.onViewAllAppointments,
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('See all', style: TextStyle(fontSize: 14, color: DS.primary, fontWeight: FontWeight.w500)),
                                Icon(Icons.chevron_right, size: 18, color: DS.primary),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Appointments list or empty state
                    if (_todayAppointments.isEmpty)
                      const DoctorEmptyState(
                        icon: Icons.event_available,
                        title: 'No appointments today',
                        subtitle: 'Enjoy your day off or check upcoming appointments.',
                      )
                    else
                      ...(_todayAppointments.take(5).map((a) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _AppointmentCard(appointment: a),
                          ))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// PRIVATE WIDGETS (specific to this screen)
// ============================================================================

class _NotificationBell extends StatelessWidget {
  final int unreadCount;
  final VoidCallback onTap;
  final String Function(int) badgeCount;

  const _NotificationBell({required this.unreadCount, required this.onTap, required this.badgeCount});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), shape: BoxShape.circle),
        child: Stack(
          alignment: Alignment.center,
          children: [
            const Icon(Icons.notifications_outlined, color: Colors.white, size: 20),
            if (unreadCount > 0)
              Positioned(
                right: 4,
                top: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                  decoration: BoxDecoration(color: DS.destructive, borderRadius: BorderRadius.circular(8)),
                  child: Center(
                    child: Text(badgeCount(unreadCount), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final DoctorAppointment appointment;

  const _AppointmentCard({required this.appointment});

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');
    final time = appointment.appointmentTime != null ? timeFormat.format(appointment.appointmentTime!) : '--:--';

    return Container(
      decoration: DS.cardDecoration,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 56,
              child: Column(
                children: [
                  Text(time, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: DS.foreground)),
                  const SizedBox(height: 4),
                  Icon(Icons.schedule, size: 12, color: DS.mutedForeground.withOpacity(0.6)),
                ],
              ),
            ),
            Container(width: 1, height: 40, color: DS.cardBorder, margin: const EdgeInsets.symmetric(horizontal: 12)),
            DoctorPersonAvatar(
              name: appointment.patientName ?? 'Patient',
              imageUrl: appointment.patientAvatar != null ? ApiConfig.normalizeUrl(appointment.patientAvatar!) : null,
              size: 44,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(appointment.patientName ?? 'Unknown Patient', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DS.foreground), maxLines: 1, overflow: TextOverflow.ellipsis),
                  if (appointment.symptoms != null && appointment.symptoms!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(appointment.symptoms!, style: const TextStyle(fontSize: 12, color: DS.mutedForeground), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      DoctorConsultationPill(type: appointment.consultationType ?? 'VIDEO'),
                      const SizedBox(width: 8),
                      DoctorStatusBadge(status: appointment.status ?? 'PENDING'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
