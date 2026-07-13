import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/partner/partner_security_service.dart';
import '../../widgets/partner/partner_pin_wizard.dart';

class PharmacySecurityScreen extends StatefulWidget {
  const PharmacySecurityScreen({super.key});

  @override
  State<PharmacySecurityScreen> createState() =>
      _PharmacySecurityScreenState();
}

class _PharmacySecurityScreenState extends State<PharmacySecurityScreen> {
  final _service = PartnerSecurityService();
  bool _loading = false;
  bool _pinConfigured = false;
  bool _pinLocked = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStatus());
  }

  Future<void> _loadStatus() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final status = await _service.getPinStatus(auth.accessToken!);
      if (mounted) setState(() {
        _pinConfigured = status['configured'] == true;
        _pinLocked = status['locked'] == true;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _openPinWizard() {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    showDialog(
      context: context,
      builder: (_) => PartnerPinWizard(
        service: _service,
        token: auth.accessToken!,
        onSuccess: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_pinConfigured
                  ? 'PIN updated successfully'
                  : 'PIN created successfully'),
            ),
          );
          _loadStatus();
        },
      ),
    );
  }

  void _showPasswordChangeDialog() {
    final otpCtrl = TextEditingController();
    final newPassCtrl = TextEditingController();
    final confirmPassCtrl = TextEditingController();
    bool sending = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Change Password'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: otpCtrl,
                decoration: const InputDecoration(
                    labelText: 'OTP (sent to your email)'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: newPassCtrl,
                decoration:
                    const InputDecoration(labelText: 'New password'),
                obscureText: true,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: confirmPassCtrl,
                decoration: const InputDecoration(
                    labelText: 'Confirm new password'),
                obscureText: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                final auth = context.read<AuthProvider>();
                if (auth.accessToken == null) return;
                setDialogState(() => sending = true);
                try {
                  await _service.requestPasswordChangeOtp(
                      auth.accessToken!);
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('OTP sent to your email')),
                    );
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString())),
                    );
                  }
                }
                if (ctx.mounted) setDialogState(() => sending = false);
              },
              child: sending
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child:
                          CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Send OTP'),
            ),
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                if (otpCtrl.text.isEmpty ||
                    newPassCtrl.text.isEmpty ||
                    confirmPassCtrl.text.isEmpty) return;
                final auth = context.read<AuthProvider>();
                if (auth.accessToken == null) return;
                setDialogState(() => sending = true);
                try {
                  await _service.changePasswordWithOtp(
                    auth.accessToken!,
                    otp: otpCtrl.text.trim(),
                    newPassword: newPassCtrl.text,
                    confirmNewPassword: confirmPassCtrl.text,
                  );
                  if (ctx.mounted) {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Password changed successfully')),
                    );
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString())),
                    );
                  }
                }
                if (ctx.mounted) setDialogState(() => sending = false);
              },
              child: const Text('Change'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Security'), centerTitle: true),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        child: Text('Withdrawal PIN',
                            style: theme.textTheme.titleSmall
                                ?.copyWith(color: theme.colorScheme.primary)),
                      ),
                      SwitchListTile(
                        title: Text(_pinConfigured
                            ? 'PIN Configured'
                            : 'Not Configured'),
                        subtitle: _pinLocked
                            ? Text('Temporarily locked',
                                style: TextStyle(
                                    color: theme.colorScheme.error))
                            : null,
                        value: _pinConfigured,
                        onChanged: (_) => _openPinWizard(),
                        secondary: Icon(
                          _pinConfigured
                              ? Icons.lock_outline
                              : Icons.lock_open,
                          color: _pinConfigured
                              ? Colors.green
                              : theme.colorScheme.error,
                        ),
                      ),
                      if (_pinConfigured)
                        Padding(
                          padding:
                              const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: TextButton.icon(
                            onPressed: _openPinWizard,
                            icon: const Icon(Icons.edit, size: 18),
                            label: const Text('Update PIN'),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.lock_reset),
                    title: const Text('Change Password'),
                    subtitle: const Text('Via OTP verification'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: _showPasswordChangeDialog,
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!,
                      style: TextStyle(color: theme.colorScheme.error)),
                ],
              ],
            ),
    );
  }
}
