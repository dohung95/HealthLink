import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_patient.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import 'doctor_patient_detail_screen.dart';

enum PatientStatusFilter { all, upcoming, recent }

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
  PatientStatusFilter _statusFilter = PatientStatusFilter.all;

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
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMore) {
        _loadMorePatients();
      }
    }
  }

  String _getStatusParam() {
    switch (_statusFilter) {
      case PatientStatusFilter.upcoming:
        return 'upcoming';
      case PatientStatusFilter.recent:
        return 'recent';
      case PatientStatusFilter.all:
        return 'all';
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
        status: _getStatusParam(),
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
          _error = e.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadMorePatients() async {
    if (_isLoadingMore || !_hasMore) return;

    setState(() => _isLoadingMore = true);

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) return;

      final result = await DoctorService.getPatients(
        token,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        status: _getStatusParam(),
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
      if (mounted) setState(() => _isLoadingMore = false);
    }
  }

  void _onSearch(String query) {
    setState(() => _searchQuery = query);
    _loadPatients(refresh: true);
  }

  void _onFilterChanged(PatientStatusFilter filter) {
    if (_statusFilter == filter) return;
    setState(() => _statusFilter = filter);
    _loadPatients(refresh: true);
  }

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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Patients', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: DS.foreground)),
                  SizedBox(height: 2),
                  Text('View and manage your patients', style: TextStyle(fontSize: 14, color: DS.mutedForeground)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: DS.cardDecoration,
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search patients...',
                    hintStyle: const TextStyle(color: DS.mutedForeground, fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: DS.mutedForeground, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18, color: DS.mutedForeground),
                            onPressed: () {
                              _searchController.clear();
                              _onSearch('');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  onSubmitted: _onSearch,
                  onChanged: (v) {
                    Future.delayed(const Duration(milliseconds: 500), () {
                      if (v == _searchController.text) _onSearch(v);
                    });
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Filter Chips
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  DoctorFilterChip(
                    label: 'All',
                    icon: Icons.groups_outlined,
                    selected: _statusFilter == PatientStatusFilter.all,
                    onTap: () => _onFilterChanged(PatientStatusFilter.all),
                  ),
                  const SizedBox(width: 8),
                  DoctorFilterChip(
                    label: 'Upcoming',
                    icon: Icons.event_outlined,
                    selected: _statusFilter == PatientStatusFilter.upcoming,
                    onTap: () => _onFilterChanged(PatientStatusFilter.upcoming),
                  ),
                  const SizedBox(width: 8),
                  DoctorFilterChip(
                    label: 'Recent',
                    icon: Icons.history,
                    selected: _statusFilter == PatientStatusFilter.recent,
                    onTap: () => _onFilterChanged(PatientStatusFilter.recent),
                  ),
                ],
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
                          onRefresh: () => _loadPatients(refresh: true),
                          child: _patients.isEmpty
                              ? _buildEmptyState()
                              : ListView.separated(
                                  controller: _scrollController,
                                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                                  itemCount: _patients.length + (_isLoadingMore ? 1 : 0),
                                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                                  itemBuilder: (context, index) {
                                    if (index == _patients.length) {
                                      return const Padding(
                                        padding: EdgeInsets.all(20),
                                        child: Center(child: CircularProgressIndicator(color: DS.primary)),
                                      );
                                    }
                                    return _PatientCard(
                                      patient: _patients[index],
                                      onTap: () => _navigateToDetail(_patients[index]),
                                    );
                                  },
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
            const Text('Failed to load patients', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _loadPatients(refresh: true),
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
    IconData icon;
    String title;
    String subtitle;

    if (_searchQuery.isNotEmpty) {
      icon = Icons.search_off;
      title = 'No results found';
      subtitle = 'Try searching with different keywords';
    } else if (_statusFilter == PatientStatusFilter.upcoming) {
      icon = Icons.event_busy;
      title = 'No upcoming appointments';
      subtitle = 'Patients with scheduled visits will appear here';
    } else if (_statusFilter == PatientStatusFilter.recent) {
      icon = Icons.history_toggle_off;
      title = 'No recent visits';
      subtitle = 'Patients you\'ve recently seen will appear here';
    } else {
      icon = Icons.people_outline;
      title = 'No patients yet';
      subtitle = 'Your patients will appear here after appointments';
    }

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: DoctorEmptyState(icon: icon, title: title, subtitle: subtitle),
    );
  }

  void _navigateToDetail(DoctorPatient patient) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => DoctorPatientDetailScreen(patient: patient)),
    );
  }
}

