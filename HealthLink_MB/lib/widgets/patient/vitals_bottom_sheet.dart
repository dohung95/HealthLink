import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/patient/vitals/vital_sign_service.dart';

class VitalsBottomSheet extends StatefulWidget {
  final int appointmentId;
  final VoidCallback onSaved;

  const VitalsBottomSheet({
    super.key,
    required this.appointmentId,
    required this.onSaved,
  });

  @override
  State<VitalsBottomSheet> createState() => _VitalsBottomSheetState();
}

class _VitalsBottomSheetState extends State<VitalsBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  
  String _measurementSource = 'HomeDevice'; // HomeDevice or Manual
  
  final _deviceNameCtrl = TextEditingController();
  final _heartRateCtrl = TextEditingController();
  final _bpSysCtrl = TextEditingController();
  final _bpDiaCtrl = TextEditingController();
  final _tempCtrl = TextEditingController();
  final _respCtrl = TextEditingController();
  final _spo2Ctrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  bool _isSaving = false;

  @override
  void dispose() {
    _deviceNameCtrl.dispose();
    _heartRateCtrl.dispose();
    _bpSysCtrl.dispose();
    _bpDiaCtrl.dispose();
    _tempCtrl.dispose();
    _respCtrl.dispose();
    _spo2Ctrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final token = auth.accessToken;
    final patientId = auth.userId;

    if (token == null || patientId == null) return;

    setState(() => _isSaving = true);

    try {
      final payload = {
        'appointmentId': widget.appointmentId,
        'patientId': patientId,
        'heartRate': _toNumber(_heartRateCtrl.text),
        'bloodPressureSystolic': _toNumber(_bpSysCtrl.text),
        'bloodPressureDiastolic': _toNumber(_bpDiaCtrl.text),
        'temperature': _toNumber(_tempCtrl.text),
        'respiratoryRate': _toNumber(_respCtrl.text),
        'oxygenSaturation': _toNumber(_spo2Ctrl.text),
        'source': _measurementSource,
        'deviceName': _measurementSource == 'HomeDevice' ? _deviceNameCtrl.text.trim() : '',
        'notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      };

      await VitalSignService.createVitalSign(token, payload);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.vitalsSavedSuccess),
            backgroundColor: Colors.green,
          ),
        );
        widget.onSaved();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  double? _toNumber(String val) {
    if (val.trim().isEmpty) return null;
    return double.tryParse(val.trim());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colors = Theme.of(context).colorScheme;
    
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l10n.fillHealthInfoTitle,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                l10n.fillHealthInfoSubtitle,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // Instructions Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.cyan.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.cyan.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.vitalsInstructionsTitle,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.cyan.shade900,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildInstructionItem(l10n.vitalsInstructions1, Colors.cyan.shade900),
                    _buildInstructionItem(l10n.vitalsInstructions2, Colors.cyan.shade900),
                    _buildInstructionItem(l10n.vitalsInstructions3, Colors.cyan.shade900),
                    const SizedBox(height: 8),
                    Text(
                      l10n.vitalsInstructionsDisclaimer,
                      style: TextStyle(
                        fontStyle: FontStyle.italic,
                        color: Colors.cyan.shade800,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Measurement Method
              Text(
                l10n.measurementMethod,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: _measurementSource == 'HomeDevice' ? colors.primary : Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                  color: _measurementSource == 'HomeDevice' ? colors.primaryContainer.withValues(alpha: 0.3) : Colors.transparent,
                ),
                child: RadioListTile<String>(
                  title: Text(l10n.measuredByDevice, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(l10n.measuredByDeviceHint, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  value: 'HomeDevice',
                  groupValue: _measurementSource,
                  onChanged: (val) => setState(() => _measurementSource = val!),
                  activeColor: colors.primary,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: _measurementSource == 'Manual' ? colors.primary : Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                  color: _measurementSource == 'Manual' ? colors.primaryContainer.withValues(alpha: 0.3) : Colors.transparent,
                ),
                child: RadioListTile<String>(
                  title: Text(l10n.measuredManually, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(l10n.measuredManuallyHint, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  value: 'Manual',
                  groupValue: _measurementSource,
                  onChanged: (val) => setState(() => _measurementSource = val!),
                  activeColor: colors.primary,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                ),
              ),
              const SizedBox(height: 24),

              // Device Name (Conditional)
              if (_measurementSource == 'HomeDevice') ...[
                Text(
                  l10n.deviceName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _deviceNameCtrl,
                  decoration: InputDecoration(
                    hintText: l10n.deviceNameHint,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Heart Rate & Blood Pressure Group
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            text: l10n.heartRate,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: Theme.of(context).textTheme.bodyLarge?.color,
                            ),
                            children: const [
                              TextSpan(
                                text: ' *',
                                style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _heartRateCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            suffixText: 'bpm',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          ),
                          validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          l10n.howToMeasurePulse,
                          style: TextStyle(color: colors.primary, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.bloodPressure,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _bpSysCtrl,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: 'SYS',
                                  border: OutlineInputBorder(
                                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), bottomLeft: Radius.circular(12)),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
                              decoration: BoxDecoration(
                                border: Border.symmetric(horizontal: BorderSide(color: Colors.grey.shade400)),
                              ),
                              child: const Text('/', style: TextStyle(fontSize: 16)),
                            ),
                            Expanded(
                              child: TextFormField(
                                controller: _bpDiaCtrl,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  hintText: 'DIA',
                                  suffixText: 'mmHg',
                                  border: OutlineInputBorder(
                                    borderRadius: const BorderRadius.only(topRight: Radius.circular(12), bottomRight: Radius.circular(12)),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          l10n.whereToFindSysDia,
                          style: TextStyle(color: colors.primary, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // SpO2, Temp, Resp Group
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.spO2, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _spo2Ctrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            suffixText: '%',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(l10n.spo2Hint, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.temperature, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _tempCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            suffixText: '°C',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(l10n.tempHint, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.respiratoryRate, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _respCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            suffixText: 'breaths/m',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(l10n.respHint, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Notes
              Text(
                l10n.notes,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _notesCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: l10n.notesHint,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
              const SizedBox(height: 32),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSaving ? null : () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        AppLocalizations.of(context)!.btnCancel,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: FilledButton(
                      onPressed: _isSaving ? null : _handleSave,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(
                              l10n.saveVitalsBtn,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInstructionItem(String text, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("• ", style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: color, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
