import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/pharmacy/pharmacy_profile_service.dart';
import '../../models/pharmacy/pharmacy_profile.dart';

class PharmacyEditProfileScreen extends StatefulWidget {
  const PharmacyEditProfileScreen({super.key});

  @override
  State<PharmacyEditProfileScreen> createState() =>
      _PharmacyEditProfileScreenState();
}

class _PharmacyEditProfileScreenState
    extends State<PharmacyEditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isSaving = false;

  final _phoneController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _openTimeController = TextEditingController();
  final _closeTimeController = TextEditingController();
  final _workingDaysController = TextEditingController();
  final _deliveryFeeController = TextEditingController();
  final _deliveryRadiusController = TextEditingController();
  bool _deliveryAvailable = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProfile());
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _descriptionController.dispose();
    _openTimeController.dispose();
    _closeTimeController.dispose();
    _workingDaysController.dispose();
    _deliveryFeeController.dispose();
    _deliveryRadiusController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final auth = context.read<AuthProvider>();
      final profile =
          await PharmacyProfileService.getProfile(auth.accessToken!);
      _phoneController.text = profile.phoneNumber ?? '';
      _descriptionController.text = profile.description ?? '';
      _openTimeController.text = profile.openTime ?? '';
      _closeTimeController.text = profile.closeTime ?? '';
      _workingDaysController.text = profile.workingDays ?? '';
      _deliveryFeeController.text =
          profile.deliveryFee?.toStringAsFixed(2) ?? '';
      _deliveryRadiusController.text =
          profile.deliveryRadius?.toStringAsFixed(1) ?? '';
      _deliveryAvailable = profile.deliveryAvailable;
      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      final auth = context.read<AuthProvider>();
      await PharmacyProfileService.updateProfile(
          auth.accessToken!, {
        'phoneNumber': _phoneController.text,
        'description': _descriptionController.text,
        'openTime': _openTimeController.text,
        'closeTime': _closeTimeController.text,
        'workingDays': _workingDaysController.text,
        'deliveryFee': double.tryParse(_deliveryFeeController.text),
        'deliveryRadius':
            double.tryParse(_deliveryRadiusController.text),
        'deliveryAvailable': _deliveryAvailable,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Profile updated successfully')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString())));
      }
    }
    if (mounted) setState(() => _isSaving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child:
                        CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextFormField(
                    controller: _phoneController,
                    decoration: const InputDecoration(
                        labelText: 'Phone Number'),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(
                        labelText: 'Description'),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _openTimeController,
                    decoration: const InputDecoration(
                        labelText: 'Open Time (HH:mm)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _closeTimeController,
                    decoration: const InputDecoration(
                        labelText: 'Close Time (HH:mm)'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _workingDaysController,
                    decoration: const InputDecoration(
                        labelText: 'Working Days',
                        hintText: 'e.g. Mon-Fri'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _deliveryFeeController,
                    decoration: const InputDecoration(
                        labelText: 'Delivery Fee',
                        prefixText: '\$'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _deliveryRadiusController,
                    decoration: const InputDecoration(
                        labelText: 'Delivery Radius (km)'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: const Text('Delivery Available'),
                    value: _deliveryAvailable,
                    onChanged: (v) =>
                        setState(() => _deliveryAvailable = v),
                  ),
                ],
              ),
            ),
    );
  }
}
