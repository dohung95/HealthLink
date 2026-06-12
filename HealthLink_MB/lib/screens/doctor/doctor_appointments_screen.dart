import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_profile.dart';
import '../../config/api_config.dart';

class DoctorAppointmentsScreen extends StatefulWidget {
  const DoctorAppointmentsScreen({super.key});

  @override
  State<DoctorAppointmentsScreen> createState() => _DoctorAppointmentsScreenState();
}

class _DoctorAppointmentsScreenState extends State<DoctorAppointmentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _error;
  DoctorProfile? _profile;
  List<DoctorAppointment> _allAppointments = [];
  DateTime _selectedDate = DateTime.now();

  final List<String> _statusFilters = ['ALL', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statusFilters.length, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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

      // Load profile first
      _profile ??= await DoctorService.getProfile(token);

      // Load appointments for selected date
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

  List<DoctorAppointment> _getFilteredAppointments(String status) {
    if (status == 'ALL') return _allAppointments;
    return _allAppointments
        .where((a) => a.status?.toUpperCase() == status)
        .toList();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _loadData();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('Appointments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: _selectDate,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              // Date display
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Icon(Icons.event, color: theme.colorScheme.primary, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      DateFormat('EEEE, d MMMM yyyy').format(_selectedDate),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    const Spacer(),
                    if (!_isDateToday(_selectedDate))
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _selectedDate = DateTime.now();
                          });
                          _loadData();
                        },
                        child: const Text('Today'),
                      ),
                  ],
                ),
              ),
              // Status tabs
              TabBar(
                controller: _tabController,
                isScrollable: true,
                tabs: _statusFilters.map((s) => Tab(text: _formatStatus(s))).toList(),
              ),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorWidget()
              : TabBarView(
                  controller: _tabController,
                  children: _statusFilters.map((status) {
                    final appointments = _getFilteredAppointments(status);
                    return RefreshIndicator(
                      onRefresh: _loadData,
                      child: appointments.isEmpty
                          ? _buildEmptyState(status)
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: appointments.length,
                              itemBuilder: (context, index) {
                                return _buildAppointmentCard(theme, appointments[index]);
                              },
                            ),
                    );
                  }).toList(),
                ),
    );
  }

  bool _isDateToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  String _formatStatus(String status) {
    switch (status) {
      case 'ALL':
        return 'All';
      case 'PENDING':
        return 'Pending';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text(
              'Failed to load appointments',
              style: TextStyle(fontSize: 18, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(String status) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_available,
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            status == 'ALL'
                ? 'No appointments for this date'
                : 'No ${_formatStatus(status).toLowerCase()} appointments',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentCard(ThemeData theme, DoctorAppointment appointment) {
    final timeFormat = DateFormat('HH:mm');
    final time = appointment.appointmentTime != null
        ? timeFormat.format(appointment.appointmentTime!)
        : '--:--';

    Color statusColor;
    switch (appointment.status?.toUpperCase()) {
      case 'CONFIRMED':
        statusColor = Colors.blue;
        break;
      case 'IN_PROGRESS':
        statusColor = Colors.orange;
        break;
      case 'COMPLETED':
        statusColor = Colors.green;
        break;
      case 'CANCELLED':
      case 'NO_SHOW':
        statusColor = Colors.red;
        break;
      default:
        statusColor = Colors.grey;
    }

    IconData typeIcon;
    switch (appointment.consultationType?.toUpperCase()) {
      case 'VIDEO':
        typeIcon = Icons.videocam;
        break;
      case 'AUDIO':
        typeIcon = Icons.call;
        break;
      case 'CHAT':
        typeIcon = Icons.chat;
        break;
      default:
        typeIcon = Icons.person;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showAppointmentDetails(appointment),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Patient avatar
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                    backgroundImage: appointment.patientAvatar != null
                        ? NetworkImage(ApiConfig.normalizeUrl(appointment.patientAvatar!) ?? '')
                        : null,
                    child: appointment.patientAvatar == null
                        ? Icon(Icons.person, color: theme.colorScheme.primary)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          appointment.patientName ?? 'Unknown Patient',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(typeIcon, size: 16, color: theme.colorScheme.primary),
                            const SizedBox(width: 4),
                            Text(
                              appointment.consultationType ?? 'In-person',
                              style: TextStyle(
                                fontSize: 13,
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      appointment.status ?? 'PENDING',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                children: [
                  // Time
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 16, color: theme.colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        time,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 24),
                  // Fee
                  if (appointment.fee != null)
                    Row(
                      children: [
                        Icon(Icons.attach_money, size: 16, color: Colors.green.shade600),
                        Text(
                          '${appointment.fee!.toStringAsFixed(0)} VND',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.green.shade600,
                          ),
                        ),
                      ],
                    ),
                  const Spacer(),
                  // Action buttons based on status
                  if (appointment.status?.toUpperCase() == 'CONFIRMED')
                    ElevatedButton(
                      onPressed: () => _startConsultation(appointment),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: const Text('Start'),
                    ),
                  if (appointment.status?.toUpperCase() == 'IN_PROGRESS')
                    ElevatedButton(
                      onPressed: () => _completeAppointment(appointment),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: const Text('Complete'),
                    ),
                ],
              ),
              if (appointment.symptoms != null && appointment.symptoms!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.medical_information, size: 16, color: theme.colorScheme.onSurfaceVariant),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          appointment.symptoms!,
                          style: TextStyle(
                            fontSize: 13,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showAppointmentDetails(DoctorAppointment appointment) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return _AppointmentDetailsSheet(
            appointment: appointment,
            scrollController: scrollController,
            onStartConsultation: () {
              Navigator.pop(context);
              _startConsultation(appointment);
            },
            onCompleteAppointment: () {
              Navigator.pop(context);
              _completeAppointment(appointment);
            },
          );
        },
      ),
    );
  }

  Future<void> _startConsultation(DoctorAppointment appointment) async {
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) return;

      await DoctorService.startConsultation(token, appointment.appointmentId);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Consultation started')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _completeAppointment(DoctorAppointment appointment) async {
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => _CompleteAppointmentDialog(appointment: appointment),
    );

    if (result == null) return;

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) return;

      await DoctorService.completeAppointment(
        token,
        appointment.appointmentId,
        diagnosis: result['diagnosis'],
        notes: result['notes'],
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appointment completed')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}

class _AppointmentDetailsSheet extends StatelessWidget {
  final DoctorAppointment appointment;
  final ScrollController scrollController;
  final VoidCallback onStartConsultation;
  final VoidCallback onCompleteAppointment;

  const _AppointmentDetailsSheet({
    required this.appointment,
    required this.scrollController,
    required this.onStartConsultation,
    required this.onCompleteAppointment,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('EEEE, d MMMM yyyy');
    final timeFormat = DateFormat('HH:mm');

    return Container(
      padding: const EdgeInsets.all(20),
      child: ListView(
        controller: scrollController,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Title
          const Text(
            'Appointment Details',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          // Patient info
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                backgroundImage: appointment.patientAvatar != null
                    ? NetworkImage(ApiConfig.normalizeUrl(appointment.patientAvatar!) ?? '')
                    : null,
                child: appointment.patientAvatar == null
                    ? Icon(Icons.person, size: 30, color: theme.colorScheme.primary)
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appointment.patientName ?? 'Unknown Patient',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                    ),
                    if (appointment.patientPhone != null)
                      Text(
                        appointment.patientPhone!,
                        style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Details
          _buildDetailRow(Icons.calendar_today, 'Date',
              appointment.appointmentTime != null ? dateFormat.format(appointment.appointmentTime!) : '-'),
          _buildDetailRow(Icons.access_time, 'Time',
              appointment.appointmentTime != null ? timeFormat.format(appointment.appointmentTime!) : '-'),
          _buildDetailRow(Icons.videocam, 'Type', appointment.consultationType ?? 'In-person'),
          _buildDetailRow(Icons.info_outline, 'Status', appointment.status ?? 'Pending'),
          if (appointment.fee != null)
            _buildDetailRow(Icons.attach_money, 'Fee', '${appointment.fee!.toStringAsFixed(0)} VND'),
          const SizedBox(height: 16),
          // Symptoms
          if (appointment.symptoms != null) ...[
            const Text('Symptoms', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(appointment.symptoms!),
            ),
            const SizedBox(height: 16),
          ],
          // Notes
          if (appointment.notes != null) ...[
            const Text('Notes', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(appointment.notes!),
            ),
            const SizedBox(height: 16),
          ],
          // Actions
          const SizedBox(height: 24),
          if (appointment.status?.toUpperCase() == 'CONFIRMED')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onStartConsultation,
                child: const Text('Start Consultation'),
              ),
            ),
          if (appointment.status?.toUpperCase() == 'IN_PROGRESS')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onCompleteAppointment,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                child: const Text('Complete Appointment'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value),
        ],
      ),
    );
  }
}

class _CompleteAppointmentDialog extends StatefulWidget {
  final DoctorAppointment appointment;

  const _CompleteAppointmentDialog({required this.appointment});

  @override
  State<_CompleteAppointmentDialog> createState() => _CompleteAppointmentDialogState();
}

class _CompleteAppointmentDialogState extends State<_CompleteAppointmentDialog> {
  final _diagnosisController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _diagnosisController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Complete Appointment'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _diagnosisController,
              decoration: const InputDecoration(
                labelText: 'Diagnosis',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notes',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context, {
              'diagnosis': _diagnosisController.text,
              'notes': _notesController.text,
            });
          },
          child: const Text('Complete'),
        ),
      ],
    );
  }
}
