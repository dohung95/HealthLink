import 'package:flutter/material.dart';

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
                onRefresh: () async {
                  // TODO: Gọi API cập nhật danh sách đơn thuốc ở đây
                  await Future.delayed(const Duration(seconds: 1));
                },
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
                          'My Prescriptions',
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
                          'Manage prescription history and details',
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.surface, // surface-bright
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Theme.of(context).colorScheme.surfaceVariant,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.asset(
                    'assets/images/user_avatar.png',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) =>
                        Icon(Icons.person, color: Theme.of(context).colorScheme.onSurfaceVariant),
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
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _filters.map((filter) {
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
                  filter,
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
        }).toList(),
      ),
    );
  }

  // --- 3. Dữ liệu các Card Đơn thuốc ---
  List<Widget> _buildPrescriptionCards() {
    return [
      _buildPrescriptionCard(
        doctorName: 'Dr. Nguyễn Văn A',
        specialty: 'Internal Medicine',
        status: 'Active',
        date: '15/10/2023',
        condition: 'Acute Pharyngitis',
        medCount: 3,
        isActive: true,
        onTap: () => _showPrescriptionDetailsModal(context),
      ),
      _buildPrescriptionCard(
        doctorName: 'Dr. Trần Thị B',
        specialty: 'Dermatology',
        status: 'Finished',
        date: '02/09/2023',
        condition: 'Atopic Dermatitis',
        medCount: 2,
        isActive: false,
        onTap: () {}, // Gọi hàm modal tương ứng nếu có
      ),
      _buildPrescriptionCard(
        doctorName: 'Dr. Lê Văn C',
        specialty: 'Gastroenterology',
        status: 'Finished',
        date: '10/08/2023',
        condition: 'Acid Reflux',
        medCount: 4,
        isActive: false,
        onTap: () {},
      ),
    ];
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
                        Text('Date Issued', style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                        const SizedBox(height: 4),
                        Text(date, style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onBackground)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Condition', style: TextStyle(fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurfaceVariant)),
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
                  '$medCount medications',
                  style: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500, color: isActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurfaceVariant),
                ),
                Row(
                  children: [
                    Text(
                      'View Details',
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
  void _showPrescriptionDetailsModal(BuildContext context) {
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
                      'Prescription Details',
                      style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onBackground),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      onPressed: () => Navigator.pop(context),
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
                                Text('Acute Pharyngitis', style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onBackground)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text('Doctor: Dr. Nguyễn Văn A', style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                            const SizedBox(height: 4),
                            Text('Date: 15/10/2023', style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      Text('Medication List (3)', style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onBackground)),
                      const SizedBox(height: 12),

                      // Medication 1
                      _buildMedicationItem(
                        name: 'Amoxicillin',
                        dosage: '500mg',
                        instruction: '1 pill / time - 2 times / day',
                        note: 'Take after breakfast and dinner',
                        icon: Icons.medication,
                        noteColor: Theme.of(context).colorScheme.primary,
                        noteIcon: Icons.info_outline,
                      ),
                      const SizedBox(height: 12),

                      // Medication 2
                      _buildMedicationItem(
                        name: 'Prospan Cough Syrup',
                        dosage: '100ml',
                        instruction: '5ml / time - 3 times / day',
                        note: 'Take after meals',
                        icon: Icons.medication_liquid,
                        noteColor: Theme.of(context).colorScheme.primary,
                        noteIcon: Icons.info_outline,
                      ),
                      const SizedBox(height: 12),

                      // Medication 3
                      _buildMedicationItem(
                        name: 'Paracetamol',
                        dosage: '500mg',
                        instruction: '1 pill when fever is over 38.5°C',
                        note: 'At least 4-6 hours apart',
                        icon: Icons.medication,
                        noteColor: Theme.of(context).colorScheme.secondary,
                        noteIcon: Icons.warning_amber_rounded,
                      ),
                    ],
                  ),
                ),
              ),

              // Sticky Footer Button
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
                    label: const Text(
                      'Set Medication Reminder',
                      style: TextStyle(fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w600),
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
            ),
          ),
        ],
      ),
    );
  }
}