import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/doctor_theme.dart';
import '../../providers/auth_provider.dart';
import '../../models/doctor/doctor_schedule.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../services/doctor/doctor_schedule_service.dart';
import '../../services/doctor/doctor_service.dart';

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
};

String _fmtTime(String? t) {
  if (t == null || t.isEmpty) return '';
  final p = t.split(':');
  return '${p[0].padLeft(2, '0')}:${(p.length > 1 ? p[1] : '00').padLeft(2, '0')}';
}

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

  ComplianceStatus? _compliance;
  bool _loadingCompliance = true;

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
    _loadCompliance();
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

  Future<void> _loadCompliance() async {
    setState(() => _loadingCompliance = true);
    try {
      final c = await DoctorScheduleService.getComplianceStatus(_token);
      if (mounted) setState(() { _compliance = c; _loadingCompliance = false; });
    } catch (e) {
      debugPrint('[Compliance] schedule screen load failed: $e');
      if (mounted) setState(() { _loadingCompliance = false; });
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

  Future<void> _deleteSchedule(int id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Schedule'),
        content: const Text('Remove this schedule slot?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete', style: TextStyle(color: DS.destructive))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await DoctorScheduleService.deleteSchedule(_token, id);
      _loadAll();
      _loadCompliance();
      widget.onScheduleSaved?.call();
      if (mounted) _showSnack('Schedule deleted', success: true);
    } catch (e) {
      if (mounted) _showSnack(e.toString());
    }
  }

  void _showSnack(String msg, {bool success = false}) {
    if (success) {
      _showSuccessPopup(msg);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        backgroundColor: DS.destructive,
      ));
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
          if (_loadingCompliance || (_compliance != null && _compliance!.status != 'COMPLIANT' && _compliance!.status != 'EXEMPTED'))
            _ComplianceWarning(compliance: _compliance, loading: _loadingCompliance),
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
            onDelete: _deleteSchedule,
            onRefresh: _loadAll,
            onScheduleSaved: () {
              _loadCompliance();
              widget.onScheduleSaved?.call();
            },
            token: _token,
            onSnack: _showSnack,
          ),
          _CalendarTab(
            loading: _loadingCalendar,
            days: _calendarDays,
            month: _calendarMonth,
            onMonthChanged: (m) {
              setState(() => _calendarMonth = m);
              _loadCalendar();
            },
            token: _token,
            onSnack: _showSnack,
            onDayOffCreated: () {
              _loadCalendar();
              _loadAll();
              _loadCompliance();
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

class _WeeklyTab extends StatelessWidget {
  final bool loading;
  final String? error;
  final DoctorScheduleData? data;
  final void Function(int) onDelete;
  final VoidCallback onRefresh;
  final VoidCallback? onScheduleSaved;
  final String token;
  final void Function(String, {bool success}) onSnack;

  const _WeeklyTab({
    required this.loading,
    this.error,
    this.data,
    required this.onDelete,
    required this.onRefresh,
    this.onScheduleSaved,
    required this.token,
    required this.onSnack,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator(color: DS.primary));
    }
    if (error != null) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.error_outline, color: DS.destructive, size: 40),
          const SizedBox(height: 8),
          Text(error!, style: const TextStyle(color: DS.destructive)),
          const SizedBox(height: 12),
          ElevatedButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again')),
        ]),
      );
    }

    final schedules = data?.schedules ?? [];
    // Group by dayOfWeek
    final Map<int, List<DoctorScheduleEntry>> byDay = {};
    for (final s in schedules) {
      byDay.putIfAbsent(s.dayOfWeek, () => []).add(s);
    }

    return Stack(
      children: [
        schedules.isEmpty
            ? Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.calendar_today, size: 48, color: DS.mutedForeground.withValues(alpha:0.4)),
                  const SizedBox(height: 12),
                  const Text('No schedule set yet',
                      style: TextStyle(color: DS.mutedForeground, fontSize: 15)),
                  const SizedBox(height: 4),
                  const Text('Tap + to add your first working slot',
                      style: TextStyle(color: DS.mutedForeground, fontSize: 13)),
                ]),
              )
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                itemCount: _days.length,
                itemBuilder: (_, i) {
                  final day = _days[i];
                  final slots = byDay[day.index] ?? [];
                  if (slots.isEmpty) return const SizedBox.shrink();
                  return _DayCard(day: day, slots: slots, onDelete: onDelete);
                },
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
        token: token,
        onSaved: () {
          Navigator.pop(context);
          onRefresh();
          onScheduleSaved?.call();
          onSnack('Schedule slot added', success: true);
        },
        onError: (msg) => onSnack(msg),
      ),
    );
  }
}

