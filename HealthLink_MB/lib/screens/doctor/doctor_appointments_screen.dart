import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/doctor/complete_appointment_sheet.dart';

class DoctorAppointmentsScreen extends StatefulWidget {
  const DoctorAppointmentsScreen({super.key});

  @override
  State<DoctorAppointmentsScreen> createState() => _DoctorAppointmentsScreenState();
}

class _DoctorAppointmentsScreenState extends State<DoctorAppointmentsScreen> {
  bool _isLoading = true;
  String? _error;
  DoctorProfile? _profile;
  List<DoctorAppointment> _allAppointments = [];
  DateTime _selectedDate = DateTime.now();
  String _selectedStatus = 'ALL';

  final List<_DateItemData> _dateItems = [];
  final List<Map<String, String>> _statusFilters = [
    {'key': 'ALL', 'label': 'All'},
    {'key': 'PENDING', 'label': 'Pending'},
    {'key': 'CONFIRMED', 'label': 'Confirmed'},
    {'key': 'IN_PROGRESS', 'label': 'In Progress'},
    {'key': 'COMPLETED', 'label': 'Completed'},
    {'key': 'CANCELLED', 'label': 'Cancelled'},
  ];

  final _weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  @override
  void initState() {
    super.initState();
    _buildDateItems();
    _loadData();
  }

  void _buildDateItems() {
    _dateItems.clear();
    final base = DateTime.now();
    final today = DateTime(base.year, base.month, base.day);

    for (int i = -1; i < 8; i++) {
      final d = today.add(Duration(days: i));
      _dateItems.add(_DateItemData(
        date: d,
        label: _weekDays[d.weekday % 7],
        day: d.day,
        isToday: i == 0,
      ));
    }
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

      _profile ??= await DoctorService.getProfile(token);

      final daily = await DoctorService.getDailyAppointments(
        token,
        _profile!.doctorId,
        date: _selectedDate,
      );

      if (mounted) {
        setState(() {
          _allAppointments = daily.appointments;
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

  List<DoctorAppointment> get _filteredAppointments {
    List<DoctorAppointment> list = _allAppointments;
    if (_selectedStatus != 'ALL') {
      list = list.where((a) => a.status?.toUpperCase() == _selectedStatus).toList();
    }
    list.sort((a, b) {
      final aTime = a.appointmentTime ?? DateTime.now();
      final bTime = b.appointmentTime ?? DateTime.now();
      return aTime.compareTo(bTime);
    });
    return list;
  }

  bool _isSameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Appointments', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: DS.foreground)),
                      SizedBox(height: 2),
                      Text('Manage your daily schedule', style: TextStyle(fontSize: 14, color: DS.mutedForeground)),
                    ],
                  ),
                  GestureDetector(
                    onTap: _loadData,
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.refresh, size: 18, color: DS.mutedForeground),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Date Selector
            SizedBox(
              height: 76,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _dateItems.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final item = _dateItems[index];
                  final isSelected = _isSameDay(item.date, _selectedDate);
                  return DoctorDateItem(
                    dayLabel: item.label,
                    dayNumber: item.day,
                    isSelected: isSelected,
                    isToday: item.isToday,
                    onTap: () {
                      setState(() => _selectedDate = item.date);
                      _loadData();
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 16),

            // Status Filters
            SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _statusFilters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final filter = _statusFilters[index];
                  final isSelected = _selectedStatus == filter['key'];
                  return DoctorFilterChip(
                    label: filter['label']!,
                    selected: isSelected,
                    onTap: () => setState(() => _selectedStatus = filter['key']!),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),

            // Content
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: DS.primary))
                  : _error != null
                      ? _buildErrorState()
                      : RefreshIndicator(
                          color: DS.primary,
                          onRefresh: _loadData,
                          child: _filteredAppointments.isEmpty
                              ? _buildEmptyState()
                              : ListView.separated(
                                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                                  itemCount: _filteredAppointments.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                                  itemBuilder: (context, index) => _AppointmentCard(
                                    appointment: _filteredAppointments[index],
                                    onUpdateStatus: _updateStatus,
                                    onStartCall: _startCall,
                                    onComplete: _openCompleteSheet,
                                  ),
                                ),
                        ),
            ),
          ],
        ),
      ),
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
            const Text('Failed to load appointments', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
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
    return const SingleChildScrollView(
      physics: AlwaysScrollableScrollPhysics(),
      child: DoctorEmptyState(
        icon: Icons.event_busy,
        title: 'No appointments',
        subtitle: 'There are no appointments matching this date or filter.',
      ),
    );
  }

  Future<void> _updateStatus(String id, String newStatus) async {
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) return;

      final appointmentId = int.tryParse(id);
      if (appointmentId == null) return;

      if (newStatus == 'IN_PROGRESS') {
        await DoctorService.startConsultation(token, appointmentId);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(newStatus == 'IN_PROGRESS' ? 'Consultation started' : 'Appointment updated'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), behavior: SnackBarBehavior.floating, backgroundColor: DS.rose700),
        );
      }
    }
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

  void _startCall(String id) {
    final apt = _allAppointments.firstWhere((a) => a.appointmentId.toString() == id, orElse: () => _allAppointments.first);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Connecting call with ${apt.patientName ?? "patient"}...'), behavior: SnackBarBehavior.floating, backgroundColor: DS.primary),
    );
  }
}

