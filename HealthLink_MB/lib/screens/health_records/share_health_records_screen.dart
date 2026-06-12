import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/booking/booking_service.dart';
import '../../services/health_records/health_records_service.dart';
import '../../services/health_records/share_health_record_service.dart';

class ShareHealthRecordsScreen extends StatefulWidget {
  const ShareHealthRecordsScreen({super.key});

  @override
  State<ShareHealthRecordsScreen> createState() => _ShareHealthRecordsScreenState();
}

class _ShareHealthRecordsScreenState extends State<ShareHealthRecordsScreen> {
  static const int _pageSize = 5;

  HealthRecordService? _recordService;
  ShareHealthRecordService? _shareService;
  BookingService? _bookingService;

  String? _patientId;

  bool _loading = true;
  bool _submitting = false;
  String? _error;

  List<HealthRecordModel> _records = [];
  List<BookingDoctor> _doctors = [];
  List<String> _specialties = [];
  List<HealthRecordShareModel> _shares = [];

  int _sharePage = 1;
  int _shareTotalPages = 1;
  int _shareTotalItems = 0;

  int? _selectedRecordId;
  String? _selectedSpecialty;
  String? _selectedDoctorId;

  bool _shareEntireRecord = true;
  final Set<int> _selectedDocumentIds = {};

