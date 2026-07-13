import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../config/doctor_theme.dart';
import '../../models/doctor/doctor_clinical_result.dart';
import '../../services/doctor/doctor_clinical_result_service.dart';
import 'doctor_widgets.dart';

/// Mở bottom sheet tạo/sửa clinical result. Truyền [existing] để sửa, để `null` để tạo mới.
Future<void> showClinicalResultEditorSheet(
  BuildContext context, {
  required int appointmentId,
  required String accessToken,
  DoctorClinicalResult? existing,
  required VoidCallback onSaved,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    isDismissible: false,
    enableDrag: false,
    builder: (_) => ClinicalResultEditorSheet(
      appointmentId: appointmentId,
      accessToken: accessToken,
      existing: existing,
      onSaved: onSaved,
    ),
  );
}

class _RowControllers {
  final testNameCtrl = TextEditingController();
  final valueCtrl = TextEditingController();
  final unitCtrl = TextEditingController();
  final refRangeCtrl = TextEditingController();
  String flag;

  _RowControllers({ClinicalResultRow? from}) : flag = from?.flag ?? 'UNKNOWN' {
    if (from != null) {
      testNameCtrl.text = from.testName;
      valueCtrl.text = from.resultValue;
      unitCtrl.text = from.unit;
      refRangeCtrl.text = from.referenceRange;
    }
  }

  bool get isFilled => testNameCtrl.text.trim().isNotEmpty && valueCtrl.text.trim().isNotEmpty;

  ClinicalResultRow toRow() => ClinicalResultRow(
        testName: testNameCtrl.text.trim(),
        resultValue: valueCtrl.text.trim(),
        unit: unitCtrl.text.trim(),
        referenceRange: refRangeCtrl.text.trim(),
        flag: flag,
      );

  void dispose() {
    testNameCtrl.dispose();
    valueCtrl.dispose();
    unitCtrl.dispose();
    refRangeCtrl.dispose();
  }
}

class ClinicalResultEditorSheet extends StatefulWidget {
  final int appointmentId;
  final String accessToken;
  final DoctorClinicalResult? existing;
  final VoidCallback onSaved;

  const ClinicalResultEditorSheet({
    super.key,
    required this.appointmentId,
    required this.accessToken,
    this.existing,
    required this.onSaved,
  });

  @override
  State<ClinicalResultEditorSheet> createState() => _ClinicalResultEditorSheetState();
}

class _ClinicalResultEditorSheetState extends State<ClinicalResultEditorSheet> {
  final _testNameCtrl = TextEditingController();
  final _labFacilityCtrl = TextEditingController();
  final _assessmentCtrl = TextEditingController();
  final _patientSummaryCtrl = TextEditingController();

  String? _category;
  DateTime? _documentDate;
  final List<_RowControllers> _rows = [];

  PlatformFile? _newFile;
  String? _existingFileName;

