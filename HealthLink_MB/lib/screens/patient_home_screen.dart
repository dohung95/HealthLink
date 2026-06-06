import 'package:flutter/material.dart';

class PatientHomeScreen extends StatefulWidget {
  const PatientHomeScreen({super.key});

  @override
  State<PatientHomeScreen> createState() => _PatientHomeScreenState();
}

class _PatientHomeScreenState extends State<PatientHomeScreen> {
  int _currentIndex = 0; // Quản lý tab hiện tại cho BottomNavigationBar (Mobile)

  @override
  Widget build(BuildContext context) {
    // Tự động điều chỉnh giao diện nếu xoay ngang màn hình hoặc dùng Tablet (>= 768px)
    final bool isDesktop = MediaQuery.of(context).size.width >= 768;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background, // Màu nền gốc

      body: Row(
        children: [
          // Hiện thanh Menu bên trái nếu là Desktop/Tablet
          if (isDesktop) _buildDesktopSideNav(),

          Expanded(
            child: Column(
              children: [
                _buildHeader(isDesktop),
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.symmetric(
                      horizontal: isDesktop ? 24.0 : 16.0,
                      vertical: 16.0,
                    ),
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 1280),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildStatsRow(),
                          const SizedBox(height: 24),
                          _buildUpcomingAppointmentCard(),
                          const SizedBox(height: 24),
                          _buildQuickActionsGrid(),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      // Hiện Bottom Navigation nếu là Mobile
      bottomNavigationBar: isDesktop ? null : _buildBottomNavBar(),
    );
  }

  // --- 1. Header (Avatar, Tên, Chuông thông báo) ---
  Widget _buildHeader(bool isDesktop) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? 24.0 : 16.0,
        vertical: isDesktop ? 16.0 : 12.0,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: isDesktop ? 48 : 40,
                  height: isDesktop ? 48 : 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(100),
                    child: Image.asset(
                      'assets/images/user_avatar.png', // Nhớ thêm ảnh avatar vào thư mục
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                        Icon(Icons.account_circle, size: 40, color: Theme.of(context).colorScheme.outline),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Good morning,',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: isDesktop ? 14 : 12,
                        color: Theme.of(context).colorScheme.outline,
                      ),
                    ),
                    Text(
                      'Nguyen Van A',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: isDesktop ? 24 : 20,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Row(
              children: [
                if (isDesktop)
                  IconButton(
                    icon: const Icon(Icons.search),
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    onPressed: () {},
                  ),
                Stack(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.notifications_outlined),
                        color: Theme.of(context).colorScheme.primary,
                        onPressed: () {},
                      ),
                    ),
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.error,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- 2. Hàng Thống Kê ---
  Widget _buildStatsRow() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double itemWidth = (constraints.maxWidth - 24) / 3;
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildStatItem(itemWidth, '1', 'Upcoming', Theme.of(context).colorScheme.primary, false),
            _buildStatItem(itemWidth, '3', 'New Records', Theme.of(context).colorScheme.secondary, true),
            _buildStatItem(itemWidth, '2', 'Prescriptions', Theme.of(context).colorScheme.secondary, false),
          ],
        );
      },
    );
  }

  Widget _buildStatItem(double width, String value, String title, Color valueColor, bool hasBadge) {
    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (hasBadge)
            Positioned(
              top: -10,
              right: -10,
              child: Opacity(
                opacity: 0.2,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondary, shape: BoxShape.circle),
                ),
              ),
            ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value,
                style: TextStyle(fontFamily: 'Inter', fontSize: 32, fontWeight: FontWeight.bold, color: valueColor),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 3. Thẻ Lịch Hẹn Sắp Tới ---
  Widget _buildUpcomingAppointmentCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Upcoming Appointments',
          style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface.withOpacity(0.95),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
            boxShadow: [
              BoxShadow(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 4)),
            ],
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: Theme.of(context).colorScheme.surface),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(100),
                          child: Image.asset(
                            'assets/images/doctor_avatar.png',
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Icon(Icons.person, color: Theme.of(context).colorScheme.primary),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Dr. Tran Thi B', style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                          Text('Cardiology • Hanoi Heart Institute', style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: Theme.of(context).colorScheme.outline)),
                        ],
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(100)),
                    child: Text('Today', style: TextStyle(fontFamily: 'Inter', fontSize: 11, color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceVariant, borderRadius: BorderRadius.circular(8)),
                child: Row(
                  children: [
                    Icon(Icons.schedule, color: Theme.of(context).colorScheme.secondary, size: 20),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('14:30 - 15:00', style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface)),
                        Text('Wednesday, May 24, 2026', style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: Theme.of(context).colorScheme.outline)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Theme.of(context).colorScheme.primary,
                        side: BorderSide(color: Theme.of(context).colorScheme.surface),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () {},
                      icon: const Icon(Icons.calendar_month, size: 16),
                      label: const Text('Reschedule'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () {},
                      icon: const Icon(Icons.meeting_room, size: 16),
                      label: const Text('Join Room'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- 4. Các nút thao tác nhanh ---
  Widget _buildQuickActionsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: TextStyle(fontFamily: 'Inter', fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final bool isWide = constraints.maxWidth > 600;
            return GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: isWide ? 4 : 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.1,
              children: [
                _buildQuickActionButton(Icons.calendar_month, 'Book Appointment', Theme.of(context).colorScheme.surface, Theme.of(context).colorScheme.primary),
                _buildQuickActionButton(Icons.medical_information, 'Health Records', Theme.of(context).colorScheme.secondary, Theme.of(context).colorScheme.onSecondary),
                _buildQuickActionButton(Icons.share, 'Share Records', Theme.of(context).colorScheme.secondary.withOpacity(0.1), Theme.of(context).colorScheme.secondary),
                _buildQuickActionButton(Icons.chat, 'Chat with Doctor', Theme.of(context).colorScheme.surface, Theme.of(context).colorScheme.primary),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildQuickActionButton(IconData icon, String title, Color iconBgColor, Color iconColor) {
    return InkWell(
      onTap: () {},
      borderRadius: BorderRadius.circular(12),
        child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface.withOpacity(0.95),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
          boxShadow: [
            BoxShadow(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(color: iconBgColor, shape: BoxShape.circle),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onSurface)),
          ],
        ),
      ),
    );
  }

  // --- 5. Thanh điều hướng cho Mobile ---
  Widget _buildBottomNavBar() {
    return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            boxShadow: [
              BoxShadow(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, -4)),
            ],
          ),
      child: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        backgroundColor: Theme.of(context).colorScheme.surface,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: Theme.of(context).colorScheme.outline,
        selectedLabelStyle: TextStyle(fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.bold),
        unselectedLabelStyle: TextStyle(fontFamily: 'Inter', fontSize: 12),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.add_circle_outline), label: 'Booking'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: 'Appointments'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: 'Chat'),
          BottomNavigationBarItem(icon: Icon(Icons.description_outlined), label: 'Records'),
        ],
      ),
    );
  }

  // --- 6. Thanh menu dọc cho Desktop ---
  Widget _buildDesktopSideNav() {
    return Container(
      width: 256,
      color: Theme.of(context).colorScheme.surface,
      decoration: BoxDecoration(border: Border(right: BorderSide(color: Theme.of(context).colorScheme.outlineVariant))),
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
            child: Text('Patient Home', style: TextStyle(fontFamily: 'Inter', fontSize: 24, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _buildSideNavItem(Icons.home, 'Home', true),
                _buildSideNavItem(Icons.add_circle_outline, 'Booking', false),
                _buildSideNavItem(Icons.calendar_today, 'Appointments', false),
                _buildSideNavItem(Icons.description_outlined, 'Records', false),
                _buildSideNavItem(Icons.person_outline, 'Profile', false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSideNavItem(IconData icon, String title, bool isActive) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        leading: Icon(icon, color: isActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.outline),
        title: Text(
          title,
          style: TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: isActive ? FontWeight.bold : FontWeight.normal, color: isActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurfaceVariant),
        ),
        selected: isActive,
        selectedTileColor: Theme.of(context).colorScheme.surfaceVariant,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
        onTap: () {},
      ),
    );
  }
}