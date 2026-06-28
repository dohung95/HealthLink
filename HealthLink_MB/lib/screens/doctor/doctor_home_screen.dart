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
              // === MAIN CONTENT ===
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stats Grid
                    Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: DS.card,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Expanded(child: _CompactStatCard(
                            icon: Icons.calendar_today,
                            label: 'Appointments',
                            value: '${_stats['todayAppointments'] ?? 0}',
                            bgColor: DS.primary.withValues(alpha: 0.15),
                            iconColor: DS.primary,
                          )),
                          Expanded(child: _CompactStatCard(
                            icon: Icons.check_circle_outline,
                            label: 'Completed',
                            value: '${_stats['completedToday'] ?? 0}',
                            bgColor: DS.emerald100,
                            iconColor: DS.emerald600,
                          )),
                          Expanded(child: _CompactStatCard(
                            icon: Icons.schedule,
                            label: 'Pending',
                            value: '${_stats['pendingToday'] ?? 0}',
                            bgColor: DS.amber100,
                            iconColor: DS.amber600,
                          )),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Schedule section
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: DS.card,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
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
                  Icon(Icons.schedule, size: 12, color: DS.mutedForeground.withValues(alpha: 0.6)),
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

class _CompactStatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color bgColor;
  final Color iconColor;

  const _CompactStatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.bgColor,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 45,
            height: 45,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 24, color: iconColor),
          ),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: DS.foreground)),
          const SizedBox(height: 2),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DS.foreground, letterSpacing: 0.2), overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
