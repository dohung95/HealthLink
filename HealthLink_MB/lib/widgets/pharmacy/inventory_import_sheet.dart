import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import '../../services/pharmacy/pharmacy_inventory_service.dart';

class InventoryImportSheet extends StatefulWidget {
  final String token;
  final PharmacyInventoryService service;
  final VoidCallback onImportComplete;

  const InventoryImportSheet({
    super.key,
    required this.token,
    required this.service,
    required this.onImportComplete,
  });

  @override
  State<InventoryImportSheet> createState() => _InventoryImportSheetState();
}

class _InventoryImportSheetState extends State<InventoryImportSheet> {
  bool _isImporting = false;
  bool _isDownloading = false;
  PharmacyInventoryImportResult? _result;

  Future<void> _downloadTemplate() async {
    setState(() => _isDownloading = true);
    try {
      final bytes = await widget.service.downloadTemplate(widget.token);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/inventory_template.csv');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles(
        [XFile(file.path)],
        subject: 'Inventory Template',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to download template: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  Future<void> _pickAndImport() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );
    if (result == null || result.files.isEmpty) return;

    setState(() {
      _isImporting = true;
      _result = null;
    });

    try {
      final file = result.files.first;
      final bytes = file.bytes ?? await File(file.path!).readAsBytes();
      final importResult =
          await widget.service.importCsv(widget.token, bytes, file.name);
      if (mounted) {
        setState(() => _result = importResult);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Import failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isImporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Import Inventory',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          if (_result != null) ...[
            _buildResultCard(),
            const SizedBox(height: 12),
          ],
          OutlinedButton.icon(
            onPressed: _isDownloading ? null : _downloadTemplate,
            icon: _isDownloading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.download),
            label: Text(
                _isDownloading ? 'Downloading...' : 'Download template'),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _isImporting ? null : _pickAndImport,
            icon: _isImporting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.upload_file),
            label: Text(_isImporting ? 'Importing...' : 'Select CSV file'),
          ),
          if (_result != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () {
                widget.onImportComplete();
                if (mounted) Navigator.pop(context);
              },
              child: const Text('Done'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildResultCard() {
    final result = _result!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Import Results',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            _resultRow('Imported', result.importedCount, Colors.green),
            _resultRow('Updated', result.updatedCount, Colors.blue),
            _resultRow('Skipped', result.skippedCount, Colors.orange),
            if (result.rowErrors.isNotEmpty) ...[
              const Divider(),
              Text('Errors (${result.rowErrors.length})',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.error)),
              ...result.rowErrors.map((e) => Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Row ${e.rowNumber}: ${e.message}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  )),
            ],
          ],
        ),
      ),
    );
  }

  Widget _resultRow(String label, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text('$count',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}
