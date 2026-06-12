import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers/auth_provider.dart';
import '../../services/health_records/health_records_service.dart';

class HealthRecordsScreen extends StatefulWidget {
  const HealthRecordsScreen({super.key});

  @override
  State<HealthRecordsScreen> createState() => _HealthRecordsScreenState();
}

class _HealthRecordsScreenState extends State<HealthRecordsScreen> {
  static const int _pageSize = 5;

  HealthRecordService? _service;
  String? _patientId;

  bool _loading = true;
  bool _uploading = false;
  String? _error;

  int _page = 1;
  int _totalPages = 1;
  int _totalItems = 0;

  List<HealthRecordModel> _records = [];
  int? _expandedRecordId;

  PlatformFile? _selectedFile;
  DateTime? _documentDate;
  String _category = 'Other';
  final TextEditingController _descriptionController = TextEditingController();

  final List<String> _categories = const [
    'Consultation-Notes',
    'Blood-Test',
    'MRI',
    'CT-Scan',
    'X-Ray',
    'Ultrasound',
    'Prescription',
    'Other',
  ];

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initialize();
    });
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    final auth = context.read<AuthProvider>();

    if (!auth.isAuthenticated ||
        auth.accessToken == null ||
        auth.userId == null ||
        auth.userId!.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Please login to view health records.';
      });
      return;
    }

    _service = HealthRecordService(accessToken: auth.accessToken!);
    _patientId = auth.userId!;

    await _loadRecords(page: 1);
  }

  Future<void> _loadRecords({required int page}) async {
    if (_service == null || _patientId == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await _service!.getMyRecords(
        patientId: _patientId!,
        page: page,
        size: _pageSize,
        sort: 'newest',
      );

      if (!mounted) return;

      setState(() {
        _records = result.items;
        _page = result.page;
        _totalPages = result.totalPages == 0 ? 1 : result.totalPages;
        _totalItems = result.totalItems;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.pickFiles(
      allowMultiple: false,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      withData: true,
    );

    if (result == null || result.files.isEmpty) return;

    setState(() {
      _selectedFile = result.files.first;
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
    });
  }

  Future<void> _uploadDocument() async {
    if (_service == null || _patientId == null) return;

    if (_selectedFile == null) {
      _showMessage('Please select a file.', isError: true);
      return;
    }

    if (_documentDate == null) {
      _showMessage('Please select Date Performed.', isError: true);
      return;
    }

    final today = DateTime.now();
    final selected = DateTime(
      _documentDate!.year,
      _documentDate!.month,
      _documentDate!.day,
    );
    final current = DateTime(today.year, today.month, today.day);

    if (selected.isAfter(current)) {
      _showMessage('Date Performed cannot be in the future.', isError: true);
      return;
    }

    setState(() {
      _uploading = true;
    });

    try {
      await _service!.uploadDocumentAutoRecord(
        patientId: _patientId!,
        file: _selectedFile!,
        category: _category,
        description: _descriptionController.text.trim(),
        documentDate: _documentDate!,
      );

      if (!mounted) return;

      setState(() {
        _selectedFile = null;
        _documentDate = null;
        _category = 'Other';
        _descriptionController.clear();
      });

      _showMessage('Document uploaded successfully.');
      await _loadRecords(page: 1);
    } catch (e) {
      _showMessage(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _uploading = false;
        });
      }
    }
  }

  Future<void> _viewDocument(MedicalDocumentModel document) async {
    final url = document.viewUrl;

    if (url == null || url.isEmpty) {
      _showMessage('Document URL is not available.', isError: true);
      return;
    }

    final uri = Uri.tryParse(url);

    if (uri == null) {
      _showMessage('Invalid document URL.', isError: true);
      return;
    }

    final opened = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );

    if (!opened) {
      _showMessage('Can not open document.', isError: true);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor:
        isError ? Theme.of(context).colorScheme.error : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        title: const Text('Health Records'),
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadRecords(page: _page),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _uploadCard(colors),
              const SizedBox(height: 20),
              _recordList(colors),
            ],
          ),
        ),
      ),
    );
  }

  Widget _uploadCard(ColorScheme colors) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Upload medical document',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Date Performed is required and cannot be in the future.',
            style: TextStyle(
              color: colors.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 16),

          DropdownButtonFormField<String>(
            value: _category,
            decoration: const InputDecoration(
              labelText: 'Category',
              border: OutlineInputBorder(),
            ),
            items: _categories.map((item) {
              return DropdownMenuItem(
                value: item,
                child: Text(item),
              );
            }).toList(),
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _category = value;
              });
            },
          ),

          const SizedBox(height: 12),

          OutlinedButton.icon(
            onPressed: _pickDocumentDate,
            icon: const Icon(Icons.calendar_month_outlined),
            label: Text(
              _documentDate == null
                  ? 'Select Date Performed *'
                  : 'Date Performed: ${_formatDate(_documentDate!)}',
            ),
          ),

          const SizedBox(height: 12),

          TextField(
            controller: _descriptionController,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Description',
              hintText: 'Short note about this document...',
              border: OutlineInputBorder(),
            ),
          ),

          const SizedBox(height: 12),

          OutlinedButton.icon(
            onPressed: _pickFile,
            icon: const Icon(Icons.attach_file),
            label: Text(
              _selectedFile == null
                  ? 'Choose file *'
                  : _selectedFile!.name,
              overflow: TextOverflow.ellipsis,
            ),
          ),

          if (_selectedFile != null) ...[
            const SizedBox(height: 8),
            Text(
              '${_selectedFile!.name} (${_formatFileSize(_selectedFile!.size)})',
              style: TextStyle(
                color: colors.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
          ],

          const SizedBox(height: 14),

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _uploading ? null : _uploadDocument,
              icon: _uploading
                  ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
                  : const Icon(Icons.cloud_upload_outlined),
              label: Text(_uploading ? 'Uploading...' : 'Upload'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _recordList(ColorScheme colors) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.only(top: 48),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return _emptyState(
        colors,
        icon: Icons.error_outline,
        title: 'Unable to load health records',
        subtitle: _error!,
      );
    }

    if (_records.isEmpty) {
      return _emptyState(
        colors,
        icon: Icons.folder_off_outlined,
        title: 'No health records yet',
        subtitle: 'Upload your first medical document to create a health record.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'My Health Records',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 12),

        ..._records.map((record) => _recordCard(colors, record)),

        const SizedBox(height: 12),
        _pagination(colors),
      ],
    );
  }

  Widget _recordCard(ColorScheme colors, HealthRecordModel record) {
    final expanded = _expandedRecordId == record.healthRecordId;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () {
              setState(() {
                _expandedRecordId =
                expanded ? null : record.healthRecordId;
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: colors.primary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.folder_open_outlined,
                      color: colors.primary,
                    ),
                  ),
                  const SizedBox(width: 12),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          record.displayDate == null
                              ? 'Unknown date'
                              : _formatDate(record.displayDate!),
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Record #${record.healthRecordId} — ${record.documents.length} document(s)',
                          style: TextStyle(
                            color: colors.onSurfaceVariant,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),

                  Icon(
                    expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                  ),
                ],
              ),
            ),
          ),

          if (expanded) ...[
            Divider(height: 1, color: colors.outlineVariant),
            if (record.documents.isEmpty)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'No documents in this record.',
                  style: TextStyle(color: colors.onSurfaceVariant),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: record.documents
                      .map((doc) => _documentTile(colors, doc))
                      .toList(),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _documentTile(ColorScheme colors, MedicalDocumentModel doc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Row(
        children: [
          Icon(
            _documentIcon(doc),
            color: colors.primary,
          ),
          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doc.documentName.isEmpty
                      ? 'Document #${doc.documentId}'
                      : doc.documentName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),

                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    if (doc.category.isNotEmpty)
                      _chip(colors, doc.category),
                    if (doc.mimeType.isNotEmpty)
                      _chip(colors, doc.mimeType),
                  ],
                ),

                const SizedBox(height: 6),

                Text(
                  doc.documentDate == null
                      ? 'Date Performed: Not provided'
                      : 'Date Performed: ${_formatDate(doc.documentDate!)}',
                  style: TextStyle(
                    color: colors.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),

                if (doc.description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    doc.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: colors.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),

          IconButton(
            onPressed: () => _viewDocument(doc),
            icon: const Icon(Icons.visibility_outlined),
            tooltip: 'View',
          ),
        ],
      ),
    );
  }

  Widget _pagination(ColorScheme colors) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Page $_page of $_totalPages ($_totalItems records)',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ),
        IconButton(
          onPressed: _page > 1
              ? () => _loadRecords(page: _page - 1)
              : null,
          icon: const Icon(Icons.chevron_left),
        ),
        IconButton(
          onPressed: _page < _totalPages
              ? () => _loadRecords(page: _page + 1)
              : null,
          icon: const Icon(Icons.chevron_right),
        ),
      ],
    );
  }

  Widget _emptyState(
      ColorScheme colors, {
        required IconData icon,
        required String title,
        required String subtitle,
      }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        children: [
          Icon(icon, size: 42, color: colors.outline),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _chip(ColorScheme colors, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: colors.primary.withOpacity(0.10),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: colors.primary,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  IconData _documentIcon(MedicalDocumentModel doc) {
    final mime = doc.mimeType.toLowerCase();
    final name = doc.documentName.toLowerCase();

    if (mime.contains('pdf') || name.endsWith('.pdf')) {
      return Icons.picture_as_pdf_outlined;
    }

    if (mime.contains('image') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png')) {
      return Icons.image_outlined;
    }

    return Icons.description_outlined;
  }

  String _formatDate(DateTime date) {
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    final y = date.year.toString();
    return '$m/$d/$y';
  }

  String _formatFileSize(int bytes) {
    if (bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}