class _PatientCard extends StatelessWidget {
  final DoctorPatient patient;
  final VoidCallback onTap;

  const _PatientCard({required this.patient, required this.onTap});

  String _getStatus() {
    if (patient.nextAppointmentTime != null) return 'Upcoming';
    if (patient.lastAppointmentTime != null) return 'Recent';
    return 'Inactive';
  }

  @override
  Widget build(BuildContext context) {
    final status = _getStatus();
    final dateFormat = DateFormat('MMM d, yyyy');

    Color statusBg;
    Color statusText;
    IconData statusIcon;

    switch (status) {
      case 'Upcoming':
        statusBg = DS.sky100;
        statusText = DS.sky700;
        statusIcon = Icons.event;
        break;
      case 'Recent':
        statusBg = DS.emerald100;
        statusText = DS.emerald700;
        statusIcon = Icons.check_circle;
        break;
      default:
        statusBg = DS.secondary;
        statusText = DS.mutedForeground;
        statusIcon = Icons.schedule;
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: DS.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: DS.cardBorder),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4, offset: const Offset(0, 1))],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Top row
              Row(
                children: [
                  DoctorPersonAvatar(
                    name: patient.fullName ?? 'Patient',
                    imageUrl: patient.avatarUrl != null ? ApiConfig.normalizeUrl(patient.avatarUrl!) : null,
                    size: 48,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(patient.fullName ?? 'Unknown', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: DS.foreground)),
                        const SizedBox(height: 2),
                        Text(patient.email ?? patient.phoneNumber ?? 'No contact', style: const TextStyle(fontSize: 13, color: DS.mutedForeground), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 12, color: statusText),
                        const SizedBox(width: 4),
                        Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusText)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Stats row
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: DS.secondary.withOpacity(0.5), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    _StatItem(icon: Icons.calendar_today, label: 'Visits', value: '${patient.totalAppointments}', color: DS.primary),
                    Container(width: 1, height: 36, color: DS.cardBorder),
                    _StatItem(icon: Icons.check_circle_outline, label: 'Completed', value: '${patient.completedAppointments}', color: DS.emerald600),
                    Container(width: 1, height: 36, color: DS.cardBorder),
                    _StatItem(icon: Icons.bloodtype_outlined, label: 'Blood', value: patient.bloodType ?? '-', color: DS.rose500),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Date row
              Row(
                children: [
                  Expanded(
                    child: _DateItem(
                      label: 'Next Visit',
                      value: patient.nextAppointmentTime != null ? dateFormat.format(patient.nextAppointmentTime!) : 'Not scheduled',
                      icon: Icons.event_available,
                      hasValue: patient.nextAppointmentTime != null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DateItem(
                      label: 'Last Visit',
                      value: patient.lastAppointmentTime != null ? dateFormat.format(patient.lastAppointmentTime!) : 'Never',
                      icon: Icons.history,
                      hasValue: patient.lastAppointmentTime != null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // View details button
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: onTap,
                  style: TextButton.styleFrom(
                    backgroundColor: DS.primary.withOpacity(0.08),
                    foregroundColor: DS.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Text('View Details', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      SizedBox(width: 6),
                      Icon(Icons.arrow_forward_ios, size: 14),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatItem({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: DS.foreground)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, color: DS.mutedForeground)),
        ],
      ),
    );
  }
}

class _DateItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool hasValue;

  const _DateItem({required this.label, required this.value, required this.icon, required this.hasValue});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(border: Border.all(color: DS.cardBorder), borderRadius: BorderRadius.circular(10)),
      child: Row(
        children: [
          Icon(icon, size: 16, color: hasValue ? DS.sky600 : DS.mutedForeground.withOpacity(0.5)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: DS.mutedForeground.withOpacity(0.7))),
                const SizedBox(height: 2),
                Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: hasValue ? DS.foreground : DS.mutedForeground.withOpacity(0.5)), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
