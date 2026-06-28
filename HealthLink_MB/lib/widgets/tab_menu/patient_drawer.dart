import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/locale_provider.dart';
import '../../config/api_config.dart';
import '../../l10n/app_localizations.dart';
import '../../screens/patient/profile_patient/profile_patient_screen.dart';
import '../../screens/patient/profile_patient/update_security_screen.dart';
import '../../screens/patient/health_records/health_records_screen.dart';
import '../../screens/patient/appointments/appointment_screen.dart';
import '../../screens/patient/patient_prescriptions_screen.dart';
import '../../screens/chat/chat_list_screen.dart';
import '../../screens/patient/about_us_screen.dart';
import '../../screens/patient/help_support_screen.dart';

class PatientDrawer extends StatelessWidget {
  const PatientDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final colorScheme = Theme.of(context).colorScheme;
    final avatarUrl = ApiConfig.normalizeUrl(authProvider.avatarUrl);
    final l10n = AppLocalizations.of(context)!;

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
                        l10n.drawerEmailNotUpdated,
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
                _buildSectionHeader(context, l10n.drawerAccount),
                _buildMenuItem(
                  context,
                  icon: Icons.person_outline,
                  title: l10n.drawerMyProfile,
                  onTap: () => _navigate(context, const PatientProfileScreen()),
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.security_outlined,
                  title: l10n.drawerSecurity,
                  onTap: () =>
                      _navigate(context, const SecuritySettingsScreen()),
                ),
                _buildThemeOptions(context, themeProvider, l10n),
                _buildLanguageOptions(context, l10n),

                const Divider(indent: 16, endIndent: 16),

                // --- SECTION: SUPPORT ---
                _buildSectionHeader(context, l10n.drawerSupport),
                _buildMenuItem(
                  context,
                  icon: Icons.help_outline,
                  title: l10n.drawerHelpSupport,
                  onTap: () => _navigate(
                    context,
                    const HelpSupportScreen(),
                  ),
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.info_outline,
                  title: l10n.drawerAboutUs,
                  onTap: () => _navigate(context, const AboutUsScreen()),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          _buildMenuItem(
            context,
            icon: Icons.logout,
            title: l10n.drawerLogout,
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

  Widget _buildThemeOptions(BuildContext context, ThemeProvider themeProvider, AppLocalizations l10n) {
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
          title: Text(
            l10n.drawerAppTheme,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          subtitle: Text(
            themeMode == ThemeMode.system
                ? l10n.themeFollowSystem
                : themeMode == ThemeMode.dark
                    ? l10n.themeDarkMode
                    : l10n.themeLightMode,
            style: TextStyle(fontSize: 12, color: colorScheme.outline),
          ),
          onTap: () => _showThemeSelectionDialog(context, themeProvider, l10n),
          visualDensity: VisualDensity.compact,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          trailing: Icon(Icons.chevron_right, size: 20, color: colorScheme.outline),
        ),
      ],
    );
  }

  Widget _buildLanguageOptions(BuildContext context, AppLocalizations l10n) {
    final colorScheme = Theme.of(context).colorScheme;
    final localeProvider = context.watch<LocaleProvider>();
    final currentLocale = localeProvider.locale.languageCode;

    return Column(
      children: [
        ListTile(
          leading: Icon(
            Icons.language,
            color: colorScheme.primary,
          ),
          title: Text(
            l10n.drawerAppLanguage,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          subtitle: Text(
            currentLocale == 'vi' ? l10n.languageVietnamese : l10n.languageEnglish,
            style: TextStyle(fontSize: 12, color: colorScheme.outline),
          ),
          trailing: LanguageToggleSwitch(
            isVi: currentLocale == 'vi',
            onChanged: (isVi) {
              localeProvider.setLocale(isVi ? const Locale('vi') : const Locale('en'));
            },
          ),
        ),
      ],
    );
  }

  void _showThemeSelectionDialog(
      BuildContext context, ThemeProvider themeProvider, AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.themeSelectTheme, style: const TextStyle(fontFamily: 'Sora')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<ThemeMode>(
              title: Row(
                children: [
                  const Icon(Icons.brightness_auto_outlined, size: 20),
                  const SizedBox(width: 12),
                  Text(l10n.themeFollowSystem),
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
              title: Row(
                children: [
                  const Icon(Icons.light_mode_outlined, size: 20),
                  const SizedBox(width: 12),
                  Text(l10n.themeLightMode),
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
              title: Row(
                children: [
                  const Icon(Icons.dark_mode_outlined, size: 20),
                  const SizedBox(width: 12),
                  Text(l10n.themeDarkMode),
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
}

class LanguageToggleSwitch extends StatelessWidget {
  final bool isVi;
  final ValueChanged<bool> onChanged;

  const LanguageToggleSwitch({super.key, required this.isVi, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: () => onChanged(!isVi),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        width: 80,
        height: 32,
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outlineVariant),
        ),
        child: Stack(
          children: [
            // Sliding thumb
            AnimatedAlign(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeInOut,
              alignment: isVi ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                width: 40,
                height: 32,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            // Texts
            Row(
              children: [
                Expanded(
                  child: Center(
                    child: AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 250),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Sora',
                        color: !isVi ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
                      ),
                      child: const Text('EN'),
                    ),
                  ),
                ),
                Expanded(
                  child: Center(
                    child: AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 250),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Sora',
                        color: isVi ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
                      ),
                      child: const Text('VI'),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
