import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/doctor/doctor_month_calendar.dart';
import 'doctor_appointment_detail_screen.dart';

const _readyNowWindow = Duration(minutes: 15);
const _tickInterval = Duration(seconds: 30);

/// Chặn số lớn (ngày bận bất thường) làm vỡ layout badge/chip cố định bề
/// rộng — cùng quy ước "99+" đã dùng cho badge chat/notification.
String _formatCount(int n) => n > 99 ? '99+' : '$n';

class DoctorHomeScreen extends StatefulWidget {
  const DoctorHomeScreen({super.key});

  @override
  State<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends State<DoctorHomeScreen> {
  bool _isLoading = true;
  String? _error;
  DoctorProfile? _profile;
  List<DoctorAppointment> _appointments = [];
  int _totalCount = 0;
  int _completedCount = 0;
  DateTime _selectedDate = _dateOnly(DateTime.now());
  String _selectedStatus = 'ALL';

  // Thu gọn mặc định danh sách đã xong — giữ focus vào việc còn phải làm.
  bool _showFinished = false;

  Timer? _tickTimer;

  static const _statusFilters = [
    {'key': 'ALL', 'label': 'All'},
    {'key': 'SCHEDULED', 'label': 'Scheduled'},
    {'key': 'IN_CONSULTATION', 'label': 'In Progress'},
    {'key': 'COMPLETED', 'label': 'Completed'},
    {'key': 'CANCELLED', 'label': 'Cancelled'},
  ];

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  @override
  void initState() {
    super.initState();
    _loadData();
    // Chỉ để làm mới badge đếm ngược ("IN 5 MINS" -> "READY NOW") và bắt cuộc
    // hẹn mới/đổi trạng thái khi đang xem hôm nay — không polling khi xem
    // ngày khác vì khái niệm "sắp tới" không có ý nghĩa với quá khứ/tương lai.
    _tickTimer = Timer.periodic(_tickInterval, (_) {
      if (mounted && _isToday) _silentReload();
    });
  }

  @override
  void dispose() {
    _tickTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final daily = await _fetchDaily();
      if (mounted) {
        setState(() {
          _appointments = daily.appointments;
          _totalCount = daily.totalCount;
          _completedCount = daily.completedCount;
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

  /// Refetch nhẹ chạy nền — không bật spinner, không báo lỗi (best-effort).
  Future<void> _silentReload() async {
    if (_isLoading) return;
    try {
      final daily = await _fetchDaily();
      if (mounted) {
        setState(() {
          _appointments = daily.appointments;
          _totalCount = daily.totalCount;
          _completedCount = daily.completedCount;
        });
      }
    } catch (_) {}
  }

  Future<DoctorDailyAppointments> _fetchDaily() async {
    final auth = context.read<AuthProvider>();
    final token = auth.accessToken;
    if (token == null) throw Exception('Not authenticated');
    _profile ??= await DoctorService.getProfile(token);
    return DoctorService.getDailyAppointments(token, _profile!.doctorId, date: _selectedDate);
  }

  bool get _isToday {
    final today = _dateOnly(DateTime.now());
    return _selectedDate.year == today.year &&
        _selectedDate.month == today.month &&
        _selectedDate.day == today.day;
  }

  // ── Filter chip: danh sách phẳng theo status đã chọn (dùng khi filter cụ
  // thể hoặc đang xem ngày khác hôm nay) ─────────────────────────────────
  List<DoctorAppointment> get _filteredAppointments {
    var list = _appointments;
    if (_selectedStatus == 'SCHEDULED') {
      list = list.where((a) {
        final s = a.status?.toUpperCase();
        return s != 'COMPLETED' && s != 'CANCELLED' && s != 'IN_CONSULTATION';
      }).toList();
    } else if (_selectedStatus != 'ALL') {
      list = list.where((a) => a.status?.toUpperCase() == _selectedStatus).toList();
    }
    list.sort((a, b) {
      final aTime = a.appointmentTime ?? DateTime.now();
      final bTime = b.appointmentTime ?? DateTime.now();
      return aTime.compareTo(bTime);
    });
    return list;
  }

  // ── Nhóm theo mức độ khẩn — chỉ áp dụng khi xem hôm nay + filter "All",
  // giúp bác sĩ thấy ngay việc cần làm thay vì dò cả danh sách ─────────────
  List<DoctorAppointment> get _inProgress =>
      _appointments.where((a) => a.status?.toUpperCase() == 'IN_CONSULTATION').toList();

  List<DoctorAppointment> get _actionable {
    final list = _appointments.where((a) {
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

  DoctorAppointment? get _nextAppointment {
    if (_inProgress.isNotEmpty) return _inProgress.first;
    if (_readyNow.isNotEmpty) return _readyNow.first;
    if (_upcoming.isNotEmpty) return _upcoming.first;
    return null;
  }

  List<DoctorAppointment> get _upNext {
    final nextId = _nextAppointment?.appointmentId;
    return [..._inProgress, ..._readyNow, ..._upcoming]
        .where((a) => a.appointmentId != nextId)
        .toList();
  }

  List<DoctorAppointment> get _finishedToday {
    final list = _appointments.where((a) {
      final s = a.status?.toUpperCase();
      return s == 'COMPLETED' || s == 'CANCELLED';
    }).toList();
    list.sort((a, b) {
      final aTime = a.appointmentTime ?? DateTime.now();
      final bTime = b.appointmentTime ?? DateTime.now();
      return bTime.compareTo(aTime);
    });
    return list;
  }

  /// Badge đếm ngược cho thẻ nổi bật — "READY NOW" trong cửa sổ 15p, "IN X
  /// MIN(S)"/"IN X HR(S)" trước đó, null khi đang IN_CONSULTATION (dùng nhãn
  /// mặc định "IN PROGRESS" của card).
  String? _highlightBadgeFor(DoctorAppointment appointment) {
    if (appointment.status?.toUpperCase() == 'IN_CONSULTATION') return null;
    final apptTime = appointment.appointmentTime;
    if (apptTime == null) return null;
    final diff = apptTime.difference(DateTime.now());
    if (diff <= _readyNowWindow && diff >= Duration.zero) return 'READY NOW';
    if (diff < Duration.zero) return null;
    final minutes = diff.inMinutes;
    if (minutes < 60) return 'IN $minutes MIN${minutes == 1 ? '' : 'S'}';
    final hours = (minutes / 60).round();
    return 'IN $hours HR${hours == 1 ? '' : 'S'}';
  }

  void _selectDate(DateTime date) {
    setState(() => _selectedDate = date);
    _loadData();
  }

  void _openDetail(DoctorAppointment appointment) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DoctorAppointmentDetailScreen(appointment: appointment)),
    ).then((_) => _loadData());
  }

  @override
  Widget build(BuildContext context) {
    final showSmartGrouping = _isToday && _selectedStatus == 'ALL';

    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),

          // Date selector — lịch tháng đầy đủ, tô màu Today/Scheduled/Day Off
          // theo lịch làm việc thật.
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: DoctorMonthCalendar(
              selectedDate: _selectedDate,
              onDateChange: _selectDate,
            ),
          ),
          const SizedBox(height: 14),

          // Tóm tắt nhanh — cho bác sĩ nắm tổng quan ngày mà không cần đọc
          // hết danh sách.
          if (!_isLoading && _error == null) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _StatChip(icon: Icons.event_note_rounded, label: 'Total', value: _totalCount, color: DS.primary),
                  const SizedBox(width: 8),
                  _StatChip(icon: Icons.play_circle_outline_rounded, label: 'Active', value: _inProgress.length, color: DS.amber600),
                  const SizedBox(width: 8),
                  _StatChip(icon: Icons.check_circle_outline_rounded, label: 'Done', value: _completedCount, color: DS.emerald600),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Status filters
          SizedBox(
            height: 36,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _statusFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final filter = _statusFilters[index];
                return DoctorFilterChip(
                  label: filter['label']!,
                  selected: _selectedStatus == filter['key'],
                  onTap: () => setState(() => _selectedStatus = filter['key']!),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // Appointment list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: DS.primary))
                : _error != null
                    ? _buildErrorState()
                    : RefreshIndicator(
                        color: DS.primary,
                        onRefresh: _loadData,
                        child: showSmartGrouping ? _buildSmartList() : _buildFlatList(),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFlatList() {
    final list = _filteredAppointments;
    if (list.isEmpty) return _buildEmptyState();
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final appt = list[index];
        return DoctorAppointmentActionCard(appointment: appt, onTap: () => _openDetail(appt));
      },
    );
  }

  Widget _buildSmartList() {
    final next = _nextAppointment;
    final upNext = _upNext;
    final finished = _finishedToday;

    if (next == null && upNext.isEmpty && finished.isEmpty) {
      return _buildEmptyState();
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      children: [
        if (next != null) ...[
          DoctorAppointmentActionCard(
            appointment: next,
            highlighted: true,
            highlightBadge: _highlightBadgeFor(next),
            onTap: () => _openDetail(next),
          ),
          const SizedBox(height: 20),
        ],
        if (upNext.isNotEmpty) ...[
          DoctorSectionLabel('Up next (${_formatCount(upNext.length)})'),
          const SizedBox(height: 10),
          ...upNext.map((a) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: DoctorAppointmentActionCard(appointment: a, onTap: () => _openDetail(a)),
              )),
        ],
        if (finished.isNotEmpty) ...[
          if (upNext.isNotEmpty) const SizedBox(height: 8),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _showFinished = !_showFinished),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                DoctorSectionLabel('Completed today (${_formatCount(finished.length)})'),
                Icon(_showFinished ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                    size: 20, color: DS.mutedForeground),
              ],
            ),
          ),
          if (_showFinished) ...[
            const SizedBox(height: 10),
            ...finished.map((a) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Opacity(
                    opacity: 0.72,
                    child: DoctorAppointmentActionCard(appointment: a, onTap: () => _openDetail(a)),
                  ),
                )),
          ],
        ],
        if (next == null && upNext.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: DoctorEmptyState(
              icon: Icons.event_available,
              title: "You're all caught up",
              subtitle: 'No more appointments waiting today.',
            ),
          ),
      ],
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
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
            const Text('Failed to load appointments',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
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

  Widget _buildEmptyState() {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: const Center(
              child: DoctorEmptyState(
                icon: Icons.event_busy,
                title: 'No appointments',
                subtitle: 'There are no appointments matching this date or filter.',
              ),
            ),
          ),
        );
      },
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final int value;
  final Color color;

  const _StatChip({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 6),
            Text(_formatCount(value), style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: TextStyle(fontSize: 11, color: color.withValues(alpha: 0.85), fontWeight: FontWeight.w500),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
