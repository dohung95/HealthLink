import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/api_config.dart';
import '../../services/pharmacy/pharmacy_profile_service.dart';
import '../../models/pharmacy/pharmacy_profile.dart';
import 'pharmacy_edit_profile_screen.dart';

class PharmacyProfileScreen extends StatefulWidget {
  const PharmacyProfileScreen({super.key});

  @override
  State<PharmacyProfileScreen> createState() =>
      _PharmacyProfileScreenState();
}

class _PharmacyProfileScreenState extends State<PharmacyProfileScreen> {
  bool _isLoading = false;
  String? _error;
  PharmacyProfile? _profile;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProfile());
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      if (auth.accessToken == null) throw Exception('Not authenticated');
      _profile =
          await PharmacyProfileService.getProfile(auth.accessToken!);
      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
          title: const Text('Pharmacy Profile'), centerTitle: true),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!,
                          style:
                              TextStyle(color: theme.colorScheme.error)),
                      FilledButton.tonal(
                          onPressed: _loadProfile,
                          child: const Text('Retry')),
                    ],
                  ),
                )
              : _profile == null
                  ? const Center(child: Text('No profile data'))
                  : _buildContent(theme),
    );
  }

  Widget _buildContent(ThemeData theme) {
    final p = _profile!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          CircleAvatar(
            radius: 48,
            backgroundImage: p.avatarUrl != null
                ? NetworkImage(
                    ApiConfig.normalizeUrl(p.avatarUrl) ?? '')
                : null,
            child: p.avatarUrl == null
                ? const Icon(Icons.local_pharmacy, size: 48)
                : null,
          ),
          const SizedBox(height: 12),
          Text(p.name,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold)),
          if (p.email != null) Text(p.email!, style: theme.textTheme.bodyMedium),
          if (p.phoneNumber != null)
            Text(p.phoneNumber!, style: theme.textTheme.bodyMedium),
          const SizedBox(height: 16),

          if (p.averageRating != null)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.star, color: Colors.amber, size: 20),
                const SizedBox(width: 4),
                Text(
                    '${p.averageRating!.toStringAsFixed(1)} (${p.totalReviews ?? 0} reviews)'),
              ],
            ),
          const SizedBox(height: 24),

          _infoCard(theme, 'Address', [
            if (p.address != null)
              _infoTile('Street', p.address!),
            if (p.city != null)
              _infoTile('City', p.city!),
            if (p.district != null)
              _infoTile('District', p.district!),
            if (p.ward != null) _infoTile('Ward', p.ward!),
          ]),
          const SizedBox(height: 8),

          _infoCard(theme, 'Hours', [
            if (p.open24Hours)
              const ListTile(title: Text('Open 24/7'))
            else ...[
              if (p.openTime != null || p.closeTime != null)
                ListTile(
                  title: Text(
                      '${p.openTime ?? '--'} - ${p.closeTime ?? '--'}'),
                  leading: const Icon(Icons.access_time),
                ),
              if (p.workingDays != null)
                ListTile(
                  title: Text(p.workingDays!),
                  leading: const Icon(Icons.calendar_view_week),
                ),
            ],
          ]),
          const SizedBox(height: 8),

          _infoCard(theme, 'Delivery', [
            SwitchListTile(
              title: const Text('Delivery Available'),
              value: p.deliveryAvailable,
              onChanged: null,
              secondary: const Icon(Icons.local_shipping),
            ),
            if (p.deliveryFee != null)
              ListTile(
                title: Text(
                    'Delivery fee: \$${p.deliveryFee!.toStringAsFixed(2)}'),
                leading: const Icon(Icons.monetization_on),
              ),
            if (p.deliveryRadius != null)
              ListTile(
                title: Text(
                    'Radius: ${p.deliveryRadius!.toStringAsFixed(1)} km'),
                leading: const Icon(Icons.radar),
              ),
          ]),

          if (p.totalEarnings != null ||
              p.pendingSettlement != null) ...[
            const SizedBox(height: 8),
            _infoCard(theme, 'Financial', [
              if (p.totalEarnings != null)
                ListTile(
                  title: Text(
                      'Total earnings: \$${p.totalEarnings!.toStringAsFixed(2)}'),
                  leading: const Icon(Icons.account_balance_wallet),
                ),
              if (p.pendingSettlement != null)
                ListTile(
                  title: Text(
                      'Pending settlement: \$${p.pendingSettlement!.toStringAsFixed(2)}'),
                  leading: const Icon(Icons.hourglass_empty),
                ),
            ]),
          ],

          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) =>
                          const PharmacyEditProfileScreen()),
                );
                if (result == true) _loadProfile();
              },
              icon: const Icon(Icons.edit),
              label: const Text('Edit Profile'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: TextButton.icon(
              onPressed: _showChangePasswordDialog,
              icon: const Icon(Icons.lock_outline),
              label: const Text('Change Password'),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _infoCard(
      ThemeData theme, String title, List<Widget> children) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text(title,
                style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.primary)),
          ),
          ...children,
        ],
      ),
    );
  }

  Widget _infoTile(String label, String value) {
    return ListTile(
      title: Text(value),
      subtitle: Text(label),
      leading: const Icon(Icons.info_outline),
      dense: true,
    );
  }

  void _showChangePasswordDialog() {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentCtrl,
              decoration:
                  const InputDecoration(labelText: 'Current password'),
              obscureText: true,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: newCtrl,
              decoration:
                  const InputDecoration(labelText: 'New password'),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (currentCtrl.text.isEmpty ||
                  newCtrl.text.isEmpty) return;
              try {
                final auth = context.read<AuthProvider>();
                await PharmacyProfileService.changePassword(
                  auth.accessToken!,
                  currentCtrl.text,
                  newCtrl.text,
                );
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content:
                            Text('Password changed successfully')),
                  );
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.toString())),
                  );
                }
              }
            },
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }
}
