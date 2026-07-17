import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/doctor_theme.dart';
import '../../providers/auth_provider.dart';
import '../../models/doctor/doctor_schedule.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../services/doctor/doctor_schedule_service.dart';
import '../../services/doctor/doctor_service.dart';
import '../../widgets/doctor/doctor_widgets.dart';

typedef DS = DoctorStyles;

const _days = [
  (index: 1, short: 'MON', label: 'Monday'),
  (index: 2, short: 'TUE', label: 'Tuesday'),
  (index: 3, short: 'WED', label: 'Wednesday'),
  (index: 4, short: 'THU', label: 'Thursday'),
  (index: 5, short: 'FRI', label: 'Friday'),
  (index: 6, short: 'SAT', label: 'Saturday'),
  (index: 0, short: 'SUN', label: 'Sunday'),
];

const _typeLabels = {
  'VIDEO': 'Video Call',
  'AUDIO': 'Audio Call',
  'CHAT': 'Chat',
  'OFFLINE': 'In-person',
  'HOMEVISIT': 'Home Visit',
  'ONLINE': 'Online',
};

const _shiftLabels = {
  'MORNING': 'Morning',
  'AFTERNOON': 'Afternoon',
  'EVENING': 'Evening',
};

// Shift windows must match backend & web (DoctorScheduleServiceImpl / ScheduleFormModal.jsx)
const _shiftWindows = {
  'MORNING':   (label: 'Morning',   start: '07:00', end: '10:30'),
  'AFTERNOON': (label: 'Afternoon', start: '13:00', end: '17:30'),
  'EVENING':   (label: 'Evening',   start: '19:00', end: '21:00'),
};
const _shiftOrder = ['MORNING', 'AFTERNOON', 'EVENING'];

bool _isHomeVisit(String? type) {
  final t = (type ?? '').trim().toLowerCase();
  return t == 'homevisit' || t == 'home visit' || t == 'home-visit' || t == 'home';
}

String _fmtTime(String? t) {
  if (t == null || t.isEmpty) return '';
  final p = t.split(':');
  return '${p[0].padLeft(2, '0')}:${(p.length > 1 ? p[1] : '00').padLeft(2, '0')}';
}

int _toMinutes(String hhmm) {
  final p = hhmm.split(':').map(int.parse).toList();
  return p[0] * 60 + p[1];
}

bool _rangesOverlap(String aStart, String aEnd, String bStart, String bEnd) =>
    _toMinutes(aStart) < _toMinutes(bEnd) && _toMinutes(bStart) < _toMinutes(aEnd);

// ─────────────────────────────────────────────────────────────────────────────

class DoctorScheduleScreen extends StatefulWidget {
  final VoidCallback? onScheduleSaved;
  const DoctorScheduleScreen({super.key, this.onScheduleSaved});

  @override
  State<DoctorScheduleScreen> createState() => _DoctorScheduleScreenState();
}

