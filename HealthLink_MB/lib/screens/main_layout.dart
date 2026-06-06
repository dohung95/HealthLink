import 'package:HealthLink/screens/patient_prescriptions_screen.dart';
import 'package:flutter/material.dart';
import '../widgets/tab_menu.dart';
import 'patient_home_screen.dart';
import 'chat/chat_list_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    // Khởi tạo tab mặc định là "Home" bằng cách tìm index của label "Home"
    _currentIndex = TabMenu.defaultItems.indexWhere((item) => item.label == 'Home');
    if (_currentIndex == -1) _currentIndex = 0; // Fallback
  }

  void _onTabChanged(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  /// Ánh xạ Label của Tab sang màn hình tương ứng
  Widget _getScreenForLabel(String label) {
    switch (label) {
      case 'Home':
        return const PatientHomeScreen();

      case 'Chat':
        return const MessagesScreen();

      case 'Records':
        return const PrescriptionsScreen();

      case 'Booking':

      case 'Appointments':

      default:
        return Scaffold(
          body: Center(
            child: Text(
              'The $label feature is under development...',
              style: const TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isDesktop = MediaQuery.of(context).size.width >= 768;

    // Dùng IndexedStack để giữ trạng thái (state) của các màn hình khi chuyển đổi
    final bodyContent = IndexedStack(
      index: _currentIndex,
      children: TabMenu.defaultItems.map((item) => _getScreenForLabel(item.label)).toList(),
    );

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: Row(
        children: [
          if (isDesktop)
            DesktopTabMenu(
              currentIndex: _currentIndex,
              onTabChanged: _onTabChanged,
            ),
          Expanded(child: bodyContent),
        ],
      ),
      bottomNavigationBar: isDesktop
          ? null
          : MobileTabMenu(
              currentIndex: _currentIndex,
              onTabChanged: _onTabChanged,
            ),
    );
  }
}
