import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../services/patient_service.dart';
import '../../models/patient_profile.dart';

class EditPatientProfileScreen extends StatefulWidget {
  final PatientProfile currentProfile;

  const EditPatientProfileScreen({super.key, required this.currentProfile});

  @override
  State<EditPatientProfileScreen> createState() => _EditPatientProfileScreenState();
}

class _EditPatientProfileScreenState extends State<EditPatientProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  late TextEditingController _fullNameCtrl;
  late TextEditingController _occupationCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _countryCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _medicalHistoryCtrl;
  late TextEditingController _allergiesCtrl;
  late TextEditingController _chronicConditionsCtrl;
  late TextEditingController _currentMedicationsCtrl;
  late TextEditingController _insuranceProviderCtrl;
  late TextEditingController _insurancePolicyNumberCtrl;
  late TextEditingController _emergencyNameCtrl;
  late TextEditingController _emergencyPhoneCtrl;
  late TextEditingController _emergencyRelationshipCtrl;
  late TextEditingController _preferredLanguageCtrl;
  late TextEditingController _heightCtrl;
  late TextEditingController _weightCtrl;

  String? _selectedGender;
  String? _selectedBloodType;
  DateTime? _selectedDateOfBirth;
  String? _currentAvatarUrl;

  final List<String> _genders = ['Male', 'Female', 'Other'];
  final List<String> _bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  @override
  void initState() {
    super.initState();
    final p = widget.currentProfile;

    _fullNameCtrl = TextEditingController(text: p.fullName);
    _occupationCtrl = TextEditingController(text: p.occupation);
    _addressCtrl = TextEditingController(text: p.address);
    _cityCtrl = TextEditingController(text: p.city);
    _countryCtrl = TextEditingController(text: p.country);
    _phoneCtrl = TextEditingController(text: p.phoneNumber);
    _medicalHistoryCtrl = TextEditingController(text: p.medicalHistorySummary);
    _allergiesCtrl = TextEditingController(text: p.allergies);
    _chronicConditionsCtrl = TextEditingController(text: p.chronicConditions);
    _currentMedicationsCtrl = TextEditingController(text: p.currentMedications);
    _insuranceProviderCtrl = TextEditingController(text: p.insuranceProvider);
    _insurancePolicyNumberCtrl = TextEditingController(text: p.insurancePolicyNumber);
    _emergencyNameCtrl = TextEditingController(text: p.emergencyContactName);
    _emergencyPhoneCtrl = TextEditingController(text: p.emergencyContactPhone);
    _emergencyRelationshipCtrl = TextEditingController(text: p.emergencyContactRelationship);
    _preferredLanguageCtrl = TextEditingController(text: p.preferredLanguage);
    _heightCtrl = TextEditingController(text: p.heightCm?.toString() ?? '');
    _weightCtrl = TextEditingController(text: p.weightKg?.toString() ?? '');

    _selectedGender = p.gender;
    _selectedBloodType = p.bloodType;
    _selectedDateOfBirth = p.dateOfBirth;
    _currentAvatarUrl = p.avatarUrl;
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _occupationCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _countryCtrl.dispose();
    _phoneCtrl.dispose();
    _medicalHistoryCtrl.dispose();
    _allergiesCtrl.dispose();
    _chronicConditionsCtrl.dispose();
    _currentMedicationsCtrl.dispose();
    _insuranceProviderCtrl.dispose();
    _insurancePolicyNumberCtrl.dispose();
    _emergencyNameCtrl.dispose();
    _emergencyPhoneCtrl.dispose();
    _emergencyRelationshipCtrl.dispose();
    _preferredLanguageCtrl.dispose();
    _heightCtrl.dispose();
    _weightCtrl.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateOfBirth ?? DateTime.now().subtract(const Duration(days: 365 * 20)),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDateOfBirth) {
      setState(() {
        _selectedDateOfBirth = picked;
      });
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile == null) return;

    setState(() => _isLoading = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final newAvatarUrl = await PatientService.uploadAvatar(auth.accessToken!, pickedFile.path);
      setState(() {
        _currentAvatarUrl = newAvatarUrl;
      });
      auth.fetchProfile(); 
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Avatar uploaded successfully')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to upload avatar: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      
      final data = {
        'fullName': _fullNameCtrl.text.trim(),
        'occupation': _occupationCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'country': _countryCtrl.text.trim(),
        'phoneNumber': _phoneCtrl.text.trim(),
        'medicalHistorySummary': _medicalHistoryCtrl.text.trim(),
        'allergies': _allergiesCtrl.text.trim(),
        'chronicConditions': _chronicConditionsCtrl.text.trim(),
        'currentMedications': _currentMedicationsCtrl.text.trim(),
        'insuranceProvider': _insuranceProviderCtrl.text.trim(),
        'insurancePolicyNumber': _insurancePolicyNumberCtrl.text.trim(),
        'emergencyContactName': _emergencyNameCtrl.text.trim(),
        'emergencyContactPhone': _emergencyPhoneCtrl.text.trim(),
        'emergencyContactRelationship': _emergencyRelationshipCtrl.text.trim(),
        'preferredLanguage': _preferredLanguageCtrl.text.trim(),
        'gender': _selectedGender,
        'bloodType': _selectedBloodType,
        'dateOfBirth': _selectedDateOfBirth?.toIso8601String().split('T').first,
        'heightCm': double.tryParse(_heightCtrl.text.trim()),
        'weightKg': double.tryParse(_weightCtrl.text.trim()),
        'avatarUrl': _currentAvatarUrl,
      };

      // Xóa các trường null hoặc rỗng để API không bị lỗi nếu không cần thiết.
      data.removeWhere((key, value) => value == null || (value is String && value.isEmpty));

      final updatedProfile = await PatientService.updatePatientProfile(auth.accessToken!, data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!')),
        );
        Navigator.pop(context, updatedProfile);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update profile: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Edit Profile', style: TextStyle(fontFamily: 'Inter', color: colorScheme.onSurface)),
        backgroundColor: colorScheme.surface,
        elevation: 0,
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.symmetric(horizontal: 16.0), child: CircularProgressIndicator()))
          else
            IconButton(
              icon: Icon(Icons.check, color: colorScheme.primary),
              onPressed: _saveProfile,
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildAvatar(),
            const SizedBox(height: 24),
            _buildSectionHeader('Basic Information', colorScheme, textTheme),
            _buildTextField(_fullNameCtrl, 'Full Name', required: true),
            const SizedBox(height: 12),
            _buildDropdownField('Gender', _selectedGender, _genders, (v) => setState(() => _selectedGender = v)),
            const SizedBox(height: 12),
            _buildDateField('Date of Birth'),
            const SizedBox(height: 12),
            _buildTextField(_phoneCtrl, 'Phone Number'),
            const SizedBox(height: 12),
            _buildTextField(_occupationCtrl, 'Occupation'),
            const SizedBox(height: 12),
            _buildTextField(_preferredLanguageCtrl, 'Preferred Language'),
            
            const SizedBox(height: 24),
            _buildSectionHeader('Address', colorScheme, textTheme),
            _buildTextField(_addressCtrl, 'Street Address'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildTextField(_cityCtrl, 'City')),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField(_countryCtrl, 'Country')),
              ],
            ),
            
            const SizedBox(height: 24),
            _buildSectionHeader('Physical Metrics', colorScheme, textTheme),
            Row(
              children: [
                Expanded(child: _buildTextField(_heightCtrl, 'Height (cm)', isNumber: true)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField(_weightCtrl, 'Weight (kg)', isNumber: true)),
              ],
            ),
            const SizedBox(height: 12),
            _buildDropdownField('Blood Type', _selectedBloodType, _bloodTypes, (v) => setState(() => _selectedBloodType = v)),

            const SizedBox(height: 24),
            _buildSectionHeader('Medical Dossier', colorScheme, textTheme),
            _buildTextField(_allergiesCtrl, 'Allergies', maxLines: 2),
            const SizedBox(height: 12),
            _buildTextField(_chronicConditionsCtrl, 'Chronic Conditions', maxLines: 2),
            const SizedBox(height: 12),
            _buildTextField(_currentMedicationsCtrl, 'Current Medications', maxLines: 2),
            const SizedBox(height: 12),
            _buildTextField(_medicalHistoryCtrl, 'Medical History Summary', maxLines: 3),

            const SizedBox(height: 24),
            _buildSectionHeader('Insurance Information', colorScheme, textTheme),
            _buildTextField(_insuranceProviderCtrl, 'Insurance Provider'),
            const SizedBox(height: 12),
            _buildTextField(_insurancePolicyNumberCtrl, 'Policy Number'),

            const SizedBox(height: 24),
            _buildSectionHeader('Emergency Contact', colorScheme, textTheme),
            _buildTextField(_emergencyNameCtrl, 'Contact Name'),
            const SizedBox(height: 12),
            _buildTextField(_emergencyRelationshipCtrl, 'Relationship'),
            const SizedBox(height: 12),
            _buildTextField(_emergencyPhoneCtrl, 'Contact Phone'),
            
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar() {
    final avatarUrl = ApiConfig.normalizeUrl(_currentAvatarUrl);
    return Center(
      child: Stack(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
            child: avatarUrl == null ? const Icon(Icons.person, size: 50) : null,
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: InkWell(
              onTap: _pickAndUploadAvatar,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.camera_alt, color: Theme.of(context).colorScheme.onPrimary, size: 20),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, ColorScheme colorScheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Text(
        title,
        style: textTheme.titleMedium?.copyWith(color: colorScheme.primary, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {bool required = false, bool isNumber = false, int maxLines = 1}) {
    return TextFormField(
      controller: controller,
      keyboardType: isNumber ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      validator: required
          ? (value) => (value == null || value.trim().isEmpty) ? 'This field is required' : null
          : null,
    );
  }

  Widget _buildDropdownField(String label, String? value, List<String> items, ValueChanged<String?> onChanged) {
    // If the backend has a value that is NOT in the predefined list, we shouldn't crash.
    final validItems = items.contains(value) ? items : (value != null && value.isNotEmpty ? [...items, value] : items);

    return DropdownButtonFormField<String>(
      value: validItems.contains(value) ? value : null,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      items: validItems.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
      onChanged: onChanged,
    );
  }

  Widget _buildDateField(String label) {
    return InkWell(
      onTap: _selectDate,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _selectedDateOfBirth != null
                  ? '${_selectedDateOfBirth!.year}-${_selectedDateOfBirth!.month.toString().padLeft(2, '0')}-${_selectedDateOfBirth!.day.toString().padLeft(2, '0')}'
                  : 'Select Date',
            ),
            const Icon(Icons.calendar_today, size: 18),
          ],
        ),
      ),
    );
  }
}