class _DoctorScheduleScreenState extends State<DoctorScheduleScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  DoctorScheduleData? _scheduleData;
  List<CalendarDay> _calendarDays = [];
  List<ScheduleChangeRequest> _changeRequests = [];
  List<DoctorAppointment> _upcomingAppointments = [];

  bool _loadingSchedule = true;
  bool _loadingCalendar = false;
  bool _loadingRequests = false;
  String? _error;

  DateTime _calendarMonth = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _tab.addListener(() {
      if (_tab.indexIsChanging) return;
      if (_tab.index == 1) _loadCalendar();
      if (_tab.index == 2) _loadRequests();
    });
    _loadAll();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  String get _token => context.read<AuthProvider>().accessToken ?? '';

  Future<void> _loadAll() async {
    setState(() { _loadingSchedule = true; _error = null; });
    try {
      final data = await DoctorScheduleService.getMySchedule(_token);
      if (mounted) setState(() { _scheduleData = data; _loadingSchedule = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loadingSchedule = false; });
    }
  }

  Future<void> _loadCalendar() async {
    setState(() => _loadingCalendar = true);
    try {
      final start = DateTime(_calendarMonth.year, _calendarMonth.month, 1);
      final end = DateTime(_calendarMonth.year, _calendarMonth.month + 1, 0);
      final fmt = DateFormat('yyyy-MM-dd');
      final days = await DoctorScheduleService.getCalendarView(
          _token, fmt.format(start), fmt.format(end));
      if (mounted) setState(() { _calendarDays = days; _loadingCalendar = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingCalendar = false);
    }
  }

  Future<void> _loadRequests() async {
    setState(() => _loadingRequests = true);
    try {
      final requests = await DoctorScheduleService.getChangeRequests(_token);
      if (mounted) setState(() { _changeRequests = requests; _loadingRequests = false; });

      // Also load upcoming appointments for the change request form
      final doctor = await DoctorService.getProfile(_token);
      final appts = await DoctorService.getAppointments(_token, doctor.doctorId.toString());
      final now = DateTime.now();
      final upcoming = appts
          .where((a) {
            final t = a.appointmentTime;
            return t != null &&
                t.isAfter(now) &&
                (a.status ?? '').toUpperCase() == 'SCHEDULED';
          })
          .toList()
        ..sort((a, b) => a.appointmentTime!.compareTo(b.appointmentTime!));
      if (mounted) setState(() => _upcomingAppointments = upcoming);
    } catch (_) {
      if (mounted) setState(() => _loadingRequests = false);
    }
  }

  void _showSnack(String msg, {bool success = false}) {
    if (success) {
      _showSuccessPopup(msg);
    } else {
      showDoctorNotice(context, msg, isError: true);
    }
  }

  void _showSuccessPopup(String msg) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.35),
      builder: (_) => _SuccessPopup(message: msg),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted && Navigator.of(context).canPop()) Navigator.of(context).pop();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Container(
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
                children: [
                  Expanded(
                    child: TabBar(
                      controller: _tab,
                      labelColor: DS.primary,
                      unselectedLabelColor: DS.mutedForeground,
                      indicatorColor: DS.primary,
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      tabs: const [
                        Tab(icon: Icon(Icons.view_week_outlined), text: 'Weekly'),
                        Tab(icon: Icon(Icons.calendar_month_outlined), text: 'Calendar'),
                        Tab(icon: Icon(Icons.swap_horiz_outlined), text: 'Requests'),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, size: 20, color: DS.mutedForeground),
                    onPressed: () {
                      _loadAll();
                      if (_tab.index == 1) _loadCalendar();
                      if (_tab.index == 2) _loadRequests();
                    },
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tab,
              children: [
                _WeeklyTab(
                  loading: _loadingSchedule,
                  error: _error,
                  data: _scheduleData,
                  onRefresh: () {
                    _loadAll();
                    widget.onScheduleSaved?.call();
                  },
                  token: _token,
                  onSnack: _showSnack,
                ),
                _CalendarTab(
                  loading: _loadingCalendar,
                  days: _calendarDays,
                  exceptions: _scheduleData?.exceptions ?? [],
                  month: _calendarMonth,
                  onMonthChanged: (m) {
                    setState(() => _calendarMonth = m);
                    _loadCalendar();
                  },
                  token: _token,
                  onSnack: _showSnack,
                  onDataChanged: () {
                    _loadCalendar();
                    _loadAll();
                    widget.onScheduleSaved?.call();
                  },
                ),
                _RequestsTab(
                  loading: _loadingRequests,
                  requests: _changeRequests,
                  appointments: _upcomingAppointments,
                  token: _token,
                  onRefresh: _loadRequests,
                  onSnack: _showSnack,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY TAB
// ─────────────────────────────────────────────────────────────────────────────

/// Unifies existing (server) schedules and locally staged pending adds/deletes
/// for display, mirroring WeeklyScheduleBuilder.jsx's `displaySchedules`.
class _DisplayRow {
  final int? scheduleId;
  final String? tempId;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final String? consultationType;
  final String? shiftType;
  final int slotDuration;
  final int maxPatients;
  final String? location;
  final bool isPending;
  final bool isMarkedForDeletion;

  const _DisplayRow({
    this.scheduleId,
    this.tempId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.consultationType,
    this.shiftType,
    required this.slotDuration,
    required this.maxPatients,
    this.location,
    this.isPending = false,
    this.isMarkedForDeletion = false,
  });
}

class _WeeklyTab extends StatefulWidget {
  final bool loading;
  final String? error;
  final DoctorScheduleData? data;
  final VoidCallback onRefresh;
  final String token;
  final void Function(String, {bool success}) onSnack;

  const _WeeklyTab({
    required this.loading,
    this.error,
    this.data,
    required this.onRefresh,
    required this.token,
    required this.onSnack,
  });

  @override
  State<_WeeklyTab> createState() => _WeeklyTabState();
}

class _WeeklyTabState extends State<_WeeklyTab> {
  final List<Map<String, dynamic>> _pendingAdds = []; // raw payloads + _tempId
  final Set<int> _pendingDeletes = {};
  bool _saving = false;
  bool _confirmingMonthly = false;
  int _tempCounter = 0;

  bool get _hasChanges => _pendingAdds.isNotEmpty || _pendingDeletes.isNotEmpty;

  List<_DisplayRow> get _displayRows {
    final schedules = widget.data?.schedules ?? [];
    final existing = schedules.map((s) => _DisplayRow(
          scheduleId: s.scheduleId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          consultationType: s.consultationType,
          shiftType: s.shiftType,
          slotDuration: s.slotDuration,
          maxPatients: s.maxPatients,
          location: s.location,
          isMarkedForDeletion: _pendingDeletes.contains(s.scheduleId),
        ));
    final pending = _pendingAdds.map((p) => _DisplayRow(
          tempId: p['_tempId'] as String,
          dayOfWeek: p['dayOfWeek'] as int,
          startTime: p['startTime'] as String,
          endTime: p['endTime'] as String,
          consultationType: p['consultationType'] as String?,
          shiftType: p['shiftType'] as String?,
          slotDuration: p['slotDuration'] as int,
          maxPatients: p['maxPatients'] as int,
          isPending: true,
        ));
    return [...existing, ...pending];
  }

  List<_DisplayRow> _rowsForDay(int dayOfWeek) =>
      _displayRows.where((r) => r.dayOfWeek == dayOfWeek).toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));

  void _addPending(List<Map<String, dynamic>> payloads) {
    setState(() {
      for (final p in payloads) {
        _pendingAdds.add({...p, '_tempId': 'temp_${++_tempCounter}'});
      }
    });
    widget.onSnack('${payloads.length} schedule(s) staged. Tap "Save All" to confirm.', success: false);
  }

  void _removeRow(_DisplayRow row) {
    if (row.isPending) {
      setState(() => _pendingAdds.removeWhere((p) => p['_tempId'] == row.tempId));
    } else {
      setState(() => _pendingDeletes.add(row.scheduleId!));
    }
  }

  void _undoDelete(int scheduleId) {
    setState(() => _pendingDeletes.remove(scheduleId));
  }

  void _discardChanges() {
    setState(() {
      _pendingAdds.clear();
      _pendingDeletes.clear();
    });
  }

  Future<void> _confirmAndSave() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Confirm Changes'),
        content: Text(
          'Are you sure you want to save these changes?\n\n'
          '${_pendingAdds.isNotEmpty ? '• ${_pendingAdds.length} schedule(s) will be added\n' : ''}'
          '${_pendingDeletes.isNotEmpty ? '• ${_pendingDeletes.length} schedule(s) will be deleted' : ''}',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes, Save Changes')),
        ],
      ),
    );
    if (ok != true) return;
    await _save();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      for (final scheduleId in _pendingDeletes.toList()) {
        try {
          await DoctorScheduleService.deleteSchedule(widget.token, scheduleId);
        } catch (e) {
          final msg = e.toString().replaceFirst('Exception: ', '');
          if (mounted) {
            if (msg.contains('future') || msg.contains('appointment') || msg.contains('booked')) {
              _showBlockedModal(msg);
            } else {
              widget.onSnack(msg);
            }
          }
          setState(() => _saving = false);
          return;
        }
      }
      for (final payload in _pendingAdds) {
        try {
          final data = Map<String, dynamic>.from(payload)..remove('_tempId');
          await DoctorScheduleService.createSchedule(widget.token, data);
        } catch (e) {
          if (mounted) widget.onSnack(e.toString().replaceFirst('Exception: ', ''));
          setState(() => _saving = false);
          return;
        }
      }
      setState(() {
        _pendingAdds.clear();
        _pendingDeletes.clear();
        _saving = false;
      });
      widget.onSnack('All changes saved successfully!', success: true);
      widget.onRefresh();
    } catch (_) {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showBlockedModal(String message) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Row(children: [
          Icon(Icons.event_busy, color: DS.destructive),
          SizedBox(width: 10),
          Expanded(child: Text('Cannot Delete Schedule')),
        ]),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(message),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(10)),
            child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(Icons.lightbulb_outline, size: 18, color: DS.primary),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'What to do: use "Request Change" in the Requests tab to ask admin to reschedule or transfer these appointments first.',
                  style: TextStyle(fontSize: 13, color: DS.mutedForeground),
                ),
              ),
            ]),
          ),
        ]),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: DS.primary, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context),
            child: const Text('Got It'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmMonthlySchedule() async {
    setState(() => _confirmingMonthly = true);
    try {
      await DoctorScheduleService.confirmMonthlySchedule(widget.token);
      widget.onSnack('Schedule confirmed for this month.', success: true);
      widget.onRefresh();
    } catch (e) {
      widget.onSnack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _confirmingMonthly = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) {
      return const Center(child: CircularProgressIndicator(color: DS.primary));
    }
    if (widget.error != null) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.error_outline, color: DS.destructive, size: 40),
          const SizedBox(height: 8),
          Text(widget.error!, style: const TextStyle(color: DS.destructive)),
          const SizedBox(height: 12),
          ElevatedButton.icon(
              onPressed: widget.onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again')),
        ]),
      );
    }

    final schedules = widget.data?.schedules ?? [];

    return Stack(
      children: [
        ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
          children: [
            _ScheduleStatusBanner(
              data: widget.data,
              confirming: _confirmingMonthly,
              onConfirm: _confirmMonthlySchedule,
            ),
            if (_hasChanges) ...[
              const SizedBox(height: 12),
              _PendingChangesBar(
                addCount: _pendingAdds.length,
                deleteCount: _pendingDeletes.length,
                saving: _saving,
                onDiscard: _discardChanges,
                onSave: _confirmAndSave,
              ),
            ],
            const SizedBox(height: 12),
            if (schedules.isEmpty && !_hasChanges)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 60),
                child: Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.calendar_today, size: 48, color: DS.mutedForeground.withValues(alpha:0.4)),
                    const SizedBox(height: 12),
                    const Text('No schedule set yet',
                        style: TextStyle(color: DS.mutedForeground, fontSize: 15)),
                    const SizedBox(height: 4),
                    const Text('Tap + to add your first working slot',
                        style: TextStyle(color: DS.mutedForeground, fontSize: 13)),
                  ]),
                ),
              )
            else
              ..._days.map((day) {
                final rows = _rowsForDay(day.index);
                if (rows.isEmpty) return const SizedBox.shrink();
                return _DayCard(day: day, rows: rows, onDelete: _removeRow, onUndo: _undoDelete);
              }),
          ],
        ),
        Positioned(
          right: 10,
          bottom: 10,
          child: FloatingActionButton.extended(
            backgroundColor: DS.primary,
            foregroundColor: Colors.white,
            onPressed: () => _showAddSheet(context),
            icon: const Icon(Icons.add),
            label: const Text('Add Slot'),
          ),
        ),
      ],
    );
  }

  void _showAddSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddScheduleSheet(
        daySchedulesForDay: _rowsForDay,
        onCreated: (payloads) {
          Navigator.pop(context);
          _addPending(payloads);
        },
      ),
    );
  }
}

