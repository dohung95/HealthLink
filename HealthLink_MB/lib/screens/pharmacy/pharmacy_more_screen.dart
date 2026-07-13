import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../chat/chat_list_screen.dart';
import 'pharmacy_profile_screen.dart';
import 'pharmacy_wallet_screen.dart';
import 'pharmacy_security_screen.dart';

class PharmacyMoreScreen extends StatelessWidget {
  const PharmacyMoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        _sectionHeader(theme, 'Account'),
        ListTile(
          leading: const Icon(Icons.wallet_outlined),
          title: const Text('Wallet'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const PharmacyWalletScreen(),
            ),
          ),
        ),
        ListTile(
          leading: const Icon(Icons.person_outline),
          title: const Text('Profile'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const PharmacyProfileScreen(),
            ),
          ),
        ),
        ListTile(
          leading: const Icon(Icons.security_outlined),
          title: const Text('Security'),
          subtitle: const Text('PIN & Password'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const PharmacySecurityScreen(),
            ),
          ),
        ),
        const Divider(),
        _sectionHeader(theme, 'Support'),
        ListTile(
          leading: const Icon(Icons.chat_bubble_outline),
          title: const Text('Chat'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const MessagesScreen(),
            ),
          ),
        ),
        const Divider(),
        ListTile(
          leading: Icon(Icons.logout, color: theme.colorScheme.error),
          title: Text('Logout',
              style: TextStyle(color: theme.colorScheme.error)),
          onTap: () => _confirmLogout(context),
        ),
      ],
    );
  }

  Widget _sectionHeader(ThemeData theme, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Text(title,
          style: theme.textTheme.labelLarge
              ?.copyWith(color: theme.colorScheme.primary)),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await context.read<AuthProvider>().logout();
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
