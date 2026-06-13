import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../services/booking/booking_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/appointments/appointment_service.dart';
import '../../../services/chat/chat_service.dart';
import '../../chat/chat_room_screen.dart';
import '../../video_audio/video_call_screen.dart';
import '../../../utils/notification_helper.dart';
import '../../../providers/chat/chat_provider.dart';
import '../../../providers/video_call_provider.dart';

class AppointmentScreen extends StatefulWidget {
  const AppointmentScreen({super.key, this.onBookNew});

  final VoidCallback? onBookNew;

  @override
  State<AppointmentScreen> createState() => _AppointmentScreenState();
}

class _AppointmentScreenState extends State<AppointmentScreen> {
  static const int _pageSize = 5;

  AppointmentService? _service;
  BookingService? _bookingService;

  bool _loading = true;
  bool _actionLoading = false;

  String? _error;
  String? _patientId;

  int _currentPage = 1;
  int _totalPages = 1;
  int _totalItems = 0;

  DateTime _now = DateTime.now();
  Timer? _timer;

  List<PatientAppointment> _appointments = [];

  String _statusFilter = 'ALL';

  static const Map<String, String> _statusOptions = {
    'ALL': 'All',
    'UPCOMING': 'Upcoming',
    'EXPIRED': 'Expired',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'IN_CONSULTATION': 'In consultation',
  };

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initialize();
    });

    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        setState(() {
          _now = DateTime.now();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _initialize() async {
    final auth = context.read<AuthProvider>();

    if (!auth.isAuthenticated || auth.accessToken == null) {
      setState(() {
        _loading = false;
        _error = 'Please login to view your appointments.';
      });
      return;
    }

    _service = AppointmentService(accessToken: auth.accessToken!);
    _bookingService = BookingService(accessToken: auth.accessToken!);
    _patientId = auth.userId;

    if (_patientId == null || _patientId!.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Can not find patient information. Please login again.';
      });
      return;
    }

    await _loadAppointments(page: 1);
  }

  Future<void> _loadAppointments({required int page}) async {
    if (_service == null || _patientId == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await _service!.getPatientAppointmentsPage(
        patientId: _patientId!,
        page: page,
        size: _pageSize,
        status: _statusFilter,
      );

      if (!mounted) return;

      setState(() {
        _appointments = result.items;
        _currentPage = result.page;
        _totalPages = result.totalPages == 0 ? 1 : result.totalPages;
        _totalItems = result.totalItems;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error = _cleanError(e);
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _handleStatusChanged(String? status) async {
    if (status == null || status == _statusFilter) return;

    setState(() {
      _statusFilter = status;
      _currentPage = 1;
      _appointments = [];
    });

    await _loadAppointments(page: 1);
  }

  Future<void> _confirmCancel(PatientAppointment appointment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Cancel Appointment'),
          content: const Text(
            'Are you sure you want to cancel this appointment? This action cannot be undone.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('No, Keep It'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Yes, Cancel'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    await _cancelAppointment(appointment);
  }

  Future<void> _cancelAppointment(PatientAppointment appointment) async {
    if (_service == null) return;

    setState(() {
      _actionLoading = true;
    });

    try {
      await _service!.cancelAppointment(
        appointmentId: appointment.appointmentId,
      );

      if (!mounted) return;

      _showMessage('Appointment cancelled successfully.');
      await _loadAppointments(page: _currentPage);
    } catch (e) {
      _showMessage(_cleanError(e), isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _actionLoading = false;
        });
      }
    }
  }

  void _handleChat(PatientAppointment appointment) async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated || auth.accessToken == null || _patientId == null)
      return;

    setState(() => _actionLoading = true);

    try {
      final conversation = await ChatService.getOrCreateRoom(
        auth.accessToken!,
        _patientId!,
        appointment.doctorId,
        appointmentId: appointment.appointmentId,
      );

      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ChatRoomScreen(conversation: conversation),
        ),
      );
    } catch (e) {
      _showMessage(_cleanError(e), isError: true);
    } finally {
      if (mounted) {
        setState(() => _actionLoading = false);
      }
    }
  }

  void _handleVideo(PatientAppointment appointment) {
    final auth = context.read<AuthProvider>();
    final videoCallProvider = context.read<VideoCallProvider>();

    if (auth.isAuthenticated && auth.userId != null) {
      // Tạo ngẫu nhiên một roomId 45 ký tự giống web
      const chars =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      final rnd = math.Random();
      final roomId = String.fromCharCodes(
        Iterable.generate(
          45,
          (_) => chars.codeUnitAt(rnd.nextInt(chars.length)),
        ),
      );

      final success = videoCallProvider.sendCallRequest(
        receiverId: appointment.doctorId,
        roomId: roomId,
        myId: auth.userId!,
        myName: appointment.patientName,
      );

      if (!success) {
        _showMessage('You are already in a call!', isError: true);
        return;
      }

      Navigator.push(
        context,
        MaterialPageRoute(
          settings: const RouteSettings(name: '/video_call'),
          builder: (_) => VideoCallScreen(
            partnerName: 'Dr. ${appointment.doctorName}',
            partnerRole: 'Doctor',
            partnerId: appointment.doctorId,
            roomId: roomId,
          ),
        ),
      );
    } else {
      _showMessage('Can not start video call, please login.', isError: true);
    }
  }

  Future<void> _handleReschedule(PatientAppointment appointment) async {
    if (_bookingService == null || _service == null || _patientId == null) {
      _showMessage('Can not prepare reschedule flow.', isError: true);
      return;
    }

    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return _RescheduleAppointmentSheet(
          appointment: appointment,
          patientId: _patientId!,
          bookingService: _bookingService!,
          appointmentService: _service!,
        );
      },
    );

    if (changed == true) {
      _showMessage('Appointment rescheduled successfully.');
      await _loadAppointments(page: _currentPage);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _buildHeader(colors),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _loadAppointments(page: _currentPage),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 104),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 920),
                      child: _buildContent(colors),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ColorScheme colors) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      decoration: BoxDecoration(
        color: colors.surfaceVariant.withValues(alpha: 0.55),
        border: Border(bottom: BorderSide(color: colors.outlineVariant)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'My Appointments',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'View and manage your appointments',
                  style: TextStyle(color: colors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: widget.onBookNew,
            icon: const Icon(Icons.add),
            label: const Text('Book'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusFilter(ColorScheme colors) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _statusFilter,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down),
          items: _statusOptions.entries.map((entry) {
            return DropdownMenuItem<String>(
              value: entry.key,
              child: Row(
                children: [
                  Icon(_statusIcon(entry.key), size: 18, color: colors.primary),
                  const SizedBox(width: 10),
                  Text(entry.value),
                ],
              ),
            );
          }).toList(),
          onChanged: _loading ? null : _handleStatusChanged,
        ),
      ),
    );
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'UPCOMING':
        return Icons.upcoming_outlined;
      case 'EXPIRED':
        return Icons.schedule_outlined;
      case 'COMPLETED':
        return Icons.check_circle_outline;
      case 'CANCELLED':
        return Icons.cancel_outlined;
      case 'IN_CONSULTATION':
        return Icons.medical_services_outlined;
      default:
        return Icons.filter_list;
    }
  }

  Widget _buildContent(ColorScheme colors) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.only(top: 80),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return _emptyState(
        colors,
        icon: Icons.error_outline,
        title: 'Unable to load appointments',
        subtitle: _error!,
      );
    }

    if (_appointments.isEmpty) {
      final selectedLabel =
          _statusOptions[_statusFilter] ?? 'selected';

      return Column(
        children: [
          _buildStatusFilter(colors),
          const SizedBox(height: 16),
          _emptyState(
            colors,
            icon: Icons.event_busy_outlined,
            title: _statusFilter == 'ALL'
                ? 'No appointments yet'
                : 'No $selectedLabel appointments',
            subtitle: _statusFilter == 'ALL'
                ? 'Book your first appointment to start consulting with a doctor.'
                : 'No appointments match the selected status.',
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStatusFilter(colors),
        const SizedBox(height: 16),

        if (_actionLoading)
          LinearProgressIndicator(
            color: colors.primary,
            backgroundColor: colors.surfaceContainerHighest,
          ),

        const SizedBox(height: 12),

        ..._appointments.map((appointment) {
          return _appointmentCard(colors, appointment);
        }),

        const SizedBox(height: 16),
        _pagination(colors),
      ],
    );
  }

  Widget _appointmentCard(ColorScheme colors, PatientAppointment appointment) {
    final joinable = appointment.isJoinable(_now);
    final canCancel = appointment.canCancel(_now);
    final canReschedule = appointment.canReschedule(_now);

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 14),
      color: colors.surfaceContainerLowest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(color: colors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: colors.primary,
                  child: Text(
                    _doctorInitials(appointment.doctorName),
                    style: TextStyle(
                      color: colors.onPrimary,
                      fontWeight: FontWeight.w900,
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
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      if (appointment.specialtyName.isNotEmpty)
                        Text(
                          appointment.specialtyName,
                          style: TextStyle(color: colors.onSurfaceVariant),
                        ),
                    ],
                  ),
                ),
                _statusChip(colors, appointment.displayStatus(_now)),
              ],
            ),
            const SizedBox(height: 16),
            _infoRow(
              colors,
              Icons.calendar_today_outlined,
              '${_formatDate(appointment.appointmentTime)} • ${_formatTime(appointment.appointmentTime)}',
            ),
            const SizedBox(height: 8),
            _infoRow(
              colors,
              Icons.medical_services_outlined,
              appointment.consultationType,
            ),
            const SizedBox(height: 8),
            _infoRow(colors, Icons.person_outline, appointment.patientName),
            const SizedBox(height: 16),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                if (appointment.isChat && joinable)
                  FilledButton.icon(
                    onPressed: () => _handleChat(appointment),
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Chat'),
                  ),
                if (appointment.isVideo && joinable)
                  FilledButton.icon(
                    onPressed: () => _handleVideo(appointment),
                    icon: const Icon(Icons.videocam_outlined),
                    label: const Text('Call Now'),
                  ),
                if (canReschedule)
                  OutlinedButton.icon(
                    onPressed: () => _handleReschedule(appointment),
                    icon: const Icon(Icons.edit_calendar_outlined),
                    label: const Text('Reschedule'),
                  ),
                if (canCancel)
                  OutlinedButton.icon(
                    onPressed: () => _confirmCancel(appointment),
                    icon: const Icon(Icons.close),
                    label: const Text('Cancel'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(ColorScheme colors, IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: colors.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(text, style: TextStyle(color: colors.onSurfaceVariant)),
        ),
      ],
    );
  }

  Widget _statusChip(ColorScheme colors, String status) {
    final normalized = status.trim().toLowerCase();

    Color bg;
    Color fg;
    String label;

    if (normalized == 'expired') {
      bg = colors.surfaceContainerHighest;
      fg = colors.onSurfaceVariant;
      label = 'Expired';
    } else if (normalized == 'scheduled') {
      bg = colors.primary.withValues(alpha: 0.12);
      fg = colors.primary;
      label = 'Scheduled';
    } else if (normalized == 'confirmed') {
      bg = colors.tertiary.withValues(alpha: 0.12);
      fg = colors.tertiary;
      label = 'Confirmed';
    } else if (normalized == 'completed') {
      bg = colors.secondary.withValues(alpha: 0.12);
      fg = colors.secondary;
      label = 'Completed';
    } else if (normalized == 'cancelled' || normalized == 'canceled') {
      bg = colors.errorContainer;
      fg = colors.onErrorContainer;
      label = 'Cancelled';
    } else {
      bg = colors.surfaceContainerHighest;
      fg = colors.onSurfaceVariant;
      label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w900),
      ),
    );
  }

  Widget _pagination(ColorScheme colors) {
    if (_totalPages <= 1) {
      return Text(
        'Showing $_totalItems appointment(s)',
        style: TextStyle(color: colors.onSurfaceVariant),
      );
    }

    return Row(
      children: [
        Expanded(
          child: Text(
            'Page $_currentPage of $_totalPages ($_totalItems appointments)',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ),
        IconButton(
          onPressed: _currentPage > 1
              ? () => _loadAppointments(page: _currentPage - 1)
              : null,
          icon: const Icon(Icons.chevron_left),
        ),
        IconButton(
          onPressed: _currentPage < _totalPages
              ? () => _loadAppointments(page: _currentPage + 1)
              : null,
          icon: const Icon(Icons.chevron_right),
        ),
      ],
    );
  }

  Widget _emptyState(
    ColorScheme colors, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        children: [
          Icon(icon, size: 48, color: colors.outline),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  String _cleanError(Object error) {
    final raw = error.toString();
    return raw.startsWith('Exception: ') ? raw.substring(11) : raw;
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Theme.of(context).colorScheme.error : null,
      ),
    );
  }

  String _doctorInitials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.isEmpty) return 'DR';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();

    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatTime(DateTime date) {
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    return '$hour:$minute';
  }
}