class _DayCard extends StatelessWidget {
  final ({int index, String short, String label}) day;
  final List<DoctorScheduleEntry> slots;
  final void Function(int) onDelete;

  const _DayCard({required this.day, required this.slots, required this.onDelete});

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
            Text('${slots.length} slot${slots.length != 1 ? 's' : ''}',
                style: const TextStyle(color: DS.mutedForeground, fontSize: 12)),
          ]),
        ),
        ...slots.map((s) => _SlotRow(slot: s, onDelete: onDelete)),
      ]),
    );
  }
}

class _SlotRow extends StatelessWidget {
  final DoctorScheduleEntry slot;
  final void Function(int) onDelete;

  const _SlotRow({required this.slot, required this.onDelete});

  IconData get _typeIcon {
    switch ((slot.consultationType ?? '').toUpperCase()) {
      case 'VIDEO': return Icons.videocam_outlined;
      case 'AUDIO': return Icons.call_outlined;
      case 'CHAT': return Icons.chat_bubble_outline;
      case 'OFFLINE': return Icons.local_hospital_outlined;
      case 'HOMEVISIT': return Icons.home_outlined;
      default: return Icons.medical_services_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shift = slot.shift;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(children: [
        Icon(_typeIcon, size: 18, color: DS.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              '${_fmtTime(slot.startTime)} – ${_fmtTime(slot.endTime)}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: DS.foreground),
            ),
            const SizedBox(height: 2),
            Wrap(spacing: 6, children: [
              if (slot.consultationType != null)
                _Chip(_typeLabels[slot.consultationType!.toUpperCase()] ?? slot.consultationType!),
              if (shift != null) _Chip(shift[0] + shift.substring(1).toLowerCase()),
              _Chip('${slot.slotDuration}min · ${slot.maxPatientsPerSlot}p'),
            ]),
          ]),
        ),
        IconButton(
          icon: const Icon(Icons.delete_outline, size: 20, color: DS.destructive),
          onPressed: () => onDelete(slot.scheduleId),
        ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD SCHEDULE BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────

class _AddScheduleSheet extends StatefulWidget {
  final String token;
  final VoidCallback onSaved;
  final void Function(String) onError;

  const _AddScheduleSheet({required this.token, required this.onSaved, required this.onError});

  @override
  State<_AddScheduleSheet> createState() => _AddScheduleSheetState();
}

class _AddScheduleSheetState extends State<_AddScheduleSheet> {
  // Shift windows khớp với backend & web
  static const _shiftWindows = {
    'MORNING':   (label: 'Morning',   start: '07:00', end: '10:30'),
    'AFTERNOON': (label: 'Afternoon', start: '13:00', end: '17:30'),
    'EVENING':   (label: 'Evening',   start: '19:00', end: '21:00'),
  };
  static const _shiftOrder = ['MORNING', 'AFTERNOON', 'EVENING'];
  static const _durations = [15, 20, 30, 45, 60];

  int _dayOfWeek = 1;
  String _kind = 'Online'; // 'Online' | 'HomeVisit'

  // Online fields
  TimeOfDay _start = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _end   = const TimeOfDay(hour: 10, minute: 0);
  int _slotDuration = 30;
  int _maxPatients  = 1;

  // HomeVisit fields
  final Set<String> _selectedShifts = {};

  bool _saving = false;
  String? _error;

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  int _toMinutes(String hhmm) {
    final p = hhmm.split(':').map(int.parse).toList();
    return p[0] * 60 + p[1];
  }

  bool _fitsOneWindow(String start, String end) {
    final s = _toMinutes(start);
    final e = _toMinutes(end);
    return _shiftWindows.values.any((w) => s >= _toMinutes(w.start) && e <= _toMinutes(w.end));
  }

  int _minutesBetween(String start, String end) {
    final sp = start.split(':').map(int.parse).toList();
    final ep = end.split(':').map(int.parse).toList();
    return (ep[0] * 60 + ep[1]) - (sp[0] * 60 + sp[1]);
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _start : _end,
    );
    if (picked != null) setState(() => isStart ? _start = picked : _end = picked);
  }

  void _setError(String msg) => setState(() { _error = msg; _saving = false; });

  Future<void> _save() async {
    setState(() => _error = null);

    if (_kind == 'HomeVisit') {
      if (_selectedShifts.isEmpty) {
        _setError('Please select at least one shift');
        return;
      }
      setState(() => _saving = true);
      try {
        for (final key in _shiftOrder.where(_selectedShifts.contains)) {
          final w = _shiftWindows[key]!;
          await DoctorScheduleService.createSchedule(widget.token, {
            'dayOfWeek': _dayOfWeek,
            'consultationType': 'HomeVisit',
            'shiftType': key,
            'startTime': w.start,
            'endTime': w.end,
            'slotDuration': _minutesBetween(w.start, w.end),
            'maxPatients': 1,
          });
        }
        widget.onSaved();
      } catch (e) {
        _setError(e.toString().replaceAll('Exception: ', ''));
      }
      return;
    }

    // Online
    final startStr = _fmt(_start);
    final endStr   = _fmt(_end);
    if (_start.hour * 60 + _start.minute >= _end.hour * 60 + _end.minute) {
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
    if (_maxPatients < 1 || _maxPatients > 10) {
      _setError('Max patients must be 1–10');
      return;
    }
    setState(() => _saving = true);
    try {
      await DoctorScheduleService.createSchedule(widget.token, {
        'dayOfWeek': _dayOfWeek,
        'consultationType': 'Online',
        'shiftType': null,
        'startTime': startStr,
        'endTime': endStr,
        'slotDuration': _slotDuration,
        'maxPatients': _maxPatients,
      });
      widget.onSaved();
    } catch (e) {
      _setError(e.toString().replaceAll('Exception: ', ''));
    }
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
                value: _dayOfWeek,
                decoration: _inputDecor(),
                items: _days.map((d) => DropdownMenuItem(value: d.index, child: Text(d.label))).toList(),
                onChanged: (v) => setState(() => _dayOfWeek = v!),
              ),
              const SizedBox(height: 14),

              // Kind toggle: Online / HomeVisit
              _Label('Consultation Type'),
              Row(children: [
                _KindChip(label: 'Online', selected: _kind == 'Online', onTap: () => setState(() => _kind = 'Online')),
                const SizedBox(width: 10),
                _KindChip(label: 'Home Visit', selected: _kind == 'HomeVisit', onTap: () => setState(() => _kind = 'HomeVisit')),
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
                      value: _slotDuration,
                      decoration: _inputDecor(),
                      items: _durations.map((d) => DropdownMenuItem(value: d, child: Text('$d min'))).toList(),
                      onChanged: (v) => setState(() => _slotDuration = v!),
                    ),
                  ])),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _Label('Max Patients / Slot'),
                    TextFormField(
                      initialValue: '$_maxPatients',
                      keyboardType: TextInputType.number,
                      decoration: _inputDecor(hint: '1–10'),
                      onChanged: (v) {
                        final n = int.tryParse(v);
                        if (n != null) setState(() => _maxPatients = n);
                      },
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
                    'Home visits use fixed shift windows. Select one or more shifts to add.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF92400E), height: 1.5),
                  ),
                ),
                _Label('Select Shifts'),
                Column(
                  children: _shiftOrder.map((key) {
                    final w = _shiftWindows[key]!;
                    final selected = _selectedShifts.contains(key);
                    return GestureDetector(
                      onTap: () => setState(() => selected ? _selectedShifts.remove(key) : _selectedShifts.add(key)),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: selected ? DS.primary.withValues(alpha: 0.08) : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: selected ? DS.primary : DS.border, width: selected ? 1.5 : 1),
                        ),
                        child: Row(children: [
                          Icon(selected ? Icons.check_circle : Icons.radio_button_unchecked,
                              size: 18, color: selected ? DS.primary : DS.mutedForeground),
                          const SizedBox(width: 10),
                          Expanded(child: Text(w.label,
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500,
                                  color: selected ? DS.primary : DS.foreground))),
                          Text('${w.start} – ${w.end}',
                              style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                        ]),
                      ),
                    );
                  }).toList(),
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
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(width: 20, height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text("Save Slot", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
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

// ─── Compliance Banner ────────────────────────────────────────────────────────

class _ComplianceWarning extends StatelessWidget {
  final ComplianceStatus? compliance;
  final bool loading;
  const _ComplianceWarning({required this.compliance, required this.loading});

  @override
  Widget build(BuildContext context) {
    if (loading) return const SizedBox.shrink();
    if (compliance == null) return const SizedBox.shrink();

    final c = compliance!;
    final isError = c.status == 'NON_COMPLIANT';
    final barColor = isError ? const Color(0xFFDC2626) : const Color(0xFFF59E0B);
    final bgColor  = isError ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB);
    final bdColor  = isError ? const Color(0xFFFCA5A5) : const Color(0xFFFCD34D);
    final txColor  = isError ? const Color(0xFF991B1B) : const Color(0xFF92400E);
    final icon     = isError ? Icons.error_outline : Icons.warning_amber_rounded;
    final pct = (c.compliancePercentage / 100).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: bdColor),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 15, color: barColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              c.statusMessage ?? 'You have not met the minimum schedule hours this month.',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: txColor),
            ),
          ),
        ]),
        const SizedBox(height: 6),
        Row(children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: pct,
                backgroundColor: barColor.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation<Color>(barColor),
                minHeight: 6,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${c.scheduledHours.toStringAsFixed(1)}/${c.requiredHours}h  ${c.compliancePercentage.toStringAsFixed(0)}%',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: txColor),
          ),
        ]),
      ]),
    );
  }
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

