import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/api_config.dart';
import '../../screens/profile_patient/profile_patient_screen.dart';

class PatientDrawer extends StatelessWidget {
  const PatientDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final colorScheme = Theme.of(context).colorScheme;
    final avatarUrl = ApiConfig.normalizeUrl(authProvider.avatarUrl);

    return Drawer(
      backgroundColor: colorScheme.surface,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            decoration: BoxDecoration(
              color: colorScheme.surfaceVariant,
            ),
            accountName: Text(
              authProvider.displayName ?? 'User',
              style: TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.bold),
            ),
            accountEmail: Text(
              authProvider.patientProfile?['email']?.toString() ?? 'Email not updated',
              style: TextStyle(color: colorScheme.onSurfaceVariant),
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: colorScheme.primary,
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
              child: avatarUrl == null ? Icon(Icons.person, color: colorScheme.onPrimary) : null,
            ),
          ),
          ListTile(
            leading: Icon(Icons.person_outline, color: colorScheme.primary),
            title: const Text('My Profile'),
            onTap: () {
              Navigator.pop(context); // Đóng drawer
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const PatientProfileScreen()),
              );
            },
          ),
          ListTile(
            leading: Icon(Icons.manage_accounts_outlined, color: colorScheme.primary),
            title: const Text('Change Info'),
            subtitle: const Text('Email, Password...'),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Change Info feature is under development...')),
              );
            },
          ),
          const Divider(),
          ListTile(
            leading: Icon(Icons.logout, color: colorScheme.error),
            title: Text('Logout', style: TextStyle(color: colorScheme.error)),
            onTap: () async {
              Navigator.pop(context);
              await context.read<AuthProvider>().logout();
            },
          ),
        ],
      ),
    );
  }
}