  bool _isSaving = false;
  String? _error;
  bool _dirty = false;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    if (existing != null) {
      _category = existing.category;
      _testNameCtrl.text = existing.testName ?? '';
      _labFacilityCtrl.text = existing.labFacilityName ?? '';
      _assessmentCtrl.text = existing.doctorAssessment ?? '';
      _patientSummaryCtrl.text = existing.patientSummary ?? '';
      _documentDate = existing.documentDate;
      _rows.addAll(existing.rows.map((r) => _RowControllers(from: r)));
      if (existing.hasAttachment) {
        _existingFileName = existing.fileLocation!.split('/').last;
      }
    }
  }

  @override
  void dispose() {
    _testNameCtrl.dispose();
    _labFacilityCtrl.dispose();
    _assessmentCtrl.dispose();
    _patientSummaryCtrl.dispose();
    for (final r in _rows) {
      r.dispose();
    }
    super.dispose();
  }

  void _markDirty() {
    setState(() => _dirty = true);
  }

  bool get _isValid => (_category?.trim().isNotEmpty ?? false) && _testNameCtrl.text.trim().isNotEmpty;

  bool get _hasFile => _newFile != null || (_existingFileName != null);
  bool get _hasStructuredRow => _rows.any((r) => r.isFilled);
  bool get _hasAssessment => _assessmentCtrl.text.trim().isNotEmpty;
  bool get _canPublish => _isValid && (_hasFile || _hasStructuredRow || _hasAssessment);

  Future<void> _pickFile() async {
    final result = await FilePicker.pickFiles(
      allowMultiple: false,
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    setState(() {
      _newFile = result.files.first;
      _dirty = true;
    });
  }

  Future<void> _pickDocumentDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _documentDate ?? now,
      firstDate: DateTime(2000),
      lastDate: now,
    );
    if (picked == null) return;
    setState(() {
      _documentDate = picked;
      _dirty = true;
    });
  }

  void _addRow() {
    setState(() {
      _rows.add(_RowControllers());
      _dirty = true;
    });
  }

  void _removeRow(_RowControllers row) {
    setState(() {
      _rows.remove(row);
      row.dispose();
      _dirty = true;
    });
  }

  Future<void> _handleClose() async {
    if (!_dirty) {
      Navigator.pop(context);
      return;
    }
    final discard = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Discard unsaved result?'),
        content: const Text('Your changes will be lost.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep editing')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Discard', style: TextStyle(color: DS.rose600, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (discard == true && mounted) {
      Navigator.pop(context);
    }
  }

  Future<void> _handleSave({required bool publish}) async {
    if (!_isValid) return;
    if (publish && !_canPublish) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final service = DoctorClinicalResultService(accessToken: widget.accessToken);
      final draft = ClinicalResultDraft(
        category: _category,
        testName: _testNameCtrl.text.trim(),
        labFacilityName: _labFacilityCtrl.text.trim(),
        documentDate: _documentDate,
        doctorAssessment: _assessmentCtrl.text.trim(),
        patientSummary: _patientSummaryCtrl.text.trim(),
        rows: _rows.map((r) => r.toRow()).toList(),
        file: _newFile,
      );

      var saved = _isEditing
          ? await service.updateResult(documentId: widget.existing!.documentId, draft: draft)
          : await service.createResult(appointmentId: widget.appointmentId, draft: draft);

      if (publish) {
        saved = await service.publishResult(saved.documentId);
      }

      if (mounted) {
        widget.onSaved();
        Navigator.pop(context);
        showDoctorNotice(context, publish ? 'Clinical result published.' : 'Draft saved.');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope<Object?>(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleClose();
      },
      child: _buildContent(),
    );
  }

  Widget _buildContent() {
    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
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
                  _sectionLabel('Category'),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: _category,
                    decoration: DS.inputDecoration(hintText: 'Select category'),
                    items: clinicalResultCategoryOptions
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) {
                      _category = v;
                      _markDirty();
                    },
                  ),
                  const SizedBox(height: 16),
                  _sectionLabel('Test / Report name'),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _testNameCtrl,
                    decoration: DS.inputDecoration(hintText: 'e.g. Complete Blood Count'),
                    onChanged: (_) => _markDirty(),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(child: _sectionLabel('Structured results')),
                      TextButton.icon(
                        onPressed: _addRow,
                        icon: const Icon(Icons.add_circle_outline, size: 16),
                        label: const Text('Add row'),
                      ),
                    ],
                  ),
                  ..._rows.map(_buildRow),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _sectionLabel('Lab facility'),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _labFacilityCtrl,
                              decoration: DS.inputDecoration(hintText: 'HealthLink Lab'),
                              onChanged: (_) => _markDirty(),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _sectionLabel('Document date'),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: _pickDocumentDate,
                              child: InputDecorator(
                                decoration: DS.inputDecoration(),
                                child: Text(
                                  _documentDate != null ? DateFormat('dd/MM/yyyy').format(_documentDate!) : 'Select date',
                                  style: TextStyle(color: _documentDate != null ? DS.foreground : DS.mutedForeground),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _sectionLabel('Doctor assessment'),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _assessmentCtrl,
                    maxLines: 3,
                    decoration: DS.inputDecoration(hintText: 'Clinical interpretation and notes...'),
                    onChanged: (_) => _markDirty(),
                  ),
                  const SizedBox(height: 16),
                  _sectionLabel('Patient summary'),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _patientSummaryCtrl,
                    maxLines: 2,
                    decoration: DS.inputDecoration(hintText: 'Simplified explanation for the patient...'),
                    onChanged: (_) => _markDirty(),
                  ),
                  const SizedBox(height: 16),
                  _sectionLabel('Attachment'),
                  const SizedBox(height: 6),
                  _buildFilePicker(),
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
    );
  }

  Widget _sectionLabel(String text) => Text(
        text,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground),
      );

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 8, 14),
      decoration: const BoxDecoration(
        color: DS.card,
        border: Border(bottom: BorderSide(color: DS.cardBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              _isEditing ? 'Edit Clinical Result' : 'Add Clinical Result',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: DS.foreground),
            ),
          ),
          IconButton(
            onPressed: _isSaving ? null : _handleClose,
            icon: const Icon(Icons.close, color: DS.mutedForeground),
          ),
        ],
      ),
    );
  }

  Widget _buildRow(_RowControllers row) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: row.testNameCtrl,
                  decoration: DS.inputDecoration(hintText: 'Test'),
                  onChanged: (_) => _markDirty(),
                ),
              ),
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                icon: const Icon(Icons.close, size: 18, color: DS.rose600),
                onPressed: () => _removeRow(row),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: row.valueCtrl,
                  decoration: DS.inputDecoration(hintText: 'Value'),
                  onChanged: (_) => _markDirty(),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: row.unitCtrl,
                  decoration: DS.inputDecoration(hintText: 'Unit'),
                  onChanged: (_) => _markDirty(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: row.refRangeCtrl,
                  decoration: DS.inputDecoration(hintText: 'Reference range'),
                  onChanged: (_) => _markDirty(),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: row.flag,
                  decoration: DS.inputDecoration(hintText: 'Flag'),
                  items: clinicalResultFlagOptions
                      .map((f) => DropdownMenuItem(value: f, child: Text(f, overflow: TextOverflow.ellipsis)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) row.flag = v;
                    _markDirty();
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilePicker() {
    final fileName = _newFile?.name ?? _existingFileName;
    return InkWell(
      onTap: _pickFile,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: DS.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: DS.cardBorder),
        ),
        child: Row(
          children: [
            const Icon(Icons.upload_file_outlined, color: DS.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                fileName ?? 'Select image or PDF report',
                style: TextStyle(fontSize: 13, color: fileName != null ? DS.foreground : DS.mutedForeground, fontWeight: fileName != null ? FontWeight.w600 : FontWeight.normal),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (_newFile != null)
              Text(_isEditing ? 'New' : 'Selected', style: const TextStyle(fontSize: 11, color: DS.primary, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).viewInsets.bottom > 0 ? 12 : 24),
      decoration: const BoxDecoration(
        color: DS.card,
        border: Border(top: BorderSide(color: DS.cardBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              style: DS.outlineButtonStyle,
              onPressed: _isSaving || !_isValid ? null : () => _handleSave(publish: false),
              child: _isSaving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save draft'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              style: DS.primaryButtonStyle,
              onPressed: _isSaving || !_canPublish ? null : () => _handleSave(publish: true),
              child: _isSaving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Publish'),
            ),
          ),
        ],
      ),
    );
  }
}