class _ScheduleStatusBanner extends StatelessWidget {
  final DoctorScheduleData? data;
  final bool confirming;
  final VoidCallback onConfirm;

  const _ScheduleStatusBanner({required this.data, required this.confirming, required this.onConfirm});

  @override
  Widget build(BuildContext context) {
    final status = data?.doctorScheduleStatus ?? 'PENDING';
    final total = data?.totalMonthlyHours ?? 0;
    final required = data?.requiredMonthlyHours ?? 80;
    final needsReconfirm = data?.needsScheduleReconfirmation ?? false;

    final Color accent;
    final Color bg;
    final Color border;
    final String title;
    switch (status) {
      case 'APPROVED':
        accent = const Color(0xFF16A34A);
        bg = const Color(0xFFDCFCE7);
        border = const Color(0xFF86EFAC);
        title = 'Schedule Approved';
        break;
      case 'REJECTED':
        accent = const Color(0xFFDC2626);
        bg = const Color(0xFFFEF2F2);
        border = const Color(0xFFFCA5A5);
        title = 'Schedule Not Approved';
        break;
      default:
        accent = const Color(0xFFCA8A04);
        bg = const Color(0xFFFEFCE8);
        border = const Color(0xFFFDE047);
        title = 'Schedule Pending';
    }

    final meetsRequirement = total >= required;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: accent)),
              const SizedBox(height: 2),
              if (needsReconfirm)
                Text(
                  'Your schedule from last month carries over and still meets the ${required.toStringAsFixed(1)}h/month requirement — please reconfirm to stay visible to patients.',
                  style: TextStyle(fontSize: 12.5, color: accent.withValues(alpha: 0.9), height: 1.4),
                )
              else ...[
                Text.rich(
                  TextSpan(style: TextStyle(fontSize: 12.5, color: accent.withValues(alpha: 0.9), height: 1.4), children: [
                    const TextSpan(text: 'Total consultation hours this month: '),
                    TextSpan(text: '${total.toStringAsFixed(1)}h', style: const TextStyle(fontWeight: FontWeight.w700)),
                  ]),
                ),
                const SizedBox(height: 3),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(
                    child: Text(
                      meetsRequirement
                          ? 'Monthly working hours meet the requirement (${required.toStringAsFixed(1)}h/month)'
                          : 'Monthly working hours do not meet the requirement yet (${required.toStringAsFixed(1)}h/month, need ${(required - total).toStringAsFixed(1)}h more)',
                      style: TextStyle(fontSize: 12.5, color: accent.withValues(alpha: 0.9), height: 1.4),
                    ),
                  ),
                  if (meetsRequirement) ...[
                    const SizedBox(width: 4),
                    const Icon(Icons.check, size: 14, color: Color(0xFF16A34A)),
                  ],
                ]),
              ],
            ]),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 6, height: 6, decoration: BoxDecoration(color: accent, shape: BoxShape.circle)),
              const SizedBox(width: 6),
              Text(status, style: TextStyle(color: accent, fontSize: 11, fontWeight: FontWeight.w700)),
            ]),
          ),
          const Spacer(),
          if (needsReconfirm)
            ElevatedButton.icon(
              onPressed: confirming ? null : onConfirm,
              style: ElevatedButton.styleFrom(
                backgroundColor: DS.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                minimumSize: Size.zero,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: confirming
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.check_circle, size: 16),
              label: Text(confirming ? 'Confirming...' : 'Update Schedule', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
        ]),
      ]),
    );
  }
}

class _PendingChangesBar extends StatelessWidget {
  final int addCount;
  final int deleteCount;
  final bool saving;
  final VoidCallback onDiscard;
  final VoidCallback onSave;