class _RescheduleAppointmentSheet extends StatefulWidget {
  const _RescheduleAppointmentSheet({
    required this.appointment,
    required this.patientId,
    required this.bookingService,
    required this.appointmentService,
  });

  final PatientAppointment appointment;
  final String patientId;
  final BookingService bookingService;
  final AppointmentService appointmentService;

  @override
  State<_RescheduleAppointmentSheet> createState() =>
      _RescheduleAppointmentSheetState();
}

class _RescheduleAppointmentSheetState
    extends State<_RescheduleAppointmentSheet> {
  bool _loadingSlots = false;
  bool _submitting = false;

  DateTime _selectedDate = DateTime.now();
  List<BookingSlot> _slots = [];
  BookingSlot? _selectedSlot;
  int _bookingWindowDays = 30;

  @override
  void initState() {
    super.initState();

    final current = widget.appointment.appointmentTime;
    final today = DateTime.now();

    _selectedDate = current.isAfter(today)
        ? DateTime(current.year, current.month, current.day)
        : DateTime(today.year, today.month, today.day);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSlots();
    });
  }

  @override
  void dispose() {
    _releaseHoldSilently();
    super.dispose();
  }

  Future<void> _loadSlots() async {
    setState(() {
      _loadingSlots = true;
      _slots = [];
      _selectedSlot = null;
    });

    try {
      final result = await widget.bookingService.getAvailableSlots(
        doctorId: widget.appointment.doctorId,
        date: _formatDate(_selectedDate),
        consultationType: widget.appointment.consultationType,
      );

      if (!mounted) return;

      setState(() {
        _bookingWindowDays = result.bookingWindowDays;
        _slots = result.slots;
      });
    } catch (e) {
      _showSheetMessage(_cleanError(e), isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _loadingSlots = false;
        });
      }
    }
  }

  Future<void> _selectSlot(BookingSlot slot) async {
    if (!slot.selectable) return;

    if (_selectedSlot?.startTime == slot.startTime) {
      final start = slot.startTime;
      await _releaseHoldSilently();
      _markSlotAvailable(start);
      return;
    }

    await _releaseHoldSilently();

    try {
      final hold = await widget.bookingService.holdSlot(
        doctorId: widget.appointment.doctorId,
        patientId: widget.patientId,
        appointmentTime: _appointmentDateTime(_selectedDate, slot.startTime),
        consultationType: widget.appointment.consultationType,
      );

      if (!mounted) return;

      setState(() {
        _selectedSlot = slot.copyWith(
          status: 'HELD',
          selectable: false,
          holdId: hold.holdId,
        );

        _slots = _slots.map((item) {
          if (item.startTime == slot.startTime) {
            return item.copyWith(
              status: 'HELD',
              selectable: false,
              holdId: hold.holdId,
            );
          }

          return item;
        }).toList();
      });
    } catch (e) {
      _showSheetMessage(_cleanError(e), isError: true);
      await _loadSlots();
    }
  }

  Future<void> _releaseHoldSilently() async {
    final holdId = _selectedSlot?.holdId;

    if (holdId == null || holdId == 0) return;

    try {
      await widget.bookingService.releaseHold(holdId);
    } catch (_) {
      // Hold co the da het han hoac bi backend xoa.
    }
  }

  void _markSlotAvailable(String startTime) {
    setState(() {
      _slots = _slots.map((item) {
        if (item.startTime == startTime) {
          return item.copyWith(
            status: 'AVAILABLE',
            selectable: true,
            clearHold: true,
          );
        }

        return item;
      }).toList();

      _selectedSlot = null;
    });
  }

  Future<void> _confirmReschedule() async {
    if (_selectedSlot == null) {
      _showSheetMessage('Please select a new time slot.');
      return;
    }

    setState(() {
      _submitting = true;
    });

    try {
      await widget.appointmentService.rescheduleAppointment(
        appointmentId: widget.appointment.appointmentId,
        newAppointmentTime: _appointmentDateTime(
          _selectedDate,
          _selectedSlot!.startTime,
        ),
      );

      if (!mounted) return;

      _selectedSlot = null;
      Navigator.of(context).pop(true);
    } catch (e) {
      _showSheetMessage(_cleanError(e), isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final days = List.generate(
      _bookingWindowDays.clamp(7, 30).toInt(),
      (index) => _dayStart(DateTime.now()).add(Duration(days: index)),
    );

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 18,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: colors.outlineVariant,
                borderRadius: BorderRadius.circular(100),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Reschedule Appointment',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            'Choose a new date and time with ${widget.appointment.doctorName}.',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 18),

          SizedBox(
            height: 82,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: days.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final day = days[index];
                final selected = _sameDay(day, _selectedDate);

                return InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () async {
                    await _releaseHoldSilently();

                    setState(() {
                      _selectedDate = day;
                      _selectedSlot = null;
                      _slots = [];
                    });

                    await _loadSlots();
                  },
                  child: Container(
                    width: 96,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: selected
                          ? colors.primary
                          : colors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: selected
                            ? colors.primary
                            : colors.outlineVariant,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _dayLabel(day),
                          style: TextStyle(
                            color: selected
                                ? colors.onPrimary
                                : colors.onSurface,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          '${day.day}/${day.month}',
                          style: TextStyle(
                            color: selected
                                ? colors.onPrimary
                                : colors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 22),
          Text(
            'Available slots',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),

          if (_loadingSlots)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_slots.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                'No available slots on this day.',
                style: TextStyle(color: colors.onSurfaceVariant),
              ),
            )
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _slots.map((slot) {
                final selected = _selectedSlot?.startTime == slot.startTime;
                final enabled = slot.selectable || selected;

                return SizedBox(
                  width: 104,
                  child: FilledButton.tonal(
                    onPressed: enabled ? () => _selectSlot(slot) : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: selected
                          ? colors.primary
                          : enabled
                          ? colors.inverseSurface
                          : colors.surfaceContainerHighest,
                      foregroundColor: selected
                          ? colors.onPrimary
                          : enabled
                          ? colors.onInverseSurface
                          : colors.outline,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      _shortTime(slot.startTime),
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                );
              }).toList(),
            ),

          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _submitting
                      ? null
                      : () async {
                          await _releaseHoldSilently();

                          if (context.mounted) {
                            Navigator.of(context).pop(false);
                          }
                        },
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _submitting ? null : _confirmReschedule,
                  child: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Confirm'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showSheetMessage(String message, {bool isError = false}) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Theme.of(context).colorScheme.error : null,
      ),
    );
  }

  String _cleanError(Object error) {
    final raw = error.toString();
    return raw.startsWith('Exception: ') ? raw.substring(11) : raw;
  }

  DateTime _dayStart(DateTime value) {
    return DateTime(value.year, value.month, value.day);
  }

  bool _sameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _formatDate(DateTime date) {
    return '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
  }

  String _appointmentDateTime(DateTime date, String time) {
    final clean = time.length >= 5 ? time : '00:00';
    final withSeconds = clean.length == 5
        ? '$clean:00'
        : clean.split('.').first;

    return '${_formatDate(date)}T$withSeconds';
  }

  String _shortTime(String time) {
    return time.length >= 5 ? time.substring(0, 5) : time;
  }

  String _dayLabel(DateTime date) {
    if (_sameDay(date, DateTime.now())) return 'Today';

    final tomorrow = _dayStart(DateTime.now()).add(const Duration(days: 1));
    if (_sameDay(date, tomorrow)) return 'Tomorrow';

    return const [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ][date.weekday - 1];
  }
}
