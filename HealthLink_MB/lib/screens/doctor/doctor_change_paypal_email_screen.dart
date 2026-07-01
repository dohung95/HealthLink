import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';

class DoctorChangePaypalEmailScreen extends StatefulWidget {
  const DoctorChangePaypalEmailScreen({super.key});

  @override
  State<DoctorChangePaypalEmailScreen> createState() => _DoctorChangePaypalEmailScreenState();
}

class _DoctorChangePaypalEmailScreenState extends State<DoctorChangePaypalEmailScreen> {
  final _controller = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentEmail();
  }

  Future<void> _loadCurrentEmail() async {
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token != null) {
        final profile = await DoctorService.getProfile(token);
        if (mounted) _controller.text = profile.paypalEmail ?? '';
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = _controller.text.trim();
    if (value.isNotEmpty && !value.contains('@')) {
      showDoctorNotice(context, 'Please enter a valid email address', isError: true);
      return;
    }

    setState(() => _saving = true);
    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      await DoctorService.updateProfile(token, {'paypalEmail': value});

      if (mounted) {
        await showDoctorNotice(context, 'PayPal email updated successfully');
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        children: [
          DoctorBackHeader(title: 'PayPal Email', onBack: () => Navigator.pop(context)),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: DS.primary))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(children: [_buildHeader(), const SizedBox(height: 20), _buildForm()]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(children: [
      Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(color: DS.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(16)),
        child: const Icon(Icons.account_balance_wallet_outlined, size: 28, color: DS.primary),
      ),
      const SizedBox(height: 12),
      const Text('PayPal Payout Email', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: DS.foreground)),
      const SizedBox(height: 4),
      const Text('This is where your earnings will be sent.', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: DS.mutedForeground)),
    ]);
  }

  Widget _buildForm() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: DS.cardDecoration,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('PayPal Email', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DS.foreground)),
        const SizedBox(height: 8),
        TextField(
          controller: _controller,
          keyboardType: TextInputType.emailAddress,
          decoration: DS.inputDecoration(hintText: 'Email for receiving payments'),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _saving ? null : _save,
            style: DS.primaryButtonStyle,
            child: _saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primaryForeground))
                : const Text('Save Changes'),
          ),
        ),
      ]),
    );
  }
}
