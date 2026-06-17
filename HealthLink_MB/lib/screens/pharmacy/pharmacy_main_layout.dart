import 'package:flutter/material.dart';
import 'pharmacy_dashboard_screen.dart';
import 'pharmacy_orders_screen.dart';
import 'pharmacy_requests_screen.dart';
import 'pharmacy_profile_screen.dart';
import '../chat/chat_list_screen.dart' show MessagesScreen;

class PharmacyMainLayout extends StatefulWidget {
  const PharmacyMainLayout({super.key});

  @override
  State<PharmacyMainLayout> createState() => _PharmacyMainLayoutState();
}

class _PharmacyMainLayoutState extends State<PharmacyMainLayout> {
  int _currentIndex = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      const PharmacyDashboardScreen(),
      const PharmacyOrdersScreen(),
      const PharmacyRequestsScreen(),
      const MessagesScreen(),
      const PharmacyProfileScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Requests',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
