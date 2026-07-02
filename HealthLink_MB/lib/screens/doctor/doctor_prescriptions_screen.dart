import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/prescription_detail_sheet.dart';

typedef DS = DoctorStyles;

class DoctorPrescriptionsScreen extends StatefulWidget {
  const DoctorPrescriptionsScreen({super.key});

  @override
  State<DoctorPrescriptionsScreen> createState() =>
      _DoctorPrescriptionsScreenState();
}

class _DoctorPrescriptionsScreenState
    extends State<DoctorPrescriptionsScreen> {
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _all = [];
  String _filter = 'ALL';
  String _search = '';
  final _searchCtrl = TextEditingController();
  String? _doctorName;
  String? _doctorSpecialty;

  static const _filters = ['ALL', 'ACTIVE', 'ISSUED', 'EXPIRED'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
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

      final profile = await DoctorService.getProfile(token);
      final prescriptions =
          await DoctorService.getPrescriptions(token, profile.doctorId);

      if (mounted) {
        setState(() {
          _all = prescriptions;
          _doctorName = profile.fullName;
          _doctorSpecialty = profile.specialtyName ?? profile.specialty;
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

  int _countFor(String filterKey) {
    if (filterKey == 'ALL') return _all.length;
    return _all.where((p) => (p['status'] as String? ?? '').toUpperCase() == filterKey).length;
  }

  List<Map<String, dynamic>> get _filtered {
    return _all.where((p) {
      final status = (p['status'] as String? ?? '').toUpperCase();
      final patientName =
          (p['patientName'] as String? ?? '').toLowerCase();
      final matchFilter = _filter == 'ALL' || status == _filter;
      final matchSearch =
          _search.isEmpty || patientName.contains(_search.toLowerCase());
      return matchFilter && matchSearch;
    }).toList();
  }

  Color _statusColor(String? status) {
    switch ((status ?? '').toUpperCase()) {
      case 'ACTIVE':
        return DS.emerald600;
      case 'ISSUED':
        return DS.amber600;
      case 'EXPIRED':
        return DS.mutedForeground;
      default:
        return DS.mutedForeground;
    }
  }

  String _formatDate(dynamic raw) {
    if (raw == null) return '—';
    try {
      final dt = raw is String ? DateTime.parse(raw) : raw as DateTime;
      return DateFormat('dd MMM yyyy').format(dt);
    } catch (_) {
      return raw.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            _buildSearchBar(),
            _buildFilterBar(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: TextField(
        controller: _searchCtrl,
        onChanged: (v) => setState(() => _search = v),
        style: const TextStyle(fontSize: 14, color: DS.foreground),
        decoration: InputDecoration(
          hintText: 'Search by patient name...',
          hintStyle: const TextStyle(color: DS.mutedForeground, fontSize: 14),
          prefixIcon:
              const Icon(Icons.search, color: DS.mutedForeground, size: 20),
          suffixIcon: _search.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear,
                      color: DS.mutedForeground, size: 18),
                  onPressed: () {
                    _searchCtrl.clear();
                    setState(() => _search = '');
                  },
                )
              : null,
          filled: true,
          fillColor: DS.card,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: DS.cardBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: DS.cardBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: DS.primary),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterBar() {
    return SizedBox(
      height: 52,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Expanded(
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final f = _filters[i];
                  final isActive = f == _filter;
                  return GestureDetector(
                    onTap: () => setState(() => _filter = f),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding:
                          const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isActive ? DS.primary : DS.card,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isActive ? DS.primary : DS.cardBorder,
                        ),
                      ),
                      child: Text(
                        '${f == 'ALL' ? 'All' : f[0] + f.substring(1).toLowerCase()} (${_countFor(f)})',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: isActive ? Colors.white : DS.mutedForeground,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh, color: DS.mutedForeground, size: 28),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 34, minHeight: 36),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: DS.primary),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: DS.destructive, size: 48),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: DS.mutedForeground, fontSize: 14),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: DS.primary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final items = _filtered;
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.medication_outlined,
                size: 56, color: DS.mutedForeground.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              _search.isNotEmpty || _filter != 'ALL'
                  ? 'No prescriptions match your filter.'
                  : 'No prescriptions yet.',
              style:
                  const TextStyle(color: DS.mutedForeground, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: DS.primary,
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        itemCount: items.length,
        itemBuilder: (context, index) => _PrescriptionCard(
          data: items[index],
          statusColor: _statusColor(items[index]['status'] as String?),
          formatDate: _formatDate,
          onTap: () => _showDetail(items[index]),
        ),
      ),
    );
  }

  void _showDetail(Map<String, dynamic> prescription) {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PrescriptionDetailSheet(
        prescription: prescription,
        token: token,
        doctorName: _doctorName,
        doctorSpecialty: _doctorSpecialty,
      ),
    );
  }
}

class _PrescriptionCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final Color statusColor;
  final String Function(dynamic) formatDate;
  final VoidCallback onTap;

  const _PrescriptionCard({
    required this.data,
    required this.statusColor,
    required this.formatDate,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final createdAt = data['createdAt'] ?? data['issueDate'] ?? data['date'];
    final rxId = data['prescriptionHeaderId'] != null
        ? 'RX-${data['prescriptionHeaderId'].toString().padLeft(4, '0')}'
        : 'RX-0000';
    final medCount = (data['items'] as List<dynamic>? ?? []).length;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DS.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: DS.cardBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              formatDate(createdAt),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.primary),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: Text(
                    rxId,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: DS.foreground),
                  ),
                ),
                Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              '$medCount med${medCount == 1 ? '' : 's'}',
              style: const TextStyle(fontSize: 12, color: DS.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}
