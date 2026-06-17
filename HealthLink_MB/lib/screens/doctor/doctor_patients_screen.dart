import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_patient.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';

class DoctorPatientsScreen extends StatefulWidget {
  const DoctorPatientsScreen({super.key});

  @override
  State<DoctorPatientsScreen> createState() => _DoctorPatientsScreenState();
}

class _DoctorPatientsScreenState extends State<DoctorPatientsScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _error;
  List<DoctorPatient> _patients = [];
  int _currentPage = 0;
  bool _hasMore = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadPatients();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMore) {
        _loadMorePatients();
      }
    }
  }

  Future<void> _loadPatients({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 0;
        _hasMore = true;
      });
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final result = await DoctorService.getPatients(
        token,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        page: 1,
        pageSize: 20,
      );

      if (mounted) {
        setState(() {
          _patients = result.patients;
          _currentPage = 1;
          _hasMore = result.hasNext;
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

  Future<void> _loadMorePatients() async {
    if (_isLoadingMore || !_hasMore) return;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) return;

      final result = await DoctorService.getPatients(
        token,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        page: _currentPage + 1,
        pageSize: 20,
      );

      if (mounted) {
        setState(() {
          _patients.addAll(result.patients);
          _currentPage++;
          _hasMore = result.hasNext;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
        });
      }
    }
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query;
    });
    _loadPatients(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('My Patients'),
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search patients...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
              ),
              onSubmitted: _onSearch,
            ),
          ),
          // Patient list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _buildErrorWidget()
                    : _patients.isEmpty
                        ? _buildEmptyState()
                        : RefreshIndicator(
                            onRefresh: () => _loadPatients(refresh: true),
                            child: ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _patients.length + (_isLoadingMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index == _patients.length) {
                                  return const Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(child: CircularProgressIndicator()),
                                  );
                                }
                                return _buildPatientCard(theme, _patients[index]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    final colors = context.doctorColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: colors.error),
            const SizedBox(height: 16),
            Text(
              'Failed to load patients',
              style: TextStyle(fontSize: 18, color: colors.onSurfaceVariant),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: colors.onSurfaceVariant.withOpacity(0.7)),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _loadPatients(refresh: true),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final colors = context.doctorColors;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 64,
            color: colors.onSurfaceVariant.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            _searchQuery.isNotEmpty
                ? 'No patients found for "$_searchQuery"'
                : 'No patients yet',
            style: TextStyle(
              fontSize: 16,
              color: colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPatientCard(ThemeData theme, DoctorPatient patient) {
    final colors = context.doctorColors;
    final dateFormat = DateFormat('dd/MM/yyyy');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showPatientDetails(patient),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 28,
                backgroundColor: colors.primary.withOpacity(0.1),
                backgroundImage: patient.avatarUrl != null
                    ? NetworkImage(ApiConfig.normalizeUrl(patient.avatarUrl!) ?? '')
                    : null,
                child: patient.avatarUrl == null
                    ? Icon(Icons.person, size: 28, color: colors.primary)
                    : null,
              ),
              const SizedBox(width: 16),
              // Patient info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patient.fullName ?? 'Unknown Patient',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (patient.gender != null) ...[
                          Icon(
                            patient.gender?.toLowerCase() == 'male'
                                ? Icons.male
                                : Icons.female,
                            size: 16,
                            color: colors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                        ],
                        if (patient.age != null)
                          Text(
                            '${patient.age} years',
                            style: TextStyle(
                              fontSize: 13,
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        if (patient.bloodType != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: colors.bloodTypeBg,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              patient.bloodType!,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: colors.bloodType,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.event, size: 14, color: colors.onSurfaceVariant),
                        const SizedBox(width: 4),
                        Text(
                          '${patient.totalAppointments} visits',
                          style: TextStyle(
                            fontSize: 12,
                            color: colors.onSurfaceVariant,
                          ),
                        ),
                        if (patient.lastAppointmentTime != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            'Last: ${dateFormat.format(patient.lastAppointmentTime!)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              // Arrow
              Icon(
                Icons.chevron_right,
                color: colors.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPatientDetails(DoctorPatient patient) {
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
          return _PatientDetailsSheet(
            patient: patient,
            scrollController: scrollController,
          );
        },
      ),
    );
  }
}

class _PatientDetailsSheet extends StatefulWidget {
  final DoctorPatient patient;
  final ScrollController scrollController;

  const _PatientDetailsSheet({
    required this.patient,
    required this.scrollController,
  });

  @override
  State<_PatientDetailsSheet> createState() => _PatientDetailsSheetState();
}

class _PatientDetailsSheetState extends State<_PatientDetailsSheet> {
  bool _isLoadingHistory = true;
  Map<String, dynamic>? _history;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) return;

      final history = await DoctorService.getPatientHistory(token, widget.patient.patientId);

      if (mounted) {
        setState(() {
          _history = history;
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingHistory = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.doctorColors;

    return Container(
      padding: const EdgeInsets.all(20),
      child: ListView(
        controller: widget.scrollController,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colors.divider,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Patient header
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: colors.primary.withOpacity(0.1),
                backgroundImage: widget.patient.avatarUrl != null
                    ? NetworkImage(ApiConfig.normalizeUrl(widget.patient.avatarUrl!) ?? '')
                    : null,
                child: widget.patient.avatarUrl == null
                    ? Icon(Icons.person, size: 36, color: colors.primary)
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.patient.fullName ?? 'Unknown Patient',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    if (widget.patient.phoneNumber != null)
                      Row(
                        children: [
                          Icon(Icons.phone, size: 16, color: colors.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text(
                            widget.patient.phoneNumber!,
                            style: TextStyle(color: colors.onSurfaceVariant),
                          ),
                        ],
                      ),
                    if (widget.patient.email != null)
                      Row(
                        children: [
                          Icon(Icons.email, size: 16, color: colors.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text(
                            widget.patient.email!,
                            style: TextStyle(color: colors.onSurfaceVariant),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Patient info cards
          Row(
            children: [
              Expanded(
                child: _buildInfoCard(
                  context,
                  icon: Icons.cake,
                  label: 'Age',
                  value: widget.patient.age != null ? '${widget.patient.age} years' : '-',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoCard(
                  context,
                  icon: Icons.bloodtype,
                  label: 'Blood Type',
                  value: widget.patient.bloodType ?? '-',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoCard(
                  context,
                  icon: Icons.person,
                  label: 'Gender',
                  value: widget.patient.gender ?? '-',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Statistics
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  context,
                  icon: Icons.event,
                  label: 'Total Visits',
                  value: '${widget.patient.totalAppointments}',
                  color: colors.statAppointments,
                  bgColor: colors.statAppointmentsBg,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  context,
                  icon: Icons.check_circle,
                  label: 'Completed',
                  value: '${widget.patient.completedAppointments}',
                  color: colors.statCompleted,
                  bgColor: colors.statCompletedBg,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // History section
          const Text(
            'Medical History',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          if (_isLoadingHistory)
            const Center(child: CircularProgressIndicator())
          else if (_history == null)
            Center(
              child: Text(
                'No medical history available',
                style: TextStyle(color: colors.onSurfaceVariant),
              ),
            )
          else
            _buildHistorySection(),
          const SizedBox(height: 16),
          // Next appointment
          if (widget.patient.nextAppointmentTime != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.event, color: colors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Next Appointment',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          DateFormat('EEEE, d MMMM yyyy HH:mm')
                              .format(widget.patient.nextAppointmentTime!),
                          style: TextStyle(color: colors.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
  }) {
    final colors = context.doctorColors;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, size: 24, color: colors.onSurfaceVariant),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: colors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required Color color,
    required Color bgColor,
  }) {
    final colors = context.doctorColors;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: colors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistorySection() {
    final colors = context.doctorColors;
    final appointments = _history?['appointments'] as List<dynamic>? ?? [];

    if (appointments.isEmpty) {
      return Center(
        child: Text(
          'No appointment history',
          style: TextStyle(color: colors.onSurfaceVariant),
        ),
      );
    }

    return Column(
      children: appointments.take(5).map((apt) {
        final date = DateTime.tryParse(apt['appointmentTime']?.toString() ?? '');
        final status = apt['status'] as String? ?? 'Unknown';
        final diagnosis = apt['diagnosis'] as String?;
        final statusColor = colors.getStatusColor(status);
        final statusBgColor = colors.getStatusBgColor(status);

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: colors.cardBorder),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.event,
                  color: statusColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      date != null
                          ? DateFormat('dd MMM yyyy').format(date)
                          : 'Unknown date',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    if (diagnosis != null)
                      Text(
                        diagnosis,
                        style: TextStyle(
                          fontSize: 13,
                          color: colors.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
