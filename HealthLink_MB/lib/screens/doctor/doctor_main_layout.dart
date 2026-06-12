import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

/// Layout chính cho Doctor - Placeholder
/// TODO: Phát triển các màn hình doctor sau
class DoctorMainLayout extends StatefulWidget {
  const DoctorMainLayout({super.key});

  @override
  State<DoctorMainLayout> createState() => _DoctorMainLayoutState();
}

class _DoctorMainLayoutState extends State<DoctorMainLayout> {
  int _currentIndex = 0;

  final List<_TabItem> _tabs = [
    _TabItem(icon: Icons.dashboard, label: 'Dashboard'),
    _TabItem(icon: Icons.calendar_today, label: 'Appointments'),
    _TabItem(icon: Icons.people, label: 'Patients'),
    _TabItem(icon: Icons.chat, label: 'Chat'),
    _TabItem(icon: Icons.person, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(_tabs[_currentIndex].label),
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await auth.logout();
            },
          ),
        ],
      ),
      body: _buildBody(context, auth),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: theme.colorScheme.primary,
        unselectedItemColor: Colors.grey,
        items: _tabs
            .map((tab) => BottomNavigationBarItem(
                  icon: Icon(tab.icon),
                  label: tab.label,
                ))
            .toList(),
      ),
    );
  }

  Widget _buildBody(BuildContext context, AuthProvider auth) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Avatar
            CircleAvatar(
              radius: 50,
              backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
              child: Icon(
                Icons.medical_services,
                size: 50,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 24),

            // Welcome text
            Text(
              'Welcome, Doctor!',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 8),

            // User info
            if (auth.displayName != null)
              Text(
                auth.displayName!,
                style: theme.textTheme.titleLarge,
              ),
            const SizedBox(height: 24),

            // Placeholder message
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.construction, color: Colors.amber.shade700),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Doctor portal is under development.\nMore features coming soon!',
                      style: TextStyle(color: Colors.amber.shade900),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Current tab info
            Text(
              'Current tab: ${_tabs[_currentIndex].label}',
              style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabItem {
  final IconData icon;
  final String label;

  _TabItem({required this.icon, required this.label});
}