  const _PendingChangesBar({
    required this.addCount,
    required this.deleteCount,
    required this.saving,
    required this.onDiscard,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF93C5FD)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.info_outline, size: 18, color: Color(0xFF1E40AF)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Unsaved changes: $addCount to add, $deleteCount to delete',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF)),
            ),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: saving ? null : onDiscard,
              style: OutlinedButton.styleFrom(
                foregroundColor: DS.mutedForeground,
                side: const BorderSide(color: DS.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Discard'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: saving ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: DS.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: saving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.save, size: 18),
              label: Text(saving ? 'Saving...' : 'Save All'),
            ),
          ),
        ]),
      ]),
    );
  }
}

class _DayCard extends StatelessWidget {
  final ({int index, String short, String label}) day;
  final List<_DisplayRow> rows;
  final void Function(_DisplayRow) onDelete;
  final void Function(int) onUndo;

  const _DayCard({required this.day, required this.rows, required this.onDelete, required this.onUndo});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: DS.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DS.cardBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: const BoxDecoration(
            color: Color(0xFFE6F4F4),
            borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
          ),
          child: Row(children: [
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: DS.primary, borderRadius: BorderRadius.circular(8)),
              child: Text(day.short,
                  style: const TextStyle(
                      color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(width: 10),
            Text(day.label,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: DS.foreground)),
            const Spacer(),
            Text('${rows.length} slot${rows.length != 1 ? 's' : ''}',
                style: const TextStyle(color: DS.mutedForeground, fontSize: 12)),
          ]),
        ),
        ...rows.map((r) => _SlotRow(row: r, onDelete: onDelete, onUndo: onUndo)),
      ]),
    );
  }
}

class _SlotRow extends StatelessWidget {
  final _DisplayRow row;
  final void Function(_DisplayRow) onDelete;
  final void Function(int) onUndo;

  const _SlotRow({required this.row, required this.onDelete, required this.onUndo});

  IconData get _typeIcon {
    if (_isHomeVisit(row.consultationType)) return Icons.home_outlined;
    switch ((row.consultationType ?? '').toUpperCase()) {
      case 'VIDEO': return Icons.videocam_outlined;
      case 'AUDIO': return Icons.call_outlined;
      case 'CHAT': return Icons.chat_bubble_outline;
      case 'OFFLINE': return Icons.local_hospital_outlined;
      default: return Icons.medical_services_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shift = row.shiftType;
    final homeVisit = _isHomeVisit(row.consultationType);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: row.isPending
            ? const Color(0xFFF0FDF4)
            : row.isMarkedForDeletion
                ? const Color(0xFFFEF2F2)
                : null,
        border: row.isPending
            ? Border.all(color: const Color(0xFF86EFAC), style: BorderStyle.solid)
            : row.isMarkedForDeletion
                ? Border.all(color: const Color(0xFFFCA5A5))
                : null,
      ),
      child: Row(children: [
        Icon(_typeIcon, size: 18, color: DS.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Text(
                  '${shift != null && homeVisit ? '${_shiftLabels[shift.toUpperCase()] ?? shift} · ' : ''}'
                  '${_fmtTime(row.startTime)} – ${_fmtTime(row.endTime)}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: DS.foreground),
                ),
              ),
              if (row.isPending) const _Badge(text: 'NEW', color: Color(0xFF16A34A)),
              if (row.isMarkedForDeletion) const _Badge(text: 'DELETING', color: Color(0xFFDC2626)),
            ]),
            const SizedBox(height: 2),
            Wrap(spacing: 6, children: [
              if (row.consultationType != null)
                _Chip(_typeLabels[row.consultationType!.toUpperCase()] ?? row.consultationType!),
              if (homeVisit)
                const _Chip('1 visit/shift')
              else ...[
                _Chip('${row.slotDuration}min'),
                _Chip('${row.maxPatients} pat/slot'),
              ],
              if (row.location != null) _Chip(row.location!),
            ]),
          ]),
        ),
        if (row.isMarkedForDeletion)
          IconButton(
            icon: const Icon(Icons.undo, size: 20, color: DS.primary),
            tooltip: 'Undo deletion',
            onPressed: () => onUndo(row.scheduleId!),
          )
        else
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 20, color: DS.destructive),
            onPressed: () => onDelete(row),
          ),
      ]),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(left: 6),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
        child: Text(text, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white)),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD SCHEDULE BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _AddScheduleSheet extends StatefulWidget {
  final List<_DisplayRow> Function(int) daySchedulesForDay;
  final void Function(List<Map<String, dynamic>>) onCreated;

  const _AddScheduleSheet({required this.daySchedulesForDay, required this.onCreated});

  @override
  State<_AddScheduleSheet> createState() => _AddScheduleSheetState();
}

class _AddScheduleSheetState extends State<_AddScheduleSheet> {
  static const _durations = [15, 20, 30, 45, 60];

  int _dayOfWeek = 1;
  String _kind = 'Online'; // 'Online' | 'HomeVisit'

  // Online fields
  TimeOfDay _start = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _end   = const TimeOfDay(hour: 10, minute: 0);
  int _slotDuration = 30;
  final int _onlineMaxPatients = 1;

  // HomeVisit fields
  final Set<String> _selectedShifts = {};
  int _homeVisitMaxPatients = 1;

  String? _error;

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  bool _fitsOneWindow(String start, String end) {
    final s = _toMinutes(start);
    final e = _toMinutes(end);
    return _shiftWindows.values.any((w) => s >= _toMinutes(w.start) && e <= _toMinutes(w.end));
  }

  int _minutesBetween(String start, String end) => _toMinutes(end) - _toMinutes(start);

  Set<String> get _usedShifts => widget
      .daySchedulesForDay(_dayOfWeek)
      .where((r) => _isHomeVisit(r.consultationType) && r.shiftType != null)
      .map((r) => r.shiftType!.toUpperCase())
      .toSet();

