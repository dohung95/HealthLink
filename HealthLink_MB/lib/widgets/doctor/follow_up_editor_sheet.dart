import 'package:intl/intl.dart';
import 'package:flutter/material.dart';

import '../../config/doctor_theme.dart';
import '../../models/doctor/doctor_follow_up.dart';
import '../../services/doctor/doctor_follow_up_service.dart';
import 'doctor_widgets.dart';

const List<String> _followUpTypes = ['Online', 'HomeVisit'];

/// Mở bottom sheet chọn ngày/giờ/loại tư vấn cho lịch tái khám, rồi lưu +
/// (tuỳ chọn) gửi luôn yêu cầu thanh toán cho bệnh nhân.
Future<void> showFollowUpEditorSheet(
  BuildContext context, {
  required int appointmentId,
  required String accessToken,
  DateTime? initialDate,
  String? initialType,
  String? initialNotes,
  required bool isReschedule,
  required VoidCallback onSaved,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    isDismissible: false,
    enableDrag: false,
    builder: (_) => _FollowUpEditorSheet(
      appointmentId: appointmentId,
      accessToken: accessToken,
      initialDate: initialDate,
      initialType: initialType,
      initialNotes: initialNotes,
      isReschedule: isReschedule,
      onSaved: onSaved,
    ),
  );
}

class _FollowUpEditorSheet extends StatefulWidget {
  final int appointmentId;
  final String accessToken;
  final DateTime? initialDate;
  final String? initialType;
  final String? initialNotes;
  final bool isReschedule;
  final VoidCallback onSaved;

  const _FollowUpEditorSheet({
    required this.appointmentId,
    required this.accessToken,
    this.initialDate,
    this.initialType,
    this.initialNotes,
    required this.isReschedule,
    required this.onSaved,
  });

  @override
  State<_FollowUpEditorSheet> createState() => _FollowUpEditorSheetState();
}

class _FollowUpEditorSheetState extends State<_FollowUpEditorSheet> {
  late final DoctorFollowUpService _service = DoctorFollowUpService(accessToken: widget.accessToken);
  final _notesCtrl = TextEditingController();

