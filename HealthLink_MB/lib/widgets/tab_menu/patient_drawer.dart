import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../config/api_config.dart';
import '../../screens/patient/profile_patient/profile_patient_screen.dart';
import '../../screens/patient/profile_patient/update_security_screen.dart';
import '../../screens/health_records/health_records_screen.dart';
import '../../screens/patient/appointments/appointment_screen.dart';
import '../../screens/patient/patient_prescriptions_screen.dart';
import '../../screens/chat/chat_list_screen.dart';
import '../../screens/patient/about_us_screen.dart';

class PatientDrawer extends StatelessWidget {
  const PatientDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final colorScheme = Theme.of(context).colorScheme;
    final avatarUrl = ApiConfig.normalizeUrl(authProvider.avatarUrl);

    return Drawer(
      backgroundColor: colorScheme.surface,
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                UserAccountsDrawerHeader(
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                  ),
                  accountName: Text(
                    authProvider.displayName ?? 'User',
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.bold),
                  ),
                  accountEmail: Text(
                    authProvider.patientProfile?['email']?.toString() ??
                        'Email not updated',
                    style: TextStyle(color: colorScheme.onSurfaceVariant),
                  ),
                  currentAccountPicture: CircleAvatar(
                    backgroundColor: colorScheme.primary,
                    backgroundImage:
                        avatarUrl != null ? NetworkImage(avatarUrl) : null,
                    child: avatarUrl == null
                        ? Icon(Icons.person, color: colorScheme.onPrimary)
                        : null,
                  ),
                ),

                // --- SECTION: ACCOUNT ---
                _buildSectionHeader(context, 'ACCOUNT'),
                _buildMenuItem(
                  context,
                  icon: Icons.person_outline,
                  title: 'My Profile',
                  onTap: () => _navigate(context, const PatientProfileScreen()),
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.security_outlined,
                  title: 'Security',
                  onTap: () =>
                      _navigate(context, const SecuritySettingsScreen()),
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.settings_outlined,
                  title: 'Settings',
                  onTap: () => _showComingSoon(context, 'Settings'),
                ),
                _buildThemeOptions(context, themeProvider),

                const Divider(indent: 16, endIndent: 16),

                // --- SECTION: SUPPORT ---
                _buildSectionHeader(context, 'SUPPORT'),
                _buildMenuItem(
                  context,
                  icon: Icons.help_outline,
                  title: 'Help & Support',
                  onTap: () => _showComingSoon(context, 'Help & Support'),
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.info_outline,
                  title: 'About Us',
                  onTap: () => _navigate(context, const AboutUsScreen()),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          _buildMenuItem(
            context,
            icon: Icons.logout,
            title: 'Logout',
            textColor: colorScheme.error,
            iconColor: colorScheme.error,
            onTap: () async {
              Navigator.pop(context);
              await context.read<AuthProvider>().logout();
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.outline,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? iconColor,
    Color? textColor,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return ListTile(
      leading: Icon(icon, color: iconColor ?? colorScheme.primary),
      title: Text(
        title,
        style: TextStyle(
          color: textColor ?? colorScheme.onSurface,
          fontWeight: FontWeight.w500,
        ),
      ),
      onTap: onTap,
      visualDensity: VisualDensity.compact,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
    );
  }

  Widget _buildThemeOptions(BuildContext context, ThemeProvider themeProvider) {
    final colorScheme = Theme.of(context).colorScheme;
    final themeMode = themeProvider.themeMode;

    return Column(
      children: [
        ListTile(
          leading: Icon(
            themeMode == ThemeMode.system
                ? Icons.brightness_auto_outlined
                : themeMode == ThemeMode.dark
                    ? Icons.dark_mode_outlined
                    : Icons.light_mode_outlined,
            color: colorScheme.primary,
          ),
          title: const Text(
            'App Theme',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          subtitle: Text(
            themeMode == ThemeMode.system
                ? 'Follow System'
                : themeMode == ThemeMode.dark
                    ? 'Dark Mode'
                    : 'Light Mode',
            style: TextStyle(fontSize: 12, color: colorScheme.outline),
          ),
          onTap: () => _showThemeSelectionDialog(context, themeProvider),
          visualDensity: VisualDensity.compact,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          trailing: Icon(Icons.chevron_right, size: 20, color: colorScheme.outline),
        ),
      ],
    );
  }

  void _showThemeSelectionDialog(
      BuildContext context, ThemeProvider themeProvider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Theme', style: TextStyle(fontFamily: 'Sora')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<ThemeMode>(
              title: const Row(
                children: [
                  Icon(Icons.brightness_auto_outlined, size: 20),
                  const SizedBox(width: 12),
                  const Text('Follow System'),
                ],
              ),
              value: ThemeMode.system,
              groupValue: themeProvider.themeMode,
              onChanged: (mode) {
                themeProvider.setThemeMode(mode!);
                Navigator.pop(context);
              },
              contentPadding: EdgeInsets.zero,
            ),
            RadioListTile<ThemeMode>(
              title: const Row(
                children: [
                  Icon(Icons.light_mode_outlined, size: 20),
                  const SizedBox(width: 12),
                  const Text('Light Mode'),
                ],
              ),
              value: ThemeMode.light,
              groupValue: themeProvider.themeMode,
              onChanged: (mode) {
                themeProvider.setThemeMode(mode!);
                Navigator.pop(context);
              },
              contentPadding: EdgeInsets.zero,
            ),
            RadioListTile<ThemeMode>(
              title: const Row(
                children: [
                  Icon(Icons.dark_mode_outlined, size: 20),
                  const SizedBox(width: 12),
                  const Text('Dark Mode'),
                ],
              ),
              value: ThemeMode.dark,
              groupValue: themeProvider.themeMode,
              onChanged: (mode) {
                themeProvider.setThemeMode(mode!);
                Navigator.pop(context);
              },
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
      ),
    );
  }

  void _navigate(BuildContext context, Widget screen) {
    Navigator.pop(context);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => screen),
    );
  }

  void _showComingSoon(BuildContext context, String feature) {
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature feature is coming soon!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