  _DisplayRow? _findOverlap(String start, String end) {
    for (final r in widget.daySchedulesForDay(_dayOfWeek)) {
      if (_rangesOverlap(start, end, r.startTime, r.endTime)) return r;
    }
    return null;
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _start : _end,
    );
    if (picked != null) setState(() => isStart ? _start = picked : _end = picked);
  }

  void _setError(String msg) => setState(() => _error = msg);

  void _save() {
    setState(() => _error = null);

    if (_kind == 'HomeVisit') {
      if (_selectedShifts.isEmpty) {
        _setError('Please select at least one shift');
        return;
      }
      if (_homeVisitMaxPatients < 1 || _homeVisitMaxPatients > 2) {
        _setError('Max patients per slot for home visit must be between 1 and 2');
        return;
      }
      final payloads = <Map<String, dynamic>>[];
      for (final key in _shiftOrder.where(_selectedShifts.contains)) {
        final w = _shiftWindows[key]!;
        final clash = _findOverlap(w.start, w.end);
        if (clash != null) {
          _setError('The ${w.label} shift (${w.start}–${w.end}) overlaps an existing schedule (${_fmtTime(clash.startTime)}–${_fmtTime(clash.endTime)}) on this day.');
          return;
        }
        payloads.add({
          'dayOfWeek': _dayOfWeek,
          'consultationType': 'HomeVisit',
          'shiftType': key,
          'startTime': w.start,
          'endTime': w.end,
          'slotDuration': _minutesBetween(w.start, w.end),
          'maxPatients': _homeVisitMaxPatients,
        });
      }
      widget.onCreated(payloads);
      return;
    }

    // Online
    final startStr = _fmt(_start);
    final endStr   = _fmt(_end);
    if (_toMinutes(startStr) >= _toMinutes(endStr)) {
      _setError('End time must be after start time');
      return;
    }
    if (!_fitsOneWindow(startStr, endStr)) {
      _setError('Hours must fit within one shift:\nMorning 07:00–10:30  ·  Afternoon 13:00–17:30  ·  Evening 19:00–21:00');
      return;
    }
    if (_slotDuration < 10 || _slotDuration > 120) {
      _setError('Slot duration must be 10–120 minutes');
      return;
    }
    final clash = _findOverlap(startStr, endStr);
    if (clash != null) {
      _setError('This time range ($startStr–$endStr) overlaps an existing schedule (${_fmtTime(clash.startTime)}–${_fmtTime(clash.endTime)}) on this day.');
      return;
    }
    widget.onCreated([{
      'dayOfWeek': _dayOfWeek,
      'consultationType': 'Online',
      'shiftType': null,
      'startTime': startStr,
      'endTime': endStr,
      'slotDuration': _slotDuration,
      'maxPatients': _onlineMaxPatients,
    }]);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 16),
            decoration: BoxDecoration(color: DS.border, borderRadius: BorderRadius.circular(2)),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Row(children: [
              Icon(Icons.add_circle_outline, color: DS.primary),
              SizedBox(width: 8),
              Text('Add Schedule Slot',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: DS.foreground)),
            ]),
          ),
          const Divider(height: 20),
          Expanded(
            child: ListView(controller: ctrl, padding: const EdgeInsets.symmetric(horizontal: 20), children: [

              // Day of week
              _Label('Day of Week'),
              DropdownButtonFormField<int>(
                initialValue: _dayOfWeek,
                decoration: _inputDecor(),
                items: _days.map((d) => DropdownMenuItem(value: d.index, child: Text(d.label))).toList(),
                onChanged: (v) => setState(() => _dayOfWeek = v!),
              ),
              const SizedBox(height: 14),

              // Kind toggle: Online / HomeVisit
              _Label('Consultation Type'),
              Row(children: [
                _KindChip(label: 'Online', selected: _kind == 'Online', onTap: () => setState(() { _kind = 'Online'; _error = null; })),
                const SizedBox(width: 10),
                _KindChip(label: 'Home Visit', selected: _kind == 'HomeVisit', onTap: () => setState(() { _kind = 'HomeVisit'; _error = null; })),
              ]),
              const SizedBox(height: 14),

              if (_kind == 'Online') ...[
                // Shift hint
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: DS.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: DS.primary.withValues(alpha: 0.18)),
                  ),
                  child: const Text(
                    'Hours must fit within one shift window:\nMorning 07:00–10:30  ·  Afternoon 13:00–17:30  ·  Evening 19:00–21:00',
                    style: TextStyle(fontSize: 12, color: DS.primary, height: 1.5),
                  ),
                ),

                Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _Label('Start Time'),
                    _TimeButton(time: _start, onTap: () => _pickTime(true)),
                  ])),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _Label('End Time'),
                    _TimeButton(time: _end, onTap: () => _pickTime(false)),
                  ])),
                ]),
                const SizedBox(height: 14),

                Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _Label('Slot Duration'),
                    DropdownButtonFormField<int>(
                      initialValue: _slotDuration,
                      decoration: _inputDecor(),
                      items: _durations.map((d) => DropdownMenuItem(value: d, child: Text('$d min'))).toList(),
                      onChanged: (v) => setState(() => _slotDuration = v!),
                    ),
                  ])),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _Label('Max Patients / Slot'),
                    TextFormField(
                      enabled: false,
                      initialValue: '1',
                      decoration: _inputDecor(hint: 'Online is limited to 1'),
                    ),
                  ])),
                ]),
              ] else ...[
                // HomeVisit: shift selection
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFED7AA)),
                  ),
                  child: const Text(
                    'Home visits take travel time. Plan shifts carefully so a morning home visit '
                    'running late does not overlap an afternoon appointment.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF92400E), height: 1.5),
                  ),
                ),
                _Label('Select Shifts'),
                Column(
                  children: _shiftOrder.map((key) {
                    final w = _shiftWindows[key]!;
                    final selected = _selectedShifts.contains(key);
                    final disabled = _usedShifts.contains(key);
                    return GestureDetector(
                      onTap: disabled
                          ? null
                          : () => setState(() => selected ? _selectedShifts.remove(key) : _selectedShifts.add(key)),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: disabled ? DS.secondary : (selected ? DS.primary.withValues(alpha: 0.08) : Colors.white),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: selected ? DS.primary : DS.border, width: selected ? 1.5 : 1),
                        ),
                        child: Row(children: [
                          Icon(
                            disabled ? Icons.block : (selected ? Icons.check_circle : Icons.radio_button_unchecked),
                            size: 18,
                            color: disabled ? DS.mutedForeground : (selected ? DS.primary : DS.mutedForeground),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(w.label,
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500,
                                  color: disabled ? DS.mutedForeground : (selected ? DS.primary : DS.foreground)))),
                          Text(disabled ? 'Already added' : '${w.start} – ${w.end}',
                              style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                _Label('Max Patients / Slot (1–2)'),
                TextFormField(
                  initialValue: '$_homeVisitMaxPatients',
                  keyboardType: TextInputType.number,
                  decoration: _inputDecor(hint: '1 or 2'),
                  onChanged: (v) {
                    final n = int.tryParse(v);
                    if (n != null) setState(() => _homeVisitMaxPatients = n);
                  },
                ),
              ],

              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: DS.destructive.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: DS.destructive.withValues(alpha: 0.3)),
                  ),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(Icons.error_outline, size: 16, color: DS.destructive),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(fontSize: 13, color: DS.destructive, height: 1.4))),
                  ]),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: DS.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  onPressed: _save,
                  child: const Text("Add Schedule", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                ),
              ),
              const SizedBox(height: 16),
            ]),
          ),
        ]),
      ),
    );
  }

  InputDecoration _inputDecor({String? hint}) => InputDecoration(
        hintText: hint,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.border)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.border)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.primary, width: 1.5)),
        filled: true,
        fillColor: Colors.white,
      );
}

