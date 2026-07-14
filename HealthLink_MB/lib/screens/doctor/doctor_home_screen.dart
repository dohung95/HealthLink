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
import '../../widgets/doctor/doctor_month_calendar.dart';
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

  // Theo dõi ID lịch hẹn đã biết để phát hiện lịch hẹn mới xuất hiện khi poll
  // nền — khớp `knownAppointmentIdsRef` của DoctorTodayCockpit bên web.
  Set<int> _knownAppointmentIds = {};

  // Search cho tab "Scheduled" — khớp ô search của DoctorTodayCockpit bên web
  // (trước đây chỉ có ở tab History).
  String _scheduleSearch = '';
  final TextEditingController _scheduleSearchController = TextEditingController();

  // ── History tab (giống mục "History" dưới "Appointments" bên web) ────────
  bool _showHistory = false;
  bool _historyLoaded = false;
  bool _historyLoading = false;
  String? _historyError;
  List<DoctorAppointment> _historyAppointments = [];
  String _historyStatusFilter = 'ALL';
  DateTime? _historyDateFilter;
  String _historySearch = '';
  final TextEditingController _historySearchController = TextEditingController();
  int _historyPage = 1;
  static const int _historyPageSize = 6;

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
    _historySearchController.dispose();
    _scheduleSearchController.dispose();
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
      final newIds = appointments.map((a) => a.appointmentId).toSet();
      // Chỉ báo "lịch hẹn mới" từ lần fetch thứ 2 trở đi cho cùng 1 ngày —
      // tránh toast dội khi mới load trang, khớp hành vi web.
      if (_knownAppointmentIds.isNotEmpty) {
        for (final appt in appointments) {
          if (!_knownAppointmentIds.contains(appt.appointmentId) && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('New appointment: ${appt.patientName ?? 'Patient'}')),
            );
          }
        }
      }
      _knownAppointmentIds = newIds;

      if (mounted) {
        setState(() {
          _profile = profile;
          _todayAppointments = appointments;
          // Dùng counts BE trả sẵn (đã tính đúng theo SCHEDULED/COMPLETED thật)
          // thay vì tự đếm lại theo status string ở client.
          _stats = {
            'todayAppointments': daily.totalCount,
            'completedToday': daily.completedCount,
            'pendingToday': daily.pendingCount,
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

  void _onCalendarDateChange(DateTime date) {
    setState(() => _selectedDate = date);
    _knownAppointmentIds = {};
    _loadData();
  }

  void _selectTab(bool showHistory) {
    if (_showHistory == showHistory) return;
    setState(() => _showHistory = showHistory);
    if (showHistory && !_historyLoaded) _loadHistory();
  }

  Future<void> _pickHistoryDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _historyDateFilter ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: now,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: Theme.of(context).colorScheme.copyWith(primary: DS.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _historyDateFilter = _dateOnly(picked);
        _historyPage = 1;
      });
    }
  }

  Future<void> _loadHistory() async {
    setState(() {
      _historyLoading = true;
      _historyError = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final profile = _profile ?? await DoctorService.getProfile(token);
      final appointments = await DoctorService.getAppointments(token, profile.doctorId, size: 200);

      if (mounted) {
        setState(() {
          _profile = profile;
          _historyAppointments = appointments;
          _historyLoaded = true;
          _historyLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _historyError = e.toString().replaceFirst('Exception: ', '');
          _historyLoading = false;
        });
      }
    }
  }

  bool get _historyHasRawHistory => _historyAppointments.any((a) {
        final s = a.status?.toUpperCase();
        return s == 'COMPLETED' || s == 'CANCELLED';
      });

  /// Danh sách đã áp dụng bộ lọc ngày + tìm kiếm (chưa lọc theo status),
  /// dùng để tính số lượng hiển thị ngay trên từng chip All/Completed/Cancelled.
  List<DoctorAppointment> get _historyDateSearchFiltered {
    var list = _historyAppointments.where((a) {
      final s = a.status?.toUpperCase();
      return s == 'COMPLETED' || s == 'CANCELLED';
    }).toList();
    final dateFilter = _historyDateFilter;
    if (dateFilter != null) {
      list = list.where((a) {
        final t = a.appointmentTime;
        if (t == null) return false;
        return t.year == dateFilter.year && t.month == dateFilter.month && t.day == dateFilter.day;
      }).toList();
    }
    final query = _historySearch.trim().toLowerCase();
    if (query.isNotEmpty) {
      list = list.where((a) {
        final haystack = [a.patientName, a.symptoms].whereType<String>().where((v) => v.isNotEmpty).join(' ').toLowerCase();
        return haystack.contains(query);
      }).toList();
    }
    return list;
  }

  int _historyCountFor(String status) {
    if (status == 'ALL') return _historyDateSearchFiltered.length;
    return _historyDateSearchFiltered.where((a) => a.status?.toUpperCase() == status).length;
  }

  List<DoctorAppointment> get _filteredHistory {
    var list = _historyDateSearchFiltered;
    if (_historyStatusFilter != 'ALL') {
      list = list.where((a) => a.status?.toUpperCase() == _historyStatusFilter).toList();
    }
    list = List<DoctorAppointment>.from(list)
      ..sort((a, b) {
        final aTime = a.appointmentTime ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bTime = b.appointmentTime ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bTime.compareTo(aTime);
      });
    return list;
  }

  // ── Grouping theo mức độ khẩn (giống DoctorTodayCockpit bên web) ──────────
  // Status thật từ BE chỉ có: SCHEDULED, IN_CONSULTATION, COMPLETED, CANCELLED.

  List<DoctorAppointment> get _inProgress => _todayAppointments
      .where((a) => a.status?.toUpperCase() == 'IN_CONSULTATION')
      .toList();

  List<DoctorAppointment> get _actionable {
    // Coi mọi status không phải COMPLETED/CANCELLED/IN_CONSULTATION là "chưa
    // start" (kể cả rác dữ liệu cũ như Confirmed/Pending còn sót trong seed) —
    // tránh appointment biến mất khỏi Home chỉ vì status khác 'SCHEDULED'.
    final list = _todayAppointments.where((a) {
      final s = a.status?.toUpperCase();
      return s != 'COMPLETED' && s != 'CANCELLED' && s != 'IN_CONSULTATION';
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
        return s == 'COMPLETED' || s == 'CANCELLED';
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

  /// Danh sách "TODAY'S SCHEDULE" sau khi áp search — khớp cách web filter
  /// `todayAppointments` (không lọc thẻ next-appointment nổi bật ở trên).
  List<DoctorAppointment> get _filteredScheduleList {
    final query = _scheduleSearch.trim().toLowerCase();
    if (query.isEmpty) return _scheduleList;
    return _scheduleList.where((a) {
      final haystack = [a.patientName, a.symptoms, a.consultationType, a.status]
          .whereType<String>()
          .where((v) => v.isNotEmpty)
          .join(' ')
          .toLowerCase();
      return haystack.contains(query);
    }).toList();
  }

  /// Badge đếm ngược cho thẻ "Next Appointment" — khớp `NextAppointmentCard`
  /// bên web (Live / Ready / In X mins / In X hrs).
  String? _highlightBadgeFor(DoctorAppointment appointment) {
    final status = appointment.status?.toUpperCase();
    if (status == 'IN_CONSULTATION') return null; // dùng nhãn mặc định "IN PROGRESS"
    final apptTime = appointment.appointmentTime;
    if (apptTime == null) return null;
    final diff = apptTime.difference(DateTime.now());
    if (diff <= _readyNowWindow && diff >= Duration.zero) return 'READY NOW';
    if (diff < Duration.zero) return null; // đã trễ giờ nhưng chưa start — giữ "NEXT UP"
    final minutes = diff.inMinutes;
    if (minutes < 60) return 'IN $minutes MIN${minutes == 1 ? '' : 'S'}';
    final hours = (minutes / 60).round();
    return 'IN $hours HR${hours == 1 ? '' : 'S'}';
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  void _openDetail(DoctorAppointment appointment) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DoctorAppointmentDetailScreen(appointment: appointment)),
    ).then((_) => _loadData());
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
    final filteredSchedule = _filteredScheduleList;

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
                    // Scheduled / History switcher — kiểu viên thuốc (pill) giống nút
                    // "Login" ở navbar bản web: bo tròn hoàn toàn + đổ bóng màu primary.
                    Row(
                      children: [
                        Expanded(child: _HomeTabChip(label: 'Scheduled', selected: !_showHistory, isFirst: true, onTap: () => _selectTab(false))),
                        Expanded(child: _HomeTabChip(label: 'History', selected: _showHistory, isFirst: false, onTap: () => _selectTab(true))),
                      ],
                    ),
                    const SizedBox(height: 14),

                    if (!_showHistory) ...[
                    // Calendar tháng — khớp TodayTimeline bên web (Today/Scheduled/Day Off/Empty).
                    // Mặc định thu gọn, chỉ hiện dòng tóm tắt ngày đang chọn; bấm vào để xổ ra chọn ngày.
                    DoctorMonthCalendar(
                      selectedDate: _selectedDate,
                      onDateChange: _onCalendarDateChange,
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
                        highlightBadge: _highlightBadgeFor(next),
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
                          if (schedule.isNotEmpty) ...[
                            TextField(
                              controller: _scheduleSearchController,
                              onChanged: (v) => setState(() => _scheduleSearch = v),
                              style: const TextStyle(fontSize: 14, color: DS.foreground),
                              decoration: InputDecoration(
                                hintText: 'Search patient...',
                                hintStyle: const TextStyle(fontSize: 14, color: DS.mutedForeground),
                                prefixIcon: const Icon(Icons.search, size: 20, color: DS.mutedForeground),
                                suffixIcon: _scheduleSearch.isEmpty
                                    ? null
                                    : IconButton(
                                        icon: const Icon(Icons.close, size: 18, color: DS.mutedForeground),
                                        onPressed: () {
                                          _scheduleSearchController.clear();
                                          setState(() => _scheduleSearch = '');
                                        },
                                      ),
                                filled: true,
                                fillColor: DS.background,
                                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.cardBorder)),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.cardBorder)),
                                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.primary)),
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
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
                          else if (filteredSchedule.isEmpty)
                            const DoctorEmptyState(
                              icon: Icons.search_off,
                              title: 'No matching appointments',
                              subtitle: 'Try a different search term.',
                            )
                          else
                            ...filteredSchedule.map((a) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: DoctorAppointmentActionCard(
                                    appointment: a,
                                    onTap: () => _openDetail(a),
                                  ),
                                )),
                        ],
                      ),
                    ),
                    ] else
                      _buildHistoryContent(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── History tab content ────────────────────────────────────────────────

  Widget _buildHistoryContent() {
    if (_historyLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: CircularProgressIndicator(color: DS.primary)),
      );
    }

    if (_historyError != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Column(children: [
            const Icon(Icons.error_outline, size: 32, color: DS.rose600),
            const SizedBox(height: 8),
            Text(_historyError!, style: const TextStyle(fontSize: 13, color: DS.mutedForeground), textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton.icon(onPressed: _loadHistory, style: DS.primaryButtonStyle, icon: const Icon(Icons.refresh, size: 16), label: const Text('Retry')),
          ]),
        ),
      );
    }

    final all = _filteredHistory;
    final totalPages = all.isEmpty ? 1 : ((all.length - 1) ~/ _historyPageSize) + 1;
    final page = _historyPage.clamp(1, totalPages);
    final pageItems = all.skip((page - 1) * _historyPageSize).take(_historyPageSize).toList();
    final dateFilter = _historyDateFilter;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    DoctorFilterChip(label: 'All (${_historyCountFor('ALL')})', selected: _historyStatusFilter == 'ALL', onTap: () => setState(() { _historyStatusFilter = 'ALL'; _historyPage = 1; })),
                    const SizedBox(width: 8),
                    DoctorFilterChip(label: 'Completed (${_historyCountFor('COMPLETED')})', selected: _historyStatusFilter == 'COMPLETED', onTap: () => setState(() { _historyStatusFilter = 'COMPLETED'; _historyPage = 1; })),
                    const SizedBox(width: 8),
                    DoctorFilterChip(label: 'Cancelled (${_historyCountFor('CANCELLED')})', selected: _historyStatusFilter == 'CANCELLED', onTap: () => setState(() { _historyStatusFilter = 'CANCELLED'; _historyPage = 1; })),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _pickHistoryDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: dateFilter != null ? DS.primary.withValues(alpha: 0.1) : DS.card,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: dateFilter != null ? DS.primary : DS.cardBorder),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.calendar_today, size: 14, color: dateFilter != null ? DS.primary : DS.mutedForeground),
                  if (dateFilter != null) ...[
                    const SizedBox(width: 6),
                    Text(DateFormat('MM/dd').format(dateFilter), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.primary)),
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: () => setState(() { _historyDateFilter = null; _historyPage = 1; }),
                      child: const Icon(Icons.close, size: 14, color: DS.primary),
                    ),
                  ],
                ]),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _historySearchController,
          onChanged: (v) => setState(() { _historySearch = v; _historyPage = 1; }),
          style: const TextStyle(fontSize: 14, color: DS.foreground),
          decoration: InputDecoration(
            hintText: 'Search patient...',
            hintStyle: const TextStyle(fontSize: 14, color: DS.mutedForeground),
            prefixIcon: const Icon(Icons.search, size: 20, color: DS.mutedForeground),
            suffixIcon: _historySearch.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.close, size: 18, color: DS.mutedForeground),
                    onPressed: () {
                      _historySearchController.clear();
                      setState(() { _historySearch = ''; _historyPage = 1; });
                    },
                  ),
            filled: true,
            fillColor: DS.card,
            contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.cardBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.cardBorder)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.primary)),
          ),
        ),
        const SizedBox(height: 14),
        if (all.isEmpty)
          DoctorEmptyState(
            icon: _historyHasRawHistory ? Icons.search_off : Icons.history,
            title: _historyHasRawHistory ? 'No appointments found' : 'No appointment history',
            subtitle: _historyHasRawHistory
                ? 'Try adjusting your filters or date range.'
                : 'Completed or cancelled appointments will show up here.',
          )
        else ...[
          ...pageItems.map((a) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: DoctorAppointmentActionCard(
                  appointment: a,
                  showFullDate: true,
                  onTap: () => _openDetail(a),
                ),
              )),
          if (totalPages > 1)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton.icon(
                  onPressed: page > 1 ? () => setState(() => _historyPage = page - 1) : null,
                  icon: const Icon(Icons.chevron_left, size: 16),
                  label: const Text('Prev'),
                ),
                Text('$page / $totalPages', style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                TextButton.icon(
                  onPressed: page < totalPages ? () => setState(() => _historyPage = page + 1) : null,
                  icon: const Icon(Icons.chevron_right, size: 16),
                  label: const Text('Next'),
                ),
              ],
            ),
        ],
      ],
    );
  }
}

class _HomeTabChip extends StatelessWidget {
  final String label;
  final bool selected;
  final bool isFirst;
  final VoidCallback onTap;

  const _HomeTabChip({required this.label, required this.selected, required this.isFirst, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final outerRadius = const Radius.circular(50);
    final borderRadius = isFirst
        ? BorderRadius.only(topLeft: outerRadius, bottomLeft: outerRadius)
        : BorderRadius.only(topRight: outerRadius, bottomRight: outerRadius);
    final borderSide = BorderSide(color: DS.cardBorder);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: selected ? DS.primary : DS.card,
          borderRadius: borderRadius,
          border: selected
              ? null
              : Border(
                  top: borderSide,
                  bottom: borderSide,
                  left: isFirst ? borderSide : BorderSide.none,
                  right: isFirst ? BorderSide.none : borderSide,
                ),
          boxShadow: selected
              ? [BoxShadow(color: DS.primary.withValues(alpha: 0.35), blurRadius: 15, offset: const Offset(0, 4))]
              : null,
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? DS.primaryForeground : DS.mutedForeground,
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
