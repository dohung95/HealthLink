import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/doctor_theme.dart';
import '../../models/doctor/doctor_schedule.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_schedule_service.dart';

DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
String _dateKey(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

/// Lịch tháng compact cho Doctor Home — khớp `TodayTimeline` bên web:
/// hiện ngày Today/Scheduled/Day Off/Empty theo dữ liệu lịch làm việc thật,
/// tap 1 ngày để đổi `selectedDate`.
class DoctorMonthCalendar extends StatefulWidget {
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateChange;

  const DoctorMonthCalendar({
    super.key,
    required this.selectedDate,
    required this.onDateChange,
  });

  @override
  State<DoctorMonthCalendar> createState() => _DoctorMonthCalendarState();
}

class _DoctorMonthCalendarState extends State<DoctorMonthCalendar> {
  late DateTime _month; // luôn là ngày 1 của tháng đang xem
  bool _loading = false;
  Map<String, CalendarDay> _dayMap = {};

  /// Mặc định thu gọn — chỉ hiện dòng tóm tắt ngày đang chọn, bấm vào mới xổ
  /// ra lưới chọn ngày đầy đủ.
  bool _expanded = false;

  String get _selectedDateLabel {
    final today = _dateOnly(DateTime.now());
    final selected = _dateOnly(widget.selectedDate);
    if (selected == today) return 'Today, ${DateFormat('MMM d').format(selected)}';
    return DateFormat('EEE, MMM d, yyyy').format(selected);
  }

  @override
  void initState() {
    super.initState();
    _month = DateTime(widget.selectedDate.year, widget.selectedDate.month, 1);
    _loadMonth();
  }

  @override
  void didUpdateWidget(covariant DoctorMonthCalendar oldWidget) {
    super.didUpdateWidget(oldWidget);
    final wantedMonth = DateTime(widget.selectedDate.year, widget.selectedDate.month, 1);
    if (wantedMonth != _month) {
      setState(() => _month = wantedMonth);
      _loadMonth();
    }
  }

  Future<void> _loadMonth() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    setState(() => _loading = true);
    final start = _month;
    final end = DateTime(_month.year, _month.month + 1, 0);
    try {
      final days = await DoctorScheduleService.getCalendarView(
        token,
        _dateKey(start),
        _dateKey(end),
      );
      if (mounted) {
        setState(() {
          _dayMap = {for (final d in days) d.date: d};
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _changeMonth(int delta) {
    final now = DateTime.now();
    final next = DateTime(_month.year, _month.month + delta, 1);
    setState(() => _month = next);
    _loadMonth();
    // Nhảy selectedDate sang ngày 1 của tháng mới (hoặc hôm nay nếu quay lại tháng hiện tại).
    final jumpTo = (next.year == now.year && next.month == now.month) ? now : next;
    widget.onDateChange(_dateOnly(jumpTo));
  }

  List<_CalendarCell> _buildCells() {
    final firstDay = DateTime(_month.year, _month.month, 1);
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final startOffset = firstDay.weekday - 1; // Monday=1 -> offset 0
    final today = _dateOnly(DateTime.now());
    final selected = _dateOnly(widget.selectedDate);

    final cells = <_CalendarCell>[];
    for (int i = 0; i < startOffset; i++) {
      cells.add(const _CalendarCell.empty());
    }
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_month.year, _month.month, day);
      final info = _dayMap[_dateKey(date)];
      final isScheduled = (info?.slots ?? const []).any(
        (s) => s.status == 'BOOKED' || s.status == 'HELD',
      );
      final isDayOff = info?.status == 'DAY_OFF' || info?.status == 'NO_SCHEDULE';
      cells.add(_CalendarCell(
        date: date,
        isToday: date == today,
        isSelected: date == selected,
        isDayOff: isDayOff,
        isScheduled: isScheduled,
      ));
    }
    return cells;
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isCurrentMonth = _month.year == now.year && _month.month == now.month;
    final cells = _buildCells();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DS.card,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4)),
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            behavior: HitTestBehavior.opaque,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.calendar_month_rounded, size: 18, color: DS.primary),
                    const SizedBox(width: 8),
                    Text(
                      _selectedDateLabel,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DS.foreground),
                    ),
                  ],
                ),
                Icon(
                  _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                  size: 20,
                  color: DS.mutedForeground,
                ),
              ],
            ),
          ),
          if (_expanded) ...[
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _NavButton(icon: Icons.chevron_left, onTap: isCurrentMonth ? null : () => _changeMonth(-1)),
                SizedBox(
                  width: 120,
                  child: Text(
                    DateFormat('MMMM yyyy').format(_month),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: DS.foreground),
                  ),
                ),
                _NavButton(icon: Icons.chevron_right, onTap: () => _changeMonth(1)),
              ],
            ),
            const SizedBox(height: 10),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary)),
              )
            else ...[
              _WeekdayRow(),
              const SizedBox(height: 4),
              GridView.count(
                crossAxisCount: 7,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                childAspectRatio: 1.15,
                children: cells.map((c) => _DayCell(cell: c, onTap: () => widget.onDateChange(c.date!))).toList(),
              ),
              const SizedBox(height: 10),
              const _Legend(),
            ],
          ],
        ],
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  const _NavButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onTap,
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
      icon: Icon(icon, size: 18, color: onTap == null ? DS.mutedForeground.withOpacity(0.3) : DS.mutedForeground),
    );
  }
}

class _WeekdayRow extends StatelessWidget {
  static const _labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  @override
  Widget build(BuildContext context) {
    return Row(
      children: _labels
          .map((l) => Expanded(
                child: Center(
                  child: Text(l, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: DS.mutedForeground)),
                ),
              ))
          .toList(),
    );
  }
}

class _CalendarCell {
  final DateTime? date;
  final bool isToday;
  final bool isSelected;
  final bool isDayOff;
  final bool isScheduled;

  const _CalendarCell({
    required this.date,
    this.isToday = false,
    this.isSelected = false,
    this.isDayOff = false,
    this.isScheduled = false,
  });

  const _CalendarCell.empty()
      : date = null,
        isToday = false,
        isSelected = false,
        isDayOff = false,
        isScheduled = false;
}

class _DayCell extends StatelessWidget {
  final _CalendarCell cell;
  final VoidCallback onTap;
  const _DayCell({required this.cell, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (cell.date == null) return const SizedBox.shrink();

    Color bg = Colors.transparent;
    Color fg = DS.foreground;
    Border? border;

    if (cell.isSelected) {
      bg = DS.primary;
      fg = DS.primaryForeground;
    } else if (cell.isDayOff) {
      bg = DS.amber100;
      fg = DS.amber700;
    } else if (cell.isScheduled) {
      bg = DS.primary.withValues(alpha: 0.12);
      fg = DS.primary;
    }
    if (cell.isToday && !cell.isSelected) {
      border = Border.all(color: DS.primary, width: 1.5);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8), border: border),
        alignment: Alignment.center,
        child: Text(
          '${cell.date!.day}',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg),
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    Widget item(Color color, String label) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 11, color: DS.mutedForeground)),
          ],
        );

    return Wrap(
      spacing: 12,
      runSpacing: 6,
      children: [
        item(DS.primary, 'Today'),
        item(DS.primary.withValues(alpha: 0.4), 'Scheduled'),
        item(DS.amber600, 'Day Off'),
        item(DS.cardBorder, 'Empty'),
      ],
    );
  }
}