// ─────────────────────────────────────────────────────────────────────────────

class _SuccessPopup extends StatefulWidget {
  final String message;
  const _SuccessPopup({required this.message});

  @override
  State<_SuccessPopup> createState() => _SuccessPopupState();
}

class _SuccessPopupState extends State<_SuccessPopup>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _scale = CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut);
    _fade  = CurvedAnimation(parent: _ctrl, curve: Curves.easeIn);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: ScaleTransition(
          scale: _scale,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 24, offset: const Offset(0, 8)),
              ],
            ),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  color: DS.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded, color: DS.primary, size: 36),
              ),
              const SizedBox(height: 16),
              Text(widget.message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
              const SizedBox(height: 6),
              const Text('Successfully', textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
            ]),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _KindChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _KindChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? DS.primary : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? DS.primary : DS.border, width: selected ? 1.5 : 1),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w600,
                color: selected ? Colors.white : DS.mutedForeground)),
      ),
    );
  }
}

class _TimeButton extends StatelessWidget {
  final TimeOfDay time;
  final VoidCallback onTap;
  const _TimeButton({required this.time, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final h = time.hour.toString().padLeft(2, '0');
    final m = time.minute.toString().padLeft(2, '0');
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: DS.border),
          borderRadius: BorderRadius.circular(10),
          color: Colors.white,
        ),
        child: Row(children: [
          const Icon(Icons.access_time, size: 16, color: DS.primary),
          const SizedBox(width: 8),
          Text('$h:$m', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR TAB
// ─────────────────────────────────────────────────────────────────────────────

class _CalendarTab extends StatefulWidget {
  final bool loading;
  final List<CalendarDay> days;
  final List<DoctorScheduleException> exceptions;
  final DateTime month;
  final void Function(DateTime) onMonthChanged;
  final String token;
  final void Function(String, {bool success}) onSnack;
  final VoidCallback onDataChanged;

  const _CalendarTab({
    required this.loading,
    required this.days,
    required this.exceptions,
    required this.month,
    required this.onMonthChanged,
    required this.token,
    required this.onSnack,
    required this.onDataChanged,
  });

  @override
  State<_CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<_CalendarTab> {
  int? _deletingExceptionId;

  CalendarDay? _dayData(DateTime date) {
    final key = DateFormat('yyyy-MM-dd').format(date);
    try { return widget.days.firstWhere((d) => d.date == key); } catch (_) { return null; }
  }

  bool _isFutureDate(DateTime date) {
    final today = DateTime.now();
    final todayMidnight = DateTime(today.year, today.month, today.day);
    return date.isAfter(todayMidnight);
  }

  Color _dotColor(CalendarDay day) {
    if (day.status == 'DAY_OFF') return DS.destructive;
    switch (day.visitTypeClass) {
      case 'online': return const Color(0xFF0EA5E9);
      case 'homevisit': return const Color(0xFFF97316);
      case 'mixed': return const Color(0xFF8B5CF6);
      default:
        return day.status == 'MODIFIED' ? const Color(0xFFF59E0B) : DS.border;
    }
  }

  List<DoctorScheduleException> get _upcomingExceptions {
    final now = DateTime.now();
    final list = widget.exceptions.where((e) {
      final d = DateTime.tryParse(e.exceptionDate);
      return d != null && !d.isBefore(DateTime(now.year, now.month, now.day));
    }).toList()
      ..sort((a, b) => a.exceptionDate.compareTo(b.exceptionDate));
    return list.take(5).toList();
  }

  Future<void> _deleteException(DoctorScheduleException exception) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Exception'),
        content: const Text('Are you sure you want to delete this exception?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: DS.destructive))),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _deletingExceptionId = exception.exceptionId);
    try {
      await DoctorScheduleService.deleteException(widget.token, exception.exceptionId);
      widget.onSnack('Exception deleted successfully', success: true);
      widget.onDataChanged();
    } catch (e) {
      widget.onSnack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _deletingExceptionId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Month navigator
      Container(
        color: DS.card,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => widget.onMonthChanged(DateTime(widget.month.year, widget.month.month - 1)),
          ),
          Expanded(
            child: Text(
              DateFormat('MMMM yyyy').format(widget.month),
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => widget.onMonthChanged(DateTime(widget.month.year, widget.month.month + 1)),
          ),
        ]),
      ),
      if (widget.loading) const LinearProgressIndicator(color: DS.primary),
      Expanded(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Container(
              color: DS.card,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Row(
                children: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    .map((d) => Expanded(
                          child: Text(d,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.w600, color: DS.mutedForeground)),
                        ))
                    .toList(),
              ),
            ),
            const Divider(height: 1),
            _buildGrid(context),
            // Legend
            Container(
              color: DS.card,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Wrap(spacing: 14, runSpacing: 8, alignment: WrapAlignment.center, children: [
                _Legend(color: const Color(0xFF0EA5E9), label: 'Online'),
                _Legend(color: const Color(0xFFF97316), label: 'Home Visit'),
                _Legend(color: const Color(0xFF8B5CF6), label: 'Online + Home Visit'),
                _Legend(color: DS.destructive, label: 'Day Off'),
                _Legend(color: DS.border, label: 'No Schedule'),
              ]),
            ),
            const Divider(height: 1),
            _UpcomingExceptionsPanel(
              exceptions: _upcomingExceptions,
              deletingId: _deletingExceptionId,
              onDelete: _deleteException,
            ),
          ],
        ),
      ),
    ]);
  }

  Widget _buildGrid(BuildContext context) {
    final month = widget.month;
    final firstDay = DateTime(month.year, month.month, 1);
    int offset = firstDay.weekday - 1; // weekday: 1=Mon
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final total = offset + daysInMonth;
    final rows = (total / 7).ceil();

    return GridView.builder(
      padding: const EdgeInsets.all(8),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 7, crossAxisSpacing: 4, mainAxisSpacing: 4, childAspectRatio: 0.9),
      itemCount: rows * 7,
      itemBuilder: (_, idx) {
        final dayNum = idx - offset + 1;
        if (dayNum < 1 || dayNum > daysInMonth) return const SizedBox.shrink();
        final date = DateTime(month.year, month.month, dayNum);
        final data = _dayData(date);
        final isToday = DateUtils.isSameDay(date, DateTime.now());
        return GestureDetector(
          onTap: data != null ? () => _showDayDetail(context, date, data) : null,
          child: Container(
            decoration: BoxDecoration(
              color: isToday ? const Color(0xFFE6F4F4) : Colors.white,
              border: Border.all(
                  color: isToday ? DS.primary : DS.border,
                  width: isToday ? 1.5 : 1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Stack(children: [
              Center(
                child: Text('$dayNum',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: isToday ? FontWeight.w700 : FontWeight.w400,
                        color: isToday ? DS.primary : DS.foreground)),
              ),
              if (data != null)
                Positioned(
                  bottom: 4,
                  right: 4,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                        color: _dotColor(data),
                        shape: BoxShape.circle),
                  ),
                ),
            ]),
          ),
        );
      },
    );
  }

  void _showDayDetail(BuildContext context, DateTime date, CalendarDay data) {
    final statusColor = _dotColor(data);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(DateFormat('EEEE, MMM d yyyy').format(date),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                    color: statusColor.withValues(alpha:0.12),
                    borderRadius: BorderRadius.circular(20)),
                child: Text(data.status,
                    style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ]),
            if (data.visitTypeLabel.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                child: Text(data.visitTypeLabel, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ],
            const SizedBox(height: 12),
            if (data.scheduleBlocks.isEmpty)
              const Text('No scheduled slots for this day.',
                  style: TextStyle(color: DS.mutedForeground))
            else
              ...data.scheduleBlocks.map((b) {
                final homeVisit = _isHomeVisit(b.consultationType);
                final shiftPrefix = homeVisit && b.shiftType != null
                    ? '${_shiftLabels[b.shiftType!.toUpperCase()] ?? b.shiftType} · '
                    : '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(children: [
                    Icon(homeVisit ? Icons.home_outlined : Icons.laptop_mac, size: 16, color: DS.primary),
                    const SizedBox(width: 8),
                    Text('$shiftPrefix${_fmtTime(b.startTime)} – ${_fmtTime(b.endTime)}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  ]),
                );
              }),
            if (data.slots.any((s) => s.status == 'BOOKED')) ...[
              const SizedBox(height: 14),
              const Text('Booked Appointments', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: DS.foreground)),
              const SizedBox(height: 6),
              ...data.slots.where((s) => s.status == 'BOOKED').map((s) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(children: [
                      const Icon(Icons.person_outline, size: 14, color: DS.mutedForeground),
                      const SizedBox(width: 6),
                      Text('${_fmtTime(s.startTime)} – ${_fmtTime(s.endTime)}',
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500)),
                      const SizedBox(width: 6),
                      Expanded(child: Text(s.patientName ?? 'Patient', style: const TextStyle(fontSize: 12.5, color: DS.mutedForeground))),
                    ]),
                  )),
            ],
            if (data.status == 'WORKING' && _isFutureDate(date)) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                      foregroundColor: DS.destructive,
                      side: const BorderSide(color: DS.destructive),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  onPressed: () => _handleMarkDayOff(context, date),
                  icon: const Icon(Icons.block, size: 18),
                  label: const Text('Mark as Day Off', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Only blocks new bookings from now on — it will not cancel appointments patients already booked for this date.',
                style: TextStyle(fontSize: 11, color: DS.mutedForeground, height: 1.4),
              ),
            ],
            const SizedBox(height: 8),
          ]),
        ),
      ),
    );
  }

  Future<void> _handleMarkDayOff(BuildContext context, DateTime date) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Mark as Day Off'),
        content: const Text(
          'Marking this date as a day off only blocks NEW bookings from now on.\n\n'
          'It will NOT cancel appointments patients already booked for this date — '
          'you still need to see them, or cancel/reschedule those appointments yourself.\n\n'
          'Continue?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Continue')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final reason = await showDialog<String>(
      context: context,
      builder: (_) => const _DayOffReasonDialog(),
    );
    if (reason == null) return; // user cancelled
    if (reason.trim().isEmpty) {
      widget.onSnack('A reason is required to register a day off');
      return;
    }
    if (!context.mounted) return;

    try {
      final fmt = DateFormat('yyyy-MM-dd');
      await DoctorScheduleService.createDayOff(widget.token, fmt.format(date), reason.trim());
      if (context.mounted) Navigator.of(context).pop(); // close day-detail sheet
      widget.onSnack('Day off registered successfully', success: true);
      widget.onDataChanged();
    } catch (e) {
      widget.onSnack(e.toString().replaceAll('Exception: ', ''));
    }
  }
}