  late String _type;
  DateTime? _selectedDate;
  FollowUpSlot? _selectedSlot;
  List<FollowUpSlot> _slots = [];
  bool _loadingSlots = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _type = widget.initialType ?? 'Online';
    _selectedDate = widget.initialDate != null ? DateTime(widget.initialDate!.year, widget.initialDate!.month, widget.initialDate!.day) : null;
    _notesCtrl.text = widget.initialNotes ?? '';
    if (_selectedDate != null) _loadSlots();
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 180)),
    );
    if (picked == null) return;
    setState(() {
      _selectedDate = picked;
      _selectedSlot = null;
    });
    _loadSlots();
  }

  Future<void> _loadSlots() async {
    if (_selectedDate == null) return;
    setState(() {
      _loadingSlots = true;
      _error = null;
    });
    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate!);
      final slots = await _service.getSlots(date: dateStr, consultationType: _type);
      if (mounted) {
        setState(() {
          _slots = slots;
          _loadingSlots = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _loadingSlots = false;
          _slots = [];
        });
      }
    }
  }

  void _selectType(String type) {
    if (_type == type) return;
    setState(() {
      _type = type;
      _selectedSlot = null;
    });
    if (_selectedDate != null) _loadSlots();
  }

  DateTime? get _followUpDateTime {
    if (_selectedDate == null || _selectedSlot == null) return null;
    final parts = _selectedSlot!.startTime.split(':');
    if (parts.length < 2) return null;
    final hour = int.tryParse(parts[0]) ?? 0;
    final minute = int.tryParse(parts[1]) ?? 0;
    return DateTime(_selectedDate!.year, _selectedDate!.month, _selectedDate!.day, hour, minute);
  }

  Future<void> _handleSave({required bool sendPaymentRequest}) async {
    final dateTime = _followUpDateTime;
    if (dateTime == null) {
      setState(() => _error = 'Please select an available follow-up slot.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final isoDate = DateFormat("yyyy-MM-dd'T'HH:mm:ss").format(dateTime);
      await _service.saveFollowUp(
        appointmentId: widget.appointmentId,
        followUpDate: isoDate,
        followUpNotes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
        consultationType: _type,
      );

      if (sendPaymentRequest) {
        await _service.sendPaymentRequest(widget.appointmentId);
      }

      if (mounted) {
        widget.onSaved();
        Navigator.pop(context);
        showDoctorNotice(
          context,
          sendPaymentRequest
              ? 'Payment request sent to patient.'
              : (widget.isReschedule ? 'Follow-up rescheduled.' : 'Follow-up draft saved.'),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !_saving) Navigator.pop(context);
      },
      child: Container(
        height: MediaQuery.of(context).size.height * 0.88,
        decoration: const BoxDecoration(
          color: DS.background,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Consultation type', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground)),
                    const SizedBox(height: 8),
                    Row(
                      children: _followUpTypes.map((type) {
                        final selected = _type == type;
                        return Expanded(
                          child: Padding(
                            padding: EdgeInsets.only(right: type == _followUpTypes.first ? 8 : 0),
                            child: OutlinedButton.icon(
                              onPressed: _saving ? null : () => _selectType(type),
                              style: OutlinedButton.styleFrom(
                                backgroundColor: selected ? DS.primary.withValues(alpha: 0.1) : null,
                                foregroundColor: selected ? DS.primary : DS.mutedForeground,
                                side: BorderSide(color: selected ? DS.primary : DS.cardBorder),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: Icon(type == 'HomeVisit' ? Icons.house_outlined : Icons.laptop_outlined, size: 16),
                              label: Text(type == 'HomeVisit' ? 'Home Visit' : 'Online'),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    const Text('Date', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground)),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: _saving ? null : _pickDate,
                      child: InputDecorator(
                        decoration: DS.inputDecoration(),
                        child: Text(
                          _selectedDate != null ? DateFormat('EEE, dd MMM yyyy').format(_selectedDate!) : 'Select a date',
                          style: TextStyle(color: _selectedDate != null ? DS.foreground : DS.mutedForeground),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Text('Available slots', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground)),
                        if (_loadingSlots) ...[
                          const SizedBox(width: 10),
                          const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: DS.primary)),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildSlotsGrid(),
                    const SizedBox(height: 16),
                    const Text('Notes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _notesCtrl,
                      maxLines: 3,
                      decoration: DS.inputDecoration(hintText: 'Add concise notes for the next appointment...'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: DS.rose100, borderRadius: BorderRadius.circular(10)),
                        child: Text(_error!, style: const TextStyle(color: DS.rose700, fontSize: 13)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildSlotsGrid() {
    if (_selectedDate == null) {
      return const Text('Select a date to see available slots.', style: TextStyle(fontSize: 12, color: DS.mutedForeground));
    }
    if (!_loadingSlots && _slots.isEmpty) {
      return const Text('No slots available for this date.', style: TextStyle(fontSize: 12, color: DS.mutedForeground));
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _slots.map((slot) {
        final isSelected = _selectedSlot?.startTime == slot.startTime;
        final disabled = !slot.selectable || _saving;
        return ChoiceChip(
          label: Text(slot.displayLabel, style: const TextStyle(fontSize: 12)),
          selected: isSelected,
          onSelected: disabled ? null : (_) => setState(() => _selectedSlot = slot),
          selectedColor: DS.primary.withValues(alpha: 0.15),
          disabledColor: DS.secondary,
          labelStyle: TextStyle(color: isSelected ? DS.primary : (disabled ? DS.mutedForeground.withValues(alpha: 0.5) : DS.foreground)),
          side: BorderSide(color: isSelected ? DS.primary : DS.cardBorder),
        );
      }).toList(),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 8, 14),
      decoration: const BoxDecoration(color: DS.card, border: Border(bottom: BorderSide(color: DS.cardBorder))),
      child: Row(
        children: [
          Expanded(
            child: Text(
              widget.isReschedule ? 'Reschedule Follow-up' : 'Schedule Follow-up',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: DS.foreground),
            ),
          ),
          IconButton(
            onPressed: _saving ? null : () => Navigator.pop(context),
            icon: const Icon(Icons.close, color: DS.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    final canSave = _followUpDateTime != null;
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).viewInsets.bottom > 0 ? 12 : 24),
      decoration: const BoxDecoration(color: DS.card, border: Border(top: BorderSide(color: DS.cardBorder))),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              style: DS.outlineButtonStyle,
              onPressed: _saving || !canSave ? null : () => _handleSave(sendPaymentRequest: false),
              child: const Text('Save draft'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              style: DS.primaryButtonStyle,
              onPressed: _saving || !canSave ? null : () => _handleSave(sendPaymentRequest: true),
              child: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save & send request'),
            ),
          ),
        ],
      ),
    );
  }
}
