import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../models/doctor/doctor_patient.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import 'doctor_patient_detail_screen.dart';

/// Status filter options for patient list
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
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
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

  void _onFilterChanged(PatientStatusFilter filter) {
    if (_statusFilter == filter) return;
    setState(() {
      _statusFilter = filter;
    });
    _loadPatients(refresh: true);
  }

  String _getPatientStatus(DoctorPatient patient) {
    if (patient.nextAppointmentTime != null) return 'Upcoming';
    if (patient.lastAppointmentTime != null) return 'Recent';
    return 'Inactive';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.doctorColors;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text('My Patients'),
        backgroundColor: colors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Header section
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                // Search bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F7FA),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search by name or email...',
                        hintStyle: TextStyle(
                          color: colors.onSurfaceVariant,
                          fontSize: 14,
                        ),
                        prefixIcon: Icon(
                          Icons.search,
                          color: colors.onSurfaceVariant,
                        ),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 20),
                                onPressed: () {
                                  _searchController.clear();
                                  _onSearch('');
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                      onSubmitted: _onSearch,
                      onChanged: (v) {
                        Future.delayed(const Duration(milliseconds: 500), () {
                          if (v == _searchController.text) {
                            _onSearch(v);
                          }
                        });
                      },
                    ),
                  ),
                ),
                // Filter chips
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Row(
                    children: [
                      _buildFilterChip('All', PatientStatusFilter.all,
                          Icons.groups_outlined, colors),
                      const SizedBox(width: 10),
                      _buildFilterChip('Upcoming', PatientStatusFilter.upcoming,
                          Icons.event_outlined, colors),
                      const SizedBox(width: 10),
                      _buildFilterChip('Recent', PatientStatusFilter.recent,
                          Icons.history, colors),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Results count
          if (!_isLoading && _error == null && _patients.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Text(
                    '${_patients.length} patient${_patients.length != 1 ? 's' : ''}',
                    style: TextStyle(
                      color: colors.onSurfaceVariant,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          // Patient list
          Expanded(
            child: _isLoading
                ? Center(
                    child: CircularProgressIndicator(color: colors.primary))
                : _error != null
                    ? _buildErrorWidget(colors)
                    : _patients.isEmpty
                        ? _buildEmptyState(colors)
                        : RefreshIndicator(
                            onRefresh: () => _loadPatients(refresh: true),
                            color: colors.primary,
                            child: ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                              itemCount:
                                  _patients.length + (_isLoadingMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index == _patients.length) {
                                  return const Padding(
                                    padding: EdgeInsets.all(20),
                                    child: Center(
                                      child: CircularProgressIndicator(),
                                    ),
                                  );
                                }
                                return _buildPatientCard(
                                    _patients[index], colors);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(
    String label,
    PatientStatusFilter filter,
    IconData icon,
    DoctorColors colors,
  ) {
    final isActive = _statusFilter == filter;
    return Expanded(
      child: GestureDetector(
        onTap: () => _onFilterChanged(filter),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? colors.primary : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isActive ? colors.primary : const Color(0xFFE5E7EB),
              width: 1.5,
            ),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: colors.primary.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: isActive ? Colors.white : colors.onSurfaceVariant,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isActive ? Colors.white : colors.onSurfaceVariant,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorWidget(DoctorColors colors) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: colors.errorBg,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.error_outline, size: 40, color: colors.error),
            ),
            const SizedBox(height: 24),
            const Text(
              'Something went wrong',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Please try again',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _loadPatients(refresh: true),
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(DoctorColors colors) {
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

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F4F8),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: colors.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPatientCard(DoctorPatient patient, DoctorColors colors) {
    final status = _getPatientStatus(patient);
    final dateFormat = DateFormat('MMM d, yyyy');

    // Status styling
    Color statusColor;
    Color statusBg;
    IconData statusIcon;
    switch (status) {
      case 'Upcoming':
        statusColor = const Color(0xFF3B82F6);
        statusBg = const Color(0xFFEFF6FF);
        statusIcon = Icons.event;
        break;
      case 'Recent':
        statusColor = const Color(0xFF10B981);
        statusBg = const Color(0xFFECFDF5);
        statusIcon = Icons.check_circle;
        break;
      default:
        statusColor = const Color(0xFF6B7280);
        statusBg = const Color(0xFFF3F4F6);
        statusIcon = Icons.schedule;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => _navigateToPatientDetail(patient),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Top row: Avatar, Name, Status
                Row(
                  children: [
                    // Avatar
                    _buildAvatar(patient, colors),
                    const SizedBox(width: 14),
                    // Name & Email
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            patient.fullName ?? 'Unknown',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            patient.email ?? patient.phoneNumber ?? 'No contact',
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B7280),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(statusIcon, size: 14, color: statusColor),
                          const SizedBox(width: 4),
                          Text(
                            status,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Stats row
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      _buildStatItem(
                        Icons.calendar_today,
                        'Visits',
                        '${patient.totalAppointments}',
                        colors.primary,
                      ),
                      _buildDivider(),
                      _buildStatItem(
                        Icons.check_circle_outline,
                        'Completed',
                        '${patient.completedAppointments}',
                        const Color(0xFF10B981),
                      ),
                      _buildDivider(),
                      _buildStatItem(
                        Icons.bloodtype_outlined,
                        'Blood',
                        patient.bloodType ?? '-',
                        const Color(0xFFEF4444),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                // Date row
                Row(
                  children: [
                    Expanded(
                      child: _buildDateItem(
                        'Next Visit',
                        patient.nextAppointmentTime != null
                            ? dateFormat.format(patient.nextAppointmentTime!)
                            : 'Not scheduled',
                        Icons.event_available,
                        patient.nextAppointmentTime != null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDateItem(
                        'Last Visit',
                        patient.lastAppointmentTime != null
                            ? dateFormat.format(patient.lastAppointmentTime!)
                            : 'Never',
                        Icons.history,
                        patient.lastAppointmentTime != null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                // View details button
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () => _navigateToPatientDetail(patient),
                    style: TextButton.styleFrom(
                      backgroundColor:
                          colors.primary.withValues(alpha: 0.08),
                      foregroundColor: colors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'View Details',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
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
      ),
    );
  }

  Widget _buildAvatar(DoctorPatient patient, DoctorColors colors) {
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.primary,
            colors.primary.withValues(alpha: 0.7),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: patient.avatarUrl != null
          ? ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Image.network(
                ApiConfig.normalizeUrl(patient.avatarUrl!) ?? '',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _avatarPlaceholder(patient),
              ),
            )
          : _avatarPlaceholder(patient),
    );
  }

  Widget _avatarPlaceholder(DoctorPatient patient) {
    return Center(
      child: Text(
        (patient.fullName ?? 'P').substring(0, 1).toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 20,
        ),
      ),
    );
  }

  Widget _buildStatItem(
      IconData icon, String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 40,
      color: const Color(0xFFE5E7EB),
    );
  }

  Widget _buildDateItem(
      String label, String value, IconData icon, bool hasValue) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE5E7EB)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            size: 18,
            color: hasValue ? const Color(0xFF3B82F6) : const Color(0xFF9CA3AF),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: hasValue
                        ? const Color(0xFF1F2937)
                        : const Color(0xFF9CA3AF),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToPatientDetail(DoctorPatient patient) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DoctorPatientDetailScreen(patient: patient),
      ),
    );
  }
}