class _UpcomingExceptionsPanel extends StatelessWidget {
  final List<DoctorScheduleException> exceptions;
  final int? deletingId;
  final void Function(DoctorScheduleException) onDelete;

  const _UpcomingExceptionsPanel({required this.exceptions, required this.deletingId, required this.onDelete});

  Color _accent(String type) {
    switch (type) {
      case 'DayOff': return DS.destructive;
      case 'Modified': return const Color(0xFFF59E0B);
      default: return DS.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: DS.card,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.event_note, size: 18, color: DS.primary),
          const SizedBox(width: 8),
          const Text('Upcoming Exceptions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: DS.foreground)),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(12)),
            child: Text('${exceptions.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: DS.mutedForeground)),
          ),
        ]),
        const SizedBox(height: 10),
        if (exceptions.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text('No upcoming exceptions', style: TextStyle(color: DS.mutedForeground, fontSize: 13)),
          )
        else
          ...exceptions.map((e) {
            final accent = _accent(e.exceptionType);
            final date = DateTime.tryParse(e.exceptionDate);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: DS.background,
                borderRadius: BorderRadius.circular(10),
                border: Border(left: BorderSide(color: accent, width: 3)),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text(date != null ? DateFormat('EEE, MMM d').format(date) : e.exceptionDate,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: DS.foreground)),
                      const SizedBox(width: 8),
                      Text(e.exceptionType == 'AddSlot' ? 'Extra Slot' : e.exceptionType,
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: accent)),
                    ]),
                    if ((e.reason ?? '').isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(children: [
                        Expanded(child: Text(e.reason!, style: const TextStyle(fontSize: 12.5, color: DS.mutedForeground))),
                        if (e.adminCreated) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(4)),
                            child: const Text('Admin', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: DS.mutedForeground)),
                          ),
                        ],
                      ]),
                    ],
                    if (e.startTime != null && e.endTime != null) ...[
                      const SizedBox(height: 4),
                      Text('${_fmtTime(e.startTime)} - ${_fmtTime(e.endTime)}',
                          style: const TextStyle(fontSize: 11.5, color: DS.mutedForeground)),
                    ],
                  ]),
                ),
                if (!e.adminCreated)
                  IconButton(
                    icon: deletingId == e.exceptionId
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: DS.destructive))
                        : const Icon(Icons.delete_outline, size: 18, color: DS.destructive),
                    onPressed: deletingId == e.exceptionId ? null : () => onDelete(e),
                  ),
              ]),
            );
          }),
      ]),
    );
  }
}