class _CalendarTab extends StatelessWidget {
  final bool loading;
  final List<CalendarDay> days;
  final DateTime month;
  final void Function(DateTime) onMonthChanged;
  final String token;
  final void Function(String, {bool success}) onSnack;
  final VoidCallback onDayOffCreated;

  const _CalendarTab({
    required this.loading,
    required this.days,
    required this.month,
    required this.onMonthChanged,
    required this.token,
    required this.onSnack,
    required this.onDayOffCreated,
  });

  CalendarDay? _dayData(DateTime date) {
    final key = DateFormat('yyyy-MM-dd').format(date);
    try { return days.firstWhere((d) => d.date == key); } catch (_) { return null; }
  }

  bool _isFutureDate(DateTime date) {
    final today = DateTime.now();
    final todayMidnight = DateTime(today.year, today.month, today.day);
    return date.isAfter(todayMidnight);
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'WORKING': return const Color(0xFF10B981);
      case 'DAY_OFF': return DS.destructive;
      case 'MODIFIED': return const Color(0xFFF59E0B);
      default: return DS.border;
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
            onPressed: () => onMonthChanged(DateTime(month.year, month.month - 1)),
          ),
          Expanded(
            child: Text(
              DateFormat('MMMM yyyy').format(month),
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => onMonthChanged(DateTime(month.year, month.month + 1)),
          ),
        ]),
      ),
      if (loading) const LinearProgressIndicator(color: DS.primary),
      // Weekday headers
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
      Expanded(child: _buildGrid(context)),
      // Legend
      Container(
        color: DS.card,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          _Legend(color: const Color(0xFF10B981), label: 'Working'),
          const SizedBox(width: 16),
          _Legend(color: DS.destructive, label: 'Day Off'),
          const SizedBox(width: 16),
          _Legend(color: const Color(0xFFF59E0B), label: 'Modified'),
        ]),
      ),
    ]);
  }

  Widget _buildGrid(BuildContext context) {
    final firstDay = DateTime(month.year, month.month, 1);
    // Monday=0 offset
    int offset = firstDay.weekday - 1; // weekday: 1=Mon
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final total = offset + daysInMonth;
    final rows = (total / 7).ceil();

    return GridView.builder(
      padding: const EdgeInsets.all(8),
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
                        color: _statusColor(data.status),
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
    final statusColor = _statusColor(data.status);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text(DateFormat('EEEE, MMM d yyyy').format(date),
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                  color: statusColor.withValues(alpha:0.12),
                  borderRadius: BorderRadius.circular(20)),
              child: Text(data.status,
                  style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 12),
          if (data.slots.isEmpty)
            const Text('No scheduled slots for this day.',
                style: TextStyle(color: DS.mutedForeground))
          else
            ...data.slots.map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(children: [
                    const Icon(Icons.access_time, size: 14, color: DS.primary),
                    const SizedBox(width: 6),
                    Text('${_fmtTime(s.startTime)} – ${_fmtTime(s.endTime)}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                    const SizedBox(width: 8),
                    Text(_typeLabels[s.consultationType?.toUpperCase()] ?? (s.consultationType ?? ''),
                        style: const TextStyle(color: DS.mutedForeground, fontSize: 12)),
                  ]),
                )),
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
      onSnack('A reason is required to register a day off');
      return;
    }
    if (!context.mounted) return;

    try {
      final fmt = DateFormat('yyyy-MM-dd');
      await DoctorScheduleService.createDayOff(token, fmt.format(date), reason.trim());
      if (context.mounted) Navigator.of(context).pop(); // close day-detail sheet
      onSnack('Day off registered successfully', success: true);
      onDayOffCreated();
    } catch (e) {
      onSnack(e.toString().replaceAll('Exception: ', ''));
    }
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
                  value: _selectedApptId,
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
