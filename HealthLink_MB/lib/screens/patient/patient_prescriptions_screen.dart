import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../providers/auth_provider.dart';
import '../../services/patient_service.dart';
import '../../l10n/app_localizations.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  // Quản lý tab hiện tại cho BottomNavigationBar (Tab Records đang được chọn - Index 4)
  int _currentIndex = 4;

  // Quản lý bộ lọc đang được chọn
  String _selectedFilter = 'All';
  final List<String> _filters = ['All', 'Active', 'Completed'];

  bool _isLoading = true;
  String _errorMessage = '';
  List<dynamic> _prescriptions = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchPrescriptions();
    });
  }

  Future<void> _fetchPrescriptions() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      final authProvider = context.read<AuthProvider>();
      final token = authProvider.accessToken ?? '';
      final patientId = authProvider.userId ?? '';

      if (token.isEmpty || patientId.isEmpty) {
        throw Exception('User is not logged in');
      }

      final data = await PatientService.getPrescriptions(token, patientId);
      if (mounted) {
        setState(() {
          _prescriptions = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  String _formatDate(dynamic issueDate, BuildContext context) {
    if (issueDate == null) return AppLocalizations.of(context)!.labelNA;
    if (issueDate is String) {
      try {
        final dt = DateTime.parse(issueDate);
        return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
      } catch (_) {
        return issueDate;
      }
    } else if (issueDate is List && issueDate.length >= 3) {
      final year = issueDate[0];
      final month = issueDate[1].toString().padLeft(2, '0');
      final day = issueDate[2].toString().padLeft(2, '0');
      return '$day/$month/$year';
    }
    return issueDate.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      body: SafeArea(
        bottom: false, // Để BottomNav trát viền dưới cùng
        child: Column(
          children: [
            _buildAppBar(),
            Expanded(
              child: RefreshIndicator(
                color: Theme.of(context).colorScheme.primary,
                onRefresh: _fetchPrescriptions,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.only(left: 16, right: 16, top: 24, bottom: 96), // pb-24
                child: Center(
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 768), // max-w-3xl
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Tiêu đề trang
                        Text(
                          AppLocalizations.of(context)!.prescriptionsTitle,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onBackground,
                            letterSpacing: -0.64,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          AppLocalizations.of(context)!.prescriptionsSubtitle,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 16,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Thanh bộ lọc (Filter Chips)
                        _buildFilterChips(),
                        const SizedBox(height: 16),

                        // Danh sách Đơn thuốc (Grid/Column)
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final bool isWide = constraints.maxWidth > 600;
                            if (isWide) {
                              // Trưng bày Grid 2 cột trên Tablet
                              return GridView.count(
                                crossAxisCount: 2,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                crossAxisSpacing: 16,
                                mainAxisSpacing: 16,
                                childAspectRatio: 1.1,
                                children: _buildPrescriptionCards(),
                              );
                            }
                            // Trưng bày List 1 cột trên Mobile
                            return Column(
                              children: _buildPrescriptionCards()
                                  .map((card) => Padding(padding: const EdgeInsets.only(bottom: 16), child: card))
                                  .toList(),
                            );
                          },
                        ),
                      ],
                    ),
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

  // --- 1. Top App Bar ---
  Widget _buildAppBar() {
    final authProvider = context.watch<AuthProvider>();
    final profile = authProvider.patientProfile ?? {};
    final avatarUrl = profile['avatarUrl']?.toString();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.surface, // surface-bright
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () {
                  Scaffold.of(context).openDrawer();
                },
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Theme.of(context).colorScheme.surfaceVariant,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: avatarUrl != null && avatarUrl.isNotEmpty
                        ? Image.network(
                            avatarUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Icon(Icons.person, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          )
                        : Icon(Icons.person, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              Text(
                'HealthLink',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  // --- 2. Filter Chips ---
  Widget _buildFilterChips() {
    final filtersLocal = [
      AppLocalizations.of(context)!.filterAll,
      AppLocalizations.of(context)!.filterActive,
      AppLocalizations.of(context)!.filterCompleted
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(_filters.length, (index) {
          final filter = _filters[index];
          final label = filtersLocal[index];
          final bool isSelected = _selectedFilter == filter;
          
          return Padding(
            padding: const EdgeInsets.only(right: 12.0),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedFilter = filter;
                });
              },
              borderRadius: BorderRadius.circular(100),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(
                    color: isSelected ? Colors.transparent : Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isSelected ? Theme.of(context).colorScheme.onPrimary : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  // --- 3. Dữ liệu các Card Đơn thuốc ---
  List<Widget> _buildPrescriptionCards() {
    if (_isLoading) {
      return [const Center(child: Padding(padding: EdgeInsets.all(32.0), child: CircularProgressIndicator()))];
    }
    if (_errorMessage.isNotEmpty) {
      return [
        Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Text(_errorMessage, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        )
      ];
    }
    if (_prescriptions.isEmpty) {
      return [Center(child: Padding(padding: const EdgeInsets.all(32.0), child: Text(AppLocalizations.of(context)!.prescriptionNoFound)))];
    }

    final filtered = _prescriptions.where((p) {
      if (_selectedFilter == 'All') return true;
      final status = (p['status']?.toString() ?? '').toUpperCase();
      if (_selectedFilter == 'Active') return status == 'ACTIVE';
      if (_selectedFilter == 'Completed') return status == 'COMPLETED' || status == 'FINISHED';
      return true;
    }).toList();

    if (filtered.isEmpty) {
      return [Center(child: Padding(padding: const EdgeInsets.all(32.0), child: Text(AppLocalizations.of(context)!.prescriptionNoMatch)))];
    }

    return filtered.map((p) {
      final status = (p['status']?.toString() ?? 'UNKNOWN').toUpperCase();
      final isActive = status == 'ACTIVE';
      final items = p['items'] as List<dynamic>? ?? [];

      String displayStatus = status;
      if (status == 'ISSUED') displayStatus = AppLocalizations.of(context)!.statusIssued;
      else if (status == 'ACTIVE') displayStatus = AppLocalizations.of(context)!.filterActive;
      else if (status == 'COMPLETED' || status == 'FINISHED') displayStatus = AppLocalizations.of(context)!.filterCompleted;

      return _buildPrescriptionCard(
        doctorName: p['doctorName']?.toString() ?? 'Unknown Doctor',
        specialty: AppLocalizations.of(context)!.prescriptionLabel, // Not provided by API usually
        status: displayStatus,
        date: _formatDate(p['issueDate'], context),
        condition: p['diagnosis']?.toString() ?? AppLocalizations.of(context)!.labelNA,
        medCount: items.length,
        isActive: isActive,
        onTap: () => _showPrescriptionDetailsModal(context, p),
      );
    }).toList();
  }

  // --- 4. Card Đơn thuốc Item ---
  Widget _buildPrescriptionCard({
    required String doctorName,
    required String specialty,
    required String status,
    required String date,
    required String condition,
    required int medCount,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    // Màu sắc thay đổi theo trạng thái Active / Finished
    final Color iconBgColor = isActive ? Theme.of(context).colorScheme.secondaryContainer : Theme.of(context).colorScheme.surfaceVariant;
    final Color iconColor = isActive ? Theme.of(context).colorScheme.onSecondaryContainer : Theme.of(context).colorScheme.onSurfaceVariant;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface, // bg-surface-container-lowest
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
          boxShadow: [
            BoxShadow(color: const Color(0xFF0F3D38).withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          children: [
            // Header: Bác sĩ + Trạng thái
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(color: iconBgColor, shape: BoxShape.circle),
                        child: Icon(Icons.medication_outlined, color: iconColor),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              doctorName,
                              style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onBackground),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              specialty,
                              style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: iconBgColor, borderRadius: BorderRadius.circular(100)),
                  child: Text(
                    status,
                    style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: iconColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Body: Bệnh lý & Ngày
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface.withOpacity(0.5), // surface-container-low
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(AppLocalizations.of(context)!.prescriptionDateIssued, style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                        const SizedBox(height: 4),
                        Text(date, style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onBackground)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(AppLocalizations.of(context)!.prescriptionCondition, style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                        const SizedBox(height: 4),
                        Text(condition, style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onBackground)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Footer: Nút xem chi tiết
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  AppLocalizations.of(context)!.prescriptionMedicationsCount(medCount),
                  style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: isActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurfaceVariant),
                ),
                Row(
                  children: [
                    Text(
                      AppLocalizations.of(context)!.btnViewDetails,
                      style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: isActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                    Icon(Icons.chevron_right, size: 18, color: isActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurfaceVariant),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- 5. Modal Chi tiết Đơn thuốc (Bottom Sheet) ---
  void _showPrescriptionDetailsModal(BuildContext context, Map<String, dynamic> prescription) {
      final status = (prescription['status']?.toString() ?? 'UNKNOWN').toUpperCase();
      final isActive = status == 'ACTIVE';
      final items = prescription['items'] as List<dynamic>? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true, // Cho phép modal cao tùy chỉnh
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85, // max-h-[751px]
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)), // rounded-t-xl
          ),
          child: Column(
            children: [
              // Sticky Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.3))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      AppLocalizations.of(context)!.prescriptionDetailsTitle,
                      style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onBackground),
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.print_outlined),
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          onPressed: () => _printPrescription(prescription),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Scrollable Content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Overview box
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3), // bg-surface-container
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.local_hospital, color: Theme.of(context).colorScheme.primary),
                                const SizedBox(width: 8),
                                Expanded(child: Text(prescription['diagnosis']?.toString() ?? 'N/A', style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onBackground))),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text('${AppLocalizations.of(context)!.labelDoctor} ${prescription['doctorName'] ?? 'Unknown Doctor'}', style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                            const SizedBox(height: 4),
                            Text('${AppLocalizations.of(context)!.labelDate} ${_formatDate(prescription['issueDate'], context)}', style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                            if (prescription['notes'] != null && prescription['notes'].toString().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Text(AppLocalizations.of(context)!.prescriptionNotes(prescription['notes'].toString()), style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant, fontStyle: FontStyle.italic)),
                            ]
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      Text(AppLocalizations.of(context)!.medicationListCount(items.length), style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onBackground)),
                      const SizedBox(height: 12),

                      ...items.map((item) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12.0),
                          child: _buildMedicationItem(
                            name: item['medicationName']?.toString() ?? 'Unknown Medication',
                            dosage: item['dosage']?.toString() ?? '',
                            instruction: item['instructions']?.toString() ?? '',
                            note: item['notes']?.toString() ?? '',
                            icon: Icons.medication,
                            noteColor: Theme.of(context).colorScheme.primary,
                            noteIcon: Icons.info_outline,
                          ),
                        );
                      }).toList(),
                    ],
                  ),
                ),
              ),

              // Sticky Footer Button
              if (isActive)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.3))),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      onPressed: () {
                        // Xử lý cài đặt nhắc nhở uống thuốc
                        Navigator.pop(context);
                      },
                      icon: const Icon(Icons.alarm_add, size: 20),
                      label: Text(
                        AppLocalizations.of(context)!.prescriptionSetReminder,
                        style: const TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  // Widget hiển thị từng loại thuốc trong Modal
  Widget _buildMedicationItem({
    required String name,
    required String dosage,
    required String instruction,
    required String note,
    required IconData icon,
    required Color noteColor,
    required IconData noteIcon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondaryContainer, shape: BoxShape.circle),
            child: Icon(icon, color: Theme.of(context).colorScheme.onSecondaryContainer, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onBackground),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceVariant, borderRadius: BorderRadius.circular(6)),
                      child: Text(dosage, style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(instruction, style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                if (note.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5), // bg-surface-container-low
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(noteIcon, size: 16, color: noteColor),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            note,
                            style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: noteColor),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- 6. Xử lý In Đơn thuốc ---
  Future<void> _printPrescription(Map<String, dynamic> prescription) async {
    final pdf = pw.Document();
    final items = prescription['items'] as List<dynamic>? ?? [];

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context pwContext) {
          return [
            // Header
            pw.Container(
              alignment: pw.Alignment.center,
              padding: const pw.EdgeInsets.only(bottom: 16),
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(width: 2)),
              ),
              child: pw.Column(
                children: [
                  pw.Text('HEALTHLINK', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 4),
                  pw.Text('21 bis Hau Giang, Tan Son Nhat Ward, Ho Chi Minh City.', style: const pw.TextStyle(fontSize: 10)),
                  pw.Text('Phone: +(002) 0174-8812-598 | Email: HealthLink@gmail.com', style: const pw.TextStyle(fontSize: 10)),
                  pw.Text('Website: https://www.healthlink.com', style: const pw.TextStyle(fontSize: 10)),
                  pw.SizedBox(height: 16),
                  pw.Text('MEDICAL PRESCRIPTION', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, decoration: pw.TextDecoration.underline)),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            // Prescription Info
            pw.Text('Prescription from ${prescription['doctorName'] ?? 'Unknown Doctor'}', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.Text('${AppLocalizations.of(context)!.prescriptionDateIssued}: ${_formatDate(prescription['issueDate'], context)}', style: const pw.TextStyle(fontSize: 12)),
            pw.Text('${AppLocalizations.of(context)!.prescriptionCondition}: ${prescription['diagnosis'] ?? 'N/A'}', style: const pw.TextStyle(fontSize: 12)),
            pw.SizedBox(height: 20),

            // Medication List
            pw.Text('Medication Details', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 10),
            
            pw.TableHelper.fromTextArray(
              context: pwContext,
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
              cellStyle: const pw.TextStyle(fontSize: 10),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey200),
              headers: ['Medication', 'Dosage', 'Instructions', 'Notes'],
              data: items.map((item) => [
                item['medicationName']?.toString() ?? '',
                item['dosage']?.toString() ?? '',
                item['instructions']?.toString() ?? '',
                item['notes']?.toString() ?? '',
              ]).toList(),
            ),

            // Doctor's Advice
            if (prescription['notes'] != null && prescription['notes'].toString().isNotEmpty) ...[
              pw.SizedBox(height: 20),
              pw.Text('Doctor\'s Advice', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 8),
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.black, width: 1),
                ),
                child: pw.Text(prescription['notes'].toString(), style: const pw.TextStyle(fontSize: 10)),
              ),
            ]
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Prescription_${prescription['prescriptionHeaderID'] ?? 'Document'}.pdf',
    );
  }
}