class _DayOffReasonDialog extends StatefulWidget {
  const _DayOffReasonDialog();

  @override
  State<_DayOffReasonDialog> createState() => _DayOffReasonDialogState();
}

class _DayOffReasonDialogState extends State<_DayOffReasonDialog> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Reason for this day off'),
      content: TextField(
        controller: _ctrl,
        autofocus: true,
        maxLines: 3,
        decoration: const InputDecoration(
          hintText: 'e.g. Personal leave, conference, sick leave...',
          border: OutlineInputBorder(),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        TextButton(
          onPressed: () => Navigator.pop(context, _ctrl.text),
          child: const Text('Confirm'),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE REQUESTS TAB
// ─────────────────────────────────────────────────────────────────────────────

class _RequestsTab extends StatefulWidget {
  final bool loading;
  final List<ScheduleChangeRequest> requests;
  final List<DoctorAppointment> appointments;
  final String token;
  final VoidCallback onRefresh;
  final void Function(String, {bool success}) onSnack;

  const _RequestsTab({
    required this.loading,
    required this.requests,
    required this.appointments,
    required this.token,
    required this.onRefresh,
    required this.onSnack,
  });

  @override
  State<_RequestsTab> createState() => _RequestsTabState();
}

class _RequestsTabState extends State<_RequestsTab> {
  int? _selectedApptId;
  final _reasonCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedApptId == null) {
      widget.onSnack('Please select an appointment');
      return;
    }
    if (_reasonCtrl.text.trim().isEmpty) {
      widget.onSnack('Please enter a reason');
      return;
    }
    setState(() => _submitting = true);
    try {
      await DoctorScheduleService.createChangeRequest(
          widget.token, _selectedApptId!, _reasonCtrl.text.trim());
      setState(() { _selectedApptId = null; _reasonCtrl.clear(); _submitting = false; });
      widget.onRefresh();
      widget.onSnack('Change request sent to admin', success: true);
    } catch (e) {
      setState(() => _submitting = false);
      widget.onSnack(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      // Create request form
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: DS.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: DS.cardBorder),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Row(children: [
            Icon(Icons.swap_horiz, color: DS.primary, size: 18),
            SizedBox(width: 8),
            Text('Request Schedule Change',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: DS.foreground)),
          ]),
          const SizedBox(height: 4),
          const Text('Select an upcoming appointment and provide a reason to notify the admin.',
              style: TextStyle(color: DS.mutedForeground, fontSize: 12)),
          const SizedBox(height: 14),
          _Label('Appointment'),
          widget.appointments.isEmpty
              ? const Text('No upcoming scheduled appointments.',
                  style: TextStyle(color: DS.mutedForeground, fontSize: 13))
              : DropdownButtonFormField<int>(
                  initialValue: _selectedApptId,
                  hint: const Text('Select appointment'),
                  decoration: _inputDecor(),
                  items: widget.appointments.map((a) {
                    final t = a.appointmentTime;
                    final label = t != null
                        ? DateFormat('EEE, MMM d · HH:mm').format(t)
                        : 'Appointment #${a.appointmentId}';
                    return DropdownMenuItem(value: a.appointmentId, child: Text(label, style: const TextStyle(fontSize: 13)));
                  }).toList(),
                  onChanged: (v) => setState(() => _selectedApptId = v),
                ),
          const SizedBox(height: 12),
          _Label('Reason'),
          TextFormField(
            controller: _reasonCtrl,
            maxLines: 3,
            decoration: _inputDecor(hint: 'Explain why you need to change the schedule...'),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: DS.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      width: 18, height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Submit Request', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ]),
      ),
      const SizedBox(height: 20),
      Row(children: [
        const Text('My Requests',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: DS.foreground)),
        const Spacer(),
        if (widget.loading)
          const SizedBox(
              width: 16, height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary)),
      ]),
      const SizedBox(height: 10),
      if (!widget.loading && widget.requests.isEmpty)
        const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('No change requests yet.',
                style: TextStyle(color: DS.mutedForeground)),
          ),
        )
      else
        ...widget.requests.map((r) => _RequestCard(r: r)),
    ]);
  }

  InputDecoration _inputDecor({String? hint}) => InputDecoration(
        hintText: hint,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: DS.primary, width: 1.5)),
        filled: true,
        fillColor: Colors.white,
      );
}

class _RequestCard extends StatelessWidget {
  final ScheduleChangeRequest r;
  const _RequestCard({required this.r});

  Color get _statusColor {
    switch (r.status.toUpperCase()) {
      case 'APPROVED': return const Color(0xFF10B981);
      case 'REJECTED': return DS.destructive;
      default: return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DS.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DS.cardBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('Appointment #${r.appointmentId}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: DS.foreground)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: _statusColor.withValues(alpha:0.12),
                borderRadius: BorderRadius.circular(20)),
            child: Text(r.status,
                style: TextStyle(color: _statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
        ]),
        if (r.appointmentTime != null) ...[
          const SizedBox(height: 4),
          Text(DateFormat('EEE, MMM d yyyy · HH:mm').format(r.appointmentTime!),
              style: const TextStyle(color: DS.mutedForeground, fontSize: 12)),
        ],
        const SizedBox(height: 6),
        Text(r.reason, style: const TextStyle(fontSize: 13, color: DS.foreground)),
        if ((r.adminReason ?? '').isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(8)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.info_outline, size: 14, color: DS.mutedForeground),
              const SizedBox(width: 6),
              Expanded(child: Text('Admin: ${r.adminReason}', style: const TextStyle(fontSize: 12, color: DS.mutedForeground))),
            ]),
          ),
        ],
        if (r.createdAt != null) ...[
          const SizedBox(height: 4),
          Text('Submitted: ${DateFormat('MMM d, HH:mm').format(r.createdAt!)}',
              style: const TextStyle(color: DS.mutedForeground, fontSize: 11)),
        ],
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: const TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600,
                color: DS.mutedForeground, letterSpacing: 0.4)),
      );
}

class _Chip extends StatelessWidget {
  final String label;
  const _Chip(this.label);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
            color: DS.secondary,
            borderRadius: BorderRadius.circular(12)),
        child: Text(label,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: DS.mutedForeground)),
      );
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;
  const _Legend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 11, color: DS.mutedForeground)),
      ]);
}
