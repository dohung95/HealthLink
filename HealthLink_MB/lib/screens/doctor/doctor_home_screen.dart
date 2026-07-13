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
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/doctor/complete_appointment_sheet.dart';
import 'doctor_appointment_detail_screen.dart';

const _readyNowWindow = Duration(minutes: 15);
const _pollInterval = Duration(seconds: 30);

DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

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
  DateTime _selectedDate = _dateOnly(DateTime.now());

  Timer? _pollTimer;

  int _unreadCount = 0;
  NotificationService? _notificationService;
  StreamSubscription<NotificationItem>? _notificationSubscription;

  @override
  void initState() {
    super.initState();
    _loadData();
    _initNotifications();
    _pollTimer = Timer.periodic(_pollInterval, (_) => _silentReload());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
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
    await _fetchAndApply();
  }

  /// Refetch nhẹ chạy nền mỗi 30s — chỉ áp dụng khi đang xem hôm nay (giống
  /// web), và không bật spinner toàn màn để tránh giật màn hình.
  Future<void> _silentReload() async {
    if (!mounted || _isLoading || !_isToday) return;
    await _fetchAndApply(silent: true);
  }

  Future<void> _fetchAndApply({bool silent = false}) async {
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final profile = _profile ?? await DoctorService.getProfile(token);
      final daily = await DoctorService.getDailyAppointments(
        token,
        profile.doctorId,
        date: _selectedDate,
      );
      final appointments = daily.appointments;

      if (mounted) {
        setState(() {
          _profile = profile;
          _todayAppointments = appointments;
          _stats = {
            'todayAppointments': appointments.length,
            'completedToday': appointments
                .where((a) => a.status?.toUpperCase() == 'COMPLETED')
                .length,
            'pendingToday': appointments
                .where((a) =>
                    a.status?.toUpperCase() == 'PENDING' ||
                    a.status?.toUpperCase() == 'CONFIRMED')
                .length,
          };
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted && !silent) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  bool get _isToday {
    final today = _dateOnly(DateTime.now());
    return _selectedDate.year == today.year &&
        _selectedDate.month == today.month &&
        _selectedDate.day == today.day;
  }

  String get _selectedDateLabel {
    if (_isToday) return 'Today, ${DateFormat('MMM d').format(_selectedDate)}';
    return DateFormat('EEE, MMM d, yyyy').format(_selectedDate);
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 1),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: Theme.of(context).colorScheme.copyWith(primary: DS.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _selectedDate = _dateOnly(picked));
      _loadData();
    }
  }

  void _goToToday() {
    if (_isToday) return;
    setState(() => _selectedDate = _dateOnly(DateTime.now()));
    _loadData();
  }

  // ── Grouping theo mức độ khẩn (giống DoctorTodayCockpit bên web) ──────────

  List<DoctorAppointment> get _inProgress => _todayAppointments
      .where((a) => a.status?.toUpperCase() == 'IN_PROGRESS')
      .toList();

  List<DoctorAppointment> get _actionable {
    final list = _todayAppointments.where((a) {
      final s = a.status?.toUpperCase();
      return s == 'PENDING' || s == 'CONFIRMED';
    }).toList();
    list.sort((a, b) {
      final aTime = a.appointmentTime ?? DateTime.now();
      final bTime = b.appointmentTime ?? DateTime.now();
      return aTime.compareTo(bTime);
    });
    return list;
  }

  List<DoctorAppointment> get _readyNow {
    final now = DateTime.now();
    return _actionable.where((a) {
      final t = a.appointmentTime;
      if (t == null) return false;
      return !t.isBefore(now) && t.difference(now) <= _readyNowWindow;
    }).toList();
  }

  List<DoctorAppointment> get _upcoming {
    final readyIds = _readyNow.map((a) => a.appointmentId).toSet();
    return _actionable.where((a) => !readyIds.contains(a.appointmentId)).toList();
  }

  List<DoctorAppointment> get _finishedToday => _todayAppointments.where((a) {
        final s = a.status?.toUpperCase();
        return s == 'COMPLETED' || s == 'CANCELLED' || s == 'NO_SHOW';
      }).toList();

  /// Chỉ nổi bật "lịch hẹn kế tiếp" khi đang xem hôm nay — khái niệm
  /// in-progress/ready-now không có ý nghĩa với ngày quá khứ/tương lai.
  DoctorAppointment? get _nextAppointment {
    if (!_isToday) return null;
    if (_inProgress.isNotEmpty) return _inProgress.first;
    if (_readyNow.isNotEmpty) return _readyNow.first;
    if (_upcoming.isNotEmpty) return _upcoming.first;
    return null;
  }

  List<DoctorAppointment> get _scheduleList {
    if (!_isToday) {
      final list = List<DoctorAppointment>.from(_todayAppointments);
      list.sort((a, b) {
        final aTime = a.appointmentTime ?? DateTime.now();
        final bTime = b.appointmentTime ?? DateTime.now();
        return aTime.compareTo(bTime);
      });
      return list;
    }
    final next = _nextAppointment;
    final combined = [..._inProgress, ..._readyNow, ..._upcoming, ..._finishedToday];
    return combined.where((a) => a.appointmentId != next?.appointmentId).toList();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  Future<void> _startConsultation(DoctorAppointment appointment) async {
    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) return;
      await DoctorService.startConsultation(token, appointment.appointmentId);
      if (mounted) {
        await showDoctorNotice(context, 'Consultation started');
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  void _cancelAppointment(DoctorAppointment appointment) {
    showDoctorNotice(context, 'Appointment updated');
    _loadData();
  }

  void _openCompleteSheet(DoctorAppointment appointment) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CompleteAppointmentSheet(
        appointmentId: appointment.appointmentId,
        patientName: appointment.patientName,
        onCompleted: _loadData,
      ),
    );
  }

  void _openDetail(DoctorAppointment appointment) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DoctorAppointmentDetailScreen(appointment: appointment)),
    ).then((_) => _loadData());
  }

  void _startCall(DoctorAppointment appointment) {
    showDoctorNotice(context, 'Connecting call with ${appointment.patientName ?? "patient"}...');
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

    final next = _nextAppointment;
    final schedule = _scheduleList;

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
                    // Date selector
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        GestureDetector(
                          onTap: _pickDate,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.calendar_month_rounded, size: 18, color: DS.primary),
                              const SizedBox(width: 8),
                              Text(
                                _selectedDateLabel,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DS.foreground),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: DS.mutedForeground),
                            ],
                          ),
                        ),
                        if (!_isToday)
                          GestureDetector(
                            onTap: _goToToday,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: DS.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Today',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.primary),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),

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

                    // Next up card
                    if (next != null) ...[
                      DoctorAppointmentActionCard(
                        appointment: next,
                        highlighted: true,
                        onStart: () => _startConsultation(next),
                        onCancel: () => _cancelAppointment(next),
                        onComplete: () => _openCompleteSheet(next),
                        onCall: () => _startCall(next),
                        onTap: () => _openDetail(next),
                      ),
                      const SizedBox(height: 20),
                    ],

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
                              DoctorSectionLabel(_isToday ? "TODAY'S SCHEDULE" : 'SCHEDULE'),
                              if (next != null || schedule.isNotEmpty)
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
                          if (next == null && schedule.isEmpty)
                            DoctorEmptyState(
                              icon: Icons.event_available,
                              title: _isToday ? 'No appointments today' : 'No appointments on this day',
                              subtitle: _isToday
                                  ? 'Enjoy your day off or check upcoming appointments.'
                                  : 'Pick another date to see a different schedule.',
                            )
                          else if (schedule.isEmpty)
                            const DoctorEmptyState(
                              icon: Icons.event_available,
                              title: "You're all caught up",
                              subtitle: 'No other appointments waiting today.',
                            )
                          else
                            ...schedule.take(5).map((a) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: DoctorAppointmentActionCard(
                                    appointment: a,
                                    onStart: () => _startConsultation(a),
                                    onCancel: () => _cancelAppointment(a),
                                    onComplete: () => _openCompleteSheet(a),
                                    onCall: () => _startCall(a),
                                    onTap: () => _openDetail(a),
                                  ),
                                )),
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