class _DateItemData {
  final DateTime date;
  final String label;
  final int day;
  final bool isToday;
  _DateItemData({required this.date, required this.label, required this.day, required this.isToday});
}

class _AppointmentCard extends StatelessWidget {
  final DoctorAppointment appointment;
  final Function(String id, String status) onUpdateStatus;
  final Function(String id) onStartCall;
  final Function(DoctorAppointment appointment) onComplete;

  const _AppointmentCard({required this.appointment, required this.onUpdateStatus, required this.onStartCall, required this.onComplete});

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');
    final time = appointment.appointmentTime != null ? timeFormat.format(appointment.appointmentTime!) : '--:--';
    final status = appointment.status?.toUpperCase() ?? 'PENDING';
    final showActions = status == 'CONFIRMED' || status == 'PENDING' || status == 'IN_PROGRESS';

    return Container(
      decoration: DS.cardDecoration,
      child: Column(
        children: [
          Padding(
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
                        Padding(padding: const EdgeInsets.only(top: 2), child: Text(appointment.symptoms!, style: const TextStyle(fontSize: 12, color: DS.mutedForeground), maxLines: 1, overflow: TextOverflow.ellipsis)),
                      const SizedBox(height: 6),
                      Row(children: [
                        DoctorConsultationPill(type: appointment.consultationType ?? 'VIDEO'),
                        const SizedBox(width: 8),
                        DoctorStatusBadge(status: status),
                      ]),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (showActions)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: DS.secondary.withOpacity(0.5),
                borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(12), bottomRight: Radius.circular(12)),
                border: const Border(top: BorderSide(color: DS.cardBorder)),
              ),
              child: Row(
                children: [
                  if (status == 'IN_PROGRESS') ...[
                    Expanded(child: _ActionButton(label: 'Complete', icon: Icons.check_circle_outline, color: DS.emerald600, filled: true, onTap: () => onComplete(appointment))),
                    if (appointment.consultationType?.toUpperCase() != 'CHAT') ...[
                      const SizedBox(width: 8),
                      _ActionButton(label: appointment.consultationType?.toUpperCase() == 'VIDEO' ? 'Video' : 'Audio', icon: appointment.consultationType?.toUpperCase() == 'VIDEO' ? Icons.videocam : Icons.phone, color: DS.primary, filled: false, onTap: () => onStartCall(appointment.appointmentId.toString())),
                    ],
                  ] else ...[
                    Expanded(child: _ActionButton(label: 'Start', icon: Icons.play_circle_outline, color: DS.primary, filled: true, onTap: () => onUpdateStatus(appointment.appointmentId.toString(), 'IN_PROGRESS'))),
                    const SizedBox(width: 8),
                    _ActionButton(label: 'Cancel', icon: Icons.close, color: DS.rose700, filled: false, onTap: () => onUpdateStatus(appointment.appointmentId.toString(), 'CANCELLED')),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool filled;
  final VoidCallback onTap;

  const _ActionButton({required this.label, required this.icon, required this.color, required this.filled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (filled) {
      return ElevatedButton.icon(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
        icon: Icon(icon, size: 16),
        label: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      );
    }
    return OutlinedButton.icon(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(foregroundColor: color, side: BorderSide(color: color), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
      icon: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
    );
  }
}