  String _permissionLevel = 'View';
  DateTime? _expiryDate;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initialize();
    });
  }

  Future<void> _initialize() async {
    final auth = context.read<AuthProvider>();

    if (!auth.isAuthenticated ||
        auth.accessToken == null ||
        auth.userId == null ||
        auth.userId!.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Please login to share health records.';
      });
      return;
    }

    _patientId = auth.userId!;
    _recordService = HealthRecordService(accessToken: auth.accessToken!);
    _shareService = ShareHealthRecordService(accessToken: auth.accessToken!);
    _bookingService = BookingService(accessToken: auth.accessToken!);

    await _loadData();
  }

  Future<void> _loadData() async {
    if (_patientId == null ||
        _recordService == null ||
        _shareService == null ||
        _bookingService == null) {
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _recordService!.getMyRecords(
          patientId: _patientId!,
          page: 1,
          size: 50,
          sort: 'newest',
        ),
        _bookingService!.getSpecialties(),
        _shareService!.getMyShares(
          patientId: _patientId!,
          page: _sharePage,
          size: _pageSize,
        ),
      ]);

      final recordsResult = results[0] as PagedHealthRecords;
      final specialtiesResult = results[1] as List<String>;
      final sharesResult = results[2] as PagedHealthRecordShares;

      if (!mounted) return;

      setState(() {
        _records = recordsResult.items;
        _specialties = specialtiesResult;
        _doctors = [];
        _selectedSpecialty = null;
        _selectedDoctorId = null;

        _shares = sharesResult.items;
        _sharePage = sharesResult.page;
        _shareTotalPages =
        sharesResult.totalPages == 0 ? 1 : sharesResult.totalPages;
        _shareTotalItems = sharesResult.totalItems;
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

  Future<void> _loadDoctorsBySpecialty(String specialty) async {
    if (_bookingService == null) return;

    setState(() {
      _doctors = [];
      _selectedDoctorId = null;
      _submitting = true;
    });

    try {
      final result = await _bookingService!.searchDoctors(
        specialty: specialty,
        page: 1,
        pageSize: 100,
      );

      if (!mounted) return;

      setState(() {
        _doctors = result.items;
      });
    } catch (e) {
      _showMessage(
        e.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  Future<void> _loadSharesPage(int page) async {
    if (_shareService == null || _patientId == null) return;

    setState(() {
      _loading = true;
    });

    try {
      final result = await _shareService!.getMyShares(
        patientId: _patientId!,
        page: page,
        size: _pageSize,
      );

      if (!mounted) return;

      setState(() {
        _shares = result.items;
        _sharePage = result.page;
        _shareTotalPages = result.totalPages == 0 ? 1 : result.totalPages;
        _shareTotalItems = result.totalItems;
      });
    } catch (e) {
      _showMessage(
        e.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  HealthRecordModel? get _selectedRecord {
    if (_selectedRecordId == null) return null;

    try {
      return _records.firstWhere(
            (record) => record.healthRecordId == _selectedRecordId,
      );
    } catch (_) {
      return null;
    }
  }

  HealthRecordShareModel? get _existingActiveShare {
    if (_selectedRecordId == null || _selectedDoctorId == null) return null;

    try {
      return _shares.firstWhere(
            (share) =>
        share.healthRecordId == _selectedRecordId &&
            share.doctorId == _selectedDoctorId &&
            !share.revoked &&
            !share.isExpired,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickExpiryDate() async {
    final now = DateTime.now();

    final picked = await showDatePicker(
      context: context,
      initialDate: _expiryDate ?? now.add(const Duration(days: 30)),
      firstDate: now,
      lastDate: DateTime(now.year + 5),
    );

    if (picked == null) return;

    setState(() {
      _expiryDate = picked;
    });
  }

  Future<void> _submitShare() async {
    if (_shareService == null || _patientId == null) return;

    if (_selectedRecordId == null) {
      _showMessage('Please select a health record.', isError: true);
      return;
    }

    if (_selectedSpecialty == null || _selectedSpecialty!.isEmpty) {
      _showMessage('Please select a specialty.', isError: true);
      return;
    }

    if (_selectedDoctorId == null || _selectedDoctorId!.isEmpty) {
      _showMessage('Please select a doctor.', isError: true);
      return;
    }

    final record = _selectedRecord;

    if (record == null) {
      _showMessage('Selected record is not available.', isError: true);
      return;
    }

    if (!_shareEntireRecord && _selectedDocumentIds.isEmpty) {
      _showMessage('Please select at least one document.', isError: true);
      return;
    }

    final existing = _existingActiveShare;

    if (existing != null) {
      _showMessage(
        'This record is already shared with this doctor. Please revoke the existing share before sharing again.',
        isError: true,
      );
      return;
    }

    setState(() {
      _submitting = true;
    });

    try {
      await _shareService!.shareWithDoctor(
        recordId: _selectedRecordId!,
        patientId: _patientId!,
        doctorId: _selectedDoctorId!,
        permissionLevel: _permissionLevel,
        expiryDate: _expiryDate,
        sharedDocumentIds:
        _shareEntireRecord ? null : _selectedDocumentIds.toList(),
      );

      if (!mounted) return;

      _showMessage('Health record shared successfully.');

      setState(() {
        _selectedRecordId = null;
        _selectedSpecialty = null;
        _selectedDoctorId = null;
        _doctors = [];

        _shareEntireRecord = true;
        _selectedDocumentIds.clear();
        _permissionLevel = 'View';
        _expiryDate = null;
      });

      await _loadData();
    } catch (e) {
      _showMessage(
        e.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  Future<void> _confirmRevoke(HealthRecordShareModel share) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Revoke Access'),
          content: Text(
            'Revoke access for ${share.doctorName} to Record #${share.healthRecordId}?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Revoke'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    await _revokeShare(share);
  }

  Future<void> _revokeShare(HealthRecordShareModel share) async {
    if (_shareService == null || _patientId == null) return;

    setState(() {
      _submitting = true;
    });

    try {
      await _shareService!.revokeShare(
        shareId: share.shareId,
        patientId: _patientId!,
      );

      if (!mounted) return;

      _showMessage('Access revoked successfully.');
      await _loadSharesPage(_sharePage);
    } catch (e) {
      _showMessage(
        e.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
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
      appBar: AppBar(
        title: const Text('Share Health Records'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_submitting)
                LinearProgressIndicator(
                  color: colors.primary,
                ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(top: 80),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _emptyState(
                  colors,
                  icon: Icons.error_outline,
                  title: 'Unable to load share records',
                  subtitle: _error!,
                )
              else ...[
                  _grantAccessCard(colors),
                  const SizedBox(height: 20),
                  _activeSharesCard(colors),
                ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _grantAccessCard(ColorScheme colors) {
    final record = _selectedRecord;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(colors),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Grant New Access',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Select a health record, documents and doctor to share with.',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 16),

          DropdownButtonFormField<int>(
            value: _selectedRecordId,
            decoration: const InputDecoration(
              labelText: 'Health Record',
              border: OutlineInputBorder(),
            ),
            items: _records.map((record) {
              return DropdownMenuItem(
                value: record.healthRecordId,
                child: Text(
                  'Record #${record.healthRecordId} — ${record.documents.length} document(s)',
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedRecordId = value;
                _shareEntireRecord = true;
                _selectedDocumentIds.clear();
              });
            },
          ),

          const SizedBox(height: 12),

          DropdownButtonFormField<String>(
            value: _selectedSpecialty,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Specialty',
              border: OutlineInputBorder(),
            ),
            items: _specialties.map((specialty) {
              return DropdownMenuItem(
                value: specialty,
                child: Text(
                  specialty,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }).toList(),
            onChanged: (value) async {
              if (value == null) return;

              setState(() {
                _selectedSpecialty = value;
                _selectedDoctorId = null;
                _doctors = [];
              });

              await _loadDoctorsBySpecialty(value);
            },
          ),

          const SizedBox(height: 12),

          DropdownButtonFormField<String>(
            value: _selectedDoctorId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Doctor',
              border: OutlineInputBorder(),
            ),
            selectedItemBuilder: (context) {
              return _doctors.map((doctor) {
                return Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    doctor.fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }).toList();
            },
            items: _doctors.map((doctor) {
              return DropdownMenuItem(
                value: doctor.doctorId,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      doctor.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    if (doctor.specialtyName.isNotEmpty)
                      Text(
                        doctor.specialtyName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                ),
              );
            }).toList(),
            onChanged: _selectedSpecialty == null
                ? null
                : (value) {
              setState(() {
                _selectedDoctorId = value;
              });
            },
          ),

          const SizedBox(height: 12),

          InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Permission',
              border: OutlineInputBorder(),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.visibility_outlined,
                  size: 18,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'View only',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          OutlinedButton.icon(
            onPressed: _pickExpiryDate,
            icon: const Icon(Icons.event_outlined),
            label: Text(
              _expiryDate == null
                  ? 'No expiry date'
                  : 'Expiry: ${_formatDate(_expiryDate!)}',
            ),
          ),

          if (_expiryDate != null)
            TextButton.icon(
              onPressed: () {
                setState(() {
                  _expiryDate = null;
                });
              },
              icon: const Icon(Icons.close),
              label: const Text('Clear expiry date'),
            ),

          const SizedBox(height: 16),

          if (record != null) _documentSelection(colors, record),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _submitting ? null : _submitShare,
              icon: const Icon(Icons.ios_share_outlined),
              label: Text(_submitting ? 'Sharing...' : 'Share Record'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _documentSelection(ColorScheme colors, HealthRecordModel record) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SwitchListTile(
            value: _shareEntireRecord,
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Share entire record',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: const Text('Doctor can view all documents in this record.'),
            onChanged: (value) {
              setState(() {
                _shareEntireRecord = value;
                if (value) {
                  _selectedDocumentIds.clear();
                }
              });
            },
          ),

          if (!_shareEntireRecord) ...[
            const Divider(),
            if (record.documents.isEmpty)
              Text(
                'This record has no documents.',
                style: TextStyle(color: colors.onSurfaceVariant),
              )
            else
              ...record.documents.map((doc) {
                final selected = _selectedDocumentIds.contains(doc.documentId);

                return CheckboxListTile(
                  value: selected,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    doc.documentName.isEmpty
                        ? 'Document #${doc.documentId}'
                        : doc.documentName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    doc.documentDate == null
                        ? 'Date Performed: Not provided'
                        : 'Date Performed: ${_formatDate(doc.documentDate!)}',
                  ),
                  onChanged: (value) {
                    setState(() {
                      if (value == true) {
                        _selectedDocumentIds.add(doc.documentId);
                      } else {
                        _selectedDocumentIds.remove(doc.documentId);
                      }
                    });
                  },
                );
              }),
          ],
        ],
      ),
    );
  }

  Widget _activeSharesCard(ColorScheme colors) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(colors),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Active Shared Records',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Records currently shared with doctors.',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 16),

          if (_shares.isEmpty)
            _emptyState(
              colors,
              icon: Icons.share_outlined,
              title: 'No active shares',
              subtitle: 'Shared records will appear here.',
            )
          else ...[
            ..._shares.map((share) => _shareTile(colors, share)),
            const SizedBox(height: 8),
            _sharePagination(colors),
          ],
        ],
      ),
    );
  }

  Widget _shareTile(ColorScheme colors, HealthRecordShareModel share) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: colors.primary,
                child: Text(
                  _initials(share.doctorName),
                  style: TextStyle(
                    color: colors.onPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      share.doctorName,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    Text(
                      'Record #${share.healthRecordId}',
                      style: TextStyle(
                        color: colors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),

              _statusChip(colors, share.statusLabel),
            ],
          ),

          const SizedBox(height: 12),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _infoChip(
                colors,
                share.permissionLevel,
                Icons.visibility_outlined,
              ),
              _infoChip(
                colors,
                share.isEntireRecordShared
                    ? 'Entire record'
                    : '${share.documents.length} document(s)',
                Icons.folder_open_outlined,
              ),
              if (share.expiryDate != null)
                _infoChip(
                  colors,
                  'Expires ${_formatDate(share.expiryDate!)}',
                  Icons.event_outlined,
                ),
            ],
          ),

          const SizedBox(height: 12),

          Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(
              onPressed: _submitting ? null : () => _confirmRevoke(share),
              icon: const Icon(Icons.block_outlined),
              label: const Text('Revoke'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sharePagination(ColorScheme colors) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Page $_sharePage of $_shareTotalPages ($_shareTotalItems shares)',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ),
        IconButton(
          onPressed: _sharePage > 1
              ? () => _loadSharesPage(_sharePage - 1)
              : null,
          icon: const Icon(Icons.chevron_left),
        ),
        IconButton(
          onPressed: _sharePage < _shareTotalPages
              ? () => _loadSharesPage(_sharePage + 1)
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
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        children: [
          Icon(icon, size: 38, color: colors.outline),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(ColorScheme colors, String status) {
    final normalized = status.toLowerCase();

    final Color bg;
    final Color fg;

    if (normalized == 'active') {
      bg = colors.primary.withOpacity(0.12);
      fg = colors.primary;
    } else if (normalized == 'revoked') {
      bg = colors.errorContainer;
      fg = colors.onErrorContainer;
    } else {
      bg = colors.surfaceContainerHighest;
      fg = colors.onSurfaceVariant;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: fg,
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _infoChip(ColorScheme colors, String text, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: colors.primary),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(fontSize: 12),
          ),
        ],
      ),
    );
  }

  BoxDecoration _cardDecoration(ColorScheme colors) {
    return BoxDecoration(
      color: colors.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: colors.outlineVariant),
      boxShadow: [
        BoxShadow(
          color: colors.onSurface.withOpacity(0.03),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    final y = date.year.toString();
    return '$m/$d/$y';
  }

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.isEmpty) return 'DR';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();

    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }
}